using Cubitos.Publisher.Infrastructure;
using Cubitos.Publisher.Worker.Hosting;
using Microsoft.Extensions.Logging;

namespace Cubitos.Publisher.Worker.Tests;

public sealed class HostingTests
{
    [Fact]
    public void Options_validator_rejects_missing_repo_and_tiny_intervals()
    {
        var result = new PublisherOptionsValidator().Validate(null, new PublisherOptions
        {
            RepoRoot = Path.Combine(Path.GetTempPath(), "does-not-exist-" + Guid.NewGuid().ToString("N")),
            PublishInterval = TimeSpan.FromSeconds(1),
            StatsInterval = TimeSpan.FromSeconds(5),
        });

        Assert.True(result.Failed);
        Assert.Equal(3, result.Failures!.Count());
    }

    [Fact]
    public void Options_validator_accepts_existing_repo_with_defaults() =>
        Assert.True(new PublisherOptionsValidator().Validate(null, new PublisherOptions { RepoRoot = Path.GetTempPath() }).Succeeded);

    [Fact]
    public void File_logger_writes_one_file_per_peru_day_created_lazily()
    {
        var dir = Path.Combine(Path.GetTempPath(), "cubitos-logs-" + Guid.NewGuid().ToString("N"));
        // 03:00Z on Oct 31 is still Oct 30 in Peru.
        var at = new DateTimeOffset(2026, 10, 31, 3, 0, 0, TimeSpan.Zero);
        try
        {
            using var provider = new DailyFileLoggerProvider(dir, () => at);
            var logger = provider.CreateLogger("Test");
            Assert.False(Directory.Exists(dir));

            logger.LogInformation("hello {Name}", "world");

            var file = Path.Combine(dir, "publisher-20261030.log");
            Assert.Equal("publisher-20261030.log", DailyFileLoggerProvider.FileNameFor(at));
            Assert.Contains("[INF] Test: hello world", File.ReadAllText(file));
        }
        finally
        {
            if (Directory.Exists(dir)) Directory.Delete(dir, recursive: true);
        }
    }
}
