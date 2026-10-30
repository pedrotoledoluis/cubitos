using System.Globalization;
using System.Windows;
using System.Windows.Media;
using Cubitos.Publisher.Dashboard.Core.Formatting;
using Cubitos.Publisher.Dashboard.Core.Model;
using Cubitos.Publisher.Desktop.Rendering;
using Cubitos.Publisher.Desktop.Themes;

namespace Cubitos.Publisher.Desktop.Controls;

/// <summary>
/// Base of the vector charts: renders from the current size in <see cref="OnRender"/> (so a window resize only replays
/// a cheap drawing, never rebuilds visuals), repaints on theme change and can keep an aspect ratio through layout.
/// </summary>
public abstract class ChartElement : FrameworkElement
{
    public static readonly DependencyProperty AspectRatioProperty = DependencyProperty.Register(
        nameof(AspectRatio), typeof(double), typeof(ChartElement), new FrameworkPropertyMetadata(0.0, FrameworkPropertyMetadataOptions.AffectsMeasure));

    protected ChartElement()
    {
        Loaded += (_, _) => ThemeManager.Changed += OnTheme;
        Unloaded += (_, _) => ThemeManager.Changed -= OnTheme;
    }

    /// <summary>Height as a fraction of the width (0 = whatever the layout gives), clamped by MinHeight/MaxHeight.</summary>
    public double AspectRatio { get => (double)GetValue(AspectRatioProperty); set => SetValue(AspectRatioProperty, value); }

    private void OnTheme(ThemeDefinition _) => InvalidateVisual();

    protected override Size MeasureOverride(Size available)
    {
        if (AspectRatio <= 0) return new Size(0, 0);
        var width = double.IsFinite(available.Width) ? available.Width : 600;
        var height = Math.Clamp(width * AspectRatio, MinHeight, double.IsFinite(MaxHeight) ? MaxHeight : double.MaxValue);
        return new Size(width, height);
    }

    protected FormattedText Text(string text, double size, Brush brush, FontFamily? family = null, FontWeight? weight = null) =>
        new(text, CultureInfo.CurrentUICulture, FlowDirection.LeftToRight,
            new Typeface(family ?? ThemeManager.Current.BodyFont, FontStyles.Normal, weight ?? FontWeights.SemiBold, FontStretches.Normal),
            size, brush, VisualTreeHelper.GetDpi(this).PixelsPerDip);

    /// <summary>Draws text centered (horizontally and vertically) in a box.</summary>
    protected static void Centered(DrawingContext dc, FormattedText text, Rect box) =>
        dc.DrawText(text, new Point(box.X + (box.Width - text.Width) / 2, box.Y + (box.Height - text.Height) / 2));

    protected static Pen Stroke(Color color, double thickness, double alpha = 1) =>
        new(BrushCache.Get(color, alpha), thickness) { LineJoin = PenLineJoin.Round, StartLineCap = PenLineCap.Round, EndLineCap = PenLineCap.Round };

    protected static LinearGradientBrush VerticalFade(Color color, double top, double bottom)
    {
        var b = new LinearGradientBrush(ThemeDefinition.WithAlpha(color, top), ThemeDefinition.WithAlpha(color, bottom), 90);
        b.Freeze();
        return b;
    }
}

/// <summary>Small area chart of the last 24 hourly view counts.</summary>
public sealed class Sparkline : ChartElement
{
    public static readonly DependencyProperty ValuesProperty = DependencyProperty.Register(
        nameof(Values), typeof(IReadOnlyList<double>), typeof(Sparkline), new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.AffectsRender));

    public IReadOnlyList<double>? Values { get => (IReadOnlyList<double>?)GetValue(ValuesProperty); set => SetValue(ValuesProperty, value); }

    protected override void OnRender(DrawingContext dc)
    {
        var values = Values;
        if (values is not { Count: >= 2 } || ActualWidth < 8 || ActualHeight < 8) return;
        var t = ThemeManager.Current;
        var max = values.Max();
        var area = new Rect(2, 4, ActualWidth - 4, ActualHeight - 8);
        double X(int i) => area.Left + area.Width * i / (values.Count - 1);
        double Y(double v) => max <= 0 ? area.Bottom : area.Bottom - v / max * area.Height;

        var line = new StreamGeometry();
        var fill = new StreamGeometry();
        using (var c = line.Open())
        {
            c.BeginFigure(new Point(X(0), Y(values[0])), false, false);
            for (var i = 1; i < values.Count; i++) c.LineTo(new Point(X(i), Y(values[i])), true, true);
        }
        using (var c = fill.Open())
        {
            c.BeginFigure(new Point(area.Left, area.Bottom), true, true);
            for (var i = 0; i < values.Count; i++) c.LineTo(new Point(X(i), Y(values[i])), true, false);
            c.LineTo(new Point(area.Right, area.Bottom), true, false);
        }
        line.Freeze();
        fill.Freeze();
        dc.DrawGeometry(VerticalFade(t.ChartPrimary, 0.45, 0.02), null, fill);
        dc.DrawGeometry(null, Stroke(max <= 0 ? t.CardMuted : t.ChartPrimary, 2), line);
        dc.DrawEllipse(BrushCache.Get(t.ChartPrimary, 1), null, new Point(X(values.Count - 1), Y(values[^1])), 3, 3);
    }
}

