using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Dashboard.Core.Configuration;
using Cubitos.Publisher.Dashboard.Core.Formatting;

namespace Cubitos.Publisher.Dashboard.Tests;

public class FormattingTests
{
    private static readonly DateTimeOffset Noon = new(2026, 10, 30, 17, 5, 0, TimeSpan.Zero); // Fri 12:05 Peru

    [Fact]
    public void Clock_and_day_time_are_shown_in_peru_time()
    {
        Assert.Equal("12:05", PeruFormat.Clock(Noon));
        Assert.Equal("vie 30 oct · 12:05", PeruFormat.DayTime(Noon));
        Assert.Equal("sáb 31 oct · 00:30", PeruFormat.DayTime(new DateTimeOffset(2026, 11, 1, 5, 30, 0, TimeSpan.Zero).AddDays(-1)));
    }

    [Theory]
    [InlineData(9, "09:00 – 10:00")]
    [InlineData(23, "23:00 – 00:00")]
    public void Hour_range_wraps_at_midnight(int hour, string expected) =>
        Assert.Equal(expected, PeruFormat.HourRange(hour));

    [Theory]
    [InlineData(-5, "ahora")]
    [InlineData(0, "ahora")]
    [InlineData(42, "en 42 min")]
    [InlineData(185, "en 3 h 05 min")]
    [InlineData(3 * 24 * 60 + 4 * 60 + 59, "en 3 d 4 h")]
    public void Countdown_picks_a_readable_unit(int minutes, string expected) =>
        Assert.Equal(expected, Countdown.Format(TimeSpan.FromMinutes(minutes)));

    [Fact]
    public void Countdown_rounds_partial_minutes_up()
    {
        Assert.Equal("en 1 min", Countdown.Format(TimeSpan.FromSeconds(20)));
    }

    [Theory]
    [InlineData(0, "0")]
    [InlineData(999, "999")]
    [InlineData(12345, "12,345")]
    [InlineData(1234567.6, "1,234,568")]
    public void Views_use_thousands_separators(double views, string expected) =>
        Assert.Equal(expected, NumberFormat.Views(views));

    [Theory]
    [InlineData(0, "0")]
    [InlineData(0.4, "0")]
    [InlineData(12.6, "+13")]
    [InlineData(1500, "+1,500")]
    public void Deltas_show_a_plus_sign_when_positive(double views, string expected) =>
        Assert.Equal(expected, NumberFormat.Delta(views));

    [Fact]
    public void Every_status_has_a_spanish_label()
    {
        foreach (var status in Enum.GetValues<QueueStatus>())
            Assert.False(string.IsNullOrWhiteSpace(StatusText.Label(status)));
        Assert.Equal("Esperando cuota", StatusText.Label(QueueStatus.WaitingForQuota));
        Assert.Equal("Programado", StatusText.Label(QueueStatus.Scheduled));
    }
}

public class DatabasePathResolverTests
{
    private const string Fallback = @"D:\fallback\publisher.db";

    private static string Resolve(string[] args, string? env = null, string? json = null) =>
        DatabasePathResolver.Resolve(args, name => name == "Publisher__DatabasePath" ? env : null, json, Fallback);

    [Fact]
    public void Command_line_wins_in_both_spellings()
    {
        Assert.Equal(@"C:\a.db", Resolve(["--db", @"C:\a.db"], env: @"C:\env.db"));
        Assert.Equal(@"C:\b.db", Resolve([@"--db=C:\b.db"]));
        Assert.Equal(@"C:\c.db", Resolve([@"--Publisher:DatabasePath=C:\c.db"]));
    }

    [Fact]
    public void Environment_then_appsettings_then_fallback()
    {
        const string json = """{ "Publisher": { "DatabasePath": "C:\\json.db" } }""";
        Assert.Equal(@"C:\env.db", Resolve([], env: @"C:\env.db", json: json));
        Assert.Equal(@"C:\json.db", Resolve([], json: json));
        Assert.Equal(Fallback, Resolve([], json: """{ "Publisher": { "DatabasePath": "" } }"""));
        Assert.Equal(Fallback, Resolve([], json: "not json"));
        Assert.Equal(Fallback, Resolve([]));
    }
}
