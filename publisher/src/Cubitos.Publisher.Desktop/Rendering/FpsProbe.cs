using System.Globalization;
using System.IO;
using System.Windows;
using Cubitos.Publisher.Dashboard.Core.Navigation;
using Cubitos.Publisher.Dashboard.Core.Presentation;
using Cubitos.Publisher.Desktop.Notch;

namespace Cubitos.Publisher.Desktop.Rendering;

/// <summary>
/// Hidden smoothness check (<c>--fps-log=&lt;path&gt;</c>): after the first data load and a 1 s warm-up it records the
/// real interval between rendered frames for 10 s while a simulated pointer hovers the notch for 0.9 s every 2 s (the
/// panel slides out, stays, then collapses after the hover-out delay). It also measures each open time: from the hover
/// to the first frame with the panel fully open. Writes summary lines plus every frame time, then exits.
/// </summary>
public static class FpsProbe
{
    private static readonly TimeSpan Warmup = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan Duration = TimeSpan.FromSeconds(10);
    private const double CycleSeconds = 2.0;
    private const double HoverSeconds = 0.9;

    public static async Task RunAsync(NotchController notch, Task firstRefresh, string path)
    {
        await firstRefresh;
        await Task.Delay(Warmup);

        var frames = new List<double>(2000);
        var animating = new List<double>(1000);
        var openTimes = new List<double>();
        var start = FrameClock.Now;
        double? hoverAt = null;
        var hovering = false;
        var done = new TaskCompletionSource();

        void OnFrame(double ms)
        {
            var t = (FrameClock.Now - start).TotalSeconds;
            if (t >= Duration.TotalSeconds)
            {
                done.TrySetResult();
                return;
            }
            if (frames.Count > 0 || t > 0.05)
            {
                frames.Add(ms);
                if (notch.Progress is > 0 and < 1) animating.Add(ms);
            }

            if (hoverAt is { } h && notch.Progress >= 1)
            {
                openTimes.Add((t - h) * 1000);
                hoverAt = null;
            }

            var inside = t % CycleSeconds < HoverSeconds;
            if (inside == hovering) return;
            hovering = inside;
            notch.SimulateHover(inside);
            if (inside && notch.State == NotchState.Collapsed) hoverAt = t;
        }

        FrameClock.FrameRendered += OnFrame;
        FrameClock.EnsureRunning();
        await done.Task;
        FrameClock.FrameRendered -= OnFrame;
        notch.SimulateHover(null);

        var lines = new List<string>
        {
            "all: " + FrameTimeStats.From(frames).Summary(),
            "while_animating: " + FrameTimeStats.From(animating).Summary(),
            string.Create(CultureInfo.InvariantCulture,
                $"open_ms: count={openTimes.Count} avg={(openTimes.Count > 0 ? openTimes.Average() : 0):0.0} max={(openTimes.Count > 0 ? openTimes.Max() : 0):0.0} target={NotchStateMachine.OpenDuration.TotalMilliseconds:0}"),
            "frame_ms:",
        };
        lines.AddRange(frames.Select(ms => ms.ToString("0.00", CultureInfo.InvariantCulture)));
        await File.WriteAllLinesAsync(path, lines);
        Application.Current.Shutdown();
    }
}
