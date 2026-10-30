using System.Globalization;

namespace Cubitos.Publisher.Dashboard.Core.Navigation;

/// <summary>Parses the dashboard's smoke-test switches <c>--size=WxH</c> and <c>--notch=collapsed|expanded|pinned</c>.</summary>
public static class LaunchArgs
{
    public static string? Value(IEnumerable<string> args, string name)
    {
        var prefix = "--" + name + "=";
        return args.FirstOrDefault(a => a.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))?[prefix.Length..];
    }

    public static (double Width, double Height)? Size(IEnumerable<string> args)
    {
        var parts = Value(args, "size")?.Split('x', 'X');
        if (parts is not { Length: 2 }) return null;
        return double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var w) &&
               double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var h) && w > 0 && h > 0
            ? (w, h)
            : null;
    }

    public static NotchState? Notch(IEnumerable<string> args) =>
        Enum.TryParse<NotchState>(Value(args, "notch"), ignoreCase: true, out var state) && Enum.IsDefined(state) ? state : null;
}
