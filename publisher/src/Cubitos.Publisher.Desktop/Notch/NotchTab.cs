using System.Windows;
using System.Windows.Media;
using Cubitos.Publisher.Dashboard.Core.Navigation;
using Cubitos.Publisher.Desktop.Rendering;
using Cubitos.Publisher.Desktop.Themes;

namespace Cubitos.Publisher.Desktop.Notch;

/// <summary>
/// The notch body drawn in the transparent notch window: a near-black tab flush with the screen's left edge, rounded
/// on the right, with the flaming pumpkin inside. While the panel opens (<see cref="Open"/> 0 to 1) the tab swells a
/// little, its inner glow brightens and the pumpkin flares, so the panel reads as coming out of it.
/// </summary>
public sealed class NotchTab : VisualLayer
{
    private static readonly Pen[] ShadowPens =
    [
        BrushCache.Pen(BrushCache.Get(Colors.Black, 0.10), 26),
        BrushCache.Pen(BrushCache.Get(Colors.Black, 0.12), 16),
        BrushCache.Pen(BrushCache.Get(Colors.Black, 0.16), 8),
    ];

    private static readonly Dictionary<Color, RadialGradientBrush> GlowBrushes = [];

    public NotchTab() => IsHitTestVisible = true;

    public PumpkinRenderer Pumpkin { get; } = new();

    /// <summary>Eased opening of the panel in [0, 1].</summary>
    public double Open { get; set; }

    /// <summary>Tab rectangle (DIPs, relative to this element) for a layer of <paramref name="size"/>.</summary>
    public static Rect TabRect(Size size) =>
        new(0, (size.Height - NotchDock.TabHeight) / 2, NotchDock.TabWidth, NotchDock.TabHeight);

    protected override void Draw(DrawingContext dc, Size size)
    {
        var t = ThemeManager.Current;
        var o = Math.Clamp(Open, 0, 1);
        var tab = TabRect(size);
        var swell = 8 * o;
        var shape = new Rect(0, tab.Top - swell, tab.Width + 0.5 * swell, tab.Height + 2 * swell);
        var path = Shape(shape, 18);

        foreach (var pen in ShadowPens) dc.DrawGeometry(null, pen, path);
        dc.DrawGeometry(BrushCache.Get(t.NotchFill, 1), null, path);

        var pumpkin = new Point(shape.Width / 2, size.Height / 2 + 14);

        // Inner glow around the pumpkin plus a faint rim, clipped to the tab.
        dc.PushClip(path);
        var glowR = 70 + 30 * o;
        dc.PushOpacity(0.22 + 0.25 * o);
        dc.DrawEllipse(Glow(t.NotchGlow), null, pumpkin, glowR, glowR);
        dc.Pop();
        dc.DrawGeometry(null, BrushCache.Pen(BrushCache.Get(t.NotchGlow, 0.18 + 0.3 * o), 5), path);
        dc.Pop();
        dc.DrawGeometry(null, BrushCache.Pen(BrushCache.Get(o > 0.02 ? t.NotchGlow : t.NotchStroke, 0.4 + 0.6 * (1 - o)), 1.2), path);

        Pumpkin.Heat = o;
        Pumpkin.Draw(dc, pumpkin, 19 + 3 * o, t.NotchGlow);
    }

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

    /// <summary>Flush with the screen's left edge, rounded on the right.</summary>
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
