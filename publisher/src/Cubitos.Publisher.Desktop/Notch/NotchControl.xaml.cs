using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using Cubitos.Publisher.Dashboard.Core.Navigation;
using Cubitos.Publisher.Desktop.Rendering;

namespace Cubitos.Publisher.Desktop.Notch;

/// <summary>
/// What the window needs from the navigation notch. The current notch (<see cref="NotchControl"/>) will be redesigned
/// from a reference; a replacement only has to implement this.
/// </summary>
public interface INavigationNotch
{
    /// <summary>Section id shown as selected (see <c>Sections</c>).</summary>
    string SelectedSection { get; set; }

    /// <summary>The user picked a section in the notch.</summary>
    event Action<string>? SectionRequested;

    /// <summary>Left margin the content should use; animates while (un)pinning.</summary>
    double ContentInset { get; }

    event Action<double>? ContentInsetChanged;

    NotchState State { get; }

    /// <summary>The user pinned or unpinned the panel (worth remembering).</summary>
    event Action<bool>? PinnedChanged;

    /// <summary>Starting pin state (remembered preference), without animation.</summary>
    void Initialize(bool pinned, string databasePath);

    /// <summary>Jumps to a state without animation (smoke tests).</summary>
    void Force(NotchState state);

    /// <summary>Simulates the pointer entering or leaving (fps log), with the normal animation.</summary>
    void SimulateHover(bool inside);

    void TogglePin();
}

/// <summary>
/// Left-edge notch with the flaming pumpkin. Hover opens it into the navigation panel, leaving closes it after
/// <see cref="NotchStateMachine.CollapseDelay"/>, the pin keeps it open beside the content. It animates from the shared
/// <see cref="FrameClock"/> only while something moves; per frame it changes render-only properties (opacity,
/// transforms, its own drawing), never layout.
/// </summary>
public partial class NotchControl : UserControl, INavigationNotch, IFrameListener
{
    /// <summary>Content offset from the window's left edge while the notch is collapsed or overlaid.</summary>
    public const double CollapsedInset = NotchSurface.CollapsedWidth + 12;

    /// <summary>Content offset while the panel is pinned beside it.</summary>
    public const double PinnedInset = NotchSurface.PanelWidth + 14;

    private const double SlideDistance = 28;

    private readonly FrameworkElement[] _staggered;
    private readonly TranslateTransform[] _slides;
    private NotchStateMachine _machine = new();
    private string _section = "ranking";
    private bool? _wide;
    private double _inset = double.NaN;

    public NotchControl()
    {
        InitializeComponent();
        _staggered = [Brand, Nav0, Nav1, Nav2, Nav3, DbInfo];
        _slides = new TranslateTransform[_staggered.Length];
        for (var i = 0; i < _staggered.Length; i++) _staggered[i].RenderTransform = _slides[i] = new TranslateTransform();
        Loaded += (_, _) => FrameClock.Add(this);
        Unloaded += (_, _) => FrameClock.Remove(this);
        MouseLeave += (_, _) => _machine.PointerExited(FrameClock.Now);
        Apply();
    }

    public event Action<string>? SectionRequested;
    public event Action<double>? ContentInsetChanged;
    public event Action<bool>? PinnedChanged;

    public string SelectedSection
    {
        get => _section;
        set
        {
            _section = value;
            foreach (var nav in (RadioButton[])[Nav0, Nav1, Nav2, Nav3]) nav.IsChecked = (string)nav.Tag == value;
        }
    }

    public double ContentInset => CollapsedInset + (PinnedInset - CollapsedInset) * Math.Clamp(_machine.Pin, 0, 1.05);

    public NotchState State => _machine.State;

    public void Initialize(bool pinned, string databasePath)
    {
        _machine = new NotchStateMachine(pinned);
        DbPathText.Text = databasePath;
        Apply();
    }

    public void Force(NotchState state)
    {
        _machine.Force(state);
        if (state != NotchState.Collapsed) Surface.Pumpkin.Flare();
        Apply();
    }

    public void SimulateHover(bool inside)
    {
        if (inside)
        {
            if (_machine.PointerEntered(FrameClock.Now)) Surface.Pumpkin.Flare();
        }
        else
        {
            _machine.PointerExited(FrameClock.Now);
        }
    }

    public void TogglePin()
    {
        _machine.TogglePin(FrameClock.Now);
        if (_machine.IsPinned) Surface.Pumpkin.Flare();
        PinnedChanged?.Invoke(_machine.IsPinned);
        Apply();
    }

    /// <summary>One frame: pending collapse, springs, pumpkin and redraw. The pumpkin is always alive.</summary>
    public void OnFrame(TimeSpan now, double dt)
    {
        _machine.Advance(now, dt);
        Surface.Pumpkin.Step(dt);
        Apply();
    }

    private void Apply()
    {
        var open = _machine.Open;
        Surface.Open = open;

        // The control is only as wide as the tab while nothing of the panel shows, so it never covers the content.
        var wide = _machine.IsOpen || open > 0.01;
        if (wide != _wide)
        {
            _wide = wide;
            Width = wide ? NotchSurface.PanelWidth + 24 : NotchSurface.CollapsedWidth;
            Panel.Visibility = wide ? Visibility.Visible : Visibility.Collapsed;
        }
        Panel.IsHitTestVisible = _machine.IsOpen;

        if (wide)
        {
            for (var i = 0; i < _staggered.Length; i++) Reveal(i, NotchStateMachine.Stagger(open, i));
            var pin = NotchStateMachine.Stagger(open, 1);
            if (Math.Abs(PinButton.Opacity - pin) > 0.002) PinButton.Opacity = pin;
        }
        if (Pin.IsPinned != _machine.IsPinned) Pin.IsPinned = _machine.IsPinned;

        Surface.Redraw();

        var inset = ContentInset;
        if (double.IsNaN(_inset) || Math.Abs(inset - _inset) > 0.25)
        {
            _inset = inset;
            ContentInsetChanged?.Invoke(inset);
        }
    }

    private void Reveal(int index, double f)
    {
        var view = _staggered[index];
        if (Math.Abs(view.Opacity - f) > 0.002) view.Opacity = f;
        var x = -SlideDistance * (1 - f);
        if (Math.Abs(_slides[index].X - x) > 0.05) _slides[index].X = x;
    }

    private void OnPointerEntered(object sender, MouseEventArgs e)
    {
        if (_machine.PointerEntered(FrameClock.Now)) Surface.Pumpkin.Flare();
        Apply();
    }

    private void OnTabClicked(object sender, MouseButtonEventArgs e) => OnPointerEntered(sender, e);

    private void OnPinClicked(object sender, RoutedEventArgs e) => TogglePin();

    private void OnNavClicked(object sender, RoutedEventArgs e)
    {
        if (sender is ToggleButton { Tag: string id })
        {
            SelectedSection = id;
            SectionRequested?.Invoke(id);
        }
    }
}
