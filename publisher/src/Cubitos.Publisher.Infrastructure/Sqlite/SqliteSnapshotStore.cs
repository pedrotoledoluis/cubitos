using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Stats;
using Microsoft.Data.Sqlite;
using static Cubitos.Publisher.Infrastructure.Sqlite.SqliteDatabase;

namespace Cubitos.Publisher.Infrastructure.Sqlite;

public sealed class SqliteSnapshotStore(SqliteDatabase db) : ISnapshotStore
{
    private const string Select = "SELECT video_id, title, taken_at, views, likes, comments FROM snapshots";

    public async Task AddRangeAsync(IEnumerable<VideoSnapshot> snapshots, CancellationToken ct = default)
    {
        await using var conn = await db.OpenAsync(ct);
        await using var tx = (SqliteTransaction)await conn.BeginTransactionAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = "INSERT INTO snapshots (video_id, title, taken_at, views, likes, comments) " +
                          "VALUES ($video_id, $title, $taken_at, $views, $likes, $comments);";
        var videoId = cmd.Parameters.Add("$video_id", SqliteType.Text);
        var title = cmd.Parameters.Add("$title", SqliteType.Text);
        var takenAt = cmd.Parameters.Add("$taken_at", SqliteType.Text);
        var views = cmd.Parameters.Add("$views", SqliteType.Integer);
        var likes = cmd.Parameters.Add("$likes", SqliteType.Integer);
        var comments = cmd.Parameters.Add("$comments", SqliteType.Integer);

        foreach (var s in snapshots)
        {
            videoId.Value = s.VideoId;
            title.Value = s.Title;
            takenAt.Value = ToText(s.TakenAt);
            views.Value = s.Views;
            likes.Value = s.Likes;
            comments.Value = s.Comments;
            await cmd.ExecuteNonQueryAsync(ct);
        }
        await tx.CommitAsync(ct);
    }

    public async Task<IReadOnlyList<VideoSnapshot>> GetSinceAsync(DateTimeOffset since, CancellationToken ct = default)
    {
        await using var conn = await db.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"{Select} WHERE taken_at >= $since ORDER BY taken_at, video_id;";
        cmd.Parameters.AddWithValue("$since", ToText(since));
        return await ReadAsync(cmd, ct);
    }

    public async Task<IReadOnlyList<VideoSnapshot>> GetForVideoAsync(string videoId, CancellationToken ct = default)
    {
        await using var conn = await db.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"{Select} WHERE video_id = $video_id ORDER BY taken_at;";
        cmd.Parameters.AddWithValue("$video_id", videoId);
        return await ReadAsync(cmd, ct);
    }

    private static async Task<List<VideoSnapshot>> ReadAsync(SqliteCommand cmd, CancellationToken ct)
    {
        var list = new List<VideoSnapshot>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new VideoSnapshot(r.GetString(0), r.GetString(1), FromText(r.GetString(2)), r.GetInt64(3), r.GetInt64(4), r.GetInt64(5)));
        return list;
    }
}
