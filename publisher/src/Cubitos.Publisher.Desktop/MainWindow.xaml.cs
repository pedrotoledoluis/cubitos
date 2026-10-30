using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Cubitos.Publisher.Dashboard.Core.Navigation;
using Cubitos.Publisher.Dashboard.Core.Presentation;
using Cubitos.Publisher.Desktop.Notch;
using Cubitos.Publisher.Desktop.Rendering;
using Cubitos.Publisher.Desktop.Startup;
using Cubitos.Publisher.Desktop.Themes;
using Cubitos.Publisher.Desktop.ViewModels;
using Microsoft.Win32;

namespace Cubitos.Publisher.Desktop;

/// <summary>
/// The dashboard window: custom chrome, section switching with a short fade/slide, theme cross-fade, the notch and the
/// refresh/clock timers (data only; every animation runs from <see cref="FrameClock"/>).
/// </summary>
public partial class MainWindow : Window
{
    private static readonly Duration SectionDuration = new(TimeSpan.FromMilliseconds(200));
    private static readonly IEasingFunction Ease = new CubicEase { EasingMode = EasingMode.EaseOut };

    private readonly MainViewModel _vm;
    private readonly LaunchOptions _options;
    private readonly DesktopSettingsStore _settingsStore;
    private DesktopSettings _settings;
    private readonly DispatcherTimer _refreshTimer;
    private readonly DispatcherTimer _clockTimer;
    private readonly Dictionary<string, FrameworkElement> _sections;
    private readonly INavigationNotch _notch;
    private FrameworkElement? _visibleSection;
    private bool _sessionLocked;

    public MainWindow(MainViewModel vm, LaunchOptions options, DesktopSettingsStore settingsStore, DesktopSettings settings)
    {
        InitializeComponent();
        _vm = vm;
        _options = options;
        _settingsStore = settingsStore;
        _settings = settings;
        DataContext = vm;

        _sections = new Dictionary<string, FrameworkElement>
        {
            [Sections.Ranking] = RankingSection,
            [Sections.Heatmap] = HeatmapSection,
            [Sections.FirstDay] = FirstDaySection,
            [Sections.Queue] = QueueSection,
        };
        foreach (var s in _sections.Values) s.RenderTransform = new TranslateTransform();

        // The ranking is one virtualized list: the header element (title, podium, column headers) then the rows.
        var header = (FrameworkElement)FindResource("RankingHeader");
        header.DataContext = vm;
        RankingSection.ItemsSource = new CompositeCollection { header, new CollectionContainer { Collection = vm.RankingRest } };

        if (options.Size is { } size)
        {
            Width = Math.Max(size.Width, MinWidth);
            Height = Math.Max(size.Height, MinHeight);
            WindowStartupLocation = WindowStartupLocation.Manual;
            Left = 0;
            Top = 0;
        }
        else
        {
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
        }

        _notch = Notch;
        _notch.Initialize(settings.NotchPinned && options.Notch is null, vm.DatabasePath);
        if (options.Notch is { } forced) _notch.Force(forced);
        _notch.SelectedSection = vm.Section;
        _notch.SectionRequested += id => _vm.Section = id;
        _notch.ContentInsetChanged += SetContentInset;
        _notch.PinnedChanged += pinned => Remember(_settings with { NotchPinned = pinned });
        SetContentInset(_notch.ContentInset);

        ShowSection(vm.Section, animate: false);
        vm.PropertyChanged += OnViewModelChanged;
        vm.ThemeChanging += SnapshotForCrossFade;
        vm.ThemeChanged += OnThemeChanged;

        _refreshTimer = new DispatcherTimer(DispatcherPriority.Background) { Interval = MainViewModel.RefreshInterval };
        _refreshTimer.Tick += async (_, _) => await _vm.RefreshAsync();
        _clockTimer = new DispatcherTimer(DispatcherPriority.Background) { Interval = TimeSpan.FromSeconds(1) };
        _clockTimer.Tick += (_, _) => _vm.Tick();

        SourceInitialized += (_, _) => ApplyWindowAttributes();
        StateChanged += (_, _) => OnWindowStateChanged();
        Loaded += OnLoaded;
        Closed += (_, _) => SystemEvents.SessionSwitch -= OnSessionSwitch;
        SystemEvents.SessionSwitch += OnSessionSwitch;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        _refreshTimer.Start();
        _clockTimer.Start();
        await _vm.RefreshAsync();
        if (_options.FpsLog is { Length: > 0 } fpsPath) await FpsProbe.RunAsync(this, _notch, fpsPath);
        else if (_options.Screenshot is { Length: > 0 } shot) await CaptureAndExitAsync(shot);
    }

    // ---- Sections --------------------------------------------------------------------------------------------

