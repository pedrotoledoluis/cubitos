namespace Cubitos.Publisher.Core.Queue;

public enum ReplacementDecision { Replace, Keep }

public static class ReplacementPolicy
{
    /// <summary>Keeps the old video when its views reach the threshold; a null threshold always replaces.</summary>
    public static ReplacementDecision Decide(long oldVideoViews, int? keepIfViewsAtLeast) =>
        keepIfViewsAtLeast is { } threshold && oldVideoViews >= threshold
            ? ReplacementDecision.Keep
            : ReplacementDecision.Replace;
}
