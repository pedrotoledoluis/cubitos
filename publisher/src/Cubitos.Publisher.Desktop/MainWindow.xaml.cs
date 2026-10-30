using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Data;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using System.Windows.Shell;
using System.Windows.Threading;
using Cubitos.Publisher.Dashboard.Core.Presentation;
using Cubitos.Publisher.Desktop.Notch;
using Cubitos.Publisher.Desktop.Rendering;
using Cubitos.Publisher.Desktop.Startup;
using Cubitos.Publisher.Desktop.Themes;
using Cubitos.Publisher.Desktop.ViewModels;
using Microsoft.Win32;

namespace Cubitos.Publisher.Desktop;

/// <summary>
/// The dashboard panel: custom chrome, section tabs with a short fade/slide, theme cross-fade, the pin thumbtack and
/// the refresh/clock timers (data only; every animation runs from <see cref="FrameClock"/>). Where it sits and when it
/// shows is decided by the <see cref="NotchController"/>: it slides out of the screen notch on hover, or stays pinned.
/// </summary>
public partial class MainWindow : Window, INotchPanel
{
    private static readonly Duration SectionDuration = new(TimeSpan.FromMilliseconds(200));
    private static readonly IEasingFunction Ease = new CubicEase { EasingMode = EasingMode.EaseOut };

    /// <summary>How far the content trails behind the sliding window edge when the panel starts opening.</summary>
    private const double RevealSlide = 70;

    private readonly MainViewModel _vm;
    private readonly SettingsSession _settings;
    private readonly DispatcherTimer _refreshTimer;
    private readonly DispatcherTimer _clockTimer;
    private readonly Dictionary<string, FrameworkElement> _sections;
    private readonly RadioButton[] _tabs;
    private readonly TranslateTransform _contentSlide = new();
    private readonly TaskCompletionSource _firstRefresh = new();
    private FrameworkElement? _visibleSection;
    private bool _sessionLocked;
    private bool _ambientSuspended;
    private bool _pinned;

    public MainWindow(MainViewModel vm, SettingsSession settings)
    {
        InitializeComponent();
        _vm = vm;
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
        _tabs = [Tab0, Tab1, Tab2, Tab3];
        ContentHost.RenderTransform = _contentSlide;
        Ambient.ContentLeft = ContentHost.Margin.Left;

        // The ranking is one virtualized list: the header element (title, podium, column headers) then the rows.
        var header = (FrameworkElement)FindResource("RankingHeader");
        header.DataContext = vm;
        RankingSection.ItemsSource = new CompositeCollection { header, new CollectionContainer { Collection = vm.RankingRest } };

        SelectTab(vm.Section);
        ShowSection(vm.Section, animate: false);
        vm.PropertyChanged += OnViewModelChanged;
        vm.ThemeChanging += SnapshotForCrossFade;
        vm.ThemeChanged += OnThemeChanged;

        _refreshTimer = new DispatcherTimer(DispatcherPriority.Background) { Interval = MainViewModel.RefreshInterval };
        _refreshTimer.Tick += async (_, _) => await _vm.RefreshAsync();
        _clockTimer = new DispatcherTimer(DispatcherPriority.Background) { Interval = TimeSpan.FromSeconds(1) };
        _clockTimer.Tick += (_, _) => _vm.Tick();

        SourceInitialized += OnSourceInitialized;
        StateChanged += (_, _) => OnWindowStateChanged();
        Loaded += OnLoaded;
        Closed += (_, _) => SystemEvents.SessionSwitch -= OnSessionSwitch;
        SystemEvents.SessionSwitch += OnSessionSwitch;
    }

    // ---- INotchPanel -----------------------------------------------------------------------------------------

    public Window Window => this;
    public IntPtr Handle => new WindowInteropHelper(this).Handle;
    FrameworkElement INotchPanel.Scene => Scene;
    public bool IsPopupOpen => ThemePicker.IsDropDownOpen || LaunchPicker.IsDropDownOpen;
    public Task FirstRefresh => _firstRefresh.Task;

    public event Action? PinToggleRequested;
    public event Action<Size>? MoveSizeEnded;
    public event Action<IntPtr>? ActivatedFrom;

