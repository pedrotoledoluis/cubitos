using Cubitos.Publisher.Dashboard.Core.Layout;

namespace Cubitos.Publisher.Dashboard.Tests;

public class ResponsiveGridTests
{
    [Theory]
    [InlineData(400, 76, 8, 4, 4)]   // wide card: one row
    [InlineData(250, 76, 8, 4, 2)]   // 3 would fit, but 3 + 1 is uneven: 2 x 2
    [InlineData(120, 76, 8, 4, 1)]
    [InlineData(1000, 220, 18, 3, 3)]
    [InlineData(500, 220, 18, 3, 1)] // 2 would leave 2 + 1
    [InlineData(100, 76, 8, 0, 1)]
    public void Columns_fit_the_width_and_split_evenly(double width, double min, double spacing, int count, int expected) =>
        Assert.Equal(expected, ResponsiveGrid.Columns(width, min, spacing, count));

    [Fact]
    public void Columns_without_a_width_limit_use_one_row() =>
        Assert.Equal(4, ResponsiveGrid.Columns(double.PositiveInfinity, 76, 8, 4));
}
