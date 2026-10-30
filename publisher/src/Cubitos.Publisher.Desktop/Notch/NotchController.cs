using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Cubitos.Publisher.Dashboard.Core.Navigation;
using Cubitos.Publisher.Desktop.Rendering;
using Cubitos.Publisher.Desktop.Startup;
using Microsoft.Win32;

namespace Cubitos.Publisher.Desktop.Notch;

/// <summary>What the notch controller needs from the dashboard panel window.</summary>
public interface INotchPanel
{
    Window Window { get; }
    IntPtr Handle { get; }

    /// <summary>The element rendered by screenshots (the whole window content).</summary>
    FrameworkElement Scene { get; }

    /// <summary>A dropdown of the panel is open (it lives in its own popup window, outside the panel's rectangle).</summary>
    bool IsPopupOpen { get; }

    /// <summary>Completes after the first data load.</summary>
    Task FirstRefresh { get; }

    /// <summary>The thumbtack in the header was clicked.</summary>
    event Action? PinToggleRequested;

    /// <summary>An interactive move or resize ended; the new size in DIPs.</summary>
    event Action<Size>? MoveSizeEnded;

    /// <summary>The panel was activated; the window that had focus before (to give it back on collapse).</summary>
    event Action<IntPtr>? ActivatedFrom;

    /// <summary>Pinned: normal movable window. Hover mode: docked, topmost, no caption drag.</summary>
    void SetPinnedChrome(bool pinned, Size minSize);

    /// <summary>Per-frame reveal of the content for an eased opening in [0, 1].</summary>
    void Reveal(double open);

    /// <summary>Stops the animated background while nobody can see the panel.</summary>
    bool AmbientSuspended { set; }
}

/// <summary>
/// Makes the whole app behave like a screen notch. The <see cref="NotchWindow"/> is always on the primary screen's left
/// edge; the dashboard panel is created once and kept alive (rendered, fully transparent, click-through and parked left
/// of the screen), so hovering the pumpkin only slides it out: per frame it moves the window (no resize, no layout) and
/// fades its DWM alpha. The pointer is polled each frame across both windows and fed to the
/// <see cref="NotchStateMachine"/>, which owns the collapse delay and the popup / pressed-button guards.
/// </summary>
public sealed class NotchController : IFrameListener
{
    private readonly INotchPanel _panel;
    private readonly NotchWindow _notch;
    private readonly LaunchOptions _options;
    private readonly SettingsSession _settings;
    private readonly NotchStateMachine _machine;

    private double _scale = 1;
    private DockRect _work;
    private DockRect _panelDock;
    private Win32.Rect _tabPx;
    private double _appliedOpen = double.NaN;
    private double _appliedAlpha = double.NaN;
    private bool? _panelClickThrough;
    private IntPtr _previousForeground;
    private bool? _simulatedInside;

    public NotchController(INotchPanel panel, NotchWindow notch, LaunchOptions options, SettingsSession settings)
    {
        _panel = panel;
        _notch = notch;
        _options = options;
        _settings = settings;
        _machine = new NotchStateMachine(pinned: options.Notch is null && settings.Current.NotchPinned);
        if (options.Notch is { } forced) _machine.Force(forced);
    }

    public NotchState State => _machine.State;

    /// <summary>Linear progress of the open/close tween (the fps log measures open time with it).</summary>
    public double Progress => _machine.Progress;

    public void Start()
    {
        var window = _panel.Window;
        window.ShowActivated = _machine.IsPinned;
        window.SourceInitialized += (_, _) =>
        {
            // Hidden until the first frame places it; never flash at the default position.
            if (!_machine.IsPinned) Win32.SetAlpha(_panel.Handle, 0);
        };
        _notch.Show();
        window.Show();

        _panel.PinToggleRequested += TogglePin;
        _panel.MoveSizeEnded += OnMoveSizeEnded;
        _panel.ActivatedFrom += hwnd => { if (hwnd != _notch.Handle) _previousForeground = hwnd; };
        _notch.PinRequested += TogglePin;
        _notch.ExitRequested += () => Application.Current.Shutdown();
        _notch.OpenRequested += () => { if (_machine.IsPinned) _panel.Window.Activate(); };

        SystemEvents.DisplaySettingsChanged += OnDisplayChanged;
        SystemEvents.UserPreferenceChanged += OnPreferenceChanged;
        window.Closed += (_, _) =>
        {
            SystemEvents.DisplaySettingsChanged -= OnDisplayChanged;
            SystemEvents.UserPreferenceChanged -= OnPreferenceChanged;
            FrameClock.Remove(this);
            _notch.Close();
        };

        Redock();
        ApplyMode(activate: false);
        FrameClock.Add(this);
    }

