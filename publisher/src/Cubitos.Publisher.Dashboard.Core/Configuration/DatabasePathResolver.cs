using System.Text.Json;

namespace Cubitos.Publisher.Dashboard.Core.Configuration;

/// <summary>
/// Finds the service database: <c>--db &lt;path&gt;</c> / <c>--db=&lt;path&gt;</c> / <c>--Publisher:DatabasePath=&lt;path&gt;</c>,
/// then the <c>Publisher__DatabasePath</c> environment variable, then <c>Publisher:DatabasePath</c> in appsettings.json,
/// then the fallback.
/// </summary>
public static class DatabasePathResolver
{
    public const string EnvironmentVariable = "Publisher__DatabasePath";

    public static string Resolve(IReadOnlyList<string> args, Func<string, string?> getEnvironment, string? appSettingsJson, string fallback)
    {
        for (var i = 0; i < args.Count; i++)
        {
            var arg = args[i];
            if (arg == "--db" && i + 1 < args.Count && NonEmpty(args[i + 1]) is { } next) return next;
            foreach (var prefix in (string[])["--db=", "--Publisher:DatabasePath="])
                if (arg.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) && NonEmpty(arg[prefix.Length..]) is { } value)
                    return value;
        }
        return NonEmpty(getEnvironment(EnvironmentVariable)) ?? FromJson(appSettingsJson) ?? fallback;
    }

    private static string? FromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json, new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
            return doc.RootElement.TryGetProperty("Publisher", out var section)
                   && section.ValueKind == JsonValueKind.Object
                   && section.TryGetProperty("DatabasePath", out var path)
                   && path.ValueKind == JsonValueKind.String
                ? NonEmpty(path.GetString())
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? NonEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
