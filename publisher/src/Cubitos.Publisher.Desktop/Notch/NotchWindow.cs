using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;

namespace Cubitos.Publisher.Desktop.Notch;

/// <summary>
/// The always-visible part of the app: a small borderless, per-pixel transparent, topmost window on the primary screen's
/// left edge that only draws the <see cref="NotchTab"/>. It never takes focus and has no taskbar or Alt+Tab entry. Outside
/// the tab it is click-through (the controller toggles <c>WS_EX_TRANSPARENT</c> from the pointer position), so its glow
/// and sparks never block the windows below.
/// </summary>
public sealed class NotchWindow : Window
{
    /// <summary>Window size in DIPs: room around the tab for the halo, the swell and rising sparks.</summary>
    public const double WindowWidth = 150;
    public const double WindowHeight = 300;

    private bool _clickThrough;

    public NotchWindow()
    {
        Title = "Historia en Cubitos — Notch";
        WindowStyle = WindowStyle.None;
        AllowsTransparency = true;
        Background = Brushes.Transparent;
        ResizeMode = ResizeMode.NoResize;
        ShowInTaskbar = false;
        ShowActivated = false;
        Topmost = true;
        Focusable = false;
        Width = WindowWidth;
        Height = WindowHeight;
        UseLayoutRounding = true;
        Content = Tab;
        Tab.ContextMenu = BuildMenu();
        SourceInitialized += (_, _) =>
            Win32.SetExStyle(Handle, Win32.WsExToolWindow | Win32.WsExNoActivate, true);
    }

    public NotchTab Tab { get; } = new();

    public IntPtr Handle => new WindowInteropHelper(this).Handle;

    public event Action? PinRequested;
    public event Action? OpenRequested;
    public event Action? ExitRequested;

    public bool IsMenuOpen => Tab.ContextMenu?.IsOpen == true;

    /// <summary>Lets clicks through everywhere except over the tab (and while the context menu is up).</summary>
    public void SetClickThrough(bool on)
    {
        if (on == _clickThrough || Handle == IntPtr.Zero) return;
        _clickThrough = on;
        Win32.SetExStyle(Handle, Win32.WsExTransparent, on);
    }

    protected override void OnMouseLeftButtonUp(System.Windows.Input.MouseButtonEventArgs e)
    {
        base.OnMouseLeftButtonUp(e);
        OpenRequested?.Invoke();
    }

    private ContextMenu BuildMenu()
    {
        var pin = new MenuItem { Header = "Fijar / soltar el panel" };
        pin.Click += (_, _) => PinRequested?.Invoke();
        var exit = new MenuItem { Header = "Salir" };
        exit.Click += (_, _) => ExitRequested?.Invoke();
        return new ContextMenu { Items = { pin, new Separator(), exit } };
    }
}
