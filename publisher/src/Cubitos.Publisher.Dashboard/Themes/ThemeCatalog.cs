using Cubitos.Publisher.Core.Queue;

namespace Cubitos.Publisher.Dashboard.Themes;

public static class ThemeCatalog
{
    private static Color C(string hex) => Color.FromArgb(hex);

    private static readonly Dictionary<string, string> DefaultTexts = new()
    {
        ["Brand"] = "HISTORIA EN CUBITOS",
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
        PageGradient = [C("#0b1230"), C("#111b48")],
        SidebarBackground = C("#070c22"),
        SidebarStroke = C("#000000"),
        PageText = Colors.White,
        PageMuted = C("#aab4e0"),
        CardGradient = [C("#1a2660"), C("#152052")],
        CardStroke = Colors.Black,
        CardStrokeThickness = 3,
        CardCornerRadius = 18,
        CardText = Colors.White,
        CardMuted = C("#aab4e0"),
        CardShadow = new Shadow { Brush = new SolidColorBrush(Colors.Black), Offset = new Point(6, 6), Radius = 0, Opacity = 1 },
        HighlightStroke = C("#ffd23a"),
        Accent = C("#ffd23a"),
        AccentText = C("#0b1230"),
        Highlight = C("#e0402f"),
        Positive = C("#5ee08a"),
        ChartPrimary = C("#ffd23a"),
        ChartSecondary = C("#3fc6bd"),
        GridLine = C("#2c3a7a"),
        HeatStops = [C("#18224f"), C("#1f8f8a"), C("#ffd23a"), C("#e0402f")],
        Gold = C("#ffd23a"),
        Silver = C("#d5dde8"),
        Bronze = C("#d0803f"),
        OtherRank = C("#2f3d82"),
        HeadingFont = "Arial Black",
        BodyFont = "Segoe UI",
        DrawingFont = "Segoe UI",
        DrawingHeadingFont = "Arial Black",
        NotchFill = C("#05081a"),
        NotchGlow = C("#ffd23a"),
        NotchStroke = C("#000000"),
        StatusColors = new Dictionary<QueueStatus, Color>
        {
            [QueueStatus.Pending] = C("#4c6ef5"),
            [QueueStatus.Uploading] = C("#3fc6bd"),
            [QueueStatus.Scheduled] = C("#ffd23a"),
            [QueueStatus.Published] = C("#37b24d"),
            [QueueStatus.ReplacedOldHidden] = C("#2b8a3e"),
            [QueueStatus.Kept] = C("#8d6e63"),
            [QueueStatus.Failed] = C("#e0402f"),
            [QueueStatus.WaitingForQuota] = C("#f08c00"),
            [QueueStatus.Cancelled] = C("#5c6488"),
        },
        Texts = Texts(),
    };

