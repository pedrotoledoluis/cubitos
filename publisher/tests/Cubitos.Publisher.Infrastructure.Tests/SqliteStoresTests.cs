using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;
using Cubitos.Publisher.Infrastructure.Sqlite;
using Microsoft.Data.Sqlite;

namespace Cubitos.Publisher.Infrastructure.Tests;

public sealed class SqliteStoresTests : IDisposable
{
    private static readonly DateTimeOffset T0 = new(2026, 10, 30, 12, 0, 0, TimeSpan.FromHours(-5));
    private readonly TempDir _dir = new();
    private readonly SqliteDatabase _db;

    public SqliteStoresTests() => _db = new SqliteDatabase(_dir.File("publisher.db"));

    public void Dispose() => _dir.Dispose();

    [Fact]
    public async Task Database_uses_wal_journal_mode()
    {
        await using var conn = await _db.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "PRAGMA journal_mode;";
        Assert.Equal("wal", (string?)await cmd.ExecuteScalarAsync());
    }

    [Fact]
    public async Task Queue_item_round_trips_all_fields()
    {
        var store = new SqliteQueueStore(_db);
        var item = new QueueItem(Guid.NewGuid(), "019-x", "videos/019-x", T0.AddHours(6), "oldVid", 500,
            QueueStatus.WaitingForQuota, "newVid", 3, "limit hit", T0.AddHours(1), T0, T0.AddMinutes(5));

        await store.AddAsync(item);
        var loaded = await store.GetAsync(item.Id);

        Assert.NotNull(loaded);
        Assert.Equal(item.EpisodeId, loaded.EpisodeId);
        Assert.Equal(item.EpisodeDir, loaded.EpisodeDir);
        Assert.Equal(item.PublishAt, loaded.PublishAt);
        Assert.Equal(item.ReplacesVideoId, loaded.ReplacesVideoId);
        Assert.Equal(item.KeepIfViewsAtLeast, loaded.KeepIfViewsAtLeast);
        Assert.Equal(item.Status, loaded.Status);
        Assert.Equal(item.NewVideoId, loaded.NewVideoId);
        Assert.Equal(item.Attempts, loaded.Attempts);
        Assert.Equal(item.LastError, loaded.LastError);
        Assert.Equal(item.RetryAt, loaded.RetryAt);
        Assert.Equal(item.CreatedAt, loaded.CreatedAt);
        Assert.Equal(item.UpdatedAt, loaded.UpdatedAt);
    }

    [Fact]
    public async Task Queue_item_with_nulls_round_trips_and_updates()
    {
        var store = new SqliteQueueStore(_db);
        var item = QueueItem.Create("020-y", "videos/020-y", T0.AddDays(1), T0);
        await store.AddAsync(item);

        item.StartUpload(T0.AddMinutes(1));
        item.MarkScheduled("vid20", T0.AddMinutes(2));
        await store.UpdateAsync(item);

        var loaded = await store.GetAsync(item.Id);
        Assert.NotNull(loaded);
        Assert.Null(loaded.ReplacesVideoId);
        Assert.Null(loaded.KeepIfViewsAtLeast);
        Assert.Null(loaded.RetryAt);
        Assert.Equal(QueueStatus.Scheduled, loaded.Status);
        Assert.Equal("vid20", loaded.NewVideoId);
        Assert.Equal(1, loaded.Attempts);
        Assert.Equal(T0.AddMinutes(2), loaded.UpdatedAt);
    }

