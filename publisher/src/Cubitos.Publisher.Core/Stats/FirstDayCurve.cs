namespace Cubitos.Publisher.Core.Stats;

public static class FirstDayCurve
{
    public const int Hours = 24;

    /// <summary>
    /// Views per hour since publish for the first 24 h of one video. The video is assumed to have
    /// zero views at <paramref name="publishedAt"/>.
    /// </summary>
    public static IReadOnlyList<double> Compute(DateTimeOffset publishedAt, IEnumerable<VideoSnapshot> snapshots)
    {
        var curve = new double[Hours];
        var baseline = new VideoSnapshot("", "", publishedAt, 0, 0, 0);
        var series = snapshots.Where(s => s.TakenAt > publishedAt).Select(s => s with { VideoId = "" }).Prepend(baseline);
        foreach (var (_, span) in ViewDeltas.Spans(series))
        {
            for (var h = 0; h < Hours; h++)
                curve[h] += span.ViewsWithin(publishedAt.AddHours(h), publishedAt.AddHours(h + 1));
        }
        return curve;
    }
}
