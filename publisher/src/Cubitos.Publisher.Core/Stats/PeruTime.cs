namespace Cubitos.Publisher.Core.Stats;

/// <summary>Peru uses a fixed UTC-05:00 offset with no daylight saving.</summary>
public static class PeruTime
{
    public static readonly TimeSpan Offset = TimeSpan.FromHours(-5);

    public static DateTimeOffset ToPeru(DateTimeOffset instant) => instant.ToOffset(Offset);
}
