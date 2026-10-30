using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;
using Cubitos.Publisher.Dashboard.Core.Data;
using Cubitos.Publisher.Infrastructure.Sqlite;

namespace Cubitos.Publisher.Dashboard.Tests;

public class ReadOnlyDashboardStoreTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 17, 0, 0, TimeSpan.Zero);

    private static VideoSnapshot Snap(string id, DateTimeOffset at, long views) => new(id, "title " + id, at, views, 1, 2);

    [Fact]
    public async Task Missing_file_returns_null_and_creates_nothing()
    {
        using var tmp = new TempDb();
        var store = new ReadOnlyDashboardStore(tmp.DbPath);

        Assert.Null(await store.LoadAsync(Now.AddDays(-28)));
        Assert.False(File.Exists(tmp.DbPath));
    }

    [Fact]
    public async Task Reads_rows_written_by_the_service_stores()
    {
        using var tmp = new TempDb();
        var item = QueueItem.Create("019-x", "videos/019-x", Now.AddHours(3), Now.AddHours(-1), "oldId", 300);
        await new SqliteQueueStore(tmp.Database).AddAsync(item);
        await new SqliteVideoCatalog(tmp.Database).UpsertAsync(new CatalogVideo("a", "A", Now.AddHours(-2), "001"));
        await new SqliteSnapshotStore(tmp.Database).AddRangeAsync([Snap("a", Now.AddHours(-1), 10), Snap("a", Now, 20)]);

        var data = await new ReadOnlyDashboardStore(tmp.DbPath).LoadAsync(Now.AddDays(-28));

        Assert.NotNull(data);
        var q = Assert.Single(data.Queue);
        Assert.Equal(item.Id, q.Id);
        Assert.Equal(QueueStatus.Pending, q.Status);
        Assert.Equal("oldId", q.ReplacesVideoId);
        Assert.Equal(Now.AddHours(3), q.PublishAt);
        var v = Assert.Single(data.Videos);
        Assert.Equal(Now.AddHours(-2), v.PublishedAt);
        Assert.Equal([10L, 20L], data.RecentSnapshots.Select(s => s.Views));
        Assert.Equal(2, data.LaunchSnapshots.Count);
    }

    [Fact]
    public async Task Latest_snapshot_per_video_is_included_even_before_the_window()
    {
        using var tmp = new TempDb();
        await new SqliteSnapshotStore(tmp.Database).AddRangeAsync([
            Snap("old", Now.AddDays(-60), 5), Snap("old", Now.AddDays(-40), 9), Snap("new", Now, 1),
        ]);

        var data = await new ReadOnlyDashboardStore(tmp.DbPath).LoadAsync(Now.AddDays(-28));

        Assert.NotNull(data);
        Assert.Equal(["old:9", "new:1"], data.RecentSnapshots.Select(s => $"{s.VideoId}:{s.Views}"));
    }

    [Fact]
    public async Task Launch_snapshots_cover_only_the_first_25_hours_after_publish()
    {
        using var tmp = new TempDb();
        var pub = Now.AddDays(-50);
        await new SqliteVideoCatalog(tmp.Database).UpsertAsync(new CatalogVideo("a", "A", pub, null));
        await new SqliteVideoCatalog(tmp.Database).UpsertAsync(new CatalogVideo("b", "B", null, null));
        await new SqliteSnapshotStore(tmp.Database).AddRangeAsync([
            Snap("a", pub.AddHours(-1), 0), Snap("a", pub.AddHours(1), 10), Snap("a", pub.AddHours(24.5), 90),
            Snap("a", pub.AddHours(26), 99), Snap("b", pub.AddHours(1), 7),
        ]);

        var data = await new ReadOnlyDashboardStore(tmp.DbPath).LoadAsync(Now.AddDays(-28));

        Assert.NotNull(data);
        Assert.Equal([10L, 90L], data.LaunchSnapshots.Select(s => s.Views));
    }

    [Fact]
    public async Task Loading_does_not_change_the_database_file()
    {
        using var tmp = new TempDb();
        await new SqliteSnapshotStore(tmp.Database).AddRangeAsync([Snap("a", Now, 1)]);
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        var before = await File.ReadAllBytesAsync(tmp.DbPath);

        await new ReadOnlyDashboardStore(tmp.DbPath).LoadAsync(Now.AddDays(-28));

        Assert.Equal(before, await File.ReadAllBytesAsync(tmp.DbPath));
    }
}
