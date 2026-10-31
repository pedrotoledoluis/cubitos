namespace Cubitos.Publisher.Infrastructure.Tests;

public sealed class PublisherOptionsTests
{
    [Fact]
    public void Empty_paths_resolve_under_repo_root_with_default_intervals()
    {
        var o = new PublisherOptions { RepoRoot = Path.Combine("C:", "repo") };

        Assert.Equal(Path.Combine(o.RepoRoot, "publisher", "data", "publisher.db"), o.ResolvedDatabasePath);
        Assert.Equal(Path.Combine(o.RepoRoot, "secrets", "token.json"), o.TokenPath);
        Assert.Equal(Path.Combine(o.RepoRoot, "uploader", "uploaded.json"), o.UploadLogPath);
        Assert.Equal(TimeSpan.FromMinutes(15), o.StatsInterval);
        Assert.Equal(TimeSpan.FromMinutes(2), o.PublishInterval);
    }

    [Fact]
    public void Explicit_paths_win()
    {
        var o = new PublisherOptions { RepoRoot = "r", DatabasePath = "x.db", SecretsDir = "s" };

        Assert.Equal("x.db", o.ResolvedDatabasePath);
        Assert.Equal(Path.Combine("s", "client_secret.json"), o.ClientSecretPath);
    }

    [Fact]
    public void Stats_export_path_defaults_to_the_site_and_resolves_relative_paths_from_the_repo()
    {
        var root = Path.Combine(Path.GetTempPath(), "repo");
        var o = new PublisherOptions { RepoRoot = root };

        Assert.Equal(Path.Combine(root, "site", "data", "channel-stats.json"), o.ResolvedStatsExportPath);
        Assert.Equal(Path.Combine(root, "out", "s.json"), o.ResolveRepoPath("out/s.json"));
        var absolute = Path.Combine(Path.GetTempPath(), "abs.json");
        Assert.Equal(absolute, o.ResolveRepoPath(absolute));

        o.StatsExportPath = "custom/stats.json";
        Assert.Equal(Path.Combine(root, "custom", "stats.json"), o.ResolvedStatsExportPath);
    }

    [Fact]
    public void System_clock_returns_utc_now()
    {
        var before = DateTimeOffset.UtcNow;
        var now = new SystemClock().UtcNow;
        Assert.InRange(now, before, DateTimeOffset.UtcNow);
        Assert.Equal(TimeSpan.Zero, now.Offset);
    }
}
