using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Stats;

namespace Cubitos.Publisher.Infrastructure.Stats;

/// <summary>
/// Writes <see cref="ChannelStatsReport"/> as the website's <c>channel-stats.json</c> (schema version 1). Times are
/// ISO 8601 in Peru time with offset and whole seconds. The file is replaced atomically so the site never reads half a file.
/// </summary>
public sealed class JsonChannelStatsWriter(string path) : IChannelStatsWriter
{
    public const int SchemaVersion = 1;

    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        // Keep accents readable; the output is a static file, never embedded in HTML.
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
    };

    public string Path { get; } = path;

    public async Task WriteAsync(ChannelStatsReport report, CancellationToken ct = default)
    {
        var full = System.IO.Path.GetFullPath(Path);
        var dir = System.IO.Path.GetDirectoryName(full)!;
        Directory.CreateDirectory(dir);
        var temp = System.IO.Path.Combine(dir, $".{System.IO.Path.GetFileName(full)}.{Guid.NewGuid():N}.tmp");
        try
        {
            await File.WriteAllTextAsync(temp, Serialize(report) + "\n", ct);
            File.Move(temp, full, overwrite: true);
        }
        finally
        {
            if (File.Exists(temp)) File.Delete(temp);
        }
    }

    public static string Serialize(ChannelStatsReport report) => JsonSerializer.Serialize(ToDto(report), Options);

    private static ReportDto ToDto(ChannelStatsReport r) => new(
        SchemaVersion,
        Time(r.GeneratedAt),
        new ChannelDto(r.Channel.Videos, r.Channel.Views, r.Channel.Likes, r.Channel.Comments, r.Channel.Views24h),
        r.Videos.Select(v => new VideoDto(v.VideoId, v.Title, Time(v.PublishedAt), v.Views, v.Likes, v.Comments, v.Views24h, v.Trend24h)).ToList(),
        r.DailyViews.Select(d => new DayDto(d.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), d.Views)).ToList(),
        new QueueDto(
            r.Queue.Counts.OrderBy(c => c.Key).ToDictionary(c => c.Key.ToString(), c => c.Value),
            Entry(r.Queue.Next),
            r.Queue.Upcoming.Select(e => Entry(e)!).ToList()));

    private static QueueEntryDto? Entry(QueueEntry? e) =>
        e is null ? null : new QueueEntryDto(e.EpisodeId, e.Title, e.Status.ToString(), Time(e.PublishAt), Time(e.RetryAt));

    private static string Time(DateTimeOffset value) =>
        PeruTime.ToPeru(value).ToString("yyyy-MM-dd'T'HH:mm:sszzz", CultureInfo.InvariantCulture);

    private static string? Time(DateTimeOffset? value) => value is { } v ? Time(v) : null;

    private sealed record ReportDto(
        int SchemaVersion, string GeneratedAt, ChannelDto Channel, List<VideoDto> Videos, List<DayDto> DailyViews, QueueDto Queue);

    private sealed record ChannelDto(int Videos, long Views, long Likes, long Comments, long Views24h);

    private sealed record VideoDto(
        string Id, string Title, string? PublishedAt, long? Views, long? Likes, long? Comments, long? Views24h, IReadOnlyList<long> Trend24h);

    private sealed record DayDto(string Date, long Views);

    private sealed record QueueDto(Dictionary<string, int> Counts, QueueEntryDto? Next, List<QueueEntryDto> Upcoming);

    private sealed record QueueEntryDto(string Episode, string Title, string Status, string PublishAt, string? RetryAt);
}
