namespace Cubitos.Publisher.Dashboard.Controls;

/// <summary>
/// A label that word-wraps up to <see cref="Label.MaxLines"/> lines and puts the ellipsis only at the end of the last
/// line. MAUI's own TailTruncation never wraps on Windows, and WordWrap + MaxLines cuts the text without an ellipsis.
/// </summary>
public sealed class ClampedLabel : Label
{
    public ClampedLabel()
    {
        MaxLines = 2;
        LineBreakMode = LineBreakMode.WordWrap;
        LineHeight = 1.1;
    }

    protected override void OnHandlerChanged()
    {
        base.OnHandlerChanged();
        Apply();
    }

    protected override void OnPropertyChanged(string? propertyName = null)
    {
        base.OnPropertyChanged(propertyName);
        if (propertyName is nameof(Text) or nameof(MaxLines) or nameof(LineBreakMode) or nameof(FontSize)) Apply();
    }

    private void Apply()
    {
#if WINDOWS
        if (Handler?.PlatformView is Microsoft.UI.Xaml.Controls.TextBlock block)
        {
            block.TextWrapping = Microsoft.UI.Xaml.TextWrapping.WrapWholeWords;
            block.TextTrimming = Microsoft.UI.Xaml.TextTrimming.CharacterEllipsis;
            block.MaxLines = MaxLines > 0 ? MaxLines : 0;
        }
#endif
    }
}
