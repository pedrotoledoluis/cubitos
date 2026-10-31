using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;

namespace Cubitos.Publisher.Core.Tests;

public class ChannelStatsBuilderTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 31, 17, 0, 0, TimeSpan.Zero); // 12:00 Peru

    private static VideoSnapshot Snap(string id, DateTimeOffset at, long views, long likes = 0, long comments = 0) =>
        new(id, $"snap {id}", at, views, likes, comments);

    private static CatalogVideo Video(string id, VideoPrivacy? privacy = VideoPrivacy.Public, DateTimeOffset? publishedAt = null) =>
        new(id, $"Title {id}", publishedAt ?? Now.AddDays(-2), null, privacy);

    private static QueueItem Item(string episodeId, QueueStatus status, DateTimeOffset publishAt,
        string? newVideoId = null, string? replaces = null, DateTimeOffset? retryAt = null, string? lastError = null) =>
        new(Guid.NewGuid(), episodeId, $"videos/{episodeId}", publishAt, replaces, null, status, newVideoId, 1,
            lastError, retryAt, Now.AddDays(-1), Now.AddDays(-1));

    private static ChannelStatsReport Build(
        IEnumerable<VideoSnapshot>? snapshots = null, IEnumerable<CatalogVideo>? videos = null,
        IEnumerable<QueueItem>? queue = null, IEnumerable<UploadLogEntry>? uploads = null) =>
        ChannelStatsBuilder.Build(new ChannelStatsInput(
            (snapshots ?? []).ToList(), (videos ?? []).ToList(), (queue ?? []).ToList(), (uploads ?? []).ToList(),
            item => $"Episode {item.EpisodeId}"), Now);

    [Fact]
    public void Empty_input_gives_zero_totals_and_empty_lists()
    {
        var report = Build();

        Assert.Equal(Now, report.GeneratedAt);
        Assert.Equal(new ChannelTotals(0, 0, 0, 0, 0), report.Channel);
        Assert.Empty(report.Videos);
        Assert.Empty(report.DailyViews);
        Assert.Empty(report.Queue.Counts);
        Assert.Null(report.Queue.Next);
        Assert.Empty(report.Queue.Upcoming);
    }

    [Fact]
    public void Totals_and_rows_use_the_latest_snapshot_per_video()
    {
        var report = Build(
            snapshots:
            [
                Snap("a", Now.AddHours(-30), 50, 1, 0), Snap("a", Now.AddHours(-2), 150, 5, 1), Snap("a", Now.AddMinutes(-10), 200, 7, 2),
                Snap("b", Now.AddHours(-1), 10, 1, 0),
            ],
            videos: [Video("a"), Video("b")]);

        Assert.Equal(new ChannelTotals(2, 210, 8, 2, report.Channel.Views24h), report.Channel);
        var a = report.Videos[0];
        Assert.Equal(("a", "Title a", 200L, 7L, 2L), (a.VideoId, a.Title, a.Views, a.Likes, a.Comments));
        Assert.Equal(24, a.Trend24h.Count);
        Assert.True(a.Views24h is > 0 and <= 150);
        Assert.Equal(a.Views24h, report.Channel.Views24h);
        Assert.Equal("b", report.Videos[1].VideoId);
    }

    [Fact]
    public void Daily_series_sums_cumulative_views_at_the_end_of_each_peru_day()
    {
        // Peru day 30 ends at 2026-10-31T05:00Z.
        var report = Build(
            snapshots:
            [
                Snap("a", new DateTimeOffset(2026, 10, 30, 20, 0, 0, TimeSpan.Zero), 100),
                Snap("a", new DateTimeOffset(2026, 10, 31, 4, 0, 0, TimeSpan.Zero), 120),
                Snap("b", new DateTimeOffset(2026, 10, 31, 4, 30, 0, TimeSpan.Zero), 30),
                Snap("a", new DateTimeOffset(2026, 10, 31, 16, 0, 0, TimeSpan.Zero), 300),
            ],
            videos: [Video("a"), Video("b")]);

        Assert.Equal(
            [new DailyViewsPoint(new DateOnly(2026, 10, 30), 150), new DailyViewsPoint(new DateOnly(2026, 10, 31), 330)],
            report.DailyViews);
    }

    [Fact]
    public void Non_public_videos_are_left_out()
    {
        var report = Build(
            snapshots: new[] { "pub", "priv", "unl", "replaced", "scheduled", "future", "old", "logfuture", "unknown" }
                .Select(id => Snap(id, Now.AddMinutes(-5), 10)),
            videos:
            [
                Video("pub"), Video("priv", VideoPrivacy.Private), Video("unl", VideoPrivacy.Unlisted),
                Video("replaced", null), Video("scheduled", null), Video("future", null, Now.AddHours(3)),
                Video("old", null), Video("logfuture", null), Video("unknown", null),
            ],
            queue:
            [
                Item("019-x", QueueStatus.ReplacedOldHidden, Now.AddDays(-1), "new019", replaces: "replaced"),
                Item("020-y", QueueStatus.Scheduled, Now.AddDays(1), "scheduled"),
            ],
            uploads:
            [
                new UploadLogEntry("001-z-old2", "old", Now.AddDays(-5), null),
                new UploadLogEntry("002-w", "logfuture", Now.AddHours(-1), Now.AddHours(5)),
            ]);

        Assert.Equal(new[] { "pub", "unknown" }, report.Videos.Select(v => v.VideoId).Order());
        Assert.Equal(20, report.Channel.Views);
        Assert.Equal(2, report.Channel.Videos);
    }

    [Fact]
    public void Catalog_video_without_snapshots_has_no_counters()
    {
        var row = Assert.Single(Build(videos: [Video("a")]).Videos);
        Assert.Null(row.Views);
        Assert.Empty(row.Trend24h);
    }

    [Fact]
    public void Queue_summary_counts_statuses_and_picks_the_next_waiting_item()
    {
        var report = Build(queue:
        [
            Item("023-a", QueueStatus.WaitingForQuota, Now.AddHours(-1), retryAt: Now.AddHours(10), lastError: "quota"),
            Item("024-b", QueueStatus.Pending, Now.AddHours(2)),
            Item("025-c", QueueStatus.Scheduled, Now.AddHours(5), "vid"),
            Item("010-d", QueueStatus.Published, Now.AddDays(-2), "pubvid"),
            Item("011-e", QueueStatus.Cancelled, Now.AddDays(-2)),
        ]);

        Assert.Equal(1, report.Queue.Counts[QueueStatus.WaitingForQuota]);
        Assert.Equal(1, report.Queue.Counts[QueueStatus.Published]);
        Assert.Equal(5, report.Queue.Counts.Values.Sum());
        Assert.Equal(new QueueEntry("024-b", "Episode 024-b", QueueStatus.Pending, Now.AddHours(2), null), report.Queue.Next);
        Assert.Equal(["024-b", "025-c", "023-a"], report.Queue.Upcoming.Select(e => e.EpisodeId));
    }
}
