using Cubitos.Publisher.Dashboard.Core.Layout;
using Microsoft.Maui.Layouts;

namespace Cubitos.Publisher.Dashboard.Controls;

/// <summary>Resolves a measured size against the view's explicit, minimum and maximum size requests.</summary>
internal static class LayoutSizing
{
    // IView.Width/Height are the explicit requests; VisualElement.Width/Height would be the last rendered size.
    public static Size Resolve(Microsoft.Maui.ILayout layout, double widthConstraint, double heightConstraint, double width, double height) => new(
        LayoutManager.ResolveConstraints(widthConstraint, layout.Width, width, layout.MinimumWidth, layout.MaximumWidth),
        LayoutManager.ResolveConstraints(heightConstraint, layout.Height, height, layout.MinimumHeight, layout.MaximumHeight));
}

/// <summary>
/// Equal-width cells that wrap to more rows when the width gets small. Children are always measured with the real
/// cell width, so long text wraps inside its cell instead of pushing the layout wider than its parent.
/// </summary>
public sealed class UniformGridLayout : Layout
{
    public static readonly BindableProperty MinItemWidthProperty = BindableProperty.Create(
        nameof(MinItemWidth), typeof(double), typeof(UniformGridLayout), 200.0, propertyChanged: Invalidate);

    public static readonly BindableProperty ColumnSpacingProperty = BindableProperty.Create(
        nameof(ColumnSpacing), typeof(double), typeof(UniformGridLayout), 16.0, propertyChanged: Invalidate);

    public static readonly BindableProperty RowSpacingProperty = BindableProperty.Create(
        nameof(RowSpacing), typeof(double), typeof(UniformGridLayout), 12.0, propertyChanged: Invalidate);

    public double MinItemWidth { get => (double)GetValue(MinItemWidthProperty); set => SetValue(MinItemWidthProperty, value); }
    public double ColumnSpacing { get => (double)GetValue(ColumnSpacingProperty); set => SetValue(ColumnSpacingProperty, value); }
    public double RowSpacing { get => (double)GetValue(RowSpacingProperty); set => SetValue(RowSpacingProperty, value); }

    protected override ILayoutManager CreateLayoutManager() => new Manager(this);

    private static void Invalidate(BindableObject b, object o, object n) => ((UniformGridLayout)b).InvalidateMeasure();

    private sealed class Manager(UniformGridLayout layout) : LayoutManager(layout)
    {
        public override Size Measure(double widthConstraint, double heightConstraint)
        {
            var (_, rows, cellWidth, width) = Plan(widthConstraint);
            var height = rows.Sum() + Math.Max(0, rows.Count - 1) * layout.RowSpacing + layout.Padding.VerticalThickness;
            var finalWidth = double.IsFinite(widthConstraint) ? widthConstraint : width + layout.Padding.HorizontalThickness;
            return LayoutSizing.Resolve(layout, widthConstraint, heightConstraint, finalWidth, height);
        }

        public override Size ArrangeChildren(Rect bounds)
        {
            var (cols, rows, cellWidth, _) = Plan(bounds.Width);
            var children = Visible();
            var y = bounds.Top + layout.Padding.Top;
            for (var i = 0; i < children.Count; i++)
            {
                var row = i / cols;
                if (i > 0 && i % cols == 0) y += rows[row - 1] + layout.RowSpacing;
                var x = bounds.Left + layout.Padding.Left + (i % cols) * (cellWidth + layout.ColumnSpacing);
                children[i].Arrange(new Rect(x, y, cellWidth, rows[row]));
            }
            return bounds.Size;
        }

        private List<IView> Visible() => layout.Where(c => c.Visibility != Visibility.Collapsed).ToList();