/// <summary>Rank badge: a cube (Cubitos), a heraldic shield (ornate) or a glowing ring (neon).</summary>
public sealed class Crest : ChartElement
{
    public static readonly DependencyProperty PositionProperty = DependencyProperty.Register(
        nameof(Position), typeof(int), typeof(Crest), new FrameworkPropertyMetadata(1, FrameworkPropertyMetadataOptions.AffectsRender));

    public int Position { get => (int)GetValue(PositionProperty); set => SetValue(PositionProperty, value); }

    protected override void OnRender(DrawingContext dc)
    {
        var t = ThemeManager.Current;
        var side = Math.Min(ActualWidth, ActualHeight) - 8;
        if (side <= 4) return;
        var color = t.RankColor(Position);
        var label = t.RomanRanks && Position is > 0 and < 40 ? ToRoman(Position) : Position.ToString(CultureInfo.InvariantCulture);
        var box = new Rect(ActualWidth / 2 - side / 2, ActualHeight / 2 - side / 2, side, side);

        if (t.Ornate) Shield(dc, box, color, t);
        else if (t.NeonGrid) Ring(dc, box, color);
        else Cube(dc, box, color);

        var fg = t.NeonGrid ? color : ThemeDefinition.ContrastText(color);
        var text = Text(label, side * (label.Length > 2 ? 0.3 : 0.42), BrushCache.Get(fg, 1), t.HeadingFont, FontWeights.Black);
        Centered(dc, text, t.Ornate ? new Rect(box.X, box.Y - side * 0.04, box.Width, box.Height * 0.9) : box);
    }

    private static string ToRoman(int n)
    {
        var text = new string('X', n / 10);
        return text + (n % 10) switch { 1 => "I", 2 => "II", 3 => "III", 4 => "IV", 5 => "V", 6 => "VI", 7 => "VII", 8 => "VIII", 9 => "IX", _ => "" };
    }

    private static void Cube(DrawingContext dc, Rect box, Color color)
    {
        dc.PushTransform(new RotateTransform(-4, box.X + box.Width / 2, box.Y + box.Height / 2));
        dc.DrawRoundedRectangle(Brushes.Black, null, new Rect(box.X + 4, box.Y + 5, box.Width, box.Height), 8, 8);
        dc.DrawRoundedRectangle(BrushCache.Get(color, 1), new Pen(Brushes.Black, 3), box, 8, 8);
        dc.DrawRoundedRectangle(BrushCache.Get(Colors.White, 0.25), null, new Rect(box.X + 4, box.Y + 4, box.Width - 8, box.Height * 0.22), 5, 5);
        dc.Pop();
    }

    private static void Shield(DrawingContext dc, Rect b, Color color, ThemeDefinition t)
    {
        var cx = b.X + b.Width / 2;
        var g = new StreamGeometry();
        using (var c = g.Open())
        {
            c.BeginFigure(new Point(b.Left + b.Width * 0.08, b.Top + b.Height * 0.06), true, true);
            c.LineTo(new Point(b.Right - b.Width * 0.08, b.Top + b.Height * 0.06), true, true);
            c.LineTo(new Point(b.Right - b.Width * 0.08, b.Top + b.Height * 0.45), true, true);
            c.BezierTo(new Point(b.Right - b.Width * 0.1, b.Top + b.Height * 0.75), new Point(cx + b.Width * 0.15, b.Bottom - b.Height * 0.08), new Point(cx, b.Bottom), true, true);
            c.BezierTo(new Point(cx - b.Width * 0.15, b.Bottom - b.Height * 0.08), new Point(b.Left + b.Width * 0.1, b.Top + b.Height * 0.75), new Point(b.Left + b.Width * 0.08, b.Top + b.Height * 0.45), true, true);
        }
        g.Freeze();

        dc.PushTransform(new TranslateTransform(0, 3));
        dc.DrawGeometry(BrushCache.Get(Colors.Black, 0.45), null, g);
        dc.Pop();
        var light = ThemeDefinition.Lerp(color, Colors.White, 0.3);
        var dark = ThemeDefinition.Lerp(color, Colors.Black, 0.45);
        var fill = new LinearGradientBrush(light, dark, 90);
        fill.Freeze();
        dc.DrawGeometry(fill, new Pen(BrushCache.Get(ThemeDefinition.Rgb("#3a2210"), 1), 2), g);
        dc.DrawLine(new Pen(BrushCache.Get(t.Gold, 0.8), 1),
            new Point(b.Left + b.Width * 0.18, b.Top + b.Height * 0.16), new Point(b.Right - b.Width * 0.18, b.Top + b.Height * 0.16));
    }

