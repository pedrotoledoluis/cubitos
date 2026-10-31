using Cubitos.Publisher.Core.Queue;

namespace Cubitos.Publisher.Core.Stats;

/// <summary>Public summary of the channel for the website: only public videos, no paths, errors or private ids.</summary>
public sealed record ChannelStatsReport(
    DateTimeOffset GeneratedAt,
    ChannelTotals Channel,
    IReadOnlyList<VideoStatsRow> Videos,
    IReadOnlyList<DailyViewsPoint> DailyViews,
    QueueSummary Queue);

/// <summary>Sums over the public videos' latest snapshots. Subscribers are not recorded, so they are not reported.</summary>
public sealed record ChannelTotals(int Videos, long Views, long Likes, long Comments, long Views24h);

/// <summary>One public video. Counters are null when the video has no snapshot yet.</summary>
/// <param name="Trend24h">Views gained per hour over the last 24 h, oldest first (empty without snapshots).</param>
public sealed record VideoStatsRow(
    string VideoId,
    string Title,
    DateTimeOffset? PublishedAt,
    long? Views,
    long? Likes,
    long? Comments,
    long? Views24h,
    IReadOnlyList<long> Trend24h);

/// <summary>Total channel views at the end of a Peru day (or now, for today).</summary>
public sealed record DailyViewsPoint(DateOnly Date, long Views);

/// <param name="Counts">Queue items per status (all items, finished ones included).</param>
/// <param name="Next">The waiting item expected to publish first, or null.</param>
/// <param name="Upcoming">Waiting items in expected order.</param>
public sealed record QueueSummary(IReadOnlyDictionary<QueueStatus, int> Counts, QueueEntry? Next, IReadOnlyList<QueueEntry> Upcoming);

/// <summary>A waiting episode: slug and title only.</summary>
/// <param name="RetryAt">When the service retries (quota or transient error), if later than the publish time matters.</param>
public sealed record QueueEntry(string EpisodeId, string Title, QueueStatus Status, DateTimeOffset PublishAt, DateTimeOffset? RetryAt);
