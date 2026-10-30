using Cubitos.Publisher.Dashboard.Core.Configuration;
using Cubitos.Publisher.Dashboard.Core.Navigation;

namespace Cubitos.Publisher.Desktop.Startup;

/// <summary>
/// Start-up switches: <c>--db</c> (see <see cref="DatabasePathResolver"/>), <c>--theme=&lt;id&gt;</c>,
/// <c>--section=&lt;id&gt;</c>, and for smoke tests <c>--size=WxH</c> (panel size in DIPs, not remembered),
/// <c>--notch=collapsed|expanded|pinned</c> (app state: only the notch, panel open as if hovered, or pinned window;
/// forced, not remembered), <c>--screenshot=&lt;png&gt;</c> (collapsed: the notch window; otherwise the panel with the
/// notch on top; then exits) and the hidden <c>--fps-log=&lt;path&gt;</c> (frame times and open times for ~10 s of
/// hover open/close cycles, then exits).
/// </summary>
public sealed class LaunchOptions
{
    public const string DefaultDatabasePath = @"D:\PROYECTS\cubitos\publisher\data\publisher.db";

    public LaunchOptions(IReadOnlyList<string> args, string? appSettingsJson)
    {
        DatabasePath = DatabasePathResolver.Resolve(args, Environment.GetEnvironmentVariable, appSettingsJson, DefaultDatabasePath);
        Theme = LaunchArgs.Value(args, "theme");
        Section = LaunchArgs.Value(args, "section");
        Screenshot = LaunchArgs.Value(args, "screenshot");
        FpsLog = LaunchArgs.Value(args, "fps-log");
        Size = LaunchArgs.Size(args);
        Notch = LaunchArgs.Notch(args);
    }

    public string DatabasePath { get; }
    public string? Theme { get; }
    public string? Section { get; }
    public string? Screenshot { get; }
    public string? FpsLog { get; }
    public (double Width, double Height)? Size { get; }
    public NotchState? Notch { get; }

    /// <summary>Smoke-test runs must not overwrite the owner's remembered theme or pin.</summary>
    public bool IsAutomated => Screenshot is not null || FpsLog is not null || Notch is not null;
}
