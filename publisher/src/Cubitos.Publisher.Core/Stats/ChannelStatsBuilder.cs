using System.Text.RegularExpressions;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;

namespace Cubitos.Publisher.Core.Stats;

/// <summary>Raw rows for <see cref="ChannelStatsBuilder"/>; <paramref name="TitleOf"/> gives a queued episode's human title.</summary>
public sealed record ChannelStatsInput(
    IReadOnlyList<VideoSnapshot> Snapshots,
    IReadOnlyList<CatalogVideo> Videos,
    IReadOnlyList<QueueItem> Queue,
    IReadOnlyList<UploadLogEntry> Uploads,
    Func<QueueItem, string> TitleOf);

/// <summary>Builds the public <see cref="ChannelStatsReport"/> from stored rows.</summary>
public static partial class ChannelStatsBuilder
{
    /// <summary>At most this many Peru days in the daily series.</summary>
    public const int MaxDays = 30;

    private static readonly QueueStatus[] Waiting =
        [QueueStatus.Pending, QueueStatus.Uploading, QueueStatus.Scheduled, QueueStatus.WaitingForQuota];

    public static ChannelStatsReport Build(ChannelStatsInput input, DateTimeOffset now)
    {
        var publicIds = PublicVideoIds(input, now);
        var snapshots = input.Snapshots.Where(s => publicIds.Contains(s.VideoId) && s.TakenAt <= now).ToList();
        var rows = Rows(input, snapshots, publicIds, now);
        var counted = rows.Where(r => r.Views is not null).ToList();
        var totals = new ChannelTotals(
            rows.Count, counted.Sum(r => r.Views!.Value), counted.Sum(r => r.Likes!.Value),
            counted.Sum(r => r.Comments!.Value), counted.Sum(r => r.Views24h!.Value));
        return new ChannelStatsReport(now, totals, rows, Daily(snapshots, now), Queue(input, now));
    }

    /// <summary>"019-cancion-criolla" becomes "Cancion criolla" (used when the episode metadata is unreadable).</summary>
    public static string TitleFromSlug(string episodeId)
    {
        var dash = episodeId.IndexOf('-');
        var rest = dash > 0 && episodeId[..dash].All(char.IsDigit) ? episodeId[(dash + 1)..] : episodeId;
        var words = rest.Replace('-', ' ').Replace('_', ' ').Trim();
        return words.Length == 0 ? episodeId : char.ToUpperInvariant(words[0]) + words[1..];
    }

    /// <summary>
    /// Videos recorded as public. When privacy was never recorded (rows from before it was stored), a video counts as
    /// public unless the queue or upload log shows it hidden or still scheduled. Future publish dates never count.
    /// </summary>
    private static HashSet<string> PublicVideoIds(ChannelStatsInput input, DateTimeOffset now)
    {
        var hidden = new HashSet<string>(StringComparer.Ordinal);
        foreach (var item in input.Queue)
        {
            if (item is { Status: QueueStatus.ReplacedOldHidden, ReplacesVideoId: { } old }) hidden.Add(old);
            if (item is { Status: QueueStatus.Scheduled or QueueStatus.Uploading, NewVideoId: { } scheduled }) hidden.Add(scheduled);
        }
        foreach (var entry in input.Uploads)
        {
            if (OldSuffix().IsMatch(entry.EpisodeId) || entry.PublishAt > now) hidden.Add(entry.VideoId);
        }

        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var video in input.Videos)
        {
            if (video.PublishedAt > now) continue;
            var visible = video.Privacy switch
            {
                VideoPrivacy.Public => true,
                null => !hidden.Contains(video.VideoId),
                _ => false,
            };
            if (visible) ids.Add(video.VideoId);
        }
        return ids;
    }

    private static List<VideoStatsRow> Rows(
        ChannelStatsInput input, List<VideoSnapshot> snapshots, HashSet<string> publicIds, DateTimeOffset now)
    {
        var byVideo = snapshots.ToLookup(s => s.VideoId);
        var ranking = HourlyViewsCalculator.Rank(snapshots, now).ToDictionary(r => r.VideoId);
        return input.Videos
            .Where(v => publicIds.Contains(v.VideoId))
            .DistinctBy(v => v.VideoId)
            .Select(v =>
            {
                if (!ranking.TryGetValue(v.VideoId, out var rank))
                    return new VideoStatsRow(v.VideoId, v.Title, v.PublishedAt, null, null, null, null, []);
                var latest = byVideo[v.VideoId].MaxBy(s => s.TakenAt)!;
                var trend = HourlyViewsCalculator.HourlySeries(byVideo[v.VideoId], now, 24).Select(Round).ToList();
                return new VideoStatsRow(
                    v.VideoId, v.Title, v.PublishedAt, latest.Views, latest.Likes, latest.Comments, Round(rank.ViewsLast24h), trend);
            })
            .OrderByDescending(r => r.Views ?? -1)
            .ThenBy(r => r.VideoId, StringComparer.Ordinal)
            .ToList();
    }

    private static List<DailyViewsPoint> Daily(List<VideoSnapshot> snapshots, DateTimeOffset now)
    {
        if (snapshots.Count == 0) return [];
        var today = DateOnly.FromDateTime(PeruTime.ToPeru(now).DateTime);
        var first = DateOnly.FromDateTime(PeruTime.ToPeru(snapshots.Min(s => s.TakenAt)).DateTime);
        if (first < today.AddDays(1 - MaxDays)) first = today.AddDays(1 - MaxDays);

        var byVideo = snapshots.GroupBy(s => s.VideoId).Select(g => g.OrderBy(s => s.TakenAt).ToList()).ToList();
        var points = new List<DailyViewsPoint>();
        for (var day = first; day <= today; day = day.AddDays(1))
        {
            var end = new DateTimeOffset(day.AddDays(1).ToDateTime(TimeOnly.MinValue), PeruTime.Offset);
            if (end > now) end = now.AddTicks(1);
            var total = byVideo.Sum(list => list.LastOrDefault(s => s.TakenAt < end)?.Views ?? 0);
            points.Add(new DailyViewsPoint(day, total));
        }
        return points;
    }

    private static QueueSummary Queue(ChannelStatsInput input, DateTimeOffset now)
    {
        var counts = input.Queue.GroupBy(i => i.Status).ToDictionary(g => g.Key, g => g.Count());
        var upcoming = input.Queue
            .Where(i => Waiting.Contains(i.Status))
            .OrderBy(Expected)
            .ThenBy(i => i.EpisodeId, StringComparer.Ordinal)
            .Select(i => new QueueEntry(i.EpisodeId, input.TitleOf(i), i.Status, i.PublishAt, i.RetryAt))
            .ToList();
        return new QueueSummary(counts, upcoming.FirstOrDefault(), upcoming);
    }

    /// <summary>The item cannot go out before its publish time nor before its retry time.</summary>
    private static DateTimeOffset Expected(QueueItem item) =>
        item.RetryAt is { } retry && retry > item.PublishAt ? retry : item.PublishAt;

    private static long Round(double value) => (long)Math.Round(value, MidpointRounding.AwayFromZero);

    [GeneratedRegex(@"-old\d*$")]
    private static partial Regex OldSuffix();
}
