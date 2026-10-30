namespace Cubitos.Publisher.Dashboard.Core.Navigation;

/// <summary>Idle animations of the notch pumpkin, one at a time.</summary>
public enum PumpkinMood
{
    Flicker,
    Wink,
    Bounce,
    FlameBurst,
    SparkShower,
}

/// <summary>Fixed rotation of idle moods so the pumpkin always does something different every few seconds.</summary>
public static class PumpkinIdleCycle
{
    public static readonly TimeSpan Period = TimeSpan.FromSeconds(4);

    private static readonly PumpkinMood[] Order =
    [
        PumpkinMood.Flicker, PumpkinMood.Wink, PumpkinMood.FlameBurst, PumpkinMood.Flicker,
        PumpkinMood.Bounce, PumpkinMood.SparkShower,
    ];

    public static int Length => Order.Length;

    /// <summary>Mood at <paramref name="seconds"/> since start and the phase in [0, 1) inside its period.</summary>
    public static (PumpkinMood Mood, double Phase) At(double seconds)
    {
        if (seconds < 0 || double.IsNaN(seconds)) seconds = 0;
        var periods = seconds / Period.TotalSeconds;
        var index = (long)Math.Floor(periods);
        return (Order[index % Order.Length], periods - index);
    }
}
