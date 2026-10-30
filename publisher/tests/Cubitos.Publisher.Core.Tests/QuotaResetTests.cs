using Cubitos.Publisher.Core.Queue;

namespace Cubitos.Publisher.Core.Tests;

public class QuotaResetTests
{
    [Fact]
    public void Retries_five_minutes_after_next_pacific_midnight_in_daylight_time()
    {
        // 2026-10-30 is PDT (UTC-7): next midnight PT is 2026-10-31 07:00Z.
        var now = new DateTimeOffset(2026, 10, 30, 12, 0, 0, TimeSpan.Zero);
        Assert.Equal(new DateTimeOffset(2026, 10, 31, 7, 5, 0, TimeSpan.Zero), QuotaReset.NextRetryAt(now));
    }

    [Fact]
    public void Retries_five_minutes_after_next_pacific_midnight_in_standard_time()
    {
        // 2026-12-01 is PST (UTC-8): 2026-12-01 10:00Z is 02:00 PT, next midnight is 2026-12-02 08:00Z.
        var now = new DateTimeOffset(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);
        Assert.Equal(new DateTimeOffset(2026, 12, 2, 8, 5, 0, TimeSpan.Zero), QuotaReset.NextRetryAt(now));
    }

    [Fact]
    public void Inside_the_margin_after_midnight_retries_the_same_day()
    {
        var now = new DateTimeOffset(2026, 10, 31, 7, 1, 0, TimeSpan.Zero);
        Assert.Equal(new DateTimeOffset(2026, 10, 31, 7, 5, 0, TimeSpan.Zero), QuotaReset.NextRetryAt(now));
    }

    [Fact]
    public void After_the_margin_waits_for_the_following_midnight()
    {
        var now = new DateTimeOffset(2026, 10, 31, 7, 10, 0, TimeSpan.Zero);
        Assert.Equal(new DateTimeOffset(2026, 11, 1, 7, 5, 0, TimeSpan.Zero), QuotaReset.NextRetryAt(now));
    }
}
