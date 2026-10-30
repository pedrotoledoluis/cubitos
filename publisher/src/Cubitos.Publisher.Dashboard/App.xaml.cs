using Cubitos.Publisher.Dashboard.Themes;
using Cubitos.Publisher.Dashboard.ViewModels;

namespace Cubitos.Publisher.Dashboard;

public partial class App : Application
{
    private readonly MainPage _page;
    private readonly MainViewModel _viewModel;

    private readonly LaunchOptions _options;

    public App(MainPage page, MainViewModel viewModel, LaunchOptions options)
    {
        InitializeComponent();
        _page = page;
        _options = options;
        _viewModel = viewModel;
        // Apply the theme before the page is shown so no DynamicResource starts empty.
        viewModel.InitializeTheme(options.Theme);
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        var window = new Window(_page)
        {
            Title = "Historia en Cubitos — Panel",
            Width = 1440,
            Height = 900,
            MinimumWidth = 1100,
            MinimumHeight = 720,
        };
        if (_options.Size is { } size)
        {
            window.Width = Math.Max(size.Width, window.MinimumWidth);
            window.Height = Math.Max(size.Height, window.MinimumHeight);
            window.X = 0;
            window.Y = 0;
        }
        window.Stopped += (_, _) => _viewModel.SetWindowVisible(false);
        window.Resumed += (_, _) => _viewModel.SetWindowVisible(true);
        window.Activated += (_, _) => _viewModel.SetWindowVisible(true);
        return window;
    }
}
