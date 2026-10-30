namespace Cubitos.Publisher.Core.Stats;

public static class HourlyViewsCalculator
{
    /// <summary>Views per (day of week, hour) in Peru time, summed over all videos.</summary>
    public static IReadOnlyDictionary<(DayOfWeek Day, int Hour), double> Heatmap(IEnumerable<VideoSnapshot> snapshots)
    {
        // Peru's offset is a whole number of hours, so UTC hour boundaries are Peru hour boundaries.
        var anchor = DateTimeOffset.UnixEpoch;
        var map = new Dictionary<(DayOfWeek, int), double>();
        foreach (var (_, span) in ViewDeltas.Spans(snapshots))
        {
            foreach (var (bucketStart, views) in span.SplitHourly(anchor))
            {
                var peru = PeruTime.ToPeru(bucketStart);
                var key = (peru.DayOfWeek, peru.Hour);
                map[key] = map.GetValueOrDefault(key) + views;
            }
        }
        return map;
    }

    /// <summary>Per-video ranking by total views, with views earned in the last 1 h and 24 h.</summary>
    public static IReadOnlyList<VideoRanking> Rank(IEnumerable<VideoSnapshot> snapshots, DateTimeOffset now)
    {
        var all = snapshots.ToList();
        var spans = ViewDeltas.Spans(all).ToLookup(s => s.VideoId, s => s.Span);
        return all
            .GroupBy(s => s.VideoId)
            .Select(video =>
            {
                var latest = video.MaxBy(s => s.TakenAt)!;
                var videoSpans = spans[video.Key].ToList();
                return new VideoRanking(
                    video.Key, latest.Title, latest.Views,
                    videoSpans.Sum(s => s.ViewsWithin(now.AddHours(-1), now)),
                    videoSpans.Sum(s => s.ViewsWithin(now.AddHours(-24), now)));
            })
            .OrderByDescending(r => r.TotalViews)
            .ThenBy(r => r.VideoId, StringComparer.Ordinal)
            .ToList();
    }
}
