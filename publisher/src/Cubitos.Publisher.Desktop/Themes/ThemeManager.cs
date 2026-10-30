using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Effects;

namespace Cubitos.Publisher.Desktop.Themes;

/// <summary>
/// Swaps the theme ResourceDictionary in the application resources at runtime. XAML uses DynamicResource for every
/// themed value, so the swap restyles the open window in place. Every brush and effect is frozen (cheap to share and
/// render). Custom renderers listen to <see cref="Changed"/>.
/// </summary>
public static class ThemeManager
{
    private static ResourceDictionary? _active;

    public static ThemeDefinition Current { get; private set; } = ThemeCatalog.Cubitos;

    public static event Action<ThemeDefinition>? Changed;

    public static void Apply(ThemeDefinition theme)
    {
        var resources = Application.Current.Resources;
        var next = Build(theme);
        resources.MergedDictionaries.Add(next);
        if (_active is not null) resources.MergedDictionaries.Remove(_active);
        _active = next;
        Current = theme;
        Changed?.Invoke(theme);
    }

    public static T Frozen<T>(T freezable) where T : Freezable
    {
        if (freezable.CanFreeze) freezable.Freeze();
        return freezable;
    }

    public static SolidColorBrush Solid(Color color) => Frozen(new SolidColorBrush(color));

    public static LinearGradientBrush Gradient(Color[] colors, Point start, Point end)
    {
        var brush = new LinearGradientBrush { StartPoint = start, EndPoint = end };
        for (var i = 0; i < colors.Length; i++)
            brush.GradientStops.Add(new GradientStop(colors[i], colors.Length == 1 ? 0 : (double)i / (colors.Length - 1)));
        return Frozen(brush);
    }

    private static ResourceDictionary Build(ThemeDefinition t)
    {
        var d = new ResourceDictionary
        {
            ["PageBackground"] = Gradient(t.PageGradient, new Point(0, 0), new Point(0.35, 1)),
            ["TitleBarBackground"] = Solid(t.TitleBar),
            ["PageText"] = Solid(t.PageText),
            ["PageMuted"] = Solid(t.PageMuted),
            ["CardBackground"] = Gradient(t.CardGradient, new Point(0, 0), new Point(0.35, 1)),
            ["CardStroke"] = Solid(t.CardStroke),
            ["CardHighlightStroke"] = Solid(t.HighlightStroke),
            ["CardStrokeThickness"] = new Thickness(t.CardStrokeThickness),
            ["CardCornerRadius"] = new CornerRadius(t.CardCornerRadius),
            ["CardPadding"] = new Thickness(t.Ornate ? 22 : 18, t.Ornate ? 18 : 14, t.Ornate ? 22 : 18, t.Ornate ? 18 : 14),
            ["CardGlowBrush"] = Solid(ThemeDefinition.WithAlpha(t.HighlightStroke, 0.35)),
            ["CardGlowRadius"] = new CornerRadius(t.CardCornerRadius + 4),
            ["CardHoverGlow"] = Frozen(new DropShadowEffect
            {
                Color = t.HighlightStroke,
                BlurRadius = 24,
                ShadowDepth = 0,
                Opacity = 0.75,
                RenderingBias = RenderingBias.Performance,
            }),
            ["CardText"] = Solid(t.CardText),
            ["CardMuted"] = Solid(t.CardMuted),
            ["Accent"] = Solid(t.Accent),
            ["AccentText"] = Solid(t.AccentText),
            ["Highlight"] = Solid(t.Highlight),
            ["Positive"] = Solid(t.Positive),
            ["ChartPrimary"] = Solid(t.ChartPrimary),
            ["ChartSecondary"] = Solid(t.ChartSecondary),
            ["InputBackground"] = Solid(t.CardGradient[0]),
            ["InputHover"] = Solid(ThemeDefinition.Lerp(t.CardGradient[0], t.Accent, 0.18)),
            ["PopupBackground"] = Solid(t.CardGradient[^1]),
            ["ScrollThumb"] = Solid(ThemeDefinition.WithAlpha(t.PageMuted, 0.45)),
            ["ScrollThumbHover"] = Solid(ThemeDefinition.WithAlpha(t.Accent, 0.8)),
            ["ChromeHover"] = Solid(ThemeDefinition.WithAlpha(t.PageText, 0.12)),
            ["NotchText"] = Solid(t.Ornate ? t.PageText : Colors.White),
            ["NotchMuted"] = Solid(t.PageMuted),
            ["NotchSelected"] = Solid(ThemeDefinition.WithAlpha(t.NotchGlow, 0.9)),
            ["NotchHover"] = Solid(ThemeDefinition.WithAlpha(t.NotchGlow, 0.16)),
            ["NotchSelectedText"] = Solid(t.NotchFill),
            ["HeadingFont"] = t.HeadingFont,
            ["BodyFont"] = t.BodyFont,
            ["OrnateVisibility"] = t.Ornate ? Visibility.Visible : Visibility.Collapsed,
            ["RankHeaderPadding"] = new Thickness(t.CardPaddingX, 6, t.CardPaddingX, 0),
            ["BadgeCornerRadius"] = new CornerRadius(t.Ornate ? 14 : 8),
        };
        foreach (var (key, value) in t.Texts) d["T_" + key] = value;
        return d;
    }
}
