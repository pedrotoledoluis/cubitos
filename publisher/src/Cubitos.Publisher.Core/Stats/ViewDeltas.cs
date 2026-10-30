namespace Cubitos.Publisher.Core.Stats;

/// <summary>A share of views earned uniformly between two instants.</summary>
internal readonly record struct ViewSpan(DateTimeOffset From, DateTimeOffset To, double Views)
{
    /// <summary>Views that fall inside [start, end), assuming a constant rate over the span.</summary>
    public double ViewsWithin(DateTimeOffset start, DateTimeOffset end)
    {
        if (To <= From) return From >= start && From < end ? Views : 0;
        var overlap = (Min(To, end) - Max(From, start)).Ticks;
        return overlap <= 0 ? 0 : Views * overlap / (To - From).Ticks;
    }

    /// <summary>Splits the span at hourly boundaries aligned to <paramref name="anchor"/>.</summary>
    public IEnumerable<(DateTimeOffset BucketStart, double Views)> SplitHourly(DateTimeOffset anchor)
    {
        var hour = TimeSpan.FromHours(1);
        var bucket = anchor + hour * Math.Floor((From - anchor) / hour);
        if (To <= From)
        {
            yield return (bucket, Views);
            yield break;
        }
        for (; bucket < To; bucket += hour)
        {
            var share = ViewsWithin(bucket, bucket + hour);
            if (share > 0) yield return (bucket, share);
        }
    }

    private static DateTimeOffset Min(DateTimeOffset a, DateTimeOffset b) => a < b ? a : b;
    private static DateTimeOffset Max(DateTimeOffset a, DateTimeOffset b) => a > b ? a : b;
}

internal static class ViewDeltas
{
    /// <summary>Consecutive positive view deltas per video, in time order.</summary>
    public static IEnumerable<(string VideoId, ViewSpan Span)> Spans(IEnumerable<VideoSnapshot> snapshots)
    {
        foreach (var video in snapshots.GroupBy(s => s.VideoId))
        {
            VideoSnapshot? previous = null;
            foreach (var snap in video.OrderBy(s => s.TakenAt))
            {
                if (previous is not null && snap.Views > previous.Views)
                    yield return (video.Key, new ViewSpan(previous.TakenAt, snap.TakenAt, snap.Views - previous.Views));
                previous = snap;
            }
        }
    }
}
