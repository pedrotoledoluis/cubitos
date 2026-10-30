using System.IO;
using System.Windows;
using System.Windows.Media.Animation;
using Cubitos.Publisher.Dashboard.Core.Data;
using Cubitos.Publisher.Dashboard.Core.Presentation;
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
        var settingsStore = new DesktopSettingsStore(DesktopSettingsStore.DefaultPath);
        var settings = settingsStore.Load();

        var vm = new MainViewModel(new ReadOnlyDashboardStore(options.DatabasePath), options.Section);
        // Apply the theme before the window exists so no DynamicResource starts empty.
        vm.InitializeTheme(ThemeCatalog.Find(options.Theme ?? settings.Theme));

        var window = new MainWindow(vm, options, settingsStore, settings);
        MainWindow = window;
        window.Show();
    }

    private static string? ReadAppSettings()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        try { return File.Exists(path) ? File.ReadAllText(path) : null; }
        catch (IOException) { return null; }
        catch (UnauthorizedAccessException) { return null; }
    }
}
