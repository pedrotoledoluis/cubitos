using System.Diagnostics;
using Cubitos.Publisher.Dashboard.Core.Navigation;
using Cubitos.Publisher.Dashboard.Drawing;

namespace Cubitos.Publisher.Dashboard.Controls;

/// <summary>
/// Left-edge notch with the flaming pumpkin. Hover opens it into the navigation panel, leaving closes it after
/// <see cref="NotchStateMachine.CollapseDelay"/>, the pin keeps it open beside the content. It has no timer of its
/// own: the page calls <see cref="Step"/> from its single animation timer.
/// </summary>
public partial class NotchPanel : Grid
{
    public const string PinPreferenceKey = "dashboard.notch.pinned";

    /// <summary>Content offset from the window's left edge while the notch is collapsed or overlaid.</summary>
    public const double CollapsedInset = NotchDrawable.CollapsedWidth + 12;

    /// <summary>Content offset while the panel is pinned beside it.</summary>
    public const double PinnedInset = NotchDrawable.PanelWidth + 14;

    private const double SlideDistance = 28;

    private readonly NotchDrawable _shape = new();
    private readonly PinDrawable _pin = new();
    private readonly Stopwatch _clock = Stopwatch.StartNew();
    private readonly NotchStateMachine _machine;
    private readonly View[] _staggered;
    private bool _remember = true;
    private bool? _wide;
    private bool? _interactive;
    private bool? _pinDrawn;
    private double _inset = double.NaN;

    public NotchPanel()
    {
        InitializeComponent();
        ShapeView.Drawable = _shape;
        PinView.Drawable = _pin;
        _staggered = [Brand, Nav0, Nav1, Nav2, Nav3, DbInfo];
        _machine = new NotchStateMachine(ReadPinned());
        Apply();
    }

    /// <summary>Raised with the new left margin the content should use (animates while pinning).</summary>
    public event Action<double>? ContentInsetChanged;

    public double ContentInset => CollapsedInset + (PinnedInset - CollapsedInset) * Math.Clamp(_machine.Pin, 0, 1.05);

    public NotchState State => _machine.State;

    /// <summary>Smoke-test override: jumps to <paramref name="state"/> and does not remember the pin.</summary>
    public void Force(NotchState state)
    {
        _remember = false;
        _machine.Force(state);
        if (state != NotchState.Collapsed) _shape.Pumpkin.Flare();
        Apply();
    }

    /// <summary>One animation frame: pending collapse, springs, pumpkin and redraw.</summary>
    public void Step(double seconds)
    {
        _machine.Advance(_clock.Elapsed, seconds);
        _shape.Pumpkin.Step((float)seconds);
        Apply();
        ShapeView.Invalidate();
    }

    private void Apply()
    {
        var open = _machine.Open;
        _shape.Open = open;

        // The root is only as wide as the tab while nothing of the panel shows, so it never covers the content.
        var wide = _machine.IsOpen || open > 0.01;
        if (wide != _wide)
        {
            _wide = wide;
            WidthRequest = wide ? NotchDrawable.PanelWidth + 24 : NotchDrawable.CollapsedWidth;
            Panel.IsVisible = wide;
        }
        if (_machine.IsOpen != _interactive)
        {
            _interactive = _machine.IsOpen;
            Panel.InputTransparent = !_machine.IsOpen;
        }

        if (wide)
        {
            for (var i = 0; i < _staggered.Length; i++) Reveal(_staggered[i], NotchStateMachine.Stagger(open, i));
            Reveal(PinButton, NotchStateMachine.Stagger(open, 1), slide: false);
        }

        if (_machine.IsPinned != _pinDrawn)
        {
            _pinDrawn = _machine.IsPinned;
            _pin.IsPinned = _machine.IsPinned;
            PinView.Invalidate();
        }

        var inset = ContentInset;
        if (double.IsNaN(_inset) || Math.Abs(inset - _inset) > 0.25)
        {
            _inset = inset;
            ContentInsetChanged?.Invoke(inset);
        }
    }

    private static void Reveal(View view, double f, bool slide = true)
    {
        if (Math.Abs(view.Opacity - f) > 0.002) view.Opacity = f;
        var x = slide ? -SlideDistance * (1 - f) : 0;
        if (Math.Abs(view.TranslationX - x) > 0.05) view.TranslationX = x;
    }

    private void OnPointerEntered(object? sender, PointerEventArgs e)
    {
        if (_machine.PointerEntered(_clock.Elapsed)) _shape.Pumpkin.Flare();
        Apply();
    }

    private void OnPointerExited(object? sender, PointerEventArgs e)
    {
        // Moving from the tab onto the panel (or onto a nav entry) reports an exit; only leaving the notch counts.
        if (e.GetPosition(this) is { } p && IsInsideNotch(p)) return;
        _machine.PointerExited(_clock.Elapsed);
    }

    private bool IsInsideNotch(Point p)
    {
        if (_machine.IsOpen)
            return p.X >= 0 && p.X < NotchDrawable.PanelWidth && p.Y >= NotchDrawable.PanelInset && p.Y <= Height - NotchDrawable.PanelInset;
        var top = (Height - NotchDrawable.CollapsedHeight) / 2;
        return p.X >= 0 && p.X < NotchDrawable.CollapsedWidth && p.Y >= top && p.Y <= top + NotchDrawable.CollapsedHeight;
    }

    private void OnTabTapped(object? sender, TappedEventArgs e) => OnPointerEntered(sender, null!);

    private void OnPinTapped(object? sender, TappedEventArgs e)
    {
        _machine.TogglePin(_clock.Elapsed);
        if (_machine.IsPinned) _shape.Pumpkin.Flare();
        if (_remember)
        {
            try { Preferences.Default.Set(PinPreferenceKey, _machine.IsPinned); }
            catch (Exception) { /* not remembered, still pinned for this session */ }
        }
        Apply();
    }

    private static bool ReadPinned()
    {
        try { return Preferences.Default.Get(PinPreferenceKey, false); }
        catch (Exception) { return false; }
    }
}
