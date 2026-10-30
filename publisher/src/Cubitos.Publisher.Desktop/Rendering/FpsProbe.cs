using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;
using Cubitos.Publisher.Dashboard.Core.Presentation;
using Cubitos.Publisher.Desktop.Notch;

namespace Cubitos.Publisher.Desktop.Rendering;

/// <summary>
/// Hidden smoothness check (<c>--fps-log=&lt;path&gt;</c>): after a 1 s warm-up it records the real interval between
/// rendered frames for 10 s. The notch is hovered open, pinned, unpinned and left to collapse throughout; after 4 s the
/// window size also swings continuously between 1100x720 and 1640x900 (one resize per frame, as a pointer drag does). Writes a summary line plus every frame time, then exits.
/// </summary>
public static class FpsProbe
{
    private static readonly TimeSpan Warmup = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan Duration = TimeSpan.FromSeconds(10);
    private const double ResizeFrom = 4;

    public static async Task RunAsync(Window window, INavigationNotch notch, string path)
    {
        window.WindowState = WindowState.Normal;
        window.Left = 0;
        window.Top = 0;
        await Task.Delay(Warmup);

        var hwnd = new WindowInteropHelper(window).Handle;
        var frames = new List<double>(2000);
        var still = new List<double>(1000);
        var resizing = new List<double>(1000);
        var start = FrameClock.Now;
        var step = -1;
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
                (t < ResizeFrom ? still : resizing).Add(ms);
            }

            // First half: notch only. Second half: continuous live resize, one full swing every 2 s.
            if (t >= ResizeFrom)
            {
                var f = 0.5 - 0.5 * Math.Cos((t - ResizeFrom) * Math.PI);
                // One SetWindowPos per frame, like a pointer drag (setting Width and Height separately resizes twice).
                var dpi = VisualTreeHelper.GetDpi(window);
                SetWindowPos(hwnd, IntPtr.Zero, 0, 0,
                    (int)Math.Round((1100 + 540 * f) * dpi.DpiScaleX), (int)Math.Round((720 + 180 * f) * dpi.DpiScaleY),
                    SwpNoMove | SwpNoZOrder | SwpNoActivate);
            }

            // Notch script, one action every 1.25 s: hover in, pin, unpin, hover out (collapses after 400 ms).
            var s = (int)(t / 1.25);
            if (s == step) return;
            step = s;
            switch (s % 4)
            {
                case 0: notch.SimulateHover(true); break;
                case 1: notch.TogglePin(); break;
                case 2: notch.TogglePin(); break;
                case 3: notch.SimulateHover(false); break;
            }
        }

        FrameClock.FrameRendered += OnFrame;
        FrameClock.EnsureRunning();
        await done.Task;
        FrameClock.FrameRendered -= OnFrame;

        var stats = FrameTimeStats.From(frames);
        var lines = new List<string>
        {
            "all: " + stats.Summary(),
            "notch_only: " + FrameTimeStats.From(still).Summary(),
            "resize_and_notch: " + FrameTimeStats.From(resizing).Summary(),
            "frame_ms:",
        };
        lines.AddRange(frames.Select(ms => ms.ToString("0.00", CultureInfo.InvariantCulture)));
        await File.WriteAllLinesAsync(path, lines);
        Application.Current.Shutdown();
    }

    private const uint SwpNoMove = 0x0002;
    private const uint SwpNoZOrder = 0x0004;
    private const uint SwpNoActivate = 0x0010;

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetWindowPos(IntPtr hwnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);
}
