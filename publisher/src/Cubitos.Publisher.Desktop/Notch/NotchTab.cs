using System.Windows;
using System.Windows.Media;
using Cubitos.Publisher.Desktop.Rendering;
using Cubitos.Publisher.Desktop.Themes;

namespace Cubitos.Publisher.Desktop.Notch;

/// <summary>
/// The notch body: a near-black tab with rounded right corners that morphs into the full navigation panel as
/// <see cref="Open"/> goes from 0 to 1, with the pumpkin moving from the tab to the top of the panel.
/// </summary>
public sealed class NotchSurface : VisualLayer
{
    public const double CollapsedWidth = 58;
    public const double CollapsedHeight = 136;
    public const double PanelWidth = 264;
    public const double PanelInset = 12;

    private static readonly Pen[] ShadowPens =
    [
        BrushCache.Pen(BrushCache.Get(Colors.Black, 0.10), 26),
        BrushCache.Pen(BrushCache.Get(Colors.Black, 0.12), 16),
        BrushCache.Pen(BrushCache.Get(Colors.Black, 0.16), 8),
    ];

    public NotchSurface() => IsHitTestVisible = false;

    public PumpkinRenderer Pumpkin { get; } = new();

    /// <summary>Spring value of the opening (may overshoot 1 a little).</summary>
    public double Open { get; set; }

    protected override void Draw(DrawingContext dc, Size size)
    {
        var t = ThemeManager.Current;
        var o = Math.Clamp(Open, 0, 1.25);
        var oc = Math.Min(o, 1);
        var midY = size.Height / 2;
        var collapsedTop = midY - CollapsedHeight / 2;
        var collapsedBottom = midY + CollapsedHeight / 2;
        var expandedTop = PanelInset;
        var expandedBottom = PanelInset + Math.Max(CollapsedHeight, size.Height - 2 * PanelInset);
        var top = Math.Max(2, Lerp(collapsedTop, expandedTop, oc));
        var bottom = Math.Min(size.Height - 2, Lerp(collapsedBottom, expandedBottom, oc));
        var shape = new Rect(0, top, Lerp(CollapsedWidth, PanelWidth, o), Math.Max(1, bottom - top));
        var path = Shape(shape, Lerp(18, 26, oc));

        // Soft shadow on the right edge: wide translucent strokes under the fill.
        foreach (var pen in ShadowPens) dc.DrawGeometry(null, pen, path);
        dc.DrawGeometry(BrushCache.Get(t.NotchFill, 1), null, path);

        var pumpkin = new Point(Lerp(CollapsedWidth / 2, PanelWidth / 2, oc), Lerp(midY + 14, expandedTop + 88, oc));

        // Inner glow: a soft light around the pumpkin and a faint rim, clipped to the shape.
        dc.PushClip(path);
        var glowR = Lerp(70, 180, oc);
        dc.PushOpacity(0.22);
        dc.DrawEllipse(Glow(t.NotchGlow), null, pumpkin, glowR, glowR);
        dc.Pop();
        dc.DrawGeometry(null, new Pen(BrushCache.Get(t.NotchGlow, 0.18), 5), path);
        dc.Pop();
        dc.DrawGeometry(null, new Pen(BrushCache.Get(t.NotchStroke, 1), 1.2), path);

        Pumpkin.Draw(dc, pumpkin, Lerp(19, 33, oc), t.NotchGlow);
    }

    private static readonly Dictionary<Color, RadialGradientBrush> GlowBrushes = [];

    private static RadialGradientBrush Glow(Color c)
    {
        if (!GlowBrushes.TryGetValue(c, out var brush))
        {
            brush = new RadialGradientBrush(c, ThemeDefinition.WithAlpha(c, 0));
            brush.Freeze();
            GlowBrushes[c] = brush;
        }
        return brush;
    }

    private static double Lerp(double a, double b, double f) => a + (b - a) * f;

    /// <summary>Flush with the window's left edge, rounded on the right.</summary>
    private static StreamGeometry Shape(Rect r, double radius)
    {
        radius = Math.Min(radius, Math.Min(r.Width, r.Height) / 2);
        var g = new StreamGeometry();
        using (var c = g.Open())
        {
            c.BeginFigure(new Point(r.Left - 30, r.Top), true, true);
            c.LineTo(new Point(r.Right - radius, r.Top), true, true);
            c.QuadraticBezierTo(new Point(r.Right, r.Top), new Point(r.Right, r.Top + radius), true, true);
            c.LineTo(new Point(r.Right, r.Bottom - radius), true, true);
            c.QuadraticBezierTo(new Point(r.Right, r.Bottom), new Point(r.Right - radius, r.Bottom), true, true);
            c.LineTo(new Point(r.Left - 30, r.Bottom), true, true);
        }
        g.Freeze();
        return g;
    }
}

/// <summary>Thumbtack icon of the pin button: upright and lit when pinned, tilted and muted otherwise.</summary>
public sealed class PinIcon : FrameworkElement
{
    public static readonly DependencyProperty IsPinnedProperty = DependencyProperty.Register(
        nameof(IsPinned), typeof(bool), typeof(PinIcon), new FrameworkPropertyMetadata(false, FrameworkPropertyMetadataOptions.AffectsRender));

    public PinIcon()
    {
        Loaded += (_, _) => ThemeManager.Changed += OnTheme;
        Unloaded += (_, _) => ThemeManager.Changed -= OnTheme;
    }

    public bool IsPinned { get => (bool)GetValue(IsPinnedProperty); set => SetValue(IsPinnedProperty, value); }

    private void OnTheme(ThemeDefinition _) => InvalidateVisual();

    protected override void OnRender(DrawingContext dc)
    {
        var t = ThemeManager.Current;
        var brush = BrushCache.Get(IsPinned ? t.NotchGlow : t.PageMuted, 1);
        var s = Math.Min(ActualWidth, ActualHeight);
        if (s <= 0) return;
        dc.PushTransform(new TranslateTransform(ActualWidth / 2, ActualHeight / 2));
        if (!IsPinned) dc.PushTransform(new RotateTransform(40));
        dc.DrawRoundedRectangle(brush, null, new Rect(-s * 0.18, -s * 0.38, s * 0.36, s * 0.12), 2, 2);
        dc.DrawRoundedRectangle(brush, null, new Rect(-s * 0.12, -s * 0.3, s * 0.24, s * 0.3), 2, 2);
        dc.DrawRoundedRectangle(brush, null, new Rect(-s * 0.26, -s * 0.02, s * 0.52, s * 0.1), 2, 2);
        dc.DrawLine(BrushCache.Pen(brush, Math.Max(1.5, s * 0.08)), new Point(0, s * 0.08), new Point(0, s * 0.4));
        if (!IsPinned) dc.Pop();
        dc.Pop();
    }
}
