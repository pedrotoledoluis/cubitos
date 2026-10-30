namespace Cubitos.Publisher.Core.Queue;

/// <summary>When YouTube's daily upload limit is hit, wait until the oldest upload leaves the rolling 24 h window.</summary>
public static class UploadLimitBackoff
{
    public static readonly TimeSpan Window = TimeSpan.FromHours(24);
    public static readonly TimeSpan Margin = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan UnknownWait = TimeSpan.FromHours(1);

    public static DateTimeOffset ComputeRetryAt(DateTimeOffset now, IEnumerable<DateTimeOffset> recentUploads)
    {
        var inWindow = recentUploads.Where(u => u > now - Window && u <= now).ToList();
        return inWindow.Count == 0 ? now + UnknownWait : inWindow.Min() + Window + Margin;
    }
}
