using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Microsoft.Data.Sqlite;
using static Cubitos.Publisher.Infrastructure.Sqlite.SqliteDatabase;

namespace Cubitos.Publisher.Infrastructure.Sqlite;

public sealed class SqliteQueueStore(SqliteDatabase db) : IQueueStore
{
    private const string Columns =
        "id, episode_id, episode_dir, publish_at, replaces_video_id, keep_if_views_at_least, status, " +
        "new_video_id, attempts, last_error, retry_at, created_at, updated_at";

    public async Task<IReadOnlyList<QueueItem>> GetAllAsync(CancellationToken ct = default)
    {
        await using var conn = await db.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT {Columns} FROM queue_items ORDER BY created_at, rowid;";
        return await ReadAllAsync(cmd, ct);
    }

    public async Task<QueueItem?> GetAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = await db.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT {Columns} FROM queue_items WHERE id = $id;";
        cmd.Parameters.AddWithValue("$id", id.ToString());
        return (await ReadAllAsync(cmd, ct)).SingleOrDefault();
    }

    public Task AddAsync(QueueItem item, CancellationToken ct = default) =>
        WriteAsync($"INSERT INTO queue_items ({Columns}) VALUES ($id, $episode_id, $episode_dir, $publish_at, " +
                   "$replaces, $keep, $status, $new_video_id, $attempts, $last_error, $retry_at, $created_at, $updated_at);",
            item, ct);

    public async Task UpdateAsync(QueueItem item, CancellationToken ct = default)
    {
        var rows = await WriteAsync(
            "UPDATE queue_items SET episode_id = $episode_id, episode_dir = $episode_dir, publish_at = $publish_at, " +
            "replaces_video_id = $replaces, keep_if_views_at_least = $keep, status = $status, new_video_id = $new_video_id, " +
            "attempts = $attempts, last_error = $last_error, retry_at = $retry_at, created_at = $created_at, " +
            "updated_at = $updated_at WHERE id = $id;",
            item, ct);
        if (rows == 0) throw new InvalidOperationException($"Queue item {item.Id} does not exist.");
    }

    private async Task<int> WriteAsync(string sql, QueueItem item, CancellationToken ct)
    {
        await using var conn = await db.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        var p = cmd.Parameters;
        p.AddWithValue("$id", item.Id.ToString());
        p.AddWithValue("$episode_id", item.EpisodeId);
        p.AddWithValue("$episode_dir", item.EpisodeDir);
        p.AddWithValue("$publish_at", ToText(item.PublishAt));
        p.AddWithValue("$replaces", (object?)item.ReplacesVideoId ?? DBNull.Value);
        p.AddWithValue("$keep", (object?)item.KeepIfViewsAtLeast ?? DBNull.Value);
        p.AddWithValue("$status", item.Status.ToString());
        p.AddWithValue("$new_video_id", (object?)item.NewVideoId ?? DBNull.Value);
        p.AddWithValue("$attempts", item.Attempts);
        p.AddWithValue("$last_error", (object?)item.LastError ?? DBNull.Value);
        p.AddWithValue("$retry_at", (object?)ToText(item.RetryAt) ?? DBNull.Value);
        p.AddWithValue("$created_at", ToText(item.CreatedAt));
        p.AddWithValue("$updated_at", ToText(item.UpdatedAt));
        return await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task<List<QueueItem>> ReadAllAsync(SqliteCommand cmd, CancellationToken ct)
    {
        var items = new List<QueueItem>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            items.Add(new QueueItem(
                Guid.Parse(r.GetString(0)),
                r.GetString(1),
                r.GetString(2),
                FromText(r.GetString(3)),
                NullableString(r, 4),
                r.IsDBNull(5) ? null : r.GetInt32(5),
                Enum.Parse<QueueStatus>(r.GetString(6)),
                NullableString(r, 7),
                r.GetInt32(8),
                NullableString(r, 9),
                FromNullableText(r, 10),
                FromText(r.GetString(11)),
                FromText(r.GetString(12))));
        }
        return items;
    }
}
