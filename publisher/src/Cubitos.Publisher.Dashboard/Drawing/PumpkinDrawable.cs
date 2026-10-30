using Cubitos.Publisher.Dashboard.Core.Navigation;

namespace Cubitos.Publisher.Dashboard.Drawing;

/// <summary>
/// An original flaming jack-o'-lantern drawn with paths: ribbed body, carved glowing face, flame tongues on top and
/// rising ember sparks. Everything is in units of the body radius, so it scales without distortion. Idle moods come
/// from <see cref="PumpkinIdleCycle"/>; <see cref="Flare"/> adds a burst when the notch opens.
/// </summary>
public sealed class PumpkinDrawable
{
    private const int MaxSparks = 56;
    private readonly Random _random = new(1031);
    private readonly Spark[] _sparks = new Spark[MaxSparks];
    private float _time;
    private float _flare;
    private float _emitDebt;

    public PumpkinDrawable()
    {
        for (var i = 0; i < MaxSparks; i++) _sparks[i] = new Spark();
    }

    /// <summary>Flame burst + glow pulse, decaying over about a second.</summary>
    public void Flare() => _flare = 1;

    public void Step(float seconds)
    {
        _time += seconds;
        _flare = Math.Max(0, _flare - seconds / 1.1f);
        var (mood, phase) = PumpkinIdleCycle.At(_time);
        var rate = 3f + (mood == PumpkinMood.SparkShower ? 40 * Envelope(phase) : 0) + 45 * _flare;
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
            s.X += (s.Vx + MathF.Sin(_time * 6 + s.Phase) * 0.25f) * seconds;
            s.Y += s.Vy * seconds;
            s.Vy *= 1 - 0.6f * seconds;
        }
    }

    /// <summary>Draws the pumpkin with its body centered on <paramref name="center"/> and half-width <paramref name="r"/>.</summary>
    public void Draw(ICanvas c, PointF center, float r, Color glow)
    {
        var (mood, cyclePhase) = PumpkinIdleCycle.At(_time);
        var phase = (float)cyclePhase;
        var env = Envelope(phase);
        var flicker = 0.82f + 0.18f * MathF.Sin(_time * 13) * MathF.Sin(_time * 7.3f);
        if (mood == PumpkinMood.Flicker) flicker *= 1 - 0.45f * env * MathF.Abs(MathF.Sin(_time * 29));
        var flame = 1 + (mood == PumpkinMood.FlameBurst ? 0.9f * env : 0) + 1.1f * _flare;
        var bounce = mood == PumpkinMood.Bounce ? env : 0;
        var wink = mood == PumpkinMood.Wink ? env : 0;
        var boost = 0.8f * _flare + (mood == PumpkinMood.FlameBurst ? 0.4f * env : 0);

        var cx = center.X;
        var cy = center.Y + MathF.Sin(_time * 1.7f) * 0.07f * r - 0.35f * r * MathF.Abs(MathF.Sin(phase / 0.3f * MathF.PI)) * bounce;

        // Halo.
        var halo = 2.5f * r;
        c.SetFillPaint(new RadialGradientPaint(
            [new PaintGradientStop(0, glow.WithAlpha(Math.Min(0.75f, (0.30f + 0.35f * boost) * flicker))), new PaintGradientStop(1, glow.WithAlpha(0))],
            new Point(0.5, 0.5), 0.5), new RectF(cx - halo, cy - halo * 1.1f, halo * 2, halo * 2));
        c.FillCircle(cx, cy - 0.1f * halo, halo);

        c.SaveState();
        c.Translate(cx, cy);
        if (bounce > 0)
        {
            c.Rotate(MathF.Sin(phase * MathF.PI * 2 * 3) * 9 * bounce);
            c.Scale(1 + 0.06f * bounce, 1 - 0.05f * bounce);
        }
        Flames(c, r, flame);
        Body(c, r);
        Stem(c, r);
        Face(c, r, flicker, wink);
        c.RestoreState();

        // Sparks drift in window space so a spin does not swing them around.
        foreach (var s in _sparks)
        {
            if (s.Life <= 0) continue;
            var color = s.Life > 0.6f ? Color.FromArgb("#ffe27a") : s.Life > 0.3f ? Color.FromArgb("#fa9c33") : Color.FromArgb("#f04106");
            var x = cx + s.X * r;
            var y = cy + s.Y * r;
            c.FillColor = color.WithAlpha(0.25f * s.Life);
            c.FillCircle(x, y, Math.Max(1.6f, 0.11f * r));
            c.FillColor = color.WithAlpha(Math.Min(1, 1.3f * s.Life));
            c.FillCircle(x, y, Math.Max(0.8f, 0.045f * r));
        }
    }

    /// <summary>Active part of each idle period: rises and falls during its first 30%.</summary>
    private static float Envelope(double phase) => phase < 0.3 ? MathF.Sin((float)(phase / 0.3) * MathF.PI) : 0;

    private void Emit()
    {
        var s = _sparks.FirstOrDefault(p => p.Life <= 0);
        if (s is null) return;
        s.X = (float)(_random.NextDouble() - 0.5) * 0.9f;
        s.Y = -0.8f - (float)_random.NextDouble() * 0.7f;
        s.Vx = (float)(_random.NextDouble() - 0.5) * 0.8f;
        s.Vy = -(0.9f + (float)_random.NextDouble() * 1.4f);
        s.MaxLife = 0.6f + (float)_random.NextDouble() * 0.8f;
        s.Phase = (float)_random.NextDouble() * 6.28f;
        s.Life = 1;
    }

    private void Flames(ICanvas c, float r, float scale)
    {
        ReadOnlySpan<float> xs = [-0.4f, 0.02f, 0.42f];
        ReadOnlySpan<float> hs = [0.95f, 1.5f, 0.9f];
        ReadOnlySpan<float> ws = [0.42f, 0.56f, 0.4f];
        var baseY = -0.55f * r;
        for (var i = 0; i < 3; i++)
        {
            var wave = 0.85f + 0.15f * MathF.Sin(_time * 9 + i * 1.9f) + 0.08f * MathF.Sin(_time * 21 + i * 3.1f);
            var h = hs[i] * r * scale * wave;
            var w = ws[i] * r;
            var sway = MathF.Sin(_time * 5 + i * 1.3f) * 0.18f * r;
            c.FillColor = Color.FromArgb("#e8340c").WithAlpha(0.88f);
            c.FillPath(Tongue(xs[i] * r, baseY, w, h, sway));
            c.FillColor = Color.FromArgb("#ff9a1f").WithAlpha(0.95f);
            c.FillPath(Tongue(xs[i] * r, baseY, w * 0.68f, h * 0.72f, sway * 0.7f));
            c.FillColor = Color.FromArgb("#fff1a8");
            c.FillPath(Tongue(xs[i] * r, baseY, w * 0.36f, h * 0.42f, sway * 0.4f));
        }
    }

    private static PathF Tongue(float x, float baseY, float w, float h, float sway)
    {
        var p = new PathF();
        p.MoveTo(x - w / 2, baseY);
        p.CurveTo(x - w * 0.62f, baseY - h * 0.45f, x + sway - w * 0.12f, baseY - h * 0.7f, x + sway, baseY - h);
        p.CurveTo(x + sway + w * 0.18f, baseY - h * 0.62f, x + w * 0.66f, baseY - h * 0.4f, x + w / 2, baseY);
        p.Close();
        return p;
    }

    private static void Body(ICanvas c, float r)
    {
        // Outer ribs first so the middle ones overlap them.
        ReadOnlySpan<float> centers = [-0.5f, 0.5f, -0.24f, 0.24f, 0f];
        ReadOnlySpan<float> halfW = [0.5f, 0.5f, 0.5f, 0.5f, 0.46f];
        ReadOnlySpan<float> halfH = [0.64f, 0.64f, 0.71f, 0.71f, 0.74f];
        var outline = Color.FromArgb("#6e2405");
        for (var i = 0; i < centers.Length; i++)
        {
            var rect = new RectF((centers[i] - halfW[i]) * r, -halfH[i] * r, 2 * halfW[i] * r, 2 * halfH[i] * r);
            c.SetFillPaint(new LinearGradientPaint(
                [new PaintGradientStop(0, Color.FromArgb("#ffb049")), new PaintGradientStop(0.45f, Color.FromArgb("#f26b12")), new PaintGradientStop(1, Color.FromArgb("#a8350a"))],
                new Point(0.3, 0), new Point(0.6, 1)), rect);
            c.FillEllipse(rect);
            c.StrokeColor = outline.WithAlpha(0.85f);
            c.StrokeSize = Math.Max(1, 0.05f * r);
            c.DrawEllipse(rect);
        }
        c.FillColor = Colors.White.WithAlpha(0.16f);
        c.FillEllipse(-0.62f * r, -0.5f * r, 0.32f * r, 0.5f * r);
    }

    private static void Stem(ICanvas c, float r)
    {
        var p = new PathF();
        p.MoveTo(-0.09f * r, -0.68f * r);
        p.QuadTo(-0.12f * r, -0.92f * r, 0.02f * r, -1.02f * r);
        p.LineTo(0.14f * r, -0.96f * r);
        p.QuadTo(0.05f * r, -0.86f * r, 0.09f * r, -0.68f * r);
        p.Close();
        c.FillColor = Color.FromArgb("#3f4a1c");
        c.FillPath(p);
        c.StrokeColor = Color.FromArgb("#1f2409");
        c.StrokeSize = Math.Max(1, 0.04f * r);
        c.DrawPath(p);
    }

    private static void Face(ICanvas c, float r, float glow, float wink)
    {
        var lit = Color.FromArgb("#ffd54a");
        var hot = Color.FromArgb("#ff7a00");
        var light = new Color(
            hot.Red + (lit.Red - hot.Red) * glow, hot.Green + (lit.Green - hot.Green) * glow, hot.Blue + (lit.Blue - hot.Blue) * glow);

        c.SaveState();
        c.SetShadow(SizeF.Zero, 0.45f * r, lit.WithAlpha(0.9f * glow));
        c.FillColor = light;

        c.FillPath(Polygon(r, (-0.5f, -0.04f), (-0.13f, -0.04f), (-0.32f, -0.38f)));
        // Right eye winks by squashing towards its base.
        var squash = 1 - 0.85f * wink;
        c.FillColor = light.WithAlpha(1 - 0.6f * wink);
        c.FillPath(Polygon(r, (0.13f, -0.04f), (0.5f, -0.04f), (0.32f, -0.04f - 0.34f * squash)));
        c.FillColor = light;
        c.FillPath(Polygon(r, (-0.07f, 0.1f), (0.07f, 0.1f), (0f, -0.02f)));
        c.FillPath(Polygon(r,
            (-0.58f, 0.18f), (-0.38f, 0.27f), (-0.3f, 0.19f), (-0.12f, 0.28f), (0.12f, 0.28f), (0.3f, 0.19f), (0.38f, 0.27f),
            (0.58f, 0.18f), (0.44f, 0.44f), (0.22f, 0.53f), (0.15f, 0.43f), (-0.15f, 0.43f), (-0.22f, 0.53f), (-0.44f, 0.44f)));
        c.RestoreState();
    }

    private static PathF Polygon(float r, params (float X, float Y)[] points)
    {
        var p = new PathF();
        p.MoveTo(points[0].X * r, points[0].Y * r);
        for (var i = 1; i < points.Length; i++) p.LineTo(points[i].X * r, points[i].Y * r);
        p.Close();
        return p;
    }

    private sealed class Spark
    {
        public float X, Y, Vx, Vy, Life, MaxLife, Phase;
    }
}

