using Cubitos.Publisher.Dashboard.Core.Configuration;
using Cubitos.Publisher.Dashboard.Core.Data;
using Cubitos.Publisher.Dashboard.Core.Navigation;
using Cubitos.Publisher.Dashboard.ViewModels;

namespace Cubitos.Publisher.Dashboard;

public static class MauiProgram
{
    private const string DefaultDatabasePath = @"D:\PROYECTS\cubitos\publisher\data\publisher.db";

    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts => fonts.AddFont("CinzelDecorative-Bold.ttf", "CinzelDecorative"));

        var args = Environment.GetCommandLineArgs().Skip(1).ToList();
        var dbPath = DatabasePathResolver.Resolve(args, Environment.GetEnvironmentVariable, ReadAppSettings(), DefaultDatabasePath);
        builder.Services.AddSingleton(new LaunchOptions(args));
        builder.Services.AddSingleton(new ReadOnlyDashboardStore(dbPath));
        builder.Services.AddSingleton<MainViewModel>();
        builder.Services.AddSingleton<MainPage>();
        return builder.Build();
    }

    private static string? ReadAppSettings()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        try { return File.Exists(path) ? File.ReadAllText(path) : null; }
        catch (IOException) { return null; }
    }
}

/// <summary>
/// Optional start-up overrides: <c>--theme=&lt;id&gt;</c>, <c>--section=&lt;id&gt;</c>, <c>--screenshot=&lt;png&gt;</c>
/// (renders the window to a PNG a few seconds after loading, then exits; used for smoke tests), <c>--size=WxH</c>
/// (window size) and <c>--notch=collapsed|expanded|pinned</c> (forced notch state, not remembered).
/// </summary>
public sealed class LaunchOptions(IReadOnlyList<string> args)
{
    public string? Theme { get; } = Value(args, "--theme=");
    public string? Section { get; } = Value(args, "--section=");
    public string? Screenshot { get; } = Value(args, "--screenshot=");
    public (double Width, double Height)? Size { get; } = LaunchArgs.Size(args);
    public NotchState? Notch { get; } = LaunchArgs.Notch(args);

    private static string? Value(IReadOnlyList<string> args, string prefix) =>
        args.FirstOrDefault(a => a.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))?[prefix.Length..];
}
