using System.Text.Json;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;
using Microsoft.Extensions.Logging;

namespace Cubitos.Publisher.Worker.Application;

/// <summary>Reads the stored stats, queue and upload log and writes the public channel stats summary.</summary>
public sealed class ChannelStatsExport(
    ISnapshotStore snapshots,
    IVideoCatalog catalog,
    IQueueStore queue,
    IUploadLog uploadLog,
    IEpisodeReader episodes,
    IChannelStatsWriter writer,
    ILogger<ChannelStatsExport> logger)
{
    /// <summary>Snapshots older than this are not read (the daily series covers 30 Peru days).</summary>
    public static readonly TimeSpan Window = TimeSpan.FromDays(ChannelStatsBuilder.MaxDays + 1);

    /// <param name="target">Where to write; null uses the configured writer.</param>
    public async Task<ChannelStatsReport> RunAsync(DateTimeOffset now, IChannelStatsWriter? target = null, CancellationToken ct = default)
    {
        var input = new ChannelStatsInput(
            await snapshots.GetSinceAsync(now - Window, ct),
            await catalog.GetAllAsync(ct),
            await queue.GetAllAsync(ct),
            await UploadsAsync(ct),
            TitleOf);
        var report = ChannelStatsBuilder.Build(input, now);
        await (target ?? writer).WriteAsync(report, ct);
        return report;
    }

    private async Task<IReadOnlyList<UploadLogEntry>> UploadsAsync(CancellationToken ct)
    {
        try
        {
            return await uploadLog.ReadAllAsync(ct);
        }
        catch (Exception ex) when (ex is IOException or InvalidDataException or JsonException)
        {
            logger.LogWarning("Upload log unreadable; stats export relies on recorded privacy only");
            return [];
        }
    }

    private string TitleOf(QueueItem item)
    {
        try
        {
            return episodes.Read(item.EpisodeDir).Title;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException or ArgumentException)
        {
            return ChannelStatsBuilder.TitleFromSlug(item.EpisodeId);
        }
    }
}
