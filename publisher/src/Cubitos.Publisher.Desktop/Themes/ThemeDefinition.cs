using System.Windows.Media;
using Cubitos.Publisher.Core.Queue;

namespace Cubitos.Publisher.Desktop.Themes;

/// <summary>Visual style of one theme: colors, fonts, card shape and wording. Custom renderers read it at draw time.</summary>
public sealed class ThemeDefinition
{
    public required string Id { get; init; }
    public required string DisplayName { get; init; }

    // Page and chrome.
    public required Color[] PageGradient { get; init; }
    public required Color TitleBar { get; init; }
    public required Color PageText { get; init; }
    public required Color PageMuted { get; init; }

    // Cards.
    public required Color[] CardGradient { get; init; }
    public required Color CardStroke { get; init; }
    public required double CardStrokeThickness { get; init; }
    public required double CardCornerRadius { get; init; }
    public required Color CardText { get; init; }
    public required Color CardMuted { get; init; }
    public required Color ShadowColor { get; init; }
    public required double ShadowBlur { get; init; }
    public required double ShadowDepth { get; init; }
    public required double ShadowOpacity { get; init; }
    public required Color HighlightStroke { get; init; }

    // Accents.
    public required Color Accent { get; init; }
    public required Color AccentText { get; init; }
    public required Color Highlight { get; init; }
    public required Color Positive { get; init; }

    // Charts.
    public required Color ChartPrimary { get; init; }
    public required Color ChartSecondary { get; init; }
    public required Color GridLine { get; init; }
    /// <summary>Heatmap palette from no views to the busiest hour.</summary>
    public required Color[] HeatStops { get; init; }
    public required Color Gold { get; init; }
    public required Color Silver { get; init; }
    public required Color Bronze { get; init; }
    public required Color OtherRank { get; init; }

    // Fonts.
    public required FontFamily HeadingFont { get; init; }
    public required FontFamily BodyFont { get; init; }

    // Left-edge navigation notch.
    public Color NotchFill { get; init; } = Rgb("#0b0610");
    public Color NotchGlow { get; init; } = Rgb("#fa9c33");
    public Color NotchStroke { get; init; } = Rgb("#5a3418");

    // Decoration.
    public bool Ornate { get; init; }
    public bool Embers { get; init; }
    public bool NeonGrid { get; init; }
    public bool RomanRanks { get; init; }

    /// <summary>Background of each queue status badge (seal); the text color is picked for contrast.</summary>
    public required IReadOnlyDictionary<QueueStatus, Color> StatusColors { get; init; }

    /// <summary>Section titles and other theme-specific wording.</summary>
    public required IReadOnlyDictionary<string, string> Texts { get; init; }

    public double CardPaddingX => (Ornate ? 22 : 18) + CardStrokeThickness;

    public Color StatusColor(QueueStatus status) => StatusColors.TryGetValue(status, out var c) ? c : PageMuted;

    public static Color Rgb(string hex) => (Color)ColorConverter.ConvertFromString(hex);

    public static Color WithAlpha(Color c, double alpha) => Color.FromArgb((byte)Math.Round(Math.Clamp(alpha, 0, 1) * 255), c.R, c.G, c.B);

    public static double Luminance(Color c) => (0.2126 * c.R + 0.7152 * c.G + 0.0722 * c.B) / 255;

    public static Color ContrastText(Color background) => Luminance(background) > 0.55 ? Rgb("#141414") : Colors.White;

    public static Color Lerp(Color a, Color b, double f) => Color.FromArgb(
        (byte)(a.A + (b.A - a.A) * f), (byte)(a.R + (b.R - a.R) * f), (byte)(a.G + (b.G - a.G) * f), (byte)(a.B + (b.B - a.B) * f));

    public Color RankColor(int position) => position switch
    {
        1 => Gold,
        2 => Silver,
        3 => Bronze,
        _ => OtherRank,
    };

    /// <summary>Interpolates <see cref="HeatStops"/> at <paramref name="t"/> in [0, 1].</summary>
    public Color Heat(double t)
    {
        t = Math.Clamp(t, 0, 1);
        var scaled = t * (HeatStops.Length - 1);
        var i = Math.Min((int)scaled, HeatStops.Length - 2);
        return Lerp(HeatStops[i], HeatStops[i + 1], scaled - i);
    }

    public string Text(string key) => Texts.TryGetValue(key, out var value) ? value : key;

    public override string ToString() => DisplayName;
}
