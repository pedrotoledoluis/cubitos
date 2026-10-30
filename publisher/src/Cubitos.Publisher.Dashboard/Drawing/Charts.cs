using Cubitos.Publisher.Dashboard.Core.Formatting;
using Cubitos.Publisher.Dashboard.Core.Model;
using Cubitos.Publisher.Dashboard.Themes;

namespace Cubitos.Publisher.Dashboard.Drawing;

/// <summary>Small area chart of the last 24 hourly view counts.</summary>
public sealed class SparklineDrawable(IReadOnlyList<double> values) : IDrawable
{
    public void Draw(ICanvas canvas, RectF rect)
    {
        var t = ThemeManager.Current;
        if (values.Count < 2) return;
        var max = values.Max();
        var area = rect.Inflate(-2, -4);
        float X(int i) => area.Left + area.Width * i / (values.Count - 1);
        float Y(double v) => max <= 0 ? area.Bottom : area.Bottom - (float)(v / max) * area.Height;

        var line = new PathF();
        line.MoveTo(X(0), Y(values[0]));
        for (var i = 1; i < values.Count; i++) line.LineTo(X(i), Y(values[i]));

        var fill = new PathF(line);
        fill.LineTo(area.Right, area.Bottom);
        fill.LineTo(area.Left, area.Bottom);
        fill.Close();
        canvas.SetFillPaint(new LinearGradientPaint(
            [new PaintGradientStop(0, t.ChartPrimary.WithAlpha(0.45f)), new PaintGradientStop(1, t.ChartPrimary.WithAlpha(0.02f))],
            new Point(0, 0), new Point(0, 1)), area);
        canvas.FillPath(fill);

        canvas.StrokeColor = max <= 0 ? t.CardMuted : t.ChartPrimary;
        canvas.StrokeSize = 2;
        canvas.StrokeLineJoin = LineJoin.Round;
        canvas.DrawPath(line);
        canvas.FillColor = t.ChartPrimary;
        canvas.FillCircle(X(values.Count - 1), Y(values[^1]), 3);
    }
}

/// <summary>7 x 24 grid of views per Peru weekday and hour, with hour labels and a legend.</summary>
public sealed class HeatmapDrawable : IDrawable
{
    public HeatmapModel? Model { get; set; }

    public void Draw(ICanvas canvas, RectF rect)
    {
        var t = ThemeManager.Current;
        const float labelW = 44, headerH = 22, legendH = 44, gap = 3;
        var grid = new RectF(rect.Left + labelW, rect.Top + headerH, rect.Width - labelW - 4, rect.Height - headerH - legendH);
        var cw = (grid.Width - gap * 23) / 24;
        var ch = (grid.Height - gap * 6) / 7;
        var max = Model?.Max ?? 0;
        var best = Model?.BestHours ?? [];

        canvas.Font = new Microsoft.Maui.Graphics.Font(t.DrawingFont, 600);
        canvas.FontSize = 11;
        canvas.FontColor = t.CardMuted;
        for (var h = 0; h < 24; h++)
        {
            var x = grid.Left + h * (cw + gap);
            if (best.Contains(h))
            {
                canvas.FillColor = t.Accent;
                canvas.FillRoundedRectangle(x, rect.Top + 1, cw, headerH - 5, 4);
                canvas.FontColor = t.AccentText;
            }
            else canvas.FontColor = t.CardMuted;
            canvas.DrawString(h.ToString("00"), x, rect.Top, cw, headerH - 3, HorizontalAlignment.Center, VerticalAlignment.Center);
        }

        for (var d = 0; d < 7; d++)
        {
            var y = grid.Top + d * (ch + gap);
            canvas.FontColor = t.CardMuted;
            canvas.FontSize = 12;
            canvas.DrawString(PeruFormat.WeekdaysMondayFirst[d], rect.Left, y, labelW - 8, ch, HorizontalAlignment.Right, VerticalAlignment.Center);
            for (var h = 0; h < 24; h++)
            {
                var v = Model?.Cells[d, h] ?? 0;
                // Square root keeps quiet hours visible next to one viral hour.
                canvas.FillColor = t.Heat(max > 0 ? Math.Sqrt(v / max) : 0);
                canvas.FillRoundedRectangle(grid.Left + h * (cw + gap), y, cw, ch, t.Ornate ? 2 : 5);
            }
        }

        // Legend.
        var ly = rect.Bottom - legendH + 16;
        var lx = grid.Left;
        var lw = Math.Min(320f, grid.Width * 0.4f);
        canvas.FontSize = 12;
        canvas.FontColor = t.CardMuted;
        canvas.DrawString("menos", lx, ly - 2, 50, 18, HorizontalAlignment.Left, VerticalAlignment.Center);
        var bar = new RectF(lx + 52, ly + 2, lw, 12);
        var stops = t.HeatStops.Select((c, i) => new PaintGradientStop((float)i / (t.HeatStops.Length - 1), c)).ToArray();
        canvas.SetFillPaint(new LinearGradientPaint(stops, new Point(0, 0), new Point(1, 0)), bar);
        canvas.FillRoundedRectangle(bar, 6);
        canvas.DrawString("más", bar.Right + 8, ly - 2, 40, 18, HorizontalAlignment.Left, VerticalAlignment.Center);
        canvas.DrawString(max > 0 ? $"máximo: {NumberFormat.Views(max)} vistas en una hora" : "sin vistas registradas todavía",
            bar.Right + 50, ly - 2, 360, 18, HorizontalAlignment.Left, VerticalAlignment.Center);
    }
}