    private void OnViewModelChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName != nameof(MainViewModel.Section)) return;
        _notch.SelectedSection = _vm.Section;
        ShowSection(_vm.Section, animate: true);
    }

    /// <summary>Hides the old section at once and fades/slides the new one in (~200 ms, ease-out).</summary>
    private void ShowSection(string id, bool animate)
    {
        if (!_sections.TryGetValue(id, out var next) || next == _visibleSection) return;
        if (_visibleSection is not null) _visibleSection.Visibility = Visibility.Collapsed;
        _visibleSection = next;
        next.Visibility = Visibility.Visible;
        var slide = (TranslateTransform)next.RenderTransform;
        if (!animate)
        {
            next.BeginAnimation(OpacityProperty, null);
            slide.BeginAnimation(TranslateTransform.YProperty, null);
            return;
        }
        next.BeginAnimation(OpacityProperty, new DoubleAnimation(0, 1, SectionDuration) { EasingFunction = Ease });
        slide.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(14, 0, SectionDuration) { EasingFunction = Ease });
    }

    private void SetContentInset(double inset)
    {
        ContentHost.Margin = new Thickness(inset, 0, 0, 0);
        Ambient.ContentLeft = inset;
    }

    // ---- Theme -----------------------------------------------------------------------------------------------

    /// <summary>Freezes the current look into an image laid over the window, so the new theme fades in beneath it.</summary>
    private void SnapshotForCrossFade()
    {
        if (Scene.ActualWidth < 1 || Scene.ActualHeight < 1 || WindowState == WindowState.Minimized) return;
        ThemeFade.Visibility = Visibility.Collapsed;
        ThemeFade.Source = Render(Scene);
        ThemeFade.Visibility = Visibility.Visible;
        ThemeFade.BeginAnimation(OpacityProperty, null);
        ThemeFade.Opacity = 1;
    }

    private void OnThemeChanged(ThemeDefinition theme)
    {
        if (!_options.IsAutomated) Remember(_settings with { Theme = theme.Id });
        ApplyBorderColor();
        if (ThemeFade.Visibility != Visibility.Visible) return;
        var fade = new DoubleAnimation(1, 0, new Duration(TimeSpan.FromMilliseconds(280))) { EasingFunction = Ease };
        fade.Completed += (_, _) =>
        {
            ThemeFade.Visibility = Visibility.Collapsed;
            ThemeFade.Source = null;
        };
        ThemeFade.BeginAnimation(OpacityProperty, fade);
    }

    private void Remember(DesktopSettings settings)
    {
        _settings = settings;
        if (!_options.IsAutomated) _settingsStore.Save(settings);
    }

    // ---- Window chrome ---------------------------------------------------------------------------------------

    private void OnMinimize(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;

    private void OnMaximize(object sender, RoutedEventArgs e) =>
        WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;

    private void OnClose(object sender, RoutedEventArgs e) => Close();

    private void OnWindowStateChanged()
    {
        // A maximized chrome-less window overhangs the screen by its resize border; pad it back in.
        Frame.Margin = WindowState == WindowState.Maximized ? SystemParameters.WindowResizeBorderThickness : new Thickness(0);
        MaxGlyph.Text = WindowState == WindowState.Maximized ? "" : "";
        UpdatePause();
    }

    private void OnSessionSwitch(object sender, SessionSwitchEventArgs e)
    {
        _sessionLocked = e.Reason is SessionSwitchReason.SessionLock or SessionSwitchReason.ConsoleDisconnect or SessionSwitchReason.RemoteDisconnect;
        Dispatcher.BeginInvoke(UpdatePause);
    }

    /// <summary>Nothing animates while nobody can see it.</summary>
    private void UpdatePause() => FrameClock.IsPaused = WindowState == WindowState.Minimized || _sessionLocked;

    private void ApplyWindowAttributes()
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        var round = DwmWindowCornerPreferenceRound;
        _ = DwmSetWindowAttribute(hwnd, DwmwaWindowCornerPreference, ref round, sizeof(int));
        var dark = 1;
        _ = DwmSetWindowAttribute(hwnd, DwmwaUseImmersiveDarkMode, ref dark, sizeof(int));
        ApplyBorderColor();
    }

    private void ApplyBorderColor()
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd == IntPtr.Zero) return;
        var c = ThemeManager.Current.CardStroke;
        var colorRef = c.R | c.G << 8 | c.B << 16; // COLORREF is 0x00BBGGRR
        _ = DwmSetWindowAttribute(hwnd, DwmwaBorderColor, ref colorRef, sizeof(int));
    }

    private const int DwmwaUseImmersiveDarkMode = 20;
    private const int DwmwaWindowCornerPreference = 33;
    private const int DwmwaBorderColor = 34;
    private const int DwmWindowCornerPreferenceRound = 2;

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    // ---- Smoke tests -----------------------------------------------------------------------------------------

    internal static BitmapSource Render(FrameworkElement element)
    {
        var dpi = VisualTreeHelper.GetDpi(element);
        var bitmap = new RenderTargetBitmap(
            Math.Max(1, (int)Math.Round(element.ActualWidth * dpi.DpiScaleX)),
            Math.Max(1, (int)Math.Round(element.ActualHeight * dpi.DpiScaleY)),
            dpi.PixelsPerInchX, dpi.PixelsPerInchY, PixelFormats.Pbgra32);
        bitmap.Render(element);
        bitmap.Freeze();
        return bitmap;
    }

    /// <summary>Lets layout, count-ups and a few animation frames settle, saves the window content as PNG and quits.</summary>
    private async Task CaptureAndExitAsync(string path)
    {
        await Task.Delay(TimeSpan.FromSeconds(3));
        try
        {
            var encoder = new PngBitmapEncoder();
            encoder.Frames.Add(BitmapFrame.Create(Render(Scene)));
            await using var file = File.Create(path);
            encoder.Save(file);
        }
        catch (Exception ex)
        {
            await File.WriteAllTextAsync(path + ".error.txt", ex.ToString());
        }
        finally
        {
            Application.Current.Shutdown();
        }
    }
}
