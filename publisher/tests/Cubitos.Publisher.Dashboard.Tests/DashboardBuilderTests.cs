using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;
using Cubitos.Publisher.Dashboard.Core.Data;
using Cubitos.Publisher.Dashboard.Core.Model;

namespace Cubitos.Publisher.Dashboard.Tests;

public class DashboardBuilderTests
{
    // Friday 2026-10-30 12:00 Peru.
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 17, 0, 0, TimeSpan.Zero);

    private static VideoSnapshot Snap(string id, DateTimeOffset at, long views, long likes = 0, long comments = 0) =>
        new(id, "title " + id, at, views, likes, comments);

    private static DashboardData Data(
        IEnumerable<VideoSnapshot>? recent = null, IEnumerable<VideoSnapshot>? launch = null,
        IEnumerable<QueueItem>? queue = null, IEnumerable<CatalogVideo>? videos = null) =>
        new((recent ?? []).ToList(), (launch ?? []).ToList(), (queue ?? []).ToList(), (videos ?? []).ToList());

    private static QueueItem Item(string episode, DateTimeOffset publishAt, QueueStatus status, string? newVideoId = null) =>
        new(Guid.NewGuid(), episode, "videos/" + episode, publishAt, null, null, status, newVideoId, 0, null, null, Now, Now);

    [Fact]
    public void Ranking_orders_by_views_and_takes_likes_and_comments_from_latest_snapshot()
    {
        var model = DashboardBuilder.Build(Data(recent: [
            Snap("a", Now.AddHours(-2), 100, 1, 1), Snap("a", Now, 160, 7, 3),
            Snap("b", Now, 500, 20, 9), Snap("c", Now, 50), Snap("d", Now, 10),
        ]), Now);

        Assert.Equal(["b", "a", "c", "d"], model.Ranking.Select(r => r.VideoId));
        Assert.Equal([1, 2, 3, 4], model.Ranking.Select(r => r.Position));
        Assert.Equal([true, true, true, false], model.Ranking.Select(r => r.IsPodium));
        var a = model.Ranking[1];
        Assert.Equal(160, a.TotalViews);
        Assert.Equal(7, a.Likes);
        Assert.Equal(3, a.Comments);
        Assert.Equal(30, a.ViewsLast1h, 6);
        Assert.Equal(60, a.ViewsLast24h, 6);
        Assert.Equal(24, a.Sparkline.Count);
        Assert.Equal(30, a.Sparkline[^1], 6);
        Assert.Equal(30, a.Sparkline[^2], 6);
    }

    [Fact]
    public void Kpis_sum_latest_views_and_count_views_since_peru_midnight()
    {
        // Peru midnight is 05:00 UTC; video a earns 100 views between 03:00 and 07:00 UTC, so 50 after midnight.
        var midnightUtc = new DateTimeOffset(2026, 10, 30, 5, 0, 0, TimeSpan.Zero);
        var model = DashboardBuilder.Build(Data(recent: [
            Snap("a", midnightUtc.AddHours(-2), 1000), Snap("a", midnightUtc.AddHours(2), 1100), Snap("b", Now, 40),
        ]), Now);

        Assert.Equal(1140, model.Kpis.TotalViews);
        Assert.Equal(50, model.Kpis.ViewsToday, 6);
    }

    [Fact]
    public void Videos_published_uses_the_catalog_or_falls_back_to_snapshot_videos()
    {
        var withCatalog = DashboardBuilder.Build(Data(recent: [Snap("a", Now, 1)],
            videos: [new CatalogVideo("a", "A", null, null), new CatalogVideo("b", "B", null, null)]), Now);
        var withoutCatalog = DashboardBuilder.Build(Data(recent: [Snap("a", Now, 1), Snap("c", Now, 1)]), Now);

        Assert.Equal(2, withCatalog.Kpis.VideosPublished);
        Assert.Equal(2, withoutCatalog.Kpis.VideosPublished);
    }

    [Fact]
    public void Next_publish_is_the_earliest_waiting_item()
    {
        var model = DashboardBuilder.Build(Data(queue: [
            Item("done", Now.AddHours(-5), QueueStatus.Published),
            Item("later", Now.AddHours(10), QueueStatus.Pending),
            Item("soon", Now.AddHours(2), QueueStatus.Scheduled),
            Item("cancelled", Now.AddHours(1), QueueStatus.Cancelled),
        ]), Now);

        Assert.NotNull(model.Kpis.NextPublish);
        Assert.Equal("soon", model.Kpis.NextPublish.EpisodeId);
        Assert.Equal(Now.AddHours(2), model.Kpis.NextPublish.PublishAt);
    }

    [Fact]
    public void Empty_data_gives_empty_sections()
    {
        var model = DashboardBuilder.Build(Data(), Now);

        Assert.Empty(model.Ranking);
        Assert.Empty(model.Queue);
        Assert.Empty(model.LaunchCurves);
        Assert.Null(model.ChannelAverageCurve);
        Assert.Null(model.Kpis.NextPublish);
        Assert.Equal(0, model.Heatmap.Max);
        Assert.Empty(model.Heatmap.BestHours);
    }

    [Fact]
    public void Heatmap_rows_start_on_monday_and_best_hours_rank_hours_of_day()
    {
        // Friday 12:00-13:00 Peru: 60 views; Monday 2026-10-26 20:00-21:00 Peru: 90; Friday 09:00-10:00: 10.
        var monday20 = new DateTimeOffset(2026, 10, 27, 1, 0, 0, TimeSpan.Zero);
        var model = DashboardBuilder.Build(Data(recent: [
            Snap("a", monday20, 0), Snap("a", monday20.AddHours(1), 90),
            Snap("b", Now.AddHours(-3), 0), Snap("b", Now.AddHours(-2), 10),
            Snap("c", Now, 0), Snap("c", Now.AddHours(1), 60),
        ]), Now.AddHours(1));

        Assert.Equal(90, model.Heatmap.Cells[0, 20], 6);
        Assert.Equal(60, model.Heatmap.Cells[4, 12], 6);
        Assert.Equal(90, model.Heatmap.Max, 6);
        Assert.Equal([20, 12, 9], model.Heatmap.BestHours);
    }

    [Fact]
    public void Launch_curves_are_cumulative_and_average_only_complete_observed_videos()
    {
        var pubA = Now.AddDays(-3);
        var pubB = Now.AddDays(-2);
        var pubLate = Now.AddDays(-4); // first snapshot 10 h after publish: not observed from start
        var pubFresh = Now.AddHours(-5); // under 24 h old: shown, not averaged
        var model = DashboardBuilder.Build(Data(
            launch: [
                Snap("a", pubA.AddHours(1), 100), Snap("a", pubA.AddHours(24), 330),
                Snap("b", pubB.AddHours(1), 300), Snap("b", pubB.AddHours(24), 530),
                Snap("late", pubLate.AddHours(10), 500), Snap("late", pubLate.AddHours(24), 600),
                Snap("fresh", pubFresh.AddHours(1), 5), Snap("fresh", pubFresh.AddHours(4), 50),
            ],
            videos: [
                new CatalogVideo("a", "A", pubA, null), new CatalogVideo("b", "B", pubB, null),
                new CatalogVideo("late", "Late", pubLate, null), new CatalogVideo("fresh", "Fresh", pubFresh, null),
                new CatalogVideo("nodata", "No data", pubA, null), new CatalogVideo("nodate", "No date", null, null),
            ]), Now);

        Assert.Equal(["fresh", "b", "a", "late"], model.LaunchCurves.Select(c => c.VideoId));
        var a = model.LaunchCurves.Single(c => c.VideoId == "a");
        Assert.Equal(24, a.Cumulative.Count);
        Assert.Equal(100, a.Cumulative[0], 6);
        Assert.Equal(110, a.Cumulative[1], 6);
        Assert.Equal(330, a.Cumulative[23], 6);
        Assert.True(a.ObservedFromStart);
        Assert.False(model.LaunchCurves.Single(c => c.VideoId == "late").ObservedFromStart);
        Assert.Equal(5, model.LaunchCurves.Single(c => c.VideoId == "fresh").Cumulative.Count);

        Assert.NotNull(model.ChannelAverageCurve);
        Assert.Equal(200, model.ChannelAverageCurve[0], 6);
        Assert.Equal(430, model.ChannelAverageCurve[23], 6);
    }

    [Fact]
    public void Queue_lists_active_items_first_by_time_then_finished_newest_first_with_links()
    {
        var model = DashboardBuilder.Build(Data(queue: [
            Item("old-done", Now.AddDays(-3), QueueStatus.Published, "vidOld"),
            Item("late-pending", Now.AddHours(5), QueueStatus.Pending),
            Item("new-done", Now.AddDays(-1), QueueStatus.ReplacedOldHidden, "vidNew"),
            Item("soon", Now.AddHours(1), QueueStatus.WaitingForQuota),
        ]), Now);

        Assert.Equal(["soon", "late-pending", "new-done", "old-done"], model.Queue.Select(q => q.EpisodeId));
        Assert.Equal("https://youtu.be/vidNew", model.Queue[2].VideoUrl);
        Assert.Null(model.Queue[0].VideoUrl);
        Assert.True(model.Queue[0].IsActive);
        Assert.False(model.Queue[3].IsActive);
    }
}