/// <summary>
/// The left-edge notch: a near-black tab with rounded right corners that morphs into the full navigation panel as
/// <see cref="Open"/> goes from 0 to 1, with the pumpkin moving from the tab to the top of the panel.
/// </summary>
public sealed class NotchDrawable : IDrawable
{
    public const float CollapsedWidth = 58;
    public const float CollapsedHeight = 136;
    public const float PanelWidth = 264;
    public const float PanelInset = 12;

    public PumpkinDrawable Pumpkin { get; } = new();

    /// <summary>Spring value of the opening (may overshoot 1 a little).</summary>
    public double Open { get; set; }

    public void Draw(ICanvas canvas, RectF rect)
    {
        var t = Themes.ThemeManager.Current;
        var o = (float)Math.Clamp(Open, 0, 1.25);
        var oc = Math.Min(o, 1);
        var collapsed = new RectF(0, rect.Center.Y - CollapsedHeight / 2, CollapsedWidth, CollapsedHeight);
        var expanded = new RectF(0, PanelInset, PanelWidth, Math.Max(CollapsedHeight, rect.Height - 2 * PanelInset));
        var top = Math.Max(2, Lerp(collapsed.Top, expanded.Top, oc));
        var bottom = Math.Min(rect.Bottom - 2, Lerp(collapsed.Bottom, expanded.Bottom, oc));
        var shape = new RectF(0, top, Lerp(collapsed.Width, expanded.Width, o), bottom - top);
        var radius = Lerp(18, 26, oc);
        var path = Shape(shape, radius);

        canvas.SaveState();
        canvas.SetShadow(new SizeF(3, 0), 18, Colors.Black.WithAlpha(0.65f));
        canvas.FillColor = t.NotchFill;
        canvas.FillPath(path);
        canvas.RestoreState();

        var pumpkin = new PointF(Lerp(CollapsedWidth / 2, PanelWidth / 2, oc), Lerp(collapsed.Center.Y + 14, expanded.Top + 88, oc));
        var size = Lerp(19, 33, oc);

        // Inner glow: a soft light around the pumpkin and a faint rim.
        canvas.SaveState();
        canvas.ClipPath(path);
        var glowR = Lerp(70, 180, oc);
        canvas.SetFillPaint(new RadialGradientPaint(
            [new PaintGradientStop(0, t.NotchGlow.WithAlpha(0.22f)), new PaintGradientStop(1, t.NotchGlow.WithAlpha(0))],
            new Point(0.5, 0.5), 0.5), new RectF(pumpkin.X - glowR, pumpkin.Y - glowR, glowR * 2, glowR * 2));
        canvas.FillCircle(pumpkin.X, pumpkin.Y, glowR);
        canvas.StrokeColor = t.NotchGlow.WithAlpha(0.18f);
        canvas.StrokeSize = 5;
        canvas.DrawPath(path);
        canvas.RestoreState();
        canvas.StrokeColor = t.NotchStroke;
        canvas.StrokeSize = 1.2f;
        canvas.DrawPath(path);

        Pumpkin.Draw(canvas, pumpkin, size, t.NotchGlow);
    }

