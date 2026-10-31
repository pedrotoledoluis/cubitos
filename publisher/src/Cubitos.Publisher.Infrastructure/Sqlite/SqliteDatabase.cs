using System.Globalization;
using Microsoft.Data.Sqlite;

namespace Cubitos.Publisher.Infrastructure.Sqlite;

/// <summary>Opens connections to the shared publisher DB, creating the schema once. WAL lets the CLI read while the service writes.</summary>
public sealed class SqliteDatabase(string path)
{
    private const string Schema = """
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS queue_items (
            id TEXT PRIMARY KEY,
            episode_id TEXT NOT NULL,
            episode_dir TEXT NOT NULL,
            publish_at TEXT NOT NULL,
            replaces_video_id TEXT NULL,
            keep_if_views_at_least INTEGER NULL,
            status TEXT NOT NULL,
            new_video_id TEXT NULL,
            attempts INTEGER NOT NULL,
            last_error TEXT NULL,
            retry_at TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id TEXT NOT NULL,
            title TEXT NOT NULL,
            taken_at TEXT NOT NULL,
            views INTEGER NOT NULL,
            likes INTEGER NOT NULL,
            comments INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ix_snapshots_video_taken ON snapshots (video_id, taken_at);
        CREATE INDEX IF NOT EXISTS ix_snapshots_taken ON snapshots (taken_at);
        CREATE TABLE IF NOT EXISTS videos (
            video_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            published_at TEXT NULL,
            episode_id TEXT NULL
        );
        """;

    private readonly string _connectionString = new SqliteConnectionStringBuilder
    {
        DataSource = path,
        Mode = SqliteOpenMode.ReadWriteCreate,
        DefaultTimeout = 30,
    }.ToString();

    private readonly SemaphoreSlim _schemaLock = new(1, 1);
    private bool _schemaReady;

    public string Path { get; } = path;

    public async Task<SqliteConnection> OpenAsync(CancellationToken ct = default)
    {
        var dir = System.IO.Path.GetDirectoryName(System.IO.Path.GetFullPath(Path));
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        var conn = new SqliteConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using (var pragma = conn.CreateCommand())
        {
            pragma.CommandText = "PRAGMA busy_timeout = 5000;";
            await pragma.ExecuteNonQueryAsync(ct);
        }
        if (!_schemaReady) await EnsureSchemaAsync(conn, ct);
        return conn;
    }

    private async Task EnsureSchemaAsync(SqliteConnection conn, CancellationToken ct)
    {
        await _schemaLock.WaitAsync(ct);
        try
        {
            if (_schemaReady) return;
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = Schema;
            await cmd.ExecuteNonQueryAsync(ct);
            _schemaReady = true;
        }
        finally
        {
            _schemaLock.Release();
        }
    }

    /// <summary>Fixed-width ISO 8601 UTC text, so string order equals time order.</summary>
    internal static string ToText(DateTimeOffset value) =>
        value.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'", CultureInfo.InvariantCulture);

    internal static string? ToText(DateTimeOffset? value) => value is { } v ? ToText(v) : null;

    internal static DateTimeOffset FromText(string text) =>
        DateTimeOffset.Parse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);

    internal static DateTimeOffset? FromNullableText(SqliteDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : FromText(reader.GetString(ordinal));

    internal static string? NullableString(SqliteDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
}
