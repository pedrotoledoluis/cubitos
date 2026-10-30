using System.Windows.Input;
using Cubitos.Publisher.Dashboard.Core.Formatting;
using Cubitos.Publisher.Dashboard.Core.Model;
using Cubitos.Publisher.Dashboard.Drawing;
using Cubitos.Publisher.Dashboard.Themes;

namespace Cubitos.Publisher.Dashboard.ViewModels;

public sealed class RankingRowVm(RankingEntry entry)
{
    public int Position => entry.Position;
    public string Title => entry.Title;
    public string TotalViews => NumberFormat.Views(entry.TotalViews);
    public string Last1h => NumberFormat.Delta(entry.ViewsLast1h);
    public string Last24h => NumberFormat.Delta(entry.ViewsLast24h);
    public string Likes => NumberFormat.Views(entry.Likes);
    public string Comments => NumberFormat.Views(entry.Comments);
    public bool IsPodium => entry.IsPodium;
    public bool IsFirst => entry.Position == 1;
    /// <summary>Extra height over the tallest card's natural height: first place stands tallest.</summary>
    public double PodiumLift => entry.Position switch { 1 => 36, 2 => 14, _ => 0 };
    /// <summary>Column order so the podium reads 2 - 1 - 3.</summary>
    public int PodiumOrder => entry.Position switch { 1 => 1, 2 => 0, _ => 2 };
    public IDrawable Crest { get; } = new CrestDrawable(entry.Position);
    public IDrawable Sparkline { get; } = new SparklineDrawable(entry.Sparkline);
}

public sealed class QueueRowVm(QueueEntry entry, DateTimeOffset now, ICommand open)
{
    private readonly Color _badge = ThemeManager.Current.StatusColor(entry.Status);

    public string Episode => entry.EpisodeId;
    public string Title => entry.Title;
    public string StatusLabel => StatusText.Label(entry.Status);
    public Color BadgeBackground => _badge;
    public Color BadgeText => ThemeDefinition.ContrastText(_badge);
    public string PublishAt => PeruFormat.DayTime(entry.PublishAt);
    public string PublishRelative => entry.IsActive ? Countdown.Format(entry.PublishAt - now) : "";
    public bool HasRetry => entry.RetryAt is not null && entry.IsActive;
    public string RetryAt => entry.RetryAt is { } r ? $"Reintento: {PeruFormat.DayTime(r)} ({Countdown.Format(r - now)})" : "";
    public string Attempts => entry.Attempts == 1 ? "1 intento" : $"{entry.Attempts} intentos";
    public bool HasError => !string.IsNullOrWhiteSpace(entry.LastError);
    public string LastError => entry.LastError ?? "";
    public bool HasReplaces => entry.ReplacesVideoId is not null;
    public string Replaces => $"Reemplaza a {entry.ReplacesVideoId}";
    public bool HasVideo => entry.VideoUrl is not null;
    public string? VideoUrl => entry.VideoUrl;
    public ICommand OpenCommand => open;
    public double RowOpacity => entry.IsActive || entry.Status == Cubitos.Publisher.Core.Queue.QueueStatus.Failed ? 1 : 0.78;
}

public sealed record BestHourVm(string Rank, string Range, string Views);

public sealed class LaunchOptionVm(LaunchCurve curve)
{
    public LaunchCurve Curve => curve;
    public string Label => $"{curve.Title}  ·  {PeruFormat.DayTime(curve.PublishedAt)}";
}
