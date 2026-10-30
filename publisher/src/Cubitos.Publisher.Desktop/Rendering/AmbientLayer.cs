using System.Windows;
using System.Windows.Media;
using Cubitos.Publisher.Desktop.Themes;

namespace Cubitos.Publisher.Desktop.Rendering;

/// <summary>
/// Full-window background layer. Ornate theme: rising embers, slow translucent glow orbs and a lantern string across
/// the header (animated from the <see cref="FrameClock"/>); neon theme: a faint static perspective grid. Particles keep
/// their relative positions on resize, so dragging the window edge never reshuffles or stretches the scene.
/// </summary>
public sealed class AmbientLayer : VisualLayer, IFrameListener
{
    private const int EmberCount = 46;
    private const int OrbCount = 5;
    private static readonly Color EmberRed = ThemeDefinition.Rgb("#f04106");
    private static readonly Color EmberOrange = ThemeDefinition.Rgb("#fa9c33");
    private static readonly Color EmberPeach = ThemeDefinition.Rgb("#eea079");
    private static readonly Color OrbLavender = ThemeDefinition.Rgb("#8b9bd9");
    private static readonly Color OrbViolet = ThemeDefinition.Rgb("#b04cff");

    private static readonly RadialGradientBrush LavenderOrb = OrbBrush(OrbLavender);
    private static readonly RadialGradientBrush VioletOrb = OrbBrush(OrbViolet);
    private static readonly Pen LanternString = BrushCache.Pen(ThemeManager.Solid(ThemeDefinition.Rgb("#3a2a20")), 1.2);

    private readonly Random _random = new(1518);
    private readonly Particle[] _embers = new Particle[EmberCount];
    private readonly Particle[] _orbs = new Particle[OrbCount];
    private Size _size;
    private double _time;
    private double _contentLeft = 70;
    private StreamGeometry? _stringGeometry;
    private bool _listening;
    private bool _suspended;

    public AmbientLayer()
    {
        IsHitTestVisible = false;
        for (var i = 0; i < EmberCount; i++) _embers[i] = new Particle();
        for (var i = 0; i < OrbCount; i++) _orbs[i] = new Particle();
        Loaded += (_, _) => { ThemeManager.Changed += OnTheme; OnTheme(ThemeManager.Current); };
        Unloaded += (_, _) => { ThemeManager.Changed -= OnTheme; Listen(false); };
    }

    /// <summary>Left edge of the header lantern string (where the content starts, right of the notch).</summary>
    public double ContentLeft
    {
        get => _contentLeft;
        set
        {
            if (Math.Abs(_contentLeft - value) < 0.5) return;
            _contentLeft = value;
            _stringGeometry = null;
            if (!_listening) Redraw();
        }
    }

    /// <summary>Stops animating (and drawing) while the panel is hidden or minimized; resumes where it left off.</summary>
    public bool Suspended
    {
        get => _suspended;
        set
        {
            if (_suspended == value) return;
            _suspended = value;
            Listen(!value && ThemeManager.Current.Embers);
        }
    }

    public void OnFrame(TimeSpan now, double dt)
    {
        _time += dt;
        if (_size.Width > 0)
        {
            foreach (var e in _embers)
            {
                e.Y -= e.Speed * dt;
                e.X += Math.Sin(_time * e.Wobble + e.Phase) * 12 * dt;
                if (e.Y < -10) Respawn(e, bottom: true, orb: false);
            }
            foreach (var o in _orbs)
            {
                o.Y -= o.Speed * dt;
                o.X += Math.Sin(_time * 0.2 + o.Phase) * 8 * dt;
                if (o.Y < -o.Size * 2) Respawn(o, bottom: true, orb: true);
            }
        }
        Redraw();
    }

    private void OnTheme(ThemeDefinition theme)
    {
        Listen(theme.Embers && !_suspended);
        Redraw();
    }

    private void Listen(bool on)
    {
        if (on == _listening) return;
        _listening = on;
        if (on) FrameClock.Add(this); else FrameClock.Remove(this);
    }

