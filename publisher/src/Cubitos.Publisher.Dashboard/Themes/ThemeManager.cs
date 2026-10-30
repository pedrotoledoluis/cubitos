using Microsoft.Maui.Controls.Shapes;

namespace Cubitos.Publisher.Dashboard.Themes;

/// <summary>
/// Swaps the theme ResourceDictionary in the application resources at runtime. Every themed property in XAML uses
/// DynamicResource, so the swap restyles the open window without a restart.
/// </summary>
public static class ThemeManager
{
    private static ResourceDictionary? _active;

    public static ThemeDefinition Current { get; private set; } = ThemeCatalog.Cubitos;

    public static event Action<ThemeDefinition>? Changed;

    public static void Apply(ThemeDefinition theme)
    {
        var resources = Application.Current!.Resources;
        var next = Build(theme);
        if (_active is not null) resources.MergedDictionaries.Remove(_active);
        resources.MergedDictionaries.Add(next);
        _active = next;
        Current = theme;
        Changed?.Invoke(theme);
    }

    private static LinearGradientBrush Vertical(params Color[] colors)
    {
        var brush = new LinearGradientBrush { StartPoint = new Point(0, 0), EndPoint = new Point(0.35, 1) };
        for (var i = 0; i < colors.Length; i++)
            brush.GradientStops.Add(new GradientStop(colors[i], colors.Length == 1 ? 0 : (float)i / (colors.Length - 1)));
        return brush;
    }

    private static ResourceDictionary Build(ThemeDefinition t)
    {
        var d = new ResourceDictionary
        {
            ["PageBackground"] = Vertical(t.PageGradient),
            ["SidebarBackground"] = new SolidColorBrush(t.SidebarBackground),
            ["SidebarStroke"] = t.SidebarStroke,
            ["PageText"] = t.PageText,
            ["PageMuted"] = t.PageMuted,
            ["CardText"] = t.CardText,
            ["CardMuted"] = t.CardMuted,
            ["Accent"] = t.Accent,
            ["AccentBrush"] = new SolidColorBrush(t.Accent),
            ["AccentText"] = t.AccentText,
            ["Highlight"] = t.Highlight,
            ["Positive"] = t.Positive,
            ["ChartPrimary"] = t.ChartPrimary,
            ["ChartSecondary"] = t.ChartSecondary,
            ["InputBackground"] = t.CardGradient[0],
            ["NavSelectedBackground"] = new SolidColorBrush(t.Accent),
            ["NavIdleBackground"] = new SolidColorBrush(Colors.Transparent),
            ["HeadingFont"] = t.HeadingFont,
            ["BodyFont"] = t.BodyFont,
            ["ShowOrnaments"] = t.Ornate,
            ["CardStyle"] = CardStyle(t, t.CardStroke),
            ["CardHighlightStyle"] = CardStyle(t, t.HighlightStroke),
            ["BadgeShape"] = new RoundRectangle { CornerRadius = t.Ornate ? 14 : 8 },
        };
        foreach (var (key, value) in t.Texts) d["T_" + key] = value;
        return d;
    }

    private static Style CardStyle(ThemeDefinition t, Color stroke) => new(typeof(Border))
    {
        Setters =
        {
            new Setter { Property = Border.BackgroundProperty, Value = Vertical(t.CardGradient) },
            new Setter { Property = Border.StrokeProperty, Value = new SolidColorBrush(stroke) },
            new Setter { Property = Border.StrokeThicknessProperty, Value = t.CardStrokeThickness },
            new Setter { Property = Border.StrokeShapeProperty, Value = new RoundRectangle { CornerRadius = t.CardCornerRadius } },
            new Setter { Property = VisualElement.ShadowProperty, Value = t.CardShadow },
            new Setter { Property = Border.PaddingProperty, Value = new Thickness(t.Ornate ? 22 : 18, t.Ornate ? 18 : 14) },
        },
    };
}
