namespace Cubitos.Publisher.Dashboard.WinUI;

/// <summary>WinUI entry point; everything else lives in the shared MAUI app.</summary>
public partial class App : MauiWinUIApplication
{
    public App() => InitializeComponent();

    protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();
}
