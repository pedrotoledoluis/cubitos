namespace Cubitos.Publisher.Dashboard.Core.Navigation;

public enum NotchState
{
    /// <summary>Only the small notch tab is visible on the left edge.</summary>
    Collapsed,
    /// <summary>Opened by hover; overlays the content and collapses after the pointer leaves.</summary>
    Expanded,
    /// <summary>Stays open and pushes the content to the right.</summary>
    Pinned,
}

/// <summary>
/// Hover/pin behaviour of the left-edge navigation notch plus the spring that animates it. Time is passed in so the
/// rules are testable; the UI calls <see cref="Advance"/> from its single animation timer.
/// </summary>
public sealed class NotchStateMachine
{
    public static readonly TimeSpan CollapseDelay = TimeSpan.FromMilliseconds(400);

    // Slightly under-damped spring: reaches ~95% in about 300 ms with a small overshoot.
    private const double Omega = 2 * Math.PI / 0.42;
    private const double Damping = 0.72;
    private const double MaxStep = 1.0 / 120;

    private double _openVelocity;
    private double _pinVelocity;

    public NotchStateMachine(bool pinned = false)
    {
        State = pinned ? NotchState.Pinned : NotchState.Collapsed;
        Open = pinned ? 1 : 0;
        Pin = pinned ? 1 : 0;
    }

    public NotchState State { get; private set; }
    public bool IsOpen => State != NotchState.Collapsed;
    public bool IsPinned => State == NotchState.Pinned;
    public bool IsPointerInside { get; private set; }

    /// <summary>When a pending hover-out collapse fires, or null.</summary>
    public TimeSpan? CollapseAt { get; private set; }

    /// <summary>Spring value of the panel opening: 0 collapsed, 1 open (may overshoot slightly).</summary>
    public double Open { get; private set; }

    /// <summary>Spring value of the content shift: 0 overlay, 1 pinned beside the content.</summary>
    public double Pin { get; private set; }

    public bool IsAnimating => _openVelocity != 0 || _pinVelocity != 0 || Open != OpenTarget || Pin != PinTarget;

    private double OpenTarget => IsOpen ? 1 : 0;
    private double PinTarget => IsPinned ? 1 : 0;

    /// <summary>Returns true when the hover opened the panel.</summary>
    public bool PointerEntered(TimeSpan now)
    {
        IsPointerInside = true;
        CollapseAt = null;
        if (State != NotchState.Collapsed) return false;
        State = NotchState.Expanded;
        return true;
    }

    /// <summary>Schedules the collapse; an exit without a matching enter (e.g. after a forced state) is ignored.</summary>
    public void PointerExited(TimeSpan now)
    {
        var wasInside = IsPointerInside;
        IsPointerInside = false;
        if (wasInside && State == NotchState.Expanded) CollapseAt = now + CollapseDelay;
    }

    public void TogglePin(TimeSpan now)
    {
        if (State == NotchState.Pinned)
        {
            State = NotchState.Expanded;
            if (!IsPointerInside) CollapseAt = now + CollapseDelay;
        }
        else
        {
            State = NotchState.Pinned;
            CollapseAt = null;
        }
    }

    /// <summary>Jumps to a state without animation (smoke tests, restoring the remembered pin).</summary>
    public void Force(NotchState state)
    {
        State = state;
        CollapseAt = null;
        Open = OpenTarget;
        Pin = PinTarget;
        _openVelocity = _pinVelocity = 0;
    }

    /// <summary>Fires a due collapse and steps both springs. Returns true when the state changed.</summary>
    public bool Advance(TimeSpan now, double seconds)
    {
        var changed = false;
        if (CollapseAt is { } due && now >= due)
        {
            CollapseAt = null;
            if (State == NotchState.Expanded)
            {
                State = NotchState.Collapsed;
                changed = true;
            }
        }

        var remaining = Math.Clamp(seconds, 0, 0.25);
        while (remaining > 0)
        {
            var dt = Math.Min(remaining, MaxStep);
            Open = Spring(Open, ref _openVelocity, OpenTarget, dt);
            Pin = Spring(Pin, ref _pinVelocity, PinTarget, dt);
            remaining -= dt;
        }
        return changed;
    }

    /// <summary>Reveal of the entry at <paramref name="index"/> for an opening value; later entries start later.</summary>
    public static double Stagger(double open, int index)
    {
        const double delay = 0.12, span = 0.5;
        return Math.Clamp((open - index * delay) / span, 0, 1);
    }

    private static double Spring(double value, ref double velocity, double target, double dt)
    {
        var accel = Omega * Omega * (target - value) - 2 * Damping * Omega * velocity;
        velocity += accel * dt;
        value += velocity * dt;
        if (Math.Abs(target - value) < 0.0005 && Math.Abs(velocity) < 0.005)
        {
            velocity = 0;
            return target;
        }
        return value;
    }
}
