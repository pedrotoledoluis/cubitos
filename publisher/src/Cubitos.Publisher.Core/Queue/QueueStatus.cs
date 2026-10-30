namespace Cubitos.Publisher.Core.Queue;

public enum QueueStatus
{
    /// <summary>Waiting to be uploaded (optionally after <see cref="QueueItem.RetryAt"/>).</summary>
    Pending,
    Uploading,
    /// <summary>Uploaded as private with a publishAt; YouTube flips it public.</summary>
    Scheduled,
    /// <summary>Confirmed public.</summary>
    Published,
    /// <summary>Published and the video it replaces was set private.</summary>
    ReplacedOldHidden,
    /// <summary>Replacement skipped because the old video had enough views.</summary>
    Kept,
    Failed,
    /// <summary>Upload limit hit; retry at <see cref="QueueItem.RetryAt"/>.</summary>
    WaitingForQuota,
}
