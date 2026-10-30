using System.Text.RegularExpressions;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Stats;
using Microsoft.Extensions.Logging;

namespace Cubitos.Publisher.Worker.Application;

/// <summary>
/// One pass of the stats loop: refreshes the <c>videos</c> catalog from the channel and stores one cumulative
/// snapshot per video. Hourly views come later from diffing snapshots (YouTube gives no hourly counts).
/// </summary>
public sealed partial class StatsCycle(
    IVideoPlatform platform,
    IVideoCatalog catalog,
    ISnapshotStore snapshots,
    IUploadLog uploadLog,
    ILogger<StatsCycle> logger)
{
    /// <returns>The number of snapshots written.</returns>
    public async Task<int> RunOnceAsync(DateTimeOffset now, CancellationToken ct = default)
    {
        var videos = (await platform.ListChannelVideosAsync(ct)).Where(v => !string.IsNullOrEmpty(v.VideoId)).ToList();
        var episodeByVideo = await EpisodeIdsByVideoAsync(ct);
        foreach (var v in videos)
            await catalog.UpsertAsync(new CatalogVideo(v.VideoId, v.Title, v.PublishedAt, episodeByVideo.GetValueOrDefault(v.VideoId)), ct);

        // The platform adapter splits ids into API-sized batches.
        var stats = await platform.GetStatsAsync(videos.Select(v => v.VideoId).Distinct().ToList(), ct);
        await snapshots.AddRangeAsync(stats.Select(s => new VideoSnapshot(s.VideoId, s.Title, now, s.Views, s.Likes, s.Comments)), ct);
        logger.LogInformation("Stats: {Videos} channel videos, {Snapshots} snapshots written", videos.Count, stats.Count);
        return stats.Count;
    }

    /// <summary>Maps video ids to episode ids from the upload log; <c>019-x-old2</c> keys map back to <c>019-x</c>.</summary>
    private async Task<Dictionary<string, string>> EpisodeIdsByVideoAsync(CancellationToken ct)
    {
        var map = new Dictionary<string, string>();
        try
        {
            foreach (var e in await uploadLog.ReadAllAsync(ct))
                map[e.VideoId] = OldSuffix().Replace(e.EpisodeId, "");
        }
        catch (Exception ex) when (ex is IOException or InvalidDataException or System.Text.Json.JsonException)
        {
            logger.LogWarning(ex, "Upload log unreadable; catalog episode links not refreshed");
        }
        return map;
    }

    [GeneratedRegex(@"-old\d*$")]
    private static partial Regex OldSuffix();
}
