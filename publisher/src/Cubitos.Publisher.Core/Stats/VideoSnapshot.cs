namespace Cubitos.Publisher.Core.Stats;

/// <summary>Cumulative counters of one video at one moment; hourly views come from diffing these.</summary>
public sealed record VideoSnapshot(string VideoId, string Title, DateTimeOffset TakenAt, long Views, long Likes, long Comments);

public sealed record VideoRanking(string VideoId, string Title, long TotalViews, double ViewsLast1h, double ViewsLast24h);
