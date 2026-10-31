using System.Text.Json;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;
using Cubitos.Publisher.Infrastructure.Stats;

namespace Cubitos.Publisher.Infrastructure.Tests;

public sealed class JsonChannelStatsWriterTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 31, 17, 0, 0, 123, TimeSpan.Zero);

    private static ChannelStatsReport Sample() => new(
        Now,
        new ChannelTotals(1, 200, 7, 2, 40),
        [new VideoStatsRow("abc123", "Título", Now.AddDays(-1), 200, 7, 2, 40, [0, 1, 2])],
        [new DailyViewsPoint(new DateOnly(2026, 10, 31), 200)],
        new QueueSummary(
            new Dictionary<QueueStatus, int> { [QueueStatus.WaitingForQuota] = 2, [QueueStatus.Published] = 1 },
            new QueueEntry("024-b", "Episodio B", QueueStatus.Pending, Now.AddHours(2), null),
            [
                new QueueEntry("024-b", "Episodio B", QueueStatus.Pending, Now.AddHours(2), null),
                new QueueEntry("023-a", "Episodio A", QueueStatus.WaitingForQuota, Now.AddHours(-1), Now.AddHours(10)),
            ]));

    [Fact]
    public void Serializes_the_public_shape_with_peru_offsets()
    {
        using var doc = JsonDocument.Parse(JsonChannelStatsWriter.Serialize(Sample()));
        var root = doc.RootElement;

        Assert.Equal(1, root.GetProperty("schemaVersion").GetInt32());
        Assert.Equal("2026-10-31T12:00:00-05:00", root.GetProperty("generatedAt").GetString());
        var channel = root.GetProperty("channel");
        Assert.Equal(200, channel.GetProperty("views").GetInt64());
        Assert.Equal(1, channel.GetProperty("videos").GetInt32());
        Assert.Equal(40, channel.GetProperty("views24h").GetInt64());
        Assert.False(channel.TryGetProperty("subscribers", out _));

        var video = root.GetProperty("videos")[0];
        Assert.Equal("abc123", video.GetProperty("id").GetString());
        Assert.Equal("Título", video.GetProperty("title").GetString());
        Assert.Equal("2026-10-30T12:00:00-05:00", video.GetProperty("publishedAt").GetString());
        Assert.Equal(7, video.GetProperty("likes").GetInt64());
        Assert.Equal(3, video.GetProperty("trend24h").GetArrayLength());

        var day = root.GetProperty("dailyViews")[0];
        Assert.Equal("2026-10-31", day.GetProperty("date").GetString());
        Assert.Equal(200, day.GetProperty("views").GetInt64());

        var queue = root.GetProperty("queue");
        Assert.Equal(2, queue.GetProperty("counts").GetProperty("WaitingForQuota").GetInt32());
        Assert.Equal("024-b", queue.GetProperty("next").GetProperty("episode").GetString());
        var waiting = queue.GetProperty("upcoming")[1];
        Assert.Equal("WaitingForQuota", waiting.GetProperty("status").GetString());
        Assert.Equal("2026-10-31T22:00:00-05:00", waiting.GetProperty("retryAt").GetString());
    }

    [Fact]
    public void Missing_values_serialize_as_null_and_an_empty_queue_has_no_next()
    {
        var report = new ChannelStatsReport(Now, new ChannelTotals(0, 0, 0, 0, 0),
            [new VideoStatsRow("x", "X", null, null, null, null, null, [])], [],
            new QueueSummary(new Dictionary<QueueStatus, int>(), null, []));

        using var doc = JsonDocument.Parse(JsonChannelStatsWriter.Serialize(report));
        var video = doc.RootElement.GetProperty("videos")[0];
        Assert.Equal(JsonValueKind.Null, video.GetProperty("views").ValueKind);
        Assert.Equal(JsonValueKind.Null, video.GetProperty("publishedAt").ValueKind);
        Assert.Equal(JsonValueKind.Null, doc.RootElement.GetProperty("queue").GetProperty("next").ValueKind);
    }

    [Fact]
    public async Task Writes_the_file_creating_its_folder()
    {
        using var dir = new TempDir();
        var path = Path.Combine(dir.Path, "site", "data", "channel-stats.json");

        await new JsonChannelStatsWriter(path).WriteAsync(Sample());

        using var doc = JsonDocument.Parse(await File.ReadAllTextAsync(path));
        Assert.Equal(200, doc.RootElement.GetProperty("channel").GetProperty("views").GetInt64());
        Assert.Empty(Directory.GetFiles(Path.GetDirectoryName(path)!, "*.tmp"));
    }
}
