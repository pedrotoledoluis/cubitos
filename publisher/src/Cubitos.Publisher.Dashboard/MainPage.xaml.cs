using System.Diagnostics;
using Cubitos.Publisher.Dashboard.Drawing;
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

        // ~25 fps is enough for slow embers and keeps CPU use low; it only runs for the animated theme.
        _animationTimer = Dispatcher.CreateTimer();
        _animationTimer.Interval = TimeSpan.FromMilliseconds(40);
        _animationTimer.Tick += (_, _) =>
        {
            var dt = (float)Math.Min(_frameClock.Elapsed.TotalSeconds, 0.1);
            _frameClock.Restart();
            _ambient.Step(dt);
            AmbientView.Invalidate();
        };

        vm.RedrawRequested += Redraw;
        vm.AnimationStateChanged += SetAnimation;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (_started) return;
        _started = true;
        _refreshTimer.Start();
        _clockTimer.Start();
        SetAnimation(_ambient.IsAnimated && _vm.IsWindowVisible);
        await _vm.RefreshAsync();
        if (_options.Screenshot is { Length: > 0 } path) await CaptureAndExitAsync(path);
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
