using System.Globalization;

namespace Cubitos.Publisher.Dashboard.Core.Presentation;

/// <summary>Summary of measured frame times (milliseconds between rendered frames) for the smoothness log.</summary>
public sealed record FrameTimeStats(int Frames, double AverageFps, double AverageMs, double WorstMs, double P95Ms, int SlowFrames)
{
    /// <summary>A frame slower than this missed at least two vsyncs on a 60 Hz display.</summary>
    public const double SlowFrameMs = 33.4;

    public static FrameTimeStats From(IReadOnlyCollection<double> frameMs)
    {
        if (frameMs.Count == 0) return new FrameTimeStats(0, 0, 0, 0, 0, 0);
        var sorted = frameMs.OrderBy(x => x).ToArray();
        var total = sorted.Sum();
        var p95 = sorted[Math.Clamp((int)Math.Ceiling(sorted.Length * 0.95) - 1, 0, sorted.Length - 1)];
        return new FrameTimeStats(
            sorted.Length,
            total > 0 ? 1000 * sorted.Length / total : 0,
            total / sorted.Length,
            sorted[^1],
            p95,
            sorted.Count(x => x > SlowFrameMs));
    }

    public string Summary() => string.Create(CultureInfo.InvariantCulture,
        $"frames={Frames} avg_fps={AverageFps:0.0} avg_ms={AverageMs:0.00} worst_ms={WorstMs:0.0} p95_ms={P95Ms:0.0} slow_frames={SlowFrames}");
}
