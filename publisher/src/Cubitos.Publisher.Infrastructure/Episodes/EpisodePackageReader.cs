using System.Text.Json;
using Cubitos.Publisher.Core.Episodes;

namespace Cubitos.Publisher.Infrastructure.Episodes;

/// <summary>
/// Builds an <see cref="EpisodePackage"/> from <c>videos/&lt;id&gt;/</c>, mirroring <c>uploader/upload.mjs</c>:
/// <c>metadata.json</c> (title, tags, categoryId, languages, optional <c>files</c> overrides) plus the description file.
/// </summary>
public sealed class EpisodePackageReader(string repoRoot)
{
    public const int MaxTitleLength = 100;
    private static readonly string[] DefaultTags = ["historia", "curiosidades", "humor", "historia en cubitos", "Shorts"];

    /// <param name="episodeDir">Repo-relative (or absolute) episode folder, e.g. <c>videos/019-x</c>.</param>
    public EpisodePackage Read(string episodeDir)
    {
        var dir = Path.GetFullPath(Path.Combine(repoRoot, episodeDir));
        var id = Path.GetFileName(dir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
        if (!Directory.Exists(dir)) throw new DirectoryNotFoundException($"Episode folder not found: {episodeDir}");

        var metaPath = Path.Combine(dir, "metadata.json");
        using var meta = File.Exists(metaPath) ? JsonDocument.Parse(File.ReadAllText(metaPath)) : null;
        var root = meta?.RootElement;

        var videoPath = Path.Combine(dir, FileName(root, "video") ?? $"{id}.mp4");
        if (!File.Exists(videoPath)) throw new FileNotFoundException($"Episode video not found for {id}.", videoPath);

        var thumbPath = Path.Combine(dir, FileName(root, "thumbnail") ?? $"{id}-thumbnail.png");
        var descPath = Path.Combine(dir, FileName(root, "description") ?? $"{id}-description.txt");
        var description = File.Exists(descPath) ? File.ReadAllText(descPath) : Str(root, "description")
            ?? throw new FileNotFoundException($"Episode description not found for {id}.", descPath);

        var title = Str(root, "title") ?? description.Split('\n')[0].Trim();
        if (title.Length > MaxTitleLength) title = title[..MaxTitleLength];

        return new EpisodePackage(
            id,
            episodeDir,
            videoPath,
            File.Exists(thumbPath) ? thumbPath : null,
            title,
            description,
            Tags(root) ?? DefaultTags,
            Str(root, "categoryId") ?? "27",
            Str(root, "defaultLanguage") ?? "es",
            Str(root, "defaultAudioLanguage") ?? "es",
            Bool(root, "selfDeclaredMadeForKids") ?? Bool(root, "madeForKids") ?? false);
    }

    private static string? FileName(JsonElement? root, string key) =>
        root is { } r && r.TryGetProperty("files", out var files) && files.ValueKind == JsonValueKind.Object ? Str(files, key) : null;

    private static string? Str(JsonElement? root, string key) =>
        root is { ValueKind: JsonValueKind.Object } r && r.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    private static bool? Bool(JsonElement? root, string key) =>
        root is { ValueKind: JsonValueKind.Object } r && r.TryGetProperty(key, out var v) && v.ValueKind is JsonValueKind.True or JsonValueKind.False
            ? v.GetBoolean()
            : null;

    private static string[]? Tags(JsonElement? root) =>
        root is { ValueKind: JsonValueKind.Object } r && r.TryGetProperty("tags", out var v) && v.ValueKind == JsonValueKind.Array
            ? v.EnumerateArray().Where(t => t.ValueKind == JsonValueKind.String).Select(t => t.GetString()!).ToArray()
            : null;
}
