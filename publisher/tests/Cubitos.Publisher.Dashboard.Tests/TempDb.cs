using Cubitos.Publisher.Infrastructure.Sqlite;
using Microsoft.Data.Sqlite;

namespace Cubitos.Publisher.Dashboard.Tests;

/// <summary>A scratch database in a unique temp directory, created with the service schema; deleted on dispose.</summary>
public sealed class TempDb : IDisposable
{
    public string Dir { get; } = Path.Combine(Path.GetTempPath(), "cubitos-dash-tests-" + Guid.NewGuid().ToString("N"));
    public string DbPath => Path.Combine(Dir, "publisher.db");
    public SqliteDatabase Database { get; }

    public TempDb()
    {
        Directory.CreateDirectory(Dir);
        Database = new SqliteDatabase(DbPath);
    }

    public void Dispose()
    {
        SqliteConnection.ClearAllPools();
        try { Directory.Delete(Dir, recursive: true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
    }
}
