using Cubitos.Publisher.Core.Queue;

namespace Cubitos.Publisher.Core.Tests;

public class ReplacementPolicyTests
{
    [Theory]
    [InlineData(99, 100, ReplacementDecision.Replace)]
    [InlineData(100, 100, ReplacementDecision.Keep)]
    [InlineData(101, 100, ReplacementDecision.Keep)]
    public void Keeps_when_views_reach_threshold(long views, int threshold, ReplacementDecision expected) =>
        Assert.Equal(expected, ReplacementPolicy.Decide(views, threshold));

    [Fact]
    public void Null_threshold_always_replaces() =>
        Assert.Equal(ReplacementDecision.Replace, ReplacementPolicy.Decide(1_000_000, null));
}

public class UploadLimitBackoffTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 18, 0, 0, TimeSpan.Zero);

    [Fact]
    public void No_known_uploads_waits_one_hour() =>
        Assert.Equal(Now.AddHours(1), UploadLimitBackoff.ComputeRetryAt(Now, []));

    [Fact]
    public void Retries_when_earliest_upload_in_window_expires_plus_margin()
    {
        var uploads = new[] { Now.AddHours(-2), Now.AddHours(-10), Now.AddHours(-30) };
        // -30 h is outside the rolling window; the earliest inside is -10 h.
        var expected = Now.AddHours(-10).AddHours(24).AddMinutes(5);
        Assert.Equal(expected, UploadLimitBackoff.ComputeRetryAt(Now, uploads));
    }

    [Fact]
    public void Uploads_all_outside_window_fall_back_to_one_hour() =>
        Assert.Equal(Now.AddHours(1), UploadLimitBackoff.ComputeRetryAt(Now, [Now.AddHours(-25)]));
}

public class TransientRetryPolicyTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 18, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(1, 2)]
    [InlineData(2, 4)]
    [InlineData(3, 8)]
    [InlineData(5, 32)]
    [InlineData(6, 60)]
    [InlineData(20, 60)]
    public void Delay_doubles_and_caps_at_sixty_minutes(int attempts, int minutes) =>
        Assert.Equal(TimeSpan.FromMinutes(minutes), TransientRetryPolicy.DelayFor(attempts));

    [Fact]
    public void Retries_before_max_attempts()
    {
        var decision = TransientRetryPolicy.Next(5, Now);
        Assert.False(decision.GiveUp);
        Assert.Equal(Now.AddMinutes(32), decision.RetryAt);
    }

    [Fact]
    public void Gives_up_at_max_attempts()
    {
        var decision = TransientRetryPolicy.Next(TransientRetryPolicy.MaxAttempts, Now);
        Assert.True(decision.GiveUp);
        Assert.Null(decision.RetryAt);
    }
}
