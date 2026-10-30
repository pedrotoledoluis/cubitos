using System.Text.Json;

namespace Cubitos.Publisher.Dashboard.Core.Formatting;

/// <summary>Human titles for queued episodes, which have no YouTube title until they are uploaded.</summary>
public static class EpisodeTitles
{
    /// <summary>How many folders above the database are tried as the repo root for repo-relative episode folders.</summary>
    private const int RootSearchDepth = 4;

    /// <summary>"019-cancion-criolla" becomes "Cancion criolla" (last resort when no metadata is readable).</summary>
    public static string FromSlug(string episodeId)
    {
        var dash = episodeId.IndexOf('-');
        var rest = dash > 0 && episodeId[..dash].All(char.IsDigit) ? episodeId[(dash + 1)..] : episodeId;
        var words = rest.Replace('-', ' ').Replace('_', ' ').Trim();
        if (words.Length == 0) return episodeId;
        return char.ToUpperInvariant(words[0]) + words[1..];
    }

    /// <summary>
    /// Title from <c>metadata.json</c> in the episode folder. Repo-relative folders (as the CLI stores them) are looked
    /// up from the database folder upwards. Returns null when nothing readable is found; never throws.
    /// </summary>
    public static string? ReadMetadataTitle(string? episodeDir, string databasePath)
    {
        if (string.IsNullOrWhiteSpace(episodeDir)) return null;
        try
        {
            foreach (var dir in Candidates(episodeDir, databasePath))
            {
                var file = Path.Combine(dir, "metadata.json");
                if (!File.Exists(file)) continue;
                using var doc = JsonDocument.Parse(File.ReadAllText(file));
                return doc.RootElement.ValueKind == JsonValueKind.Object &&
                       doc.RootElement.TryGetProperty("title", out var t) && t.ValueKind == JsonValueKind.String &&
                       t.GetString() is { Length: > 0 } title
                    ? title.Trim()
                    : null;
            }
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or JsonException or ArgumentException or NotSupportedException)
        {
            // Unreadable metadata only costs the nicer title.
        }
        return null;
    }

    private static IEnumerable<string> Candidates(string episodeDir, string databasePath)
    {
        if (Path.IsPathRooted(episodeDir))
        {
            yield return episodeDir;
            yield break;
        }
        var root = Path.GetDirectoryName(Path.GetFullPath(databasePath));
        for (var i = 0; i < RootSearchDepth && root is not null; i++, root = Path.GetDirectoryName(root))
            yield return Path.Combine(root, episodeDir);
    }
}