        private (int Cols, List<double> Rows, double CellWidth, double Width) Plan(double widthConstraint)
        {
            var children = Visible();
            var inner = double.IsFinite(widthConstraint)
                ? Math.Max(0, widthConstraint - layout.Padding.HorizontalThickness)
                : children.Count * (layout.MinItemWidth + layout.ColumnSpacing);
            var cols = ResponsiveGrid.Columns(inner, layout.MinItemWidth, layout.ColumnSpacing, children.Count);
            var cellWidth = Math.Max(0, (inner - (cols - 1) * layout.ColumnSpacing) / cols);
            var rows = new List<double>();
            for (var i = 0; i < children.Count; i++)
            {
                var h = children[i].Measure(cellWidth, double.PositiveInfinity).Height;
                if (i % cols == 0) rows.Add(h); else rows[^1] = Math.Max(rows[^1], h);
            }
            return (cols, rows, cellWidth, inner);
        }
    }
}

/// <summary>
/// The ranking podium: one equal column per child, shown in <see cref="OrderProperty"/> order and bottom aligned.
/// Every card gets the natural height of the tallest one plus its own <see cref="LiftProperty"/>, so the podium
/// steps survive any width.
/// </summary>
public sealed class PodiumLayout : Layout
{
    public static readonly BindableProperty OrderProperty = BindableProperty.CreateAttached(
        "Order", typeof(int), typeof(PodiumLayout), 0, propertyChanged: InvalidateParent);

    public static readonly BindableProperty LiftProperty = BindableProperty.CreateAttached(
        "Lift", typeof(double), typeof(PodiumLayout), 0.0, propertyChanged: InvalidateParent);

    public static readonly BindableProperty SpacingProperty = BindableProperty.Create(
        nameof(Spacing), typeof(double), typeof(PodiumLayout), 18.0, propertyChanged: (b, _, _) => ((PodiumLayout)b).InvalidateMeasure());

    public static int GetOrder(BindableObject view) => (int)view.GetValue(OrderProperty);
    public static void SetOrder(BindableObject view, int value) => view.SetValue(OrderProperty, value);
    public static double GetLift(BindableObject view) => (double)view.GetValue(LiftProperty);
    public static void SetLift(BindableObject view, double value) => view.SetValue(LiftProperty, value);

    public double Spacing { get => (double)GetValue(SpacingProperty); set => SetValue(SpacingProperty, value); }

    protected override ILayoutManager CreateLayoutManager() => new Manager(this);

    private static void InvalidateParent(BindableObject b, object o, object n) => ((b as Element)?.Parent as PodiumLayout)?.InvalidateMeasure();

    private sealed class Manager(PodiumLayout layout) : LayoutManager(layout)
    {
        public override Size Measure(double widthConstraint, double heightConstraint)
        {
            var (_, _, natural, maxLift) = Plan(widthConstraint);
            var height = natural + maxLift + layout.Padding.VerticalThickness;
            var width = double.IsFinite(widthConstraint) ? widthConstraint : 900;
            return LayoutSizing.Resolve(layout, widthConstraint, heightConstraint, width, height);
        }

        public override Size ArrangeChildren(Rect bounds)
        {
            var (children, cellWidth, natural, _) = Plan(bounds.Width);
            var bottom = bounds.Bottom - layout.Padding.Bottom;
            for (var i = 0; i < children.Count; i++)
            {
                var h = natural + Lift(children[i]);
                var x = bounds.Left + layout.Padding.Left + i * (cellWidth + layout.Spacing);
                children[i].Arrange(new Rect(x, bottom - h, cellWidth, h));
            }
            return bounds.Size;
        }

        private static double Lift(IView v) => v is BindableObject b ? GetLift(b) : 0;

        private (List<IView> Children, double CellWidth, double Natural, double MaxLift) Plan(double widthConstraint)
        {
            var children = layout.Where(c => c.Visibility != Visibility.Collapsed)
                .OrderBy(c => c is BindableObject b ? GetOrder(b) : 0).ToList();
            var inner = double.IsFinite(widthConstraint) ? Math.Max(0, widthConstraint - layout.Padding.HorizontalThickness) : 900;
            var n = Math.Max(1, children.Count);
            var cellWidth = Math.Max(0, (inner - (n - 1) * layout.Spacing) / n);
            var natural = 0.0;
            foreach (var c in children) natural = Math.Max(natural, c.Measure(cellWidth, double.PositiveInfinity).Height);
            return (children, cellWidth, natural, children.Count == 0 ? 0 : children.Max(Lift));
        }
    }
}
