using System.Globalization;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;

namespace Cubitos.Publisher.Dashboard.Core.Formatting;

/// <summary>Spanish date/time text in Peru time. Names are fixed so output never depends on the OS culture data.</summary>
public static class PeruFormat
{
    private static readonly string[] Days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
    private static readonly string[] Months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

    /// <summary>Monday-first short day names, matching the heatmap rows.</summary>
    public static IReadOnlyList<string> WeekdaysMondayFirst { get; } = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    public static string Clock(DateTimeOffset instant) =>
        PeruTime.ToPeru(instant).ToString("HH:mm", CultureInfo.InvariantCulture);

    public static string DayTime(DateTimeOffset instant)
    {
        var p = PeruTime.ToPeru(instant);
        return $"{Days[(int)p.DayOfWeek]} {p.Day} {Months[p.Month - 1]} · {p:HH:mm}";
    }

    public static string HourRange(int hour) => $"{hour:00}:00 – {(hour + 1) % 24:00}:00";
}

public static class Countdown
{
    public static string Format(TimeSpan remaining)
    {
        if (remaining <= TimeSpan.Zero) return "ahora";
        var minutes = (long)Math.Ceiling(remaining.TotalMinutes);
        if (minutes < 60) return $"en {minutes} min";
        if (minutes < 24 * 60) return $"en {minutes / 60} h {minutes % 60:00} min";
        var hours = (long)remaining.TotalHours;
        return $"en {hours / 24} d {hours % 24} h";
    }
}

public static class NumberFormat
{
    public static string Views(double views) => Math.Round(views).ToString("#,0", CultureInfo.InvariantCulture);

    public static string Delta(double views)
    {
        var rounded = Math.Round(views);
        return rounded >= 1 ? "+" + rounded.ToString("#,0", CultureInfo.InvariantCulture) : "0";
    }
}

public static class StatusText
{
    public static string Label(QueueStatus status) => status switch
    {
        QueueStatus.Pending => "Pendiente",
        QueueStatus.Uploading => "Subiendo",
        QueueStatus.Scheduled => "Programado",
        QueueStatus.Published => "Publicado",
        QueueStatus.ReplacedOldHidden => "Reemplazado",
        QueueStatus.Kept => "Se conservó el anterior",
        QueueStatus.Failed => "Falló",
        QueueStatus.WaitingForQuota => "Esperando cuota",
        QueueStatus.Cancelled => "Cancelado",
        _ => status.ToString(),
    };
}