    [Fact]
    public async Task Queue_get_all_orders_by_creation_and_unknown_id_is_null()
    {
        var store = new SqliteQueueStore(_db);
        await store.AddAsync(QueueItem.Create("b", "videos/b", T0, T0.AddMinutes(1)));
        await store.AddAsync(QueueItem.Create("a", "videos/a", T0, T0));

        var all = await store.GetAllAsync();

        Assert.Equal(["a", "b"], all.Select(i => i.EpisodeId));
        Assert.Null(await store.GetAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task Timestamps_are_stored_as_iso_utc_text()
    {
        var store = new SqliteQueueStore(_db);
        await store.AddAsync(QueueItem.Create("a", "videos/a", T0, T0));

        await using var conn = await _db.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT publish_at FROM queue_items;";
        Assert.Equal("2026-10-30T17:00:00.0000000Z", (string?)await cmd.ExecuteScalarAsync());
    }

    [Fact]
    public async Task Snapshots_filter_by_time_and_video_in_order()
    {
        var store = new SqliteSnapshotStore(_db);
        await store.AddRangeAsync([
            new VideoSnapshot("v1", "One", T0.AddMinutes(30), 20, 2, 1),
            new VideoSnapshot("v1", "One", T0, 10, 1, 0),
            new VideoSnapshot("v2", "Two", T0.AddMinutes(15), 5, 0, 0),
        ]);

        var since = await store.GetSinceAsync(T0.AddMinutes(10));
        var v1 = await store.GetForVideoAsync("v1");

        Assert.Equal([T0.AddMinutes(15), T0.AddMinutes(30)], since.Select(s => s.TakenAt));
        Assert.Equal([10L, 20L], v1.Select(s => s.Views));
        Assert.Equal(new VideoSnapshot("v1", "One", T0.AddMinutes(30), 20, 2, 1), v1[1]);
    }

    [Fact]
    public async Task Video_catalog_upserts_by_id()
    {
        var catalog = new SqliteVideoCatalog(_db);
        await catalog.UpsertAsync(new CatalogVideo("v1", "Old title", null, null));
        await catalog.UpsertAsync(new CatalogVideo("v1", "New title", T0, "019-x"));
        await catalog.UpsertAsync(new CatalogVideo("v2", "Two", T0.AddDays(-1), null));

        var all = await catalog.GetAllAsync();

        Assert.Equal(2, all.Count);
        Assert.Equal(new CatalogVideo("v1", "New title", T0, "019-x"), all.Single(v => v.VideoId == "v1"));
    }

    [Fact]
    public async Task Catalog_upsert_keeps_known_episode_when_new_value_is_null()
    {
        var catalog = new SqliteVideoCatalog(_db);
        await catalog.UpsertAsync(new CatalogVideo("v1", "T", T0, "019-x"));
        await catalog.UpsertAsync(new CatalogVideo("v1", "T2", T0, null));

        Assert.Equal("019-x", (await catalog.GetAllAsync()).Single().EpisodeId);
    }

    [Fact]
    public async Task Catalog_stores_privacy_and_keeps_it_when_new_value_is_null()
    {
        var catalog = new SqliteVideoCatalog(_db);
        await catalog.UpsertAsync(new CatalogVideo("v1", "T", T0, null, VideoPrivacy.Private));
        await catalog.UpsertAsync(new CatalogVideo("v1", "T", T0, null, VideoPrivacy.Public));
        await catalog.UpsertAsync(new CatalogVideo("v1", "T", T0, null));

        Assert.Equal(VideoPrivacy.Public, (await catalog.GetAllAsync()).Single().Privacy);
    }

    [Fact]
    public async Task Legacy_videos_table_gains_the_privacy_column()
    {
        var path = _dir.File("legacy.db");
        await using (var conn = new SqliteConnection($"Data Source={path}"))
        {
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                CREATE TABLE videos (video_id TEXT PRIMARY KEY, title TEXT NOT NULL, published_at TEXT NULL, episode_id TEXT NULL);
                INSERT INTO videos VALUES ('v1', 'Old', NULL, '001-a');
                """;
            await cmd.ExecuteNonQueryAsync();
        }
        SqliteConnection.ClearAllPools();

        var catalog = new SqliteVideoCatalog(new SqliteDatabase(path));

        Assert.Null((await catalog.GetAllAsync()).Single().Privacy);
        await catalog.UpsertAsync(new CatalogVideo("v1", "Old", null, null, VideoPrivacy.Unlisted));
        Assert.Equal(new CatalogVideo("v1", "Old", null, "001-a", VideoPrivacy.Unlisted), (await catalog.GetAllAsync()).Single());
    }

    [Fact]
    public async Task Schema_creation_is_idempotent_across_instances()
    {
        await new SqliteQueueStore(_db).AddAsync(QueueItem.Create("a", "videos/a", T0, T0));
        SqliteConnection.ClearAllPools();

        var reopened = new SqliteQueueStore(new SqliteDatabase(_dir.File("publisher.db")));

        Assert.Single(await reopened.GetAllAsync());
    }
}
