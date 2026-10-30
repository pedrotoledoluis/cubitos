using Cubitos.Publisher.Core.Stats;

namespace Cubitos.Publisher.Core.Tests;

public class PeruTimeTests
{
    [Fact]
    public void Utc_17_is_noon_in_peru()
    {
        var peru = PeruTime.ToPeru(new DateTimeOffset(2026, 10, 30, 17, 0, 0, TimeSpan.Zero));
        Assert.Equal(12, peru.Hour);
        Assert.Equal(TimeSpan.FromHours(-5), peru.Offset);
    }
}

public class HourlyViewsCalculatorTests
{
    private static readonly DateTimeOffset T0 = new(2026, 10, 30, 17, 0, 0, TimeSpan.Zero); // Friday 12:00 Peru

    private static VideoSnapshot Snap(string id, DateTimeOffset at, long views, string title = "t") =>
        new(id, title, at, views, 0, 0);

    [Fact]
    public void Delta_inside_one_hour_goes_to_peru_bucket()
    {
        var map = HourlyViewsCalculator.Heatmap([Snap("a", T0.AddMinutes(10), 100), Snap("a", T0.AddMinutes(40), 160)]);
        var bucket = Assert.Single(map);
        Assert.Equal((DayOfWeek.Friday, 12), bucket.Key);
        Assert.Equal(60, bucket.Value, 6);
    }

    [Fact]
    public void Delta_across_hour_boundary_is_split_proportionally()
    {
        // 12:45 -> 13:15 Peru, 40 views: 20 in each hour.
        var map = HourlyViewsCalculator.Heatmap([Snap("a", T0.AddMinutes(45), 0), Snap("a", T0.AddMinutes(75), 40)]);
        Assert.Equal(20, map[(DayOfWeek.Friday, 12)], 6);
        Assert.Equal(20, map[(DayOfWeek.Friday, 13)], 6);
    }

    [Fact]
    public void Uneven_split_follows_time_share()
    {
        // 12:30 -> 14:00 Peru, 90 views: 30 in 12h, 60 in 13h.
        var map = HourlyViewsCalculator.Heatmap([Snap("a", T0.AddMinutes(30), 10), Snap("a", T0.AddHours(2), 100)]);
        Assert.Equal(30, map[(DayOfWeek.Friday, 12)], 6);
        Assert.Equal(60, map[(DayOfWeek.Friday, 13)], 6);
    }

    [Fact]
    public void Peru_day_differs_from_utc_day()
    {
        // 2026-10-31T03:00Z (Saturday UTC) is Friday 22:00 in Peru.
        var at = new DateTimeOffset(2026, 10, 31, 3, 0, 0, TimeSpan.Zero);
        var map = HourlyViewsCalculator.Heatmap([Snap("a", at, 0), Snap("a", at.AddMinutes(30), 5)]);
        Assert.Equal((DayOfWeek.Friday, 22), Assert.Single(map).Key);
    }

    [Fact]
    public void Videos_are_diffed_separately_and_unordered_input_is_sorted()
    {
        var map = HourlyViewsCalculator.Heatmap([
            Snap("b", T0.AddMinutes(30), 50), Snap("a", T0.AddMinutes(30), 10),
            Snap("a", T0, 0), Snap("b", T0, 45)]);
        Assert.Equal(15, map[(DayOfWeek.Friday, 12)], 6);
    }

    [Fact]
    public void Negative_deltas_are_ignored()
    {
        var map = HourlyViewsCalculator.Heatmap([Snap("a", T0, 100), Snap("a", T0.AddMinutes(30), 90)]);
        Assert.Empty(map);
    }

    [Fact]
    public void Ranking_uses_latest_totals_and_time_windows()
    {
        var now = T0.AddHours(30);
        var ranking = HourlyViewsCalculator.Rank([
            Snap("a", now.AddHours(-30), 0, "old"),
            Snap("a", now.AddHours(-20), 100),
            Snap("a", now.AddHours(-2), 200),
            Snap("a", now.AddMinutes(-30), 260, "A latest"),
            Snap("b", now.AddHours(-1), 500),
            Snap("b", now, 510, "B"),
        ], now);

        Assert.Equal(["b", "a"], ranking.Select(r => r.VideoId));
        var a = ranking[1];
        Assert.Equal("A latest", a.Title);
        Assert.Equal(260, a.TotalViews);
        // -2h -> -30m (90 min, 60 views): the last 30 min of it lie in the last hour.
        Assert.Equal(20, a.ViewsLast1h, 6);
        // -30h -> -20h contributes 4 of its 10 hours (40 views), then 100 + 60.
        Assert.Equal(40 + 100 + 60, a.ViewsLast24h, 6);
        Assert.Equal(10, ranking[0].ViewsLast1h, 6);
    }
}

public class FirstDayCurveTests
{
    private static readonly DateTimeOffset Pub = new(2026, 10, 30, 17, 0, 0, TimeSpan.Zero);

    private static VideoSnapshot Snap(DateTimeOffset at, long views) => new("a", "t", at, views, 0, 0);

    [Fact]
    public void Views_are_bucketed_by_hour_since_publish_starting_from_zero()
    {
        var curve = FirstDayCurve.Compute(Pub, [
            Snap(Pub.AddMinutes(30), 50),
            Snap(Pub.AddMinutes(90), 110),
            Snap(Pub.AddHours(30), 2510),
        ]);

        Assert.Equal(24, curve.Count);
        Assert.Equal(50 + 30, curve[0], 6);
        // 60..90 min carries 30; 90 min..30 h carries 2400 over 28.5 h -> ~84.2/h.
        Assert.Equal(30 + 2400 / 28.5 * 0.5, curve[1], 6);
        Assert.Equal(2400 / 28.5, curve[23], 6);
    }

    [Fact]
    public void No_snapshots_gives_flat_zero_curve() =>
        Assert.All(FirstDayCurve.Compute(Pub, []), v => Assert.Equal(0, v));
}
