using System.Windows;
using System.Windows.Media;
using Cubitos.Publisher.Desktop.Rendering;
using Cubitos.Publisher.Desktop.Themes;

namespace Cubitos.Publisher.Desktop.Notch;

/// <summary>
/// Light burst on the panel's left edge, at the notch's height, while the panel opens or closes: a glow that swells
/// from the notch and a bright seam along the edge, strongest mid-animation and gone when the panel is at rest.
/// </summary>
public sealed class EmergeGlow : VisualLayer
{
    private static readonly Dictionary<Color, RadialGradientBrush> Brushes = [];
    private double _open = 1;

    public EmergeGlow() => IsHitTestVisible = false;

    public double Open
    {
        get => _open;
        set
        {
            if (Math.Abs(value - _open) < 0.001) return;
            _open = value;
            Redraw();
        }
    }

    protected override void Draw(DrawingContext dc, Size size)
    {
        var o = Math.Clamp(_open, 0, 1);
        var strength = Math.Sin(Math.PI * o);
        if (strength < 0.01) return;
        var glow = ThemeManager.Current.NotchGlow;
        var center = new Point(0, size.Height / 2);
        var r = 140 + size.Width * 0.45 * o;

        dc.PushOpacity(0.38 * strength);
        dc.DrawEllipse(Brush(glow), null, center, r, r * 0.8);
        dc.Pop();
        dc.DrawRectangle(BrushCache.Get(glow, 0.8 * strength), null, new Rect(0, 0, 3, size.Height));
    }

    private static RadialGradientBrush Brush(Color c)
    {
        if (!Brushes.TryGetValue(c, out var brush))
        {
            brush = new RadialGradientBrush(c, ThemeDefinition.WithAlpha(c, 0));
            brush.Freeze();
            Brushes[c] = brush;
        }
        return brush;
    }
}
