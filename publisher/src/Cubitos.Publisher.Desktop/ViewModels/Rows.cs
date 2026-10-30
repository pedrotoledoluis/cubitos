using System.Windows;
using System.Windows.Media;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Dashboard.Core.Formatting;
using Cubitos.Publisher.Dashboard.Core.Model;
using Cubitos.Publisher.Desktop.Themes;

namespace Cubitos.Publisher.Desktop.ViewModels;

/// <summary>One ranked video. Updated in place on refresh so its numbers count up instead of the row being rebuilt.</summary>
public sealed class RankingRowVm : Observable
{
    private RankingEntry _entry;

    public RankingRowVm(RankingEntry entry) => _entry = entry;

    public string VideoId => _entry.VideoId;
    public int Position => _entry.Position;
    public string Title => _entry.Title;
    public double TotalViews => _entry.TotalViews;
    public double Last1h => _entry.ViewsLast1h;
    public double Last24h => _entry.ViewsLast24h;
    public double Likes => _entry.Likes;
    public double Comments => _entry.Comments;
    public IReadOnlyList<double> Sparkline => _entry.Sparkline;
    public bool IsPodium => _entry.IsPodium;
    public bool IsFirst => _entry.Position == 1;

    /// <summary>Extra height over the tallest card's natural height: first place stands tallest.</summary>
    public double PodiumLift => _entry.Position switch { 1 => 36, 2 => 14, _ => 0 };

    /// <summary>Column order so the podium reads 2 - 1 - 3.</summary>
    public int PodiumOrder => _entry.Position switch { 1 => 1, 2 => 0, _ => 2 };

    public void Update(RankingEntry entry)
    {
        var old = _entry;
        _entry = entry;
        if (old.Title != entry.Title) OnChanged(nameof(Title));
        if (old.TotalViews != entry.TotalViews) OnChanged(nameof(TotalViews));
        if (old.ViewsLast1h != entry.ViewsLast1h) OnChanged(nameof(Last1h));
        if (old.ViewsLast24h != entry.ViewsLast24h) OnChanged(nameof(Last24h));
        if (old.Likes != entry.Likes) OnChanged(nameof(Likes));
        if (old.Comments != entry.Comments) OnChanged(nameof(Comments));
        if (!old.Sparkline.SequenceEqual(entry.Sparkline)) OnChanged(nameof(Sparkline));
    }
}

public sealed class QueueRowVm(QueueEntry entry, DateTimeOffset now)
{
    private readonly Color _badge = ThemeManager.Current.StatusColor(entry.Status);

    public Guid Id => entry.Id;
    public string Episode => entry.EpisodeId;
    public string Title => entry.Title;
    public string StatusLabel => StatusText.Label(entry.Status);
    public Brush BadgeBackground => ThemeManager.Solid(_badge);
    public Brush BadgeText => ThemeManager.Solid(ThemeDefinition.ContrastText(_badge));
    public string PublishAt => PeruFormat.DayTime(entry.PublishAt);
    public string PublishRelative => entry.IsActive ? Countdown.Format(entry.PublishAt - now) : "";
    public Visibility RetryVisibility => entry.RetryAt is not null && entry.IsActive ? Visibility.Visible : Visibility.Collapsed;
    public string RetryAt => entry.RetryAt is { } r ? $"Reintento: {PeruFormat.DayTime(r)} ({Countdown.Format(r - now)})" : "";
    public string Attempts => entry.Attempts == 1 ? "1 intento" : $"{entry.Attempts} intentos";
    public Visibility ErrorVisibility => string.IsNullOrWhiteSpace(entry.LastError) ? Visibility.Collapsed : Visibility.Visible;
    public string LastError => entry.LastError ?? "";
    public Visibility ReplacesVisibility => entry.ReplacesVideoId is null ? Visibility.Collapsed : Visibility.Visible;
    public string Replaces => $"Reemplaza a {entry.ReplacesVideoId}";
    public Visibility VideoVisibility => entry.VideoUrl is null ? Visibility.Collapsed : Visibility.Visible;
    public string? VideoUrl => entry.VideoUrl;
    public double RowOpacity => entry.IsActive || entry.Status == QueueStatus.Failed ? 1 : 0.78;
}

public sealed record BestHourVm(string Rank, string Range, string Views);

public sealed class LaunchOptionVm(LaunchCurve curve)
{
    public LaunchCurve Curve => curve;
    public string Label => $"{curve.Title}  ·  {PeruFormat.DayTime(curve.PublishedAt)}";
    public override string ToString() => Label;
}
