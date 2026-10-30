using Cubitos.Publisher.Core.Queue;

namespace Cubitos.Publisher.Core.Tests;

public class QueueItemTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 12, 0, 0, TimeSpan.Zero);

    private static QueueItem NewItem(string? replaces = null) =>
        QueueItem.Create("019-x", "videos/019-x", Now.AddHours(5), Now, replaces);

    private static QueueItem Uploading(string? replaces = null)
    {
        var item = NewItem(replaces);
        item.StartUpload(Now);
        return item;
    }

    private static QueueItem Published(string? replaces = null)
    {
        var item = Uploading(replaces);
        item.MarkScheduled("new1", Now);
        item.MarkPublished(Now);
        return item;
    }

    [Fact]
    public void Create_starts_pending_with_defaults()
    {
        var item = NewItem();
        Assert.Equal(QueueStatus.Pending, item.Status);
        Assert.Equal(0, item.Attempts);
        Assert.Null(item.KeepIfViewsAtLeast);
        Assert.Equal(Now, item.CreatedAt);
        Assert.NotEqual(Guid.Empty, item.Id);
    }

    [Fact]
    public void StartUpload_from_pending_increments_attempts()
    {
        var item = Uploading();
        Assert.Equal(QueueStatus.Uploading, item.Status);
        Assert.Equal(1, item.Attempts);
    }

    [Fact]
    public void Full_replacement_lifecycle_reaches_replaced_old_hidden()
    {
        var item = Published("old1");
        Assert.Equal("new1", item.NewVideoId);
        item.MarkOldHidden(Now.AddHours(1));
        Assert.Equal(QueueStatus.ReplacedOldHidden, item.Status);
        Assert.Equal(Now.AddHours(1), item.UpdatedAt);
    }

    [Fact]
    public void MarkUploadedPublic_goes_straight_to_published()
    {
        var item = Uploading();
        item.MarkUploadedPublic("new2", Now);
        Assert.Equal(QueueStatus.Published, item.Status);
        Assert.Equal("new2", item.NewVideoId);
    }

    [Fact]
    public void WaitForQuota_then_upload_again()
    {
        var item = Uploading();
        item.WaitForQuota(Now.AddHours(3), "limit", Now);
        Assert.Equal(QueueStatus.WaitingForQuota, item.Status);
        Assert.Equal(Now.AddHours(3), item.RetryAt);
        item.StartUpload(Now.AddHours(3));
        Assert.Equal(QueueStatus.Uploading, item.Status);
        Assert.Null(item.RetryAt);
        Assert.Equal(2, item.Attempts);
    }

    [Fact]
    public void RetryLater_returns_to_pending_with_retry_at()
    {
        var item = Uploading();
        item.RetryLater(Now.AddMinutes(2), "timeout", Now);
        Assert.Equal(QueueStatus.Pending, item.Status);
        Assert.Equal(Now.AddMinutes(2), item.RetryAt);
        Assert.Equal("timeout", item.LastError);
    }

    [Fact]
    public void Keep_from_pending_requires_replacement()
    {
        var item = NewItem("old1");
        item.Keep(Now);
        Assert.Equal(QueueStatus.Kept, item.Status);
        Assert.Throws<InvalidQueueTransitionException>(() => NewItem().Keep(Now));
    }

    [Fact]
    public void Fail_records_error()
    {
        var item = Uploading();
        item.Fail("bad request", Now);
        Assert.Equal(QueueStatus.Failed, item.Status);
        Assert.Equal("bad request", item.LastError);
    }

    [Fact]
    public void MarkOldHidden_requires_replacement()
    {
        Assert.Throws<InvalidQueueTransitionException>(() => Published().MarkOldHidden(Now));
    }

    public static TheoryData<string> InvalidFromPending =>
        ["scheduled", "public", "published", "hidden", "quota", "retry"];

    [Theory]
    [MemberData(nameof(InvalidFromPending))]
    public void Invalid_transitions_from_pending_throw(string transition)
    {
        var item = NewItem("old1");
        Assert.Throws<InvalidQueueTransitionException>(() => Apply(item, transition));
        Assert.Equal(QueueStatus.Pending, item.Status);
    }

    [Theory]
    [InlineData("start")]
    [InlineData("keep")]
    [InlineData("published")]
    [InlineData("hidden")]
    public void Invalid_transitions_from_uploading_throw(string transition)
    {
        var item = Uploading("old1");
        Assert.Throws<InvalidQueueTransitionException>(() => Apply(item, transition));
    }

    [Theory]
    [InlineData("start")]
    [InlineData("scheduled")]
    [InlineData("quota")]
    [InlineData("hidden")]
    public void Invalid_transitions_from_scheduled_throw(string transition)
    {
        var item = Uploading("old1");
        item.MarkScheduled("v", Now);
        Assert.Throws<InvalidQueueTransitionException>(() => Apply(item, transition));
    }

    [Theory]
    [InlineData("start")]
    [InlineData("published")]
    [InlineData("fail")]
    public void Invalid_transitions_from_published_throw(string transition)
    {
        var item = Published("old1");
        Assert.Throws<InvalidQueueTransitionException>(() => Apply(item, transition));
    }

    [Theory]
    [InlineData("start")]
    [InlineData("fail")]
    [InlineData("keep")]
    public void Terminal_states_reject_transitions(string transition)
    {
        var kept = NewItem("old1");
        kept.Keep(Now);
        var failed = Uploading();
        failed.Fail("x", Now);
        var hidden = Published("old1");
        hidden.MarkOldHidden(Now);

        foreach (var item in new[] { kept, failed, hidden })
            Assert.Throws<InvalidQueueTransitionException>(() => Apply(item, transition));
    }

    private static void Apply(QueueItem item, string transition)
    {
        switch (transition)
        {
            case "start": item.StartUpload(Now); break;
            case "scheduled": item.MarkScheduled("v", Now); break;
            case "public": item.MarkUploadedPublic("v", Now); break;
            case "published": item.MarkPublished(Now); break;
            case "hidden": item.MarkOldHidden(Now); break;
            case "quota": item.WaitForQuota(Now, "limit", Now); break;
            case "retry": item.RetryLater(Now, "err", Now); break;
            case "keep": item.Keep(Now); break;
            case "fail": item.Fail("err", Now); break;
            default: throw new ArgumentOutOfRangeException(nameof(transition));
        }
    }
}