    protected override void Draw(DrawingContext dc, Size size)
    {
        if (size != _size) Resize(size);
        var t = ThemeManager.Current;
        if (t.NeonGrid) DrawNeonGrid(dc, size, t);
        if (!t.Embers) return;

        foreach (var o in _orbs)
        {
            var pulse = 0.75 + 0.25 * Math.Sin(_time * 0.6 + o.Phase);
            dc.PushOpacity(pulse);
            dc.DrawEllipse(o.Hue < 0.5 ? LavenderOrb : VioletOrb, null, new Point(o.X, o.Y), o.Size, o.Size);
            dc.Pop();
        }

        foreach (var e in _embers)
        {
            var flicker = 0.55 + 0.45 * Math.Sin(_time * 5 + e.Phase);
            var color = e.Hue < 0.4 ? EmberRed : e.Hue < 0.8 ? EmberOrange : EmberPeach;
            var c = new Point(e.X, e.Y);
            dc.DrawEllipse(BrushCache.Get(color, 0.18 * flicker), null, c, e.Size * 2.6, e.Size * 2.6);
            dc.DrawEllipse(BrushCache.Get(color, 0.9 * flicker), null, c, e.Size, e.Size);
        }

        DrawLanterns(dc, size);
    }

    private static double StringY(double f) => 4 + 12 * Math.Sin(Math.PI * (f * 4 % 1));

    private void DrawLanterns(DrawingContext dc, Size size)
    {
        var left = _contentLeft + 10;
        var right = size.Width - 10;
        if (right - left < 100) return;
        if (_stringGeometry is null)
        {
            _stringGeometry = new StreamGeometry();
            using (var g = _stringGeometry.Open())
            {
                for (var i = 0; i <= 60; i++)
                {
                    var f = i / 60.0;
                    var p = new Point(left + (right - left) * f, StringY(f));
                    if (i == 0) g.BeginFigure(p, false, false); else g.LineTo(p, true, true);
                }
            }
            _stringGeometry.Freeze();
        }
        dc.DrawGeometry(null, LanternString, _stringGeometry);

        const int count = 26;
        for (var i = 0; i < count; i++)
        {
            var f = (i + 0.5) / count;
            var center = new Point(left + (right - left) * f, StringY(f) + 3);
            var twinkle = 0.7 + 0.3 * Math.Sin(_time * 2.2 + i * 1.7);
            var color = i % 3 == 0 ? EmberPeach : EmberOrange;
            dc.DrawEllipse(BrushCache.Get(color, 0.22 * twinkle), null, center, 7, 7);
            dc.DrawEllipse(BrushCache.Get(color, twinkle), null, center, 2.6, 2.6);
        }
    }

    private static void DrawNeonGrid(DrawingContext dc, Size size, ThemeDefinition t)
    {
        var horizon = size.Height * 0.55;
        for (var i = 0; i < 14; i++)
        {
            var f = i / 13.0;
            var y = horizon + (size.Height - horizon) * f * f;
            dc.DrawLine(new Pen(BrushCache.Get(t.Highlight, 0.04 + 0.08 * f), 1), new Point(0, y), new Point(size.Width, y));
        }
        var cx = size.Width / 2;
        var pen = new Pen(BrushCache.Get(t.Accent, 0.06), 1);
        for (var i = -12; i <= 12; i++) dc.DrawLine(pen, new Point(cx + i * 30, horizon), new Point(cx + i * 220, size.Height));
    }

    private void Resize(Size size)
    {
        _stringGeometry = null;
        if (_size.Width > 0 && _size.Height > 0)
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
        foreach (var e in _embers) Respawn(e, bottom: false, orb: false);
        foreach (var o in _orbs) Respawn(o, bottom: false, orb: true);
    }

    private void Respawn(Particle p, bool bottom, bool orb)
    {
        p.X = _random.NextDouble() * _size.Width;
        p.Y = bottom ? _size.Height + (orb ? 120 : 10) : _random.NextDouble() * _size.Height;
        p.Phase = _random.NextDouble() * 6.28;
        p.Hue = _random.NextDouble();
        p.Wobble = 0.6 + _random.NextDouble() * 1.4;
        p.Speed = orb ? 6 + _random.NextDouble() * 8 : 18 + _random.NextDouble() * 42;
        p.Size = orb ? 60 + _random.NextDouble() * 70 : 1.1 + _random.NextDouble() * 1.9;
    }

    private static RadialGradientBrush OrbBrush(Color c)
    {
        var brush = new RadialGradientBrush(ThemeDefinition.WithAlpha(c, 0.22), ThemeDefinition.WithAlpha(c, 0));
        brush.Freeze();
        return brush;
    }

    private sealed class Particle
    {
        public double X, Y, Speed, Size, Phase, Hue, Wobble;
    }
}
