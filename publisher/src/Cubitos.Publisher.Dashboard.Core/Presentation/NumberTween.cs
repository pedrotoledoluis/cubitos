namespace Cubitos.Publisher.Dashboard.Core.Presentation;

/// <summary>
/// Count-up animation of a displayed number with an ease-out curve. Time is passed in (seconds on any monotonic clock),
/// so the UI drives it from its frame clock and tests drive it directly.
/// </summary>
public sealed class NumberTween(TimeSpan duration)
{
    private readonly double _duration = Math.Max(1e-6, duration.TotalSeconds);
    private double _start;
    private double _from;
    private double _to;

    public double Target => _to;

    /// <summary>Starts a new animation at <paramref name="now"/> from <paramref name="from"/> to <paramref name="to"/>.</summary>
    public void Retarget(double now, double from, double to)
    {
        _start = now;
        _to = to;
        // Nothing sensible to animate from (first value, NaN, infinities): jump straight to the target.
        _from = double.IsFinite(from) && double.IsFinite(to) ? from : to;
    }

    public bool IsRunning(double now) => _from != _to && now - _start < _duration;

    public double Value(double now)
    {
        var t = Math.Clamp((now - _start) / _duration, 0, 1);
        if (t >= 1) return _to;
        var eased = 1 - Math.Pow(1 - t, 3);
        return _from + (_to - _from) * eased;
    }
}
