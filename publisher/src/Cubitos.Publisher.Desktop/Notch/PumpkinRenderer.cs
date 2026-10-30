using System.Windows;
using System.Windows.Media;
using Cubitos.Publisher.Dashboard.Core.Navigation;
using Cubitos.Publisher.Desktop.Rendering;
using Cubitos.Publisher.Desktop.Themes;

namespace Cubitos.Publisher.Desktop.Notch;

/// <summary>
/// An original flaming jack-o'-lantern: ribbed body, carved glowing face, flame tongues on top and rising ember sparks.
/// The static body and stem are one frozen drawing in units of the body radius, scaled at draw time, so the pumpkin
/// stays crisp at any size; only the flames, face light and sparks are rebuilt per frame. Idle moods come from
/// <see cref="PumpkinIdleCycle"/>; <see cref="Flare"/> adds a burst when the notch opens.
/// </summary>
public sealed class PumpkinRenderer
{
    private const int MaxSparks = 56;
    private static readonly Color SparkHot = ThemeDefinition.Rgb("#ffe27a");
    private static readonly Color SparkMid = ThemeDefinition.Rgb("#fa9c33");
    private static readonly Color SparkCool = ThemeDefinition.Rgb("#f04106");
    private static readonly Color FaceLit = ThemeDefinition.Rgb("#ffd54a");
    private static readonly Color FaceHot = ThemeDefinition.Rgb("#ff7a00");
    private static readonly Brush FlameOuter = ThemeManager.Solid(ThemeDefinition.WithAlpha(ThemeDefinition.Rgb("#e8340c"), 0.88));
    private static readonly Brush FlameMiddle = ThemeManager.Solid(ThemeDefinition.WithAlpha(ThemeDefinition.Rgb("#ff9a1f"), 0.95));
    private static readonly Brush FlameCore = ThemeManager.Solid(ThemeDefinition.Rgb("#fff1a8"));
    private static readonly Drawing BodyAndStem = BuildBody();
    private static readonly Geometry LeftEye = Polygon((-0.5, -0.04), (-0.13, -0.04), (-0.32, -0.38));
    private static readonly Geometry Nose = Polygon((-0.07, 0.1), (0.07, 0.1), (0, -0.02));
    private static readonly Geometry Mouth = Polygon(
        (-0.58, 0.18), (-0.38, 0.27), (-0.3, 0.19), (-0.12, 0.28), (0.12, 0.28), (0.3, 0.19), (0.38, 0.27),
        (0.58, 0.18), (0.44, 0.44), (0.22, 0.53), (0.15, 0.43), (-0.15, 0.43), (-0.22, 0.53), (-0.44, 0.44));

    private readonly Random _random = new(1031);
    private readonly Spark[] _sparks = new Spark[MaxSparks];
    private readonly Dictionary<uint, RadialGradientBrush> _halos = [];
    private double _time;
    private double _flare;
    private double _emitDebt;

    public PumpkinRenderer()
    {
        for (var i = 0; i < MaxSparks; i++) _sparks[i] = new Spark();
    }

    /// <summary>Flame burst + glow pulse, decaying over about a second.</summary>
    public void Flare() => _flare = 1;

    public void Step(double seconds)
    {
        _time += seconds;
        _flare = Math.Max(0, _flare - seconds / 1.1);
        var (mood, phase) = PumpkinIdleCycle.At(_time);
        var rate = 3 + (mood == PumpkinMood.SparkShower ? 40 * Envelope(phase) : 0) + 45 * _flare;
        _emitDebt += rate * seconds;
        while (_emitDebt >= 1)
        {
            Emit();
            _emitDebt -= 1;
        }
        foreach (var s in _sparks)
        {
            if (s.Life <= 0) continue;
            s.Life -= seconds / s.MaxLife;
            s.X += (s.Vx + Math.Sin(_time * 6 + s.Phase) * 0.25) * seconds;
            s.Y += s.Vy * seconds;
            s.Vy *= 1 - 0.6 * seconds;
        }
    }

