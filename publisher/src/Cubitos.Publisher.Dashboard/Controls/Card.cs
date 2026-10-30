using Cubitos.Publisher.Dashboard.Drawing;

namespace Cubitos.Publisher.Dashboard.Controls;

/// <summary>
/// A themed card: a Border styled by the active theme, plus an ornamental frame overlay that only the ornate theme shows.
/// </summary>
[ContentProperty(nameof(CardContent))]
public sealed class Card : ContentView
{
    public static readonly BindableProperty CardContentProperty = BindableProperty.Create(
        nameof(CardContent), typeof(View), typeof(Card), propertyChanged: (b, _, n) => ((Card)b)._border.Content = (View?)n);

    public static readonly BindableProperty IsHighlightedProperty = BindableProperty.Create(
        nameof(IsHighlighted), typeof(bool), typeof(Card), false, propertyChanged: (b, _, _) => ((Card)b).ApplyStyle());

    private readonly Border _border = new();

    public Card()
    {
        var frame = new GraphicsView { Drawable = OrnateFrameDrawable.Instance, InputTransparent = true };
        frame.SetDynamicResource(IsVisibleProperty, "ShowOrnaments");
        ApplyStyle();
        Content = new Grid { Children = { _border, frame } };
    }

    public View? CardContent
    {
        get => (View?)GetValue(CardContentProperty);
        set => SetValue(CardContentProperty, value);
    }

    public bool IsHighlighted
    {
        get => (bool)GetValue(IsHighlightedProperty);
        set => SetValue(IsHighlightedProperty, value);
    }

    private void ApplyStyle() => _border.SetDynamicResource(StyleProperty, IsHighlighted ? "CardHighlightStyle" : "CardStyle");
}
