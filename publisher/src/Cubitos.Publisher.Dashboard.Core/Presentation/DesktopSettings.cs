using System.Text.Json;

namespace Cubitos.Publisher.Dashboard.Core.Presentation;

/// <summary>What the desktop panel remembers between runs.</summary>
public sealed record DesktopSettings(
    string? Theme = null,
    bool NotchPinned = false,
    double? PanelWidth = null,
    double? PanelHeight = null);

/// <summary>Small JSON file of user preferences. Never throws: unreadable or unwritable files only lose the preference.</summary>
public sealed class DesktopSettingsStore(string path)
{
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };

    public string Path { get; } = path;

    public static string DefaultPath => System.IO.Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CubitosPublisher", "desktop-settings.json");

    public DesktopSettings Load()
    {
        try
        {
            return File.Exists(Path) ? JsonSerializer.Deserialize<DesktopSettings>(File.ReadAllText(Path), Options) ?? new() : new();
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or JsonException or NotSupportedException)
        {
            return new();
        }
    }

    public bool Save(DesktopSettings settings)
    {
        try
        {
            Directory.CreateDirectory(System.IO.Path.GetDirectoryName(System.IO.Path.GetFullPath(Path))!);
            File.WriteAllText(Path, JsonSerializer.Serialize(settings, Options));
            return true;
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or NotSupportedException)
        {
            return false;
        }
    }
}
