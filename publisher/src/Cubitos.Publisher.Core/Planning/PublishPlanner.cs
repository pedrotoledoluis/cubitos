using Cubitos.Publisher.Core.Queue;

namespace Cubitos.Publisher.Core.Planning;

public enum PlannedActionKind
{
    /// <summary>Upload now; <see cref="PlannedAction.UploadPublishAt"/> null means upload as public.</summary>
    Upload,
    /// <summary>Scheduled time passed; confirm the video is public.</summary>
    CheckPublished,
    /// <summary>The replacement is public; set the old video private.</summary>
    HideOldVideo,
}

public sealed record PlannedAction(PlannedActionKind Kind, QueueItem Item, DateTimeOffset? UploadPublishAt = null);

/// <summary>Decides what the publish loop should do next. Uploads happen early; YouTube handles publishAt.</summary>
public static class PublishPlanner
{
    /// <summary>Closer than this, a scheduled publish is not worth it: upload as public.</summary>
    public static readonly TimeSpan ImmediateThreshold = TimeSpan.FromMinutes(15);

    public static IReadOnlyList<PlannedAction> Plan(DateTimeOffset now, IEnumerable<QueueItem> queue)
    {
        var actions = new List<PlannedAction>();
        foreach (var item in queue.OrderBy(i => i.PublishAt).ThenBy(i => i.CreatedAt))
        {
            var action = item.Status switch
            {
                QueueStatus.Pending or QueueStatus.WaitingForQuota when IsRetryDue(item, now) =>
                    new PlannedAction(PlannedActionKind.Upload, item, UploadPublishAt(item, now)),
                QueueStatus.Scheduled when item.PublishAt <= now =>
                    new PlannedAction(PlannedActionKind.CheckPublished, item),
                QueueStatus.Published when item.ReplacesVideoId is not null =>
                    new PlannedAction(PlannedActionKind.HideOldVideo, item),
                _ => null,
            };
            if (action is not null) actions.Add(action);
        }
        return actions;
    }

    private static bool IsRetryDue(QueueItem item, DateTimeOffset now) =>
        item.RetryAt is null ? item.Status == QueueStatus.Pending : item.RetryAt <= now;

    private static DateTimeOffset? UploadPublishAt(QueueItem item, DateTimeOffset now) =>
        item.PublishAt - now < ImmediateThreshold ? null : item.PublishAt;
}
