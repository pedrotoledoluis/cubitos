using Cubitos.Publisher.Core.Planning;
using Cubitos.Publisher.Core.Queue;

namespace Cubitos.Publisher.Core.Tests;

public class PublishPlannerTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 12, 0, 0, TimeSpan.Zero);

    private static QueueItem Pending(DateTimeOffset publishAt, string? replaces = null) =>
        QueueItem.Create("ep", "videos/ep", publishAt, Now.AddDays(-1), replaces);

    private static PlannedAction Single(QueueItem item) => Assert.Single(PublishPlanner.Plan(Now, [item]));

    [Fact]
    public void Pending_far_in_future_uploads_now_with_schedule()
    {
        var action = Single(Pending(Now.AddHours(6)));
        Assert.Equal(PlannedActionKind.Upload, action.Kind);
        Assert.Equal(Now.AddHours(6), action.UploadPublishAt);
    }

    [Theory]
    [InlineData(-60)]
    [InlineData(0)]
    [InlineData(14)]
    public void Pending_due_within_fifteen_minutes_uploads_public(int minutes)
    {
        var action = Single(Pending(Now.AddMinutes(minutes)));
        Assert.Equal(PlannedActionKind.Upload, action.Kind);
        Assert.Null(action.UploadPublishAt);
    }

    [Fact]
    public void Exactly_fifteen_minutes_away_is_still_scheduled() =>
        Assert.Equal(Now.AddMinutes(15), Single(Pending(Now.AddMinutes(15))).UploadPublishAt);

    [Fact]
    public void Pending_with_future_retry_is_skipped()
    {
        var item = Pending(Now.AddHours(6));
        item.StartUpload(Now.AddMinutes(-1));
        item.RetryLater(Now.AddMinutes(5), "timeout", Now.AddMinutes(-1));
        Assert.Empty(PublishPlanner.Plan(Now, [item]));
    }

    [Fact]
    public void Waiting_for_quota_uploads_only_after_retry_at()
    {
        var ready = Pending(Now.AddHours(6));
        ready.StartUpload(Now.AddHours(-3));
        ready.WaitForQuota(Now, "limit", Now.AddHours(-3));
        var notYet = Pending(Now.AddHours(6));
        notYet.StartUpload(Now.AddHours(-3));
        notYet.WaitForQuota(Now.AddMinutes(1), "limit", Now.AddHours(-3));

        var action = Assert.Single(PublishPlanner.Plan(Now, [ready, notYet]));
        Assert.Same(ready, action.Item);
        Assert.Equal(PlannedActionKind.Upload, action.Kind);
    }

    [Fact]
    public void Scheduled_past_publish_time_needs_status_check()
    {
        var due = Pending(Now.AddMinutes(-1));
        due.StartUpload(Now.AddHours(-2));
        due.MarkScheduled("v1", Now.AddHours(-2));
        var later = Pending(Now.AddHours(1));
        later.StartUpload(Now.AddHours(-2));
        later.MarkScheduled("v2", Now.AddHours(-2));

        var action = Assert.Single(PublishPlanner.Plan(Now, [due, later]));
        Assert.Equal(PlannedActionKind.CheckPublished, action.Kind);
        Assert.Same(due, action.Item);
    }

    [Fact]
    public void Published_replacement_needs_old_video_hidden()
    {
        var replacing = Pending(Now, "old1");
        replacing.StartUpload(Now);
        replacing.MarkUploadedPublic("v1", Now);
        var plain = Pending(Now);
        plain.StartUpload(Now);
        plain.MarkUploadedPublic("v2", Now);

        var action = Assert.Single(PublishPlanner.Plan(Now, [replacing, plain]));
        Assert.Equal(PlannedActionKind.HideOldVideo, action.Kind);
        Assert.Same(replacing, action.Item);
    }

    [Fact]
    public void Uploads_are_ordered_by_publish_time()
    {
        var late = Pending(Now.AddHours(9));
        var early = Pending(Now.AddHours(2));
        var actions = PublishPlanner.Plan(Now, [late, early]);
        Assert.Equal([early, late], actions.Select(a => a.Item));
    }
}
