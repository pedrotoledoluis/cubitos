namespace Cubitos.Publisher.Core.Queue;

/// <summary>The YouTube Data API daily quota resets at midnight Pacific Time.</summary>
public static class QuotaReset
{
    public static readonly TimeSpan Margin = TimeSpan.FromMinutes(5);

    private static readonly TimeZoneInfo Pacific =
        TimeZoneInfo.TryFindSystemTimeZoneById("America/Los_Angeles", out var tz) ? tz
            : TimeZoneInfo.FindSystemTimeZoneById("Pacific Standard Time");

    /// <summary>The first "Pacific midnight + margin" strictly after <paramref name="now"/>.</summary>
    public static DateTimeOffset NextRetryAt(DateTimeOffset now)
    {
        var local = TimeZoneInfo.ConvertTime(now, Pacific);
        for (var day = local.Date; ; day = day.AddDays(1))
        {
            var midnight = new DateTimeOffset(day, Pacific.GetUtcOffset(day));
            if (midnight + Margin > now) return (midnight + Margin).ToUniversalTime();
        }
    }
}
