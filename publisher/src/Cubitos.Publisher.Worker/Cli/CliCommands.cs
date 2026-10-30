using System.Globalization;
using System.Text.RegularExpressions;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;

namespace Cubitos.Publisher.Worker.Cli;

/// <summary>Command-line operations on the queue, run by the same exe as the service. Exit codes: 0 ok, 1 error, 2 usage.</summary>
public sealed partial class CliCommands(
    IQueueStore queue,
    IEpisodeReader episodes,
    ISnapshotStore snapshots,
    IClock clock,
    string repoRoot,
    TextWriter output,
    Func<CancellationToken, Task>? runOnce = null)
{
    public static readonly string[] Commands = ["enqueue", "list", "cancel", "run-once", "stats", "help"];

    public const string Usage = """
        Usage: cubitos-publisher <command>
          enqueue <episodeDir> [--publish-at <ISO 8601 with offset>] [--replaces <videoId>] [--keep-if-views <n>]
          list
          cancel <itemId>
          run-once
          stats
        Config overrides: --Publisher:<Key>=<value> (e.g. --Publisher:DatabasePath=C:\temp\p.db)
        """;

    public static bool IsCommand(string arg) => Commands.Contains(arg, StringComparer.OrdinalIgnoreCase);

    public async Task<int> RunAsync(IReadOnlyList<string> args, CancellationToken ct = default)
    {
        try
        {
            return args.Count == 0 ? UsageError("Missing command.") : args[0].ToLowerInvariant() switch
            {
                "enqueue" => await EnqueueAsync(args, ct),
                "list" => await ListAsync(ct),
                "cancel" => await CancelAsync(args, ct),
                "run-once" => await RunOnceAsync(ct),
                "stats" => await StatsAsync(ct),
                "help" => Print(Usage),
                _ => UsageError($"Unknown command '{args[0]}'."),
            };
        }
        catch (CliUsageException ex)
        {
            return UsageError(ex.Message);
        }
    }

    private async Task<int> EnqueueAsync(IReadOnlyList<string> args, CancellationToken ct)
    {
        if (args.Count < 2 || args[1].StartsWith("--")) throw new CliUsageException("enqueue needs an episode folder.");
        var dir = NormalizeEpisodeDir(args[1]);
        DateTimeOffset? publishAt = null;
        string? replaces = null;
        int? keepIfViews = null;
        for (var i = 2; i < args.Count; i += 2)
        {
            var value = i + 1 < args.Count ? args[i + 1] : throw new CliUsageException($"{args[i]} needs a value.");
            switch (args[i])
            {
                case "--publish-at": publishAt = ParseInstant(value); break;
                case "--replaces": replaces = value; break;
                case "--keep-if-views":
                    keepIfViews = int.TryParse(value, CultureInfo.InvariantCulture, out var n) && n >= 0
                        ? n : throw new CliUsageException("--keep-if-views needs a non-negative integer.");
                    break;
                default: throw new CliUsageException($"Unknown option '{args[i]}'.");
            }
        }
        if (keepIfViews is not null && replaces is null) throw new CliUsageException("--keep-if-views requires --replaces.");

        string episodeId;
        try
        {
            episodeId = episodes.Read(dir).EpisodeId;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Text.Json.JsonException)
        {
            return Error($"Invalid episode folder '{dir}': {ex.Message}");
        }

        var active = (await queue.GetAllAsync(ct)).FirstOrDefault(i => i.IsActive && i.EpisodeId == episodeId);
        if (active is not null) return Error($"{episodeId} is already queued as {active.Id} ({active.Status}).");

        var now = clock.UtcNow;
        var item = QueueItem.Create(episodeId, dir, publishAt ?? now, now, replaces, keepIfViews);
        await queue.AddAsync(item, ct);
        return Print(item.Id.ToString());
    }

    private async Task<int> ListAsync(CancellationToken ct)
    {
        var items = await queue.GetAllAsync(ct);
        if (items.Count == 0) return Print("Queue is empty.");
        string[] header = ["ID", "EPISODE", "STATUS", "PUBLISH AT (PERU)", "NEW VIDEO", "RETRY AT (PERU)", "LAST ERROR"];
        var rows = items.OrderBy(i => i.PublishAt).Select(i => new[]
        {
            i.Id.ToString(), i.EpisodeId, i.Status.ToString(), Peru(i.PublishAt), i.NewVideoId ?? "-",
            i.RetryAt is { } r ? Peru(r) : "-", Truncate(i.LastError ?? "-", 60),
        }).ToList();
        PrintTable(header, rows);
        return 0;
    }

    private async Task<int> CancelAsync(IReadOnlyList<string> args, CancellationToken ct)
    {
        if (args.Count < 2 || !Guid.TryParse(args[1], out var id)) throw new CliUsageException("cancel needs an item id.");
        var item = await queue.GetAsync(id, ct);
        if (item is null) return Error($"Queue item {id} not found.");
        try
        {
            item.Cancel(clock.UtcNow);
        }
        catch (InvalidQueueTransitionException)
        {
            return Error($"Cannot cancel {item.EpisodeId}: status is {item.Status} (only Pending or WaitingForQuota).");
        }
        await queue.UpdateAsync(item, ct);
        return Print($"Cancelled {item.EpisodeId} ({item.Id}).");
    }

    private async Task<int> RunOnceAsync(CancellationToken ct)
    {
        if (runOnce is null) return Error("run-once is not available.");
        await runOnce(ct);
        return Print("run-once finished.");
    }

    private async Task<int> StatsAsync(CancellationToken ct)
    {
        var now = clock.UtcNow;
        var ranking = HourlyViewsCalculator.Rank(await snapshots.GetSinceAsync(now.AddHours(-25), ct), now).Take(10).ToList();
        if (ranking.Count == 0) return Print("No snapshots in the last 25 h.");
        var rows = ranking.Select((r, n) => new[]
        {
            (n + 1).ToString(CultureInfo.InvariantCulture), r.VideoId, r.TotalViews.ToString("N0", CultureInfo.InvariantCulture),
            r.ViewsLast1h.ToString("0", CultureInfo.InvariantCulture), r.ViewsLast24h.ToString("0", CultureInfo.InvariantCulture),
            Truncate(r.Title, 60),
        }).ToList();
        PrintTable(["#", "VIDEO", "VIEWS", "LAST 1H", "LAST 24H", "TITLE"], rows);
        return 0;
    }

    /// <summary>Stores folders repo-relative with forward slashes, like <c>videos/019-x</c>.</summary>
    private string NormalizeEpisodeDir(string dir)
    {
        if (Path.IsPathRooted(dir))
        {
            var relative = Path.GetRelativePath(repoRoot, Path.GetFullPath(dir));
            if (relative.StartsWith("..") || Path.IsPathRooted(relative))
                throw new CliUsageException($"Episode folder must be inside the repo ({repoRoot}).");
            dir = relative;
        }
        return dir.Replace('\\', '/').TrimEnd('/');
    }

    private static DateTimeOffset ParseInstant(string value) =>
        ExplicitOffset().IsMatch(value) &&
        DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var instant)
            ? instant
            : throw new CliUsageException($"--publish-at '{value}' must be ISO 8601 with an offset, e.g. 2026-10-31T12:00:00-05:00.");

    private static string Peru(DateTimeOffset instant) =>
        PeruTime.ToPeru(instant).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);

    private static string Truncate(string text, int max)
    {
        var line = text.ReplaceLineEndings(" ");
        return line.Length <= max ? line : line[..(max - 3)] + "...";
    }

    private void PrintTable(string[] header, List<string[]> rows)
    {
        var widths = header.Select((h, c) => Math.Max(h.Length, rows.Max(r => r[c].Length))).ToArray();
        string Line(string[] cells) => string.Join("  ", cells.Select((v, c) => v.PadRight(widths[c]))).TrimEnd();
        output.WriteLine(Line(header));
        foreach (var row in rows) output.WriteLine(Line(row));
    }

    private int Print(string text)
    {
        output.WriteLine(text);
        return 0;
    }

    private int Error(string message)
    {
        output.WriteLine($"Error: {message}");
        return 1;
    }

    private int UsageError(string message)
    {
        output.WriteLine($"Error: {message}");
        output.WriteLine(Usage);
        return 2;
    }

    [GeneratedRegex(@"(Z|[+-]\d{2}:?\d{2})$", RegexOptions.IgnoreCase)]
    private static partial Regex ExplicitOffset();

    private sealed class CliUsageException(string message) : Exception(message);
}
