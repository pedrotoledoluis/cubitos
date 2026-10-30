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
    public void System_clock_returns_utc_now()
    {
        var before = DateTimeOffset.UtcNow;
        var now = new SystemClock().UtcNow;
        Assert.InRange(now, before, DateTimeOffset.UtcNow);
        Assert.Equal(TimeSpan.Zero, now.Offset);
    }
}
