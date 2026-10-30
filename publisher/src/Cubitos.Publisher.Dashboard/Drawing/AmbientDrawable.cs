using Cubitos.Publisher.Dashboard.Themes;

namespace Cubitos.Publisher.Dashboard.Drawing;

/// <summary>
/// Full-window background layer. Ornate theme: rising embers, slow translucent glow orbs and a lantern string across
/// the header; neon theme: a faint perspective grid. Animated only while <see cref="Step"/> is called by a timer.
/// </summary>
public sealed class AmbientDrawable : IDrawable
{
    private const int EmberCount = 46;
    private const int OrbCount = 5;
    private readonly Random _random = new(1518);
    private readonly List<Particle> _embers = [];
    private readonly List<Particle> _orbs = [];
    private SizeF _size;
    private float _time;

    /// <summary>Left edge of the header lantern string (where the content starts, right of the notch).</summary>
    public float ContentLeft { get; set; } = 70;

    public bool IsAnimated => ThemeManager.Current.Embers;

    public void Step(float seconds)
    {
        _time += seconds;
        if (_size.Width <= 0) return;
        foreach (var e in _embers)
        {
            e.Y -= e.Speed * seconds;
            e.X += MathF.Sin(_time * e.Wobble + e.Phase) * 12 * seconds;
            if (e.Y < -10) Respawn(e, bottom: true);
        }
        foreach (var o in _orbs)
        {
            o.Y -= o.Speed * seconds;
            o.X += MathF.Sin(_time * 0.2f + o.Phase) * 8 * seconds;
            if (o.Y < -o.Size * 2) Respawn(o, bottom: true, orb: true);
        }
    }

    public void Draw(ICanvas canvas, RectF rect)
    {
        var t = ThemeManager.Current;
        if (_size != rect.Size) Resize(rect.Size);
        if (t.NeonGrid) DrawNeonGrid(canvas, rect, t);
        if (!t.Embers) return;

        foreach (var o in _orbs)
        {
            var pulse = 0.75f + 0.25f * MathF.Sin(_time * 0.6f + o.Phase);
            var color = o.Hue < 0.5f ? Color.FromArgb("#8b9bd9") : Color.FromArgb("#b04cff");
            canvas.SetFillPaint(new RadialGradientPaint(
                [new PaintGradientStop(0, color.WithAlpha(0.22f * pulse)), new PaintGradientStop(1, color.WithAlpha(0f))], new Point(0.5, 0.5), 0.5),
                new RectF(o.X - o.Size, o.Y - o.Size, o.Size * 2, o.Size * 2));
            canvas.FillCircle(o.X, o.Y, o.Size);
            // Faint trailing tendrils under each orb.
            canvas.StrokeColor = color.WithAlpha(0.05f * pulse);
            canvas.StrokeSize = 3;
            canvas.StrokeLineCap = LineCap.Round;
            for (var k = -1; k <= 1; k++)
            {
                var x = o.X + k * o.Size * 0.3f;
                var sway = MathF.Sin(_time * 0.8f + k + o.Phase) * 10;
                var tendril = new PathF();
                tendril.MoveTo(x, o.Y + o.Size * 0.35f);
                tendril.QuadTo(x + sway, o.Y + o.Size * 0.8f, x - sway * 0.5f, o.Y + o.Size * 1.2f);
                canvas.DrawPath(tendril);
            }
        }

        foreach (var e in _embers)
        {
            var flicker = 0.55f + 0.45f * MathF.Sin(_time * 5 + e.Phase);
            var color = e.Hue < 0.4f ? Color.FromArgb("#f04106") : e.Hue < 0.8f ? Color.FromArgb("#fa9c33") : Color.FromArgb("#eea079");
            canvas.FillColor = color.WithAlpha(0.18f * flicker);
            canvas.FillCircle(e.X, e.Y, e.Size * 2.6f);
            canvas.FillColor = color.WithAlpha(0.9f * flicker);
            canvas.FillCircle(e.X, e.Y, e.Size);
        }

        DrawLanterns(canvas, rect);
    }

