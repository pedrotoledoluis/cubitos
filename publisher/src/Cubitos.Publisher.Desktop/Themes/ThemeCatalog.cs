using System.Windows.Media;
using Cubitos.Publisher.Core.Queue;
using static Cubitos.Publisher.Desktop.Themes.ThemeDefinition;

namespace Cubitos.Publisher.Desktop.Themes;

public static class ThemeCatalog
{
    /// <summary>Cinzel Decorative (SIL OFL 1.1) embedded as a WPF resource.</summary>
    private static readonly FontFamily Cinzel = new(new Uri("pack://application:,,,/"), "./Fonts/#Cinzel Decorative");

    private static readonly Dictionary<string, string> DefaultTexts = new()
    {
        ["BrandSubtitle"] = "Panel del canal",
        ["Nav_Ranking"] = "Ranking",
        ["Nav_Heatmap"] = "Horas pico",
        ["Nav_FirstDay"] = "Primeras 24 h",
        ["Nav_Queue"] = "Cola de publicación",
        ["Title_Ranking"] = "Ranking de videos",
        ["Sub_Ranking"] = "Ordenados por vistas totales, con lo ganado en la última hora y el último día.",
        ["Title_Heatmap"] = "Horas pico",
        ["Sub_Heatmap"] = "Vistas ganadas por día y hora (hora de Perú), últimas 4 semanas.",
        ["Title_FirstDay"] = "Primeras 24 horas",
        ["Sub_FirstDay"] = "Vistas acumuladas por hora desde la publicación, contra el promedio del canal.",
        ["Title_Queue"] = "Cola de publicación",
        ["Sub_Queue"] = "Lo que el servicio va a subir, lo que ya subió y lo que necesita atención.",
        ["BestHours"] = "Mejores 3 horas para publicar",
        ["Kpi_Total"] = "Vistas totales",
        ["Kpi_Today"] = "Vistas hoy",
        ["Kpi_Videos"] = "Videos publicados",
        ["Kpi_Next"] = "Próxima publicación",
    };

    private static Dictionary<string, string> Texts(params (string Key, string Value)[] overrides)
    {
        var texts = new Dictionary<string, string>(DefaultTexts);
        foreach (var (key, value) in overrides) texts[key] = value;
        return texts;
    }

    public static ThemeDefinition Cubitos { get; } = new()
    {
        Id = "cubitos",
        DisplayName = "Cubitos",
        PageGradient = [Rgb("#0b1230"), Rgb("#111b48")],
        TitleBar = Rgb("#070c22"),
        PageText = Colors.White,
        PageMuted = Rgb("#aab4e0"),
        CardGradient = [Rgb("#1a2660"), Rgb("#152052")],
        CardStroke = Colors.Black,
        CardStrokeThickness = 3,
        CardCornerRadius = 18,
        CardText = Colors.White,
        CardMuted = Rgb("#aab4e0"),
        ShadowColor = Colors.Black,
        ShadowBlur = 0,
        ShadowDepth = 8,
        ShadowOpacity = 1,
        HighlightStroke = Rgb("#ffd23a"),
        Accent = Rgb("#ffd23a"),
        AccentText = Rgb("#0b1230"),
        Highlight = Rgb("#e0402f"),
        Positive = Rgb("#5ee08a"),
        ChartPrimary = Rgb("#ffd23a"),
        ChartSecondary = Rgb("#3fc6bd"),
        GridLine = Rgb("#2c3a7a"),
        HeatStops = [Rgb("#18224f"), Rgb("#1f8f8a"), Rgb("#ffd23a"), Rgb("#e0402f")],
        Gold = Rgb("#ffd23a"),
        Silver = Rgb("#d5dde8"),
        Bronze = Rgb("#d0803f"),
        OtherRank = Rgb("#2f3d82"),
        HeadingFont = new FontFamily("Arial Black"),
        BodyFont = new FontFamily("Segoe UI"),
        NotchFill = Rgb("#05081a"),
        NotchGlow = Rgb("#ffd23a"),
        NotchStroke = Rgb("#000000"),
        StatusColors = new Dictionary<QueueStatus, Color>
        {
            [QueueStatus.Pending] = Rgb("#4c6ef5"),
            [QueueStatus.Uploading] = Rgb("#3fc6bd"),
            [QueueStatus.Scheduled] = Rgb("#ffd23a"),
            [QueueStatus.Published] = Rgb("#37b24d"),
            [QueueStatus.ReplacedOldHidden] = Rgb("#2b8a3e"),
            [QueueStatus.Kept] = Rgb("#8d6e63"),
            [QueueStatus.Failed] = Rgb("#e0402f"),
            [QueueStatus.WaitingForQuota] = Rgb("#f08c00"),
            [QueueStatus.Cancelled] = Rgb("#5c6488"),
        },
        Texts = Texts(),
    };

