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
        Assert.Equal(new CatalogVideo("v1", "One", Now.AddDays(-2), "001-emu"), catalog.Videos["v1"]);
        Assert.Equal("002-x", catalog.Videos["v2"].EpisodeId);
        Assert.Equal(["v1", "v2"], Assert.Single(platform.StatsRequests).Order());
        Assert.All(snapshots.Snapshots, s => Assert.Equal(Now, s.TakenAt));
        Assert.Equal(120, snapshots.Snapshots.Single(s => s.VideoId == "v1").Views);
    }
}