    private void DrawLanterns(ICanvas canvas, RectF rect)
    {
        var left = ContentLeft + 10;
        var right = rect.Right - 10;
        if (right - left < 100) return;
        const int count = 26;
        const float topY = 4, sag = 12;
        canvas.StrokeColor = Color.FromArgb("#3a2a20");
        canvas.StrokeSize = 1.2f;
        var path = new PathF();
        for (var i = 0; i <= 60; i++)
        {
            var f = i / 60f;
            var x = left + (right - left) * f;
            var y = topY + sag * MathF.Sin(MathF.PI * ((f * 4) % 1));
            if (i == 0) path.MoveTo(x, y); else path.LineTo(x, y);
        }
        canvas.DrawPath(path);
        for (var i = 0; i < count; i++)
        {
            var f = (i + 0.5f) / count;
            var x = left + (right - left) * f;
            var y = topY + sag * MathF.Sin(MathF.PI * ((f * 4) % 1)) + 3;
            var twinkle = 0.7f + 0.3f * MathF.Sin(_time * 2.2f + i * 1.7f);
            var color = i % 3 == 0 ? Color.FromArgb("#eea079") : Color.FromArgb("#fa9c33");
            canvas.FillColor = color.WithAlpha(0.22f * twinkle);
            canvas.FillCircle(x, y, 7);
            canvas.FillColor = color.WithAlpha(twinkle);
            canvas.FillCircle(x, y, 2.6f);
        }
    }

    private static void DrawNeonGrid(ICanvas canvas, RectF rect, ThemeDefinition t)
    {
        canvas.StrokeSize = 1;
        var horizon = rect.Height * 0.55f;
        for (var i = 0; i < 14; i++)
        {
            var f = i / 13f;
            var y = horizon + (rect.Height - horizon) * f * f;
            canvas.StrokeColor = t.Highlight.WithAlpha(0.04f + 0.08f * f);
            canvas.DrawLine(rect.Left, y, rect.Right, y);
        }
        var cx = rect.Center.X;
        for (var i = -12; i <= 12; i++)
        {
            canvas.StrokeColor = t.Accent.WithAlpha(0.06f);
            canvas.DrawLine(cx + i * 30, horizon, cx + i * 220, rect.Bottom);
        }
    }

    /// <summary>
    /// Seeds the particles once; later resizes only rescale their positions, so dragging the window edge never
    /// reshuffles or stretches the scene.
    /// </summary>
    private void Resize(SizeF size)
    {
        if (_size.Width > 0 && _size.Height > 0 && _embers.Count > 0)
        {
            var sx = size.Width / _size.Width;
            var sy = size.Height / _size.Height;
            foreach (var p in _embers.Concat(_orbs))
            {
                p.X *= sx;
                p.Y *= sy;
            }
            _size = size;
            return;
        }
        _size = size;
        _embers.Clear();
        _orbs.Clear();
        for (var i = 0; i < EmberCount; i++)
        {
            var e = new Particle();
            Respawn(e, bottom: false);
            _embers.Add(e);
        }
        for (var i = 0; i < OrbCount; i++)
        {
            var o = new Particle();
            Respawn(o, bottom: false, orb: true);
            _orbs.Add(o);
        }
    }

    private void Respawn(Particle p, bool bottom, bool orb = false)
    {
        p.X = (float)_random.NextDouble() * _size.Width;
        p.Y = bottom ? _size.Height + (orb ? 120 : 10) : (float)_random.NextDouble() * _size.Height;
        p.Phase = (float)_random.NextDouble() * 6.28f;
        p.Hue = (float)_random.NextDouble();
        p.Wobble = 0.6f + (float)_random.NextDouble() * 1.4f;
        p.Speed = orb ? 6 + (float)_random.NextDouble() * 8 : 18 + (float)_random.NextDouble() * 42;
        p.Size = orb ? 60 + (float)_random.NextDouble() * 70 : 1.1f + (float)_random.NextDouble() * 1.9f;
    }

    private sealed class Particle
    {
        public float X, Y, Speed, Size, Phase, Hue, Wobble;
    }
}
