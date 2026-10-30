namespace Cubitos.Publisher.Dashboard.Core.Navigation;

public enum NotchState
{
    /// <summary>Only the pumpkin notch on the screen's left edge is visible; the dashboard panel is hidden.</summary>
    Collapsed,
    /// <summary>The panel was opened by hovering the notch and collapses after the pointer leaves both windows.</summary>
    Expanded,
    /// <summary>The panel stays open as a normal window, without hover.</summary>
    Pinned,
}

/// <summary>
/// Hover/pin behaviour of the app-level notch: the notch tab and the dashboard panel are two windows that count as
/// one hover area, an open popup or a button held since a press inside (resize, drag) holds the panel open, and the
/// open progress is a fixed-duration tween (ease-out cubic, played in reverse when closing). Time is passed in so the
/// rules are testable; the UI calls <see cref="Track"/> and <see cref="Advance"/> once per frame.
/// </summary>
public sealed class NotchStateMachine
{
    public static readonly TimeSpan CollapseDelay = TimeSpan.FromMilliseconds(500);
    public static readonly TimeSpan OpenDuration = TimeSpan.FromMilliseconds(220);
    public static readonly TimeSpan CloseDuration = TimeSpan.FromMilliseconds(200);

    /// <summary>Below this progress the closing panel is too small to count as a hover target.</summary>
    private const double PanelHoverThreshold = 0.05;

    // Set by a real pointer enter; forced states never collapse from exits they did not see.
    private bool _armed;
    private bool _wasButtonDown;
    private bool _pressStartedInside;

    public NotchStateMachine(bool pinned = false)
    {
        State = pinned ? NotchState.Pinned : NotchState.Collapsed;
        Progress = pinned ? 1 : 0;
    }

    public NotchState State { get; private set; }
    public bool IsOpen => State != NotchState.Collapsed;
    public bool IsPinned => State == NotchState.Pinned;
    public bool IsPointerInside { get; private set; }

    /// <summary>True while a popup or a press that started inside keeps the panel from collapsing.</summary>
    public bool IsHeld { get; private set; }

    /// <summary>When a pending hover-out collapse fires, or null.</summary>
    public TimeSpan? CollapseAt { get; private set; }

    /// <summary>Linear time progress of the open/close tween in [0, 1].</summary>
    public double Progress { get; private set; }

    /// <summary>Eased opening in [0, 1] (no overshoot, so a panel slid by it never leaves the screen edge).</summary>
    public double Open => EaseOutCubic(Progress);

    public bool IsAnimating => Progress != Target;

    private double Target => IsOpen ? 1 : 0;

    /// <summary>Returns true when the hover opened the panel.</summary>
    public bool PointerEntered(TimeSpan now)
    {
        IsPointerInside = true;
        _armed = true;
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
        if (wasInside && _armed && State == NotchState.Expanded && !IsHeld) CollapseAt = now + CollapseDelay;
    }

    /// <summary>
    /// Per-frame pointer input across both windows. <paramref name="overPanel"/> only counts while the panel is visibly
    /// open, so the hidden panel area never opens anything. Returns true when this call opened the panel.
    /// </summary>
    public bool Track(TimeSpan now, bool overNotch, bool overPanel, bool popupOpen, bool buttonDown)
    {
        var inside = overNotch || (overPanel && Progress > PanelHoverThreshold);
        if (buttonDown && !_wasButtonDown) _pressStartedInside = inside;
        _wasButtonDown = buttonDown;

        var held = popupOpen || (buttonDown && _pressStartedInside);
        var released = IsHeld && !held;
        IsHeld = held;

        var opened = false;
        if (inside && !IsPointerInside) opened = PointerEntered(now);
        else if (!inside && IsPointerInside) PointerExited(now);

        if (held) CollapseAt = null;
        else if (released && !inside && _armed && State == NotchState.Expanded) CollapseAt = now + CollapseDelay;
        return opened;
    }

    public void TogglePin(TimeSpan now)
    {
        if (State == NotchState.Pinned)
        {
            State = NotchState.Expanded;
            _armed = true;
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
        _armed = false;
        Progress = Target;
    }

    /// <summary>Fires a due collapse and steps the tween. Returns true when the state changed.</summary>
    public bool Advance(TimeSpan now, double seconds)
    {
        var changed = false;
        if (CollapseAt is { } due && now >= due)
        {
            CollapseAt = null;
            if (State == NotchState.Expanded && !IsHeld)
            {
                State = NotchState.Collapsed;
                changed = true;
            }
        }

        if (double.IsNaN(seconds) || seconds <= 0 || Progress == Target) return changed;
        var dt = Math.Min(seconds, 0.25);
        Progress = Target > Progress
            ? Math.Min(1, Progress + dt / OpenDuration.TotalSeconds)
            : Math.Max(0, Progress - dt / CloseDuration.TotalSeconds);
        return changed;
    }

    /// <summary>Reveal of the entry at <paramref name="index"/> for an opening value; later entries start later.</summary>
    public static double Stagger(double open, int index)
    {
        const double delay = 0.12, span = 0.5;
        return Math.Clamp((open - index * delay) / span, 0, 1);
    }

    public static double EaseOutCubic(double t)
    {
        t = Math.Clamp(t, 0, 1);
        var u = 1 - t;
        return 1 - u * u * u;
    }
}