    private static float Lerp(float a, float b, float f) => a + (b - a) * f;

    /// <summary>Flush with the window's left edge, rounded on the right.</summary>
    private static PathF Shape(RectF r, float radius)
    {
        radius = Math.Min(radius, Math.Min(r.Width, r.Height) / 2);
        var p = new PathF();
        p.MoveTo(r.Left - 2, r.Top);
        p.LineTo(r.Right - radius, r.Top);
        p.QuadTo(r.Right, r.Top, r.Right, r.Top + radius);
        p.LineTo(r.Right, r.Bottom - radius);
        p.QuadTo(r.Right, r.Bottom, r.Right - radius, r.Bottom);
        p.LineTo(r.Left - 2, r.Bottom);
        p.Close();
        return p;
    }
}

/// <summary>Thumbtack icon of the pin button: upright and lit when pinned, tilted and muted otherwise.</summary>
public sealed class PinDrawable : IDrawable
{
    public bool IsPinned { get; set; }

    public void Draw(ICanvas canvas, RectF rect)
    {
        var t = Themes.ThemeManager.Current;
        var color = IsPinned ? t.NotchGlow : t.PageMuted;
        var s = Math.Min(rect.Width, rect.Height);
        canvas.SaveState();
        canvas.Translate(rect.Center.X, rect.Center.Y);
        if (!IsPinned) canvas.Rotate(40);
        canvas.StrokeColor = color;
        canvas.FillColor = color;
        canvas.StrokeSize = Math.Max(1.5f, s * 0.08f);
        canvas.StrokeLineCap = LineCap.Round;
        canvas.FillRoundedRectangle(-s * 0.18f, -s * 0.38f, s * 0.36f, s * 0.12f, 2);
        canvas.FillRoundedRectangle(-s * 0.12f, -s * 0.3f, s * 0.24f, s * 0.3f, 2);
        canvas.FillRoundedRectangle(-s * 0.26f, -s * 0.02f, s * 0.52f, s * 0.1f, 2);
        canvas.DrawLine(0, s * 0.08f, 0, s * 0.4f);
        canvas.RestoreState();
    }
}
