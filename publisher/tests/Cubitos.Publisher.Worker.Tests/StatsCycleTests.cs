using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Worker.Application;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cubitos.Publisher.Worker.Tests;

public sealed class StatsCycleTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 17, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Refreshes_catalog_and_writes_one_snapshot_per_video()
    {
        var platform = new FakePlatform();
        platform.ChannelVideos.Add(new ChannelVideo("v1", "One", Now.AddDays(-2), VideoPrivacy.Public));
        platform.ChannelVideos.Add(new ChannelVideo("v2", "Two", null, VideoPrivacy.Private));
        platform.ChannelVideos.Add(new ChannelVideo("", "Deleted", null, VideoPrivacy.Private));
        platform.Views["v1"] = 120;
        platform.Views["v2"] = 3;
        var log = new FakeUploadLog();
        log.Entries.Add(new UploadLogEntry("001-emu", "v1", Now.AddDays(-2), null));
        log.Entries.Add(new UploadLogEntry("002-x-old", "v2", Now.AddDays(-3), null));
        var catalog = new FakeCatalog();
        var snapshots = new FakeSnapshotStore();

        var written = await new StatsCycle(platform, catalog, snapshots, log, NullLogger<StatsCycle>.Instance).RunOnceAsync(Now);

        Assert.Equal(2, written);
        Assert.Equal(new CatalogVideo("v1", "One", Now.AddDays(-2), "001-emu", VideoPrivacy.Public), catalog.Videos["v1"]);
        Assert.Equal("002-x", catalog.Videos["v2"].EpisodeId);
        Assert.Equal(["v1", "v2"], Assert.Single(platform.StatsRequests).Order());
        Assert.All(snapshots.Snapshots, s => Assert.Equal(Now, s.TakenAt));
        Assert.Equal(120, snapshots.Snapshots.Single(s => s.VideoId == "v1").Views);
    }
    [Fact]
    public async Task Exports_channel_stats_after_writing_snapshots()
    {
        var platform = new FakePlatform();
        platform.ChannelVideos.Add(new ChannelVideo("v1", "One", Now.AddDays(-2), VideoPrivacy.Public));
        platform.Views["v1"] = 120;
        var catalog = new FakeCatalog();
        var snapshots = new FakeSnapshotStore();
        var writer = new FakeStatsWriter();
        var export = new ChannelStatsExport(snapshots, catalog, new FakeQueueStore(), new FakeUploadLog(), new FakeEpisodeReader(),
            writer, NullLogger<ChannelStatsExport>.Instance);

        await new StatsCycle(platform, catalog, snapshots, new FakeUploadLog(), NullLogger<StatsCycle>.Instance, export).RunOnceAsync(Now);

        Assert.Equal(VideoPrivacy.Public, catalog.Videos["v1"].Privacy);
        var row = Assert.Single(Assert.Single(writer.Written).Videos);
        Assert.Equal(("v1", (long?)120), (row.VideoId, row.Views));
    }

    [Fact]
    public async Task A_failing_export_does_not_fail_the_stats_cycle()
    {
        var platform = new FakePlatform();
        platform.ChannelVideos.Add(new ChannelVideo("v1", "One", Now.AddDays(-2), VideoPrivacy.Public));
        platform.Views["v1"] = 5;
        var snapshots = new FakeSnapshotStore();
        var writer = new FakeStatsWriter { Error = new IOException("disk full") };
        var export = new ChannelStatsExport(snapshots, new FakeCatalog(), new FakeQueueStore(), new FakeUploadLog(), new FakeEpisodeReader(),
            writer, NullLogger<ChannelStatsExport>.Instance);

        var written = await new StatsCycle(platform, new FakeCatalog(), snapshots, new FakeUploadLog(), NullLogger<StatsCycle>.Instance, export)
            .RunOnceAsync(Now);

        Assert.Equal(1, written);
        Assert.Single(snapshots.Snapshots);
    }
}
