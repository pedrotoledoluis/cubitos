using System.Runtime.InteropServices;

namespace Cubitos.Publisher.Desktop.Notch;

/// <summary>The few user32/shcore calls the screen notch needs (positions are physical pixels, the app is PerMonitorV2).</summary>
internal static class Win32
{
    [StructLayout(LayoutKind.Sequential)]
    public struct Point
    {
        public int X, Y;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct Rect
    {
        public int Left, Top, Right, Bottom;
        public readonly int Width => Right - Left;
        public readonly int Height => Bottom - Top;
        public readonly bool Contains(Point p) => p.X >= Left && p.X < Right && p.Y >= Top && p.Y < Bottom;
    }

    public static readonly IntPtr HwndTopmost = new(-1);
    public static readonly IntPtr HwndNoTopmost = new(-2);

    public const uint SwpNoSize = 0x0001;
    public const uint SwpNoMove = 0x0002;
    public const uint SwpNoZOrder = 0x0004;
    public const uint SwpNoActivate = 0x0010;

    public const int GwlExStyle = -20;
    public const int WsExTransparent = 0x00000020;
    public const int WsExToolWindow = 0x00000080;
    public const int WsExLayered = 0x00080000;
    public const int WsExNoActivate = 0x08000000;

    public const int WmActivate = 0x0006;
    public const int WmEnterSizeMove = 0x0231;
    public const int WmExitSizeMove = 0x0232;

    private const uint LwaAlpha = 0x2;
    private const uint SpiGetWorkArea = 0x0030;
    private const uint MonitorDefaultToPrimary = 1;
    private const int SmSwapButton = 23;

    /// <summary>Primary monitor work area in pixels and its DPI scale (1.0 = 96 dpi).</summary>
    public static (Rect WorkArea, double Scale) PrimaryWorkArea()
    {
        var work = new Rect();
        if (!SystemParametersInfo(SpiGetWorkArea, 0, ref work, 0)) work = new Rect { Right = 1920, Bottom = 1040 };
        var scale = 1.0;
        var monitor = MonitorFromPoint(new Point(), MonitorDefaultToPrimary);
        if (monitor != IntPtr.Zero && GetDpiForMonitor(monitor, 0, out var dpiX, out _) == 0 && dpiX > 0) scale = dpiX / 96.0;
        return (work, scale);
    }

    public static Point Cursor() => GetCursorPos(out var p) ? p : new Point { X = int.MinValue, Y = int.MinValue };

    public static Rect WindowRect(IntPtr hwnd) => GetWindowRect(hwnd, out var r) ? r : default;

    /// <summary>True while the primary (logical left) mouse button is physically held.</summary>
    public static bool PrimaryButtonDown() => (GetAsyncKeyState(GetSystemMetrics(SmSwapButton) != 0 ? 0x02 : 0x01) & 0x8000) != 0;

    public static void SetExStyle(IntPtr hwnd, int flags, bool on)
    {
        var style = GetWindowLong(hwnd, GwlExStyle);
        var next = on ? style | flags : style & ~flags;
        if (next != style) SetWindowLong(hwnd, GwlExStyle, next);
    }

    public static bool HasExStyle(IntPtr hwnd, int flags) => (GetWindowLong(hwnd, GwlExStyle) & flags) == flags;

    /// <summary>Whole-window alpha composed by DWM (no per-pixel copy, unlike <c>AllowsTransparency</c>).</summary>
    public static void SetAlpha(IntPtr hwnd, double opacity)
    {
        if (!HasExStyle(hwnd, WsExLayered)) SetExStyle(hwnd, WsExLayered, true);
        SetLayeredWindowAttributes(hwnd, 0, (byte)Math.Round(Math.Clamp(opacity, 0, 1) * 255), LwaAlpha);
    }

    public static void Move(IntPtr hwnd, int x, int y, int width, int height, IntPtr? insertAfter = null) =>
        SetWindowPos(hwnd, insertAfter ?? IntPtr.Zero, x, y, width, height, SwpNoActivate | (insertAfter is null ? SwpNoZOrder : 0));

    public static void MoveOnly(IntPtr hwnd, int x, int y) =>
        SetWindowPos(hwnd, IntPtr.Zero, x, y, 0, 0, SwpNoActivate | SwpNoZOrder | SwpNoSize);

    public static void BringToTopmost(IntPtr hwnd) =>
        SetWindowPos(hwnd, HwndTopmost, 0, 0, 0, 0, SwpNoActivate | SwpNoMove | SwpNoSize);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hwnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindow(IntPtr hwnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetWindowPos(IntPtr hwnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetCursorPos(out Point point);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetWindowRect(IntPtr hwnd, out Rect rect);

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int key);

    [DllImport("user32.dll")]
    private static extern int GetSystemMetrics(int index);

    [DllImport("user32.dll", EntryPoint = "GetWindowLongW")]
    private static extern int GetWindowLong(IntPtr hwnd, int index);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongW")]
    private static extern int SetWindowLong(IntPtr hwnd, int index, int value);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetLayeredWindowAttributes(IntPtr hwnd, uint colorKey, byte alpha, uint flags);

    [DllImport("user32.dll", EntryPoint = "SystemParametersInfoW")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SystemParametersInfo(uint action, uint param, ref Rect rect, uint winIni);

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromPoint(Point point, uint flags);

    [DllImport("shcore.dll")]
    private static extern int GetDpiForMonitor(IntPtr monitor, int type, out uint dpiX, out uint dpiY);
}
