using Cubitos.Publisher.Core.Episodes;
using Cubitos.Publisher.Core.Planning;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Microsoft.Extensions.Logging;

namespace Cubitos.Publisher.Worker.Application;

/// <summary>
/// One pass of the publish loop: runs the planner's actions in order and persists every transition immediately,
/// so a crash never loses an upload. Each item is isolated: its failure is logged and the next item still runs.
/// </summary>
public sealed class PublishCycle(
    IQueueStore queue,
    IVideoPlatform platform,
    IEpisodeReader episodes,
    IUploadLog uploadLog,
    IClock clock,
    ILogger<PublishCycle> logger)
{
    public async Task RunOnceAsync(DateTimeOffset now, CancellationToken ct = default)
    {
        var actions = PublishPlanner.Plan(now, await queue.GetAllAsync(ct));
        foreach (var action in actions)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                switch (action.Kind)
                {
                    case PlannedActionKind.Upload: await UploadAsync(action.Item, action.UploadPublishAt, now, ct); break;
                    case PlannedActionKind.CheckPublished: await CheckPublishedAsync(action.Item, now, ct); break;
                    case PlannedActionKind.HideOldVideo: await HideOldVideoAsync(action.Item, now, ct); break;
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "{Action} failed for {Episode} ({ItemId}); will retry next cycle",
                    action.Kind, action.Item.EpisodeId, action.Item.Id);
            }
        }
    }

    /// <summary>
    /// Fails items a crash left in Uploading: the upload may or may not exist on the channel, so re-uploading
    /// automatically could publish twice. The owner checks the channel and re-enqueues.
    /// </summary>
    public async Task RecoverInterruptedAsync(CancellationToken ct = default)
    {
        foreach (var item in (await queue.GetAllAsync(ct)).Where(i => i.Status == QueueStatus.Uploading))
        {
            item.Fail("Upload interrupted (service stopped or crashed); check the channel, then re-enqueue.", clock.UtcNow);
            await queue.UpdateAsync(item, ct);
            logger.LogWarning("Marked interrupted upload of {Episode} ({ItemId}) as failed", item.EpisodeId, item.Id);
        }
    }

    private async Task UploadAsync(QueueItem item, DateTimeOffset? publishAt, DateTimeOffset now, CancellationToken ct)
    {
        EpisodePackage package;
        try
        {
            package = episodes.Read(item.EpisodeDir);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Text.Json.JsonException)
        {
            await SaveAsync(item, i => i.Fail($"Episode package invalid: {ex.Message}", now), ct);
            logger.LogError("Episode {Episode} ({ItemId}) failed: {Error}", item.EpisodeId, item.Id, ex.Message);
            return;
        }

        if (await ShouldKeepOldVideoAsync(item, ct))
        {
            await SaveAsync(item, i => i.Keep(now), ct);
            logger.LogInformation("Kept old video {OldVideo} for {Episode}; no upload", item.ReplacesVideoId, item.EpisodeId);
            return;
        }

        await SaveAsync(item, i => i.StartUpload(now), ct);
        logger.LogInformation("Uploading {Episode} ({ItemId}), publishAt {PublishAt}", item.EpisodeId, item.Id,
            publishAt?.ToString("o") ?? "now (public)");

        string videoId;
        try
        {
            videoId = await platform.UploadAsync(package, publishAt, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            await SaveAsync(item, i => i.RetryLater(now, "Upload interrupted by shutdown.", now), CancellationToken.None);
            throw;
        }
        catch (UploadLimitExceededException ex)
        {
            var recent = (await uploadLog.ReadAllAsync(ct)).Select(e => e.UploadedAt);
            var retryAt = UploadLimitBackoff.ComputeRetryAt(now, recent);
            await SaveAsync(item, i => i.WaitForQuota(retryAt, ex.Message, now), ct);
            logger.LogWarning("Upload limit hit for {Episode}; retry at {RetryAt:o}", item.EpisodeId, retryAt);
            return;
        }
        catch (PlatformQuotaExceededException ex)
        {
            var retryAt = QuotaReset.NextRetryAt(now);
            await SaveAsync(item, i => i.WaitForQuota(retryAt, ex.Message, now), ct);
            logger.LogWarning("API quota exhausted for {Episode}; retry at {RetryAt:o}", item.EpisodeId, retryAt);
            return;
        }
        catch (Exception ex)
        {
            var decision = TransientRetryPolicy.Next(item.Attempts, now);
            if (decision.GiveUp)
                await SaveAsync(item, i => i.Fail(ex.Message, now), ct);
            else
                await SaveAsync(item, i => i.RetryLater(decision.RetryAt!.Value, ex.Message, now), ct);
            logger.LogWarning(ex, "Upload of {Episode} failed (attempt {Attempt}); {Outcome}", item.EpisodeId, item.Attempts,
                decision.GiveUp ? "giving up" : $"retry at {decision.RetryAt:o}");
            return;
        }

        await SaveAsync(item, i =>
        {
            if (publishAt is null) i.MarkUploadedPublic(videoId, now);
            else i.MarkScheduled(videoId, now);
        }, ct);
        logger.LogInformation("Uploaded {Episode} as {VideoId} ({Status})", item.EpisodeId, videoId, item.Status);

        await AfterUploadAsync(item, package, videoId, publishAt, ct);
    }

    /// <summary>Best-effort follow-ups: neither the log nor the thumbnail may fail an uploaded item.</summary>
    private async Task AfterUploadAsync(QueueItem item, EpisodePackage package, string videoId, DateTimeOffset? publishAt, CancellationToken ct)
    {
        try
        {
            await uploadLog.AppendAsync(new UploadLogEntry(item.EpisodeId, videoId, clock.UtcNow, publishAt), ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Could not write the upload log for {Episode} ({VideoId})", item.EpisodeId, videoId);
        }

        if (package.ThumbnailPath is null) return;
        try
        {
            await platform.SetThumbnailAsync(videoId, package.ThumbnailPath, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Thumbnail upload failed for {Episode} ({VideoId}); the video is kept", item.EpisodeId, videoId);
        }
    }

    private async Task<bool> ShouldKeepOldVideoAsync(QueueItem item, CancellationToken ct)
    {
        if (item.ReplacesVideoId is not { } oldId || item.KeepIfViewsAtLeast is null) return false;
        var stats = (await platform.GetStatsAsync([oldId], ct)).FirstOrDefault(s => s.VideoId == oldId);
        if (stats is null) return false;
        logger.LogInformation("Old video {OldVideo} has {Views} views (keep threshold {Threshold})",
            oldId, stats.Views, item.KeepIfViewsAtLeast);
        return ReplacementPolicy.Decide(stats.Views, item.KeepIfViewsAtLeast) == ReplacementDecision.Keep;
    }

    private async Task CheckPublishedAsync(QueueItem item, DateTimeOffset now, CancellationToken ct)
    {
        var videoId = item.NewVideoId ?? throw new InvalidOperationException($"Scheduled item {item.Id} has no video id.");
        VideoPrivacy privacy;
        try
        {
            privacy = await platform.GetPrivacyAsync(videoId, ct);
        }
        catch (KeyNotFoundException ex)
        {
            await SaveAsync(item, i => i.Fail($"Scheduled video {videoId} not found: {ex.Message}", now), ct);
            logger.LogError("Scheduled video {VideoId} of {Episode} is gone", videoId, item.EpisodeId);
            return;
        }

        if (privacy != VideoPrivacy.Public)
        {
            logger.LogInformation("{Episode} ({VideoId}) is still {Privacy}; checking again next cycle", item.EpisodeId, videoId, privacy);
            return;
        }
        await SaveAsync(item, i => i.MarkPublished(now), ct);
        logger.LogInformation("{Episode} ({VideoId}) is public", item.EpisodeId, videoId);
    }

    private async Task HideOldVideoAsync(QueueItem item, DateTimeOffset now, CancellationToken ct)
    {
        var oldId = item.ReplacesVideoId!;
        try
        {
            await platform.SetPrivateAsync(oldId, ct);
        }
        catch (KeyNotFoundException ex)
        {
            await SaveAsync(item, i => i.FailOldVideoHide($"Could not hide old video {oldId}: {ex.Message}", now), ct);
            logger.LogError("Old video {OldVideo} of {Episode} not found; nothing hidden", oldId, item.EpisodeId);
            return;
        }
        await SaveAsync(item, i => i.MarkOldHidden(now), ct);
        logger.LogInformation("Set old video {OldVideo} private; {Episode} replaced", oldId, item.EpisodeId);
    }

    private async Task SaveAsync(QueueItem item, Action<QueueItem> transition, CancellationToken ct)
    {
        transition(item);
        await queue.UpdateAsync(item, ct);
    }
}
