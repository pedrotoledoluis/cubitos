using Cubitos.Publisher.Dashboard.Core.Presentation;

namespace Cubitos.Publisher.Dashboard.Tests;

public class NumberTweenTests
{
    [Fact]
    public void Starts_at_from_and_ends_exactly_at_to()
    {
        var tween = new NumberTween(TimeSpan.FromMilliseconds(600));
        tween.Retarget(0, 0, 1000);
        Assert.Equal(0, tween.Value(0), 6);
        Assert.Equal(1000, tween.Value(0.6), 6);
        Assert.Equal(1000, tween.Value(5), 6);
        Assert.False(tween.IsRunning(0.6));
        Assert.True(tween.IsRunning(0.3));
    }

    [Fact]
    public void Eases_out_so_the_first_half_covers_most_of_the_distance()
    {
        var tween = new NumberTween(TimeSpan.FromMilliseconds(600));
        tween.Retarget(0, 0, 100);
        var half = tween.Value(0.3);
        Assert.True(half > 75 && half < 100, $"half-way value was {half}");
    }

    [Fact]
    public void Retargeting_mid_flight_continues_from_the_current_value()
    {
        var tween = new NumberTween(TimeSpan.FromMilliseconds(600));
        tween.Retarget(0, 0, 100);
        var mid = tween.Value(0.2);
        tween.Retarget(0.2, mid, 50);
        Assert.Equal(mid, tween.Value(0.2), 6);
        Assert.Equal(50, tween.Value(0.8), 6);
    }

    [Fact]
    public void Non_finite_targets_jump_without_animation()
    {
        var tween = new NumberTween(TimeSpan.FromMilliseconds(600));
        tween.Retarget(0, double.NaN, 10);
        Assert.Equal(10, tween.Value(0), 6);
        Assert.False(tween.IsRunning(0));
    }
}

public class FrameTimeStatsTests
{
    [Fact]
    public void Empty_input_reports_zero()
    {
        var stats = FrameTimeStats.From([]);
        Assert.Equal(0, stats.Frames);
        Assert.Equal(0, stats.AverageFps);
        Assert.Equal(0, stats.WorstMs);
    }

    [Fact]
    public void Computes_average_fps_worst_and_percentile()
    {
        var frames = Enumerable.Repeat(16.0, 99).Append(40.0).ToList();
        var stats = FrameTimeStats.From(frames);
        Assert.Equal(100, stats.Frames);
        Assert.Equal(1000 * 100 / (16.0 * 99 + 40), stats.AverageFps, 6);
        Assert.Equal(40, stats.WorstMs, 6);
        Assert.Equal(16, stats.P95Ms, 6);
        Assert.Equal(1, stats.SlowFrames); // frames over 33.4 ms (two missed vsyncs at 60 Hz)
        Assert.Contains("avg_fps=", stats.Summary());
    }
}

public class KeyedListSyncTests
{
    private sealed class Row(string key, int value)
    {
        public string Key { get; } = key;
        public int Value { get; set; } = value;
    }

    [Fact]
    public void Same_keys_in_same_order_update_in_place()
    {
        var a = new Row("a", 1);
        var b = new Row("b", 2);
        var list = new List<Row> { a, b };
        var inPlace = KeyedListSync.Apply(list, [("a", 10), ("b", 20)], r => r.Key, m => m.Item1,
            m => new Row(m.Item1, m.Item2), (r, m) => r.Value = m.Item2);
        Assert.True(inPlace);
        Assert.Same(a, list[0]);
        Assert.Same(b, list[1]);
        Assert.Equal(10, a.Value);
        Assert.Equal(20, b.Value);
    }

    [Fact]
    public void Changed_keys_rebuild_the_list_reusing_known_items()
    {
        var a = new Row("a", 1);
        var b = new Row("b", 2);
        var list = new List<Row> { a, b };
        var inPlace = KeyedListSync.Apply(list, [("b", 5), ("c", 6)], r => r.Key, m => m.Item1,
            m => new Row(m.Item1, m.Item2), (r, m) => r.Value = m.Item2);
        Assert.False(inPlace);
        Assert.Equal(["b", "c"], list.Select(r => r.Key));
        Assert.Same(b, list[0]);
        Assert.Equal(5, b.Value);
        Assert.Equal(6, list[1].Value);
    }
}

public class DesktopSettingsStoreTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "cubitos-desktop-settings-" + Guid.NewGuid().ToString("N"));

    private string File => Path.Combine(_dir, "nested", "settings.json");

    public void Dispose()
    {
        try { Directory.Delete(_dir, recursive: true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
    }

    [Fact]
    public void Missing_file_gives_defaults()
    {
        var settings = new DesktopSettingsStore(File).Load();
        Assert.Null(settings.Theme);
        Assert.False(settings.NotchPinned);
    }

    [Fact]
    public void Saves_and_loads_round_trip_creating_the_folder()
    {
        var store = new DesktopSettingsStore(File);
        Assert.True(store.Save(new DesktopSettings("halloween", NotchPinned: true)));
        var loaded = store.Load();
        Assert.Equal("halloween", loaded.Theme);
        Assert.True(loaded.NotchPinned);
    }

    [Fact]
    public void Corrupt_file_gives_defaults_instead_of_throwing()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(File)!);
        System.IO.File.WriteAllText(File, "{ not json");
        var settings = new DesktopSettingsStore(File).Load();
        Assert.Equal(new DesktopSettings(), settings);
    }
}

public class SectionsTests
{
    [Theory]
    [InlineData("ranking", "ranking")]
    [InlineData("HEATMAP", "heatmap")]
    [InlineData("firstday", "firstday")]
    [InlineData("queue", "queue")]
    [InlineData("nope", null)]
    [InlineData(null, null)]
    public void Normalizes_known_ids(string? input, string? expected) => Assert.Equal(expected, Sections.Normalize(input));

    [Fact]
    public void Lists_sections_in_navigation_order() =>
        Assert.Equal(["ranking", "heatmap", "firstday", "queue"], Sections.All);
}