    /// <summary>Draws the pumpkin with its body centered on <paramref name="center"/> and half-width <paramref name="r"/>.</summary>
    public void Draw(DrawingContext dc, Point center, double r, Color glow)
    {
        var (mood, phase) = PumpkinIdleCycle.At(_time);
        var env = Envelope(phase);
        var flicker = 0.82 + 0.18 * Math.Sin(_time * 13) * Math.Sin(_time * 7.3);
        if (mood == PumpkinMood.Flicker) flicker *= 1 - 0.45 * env * Math.Abs(Math.Sin(_time * 29));
        var flame = 1 + (mood == PumpkinMood.FlameBurst ? 0.9 * env : 0) + 1.1 * _flare;
        var bounce = mood == PumpkinMood.Bounce ? env : 0;
        var wink = mood == PumpkinMood.Wink ? env : 0;
        var boost = 0.8 * _flare + (mood == PumpkinMood.FlameBurst ? 0.4 * env : 0);

        var cx = center.X;
        var cy = center.Y + Math.Sin(_time * 1.7) * 0.07 * r - 0.35 * r * Math.Abs(Math.Sin(phase / 0.3 * Math.PI)) * bounce;

        // Halo.
        var halo = 2.5 * r;
        dc.PushOpacity(Math.Min(0.75, (0.30 + 0.35 * boost) * flicker));
        dc.DrawEllipse(Halo(glow), null, new Point(cx, cy - 0.1 * halo), halo, halo);
        dc.Pop();

        var m = Matrix.Identity;
        if (bounce > 0)
        {
            m.Scale(1 + 0.06 * bounce, 1 - 0.05 * bounce);
            m.Rotate(Math.Sin(phase * Math.PI * 2 * 3) * 9 * bounce);
        }
        m.Scale(r, r);
        m.Translate(cx, cy);
        dc.PushTransform(new MatrixTransform(m));
        Flames(dc, flame);
        dc.DrawDrawing(BodyAndStem);
        Face(dc, flicker, wink);
        dc.Pop();

        // Sparks drift in window space so a bounce does not swing them around.
        var outer = Math.Max(1.6, 0.11 * r);
        var inner = Math.Max(0.8, 0.045 * r);
        foreach (var s in _sparks)
        {
            if (s.Life <= 0) continue;
            var color = s.Life > 0.6 ? SparkHot : s.Life > 0.3 ? SparkMid : SparkCool;
            var p = new Point(cx + s.X * r, cy + s.Y * r);
            dc.DrawEllipse(BrushCache.Get(color, 0.25 * s.Life), null, p, outer, outer);
            dc.DrawEllipse(BrushCache.Get(color, Math.Min(1, 1.3 * s.Life)), null, p, inner, inner);
        }
    }

    /// <summary>Active part of each idle period: rises and falls during its first 30%.</summary>
    private static double Envelope(double phase) => phase < 0.3 ? Math.Sin(phase / 0.3 * Math.PI) : 0;

    private RadialGradientBrush Halo(Color glow)
    {
        var key = (uint)(glow.R << 16 | glow.G << 8 | glow.B);
        if (!_halos.TryGetValue(key, out var brush))
        {
            brush = new RadialGradientBrush(glow, ThemeDefinition.WithAlpha(glow, 0));
            brush.Freeze();
            _halos[key] = brush;
        }
        return brush;
    }

    private void Emit()
    {
        var s = Array.Find(_sparks, p => p.Life <= 0);
        if (s is null) return;
        s.X = (_random.NextDouble() - 0.5) * 0.9;
        s.Y = -0.8 - _random.NextDouble() * 0.7;
        s.Vx = (_random.NextDouble() - 0.5) * 0.8;
        s.Vy = -(0.9 + _random.NextDouble() * 1.4);
        s.MaxLife = 0.6 + _random.NextDouble() * 0.8;
        s.Phase = _random.NextDouble() * 6.28;
        s.Life = 1;
    }

    private void Flames(DrawingContext dc, double scale)
    {
        ReadOnlySpan<double> xs = [-0.4, 0.02, 0.42];
        ReadOnlySpan<double> hs = [0.95, 1.5, 0.9];
        ReadOnlySpan<double> ws = [0.42, 0.56, 0.4];
        const double baseY = -0.55;
        for (var i = 0; i < 3; i++)
        {
            var wave = 0.85 + 0.15 * Math.Sin(_time * 9 + i * 1.9) + 0.08 * Math.Sin(_time * 21 + i * 3.1);
            var h = hs[i] * scale * wave;
            var w = ws[i];
            var sway = Math.Sin(_time * 5 + i * 1.3) * 0.18;
            dc.DrawGeometry(FlameOuter, null, Tongue(xs[i], baseY, w, h, sway));
            dc.DrawGeometry(FlameMiddle, null, Tongue(xs[i], baseY, w * 0.68, h * 0.72, sway * 0.7));
            dc.DrawGeometry(FlameCore, null, Tongue(xs[i], baseY, w * 0.36, h * 0.42, sway * 0.4));
        }
    }

