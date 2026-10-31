using Cubitos.Publisher.Core.Ports;

namespace Cubitos.Publisher.Infrastructure;

/// <summary>Service configuration (bound from the <c>Publisher</c> section). Empty paths fall back to repo defaults.</summary>
public sealed class PublisherOptions
{
    public const string SectionName = "Publisher";

    public string RepoRoot { get; set; } = "";
    /// <summary>Defaults to <c>&lt;RepoRoot&gt;/publisher/data/publisher.db</c>.</summary>
    public string DatabasePath { get; set; } = "";
    /// <summary>Defaults to <c>&lt;RepoRoot&gt;/secrets</c>.</summary>
    public string SecretsDir { get; set; } = "";
    public TimeSpan StatsInterval { get; set; } = TimeSpan.FromMinutes(15);
    public TimeSpan PublishInterval { get; set; } = TimeSpan.FromMinutes(2);

    public string ResolvedDatabasePath =>
        string.IsNullOrWhiteSpace(DatabasePath) ? Path.Combine(RepoRoot, "publisher", "data", "publisher.db") : DatabasePath;

    /// <summary>Defaults to <c>&lt;RepoRoot&gt;/publisher/data/logs</c>.</summary>
    public string LogDirectory { get; set; } = "";

    public string ResolvedLogDirectory =>
        string.IsNullOrWhiteSpace(LogDirectory) ? Path.Combine(RepoRoot, "publisher", "data", "logs") : LogDirectory;

    /// <summary>Public stats JSON for the website; relative paths are under <see cref="RepoRoot"/>. Defaults to <c>site/data/channel-stats.json</c>.</summary>
    public string StatsExportPath { get; set; } = "";

    public string ResolvedStatsExportPath =>
        ResolveRepoPath(string.IsNullOrWhiteSpace(StatsExportPath) ? Path.Combine("site", "data", "channel-stats.json") : StatsExportPath);

    /// <summary>Absolute paths are kept; relative ones are taken from <see cref="RepoRoot"/>.</summary>
    public string ResolveRepoPath(string path) =>
        Path.IsPathRooted(path) ? path : Path.GetFullPath(Path.Combine(RepoRoot, path));

    public string ResolvedSecretsDir => string.IsNullOrWhiteSpace(SecretsDir) ? Path.Combine(RepoRoot, "secrets") : SecretsDir;
    public string ClientSecretPath => Path.Combine(ResolvedSecretsDir, "client_secret.json");
    public string TokenPath => Path.Combine(ResolvedSecretsDir, "token.json");
    public string UploadLogPath => Path.Combine(RepoRoot, "uploader", "uploaded.json");
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
