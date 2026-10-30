using Cubitos.Publisher.Dashboard.Themes;

namespace Cubitos.Publisher.Dashboard.Drawing;

/// <summary>Antique gold inner frame with corner flourishes for the ornate theme.</summary>
public sealed class OrnateFrameDrawable : IDrawable
{
    public static OrnateFrameDrawable Instance { get; } = new();

    public void Draw(ICanvas canvas, RectF rect)
    {
        var t = ThemeManager.Current;
        if (!t.Ornate || rect.Width < 40 || rect.Height < 40) return;

        var gold = t.Gold;
        var inner = rect.Inflate(-6, -6);
        canvas.StrokeColor = gold.WithAlpha(0.55f);
        canvas.StrokeSize = 1;
        canvas.DrawRectangle(inner);

        canvas.StrokeColor = gold;
        canvas.FillColor = gold;
        canvas.StrokeSize = 1.6f;
        var size = Math.Min(26f, Math.Min(rect.Width, rect.Height) / 4);
        Corner(canvas, inner.Left, inner.Top, 1, 1, size);
        Corner(canvas, inner.Right, inner.Top, -1, 1, size);
        Corner(canvas, inner.Left, inner.Bottom, 1, -1, size);
        Corner(canvas, inner.Right, inner.Bottom, -1, -1, size);
    }

    /// <summary>A diamond on the corner with two curling scrolls running along the edges.</summary>
    private static void Corner(ICanvas c, float x, float y, int dx, int dy, float s)
    {
        var d = new PathF();
        d.MoveTo(x, y - 4 * dy);
        d.LineTo(x + 4 * dx, y);
        d.LineTo(x, y + 4 * dy);
        d.LineTo(x - 4 * dx, y);
        d.Close();
        c.FillPath(d);

        var along = new PathF();
        along.MoveTo(x + 5 * dx, y);
        along.CurveTo(x + s * 0.45f * dx, y, x + s * 0.55f * dx, y + s * 0.35f * dy, x + s * 0.8f * dx, y + s * 0.2f * dy);
        along.QuadTo(x + s * dx, y + s * 0.05f * dy, x + s * 0.85f * dx, y - 1 * dy);
        c.DrawPath(along);

        var down = new PathF();
        down.MoveTo(x, y + 5 * dy);
        down.CurveTo(x, y + s * 0.45f * dy, x + s * 0.35f * dx, y + s * 0.55f * dy, x + s * 0.2f * dx, y + s * 0.8f * dy);
        down.QuadTo(x + s * 0.05f * dx, y + s * dy, x - 1 * dx, y + s * 0.85f * dy);
        c.DrawPath(down);

        c.FillCircle(x + s * 0.85f * dx, y - 1 * dy, 1.8f);
        c.FillCircle(x - 1 * dx, y + s * 0.85f * dy, 1.8f);
    }
}

/// <summary>Rank badge: a cube (Cubitos), a heraldic shield (ornate) or a glowing ring (neon).</summary>
public sealed class CrestDrawable(int position) : IDrawable
{
    private static readonly string[] Roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

    public void Draw(ICanvas canvas, RectF rect)
    {
        var t = ThemeManager.Current;
        var color = t.RankColor(position);
        var label = t.RomanRanks && position <= Roman.Length ? Roman[position - 1] : position.ToString();
        var side = Math.Min(rect.Width, rect.Height) - 8;
        var box = new RectF(rect.Center.X - side / 2, rect.Center.Y - side / 2, side, side);

        if (t.Ornate) Shield(canvas, box, color, t);
        else if (t.NeonGrid) Ring(canvas, box, color);
        else Cube(canvas, box, color);

        canvas.FontColor = t.NeonGrid ? color : ThemeDefinition.ContrastText(color);
        canvas.Font = new Microsoft.Maui.Graphics.Font(t.DrawingHeadingFont, 800);
        canvas.FontSize = side * (label.Length > 2 ? 0.3f : 0.42f);
        var textBox = t.Ornate ? new RectF(box.X, box.Y - side * 0.04f, box.Width, box.Height * 0.9f) : box;
        canvas.DrawString(label, textBox, HorizontalAlignment.Center, VerticalAlignment.Center);
    }

    private static void Cube(ICanvas c, RectF box, Color color)
    {
        c.SaveState();
        c.Rotate(-4, box.Center.X, box.Center.Y);
        c.FillColor = Colors.Black;
        c.FillRoundedRectangle(box.Offset(4, 5), 8);
        c.FillColor = color;
        c.FillRoundedRectangle(box, 8);
        c.FillColor = Colors.White.WithAlpha(0.25f);
        c.FillRoundedRectangle(new RectF(box.X + 4, box.Y + 4, box.Width - 8, box.Height * 0.22f), 5);
        c.StrokeColor = Colors.Black;
        c.StrokeSize = 3;
        c.DrawRoundedRectangle(box, 8);
        c.RestoreState();
    }

    private static void Shield(ICanvas c, RectF b, Color color, ThemeDefinition t)
    {
        var p = new PathF();
        p.MoveTo(b.Left + b.Width * 0.08f, b.Top + b.Height * 0.06f);
        p.LineTo(b.Right - b.Width * 0.08f, b.Top + b.Height * 0.06f);
        p.LineTo(b.Right - b.Width * 0.08f, b.Top + b.Height * 0.45f);
        p.CurveTo(b.Right - b.Width * 0.1f, b.Top + b.Height * 0.75f, b.Center.X + b.Width * 0.15f, b.Bottom - b.Height * 0.08f, b.Center.X, b.Bottom);
        p.CurveTo(b.Center.X - b.Width * 0.15f, b.Bottom - b.Height * 0.08f, b.Left + b.Width * 0.1f, b.Top + b.Height * 0.75f, b.Left + b.Width * 0.08f, b.Top + b.Height * 0.45f);
        p.Close();

        c.SaveState();
        c.SetShadow(new SizeF(0, 3), 6, Colors.Black.WithAlpha(0.6f));
        c.SetFillPaint(new LinearGradientPaint(
            [new PaintGradientStop(0, color.WithLuminosity(Math.Min(0.92f, color.GetLuminosity() + 0.2f))), new PaintGradientStop(1, color.WithLuminosity(color.GetLuminosity() * 0.55f))],
            new Point(0, 0), new Point(0, 1)), b);
        c.FillPath(p);
        c.RestoreState();
        c.StrokeColor = Color.FromArgb("#3a2210");
        c.StrokeSize = 2;
        c.DrawPath(p);
        c.StrokeColor = t.Gold.WithAlpha(0.8f);
        c.StrokeSize = 1;
        c.DrawLine(b.Left + b.Width * 0.18f, b.Top + b.Height * 0.16f, b.Right - b.Width * 0.18f, b.Top + b.Height * 0.16f);
    }

    private static void Ring(ICanvas c, RectF b, Color color)
    {
        c.SaveState();
        c.SetShadow(SizeF.Zero, 12, color);
        c.StrokeColor = color;
        c.StrokeSize = 3;
        c.DrawEllipse(b.Inflate(-3, -3));
        c.RestoreState();
        c.FillColor = color.WithAlpha(0.12f);
        c.FillEllipse(b.Inflate(-3, -3));
    }
}
