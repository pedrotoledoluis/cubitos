using System.Diagnostics;
using System.Windows.Media;

namespace Cubitos.Publisher.Desktop.Rendering;

/// <summary>Something advanced once per rendered frame.</summary>
public interface IFrameListener
{
    /// <param name="now">Time since the clock started (monotonic).</param>
    /// <param name="dt">Real seconds since the previous frame, clamped to 0.1 s so a stall never makes things jump.</param>
    void OnFrame(TimeSpan now, double dt);
}

/// <summary>
/// The app's only animation driver. It hooks <see cref="CompositionTarget.Rendering"/> (vsync-aligned, once per frame
/// the compositor renders), measures the real elapsed time with a <see cref="Stopwatch"/> and hands it to every
/// listener, so motion depends on time and never on the frame rate. While paused (window minimized or the session
/// locked) the event is unhooked, which also lets WPF's render thread idle.
/// </summary>
public static class FrameClock
{
    private static readonly Stopwatch Clock = Stopwatch.StartNew();
    private static readonly List<IFrameListener> Listeners = [];
    private static readonly List<IFrameListener> Snapshot = [];
    private static TimeSpan _lastRenderingTime = TimeSpan.MinValue;
    private static TimeSpan _last;
    private static bool _hooked;
    private static bool _paused;

    public static TimeSpan Now => Clock.Elapsed;

    /// <summary>Raised after the listeners with the real frame interval in milliseconds (used by the fps log).</summary>
    public static event Action<double>? FrameRendered;

    public static void Add(IFrameListener listener)
    {
        if (!Listeners.Contains(listener)) Listeners.Add(listener);
        Update();
    }

    public static void Remove(IFrameListener listener)
    {
        Listeners.Remove(listener);
        Update();
    }

    public static bool IsPaused
    {
        get => _paused;
        set
        {
            if (_paused == value) return;
            _paused = value;
            Update();
        }
    }

    private static void Update()
    {
        var want = !_paused && (Listeners.Count > 0 || FrameRendered is not null);
        if (want == _hooked) return;
        _hooked = want;
        if (want)
        {
            _last = Clock.Elapsed;
            CompositionTarget.Rendering += OnRendering;
        }
        else
        {
            CompositionTarget.Rendering -= OnRendering;
        }
    }

    /// <summary>Keeps the clock running for the fps log even when nothing else animates.</summary>
    public static void EnsureRunning() => Update();

    private static void OnRendering(object? sender, EventArgs e)
    {
        // Rendering can fire more than once per frame; only the first call for a new frame time counts.
        if (e is RenderingEventArgs r)
        {
            if (r.RenderingTime == _lastRenderingTime) return;
            _lastRenderingTime = r.RenderingTime;
        }

        var now = Clock.Elapsed;
        var realDt = (now - _last).TotalSeconds;
        _last = now;
        var dt = Math.Clamp(realDt, 0, 0.1);

        Snapshot.Clear();
        Snapshot.AddRange(Listeners);
        foreach (var listener in Snapshot) listener.OnFrame(now, dt);
        FrameRendered?.Invoke(realDt * 1000);
    }
}
