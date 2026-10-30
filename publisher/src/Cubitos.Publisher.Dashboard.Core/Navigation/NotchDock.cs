namespace Cubitos.Publisher.Dashboard.Core.Navigation;

/// <summary>Screen rectangle in device-independent units (left, top, width, height).</summary>
public readonly record struct DockRect(double X, double Y, double Width, double Height)
{
    public double Right => X + Width;
    public double Bottom => Y + Height;

    public bool Contains(double x, double y) => x >= X && x < Right && y >= Y && y < Bottom;
}

/// <summary>
/// Where the notch and the dashboard panel sit on the primary screen's work area: the notch tab flush with the left edge
/// and vertically centered; the panel left-anchored, vertically centered, 70% x 80% of the work area by default (or the
/// remembered size), and slid out of the left edge while it opens.
/// </summary>
public static class NotchDock
{
    public const double TabWidth = 58;
    public const double TabHeight = 136;
    public const double DefaultWidthFraction = 0.7;
    public const double DefaultHeightFraction = 0.8;
    public const double MinPanelWidth = 1100;
    public const double MinPanelHeight = 720;

    public static DockRect Tab(DockRect workArea) =>
        new(workArea.X, workArea.Y + (workArea.Height - TabHeight) / 2, TabWidth, TabHeight);

    public static DockRect Panel(DockRect workArea, double? width, double? height)
    {
        var w = Fit(width ?? workArea.Width * DefaultWidthFraction, MinPanelWidth, workArea.Width);
        var h = Fit(height ?? workArea.Height * DefaultHeightFraction, MinPanelHeight, workArea.Height);
        return new DockRect(workArea.X, workArea.Y + (workArea.Height - h) / 2, w, h);
    }

    /// <summary>Left of the panel for an opening value: fully left of the edge at 0, docked at 1.</summary>
    public static double SlideX(DockRect panel, double open) => panel.X - panel.Width * (1 - Math.Clamp(open, 0, 1));

    private static double Fit(double value, double min, double available)
    {
        if (double.IsNaN(value) || value <= 0) value = min;
        return Math.Min(Math.Max(value, Math.Min(min, available)), available);
    }
}
