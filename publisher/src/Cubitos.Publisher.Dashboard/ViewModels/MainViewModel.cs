using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using Cubitos.Publisher.Dashboard.Core.Data;
using Cubitos.Publisher.Dashboard.Core.Formatting;
using Cubitos.Publisher.Dashboard.Core.Model;
using Cubitos.Publisher.Dashboard.Drawing;
using Cubitos.Publisher.Dashboard.Themes;

namespace Cubitos.Publisher.Dashboard.ViewModels;

/// <summary>State of the single dashboard window. All numbers come from <see cref="DashboardBuilder"/>.</summary>
public sealed class MainViewModel : INotifyPropertyChanged
{
    public const string ThemePreferenceKey = "dashboard.theme";
    public static readonly TimeSpan RefreshInterval = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan RecentWindow = TimeSpan.FromDays(28);
    private static readonly string[] Sections = ["ranking", "heatmap", "firstday", "queue"];

    private readonly ReadOnlyDashboardStore _store;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);
    private DashboardModel? _model;
    private string _section = "ranking";
    private int _themeIndex;
    private bool _isLoading;
    private bool _hasData;
    private string _emptyTitle = "Cargando…";
    private string _emptyDetail = "";
    private string _lastUpdated = "";
    private LaunchOptionVm? _selectedLaunch;

    public MainViewModel(ReadOnlyDashboardStore store, LaunchOptions options)
    {
        _store = store;
        if (options.Section is { } s && Sections.Contains(s.ToLowerInvariant())) _section = s.ToLowerInvariant();
        RefreshCommand = new Command(async () => await RefreshAsync());
        ShowSectionCommand = new Command<string>(s => Section = s);
        OpenVideoCommand = new Command<string>(async url =>
        {
            if (!string.IsNullOrEmpty(url)) await Launcher.Default.OpenAsync(new Uri(url));
        });
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    /// <summary>Raised when visible drawables must repaint (new data or new theme).</summary>
    public event Action? RedrawRequested;

    /// <summary>Raised when the background animation should start or stop.</summary>
    public event Action<bool>? AnimationStateChanged;

    public ICommand RefreshCommand { get; }
    public ICommand ShowSectionCommand { get; }
    public ICommand OpenVideoCommand { get; }

    public string DatabasePath => _store.DatabasePath;
    public IReadOnlyList<string> ThemeNames { get; } = ThemeCatalog.All.Select(t => t.DisplayName).ToList();
    public bool IsWindowVisible { get; private set; } = true;

    public int SelectedThemeIndex
    {
        get => _themeIndex;
        set
        {
            if (value < 0 || value >= ThemeCatalog.All.Count || value == _themeIndex) return;
            _themeIndex = value;
            OnChanged();
            ApplyTheme(ThemeCatalog.All[value], remember: true);
        }
    }

    public string Section
    {
        get => _section;
        set
        {
            if (value == _section || !Sections.Contains(value)) return;
            _section = value;
            OnChanged();
            OnChanged(nameof(IsRanking));
            OnChanged(nameof(IsHeatmap));
            OnChanged(nameof(IsFirstDay));
            OnChanged(nameof(IsQueue));
            RedrawRequested?.Invoke();
        }
    }

    public bool IsRanking => _section == "ranking";
    public bool IsHeatmap => _section == "heatmap";
    public bool IsFirstDay => _section == "firstday";
    public bool IsQueue => _section == "queue";

    public bool IsLoading { get => _isLoading; private set => Set(ref _isLoading, value); }
    public bool HasData { get => _hasData; private set { if (Set(ref _hasData, value)) OnChanged(nameof(IsEmpty)); } }
    public bool IsEmpty => !_hasData;
    public string EmptyTitle { get => _emptyTitle; private set => Set(ref _emptyTitle, value); }
    public string EmptyDetail { get => _emptyDetail; private set => Set(ref _emptyDetail, value); }
    public string LastUpdated { get => _lastUpdated; private set => Set(ref _lastUpdated, value); }

    // KPIs.
    public string TotalViews => NumberFormat.Views(_model?.Kpis.TotalViews ?? 0);
    public string ViewsToday => NumberFormat.Views(_model?.Kpis.ViewsToday ?? 0);
    public string VideosPublished => (_model?.Kpis.VideosPublished ?? 0).ToString();
    public string NextPublishEpisode => _model?.Kpis.NextPublish?.EpisodeId ?? "Nada en cola";
    public string NextPublishWhen => _model?.Kpis.NextPublish is { } n ? PeruFormat.DayTime(n.PublishAt) : "—";
    public string NextPublishCountdown => _model?.Kpis.NextPublish is { } n ? Countdown.Format(n.PublishAt - DateTimeOffset.UtcNow) : "";

    // Sections.
    public IReadOnlyList<RankingRowVm> Podium { get; private set; } = [];
    public IReadOnlyList<RankingRowVm> RankingRest { get; private set; } = [];
    public bool HasRanking => Podium.Count > 0;
    public bool HasNoRanking => !HasRanking;

    public HeatmapDrawable Heatmap { get; } = new();
    public IReadOnlyList<BestHourVm> BestHours { get; private set; } = [];
    public bool HasBestHours => BestHours.Count > 0;
    public bool HasNoBestHours => !HasBestHours;

    public FirstDayChartDrawable FirstDayChart { get; } = new();
    public IReadOnlyList<LaunchOptionVm> LaunchOptions { get; private set; } = [];
    public bool HasLaunchOptions => LaunchOptions.Count > 0;
    public bool HasNoLaunchOptions => !HasLaunchOptions;
    public bool HasAverage => _model?.ChannelAverageCurve is not null;
    public string LaunchSummary { get; private set; } = "";

    public LaunchOptionVm? SelectedLaunch
    {
        get => _selectedLaunch;
        set
        {
            if (!Set(ref _selectedLaunch, value)) return;
            FirstDayChart.Video = value?.Curve.Cumulative;
            LaunchSummary = Summary(value?.Curve);
            OnChanged(nameof(LaunchSummary));
            RedrawRequested?.Invoke();
        }
    }

    public IReadOnlyList<QueueRowVm> Queue { get; private set; } = [];
    public bool HasQueue => Queue.Count > 0;
    public bool HasNoQueue => !HasQueue;

    public void InitializeTheme(string? overrideId)
    {
        string? saved = null;
        try { saved = Preferences.Default.Get<string?>(ThemePreferenceKey, null); }
        catch (Exception) { /* preferences unavailable: use the default theme */ }
        var theme = ThemeCatalog.Find(overrideId ?? saved);
        _themeIndex = ThemeCatalog.All.ToList().IndexOf(theme);
        OnChanged(nameof(SelectedThemeIndex));
        ApplyTheme(theme, remember: false);
    }

    public void SetWindowVisible(bool visible)
    {
        if (IsWindowVisible == visible) return;
        IsWindowVisible = visible;
        AnimationStateChanged?.Invoke(visible && ThemeManager.Current.Embers);
    }

    /// <summary>Re-evaluates relative times once a second without touching the database.</summary>
    public void Tick() => OnChanged(nameof(NextPublishCountdown));

    public async Task RefreshAsync()
    {
        if (!await _refreshLock.WaitAsync(0)) return;
        IsLoading = true;
        try
        {
            var now = DateTimeOffset.UtcNow;
            var data = await Task.Run(() => _store.LoadAsync(now - RecentWindow));
            if (data is null)
            {
                _model = null;
                EmptyTitle = "El servicio todavía no juntó datos";
                EmptyDetail = $"No existe la base de datos en {_store.DatabasePath}. Se crea cuando el servicio CubitosPublisher arranca; este panel la revisa cada 30 s.";
                HasData = false;
            }
            else
            {
                _model = await Task.Run(() => DashboardBuilder.Build(data, now));
                HasData = true;
            }
            Rebuild();
            LastUpdated = $"Última actualización {PeruFormat.Clock(now)}";
        }
        catch (Exception ex)
        {
            // Keep the last good data on screen; only show the error when there is nothing else.
            LastUpdated = $"Error al leer la base ({PeruFormat.Clock(DateTimeOffset.UtcNow)}): {ex.Message}";
            if (_model is null)
            {
                EmptyTitle = "No se pudo leer la base de datos";
                EmptyDetail = ex.Message;
                HasData = false;
            }
        }
        finally
        {
            IsLoading = false;
            _refreshLock.Release();
        }
    }

    private void ApplyTheme(ThemeDefinition theme, bool remember)
    {
        ThemeManager.Apply(theme);
        if (remember)
        {
            try { Preferences.Default.Set(ThemePreferenceKey, theme.Id); }
            catch (Exception) { /* not remembered, still applied */ }
        }
        Rebuild(); // badge colors and crests depend on the theme
        AnimationStateChanged?.Invoke(IsWindowVisible && theme.Embers);
    }

    private void Rebuild()
    {
        var now = DateTimeOffset.UtcNow;
        var ranking = _model?.Ranking.Select(r => new RankingRowVm(r)).ToList() ?? [];
        Podium = ranking.Where(r => r.IsPodium).ToList();
        RankingRest = ranking.Where(r => !r.IsPodium).ToList();

        Heatmap.Model = _model?.Heatmap;
        var heatmap = _model?.Heatmap;
        BestHours = heatmap?.BestHours
            .Select((h, i) =>
            {
                var views = Enumerable.Range(0, HeatmapModel.Days).Sum(d => heatmap.Cells[d, h]);
                return new BestHourVm($"{i + 1}", PeruFormat.HourRange(h), $"{NumberFormat.Views(views)} vistas");
            })
            .ToList() ?? [];

        var previous = _selectedLaunch?.Curve.VideoId;
        LaunchOptions = _model?.LaunchCurves.Select(c => new LaunchOptionVm(c)).ToList() ?? [];
        FirstDayChart.Average = _model?.ChannelAverageCurve;
        Queue = _model?.Queue.Select(q => new QueueRowVm(q, now, OpenVideoCommand)).ToList() ?? [];

        foreach (var name in (string[])[
            nameof(TotalViews), nameof(ViewsToday), nameof(VideosPublished), nameof(NextPublishEpisode), nameof(NextPublishWhen),
            nameof(NextPublishCountdown), nameof(Podium), nameof(RankingRest), nameof(HasRanking), nameof(HasNoRanking),
            nameof(BestHours), nameof(HasBestHours), nameof(HasNoBestHours), nameof(LaunchOptions), nameof(HasLaunchOptions), nameof(HasNoLaunchOptions),
            nameof(HasAverage), nameof(Queue), nameof(HasQueue), nameof(HasNoQueue)])
            OnChanged(name);

        _selectedLaunch = null;
        SelectedLaunch = LaunchOptions.FirstOrDefault(o => o.Curve.VideoId == previous) ?? LaunchOptions.FirstOrDefault();
        RedrawRequested?.Invoke();
    }

    private string Summary(LaunchCurve? curve)
    {
        if (curve is null) return "";
        var last = curve.Cumulative.Count > 0 ? curve.Cumulative[^1] : 0;
        var text = $"{NumberFormat.Views(last)} vistas en {curve.Cumulative.Count} h";
        if (_model?.ChannelAverageCurve is { } avg && curve.Cumulative.Count > 0)
        {
            var reference = avg[curve.Cumulative.Count - 1];
            if (reference > 0) text += $"  ·  {last / reference:P0} del promedio del canal a la misma hora";
        }
        if (!curve.ObservedFromStart) text += "  ·  datos parciales: el servicio empezó a medirlo tarde";
        return text;
    }

    private bool Set<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value)) return false;
        field = value;
        OnChanged(name);
        return true;
    }

    private void OnChanged([CallerMemberName] string? name = null) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
