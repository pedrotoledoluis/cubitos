using System.Diagnostics;
using Cubitos.Publisher.Dashboard.Drawing;
using Cubitos.Publisher.Dashboard.Themes;
using Cubitos.Publisher.Dashboard.ViewModels;

namespace Cubitos.Publisher.Dashboard;

public partial class MainPage : ContentPage
{
    private readonly MainViewModel _vm;
    private readonly LaunchOptions _options;
    private readonly AmbientDrawable _ambient = new();
    private readonly IDispatcherTimer _refreshTimer;
    private readonly IDispatcherTimer _clockTimer;
    private readonly IDispatcherTimer _animationTimer;
    private readonly Stopwatch _frameClock = new();
    private bool _started;

    public MainPage(MainViewModel vm, LaunchOptions options)
    {
        InitializeComponent();
        _vm = vm;
        _options = options;
        BindingContext = vm;
        AmbientView.Drawable = _ambient;

        _refreshTimer = Dispatcher.CreateTimer();
        _refreshTimer.Interval = MainViewModel.RefreshInterval;
        _refreshTimer.Tick += async (_, _) => await _vm.RefreshAsync();

        _clockTimer = Dispatcher.CreateTimer();
        _clockTimer.Interval = TimeSpan.FromSeconds(1);
        _clockTimer.Tick += (_, _) => _vm.Tick();

        // The only animation timer (~30 fps): pumpkin notch and ambient background. Stopped while minimized.
        _animationTimer = Dispatcher.CreateTimer();
        _animationTimer.Interval = TimeSpan.FromMilliseconds(33);
        _animationTimer.Tick += (_, _) => OnAnimationFrame();

        Notch.ContentInsetChanged += SetContentInset;
        if (options.Notch is { } forced) Notch.Force(forced);
        SetContentInset(Notch.ContentInset);

        // Charts keep a sensible aspect ratio instead of stretching into thin strips on wide windows.
        KeepAspect(HeatmapView, 0.30, 300, 620);
        KeepAspect(FirstDayView, 0.36, 320, 640);

        Loaded += (_, _) => SyncThemePicker(reset: true);
        ThemeManager.Changed += _ => Dispatcher.Dispatch(() => SyncThemePicker(reset: false));
        vm.RedrawRequested += Redraw;
        vm.AnimationStateChanged += _ => SetAnimation(_vm.IsWindowVisible);
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (_started) return;
        _started = true;
        _refreshTimer.Start();
        _clockTimer.Start();
        SetAnimation(_vm.IsWindowVisible);
        await _vm.RefreshAsync();
        if (_options.Screenshot is { Length: > 0 } path) await CaptureAndExitAsync(path);
    }

    private void OnAnimationFrame()
    {
        var dt = Math.Min(_frameClock.Elapsed.TotalSeconds, 0.1);
        _frameClock.Restart();
        Notch.Step(dt);
        if (_ambient.IsAnimated)
        {
            _ambient.Step((float)dt);
            AmbientView.Invalidate();
        }
    }

    private void SetContentInset(double inset)
    {
        ContentHost.Margin = new Thickness(inset, 0, 0, 0);
        _ambient.ContentLeft = (float)inset;
    }

    /// <summary>
    /// WinUI's ComboBox can miss a SelectedIndex that arrives before its items are realized and then shows the first
    /// theme. Re-applying the index once the control is loaded (and after each theme swap) keeps the label right.
    /// </summary>
    private void SyncThemePicker(bool reset)
    {
        var index = _vm.SelectedThemeIndex;
        if (reset) ThemePicker.SelectedIndex = -1;
        if (ThemePicker.SelectedIndex != index) ThemePicker.SelectedIndex = index;
    }

    private static void KeepAspect(VisualElement view, double ratio, double min, double max)
    {
        view.SizeChanged += (_, _) =>
        {
            if (view.Width <= 0) return;
            var height = Math.Clamp(view.Width * ratio, min, max);
            // A dead band avoids a layout ping-pong while the window is being dragged.
            if (Math.Abs(height - view.HeightRequest) > 8) view.HeightRequest = Math.Round(height);
        };
    }

    /// <summary>Smoke-test hook: lets layout and a few animation frames settle, saves the page as PNG and quits.</summary>
    private async Task CaptureAndExitAsync(string path)
    {
        await Task.Delay(TimeSpan.FromSeconds(4));
        try
        {
            var shot = await ((VisualElement)Content).CaptureAsync();
            if (shot is not null)
            {
                await using var source = await shot.OpenReadAsync(ScreenshotFormat.Png);
                await using var file = File.Create(path);
                await source.CopyToAsync(file);
            }
            else
            {
                await File.WriteAllTextAsync(path + ".error.txt", "Capture returned no image.");
            }
        }
        catch (Exception ex)
        {
            await File.WriteAllTextAsync(path + ".error.txt", ex.ToString());
        }
        finally
        {
            Application.Current?.Quit();
        }
    }

    private void Redraw()
    {
        HeatmapView?.Invalidate();
        FirstDayView?.Invalidate();
        AmbientView?.Invalidate();
    }

    private void SetAnimation(bool on)
    {
        if (on && !_animationTimer.IsRunning)
        {
            _frameClock.Restart();
            _animationTimer.Start();
        }
        else if (!on && _animationTimer.IsRunning)
        {
            _animationTimer.Stop();
        }
        AmbientView?.Invalidate();
    }
}
