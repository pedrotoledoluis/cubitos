namespace Cubitos.Publisher.Core.Queue;

/// <summary>An episode queued for publishing. State changes only through the transition methods.</summary>
public sealed class QueueItem
{
    public Guid Id { get; }
    public string EpisodeId { get; }
    /// <summary>Repo-relative episode folder, e.g. <c>videos/019-x</c>.</summary>
    public string EpisodeDir { get; }
    public DateTimeOffset PublishAt { get; }
    public string? ReplacesVideoId { get; }
    /// <summary>Keep the old video when it has at least this many views; null always replaces.</summary>
    public int? KeepIfViewsAtLeast { get; }
    public QueueStatus Status { get; private set; }
    public string? NewVideoId { get; private set; }
    public int Attempts { get; private set; }
    public string? LastError { get; private set; }
    public DateTimeOffset? RetryAt { get; private set; }
    public DateTimeOffset CreatedAt { get; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>Rehydrates an item from storage without validation of history.</summary>
    public QueueItem(
        Guid id, string episodeId, string episodeDir, DateTimeOffset publishAt,
        string? replacesVideoId, int? keepIfViewsAtLeast, QueueStatus status, string? newVideoId,
        int attempts, string? lastError, DateTimeOffset? retryAt, DateTimeOffset createdAt, DateTimeOffset updatedAt)
    {
        Id = id;
        EpisodeId = episodeId;
        EpisodeDir = episodeDir;
        PublishAt = publishAt;
        ReplacesVideoId = replacesVideoId;
        KeepIfViewsAtLeast = keepIfViewsAtLeast;
        Status = status;
        NewVideoId = newVideoId;
        Attempts = attempts;
        LastError = lastError;
        RetryAt = retryAt;
        CreatedAt = createdAt;
        UpdatedAt = updatedAt;
    }

    public static QueueItem Create(
        string episodeId, string episodeDir, DateTimeOffset publishAt, DateTimeOffset now,
        string? replacesVideoId = null, int? keepIfViewsAtLeast = null) =>
        new(Guid.NewGuid(), episodeId, episodeDir, publishAt, replacesVideoId, keepIfViewsAtLeast,
            QueueStatus.Pending, null, 0, null, null, now, now);

    public void StartUpload(DateTimeOffset now)
    {
        Require(nameof(StartUpload), QueueStatus.Pending, QueueStatus.WaitingForQuota);
        Attempts++;
        RetryAt = null;
        Move(QueueStatus.Uploading, now);
    }

    /// <summary>Uploaded with a future publishAt.</summary>
    public void MarkScheduled(string videoId, DateTimeOffset now)
    {
        Require(nameof(MarkScheduled), QueueStatus.Uploading);
        NewVideoId = videoId;
        LastError = null;
        Move(QueueStatus.Scheduled, now);
    }

    /// <summary>Uploaded directly as public (publish time already near or past).</summary>
    public void MarkUploadedPublic(string videoId, DateTimeOffset now)
    {
        Require(nameof(MarkUploadedPublic), QueueStatus.Uploading);
        NewVideoId = videoId;
        LastError = null;
        Move(QueueStatus.Published, now);
    }

    public void MarkPublished(DateTimeOffset now)
    {
        Require(nameof(MarkPublished), QueueStatus.Scheduled);
        Move(QueueStatus.Published, now);
    }

    public void MarkOldHidden(DateTimeOffset now)
    {
        Require(nameof(MarkOldHidden), QueueStatus.Published);
        RequireReplacement(nameof(MarkOldHidden));
        Move(QueueStatus.ReplacedOldHidden, now);
    }

    /// <summary>Skips the replacement because the old video earned enough views.</summary>
    public void Keep(DateTimeOffset now)
    {
        Require(nameof(Keep), QueueStatus.Pending);
        RequireReplacement(nameof(Keep));
        Move(QueueStatus.Kept, now);
    }

    public void WaitForQuota(DateTimeOffset retryAt, string error, DateTimeOffset now)
    {
        Require(nameof(WaitForQuota), QueueStatus.Uploading);
        RetryAt = retryAt;
        LastError = error;
        Move(QueueStatus.WaitingForQuota, now);
    }

    /// <summary>Transient upload error: back to Pending, eligible again at <paramref name="retryAt"/>.</summary>
    public void RetryLater(DateTimeOffset retryAt, string error, DateTimeOffset now)
    {
        Require(nameof(RetryLater), QueueStatus.Uploading);
        RetryAt = retryAt;
        LastError = error;
        Move(QueueStatus.Pending, now);
    }

    public void Fail(string error, DateTimeOffset now)
    {
        Require(nameof(Fail), QueueStatus.Pending, QueueStatus.Uploading, QueueStatus.Scheduled, QueueStatus.WaitingForQuota);
        LastError = error;
        RetryAt = null;
        Move(QueueStatus.Failed, now);
    }

    private void Require(string transition, params QueueStatus[] allowed)
    {
        if (!allowed.Contains(Status)) throw new InvalidQueueTransitionException(Status, transition);
    }

    private void RequireReplacement(string transition)
    {
        if (ReplacesVideoId is null) throw new InvalidQueueTransitionException(Status, $"{transition} (no replaced video)");
    }

    private void Move(QueueStatus next, DateTimeOffset now)
    {
        Status = next;
        UpdatedAt = now;
    }
}
