using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Cubitos.Publisher.Desktop.Themes;

namespace Cubitos.Publisher.Desktop.Controls;

/// <summary>Themed panel; its look (and the hover lift + glow) lives in the implicit style in App.xaml.</summary>
public sealed class Card : ContentControl
{
    public static readonly DependencyProperty IsHighlightedProperty = DependencyProperty.Register(
        nameof(IsHighlighted), typeof(bool), typeof(Card), new PropertyMetadata(false));

    public bool IsHighlighted { get => (bool)GetValue(IsHighlightedProperty); set => SetValue(IsHighlightedProperty, value); }
}

/// <summary>
/// Card shadow drawn as a few stacked translucent rounded rectangles instead of a blur Effect. Effects are re-blurred
/// whenever anything under them changes (the animated background changes every frame), which costs a GPU pass per
/// card per frame; this is a handful of plain fills, re-recorded only when the card's size or the theme changes.
/// </summary>
public sealed class CardShadow : FrameworkElement
{
    private const int Layers = 3;

    public CardShadow()
    {
        IsHitTestVisible = false;
        Loaded += (_, _) => ThemeManager.Changed += OnTheme;
        Unloaded += (_, _) => ThemeManager.Changed -= OnTheme;
    }

    private void OnTheme(ThemeDefinition _) => InvalidateVisual();

    protected override void OnRender(DrawingContext dc)
    {
        var t = ThemeManager.Current;
        if (ActualWidth <= 0 || ActualHeight <= 0 || t.ShadowOpacity <= 0) return;
        var card = new Rect(RenderSize);
        var radius = t.CardCornerRadius;
        if (t.ShadowBlur <= 0)
        {
            // Hard comic-style shadow down and to the right.
            var d = t.ShadowDepth * Math.Sqrt(0.5);
            card.Offset(d, d);
            dc.DrawRoundedRectangle(Rendering.BrushCache.Get(t.ShadowColor, t.ShadowOpacity), null, card, radius, radius);
            return;
        }
        card.Offset(0, t.ShadowDepth * 0.6);
        var alpha = t.ShadowOpacity / Layers * 0.9;
        for (var i = Layers; i >= 1; i--)
        {
            var grow = t.ShadowBlur * 0.55 * i / Layers;
            var r = card;
            r.Inflate(grow, grow);
            dc.DrawRoundedRectangle(Rendering.BrushCache.Get(t.ShadowColor, alpha), null, r, radius + grow, radius + grow);
        }
    }
}

/// <summary>
/// Antique gold inner frame with corner flourishes for the ornate theme. Drawn as vector geometry from the element's
/// current size every time it is arranged: the corners keep their size and only the straight edges grow, so the frame
/// never stretches.
/// </summary>
public sealed class OrnateFrame : FrameworkElement
{
    public OrnateFrame()
    {
        IsHitTestVisible = false;
        Loaded += (_, _) => ThemeManager.Changed += OnTheme;
        Unloaded += (_, _) => ThemeManager.Changed -= OnTheme;
    }

    private void OnTheme(ThemeDefinition _) => InvalidateVisual();

    protected override void OnRender(DrawingContext dc)
    {
        var t = ThemeManager.Current;
        var rect = new Rect(RenderSize);
        if (!t.Ornate || rect.Width < 40 || rect.Height < 40) return;

        var inner = new Rect(rect.X + 6.5, rect.Y + 6.5, rect.Width - 13, rect.Height - 13);
        var gold = ThemeManager.Solid(t.Gold);
        var thin = new Pen(ThemeManager.Solid(ThemeDefinition.WithAlpha(t.Gold, 0.55)), 1);
        thin.Freeze();
        dc.DrawRectangle(null, thin, inner);

        var pen = new Pen(gold, 1.6) { StartLineCap = PenLineCap.Round, EndLineCap = PenLineCap.Round };
        pen.Freeze();
        var size = Math.Min(26, Math.Min(rect.Width, rect.Height) / 4);
        Corner(dc, gold, pen, inner.Left, inner.Top, 1, 1, size);
        Corner(dc, gold, pen, inner.Right, inner.Top, -1, 1, size);
        Corner(dc, gold, pen, inner.Left, inner.Bottom, 1, -1, size);
        Corner(dc, gold, pen, inner.Right, inner.Bottom, -1, -1, size);
    }

    /// <summary>A diamond on the corner with two curling scrolls running along the edges.</summary>
    private static void Corner(DrawingContext dc, Brush fill, Pen pen, double x, double y, int dx, int dy, double s)
    {
        var g = new StreamGeometry();
        using (var c = g.Open())
        {
            c.BeginFigure(new Point(x, y - 4 * dy), true, true);
            c.LineTo(new Point(x + 4 * dx, y), true, false);
            c.LineTo(new Point(x, y + 4 * dy), true, false);
            c.LineTo(new Point(x - 4 * dx, y), true, false);
        }
        g.Freeze();
        dc.DrawGeometry(fill, null, g);

        var scrolls = new StreamGeometry();
        using (var c = scrolls.Open())
        {
            c.BeginFigure(new Point(x + 5 * dx, y), false, false);
            c.BezierTo(new Point(x + s * 0.45 * dx, y), new Point(x + s * 0.55 * dx, y + s * 0.35 * dy), new Point(x + s * 0.8 * dx, y + s * 0.2 * dy), true, true);
            c.QuadraticBezierTo(new Point(x + s * dx, y + s * 0.05 * dy), new Point(x + s * 0.85 * dx, y - 1 * dy), true, true);
            c.BeginFigure(new Point(x, y + 5 * dy), false, false);
            c.BezierTo(new Point(x, y + s * 0.45 * dy), new Point(x + s * 0.35 * dx, y + s * 0.55 * dy), new Point(x + s * 0.2 * dx, y + s * 0.8 * dy), true, true);
            c.QuadraticBezierTo(new Point(x + s * 0.05 * dx, y + s * dy), new Point(x - 1 * dx, y + s * 0.85 * dy), true, true);
        }
        scrolls.Freeze();
        dc.DrawGeometry(null, pen, scrolls);

        dc.DrawEllipse(fill, null, new Point(x + s * 0.85 * dx, y - 1 * dy), 1.8, 1.8);
        dc.DrawEllipse(fill, null, new Point(x - 1 * dx, y + s * 0.85 * dy), 1.8, 1.8);
    }
}
