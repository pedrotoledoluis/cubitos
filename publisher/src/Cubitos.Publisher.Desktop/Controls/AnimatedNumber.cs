using System.Windows;
using System.Windows.Controls;
using Cubitos.Publisher.Dashboard.Core.Formatting;
using Cubitos.Publisher.Dashboard.Core.Presentation;
using Cubitos.Publisher.Desktop.Rendering;

namespace Cubitos.Publisher.Desktop.Controls;

public enum NumberStyle
{
    /// <summary>"12,345".</summary>
    Views,
    /// <summary>"+12" or "0".</summary>
    Delta,
}

/// <summary>A number that counts up (or down) to its new value over 0.7 s with an ease-out, driven by the frame clock.</summary>
public sealed class AnimatedNumber : TextBlock, IFrameListener
{
    public static readonly DependencyProperty ValueProperty = DependencyProperty.Register(
        nameof(Value), typeof(double), typeof(AnimatedNumber), new PropertyMetadata(double.NaN, (d, e) => ((AnimatedNumber)d).OnValue((double)e.OldValue, (double)e.NewValue)));

    public static readonly DependencyProperty StyleKindProperty = DependencyProperty.Register(
        nameof(StyleKind), typeof(NumberStyle), typeof(AnimatedNumber), new PropertyMetadata(NumberStyle.Views, (d, _) => ((AnimatedNumber)d).Show()));

    private readonly NumberTween _tween = new(TimeSpan.FromMilliseconds(700));
    private double _shown = double.NaN;
    private bool _listening;

    public AnimatedNumber()
    {
        Unloaded += (_, _) => Listen(false);
        Loaded += (_, _) =>
        {
            // Resume a count that was interrupted while hidden, or snap to the value it missed.
            if (_tween.IsRunning(FrameClock.Now.TotalSeconds)) Listen(true);
            else if (!double.IsNaN(Value)) { _shown = Value; Show(); }
        };
    }

    public double Value { get => (double)GetValue(ValueProperty); set => SetValue(ValueProperty, value); }
    public NumberStyle StyleKind { get => (NumberStyle)GetValue(StyleKindProperty); set => SetValue(StyleKindProperty, value); }

    public void OnFrame(TimeSpan now, double dt)
    {
        var t = now.TotalSeconds;
        _shown = _tween.Value(t);
        Show();
        if (!_tween.IsRunning(t)) Listen(false);
    }

    private void OnValue(double oldValue, double newValue)
    {
        var now = FrameClock.Now.TotalSeconds;
        // The first value counts up from zero; later ones from whatever is on screen.
        var from = double.IsNaN(_shown) ? (double.IsNaN(oldValue) ? 0 : oldValue) : _shown;
        _tween.Retarget(now, from, newValue);
        _shown = _tween.Value(now);
        Show();
        Listen(_tween.IsRunning(now));
    }

    private void Listen(bool on)
    {
        if (on == _listening) return;
        _listening = on;
        if (on) FrameClock.Add(this); else FrameClock.Remove(this);
    }

    private void Show()
    {
        var v = double.IsNaN(_shown) ? 0 : _shown;
        var text = StyleKind == NumberStyle.Delta ? NumberFormat.Delta(v) : NumberFormat.Views(v);
        if (Text != text) Text = text;
    }
}