    private static void Ring(DrawingContext dc, Rect b, Color color)
    {
        var c = new Point(b.X + b.Width / 2, b.Y + b.Height / 2);
        var r = b.Width / 2 - 3;
        dc.DrawEllipse(BrushCache.Get(color, 0.12), null, c, r, r);
        dc.DrawEllipse(null, new Pen(BrushCache.Get(color, 0.25), 9), c, r, r);
        dc.DrawEllipse(null, new Pen(BrushCache.Get(color, 1), 3), c, r, r);
    }
}

/// <summary>7 x 24 grid of views per Peru weekday and hour, with hour labels and a legend.</summary>
public sealed class HeatmapChart : ChartElement
{
    public static readonly DependencyProperty ModelProperty = DependencyProperty.Register(
        nameof(Model), typeof(HeatmapModel), typeof(HeatmapChart), new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.AffectsRender));

    public HeatmapModel? Model { get => (HeatmapModel?)GetValue(ModelProperty); set => SetValue(ModelProperty, value); }

    protected override void OnRender(DrawingContext dc)
    {
        var t = ThemeManager.Current;
        const double labelW = 44, headerH = 22, legendH = 44, gap = 3;
        var rect = new Rect(RenderSize);
        var grid = new Rect(labelW, headerH, Math.Max(0, rect.Width - labelW - 4), Math.Max(0, rect.Height - headerH - legendH));
        if (grid.Width < 60 || grid.Height < 30) return;
        var cw = (grid.Width - gap * 23) / 24;
        var ch = (grid.Height - gap * 6) / 7;
        var max = Model?.Max ?? 0;
        var best = Model?.BestHours ?? [];
        var muted = BrushCache.Get(t.CardMuted, 1);

        for (var h = 0; h < 24; h++)
        {
            var cell = new Rect(grid.Left + h * (cw + gap), 0, cw, headerH - 4);
            var isBest = best.Contains(h);
            if (isBest) dc.DrawRoundedRectangle(BrushCache.Get(t.Accent, 1), null, new Rect(cell.X, 1, cw, headerH - 5), 4, 4);
            Centered(dc, Text(h.ToString("00", CultureInfo.InvariantCulture), 11, isBest ? BrushCache.Get(t.AccentText, 1) : muted), cell);
        }

        for (var d = 0; d < 7; d++)
        {
            var y = grid.Top + d * (ch + gap);
            var day = Text(PeruFormat.WeekdaysMondayFirst[d], 12, muted);
            dc.DrawText(day, new Point(labelW - 8 - day.Width, y + (ch - day.Height) / 2));
            for (var h = 0; h < 24; h++)
            {
                var v = Model?.Cells[d, h] ?? 0;
                // Square root keeps quiet hours visible next to one viral hour.
                var color = t.Heat(max > 0 ? Math.Sqrt(v / max) : 0);
                // Plain rectangles: axis-aligned fills are the cheapest thing to re-render while the window resizes.
                dc.DrawRectangle(BrushCache.Get(color, 1), null, new Rect(grid.Left + h * (cw + gap), y, cw, ch));
            }
        }

        // Legend.
        var ly = rect.Bottom - legendH + 16;
        var less = Text("menos", 12, muted);
        dc.DrawText(less, new Point(grid.Left, ly + 8 - less.Height / 2));
        var bar = new Rect(grid.Left + 52, ly + 2, Math.Min(320, grid.Width * 0.4), 12);
        var stops = new GradientStopCollection(t.HeatStops.Select((c, i) => new GradientStop(c, (double)i / (t.HeatStops.Length - 1))));
        var legend = new LinearGradientBrush(stops, 0);
        legend.Freeze();
        dc.DrawRoundedRectangle(legend, null, bar, 6, 6);
        var more = Text("más", 12, muted);
        dc.DrawText(more, new Point(bar.Right + 8, ly + 8 - more.Height / 2));
        var caption = Text(max > 0 ? $"máximo: {NumberFormat.Views(max)} vistas en una hora" : "sin vistas registradas todavía", 12, muted);
        caption.MaxTextWidth = Math.Max(10, rect.Width - (bar.Right + 50));
        caption.MaxLineCount = 1;
        caption.Trimming = TextTrimming.CharacterEllipsis;
        dc.DrawText(caption, new Point(bar.Right + 50, ly + 8 - caption.Height / 2));
    }
}

