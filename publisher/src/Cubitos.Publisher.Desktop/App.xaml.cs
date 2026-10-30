using System.IO;
using System.Windows;
using System.Windows.Media.Animation;
using Cubitos.Publisher.Dashboard.Core.Data;
using Cubitos.Publisher.Dashboard.Core.Presentation;
using Cubitos.Publisher.Desktop.Notch;
using Cubitos.Publisher.Desktop.Rendering;
using Cubitos.Publisher.Desktop.Startup;
using Cubitos.Publisher.Desktop.Themes;
using Cubitos.Publisher.Desktop.ViewModels;

namespace Cubitos.Publisher.Desktop;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // Hardware rendering at the display's refresh rate; animations are time-based, so more frames are only smoother.
        Timeline.DesiredFrameRateProperty.OverrideMetadata(typeof(Timeline), new FrameworkPropertyMetadata { DefaultValue = 120 });

        var options = new LaunchOptions(e.Args, ReadAppSettings());
        var store = new DesktopSettingsStore(DesktopSettingsStore.DefaultPath);
        var settings = new SettingsSession(store, store.Load(), readOnly: options.IsAutomated);

        var vm = new MainViewModel(new ReadOnlyDashboardStore(options.DatabasePath), options.Section);
        // Apply the theme before the windows exist so no DynamicResource starts empty.
        vm.InitializeTheme(ThemeCatalog.Find(options.Theme ?? settings.Current.Theme));

        // The panel is created once and kept alive; the notch window is what the user sees while collapsed.
        var panel = new MainWindow(vm, settings);
        var controller = new NotchController(panel, new NotchWindow(), options, settings);
        MainWindow = panel;
        ShutdownMode = ShutdownMode.OnMainWindowClose;
        controller.Start();

        if (options.FpsLog is { Length: > 0 } fpsPath) _ = FpsProbe.RunAsync(controller, panel.FirstRefresh, fpsPath);
        else if (options.Screenshot is { Length: > 0 } shot) _ = controller.CaptureAndExitAsync(shot);
    }

    private static string? ReadAppSettings()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        try { return File.Exists(path) ? File.ReadAllText(path) : null; }
        catch (IOException) { return null; }
        catch (UnauthorizedAccessException) { return null; }
    }
}
