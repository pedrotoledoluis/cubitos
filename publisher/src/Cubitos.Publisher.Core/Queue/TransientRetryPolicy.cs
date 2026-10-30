namespace Cubitos.Publisher.Core.Queue;

public sealed record RetryDecision(bool GiveUp, DateTimeOffset? RetryAt);

/// <summary>Exponential backoff for transient upload errors: 2, 4, 8... minutes, capped at 60.</summary>
public static class TransientRetryPolicy
{
    public const int MaxAttempts = 6;
    public static readonly TimeSpan Cap = TimeSpan.FromMinutes(60);

    public static TimeSpan DelayFor(int attempts)
    {
        var minutes = Math.Pow(2, Math.Clamp(attempts, 1, 30));
        return TimeSpan.FromMinutes(Math.Min(minutes, Cap.TotalMinutes));
    }

    /// <param name="attempts">Attempts made so far, including the one that just failed.</param>
    public static RetryDecision Next(int attempts, DateTimeOffset now) =>
        attempts >= MaxAttempts ? new(true, null) : new(false, now + DelayFor(attempts));
}