/// <summary>Cumulative views by hour since publish for one video, over the channel average.</summary>
public sealed class FirstDayChart : ChartElement
{
    public static readonly DependencyProperty VideoProperty = DependencyProperty.Register(
        nameof(Video), typeof(IReadOnlyList<double>), typeof(FirstDayChart), new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.AffectsRender));

    public static readonly DependencyProperty AverageProperty = DependencyProperty.Register(
        nameof(Average), typeof(IReadOnlyList<double>), typeof(FirstDayChart), new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.AffectsRender));

    public IReadOnlyList<double>? Video { get => (IReadOnlyList<double>?)GetValue(VideoProperty); set => SetValue(VideoProperty, value); }
    public IReadOnlyList<double>? Average { get => (IReadOnlyList<double>?)GetValue(AverageProperty); set => SetValue(AverageProperty, value); }

    protected override void OnRender(DrawingContext dc)
    {
        var t = ThemeManager.Current;
        var rect = new Rect(RenderSize);
        var plot = new Rect(64, 12, Math.Max(0, rect.Width - 84), Math.Max(0, rect.Height - 44));
        if (plot.Width < 40 || plot.Height < 40) return;
        var video = Video;
        var average = Average;
        var max = Math.Max(video is { Count: > 0 } ? video.Max() : 0, average is { Count: > 0 } ? average.Max() : 0);
        var top = NiceCeiling(max);
        double X(double hour) => plot.Left + plot.Width * hour / 24;
        double Y(double v) => plot.Bottom - plot.Height * v / top;
        var muted = BrushCache.Get(t.CardMuted, 1);

        for (var i = 0; i <= 4; i++)
        {
            var v = top * i / 4;
            dc.DrawLine(new Pen(BrushCache.Get(t.GridLine, i == 0 ? 1 : 0.55), 1), new Point(plot.Left, Y(v)), new Point(plot.Right, Y(v)));
            var label = Text(NumberFormat.Views(v), 12, muted);
            dc.DrawText(label, new Point(56 - label.Width, Y(v) - label.Height / 2));
        }
        for (var h = 0; h <= 24; h += 3)
            Centered(dc, Text($"{h} h", 12, muted), new Rect(X(h) - 20, plot.Bottom + 8, 40, 18));

        if (average is { Count: > 0 })
        {
            var pen = Stroke(t.ChartSecondary, 2.5);
            pen.DashStyle = new DashStyle([2.4, 2], 0);
            pen.DashCap = PenLineCap.Flat;
            dc.DrawGeometry(null, pen, Line(average, X, Y, close: false));
        }

        if (video is { Count: > 0 })
        {
            var fill = Line(video, X, Y, close: true, bottom: plot.Bottom);
            dc.DrawGeometry(VerticalFade(t.ChartPrimary, 0.35, 0.02), null, fill);
            var line = Line(video, X, Y, close: false);
            if (t.NeonGrid || t.Ornate) dc.DrawGeometry(null, Stroke(t.ChartPrimary, 10, 0.18), line);
            dc.DrawGeometry(null, Stroke(t.ChartPrimary, 3.5), line);
            var dot = BrushCache.Get(t.ChartPrimary, 1);
            for (var h = 0; h < video.Count; h++) dc.DrawEllipse(dot, null, new Point(X(h + 1), Y(video[h])), 3.5, 3.5);
        }
        else
        {
            Centered(dc, Text("Elige un video para ver su curva", 15, muted), plot);
        }
    }

    /// <summary>Starts at (0, 0); point i is the total at the end of hour i + 1.</summary>
    private static StreamGeometry Line(IReadOnlyList<double> values, Func<double, double> x, Func<double, double> y, bool close, double bottom = 0)
    {
        var g = new StreamGeometry();
        using (var c = g.Open())
        {
            c.BeginFigure(new Point(x(0), y(0)), close, close);
            for (var h = 0; h < values.Count; h++) c.LineTo(new Point(x(h + 1), y(values[h])), true, true);
            if (close)
            {
                c.LineTo(new Point(x(values.Count), bottom), true, false);
                c.LineTo(new Point(x(0), bottom), true, false);
            }
        }
        g.Freeze();
        return g;
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