    public static ThemeDefinition Cazadragones { get; } = new()
    {
        // Night theme-park mood: midnight plum, indigo panels, pumpkin and lantern glows, jellyfish lavender.
        Id = "halloween",
        DisplayName = "Halloween: Cazadragones",
        PageGradient = [C("#190815"), C("#351a2a"), C("#1a0c1e")],
        SidebarBackground = C("#12060f"),
        SidebarStroke = C("#a87b2a"),
        PageText = C("#f7e9d7"),
        PageMuted = C("#b3a6cc"),
        CardGradient = [C("#32386f"), C("#282c5c"), C("#1f2149")],
        CardStroke = C("#b8892f"),
        CardStrokeThickness = 2,
        CardCornerRadius = 6,
        CardText = C("#f7e9d7"),
        CardMuted = C("#aaa4d2"),
        CardShadow = new Shadow { Brush = new SolidColorBrush(Colors.Black), Offset = new Point(0, 8), Radius = 22, Opacity = 0.85f },
        HighlightStroke = C("#fa9c33"),
        Accent = C("#fa9c33"),
        AccentText = C("#190815"),
        Highlight = C("#f04106"),
        Positive = C("#eea079"),
        ChartPrimary = C("#fa9c33"),
        ChartSecondary = C("#8b9bd9"),
        GridLine = C("#4a5088"),
        HeatStops = [C("#190815"), C("#32386f"), C("#b23118"), C("#fa9c33"), C("#eea079")],
        Gold = C("#e2b33c"),
        Silver = C("#c9cfe6"),
        Bronze = C("#c0743a"),
        OtherRank = C("#665783"),
        HeadingFont = "CinzelDecorative",
        BodyFont = "Georgia",
        DrawingFont = "Georgia",
        DrawingHeadingFont = "Georgia",
        Ornate = true,
        Embers = true,
        RomanRanks = true,
        StatusColors = new Dictionary<QueueStatus, Color>
        {
            [QueueStatus.Pending] = C("#1d57c6"),
            [QueueStatus.Uploading] = C("#665783"),
            [QueueStatus.Scheduled] = C("#b07a1e"),
            [QueueStatus.Published] = C("#2f7a4a"),
            [QueueStatus.ReplacedOldHidden] = C("#23603c"),
            [QueueStatus.Kept] = C("#665783"),
            [QueueStatus.Failed] = C("#b23118"),
            [QueueStatus.WaitingForQuota] = C("#f04106"),
            [QueueStatus.Cancelled] = C("#4a4060"),
        },
        Texts = Texts(
            ("Brand", "HISTORIA EN CUBITOS"),
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
        PageGradient = [C("#04050d"), C("#0b0424")],
        SidebarBackground = C("#060818"),
        SidebarStroke = C("#00e5ff"),
        PageText = C("#e8f9ff"),
        PageMuted = C("#8590b8"),
        CardGradient = [C("#0e1130"), C("#0a0c22")],
        CardStroke = C("#00e5ff"),
        CardStrokeThickness = 1.5,
        CardCornerRadius = 14,
        CardText = C("#e8f9ff"),
        CardMuted = C("#8590b8"),
        CardShadow = new Shadow { Brush = new SolidColorBrush(C("#00e5ff")), Offset = new Point(0, 0), Radius = 16, Opacity = 0.45f },
        HighlightStroke = C("#ff2bd6"),
        Accent = C("#00e5ff"),
        AccentText = C("#04050d"),
        Highlight = C("#ff2bd6"),
        Positive = C("#39ff9f"),
        ChartPrimary = C("#00e5ff"),
        ChartSecondary = C("#ff2bd6"),
        GridLine = C("#1d2457"),
        HeatStops = [C("#0e1130"), C("#3a0ca3"), C("#ff2bd6"), C("#00e5ff")],
        Gold = C("#ffe14d"),
        Silver = C("#c6f4ff"),
        Bronze = C("#ff8a3d"),
        OtherRank = C("#6a74d8"),
        HeadingFont = "Bahnschrift",
        BodyFont = "Segoe UI",
        DrawingFont = "Bahnschrift",
        DrawingHeadingFont = "Bahnschrift",
        NotchFill = C("#03040c"),
        NotchGlow = C("#ff2bd6"),
        NotchStroke = C("#00e5ff"),
        NeonGrid = true,
        StatusColors = new Dictionary<QueueStatus, Color>
        {
            [QueueStatus.Pending] = C("#3a0ca3"),
            [QueueStatus.Uploading] = C("#00b8d4"),
            [QueueStatus.Scheduled] = C("#7b2ff7"),
            [QueueStatus.Published] = C("#00c87a"),
            [QueueStatus.ReplacedOldHidden] = C("#00966b"),
            [QueueStatus.Kept] = C("#5a5f8a"),
            [QueueStatus.Failed] = C("#ff2b6a"),
            [QueueStatus.WaitingForQuota] = C("#ff8a3d"),
            [QueueStatus.Cancelled] = C("#3b3f66"),
        },
        Texts = Texts(),
    };

    public static IReadOnlyList<ThemeDefinition> All { get; } = [Cubitos, Cazadragones, Neon];

    public static ThemeDefinition Find(string? id) =>
        All.FirstOrDefault(t => string.Equals(t.Id, id, StringComparison.OrdinalIgnoreCase)) ?? Cubitos;
}
