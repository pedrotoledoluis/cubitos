using Cubitos.Publisher.Core.Queue;

namespace Cubitos.Publisher.Dashboard.Themes;

/// <summary>Visual style of one theme: colors, fonts, card shape and wording. Drawables read it at draw time.</summary>
public sealed class ThemeDefinition
{
    public required string Id { get; init; }
    public required string DisplayName { get; init; }

    // Page and sidebar.
    public required Color[] PageGradient { get; init; }
    public required Color SidebarBackground { get; init; }
    public required Color SidebarStroke { get; init; }
    public required Color PageText { get; init; }
    public required Color PageMuted { get; init; }

    // Cards.
    public required Color[] CardGradient { get; init; }
    public required Color CardStroke { get; init; }
    public required double CardStrokeThickness { get; init; }
    public required double CardCornerRadius { get; init; }
    public required Color CardText { get; init; }
    public required Color CardMuted { get; init; }
    public required Shadow CardShadow { get; init; }
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

    // Fonts: labels may use registered aliases, drawables only system fonts.
    public required string HeadingFont { get; init; }
    public required string BodyFont { get; init; }
    public required string DrawingFont { get; init; }
    public required string DrawingHeadingFont { get; init; }

    // Decoration.
    public bool Ornate { get; init; }
    public bool Embers { get; init; }
    public bool NeonGrid { get; init; }
    public bool RomanRanks { get; init; }

    /// <summary>Background of each queue status badge (seal); the text color is picked for contrast.</summary>
    public required IReadOnlyDictionary<QueueStatus, Color> StatusColors { get; init; }

    /// <summary>Section titles and other theme-specific wording.</summary>
    public required IReadOnlyDictionary<string, string> Texts { get; init; }

    public Color StatusColor(QueueStatus status) => StatusColors.TryGetValue(status, out var c) ? c : PageMuted;

    public static Color ContrastText(Color background) =>
        background.GetLuminosity() > 0.55f ? Color.FromArgb("#141414") : Colors.White;

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
        var f = (float)(scaled - i);
        var a = HeatStops[i];
        var b = HeatStops[i + 1];
        return new Color(a.Red + (b.Red - a.Red) * f, a.Green + (b.Green - a.Green) * f, a.Blue + (b.Blue - a.Blue) * f);
    }
}
