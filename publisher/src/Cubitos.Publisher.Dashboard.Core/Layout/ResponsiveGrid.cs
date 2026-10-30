namespace Cubitos.Publisher.Dashboard.Core.Layout;

/// <summary>Column math for the dashboard's wrapping card grids.</summary>
public static class ResponsiveGrid
{
    /// <summary>
    /// Most columns that keep <paramref name="minItem"/> width, reduced until the items split into full rows
    /// (4 items give 4, 2 or 1 columns, never 3 + 1).
    /// </summary>
    public static int Columns(double width, double minItem, double spacing, int count)
    {
        if (count <= 1) return 1;
        var fit = double.IsFinite(width) ? (int)Math.Floor((width + spacing) / (minItem + spacing)) : count;
        var cols = Math.Clamp(fit, 1, count);
        while (cols > 1 && count % cols != 0) cols--;
        return cols;
    }
}