    /// <summary>Overrides the polled pointer with a simulated hover (fps log); null returns to the real pointer.</summary>
    public void SimulateHover(bool? inside) => _simulatedInside = inside;

    public void TogglePin()
    {
        _machine.TogglePin(FrameClock.Now);
        if (_machine.IsPinned) _notch.Tab.Pumpkin.Flare();
        _settings.Update(s => s with { NotchPinned = _machine.IsPinned });
        ApplyMode(activate: _machine.IsPinned);
    }

    public void OnFrame(TimeSpan now, double dt)
    {
        var cursor = Win32.Cursor();
        var overNotch = _simulatedInside ?? _tabPx.Contains(cursor);
        var overPanel = _simulatedInside is null && !_machine.IsPinned && Win32.WindowRect(_panel.Handle).Contains(cursor);
        var popup = _panel.IsPopupOpen || _notch.IsMenuOpen;
        var button = _simulatedInside is null && Win32.PrimaryButtonDown();
        _notch.SetClickThrough(!(_tabPx.Contains(cursor) || _notch.IsMenuOpen));

        if (!_machine.IsPinned && _machine.Track(now, overNotch, overPanel, popup, button)) OnOpening();
        if (_machine.Advance(now, dt) && !_machine.IsOpen) OnCollapsed();
        if (!_machine.IsPinned) ApplyOpen();

        var tab = _notch.Tab;
        tab.Open = _machine.IsPinned ? 1 : _machine.Open;
        tab.Pumpkin.Step(dt);
        tab.Redraw();
    }

    private void OnOpening()
    {
        _notch.Tab.Pumpkin.Flare();
        _panel.AmbientSuspended = false;
        // The notch stays above the panel (both are topmost; the last one raised wins).
        Win32.BringToTopmost(_notch.Handle);
    }

    /// <summary>Gives the keyboard focus back to whoever had it if the panel took it while open.</summary>
    private void OnCollapsed()
    {
        if (Win32.GetForegroundWindow() == _panel.Handle && _previousForeground != IntPtr.Zero &&
            Win32.IsWindow(_previousForeground) && Win32.IsWindowVisible(_previousForeground))
        {
            Win32.SetForegroundWindow(_previousForeground);
        }
    }

    /// <summary>Slides and fades the panel for the current opening; only touches the window when the value changed.</summary>
    private void ApplyOpen()
    {
        var open = _machine.Open;
        if (open != _appliedOpen)
        {
            _appliedOpen = open;
            Win32.MoveOnly(_panel.Handle, Px(NotchDock.SlideX(_panelDock, open)), Px(_panelDock.Y));
            _panel.Reveal(open);
        }

        var alpha = Math.Clamp(open * 1.6, 0, 1);
        if (alpha != _appliedAlpha)
        {
            _appliedAlpha = alpha;
            Win32.SetAlpha(_panel.Handle, alpha);
        }

        var hidden = open < 0.02;
        if (hidden != _panelClickThrough)
        {
            _panelClickThrough = hidden;
            Win32.SetExStyle(_panel.Handle, Win32.WsExTransparent, hidden);
        }
        if (hidden && !_machine.IsOpen) _panel.AmbientSuspended = true;
    }

    /// <summary>Switches the panel between a pinned normal window and the docked hover panel.</summary>
    private void ApplyMode(bool activate)
    {
        var min = new Size(Math.Min(NotchDock.MinPanelWidth, _work.Width), Math.Min(NotchDock.MinPanelHeight, _work.Height));
        if (_machine.IsPinned)
        {
            _panel.SetPinnedChrome(true, min);
            _panelClickThrough = false;
            Win32.SetExStyle(_panel.Handle, Win32.WsExTransparent, false);
            _appliedAlpha = 1;
            Win32.SetAlpha(_panel.Handle, 1);
            _panel.Reveal(1);
            _panel.AmbientSuspended = false;
            if (double.IsNaN(_appliedOpen)) PlacePanel(1); // first start: docked where the hover panel would be
            _appliedOpen = double.NaN;
            if (activate) _panel.Window.Activate();
        }
        else
        {
            _panel.SetPinnedChrome(false, min);
            PlacePanel(_machine.Open);
            _appliedOpen = double.NaN;
            _appliedAlpha = double.NaN;
            ApplyOpen();
        }
        Win32.BringToTopmost(_notch.Handle);
    }

