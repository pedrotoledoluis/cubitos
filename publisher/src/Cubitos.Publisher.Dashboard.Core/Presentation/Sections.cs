namespace Cubitos.Publisher.Dashboard.Core.Presentation;

/// <summary>Ids of the dashboard sections, in navigation order (also the values of <c>--section=</c>).</summary>
public static class Sections
{
    public const string Ranking = "ranking";
    public const string Heatmap = "heatmap";
    public const string FirstDay = "firstday";
    public const string Queue = "queue";

    public static IReadOnlyList<string> All { get; } = [Ranking, Heatmap, FirstDay, Queue];

    public static string? Normalize(string? id) =>
        id is null ? null : All.FirstOrDefault(s => string.Equals(s, id.Trim(), StringComparison.OrdinalIgnoreCase));
}
