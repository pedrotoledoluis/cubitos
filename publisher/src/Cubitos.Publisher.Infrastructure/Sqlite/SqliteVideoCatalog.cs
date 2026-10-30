using static Cubitos.Publisher.Infrastructure.Sqlite.SqliteDatabase;

namespace Cubitos.Publisher.Infrastructure.Sqlite;

/// <summary>A channel video known to the service; <see cref="EpisodeId"/> links it to a repo episode when known.</summary>
public sealed record CatalogVideo(string VideoId, string Title, DateTimeOffset? PublishedAt, string? EpisodeId);

/// <summary>The <c>videos</c> table: which channel videos exist, for stats polling and the dashboard.</summary>
public sealed class SqliteVideoCatalog(SqliteDatabase db)
{
    /// <summary>Inserts or updates by video id. A null episode id keeps the stored one.</summary>
    public async Task UpsertAsync(CatalogVideo video, CancellationToken ct = default)
    {
        await using var conn = await db.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO videos (video_id, title, published_at, episode_id) VALUES ($id, $title, $published_at, $episode_id)
            ON CONFLICT (video_id) DO UPDATE SET
                title = excluded.title,
                published_at = COALESCE(excluded.published_at, videos.published_at),
                episode_id = COALESCE(excluded.episode_id, videos.episode_id);
            """;
        cmd.Parameters.AddWithValue("$id", video.VideoId);
        cmd.Parameters.AddWithValue("$title", video.Title);
        cmd.Parameters.AddWithValue("$published_at", (object?)ToText(video.PublishedAt) ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$episode_id", (object?)video.EpisodeId ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task<IReadOnlyList<CatalogVideo>> GetAllAsync(CancellationToken ct = default)
    {
        await using var conn = await db.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT video_id, title, published_at, episode_id FROM videos ORDER BY published_at, video_id;";
        var list = new List<CatalogVideo>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new CatalogVideo(r.GetString(0), r.GetString(1), FromNullableText(r, 2), NullableString(r, 3)));
        return list;
    }
}