    /// <summary>Re-reads the primary work area and DPI, then re-docks the notch and (unless pinned) the panel.</summary>
    private void Redock()
    {
        var (workPx, scale) = Win32.PrimaryWorkArea();
        _scale = scale;
        _work = new DockRect(workPx.Left / scale, workPx.Top / scale, workPx.Width / scale, workPx.Height / scale);

        var tab = NotchDock.Tab(_work);
        _tabPx = new Win32.Rect { Left = Px(tab.X), Top = Px(tab.Y), Right = Px(tab.Right), Bottom = Px(tab.Bottom) };
        var notchTop = tab.Y - (NotchWindow.WindowHeight - NotchDock.TabHeight) / 2;
        Win32.Move(_notch.Handle, Px(tab.X), Px(notchTop), Px(NotchWindow.WindowWidth), Px(NotchWindow.WindowHeight), Win32.HwndTopmost);

        var size = _options.Size;
        _panelDock = NotchDock.Panel(_work, size?.Width ?? _settings.Current.PanelWidth, size?.Height ?? _settings.Current.PanelHeight);
        if (!_machine.IsPinned)
        {
            PlacePanel(_machine.Open);
            _appliedOpen = double.NaN;
        }
    }

    private void PlacePanel(double open) =>
        Win32.Move(_panel.Handle, Px(NotchDock.SlideX(_panelDock, open)), Px(_panelDock.Y), Px(_panelDock.Width), Px(_panelDock.Height));

    private void OnMoveSizeEnded(Size size)
    {
        if (_panel.Window.WindowState == WindowState.Normal && size.Width > 0 && size.Height > 0)
            _settings.Update(s => s with { PanelWidth = Math.Round(size.Width), PanelHeight = Math.Round(size.Height) });
        if (!_machine.IsPinned) Redock(); // a drag in hover mode never undocks the panel
    }

    private void OnDisplayChanged(object? sender, EventArgs e) => _notch.Dispatcher.BeginInvoke(Redock);

    private void OnPreferenceChanged(object? sender, UserPreferenceChangedEventArgs e)
    {
        // The work area (taskbar size or position) changes under the Desktop category.
        if (e.Category is UserPreferenceCategory.Desktop or UserPreferenceCategory.General) _notch.Dispatcher.BeginInvoke(Redock);
    }

    private int Px(double dip) => (int)Math.Round(dip * _scale);

    // ---- Smoke tests -----------------------------------------------------------------------------------------

    /// <summary>
    /// Saves a PNG after things settle, then quits: collapsed captures the notch window; expanded/pinned capture the
    /// panel with the notch composed on top at its real screen offset.
    /// </summary>
    public async Task CaptureAndExitAsync(string path)
    {
        await _panel.FirstRefresh;
        await Task.Delay(TimeSpan.FromSeconds(3));
        try
        {
            var image = _machine.IsOpen ? ComposePanelAndNotch() : MainWindow.Render(_notch.Tab);
            var encoder = new PngBitmapEncoder();
            encoder.Frames.Add(BitmapFrame.Create(image));
            await using var file = File.Create(path);
            encoder.Save(file);
        }
        catch (Exception ex)
        {
            await File.WriteAllTextAsync(path + ".error.txt", ex.ToString());
        }
        finally
        {
            Application.Current.Shutdown();
        }
    }

    private BitmapSource ComposePanelAndNotch()
    {
        var scene = MainWindow.Render(_panel.Scene);
        var notch = MainWindow.Render(_notch.Tab);
        var panelRect = Win32.WindowRect(_panel.Handle);
        var notchRect = Win32.WindowRect(_notch.Handle);
        var visual = new DrawingVisual();
        using (var dc = visual.RenderOpen())
        {
            dc.DrawImage(scene, new Rect(0, 0, scene.PixelWidth, scene.PixelHeight));
            dc.DrawImage(notch, new Rect(notchRect.Left - panelRect.Left, notchRect.Top - panelRect.Top, notch.PixelWidth, notch.PixelHeight));
        }
        var bitmap = new RenderTargetBitmap(scene.PixelWidth, scene.PixelHeight, 96, 96, PixelFormats.Pbgra32);
        bitmap.Render(visual);
        bitmap.Freeze();
        return bitmap;
    }
}
