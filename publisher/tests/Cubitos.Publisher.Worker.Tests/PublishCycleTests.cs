using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Worker.Application;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cubitos.Publisher.Worker.Tests;

public sealed class PublishCycleTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 17, 0, 0, TimeSpan.Zero);

    private readonly FakeQueueStore _queue = new();
    private readonly FakePlatform _platform = new();
    private readonly FakeEpisodeReader _episodes = new();
    private readonly FakeUploadLog _log = new();
    private readonly FakeClock _clock = new(Now);

    private PublishCycle Cycle() => new(_queue, _platform, _episodes, _log, _clock, NullLogger<PublishCycle>.Instance);

    private QueueItem Enqueue(TimeSpan publishIn, string? replaces = null, int? keepIfViews = null, string episode = "019-x")
    {
        var item = QueueItem.Create(episode, $"videos/{episode}", Now + publishIn, Now.AddHours(-1), replaces, keepIfViews);
        _queue.Items.Add(item);
        return item;
    }

    [Fact]
    public async Task Future_item_is_uploaded_scheduled_and_logged()
    {
        var item = Enqueue(TimeSpan.FromHours(3));

        await Cycle().RunOnceAsync(Now);

        Assert.Equal([("019-x", (DateTimeOffset?)item.PublishAt)], _platform.Uploads);
        Assert.Equal(QueueStatus.Scheduled, item.Status);
        Assert.Equal("new1", item.NewVideoId);
        Assert.Equal([QueueStatus.Uploading, QueueStatus.Scheduled], _queue.Writes.Select(w => w.Status));
        var entry = Assert.Single(_log.Entries);
        Assert.Equal(new UploadLogEntry("019-x", "new1", Now, item.PublishAt), entry);
        Assert.Equal(["new1"], _platform.Thumbnails);
    }

    [Fact]
    public async Task Item_due_now_is_uploaded_public()
    {
        var item = Enqueue(TimeSpan.FromMinutes(5));

        await Cycle().RunOnceAsync(Now);

        Assert.Equal([("019-x", (DateTimeOffset?)null)], _platform.Uploads);
        Assert.Equal(QueueStatus.Published, item.Status);
        Assert.Null(Assert.Single(_log.Entries).PublishAt);
    }

    [Fact]
    public async Task Missing_thumbnail_skips_the_thumbnail_call()
    {
        _episodes.ThumbnailPath = null;
        Enqueue(TimeSpan.FromHours(3));

        await Cycle().RunOnceAsync(Now);

        Assert.Empty(_platform.Thumbnails);
    }

    [Fact]
    public async Task Thumbnail_failure_does_not_fail_the_item()
    {
        _platform.ThumbnailError = new InvalidOperationException("thumbnail rejected");
        var item = Enqueue(TimeSpan.FromHours(3));

        await Cycle().RunOnceAsync(Now);

        Assert.Equal(QueueStatus.Scheduled, item.Status);
        Assert.Single(_log.Entries);
    }

    [Fact]
    public async Task Upload_limit_waits_until_oldest_recent_upload_leaves_the_window()
    {
        _log.Entries.Add(new UploadLogEntry("010-a", "a", Now.AddHours(-20), null));
        _log.Entries.Add(new UploadLogEntry("011-b", "b", Now.AddHours(-2), null));
        _platform.UploadError = () => new UploadLimitExceededException("The user has exceeded the number of videos they may upload.");
        var item = Enqueue(TimeSpan.FromHours(3));

        await Cycle().RunOnceAsync(Now);

        Assert.Equal(QueueStatus.WaitingForQuota, item.Status);
        Assert.Equal(Now.AddHours(4).AddMinutes(5), item.RetryAt);
        Assert.Contains("exceeded", item.LastError);
    }

    [Fact]
    public async Task Api_quota_exceeded_waits_for_pacific_midnight()
    {
        _platform.UploadError = () => new PlatformQuotaExceededException("quotaExceeded");
        var item = Enqueue(TimeSpan.FromHours(3));

        await Cycle().RunOnceAsync(Now);

        Assert.Equal(QueueStatus.WaitingForQuota, item.Status);
        Assert.Equal(QuotaReset.NextRetryAt(Now), item.RetryAt);
    }

    [Fact]
    public async Task Transient_error_retries_later_then_fails_after_max_attempts()
    {
        _platform.UploadError = () => new HttpRequestException("connection reset");
        var item = Enqueue(TimeSpan.FromHours(3));
        var cycle = Cycle();

        await cycle.RunOnceAsync(Now);
        Assert.Equal(QueueStatus.Pending, item.Status);
        Assert.Equal(Now + TransientRetryPolicy.DelayFor(1), item.RetryAt);

        for (var i = 0; i < TransientRetryPolicy.MaxAttempts - 1; i++)
            await cycle.RunOnceAsync(item.RetryAt ?? Now);

        Assert.Equal(QueueStatus.Failed, item.Status);
        Assert.Equal(TransientRetryPolicy.MaxAttempts, item.Attempts);
        Assert.Contains("connection reset", item.LastError);
    }

    [Fact]
    public async Task Missing_episode_folder_fails_the_item_without_uploading()
    {
        _episodes.Missing.Add("videos/019-x");
        var item = Enqueue(TimeSpan.FromHours(3));

        await Cycle().RunOnceAsync(Now);

        Assert.Equal(QueueStatus.Failed, item.Status);
        Assert.Empty(_platform.Uploads);
    }

    [Fact]
    public async Task Replacement_is_kept_when_old_video_reached_the_threshold()
    {
        _platform.Views["old1"] = 500;
        var item = Enqueue(TimeSpan.FromHours(3), replaces: "old1", keepIfViews: 300);

        await Cycle().RunOnceAsync(Now);

        Assert.Equal(QueueStatus.Kept, item.Status);
        Assert.Empty(_platform.Uploads);
        Assert.Empty(_log.Entries);
    }

    [Fact]
    public async Task Replacement_hides_old_video_only_after_new_one_is_public()
    {
        _platform.Views["old1"] = 10;
        _platform.Privacy["old1"] = VideoPrivacy.Public;
        _platform.Privacy["new1"] = VideoPrivacy.Private;
        var item = Enqueue(TimeSpan.FromHours(3), replaces: "old1", keepIfViews: 300);
        var cycle = Cycle();

        await cycle.RunOnceAsync(Now);
        Assert.Equal(QueueStatus.Scheduled, item.Status);

        await cycle.RunOnceAsync(item.PublishAt.AddMinutes(1));
        Assert.Equal(QueueStatus.Scheduled, item.Status);
        Assert.Empty(_platform.MadePrivate);

        _platform.Privacy["new1"] = VideoPrivacy.Public;
        await cycle.RunOnceAsync(item.PublishAt.AddMinutes(3));
        Assert.Equal(QueueStatus.Published, item.Status);
        Assert.Empty(_platform.MadePrivate);

        await cycle.RunOnceAsync(item.PublishAt.AddMinutes(5));
        Assert.Equal(QueueStatus.ReplacedOldHidden, item.Status);
        Assert.Equal(["old1"], _platform.MadePrivate);
        Assert.Equal(VideoPrivacy.Private, _platform.Privacy["old1"]);
    }

    [Fact]
    public async Task Missing_old_video_fails_the_hide_step_without_crashing()
    {
        _platform.Privacy["new1"] = VideoPrivacy.Public;
        var item = Enqueue(TimeSpan.FromMinutes(5), replaces: "gone");
        var cycle = Cycle();

        await cycle.RunOnceAsync(Now);
        Assert.Equal(QueueStatus.Published, item.Status);
        var other = Enqueue(TimeSpan.FromHours(5), episode: "020-y");
        await cycle.RunOnceAsync(Now.AddMinutes(2));

        Assert.Equal(QueueStatus.Failed, item.Status);
        Assert.Contains("gone", item.LastError);
        Assert.Equal(QueueStatus.Scheduled, other.Status);
    }

    [Fact]
    public async Task One_failing_item_does_not_stop_the_others()
    {
        // Corrupt stored state: Scheduled and due, but without a video id.
        _queue.Items.Add(new QueueItem(Guid.NewGuid(), "018-bad", "videos/018-bad", Now.AddHours(-1), null, null,
            QueueStatus.Scheduled, null, 1, null, null, Now.AddHours(-2), Now.AddHours(-2)));
        var good = Enqueue(TimeSpan.FromHours(2));

        await Cycle().RunOnceAsync(Now);

        Assert.Equal(QueueStatus.Scheduled, good.Status);
    }

    [Fact]
    public async Task Recover_fails_items_left_uploading_by_a_crash()
    {
        var item = Enqueue(TimeSpan.FromHours(3));
        item.StartUpload(Now);

        await Cycle().RecoverInterruptedAsync();

        Assert.Equal(QueueStatus.Failed, item.Status);
        Assert.Contains("interrupted", item.LastError);
    }
}
