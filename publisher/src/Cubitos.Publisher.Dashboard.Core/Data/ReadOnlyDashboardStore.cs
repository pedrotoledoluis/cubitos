using System.Globalization;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;
using Cubitos.Publisher.Dashboard.Core.Formatting;
using Microsoft.Data.Sqlite;

namespace Cubitos.Publisher.Dashboard.Core.Data;

/// <summary>Everything the dashboard shows, read in one pass.</summary>
/// <param name="RecentSnapshots">Snapshots inside the recent window plus the latest snapshot of every video.</param>
/// <param name="LaunchSnapshots">Snapshots taken during the first 25 h after each video's publish time.</param>
/// <param name="EpisodeTitles">Titles read from the queued episodes' <c>metadata.json</c>, by episode id.</param>
public sealed record DashboardData(
    IReadOnlyList<VideoSnapshot> RecentSnapshots,
    IReadOnlyList<VideoSnapshot> LaunchSnapshots,
    IReadOnlyList<QueueItem> Queue,
    IReadOnlyList<CatalogVideo> Videos,
    IReadOnlyDictionary<string, string>? EpisodeTitles = null);

/// <summary>
/// Reads the service database without ever writing to it: the connection is opened read-only, no schema is created
/// and a missing file is reported as <c>null</c> instead of being created.
/// </summary>
public sealed class ReadOnlyDashboardStore(string databasePath)
{
    private const string SnapshotColumns = "video_id, title, taken_at, views, likes, comments";

    public string DatabasePath { get; } = databasePath;

    /// <summary>Returns <c>null</c> when the service has not created the database yet.</summary>
    public async Task<DashboardData?> LoadAsync(DateTimeOffset recentSince, CancellationToken ct = default)
    {
        if (!File.Exists(DatabasePath)) return null;

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = DatabasePath,
            Mode = SqliteOpenMode.ReadOnly,
            Pooling = false,
            DefaultTimeout = 10,
        }.ToString();

        await using var conn = new SqliteConnection(connectionString);
        await conn.OpenAsync(ct);
        var tables = await TablesAsync(conn, ct);

        var recent = tables.Contains("snapshots")
            ? await SnapshotsAsync(conn,
                $"SELECT {SnapshotColumns} FROM snapshots WHERE taken_at >= $since " +
                "OR id IN (SELECT MAX(id) FROM snapshots GROUP BY video_id) ORDER BY taken_at, video_id;",
                ("$since", ToText(recentSince)), ct)
            : [];

        var launch = tables.Contains("snapshots") && tables.Contains("videos")
            ? await SnapshotsAsync(conn,
                "SELECT s.video_id, s.title, s.taken_at, s.views, s.likes, s.comments FROM snapshots s " +
                "JOIN videos v ON v.video_id = s.video_id WHERE v.published_at IS NOT NULL " +
                "AND julianday(s.taken_at) > julianday(v.published_at) " +
                "AND julianday(s.taken_at) <= julianday(v.published_at) + 25.0 / 24 ORDER BY s.taken_at, s.video_id;",
                null, ct)
            : [];

        var queue = tables.Contains("queue_items") ? await QueueAsync(conn, ct) : [];
        var videos = tables.Contains("videos") ? await VideosAsync(conn, ct) : [];
        return new DashboardData(recent, launch, queue, videos, ReadTitles(queue));
    }

    private static async Task<HashSet<string>> TablesAsync(SqliteConnection conn, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT name FROM sqlite_master WHERE type = 'table';";
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct)) names.Add(r.GetString(0));
        return names;
    }

    private static async Task<List<VideoSnapshot>> SnapshotsAsync(
        SqliteConnection conn, string sql, (string Name, object Value)? parameter, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        if (parameter is { } p) cmd.Parameters.AddWithValue(p.Name, p.Value);
        var list = new List<VideoSnapshot>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new VideoSnapshot(r.GetString(0), r.GetString(1), FromText(r.GetString(2)), r.GetInt64(3), r.GetInt64(4), r.GetInt64(5)));
        return list;
    }

    private static async Task<List<QueueItem>> QueueAsync(SqliteConnection conn, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText =
            "SELECT id, episode_id, episode_dir, publish_at, replaces_video_id, keep_if_views_at_least, status, " +
            "new_video_id, attempts, last_error, retry_at, created_at, updated_at FROM queue_items ORDER BY created_at, rowid;";
        var items = new List<QueueItem>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            // A status written by a newer service version is skipped rather than crashing the panel.
            if (!Enum.TryParse<QueueStatus>(r.GetString(6), out var status)) continue;
            items.Add(new QueueItem(
                Guid.Parse(r.GetString(0)), r.GetString(1), r.GetString(2), FromText(r.GetString(3)),
                Nullable(r, 4), r.IsDBNull(5) ? null : r.GetInt32(5), status, Nullable(r, 7), r.GetInt32(8),
                Nullable(r, 9), r.IsDBNull(10) ? null : FromText(r.GetString(10)),
                FromText(r.GetString(11)), FromText(r.GetString(12))));
        }
        return items;
    }

    private static async Task<List<CatalogVideo>> VideosAsync(SqliteConnection conn, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT video_id, title, published_at, episode_id FROM videos ORDER BY published_at, video_id;";
        var list = new List<CatalogVideo>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new CatalogVideo(r.GetString(0), r.GetString(1), r.IsDBNull(2) ? null : FromText(r.GetString(2)), Nullable(r, 3)));
        return list;
    }

    /// <summary>Only active items need a title before upload; finished ones are few and usually in the catalog.</summary>
    private Dictionary<string, string> ReadTitles(IEnumerable<QueueItem> queue)
    {
        var titles = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var item in queue.Where(q => q.IsActive))
            if (!titles.ContainsKey(item.EpisodeId) && EpisodeTitles.ReadMetadataTitle(item.EpisodeDir, DatabasePath) is { } title)
                titles[item.EpisodeId] = title;
        return titles;
    }

    private static string? Nullable(SqliteDataReader r, int ordinal) => r.IsDBNull(ordinal) ? null : r.GetString(ordinal);

    /// <summary>Same fixed-width ISO 8601 UTC text the service writes, so string comparison equals time order.</summary>
    private static string ToText(DateTimeOffset value) =>
        value.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'", CultureInfo.InvariantCulture);

    private static DateTimeOffset FromText(string text) =>
        DateTimeOffset.Parse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);
}