    public void SetPinnedChrome(bool pinned, Size minSize)
    {
        _pinned = pinned;
        PinGlyph.IsPinned = pinned;
        PinButton.ToolTip = pinned ? "Soltar el panel (vuelve a abrirse con la calabaza)" : "Fijar el panel (deja de cerrarse solo)";
        MinButton.Visibility = MaxButton.Visibility = pinned ? Visibility.Visible : Visibility.Collapsed;
        MinWidth = minSize.Width;
        MinHeight = minSize.Height;
        if (!pinned && WindowState != WindowState.Normal) WindowState = WindowState.Normal;
        Topmost = !pinned;
        // Only a pinned panel moves by its title bar; the hover panel stays docked to the notch.
        if (WindowChrome.GetWindowChrome(this) is { } chrome) chrome.CaptionHeight = pinned ? 40 : 0;
        UpdateAmbient();
    }

    public void Reveal(double open)
    {
        var x = -RevealSlide * (1 - Math.Clamp(open, 0, 1));
        if (Math.Abs(_contentSlide.X - x) > 0.05) _contentSlide.X = x;
        Emerge.Open = open;
    }

    public bool AmbientSuspended
    {
        set
        {
            if (_ambientSuspended == value) return;
            _ambientSuspended = value;
            UpdateAmbient();
        }
    }

    private void UpdateAmbient() => Ambient.Suspended = _ambientSuspended || WindowState == WindowState.Minimized;

    private void OnPinClicked(object sender, RoutedEventArgs e) => PinToggleRequested?.Invoke();

    // ---- Loading ---------------------------------------------------------------------------------------------

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        _refreshTimer.Start();
        _clockTimer.Start();
        try
        {
            await _vm.RefreshAsync();
        }
        finally
        {
            _firstRefresh.TrySetResult();
        }
    }

    // ---- Sections --------------------------------------------------------------------------------------------

    private void OnViewModelChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName != nameof(MainViewModel.Section)) return;
        SelectTab(_vm.Section);
        ShowSection(_vm.Section, animate: true);
    }

    private void OnTabClicked(object sender, RoutedEventArgs e)
    {
        if (sender is ToggleButton { Tag: string id }) _vm.Section = id;
    }

    private void SelectTab(string id)
    {
        foreach (var tab in _tabs) tab.IsChecked = (string)tab.Tag == id;
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
        _settings.Update(s => s with { Theme = theme.Id });
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

    // ---- Window chrome ---------------------------------------------------------------------------------------

    private void OnMinimize(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;

    private void OnMaximize(object sender, RoutedEventArgs e) =>
        WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;

    private void OnClose(object sender, RoutedEventArgs e) => Close();

    private void OnWindowStateChanged()
    {
        // A maximized chrome-less window overhangs the screen by its resize border; pad it back in.
        Frame.Margin = WindowState == WindowState.Maximized ? SystemParameters.WindowResizeBorderThickness : new Thickness(0);
        MaxGlyph.Text = WindowState == WindowState.Maximized ? "" : "";
        UpdateAmbient();
    }

    private void OnSessionSwitch(object sender, SessionSwitchEventArgs e)
    {
        _sessionLocked = e.Reason is SessionSwitchReason.SessionLock or SessionSwitchReason.ConsoleDisconnect or SessionSwitchReason.RemoteDisconnect;
        // The notch is always on screen, so only a locked session stops every animation.
        Dispatcher.BeginInvoke(() => FrameClock.IsPaused = _sessionLocked);
    }

    private void OnSourceInitialized(object? sender, EventArgs e)
    {
        ApplyWindowAttributes();
        HwndSource.FromHwnd(Handle)?.AddHook(WndProc);
    }

    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        switch (msg)
        {
            case Win32.WmActivate when (wParam.ToInt64() & 0xFFFF) != 0:
                ActivatedFrom?.Invoke(lParam);
                break;
            case Win32.WmExitSizeMove:
                MoveSizeEnded?.Invoke(new Size(ActualWidth, ActualHeight));
                break;
        }
        return IntPtr.Zero;
    }

    private void ApplyWindowAttributes()
    {
        var hwnd = Handle;
        var round = DwmWindowCornerPreferenceRound;
        _ = DwmSetWindowAttribute(hwnd, DwmwaWindowCornerPreference, ref round, sizeof(int));
        var dark = 1;
        _ = DwmSetWindowAttribute(hwnd, DwmwaUseImmersiveDarkMode, ref dark, sizeof(int));
        ApplyBorderColor();
    }

    private void ApplyBorderColor()
    {
        var hwnd = Handle;
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

    // ---- Rendering helpers -----------------------------------------------------------------------------------

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
}
