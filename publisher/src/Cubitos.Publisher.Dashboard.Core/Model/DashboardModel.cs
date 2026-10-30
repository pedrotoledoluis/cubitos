using Cubitos.Publisher.Core.Queue;

namespace Cubitos.Publisher.Dashboard.Core.Model;

/// <summary>Everything one dashboard refresh renders, already computed and ordered.</summary>
public sealed record DashboardModel(
    Kpis Kpis,
    IReadOnlyList<RankingEntry> Ranking,
    HeatmapModel Heatmap,
    IReadOnlyList<LaunchCurve> LaunchCurves,
    IReadOnlyList<double>? ChannelAverageCurve,
    IReadOnlyList<QueueEntry> Queue);

/// <param name="Title">Episode title from its metadata, the uploaded video, or the folder name.</param>
public sealed record NextPublish(string EpisodeId, string Title, DateTimeOffset PublishAt);

/// <param name="ViewsToday">Views earned since midnight of the current Peru day.</param>
public sealed record Kpis(long TotalViews, double ViewsToday, int VideosPublished, NextPublish? NextPublish);

/// <param name="Sparkline">Views per hour for the last 24 h, oldest first.</param>
public sealed record RankingEntry(
    int Position, string VideoId, string Title, long TotalViews, double ViewsLast1h, double ViewsLast24h,
    long Likes, long Comments, IReadOnlyList<double> Sparkline)
{
    public bool IsPodium => Position <= 3;
}

/// <param name="Cells">Views by [day, hour] in Peru time; day 0 is Monday.</param>
/// <param name="BestHours">Up to three hours of the day with the most views, best first.</param>
public sealed record HeatmapModel(double[,] Cells, double Max, IReadOnlyList<int> BestHours)
{
    public const int Days = 7;
    public const int Hours = 24;
}

/// <param name="Cumulative">Total views at the end of each hour since publish (at most 24 points, fewer for young videos).</param>
/// <param name="ObservedFromStart">True when the first snapshot came soon after publish, so the curve shape is real.</param>
public sealed record LaunchCurve(
    string VideoId, string Title, DateTimeOffset PublishedAt, IReadOnlyList<double> Cumulative, bool ObservedFromStart);

public sealed record QueueEntry(
    Guid Id, string EpisodeId, QueueStatus Status, DateTimeOffset PublishAt, DateTimeOffset? RetryAt,
    string? LastError, int Attempts, string? VideoUrl, string? ReplacesVideoId, bool IsActive, string Title);