    /// <summary>
    /// Night theme-park mood from the owner's palette (#190815 #351a2a #32386f #1d57c6 #665783 #8b9bd9 #b23118 #d55137
    /// #f04106 #fa9c33 #eea079): midnight plum, indigo panels, pumpkin and lantern glows, jellyfish lavender, gold flourishes.
    /// </summary>
    public static ThemeDefinition Cazadragones { get; } = new()
    {
        Id = "halloween",
        DisplayName = "Halloween: Cazadragones",
        PageGradient = [Rgb("#190815"), Rgb("#351a2a"), Rgb("#1a0c1e")],
        TitleBar = Rgb("#12060f"),
        PageText = Rgb("#f7e9d7"),
        PageMuted = Rgb("#b3a6cc"),
        CardGradient = [Rgb("#32386f"), Rgb("#282c5c"), Rgb("#1f2149")],
        CardStroke = Rgb("#b8892f"),
        CardStrokeThickness = 2,
        CardCornerRadius = 6,
        CardText = Rgb("#f7e9d7"),
        CardMuted = Rgb("#aaa4d2"),
        ShadowColor = Colors.Black,
        ShadowBlur = 22,
        ShadowDepth = 8,
        ShadowOpacity = 0.85,
        HighlightStroke = Rgb("#fa9c33"),
        Accent = Rgb("#fa9c33"),
        AccentText = Rgb("#190815"),
        Highlight = Rgb("#f04106"),
        Positive = Rgb("#eea079"),
        ChartPrimary = Rgb("#fa9c33"),
        ChartSecondary = Rgb("#8b9bd9"),
        GridLine = Rgb("#4a5088"),
        HeatStops = [Rgb("#190815"), Rgb("#32386f"), Rgb("#b23118"), Rgb("#d55137"), Rgb("#fa9c33"), Rgb("#eea079")],
        Gold = Rgb("#e2b33c"),
        Silver = Rgb("#c9cfe6"),
        Bronze = Rgb("#c0743a"),
        OtherRank = Rgb("#665783"),
        HeadingFont = Cinzel,
        BodyFont = new FontFamily("Georgia"),
        Ornate = true,
        Embers = true,
        RomanRanks = true,
        StatusColors = new Dictionary<QueueStatus, Color>
        {
            [QueueStatus.Pending] = Rgb("#1d57c6"),
            [QueueStatus.Uploading] = Rgb("#665783"),
            [QueueStatus.Scheduled] = Rgb("#b07a1e"),
            [QueueStatus.Published] = Rgb("#2f7a4a"),
            [QueueStatus.ReplacedOldHidden] = Rgb("#23603c"),
            [QueueStatus.Kept] = Rgb("#665783"),
            [QueueStatus.Failed] = Rgb("#b23118"),
            [QueueStatus.WaitingForQuota] = Rgb("#d55137"),
            [QueueStatus.Cancelled] = Rgb("#4a4060"),
        },
        Texts = Texts(
            ("BrandSubtitle", "Crónicas del reino"),
            ("Nav_Ranking", "Salón de los Héroes"),
            ("Nav_Heatmap", "Horas de brasa"),
            ("Nav_FirstDay", "Primer amanecer"),
            ("Nav_Queue", "Misiones"),
            ("Title_Ranking", "Salón de los Héroes"),
            ("Sub_Ranking", "Las gestas más vistas del reino. Oro, plata y bronce para los tres primeros."),
            ("Title_Heatmap", "Horas de brasa"),
            ("Sub_Heatmap", "Cuándo arde la audiencia: vistas por día y hora (hora de Perú), últimas 4 semanas."),
            ("Title_FirstDay", "Primer amanecer"),
            ("Sub_FirstDay", "Las primeras 24 horas de cada gesta, contra el promedio del gremio."),
            ("Title_Queue", "Misiones"),
            ("Sub_Queue", "Encargos del heraldo: lo que partirá, lo cumplido y lo que pide auxilio."),
            ("BestHours", "Las 3 horas más propicias para publicar"),
            ("Kpi_Total", "Gloria total"),
            ("Kpi_Today", "Vistas hoy"),
            ("Kpi_Videos", "Gestas publicadas"),
            ("Kpi_Next", "Próxima misión")),
    };

