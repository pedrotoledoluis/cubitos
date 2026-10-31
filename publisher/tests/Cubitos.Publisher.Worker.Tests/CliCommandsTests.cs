using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Worker.Cli;

namespace Cubitos.Publisher.Worker.Tests;

public sealed class CliCommandsTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 17, 0, 0, TimeSpan.Zero);

    private readonly FakeQueueStore _queue = new();
    private readonly FakeEpisodeReader _episodes = new();
    private readonly FakeSnapshotStore _snapshots = new();
    private readonly StringWriter _out = new();

    private Task<int> Run(params string[] args) =>
        new CliCommands(_queue, _episodes, _snapshots, new FakeClock(Now), @"D:\repo", _out).RunAsync(args);

    [Fact]
    public async Task Enqueue_adds_a_pending_item_and_prints_its_id()
    {
        var code = await Run("enqueue", "videos/019-x", "--publish-at", "2026-10-31T12:00:00-05:00",
            "--replaces", "old1", "--keep-if-views", "300");

        Assert.Equal(0, code);
        var item = Assert.Single(_queue.Items);
        Assert.Equal(("019-x", "videos/019-x", QueueStatus.Pending), (item.EpisodeId, item.EpisodeDir, item.Status));
        Assert.Equal(new DateTimeOffset(2026, 10, 31, 17, 0, 0, TimeSpan.Zero), item.PublishAt);
        Assert.Equal(("old1", (int?)300), (item.ReplacesVideoId, item.KeepIfViewsAtLeast));
        Assert.Contains(item.Id.ToString(), _out.ToString());
    }

    [Fact]
    public async Task Enqueue_without_publish_at_publishes_now()
    {
        await Run("enqueue", "videos/019-x");
        Assert.Equal(Now, Assert.Single(_queue.Items).PublishAt);
    }

    [Fact]
    public async Task Enqueue_refuses_a_duplicate_of_an_active_item()
    {
        await Run("enqueue", "videos/019-x");

        var code = await Run("enqueue", "videos/019-x", "--publish-at", "2026-10-31T12:00:00-05:00");

        Assert.NotEqual(0, code);
        Assert.Single(_queue.Items);
        Assert.Contains("already queued", _out.ToString());
    }

    [Fact]
    public async Task Enqueue_allows_requeue_after_a_terminal_item()
    {
        await Run("enqueue", "videos/019-x");
        _queue.Items[0].Cancel(Now);

        Assert.Equal(0, await Run("enqueue", "videos/019-x"));
        Assert.Equal(2, _queue.Items.Count);
    }

    [Theory]
    [InlineData("enqueue", "videos/019-x", "--publish-at", "2026-10-31T12:00:00")]
    [InlineData("enqueue", "videos/019-x", "--keep-if-views", "10")]
    [InlineData("enqueue", "videos/missing")]
    [InlineData("enqueue")]
    [InlineData("bogus")]
    public async Task Invalid_input_is_rejected_without_queueing(params string[] args)
    {
        _episodes.Missing.Add("videos/missing");
        Assert.NotEqual(0, await Run(args));
        Assert.Empty(_queue.Items);
    }

    [Fact]
    public async Task Cancel_only_applies_before_upload()
    {
        await Run("enqueue", "videos/019-x");
        await Run("enqueue", "videos/020-y");
        var pending = _queue.Items[0];
        var uploading = _queue.Items[1];
        uploading.StartUpload(Now);

        Assert.Equal(0, await Run("cancel", pending.Id.ToString()));
        Assert.NotEqual(0, await Run("cancel", uploading.Id.ToString()));
        Assert.Equal(QueueStatus.Cancelled, pending.Status);
        Assert.Equal(QueueStatus.Uploading, uploading.Status);
    }

    [Fact]
    public async Task List_shows_publish_time_in_peru()
    {
        await Run("enqueue", "videos/019-x", "--publish-at", "2026-10-31T17:00:00Z");

        Assert.Equal(0, await Run("list"));
        Assert.Contains("2026-10-31 12:00", _out.ToString());
        Assert.Contains("019-x", _out.ToString());
    }

    [Fact]
    public async Task Repo_absolute_episode_dir_is_stored_relative()
    {
        await Run("enqueue", @"D:\repo\videos\019-x");
        Assert.Equal("videos/019-x", Assert.Single(_queue.Items).EpisodeDir);
    }
    [Fact]
    public async Task Export_stats_passes_the_out_path_and_prints_the_result()
    {
        string? received = "unset";
        var cli = new CliCommands(_queue, _episodes, _snapshots, new FakeClock(Now), @"D:epo", _out,
            exportStats: (path, _) =>
            {
                received = path;
                return Task.FromResult("Exported 3 videos.");
            });

        Assert.Equal(0, await cli.RunAsync(["export-stats", "--out", "out/stats.json"]));
        Assert.Equal("out/stats.json", received);
        Assert.Contains("Exported 3 videos.", _out.ToString());

        Assert.Equal(0, await cli.RunAsync(["export-stats"]));
        Assert.Null(received);
        Assert.Equal(2, await cli.RunAsync(["export-stats", "--out"]));
    }
}
