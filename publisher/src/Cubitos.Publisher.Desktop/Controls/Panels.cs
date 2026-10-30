using System.Windows;
using System.Windows.Controls;
using Cubitos.Publisher.Dashboard.Core.Layout;

namespace Cubitos.Publisher.Desktop.Controls;

/// <summary>
/// The ranking podium: one equal column per child, shown in <see cref="OrderProperty"/> order (2 - 1 - 3) and bottom
/// aligned. Every card gets the natural height of the tallest one plus its own <see cref="LiftProperty"/>, so the steps
/// survive any width without the cards ever being stretched or clipped.
/// </summary>
public sealed class PodiumPanel : Panel
{
    public static readonly DependencyProperty OrderProperty = DependencyProperty.RegisterAttached(
        "Order", typeof(int), typeof(PodiumPanel), new FrameworkPropertyMetadata(0, FrameworkPropertyMetadataOptions.AffectsParentArrange));

    public static readonly DependencyProperty LiftProperty = DependencyProperty.RegisterAttached(
        "Lift", typeof(double), typeof(PodiumPanel), new FrameworkPropertyMetadata(0.0, FrameworkPropertyMetadataOptions.AffectsParentMeasure));

    public static readonly DependencyProperty SpacingProperty = DependencyProperty.Register(
        nameof(Spacing), typeof(double), typeof(PodiumPanel), new FrameworkPropertyMetadata(18.0, FrameworkPropertyMetadataOptions.AffectsMeasure));

    public static int GetOrder(DependencyObject d) => (int)d.GetValue(OrderProperty);
    public static void SetOrder(DependencyObject d, int value) => d.SetValue(OrderProperty, value);
    public static double GetLift(DependencyObject d) => (double)d.GetValue(LiftProperty);
    public static void SetLift(DependencyObject d, double value) => d.SetValue(LiftProperty, value);

    public double Spacing { get => (double)GetValue(SpacingProperty); set => SetValue(SpacingProperty, value); }

    private double _natural;

    protected override Size MeasureOverride(Size available)
    {
        var children = Visible();
        var width = double.IsFinite(available.Width) ? available.Width : 900;
        var cell = CellWidth(width, children.Count);
        _natural = 0;
        foreach (var c in children)
        {
            c.Measure(new Size(cell, double.PositiveInfinity));
            _natural = Math.Max(_natural, c.DesiredSize.Height);
        }
        var lift = children.Count == 0 ? 0 : children.Max(GetLift);
        return new Size(double.IsFinite(available.Width) ? available.Width : width, _natural + lift);
    }

    protected override Size ArrangeOverride(Size final)
    {
        var children = Visible().OrderBy(GetOrder).ToList();
        var cell = CellWidth(final.Width, children.Count);
        for (var i = 0; i < children.Count; i++)
        {
            var h = _natural + GetLift(children[i]);
            children[i].Arrange(new Rect(i * (cell + Spacing), final.Height - h, cell, h));
        }
        return final;
    }

    private double CellWidth(double width, int count) => count == 0 ? 0 : Math.Max(0, (width - (count - 1) * Spacing) / count);

    private List<UIElement> Visible() => InternalChildren.Cast<UIElement>().Where(c => c.Visibility != Visibility.Collapsed).ToList();
}

/// <summary>
/// Equal-width cells that wrap into more rows when narrow, always splitting into full rows (4 items: 4, 2 or 1 columns).
/// Children are measured with the real cell width, so long text wraps inside its cell.
/// </summary>
public sealed class EvenWrapPanel : Panel
{
    public static readonly DependencyProperty MinItemWidthProperty = DependencyProperty.Register(
        nameof(MinItemWidth), typeof(double), typeof(EvenWrapPanel), new FrameworkPropertyMetadata(200.0, FrameworkPropertyMetadataOptions.AffectsMeasure));

    public static readonly DependencyProperty ColumnSpacingProperty = DependencyProperty.Register(
        nameof(ColumnSpacing), typeof(double), typeof(EvenWrapPanel), new FrameworkPropertyMetadata(16.0, FrameworkPropertyMetadataOptions.AffectsMeasure));

    public static readonly DependencyProperty RowSpacingProperty = DependencyProperty.Register(
        nameof(RowSpacing), typeof(double), typeof(EvenWrapPanel), new FrameworkPropertyMetadata(12.0, FrameworkPropertyMetadataOptions.AffectsMeasure));

    public double MinItemWidth { get => (double)GetValue(MinItemWidthProperty); set => SetValue(MinItemWidthProperty, value); }
    public double ColumnSpacing { get => (double)GetValue(ColumnSpacingProperty); set => SetValue(ColumnSpacingProperty, value); }
    public double RowSpacing { get => (double)GetValue(RowSpacingProperty); set => SetValue(RowSpacingProperty, value); }

    private readonly List<double> _rows = [];
    private int _cols = 1;

    protected override Size MeasureOverride(Size available)
    {
        var children = Visible();
        var width = double.IsFinite(available.Width) ? available.Width : children.Count * (MinItemWidth + ColumnSpacing);
        _cols = ResponsiveGrid.Columns(width, MinItemWidth, ColumnSpacing, children.Count);
        var cell = Math.Max(0, (width - (_cols - 1) * ColumnSpacing) / _cols);
        _rows.Clear();
        for (var i = 0; i < children.Count; i++)
        {
            children[i].Measure(new Size(cell, double.PositiveInfinity));
            var h = children[i].DesiredSize.Height;
            if (i % _cols == 0) _rows.Add(h); else _rows[^1] = Math.Max(_rows[^1], h);
        }
        return new Size(width, _rows.Sum() + Math.Max(0, _rows.Count - 1) * RowSpacing);
    }

    protected override Size ArrangeOverride(Size final)
    {
        var children = Visible();
        var cell = Math.Max(0, (final.Width - (_cols - 1) * ColumnSpacing) / _cols);
        var y = 0.0;
        for (var i = 0; i < children.Count; i++)
        {
            var row = i / _cols;
            if (i > 0 && i % _cols == 0) y += _rows[row - 1] + RowSpacing;
            var h = row < _rows.Count ? _rows[row] : children[i].DesiredSize.Height;
            children[i].Arrange(new Rect(i % _cols * (cell + ColumnSpacing), y, cell, h));
        }
        return final;
    }

    private List<UIElement> Visible() => InternalChildren.Cast<UIElement>().Where(c => c.Visibility != Visibility.Collapsed).ToList();
}
