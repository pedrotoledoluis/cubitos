using Cubitos.Publisher.Dashboard.Core.Presentation;

namespace Cubitos.Publisher.Desktop.Startup;

/// <summary>
/// The one owner of the remembered preferences (theme, pin, panel size), shared by the panel and the notch controller
/// so neither overwrites the other's fields. Smoke-test runs keep changes in memory only.
/// </summary>
public sealed class SettingsSession(DesktopSettingsStore store, DesktopSettings initial, bool readOnly)
{
    public DesktopSettings Current { get; private set; } = initial;

    public void Update(Func<DesktopSettings, DesktopSettings> change)
    {
        var next = change(Current);
        if (next == Current) return;
        Current = next;
        if (!readOnly) store.Save(next);
    }
}