    private static StreamGeometry Tongue(double x, double baseY, double w, double h, double sway)
    {
        var g = new StreamGeometry();
        using (var c = g.Open())
        {
            c.BeginFigure(new Point(x - w / 2, baseY), true, true);
            c.BezierTo(new Point(x - w * 0.62, baseY - h * 0.45), new Point(x + sway - w * 0.12, baseY - h * 0.7), new Point(x + sway, baseY - h), true, true);
            c.BezierTo(new Point(x + sway + w * 0.18, baseY - h * 0.62), new Point(x + w * 0.66, baseY - h * 0.4), new Point(x + w / 2, baseY), true, true);
        }
        g.Freeze();
        return g;
    }

    private void Face(DrawingContext dc, double glow, double wink)
    {
        // Quantized so the light color reuses a handful of cached brushes.
        var level = Math.Round(Math.Clamp(glow, 0, 1) * 16) / 16;
        var light = ThemeDefinition.Lerp(FaceHot, FaceLit, level);

        // Light spilling out of the carvings.
        dc.PushOpacity(0.55 * glow);
        dc.DrawEllipse(Halo(FaceLit), null, new Point(0, 0.15), 0.78, 0.62);
        dc.Pop();

        var brush = BrushCache.Get(light, 1);
        dc.DrawGeometry(brush, null, LeftEye);
        // Right eye winks by squashing towards its base.
        var squash = 1 - 0.85 * wink;
        dc.DrawGeometry(BrushCache.Get(light, 1 - 0.6 * wink), null, Polygon((0.13, -0.04), (0.5, -0.04), (0.32, -0.04 - 0.34 * squash)));
        dc.DrawGeometry(brush, null, Nose);
        dc.DrawGeometry(brush, null, Mouth);
    }

    private static Drawing BuildBody()
    {
        var group = new DrawingGroup();
        using (var dc = group.Open())
        {
            var gradient = new LinearGradientBrush
            {
                StartPoint = new Point(0.3, 0),
                EndPoint = new Point(0.6, 1),
                GradientStops =
                {
                    new GradientStop(ThemeDefinition.Rgb("#ffb049"), 0),
                    new GradientStop(ThemeDefinition.Rgb("#f26b12"), 0.45),
                    new GradientStop(ThemeDefinition.Rgb("#a8350a"), 1),
                },
            };
            gradient.Freeze();
            var outline = new Pen(ThemeManager.Solid(ThemeDefinition.WithAlpha(ThemeDefinition.Rgb("#6e2405"), 0.85)), 0.05);
            outline.Freeze();

            // Outer ribs first so the middle ones overlap them.
            ReadOnlySpan<double> centers = [-0.5, 0.5, -0.24, 0.24, 0];
            ReadOnlySpan<double> halfW = [0.5, 0.5, 0.5, 0.5, 0.46];
            ReadOnlySpan<double> halfH = [0.64, 0.64, 0.71, 0.71, 0.74];
            for (var i = 0; i < centers.Length; i++)
                dc.DrawEllipse(gradient, outline, new Point(centers[i], 0), halfW[i], halfH[i]);
            dc.DrawEllipse(ThemeManager.Solid(ThemeDefinition.WithAlpha(Colors.White, 0.16)), null, new Point(-0.46, -0.25), 0.16, 0.25);

            var stem = new StreamGeometry();
            using (var c = stem.Open())
            {
                c.BeginFigure(new Point(-0.09, -0.68), true, true);
                c.QuadraticBezierTo(new Point(-0.12, -0.92), new Point(0.02, -1.02), true, true);
                c.LineTo(new Point(0.14, -0.96), true, true);
                c.QuadraticBezierTo(new Point(0.05, -0.86), new Point(0.09, -0.68), true, true);
            }
            stem.Freeze();
            var stemPen = new Pen(ThemeManager.Solid(ThemeDefinition.Rgb("#1f2409")), 0.04);
            stemPen.Freeze();
            dc.DrawGeometry(ThemeManager.Solid(ThemeDefinition.Rgb("#3f4a1c")), stemPen, stem);
        }
        group.Freeze();
        return group;
    }

    private static StreamGeometry Polygon(params (double X, double Y)[] points)
    {
        var g = new StreamGeometry();
        using (var c = g.Open())
        {
            c.BeginFigure(new Point(points[0].X, points[0].Y), true, true);
            for (var i = 1; i < points.Length; i++) c.LineTo(new Point(points[i].X, points[i].Y), true, true);
        }
        g.Freeze();
        return g;
    }

    private sealed class Spark
    {
        public double X, Y, Vx, Vy, Life, MaxLife, Phase;
    }
}
