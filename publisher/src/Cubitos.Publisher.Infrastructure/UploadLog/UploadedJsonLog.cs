using System.Globalization;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Cubitos.Publisher.Core.Ports;

namespace Cubitos.Publisher.Infrastructure.UploadLog;

/// <summary>
/// <c>uploader/uploaded.json</c>, shared with the Node uploader. Unknown keys are preserved; writes are atomic;
/// a re-uploaded episode keeps its previous entry under <c>&lt;id&gt;-old</c>, <c>-old2</c>, ...
/// </summary>
public sealed class UploadedJsonLog(string path) : IUploadLog
{
    private static readonly JsonSerializerOptions WriteOptions = new()
    {
        WriteIndented = true,
        IndentSize = 2,
        NewLine = "\n",
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly SemaphoreSlim _lock = new(1, 1);

    public async Task AppendAsync(UploadLogEntry entry, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var root = await LoadAsync(ct);
            if (root[entry.EpisodeId] is { } previous)
            {
                root.Remove(entry.EpisodeId);
                root[OldKey(root, entry.EpisodeId)] = previous;
            }
            root[entry.EpisodeId] = new JsonObject
            {
                ["videoId"] = entry.VideoId,
                ["uploadedAt"] = ToJsIso(entry.UploadedAt),
                ["publishAt"] = entry.PublishAt is { } p ? ToJsIso(p) : null,
            };
            await WriteAtomicAsync(root.ToJsonString(WriteOptions), ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<IReadOnlyList<UploadLogEntry>> ReadAllAsync(CancellationToken ct = default)
    {
        var root = await LoadAsync(ct);
        var entries = new List<UploadLogEntry>();
        foreach (var (key, node) in root)
        {
            if (node is not JsonObject obj) continue;
            if (!TryString(obj["videoId"], out var videoId) || !TryDate(obj["uploadedAt"], out var uploadedAt)) continue;
            DateTimeOffset? publishAt = TryDate(obj["publishAt"], out var p) ? p : null;
            entries.Add(new UploadLogEntry(key, videoId, uploadedAt, publishAt));
        }
        return entries;
    }

    private static string OldKey(JsonObject root, string episodeId)
    {
        var key = $"{episodeId}-old";
        for (var n = 2; root.ContainsKey(key); n++) key = $"{episodeId}-old{n}";
        return key;
    }

    /// <summary>Same shape as JavaScript's <c>Date.prototype.toISOString()</c>.</summary>
    private static string ToJsIso(DateTimeOffset value) =>
        value.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);

    private async Task<JsonObject> LoadAsync(CancellationToken ct)
    {
        if (!File.Exists(path)) return [];
        var text = await File.ReadAllTextAsync(path, ct);
        if (string.IsNullOrWhiteSpace(text)) return [];
        return JsonNode.Parse(text) as JsonObject
            ?? throw new InvalidDataException($"{path} must contain a JSON object.");
    }

    private async Task WriteAtomicAsync(string json, CancellationToken ct)
    {
        var full = Path.GetFullPath(path);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        var temp = full + ".tmp-" + Guid.NewGuid().ToString("N");
        try
        {
            await File.WriteAllTextAsync(temp, json, new UTF8Encoding(false), ct);
            File.Move(temp, full, overwrite: true);
        }
        finally
        {
            if (File.Exists(temp)) File.Delete(temp);
        }
    }

    private static bool TryString(JsonNode? node, out string value)
    {
        value = "";
        if (node is not JsonValue v || !v.TryGetValue(out string? s) || string.IsNullOrEmpty(s)) return false;
        value = s;
        return true;
    }

    private static bool TryDate(JsonNode? node, out DateTimeOffset value)
    {
        value = default;
        return TryString(node, out var s) &&
               DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out value);
    }
}