/// <summary>Cumulative views by hour since publish for one video, over the channel average.</summary>
public sealed class FirstDayChartDrawable : IDrawable
{
    public IReadOnlyList<double>? Video { get; set; }
    public IReadOnlyList<double>? Average { get; set; }

    public void Draw(ICanvas canvas, RectF rect)
    {
        var t = ThemeManager.Current;
        var plot = new RectF(rect.Left + 64, rect.Top + 12, rect.Width - 84, rect.Height - 44);
        var max = Math.Max(Video?.DefaultIfEmpty(0).Max() ?? 0, Average?.DefaultIfEmpty(0).Max() ?? 0);
        var top = NiceCeiling(max);
        float X(double hour) => plot.Left + plot.Width * (float)(hour / 24);
        float Y(double v) => plot.Bottom - plot.Height * (float)(v / top);

        canvas.Font = new Microsoft.Maui.Graphics.Font(t.DrawingFont, 600);
        canvas.FontSize = 12;
        canvas.FontColor = t.CardMuted;
        canvas.StrokeSize = 1;
        for (var i = 0; i <= 4; i++)
        {
            var v = top * i / 4;
            canvas.StrokeColor = t.GridLine.WithAlpha(i == 0 ? 1f : 0.55f);
            canvas.DrawLine(plot.Left, Y(v), plot.Right, Y(v));
            canvas.DrawString(NumberFormat.Views(v), rect.Left, Y(v) - 9, 56, 18, HorizontalAlignment.Right, VerticalAlignment.Center);
        }
        for (var h = 0; h <= 24; h += 3)
            canvas.DrawString($"{h} h", X(h) - 20, plot.Bottom + 8, 40, 18, HorizontalAlignment.Center, VerticalAlignment.Center);

        if (Average is { Count: > 0 } avg)
        {
            canvas.StrokeColor = t.ChartSecondary;
            canvas.StrokeSize = 2.5f;
            canvas.StrokeDashPattern = [6, 5];
            canvas.DrawPath(Line(avg, X, Y));
            canvas.StrokeDashPattern = null;
        }

        if (Video is { Count: > 0 } video)
        {
            var line = Line(video, X, Y);
            var fill = new PathF(line);
            fill.LineTo(X(video.Count), plot.Bottom);
            fill.LineTo(X(0), plot.Bottom);
            fill.Close();
            canvas.SetFillPaint(new LinearGradientPaint(
                [new PaintGradientStop(0, t.ChartPrimary.WithAlpha(0.35f)), new PaintGradientStop(1, t.ChartPrimary.WithAlpha(0.02f))],
                new Point(0, 0), new Point(0, 1)), plot);
            canvas.FillPath(fill);

            canvas.SaveState();
            if (t.NeonGrid || t.Ornate) canvas.SetShadow(SizeF.Zero, 10, t.ChartPrimary);
            canvas.StrokeColor = t.ChartPrimary;
            canvas.StrokeSize = 3.5f;
            canvas.StrokeLineJoin = LineJoin.Round;
            canvas.DrawPath(line);
            canvas.RestoreState();
            canvas.FillColor = t.ChartPrimary;
            for (var h = 0; h < video.Count; h++) canvas.FillCircle(X(h + 1), Y(video[h]), 3.5f);
        }
        else
        {
            canvas.FontSize = 15;
            canvas.DrawString("Elige un video para ver su curva", plot, HorizontalAlignment.Center, VerticalAlignment.Center);
        }
    }

    /// <summary>Starts at (0, 0); point i is the total at the end of hour i + 1.</summary>
    private static PathF Line(IReadOnlyList<double> values, Func<double, float> x, Func<double, float> y)
    {
        var path = new PathF();
        path.MoveTo(x(0), y(0));
        for (var h = 0; h < values.Count; h++) path.LineTo(x(h + 1), y(values[h]));
        return path;
    }

    private static double NiceCeiling(double max)
    {
        if (max <= 0) return 10;
        var magnitude = Math.Pow(10, Math.Floor(Math.Log10(max)));
        foreach (var step in (double[])[1, 2, 2.5, 5, 10])
            if (step * magnitude >= max) return step * magnitude;
        return 10 * magnitude;
    }
}
