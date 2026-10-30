using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;
using Cubitos.Publisher.Dashboard.Core.Data;

namespace Cubitos.Publisher.Dashboard.Core.Model;

/// <summary>Turns raw rows into the dashboard model using the Core stats calculators.</summary>
public static class DashboardBuilder
{
    /// <summary>A launch curve counts as observed when its first snapshot is at most this long after publish.</summary>
    public static readonly TimeSpan ObservedWithin = TimeSpan.FromHours(3);

    private static readonly QueueStatus[] Waiting =
        [QueueStatus.Pending, QueueStatus.Uploading, QueueStatus.Scheduled, QueueStatus.WaitingForQuota];

    public static DashboardModel Build(DashboardData data, DateTimeOffset now)
    {
        var ranking = Ranking(data.RecentSnapshots, now);
        var launch = LaunchCurves(data, now);
        return new DashboardModel(
            Kpis(data, ranking, now),
            ranking,
            Heatmap(data.RecentSnapshots),
            launch,
            Average(launch.Where(c => c.ObservedFromStart && c.Cumulative.Count == FirstDayCurve.Hours).ToList()),
            Queue(data.Queue));
    }

    private static Kpis Kpis(DashboardData data, IReadOnlyList<RankingEntry> ranking, DateTimeOffset now)
    {
        var peruNow = PeruTime.ToPeru(now);
        var peruMidnight = new DateTimeOffset(peruNow.Date, PeruTime.Offset);
        var next = data.Queue
            .Where(q => Waiting.Contains(q.Status))
            .OrderBy(q => q.PublishAt)
            .Select(q => new NextPublish(q.EpisodeId, q.PublishAt))
            .FirstOrDefault();
        return new Kpis(
            ranking.Sum(r => r.TotalViews),
            HourlyViewsCalculator.ViewsBetween(data.RecentSnapshots, peruMidnight, now),
            data.Videos.Count > 0 ? data.Videos.Count : ranking.Count,
            next);
    }

    private static List<RankingEntry> Ranking(IReadOnlyList<VideoSnapshot> snapshots, DateTimeOffset now)
    {
        var byVideo = snapshots.ToLookup(s => s.VideoId);
        return HourlyViewsCalculator.Rank(snapshots, now)
            .Select((r, i) =>
            {
                var latest = byVideo[r.VideoId].MaxBy(s => s.TakenAt)!;
                return new RankingEntry(
                    i + 1, r.VideoId, r.Title, r.TotalViews, r.ViewsLast1h, r.ViewsLast24h, latest.Likes, latest.Comments,
                    HourlyViewsCalculator.HourlySeries(byVideo[r.VideoId], now, 24));
            })
            .ToList();
    }

    private static HeatmapModel Heatmap(IReadOnlyList<VideoSnapshot> snapshots)
    {
        var cells = new double[HeatmapModel.Days, HeatmapModel.Hours];
        foreach (var ((day, hour), views) in HourlyViewsCalculator.Heatmap(snapshots))
            cells[((int)day + 6) % 7, hour] += views; // Monday first

        var max = 0.0;
        var byHour = new double[HeatmapModel.Hours];
        for (var d = 0; d < HeatmapModel.Days; d++)
            for (var h = 0; h < HeatmapModel.Hours; h++)
            {
                max = Math.Max(max, cells[d, h]);
                byHour[h] += cells[d, h];
            }

        var best = Enumerable.Range(0, HeatmapModel.Hours)
            .Where(h => byHour[h] > 0)
            .OrderByDescending(h => byHour[h])
            .ThenBy(h => h)
            .Take(3)
            .ToList();
        return new HeatmapModel(cells, max, best);
    }

    private static List<LaunchCurve> LaunchCurves(DashboardData data, DateTimeOffset now)
    {
        var byVideo = data.LaunchSnapshots.ToLookup(s => s.VideoId);
        return data.Videos
            .Where(v => v.PublishedAt is not null && byVideo[v.VideoId].Any())
            .OrderByDescending(v => v.PublishedAt)
            .ThenBy(v => v.VideoId, StringComparer.Ordinal)
            .Select(v =>
            {
                var published = v.PublishedAt!.Value;
                var snaps = byVideo[v.VideoId].ToList();
                var perHour = FirstDayCurve.Compute(published, snaps);
                var elapsed = (int)Math.Ceiling((now - published).TotalHours);
                var points = Math.Clamp(elapsed, 1, FirstDayCurve.Hours);
                var cumulative = new double[points];
                var total = 0.0;
                for (var h = 0; h < points; h++) cumulative[h] = total += perHour[h];
                var first = snaps.Min(s => s.TakenAt);
                var title = snaps.MaxBy(s => s.TakenAt)!.Title is { Length: > 0 } t ? t : v.Title;
                return new LaunchCurve(v.VideoId, title, published, cumulative, first - published <= ObservedWithin);
            })
            .ToList();
    }

    private static double[]? Average(IReadOnlyList<LaunchCurve> curves)
    {
        if (curves.Count == 0) return null;
        var avg = new double[FirstDayCurve.Hours];
        for (var h = 0; h < avg.Length; h++) avg[h] = curves.Average(c => c.Cumulative[h]);
        return avg;
    }

    private static List<QueueEntry> Queue(IReadOnlyList<QueueItem> items)
    {
        var active = items.Where(q => q.IsActive).OrderBy(q => q.PublishAt);
        var finished = items.Where(q => !q.IsActive).OrderByDescending(q => q.PublishAt);
        return active.Concat(finished)
            .Select(q => new QueueEntry(
                q.Id, q.EpisodeId, q.Status, q.PublishAt, q.RetryAt, q.LastError, q.Attempts,
                q.NewVideoId is { Length: > 0 } id ? $"https://youtu.be/{id}" : null, q.ReplacesVideoId, q.IsActive))
            .ToList();
    }
}