    public static ThemeDefinition Neon { get; } = new()
    {
        Id = "neon",
        DisplayName = "Neón",
        PageGradient = [Rgb("#04050d"), Rgb("#0b0424")],
        TitleBar = Rgb("#03040b"),
        PageText = Rgb("#e8f9ff"),
        PageMuted = Rgb("#8590b8"),
        CardGradient = [Rgb("#0e1130"), Rgb("#0a0c22")],
        CardStroke = Rgb("#00e5ff"),
        CardStrokeThickness = 1.5,
        CardCornerRadius = 14,
        CardText = Rgb("#e8f9ff"),
        CardMuted = Rgb("#8590b8"),
        ShadowColor = Rgb("#00e5ff"),
        ShadowBlur = 16,
        ShadowDepth = 0,
        ShadowOpacity = 0.45,
        HighlightStroke = Rgb("#ff2bd6"),
        Accent = Rgb("#00e5ff"),
        AccentText = Rgb("#04050d"),
        Highlight = Rgb("#ff2bd6"),
        Positive = Rgb("#39ff9f"),
        ChartPrimary = Rgb("#00e5ff"),
        ChartSecondary = Rgb("#ff2bd6"),
        GridLine = Rgb("#1d2457"),
        HeatStops = [Rgb("#0e1130"), Rgb("#3a0ca3"), Rgb("#ff2bd6"), Rgb("#00e5ff")],
        Gold = Rgb("#ffe14d"),
        Silver = Rgb("#c6f4ff"),
        Bronze = Rgb("#ff8a3d"),
        OtherRank = Rgb("#6a74d8"),
        HeadingFont = new FontFamily("Bahnschrift SemiBold"),
        BodyFont = new FontFamily("Segoe UI"),
        NotchFill = Rgb("#03040c"),
        NotchGlow = Rgb("#ff2bd6"),
        NotchStroke = Rgb("#00e5ff"),
        NeonGrid = true,
        StatusColors = new Dictionary<QueueStatus, Color>
        {
            [QueueStatus.Pending] = Rgb("#3a0ca3"),
            [QueueStatus.Uploading] = Rgb("#00b8d4"),
            [QueueStatus.Scheduled] = Rgb("#7b2ff7"),
            [QueueStatus.Published] = Rgb("#00c87a"),
            [QueueStatus.ReplacedOldHidden] = Rgb("#00966b"),
            [QueueStatus.Kept] = Rgb("#5a5f8a"),
            [QueueStatus.Failed] = Rgb("#ff2b6a"),
            [QueueStatus.WaitingForQuota] = Rgb("#ff8a3d"),
            [QueueStatus.Cancelled] = Rgb("#3b3f66"),
        },
        Texts = Texts(),
    };

    public static IReadOnlyList<ThemeDefinition> All { get; } = [Cubitos, Cazadragones, Neon];

    public static ThemeDefinition Find(string? id) =>
        All.FirstOrDefault(t => string.Equals(t.Id, id, StringComparison.OrdinalIgnoreCase)) ?? Cubitos;
}
