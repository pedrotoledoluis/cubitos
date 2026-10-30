using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Windows;
using System.Windows.Input;
using Cubitos.Publisher.Dashboard.Core.Data;
using Cubitos.Publisher.Dashboard.Core.Formatting;
using Cubitos.Publisher.Dashboard.Core.Model;
using Cubitos.Publisher.Dashboard.Core.Presentation;
using Cubitos.Publisher.Desktop.Themes;

namespace Cubitos.Publisher.Desktop.ViewModels;

/// <summary>State of the dashboard window. All numbers come from <see cref="DashboardBuilder"/>.</summary>
public sealed class MainViewModel : Observable
{
    public static readonly TimeSpan RefreshInterval = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan RecentWindow = TimeSpan.FromDays(28);

    private readonly ReadOnlyDashboardStore _store;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);
    private DashboardModel? _model;
    private string _section = Sections.Ranking;
    private ThemeDefinition _theme = ThemeCatalog.Cubitos;
    private bool _isLoading;
    private bool _hasData;
    private string _emptyTitle = "Cargando…";
    private string _emptyDetail = "";
    private string _lastUpdated = "";
    private LaunchOptionVm? _selectedLaunch;
    private string _launchSummary = "";

    public MainViewModel(ReadOnlyDashboardStore store, string? section)
    {
        _store = store;
        if (Sections.Normalize(section) is { } s) _section = s;
        RefreshCommand = new RelayCommand(async _ => await RefreshAsync());
        OpenVideoCommand = new RelayCommand(url =>
        {
            if (url is string { Length: > 0 } u && Uri.TryCreate(u, UriKind.Absolute, out var uri) && uri.Scheme is "https" or "http")
                Process.Start(new ProcessStartInfo(uri.ToString()) { UseShellExecute = true });
        });
    }

    /// <summary>Raised when the theme changes (after the resources were swapped).</summary>
    public event Action<ThemeDefinition>? ThemeChanged;

    /// <summary>Raised just before the theme resources are swapped (the window snapshots itself to cross-fade).</summary>
    public event Action? ThemeChanging;

    public ICommand RefreshCommand { get; }
    public ICommand OpenVideoCommand { get; }

    public string DatabasePath => _store.DatabasePath;
    public IReadOnlyList<ThemeDefinition> Themes => ThemeCatalog.All;

    public ThemeDefinition Theme
    {
        get => _theme;
        set
        {
            if (value is null || value == _theme) return;
            ThemeChanging?.Invoke();
            _theme = value;
            ThemeManager.Apply(value);
            RebuildThemed();
            OnChanged();
            ThemeChanged?.Invoke(value);
        }
    }

    public string Section
    {
        get => _section;
        set
        {
            if (Sections.Normalize(value) is not { } s || s == _section) return;
            _section = s;
            OnChanged();
        }
    }

    public bool IsLoading { get => _isLoading; private set => Set(ref _isLoading, value); }
    public bool HasData { get => _hasData; private set => Set(ref _hasData, value); }
    public string EmptyTitle { get => _emptyTitle; private set => Set(ref _emptyTitle, value); }
    public string EmptyDetail { get => _emptyDetail; private set => Set(ref _emptyDetail, value); }
    public string LastUpdated { get => _lastUpdated; private set => Set(ref _lastUpdated, value); }

    // KPIs.
    public double TotalViews => _model?.Kpis.TotalViews ?? 0;
    public double ViewsToday => _model?.Kpis.ViewsToday ?? 0;
    public double VideosPublished => _model?.Kpis.VideosPublished ?? 0;
    public string NextPublishTitle => _model?.Kpis.NextPublish?.Title ?? "Nada en cola";
    public string NextPublishWhen => _model?.Kpis.NextPublish is { } n ? PeruFormat.DayTime(n.PublishAt) : "—";
    public string NextPublishCountdown => _model?.Kpis.NextPublish is { } n ? Countdown.Format(n.PublishAt - DateTimeOffset.UtcNow) : "";

    // Sections.
    public ObservableCollection<RankingRowVm> Podium { get; } = [];
    public ObservableCollection<RankingRowVm> RankingRest { get; } = [];
    public bool HasRanking => Podium.Count > 0;

    public HeatmapModel? Heatmap => _model?.Heatmap;
    public IReadOnlyList<BestHourVm> BestHours { get; private set; } = [];
    public bool HasBestHours => BestHours.Count > 0;

    public IReadOnlyList<LaunchOptionVm> LaunchOptions { get; private set; } = [];
    public bool HasLaunchOptions => LaunchOptions.Count > 0;
    public IReadOnlyList<double>? ChannelAverage => _model?.ChannelAverageCurve;
    public bool HasAverage => _model?.ChannelAverageCurve is not null;
    public string LaunchSummary { get => _launchSummary; private set => Set(ref _launchSummary, value); }

    public LaunchOptionVm? SelectedLaunch
    {
        get => _selectedLaunch;
        set
        {
            if (!Set(ref _selectedLaunch, value)) return;
            LaunchSummary = Summary(value?.Curve);
        }
    }

    public IReadOnlyList<QueueRowVm> Queue { get; private set; } = [];
    public bool HasQueue => Queue.Count > 0;

    public void InitializeTheme(ThemeDefinition theme)
    {
        _theme = theme;
        ThemeManager.Apply(theme);
        OnChanged(nameof(Theme));
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
            var store = _store;
            var model = await Task.Run(async () =>
            {
                var data = await store.LoadAsync(now - RecentWindow);
                return data is null ? null : DashboardBuilder.Build(data, now);
            });
            if (model is null)
            {
                _model = null;
                EmptyTitle = "El servicio todavía no juntó datos";
                EmptyDetail = $"No existe la base de datos en {_store.DatabasePath}. Se crea cuando el servicio CubitosPublisher arranca; este panel la revisa cada 30 s.";
                HasData = false;
            }
            else
            {
                _model = model;
                HasData = true;
            }
            Rebuild(now);
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

    private void Rebuild(DateTimeOffset now)
    {
        var ranking = _model?.Ranking ?? [];
        KeyedListSync.Apply(Podium, ranking.Where(r => r.IsPodium).ToList(), r => r.VideoId, m => m.VideoId, m => new RankingRowVm(m), (r, m) => r.Update(m));
        KeyedListSync.Apply(RankingRest, ranking.Where(r => !r.IsPodium).ToList(), r => r.VideoId, m => m.VideoId, m => new RankingRowVm(m), (r, m) => r.Update(m));

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
        Queue = _model?.Queue.Select(q => new QueueRowVm(q, now)).ToList() ?? [];

        foreach (var name in (string[])[
            nameof(TotalViews), nameof(ViewsToday), nameof(VideosPublished), nameof(NextPublishTitle), nameof(NextPublishWhen),
            nameof(NextPublishCountdown), nameof(HasRanking), nameof(Heatmap), nameof(BestHours), nameof(HasBestHours),
            nameof(LaunchOptions), nameof(HasLaunchOptions), nameof(ChannelAverage), nameof(HasAverage), nameof(Queue), nameof(HasQueue)])
            OnChanged(name);

        _selectedLaunch = null;
        SelectedLaunch = LaunchOptions.FirstOrDefault(o => o.Curve.VideoId == previous) ?? LaunchOptions.FirstOrDefault();
    }

    /// <summary>Badge colors depend on the theme.</summary>
    private void RebuildThemed()
    {
        if (_model is null) return;
        var now = DateTimeOffset.UtcNow;
        Queue = _model.Queue.Select(q => new QueueRowVm(q, now)).ToList();
        OnChanged(nameof(Queue));
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

    public static Visibility Show(bool value) => value ? Visibility.Visible : Visibility.Collapsed;
}
