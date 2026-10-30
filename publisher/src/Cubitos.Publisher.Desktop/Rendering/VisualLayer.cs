using System.Windows;
using System.Windows.Media;

namespace Cubitos.Publisher.Desktop.Rendering;

/// <summary>
/// Lightweight host of one <see cref="DrawingVisual"/>. Redrawing it (<see cref="Redraw"/>) replaces the visual's
/// drawing instructions without invalidating layout, which is what per-frame animation needs.
/// </summary>
public abstract class VisualLayer : FrameworkElement
{
    private readonly DrawingVisual _visual = new();

    protected VisualLayer()
    {
        AddVisualChild(_visual);
        SizeChanged += (_, _) => Redraw();
    }

    protected override int VisualChildrenCount => 1;

    protected override Visual GetVisualChild(int index) => _visual;

    /// <summary>Re-renders the layer at its current size.</summary>
    public void Redraw()
    {
        using var dc = _visual.RenderOpen();
        var size = RenderSize;
        if (size.Width > 0 && size.Height > 0) Draw(dc, size);
    }

    protected abstract void Draw(DrawingContext dc, Size size);
}

/// <summary>Frozen solid brushes per color and quantized alpha, so particles never allocate brushes per frame.</summary>
public static class BrushCache
{
    private const int Levels = 32;
    private static readonly Dictionary<(uint Color, int Level), SolidColorBrush> Cache = [];

    public static SolidColorBrush Get(Color color, double alpha)
    {
        var level = (int)Math.Round(Math.Clamp(alpha, 0, 1) * Levels);
        var key = ((uint)(color.R << 16 | color.G << 8 | color.B), level);
        if (!Cache.TryGetValue(key, out var brush))
        {
            brush = new SolidColorBrush(Color.FromArgb((byte)(255 * level / Levels), color.R, color.G, color.B));
            brush.Freeze();
            Cache[key] = brush;
        }
        return brush;
    }

    public static Pen Pen(Brush brush, double thickness)
    {
        var pen = new Pen(brush, thickness) { StartLineCap = PenLineCap.Round, EndLineCap = PenLineCap.Round, LineJoin = PenLineJoin.Round };
        pen.Freeze();
        return pen;
    }
}
