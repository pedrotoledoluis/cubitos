namespace Cubitos.Publisher.Dashboard.Core.Presentation;

/// <summary>
/// Refreshes a bound list without throwing its visuals away: when the keys are unchanged the existing items are
/// updated in place (so numbers can animate), otherwise the list is rebuilt reusing the items whose key survived.
/// </summary>
public static class KeyedListSync
{
    /// <returns>True when every item was updated in place.</returns>
    public static bool Apply<TItem, TModel, TKey>(
        IList<TItem> target, IReadOnlyList<TModel> source,
        Func<TItem, TKey> itemKey, Func<TModel, TKey> modelKey,
        Func<TModel, TItem> create, Action<TItem, TModel> update)
        where TKey : notnull
    {
        if (target.Count == source.Count && target.Select(itemKey).SequenceEqual(source.Select(modelKey)))
        {
            for (var i = 0; i < source.Count; i++) update(target[i], source[i]);
            return true;
        }

        var known = new Dictionary<TKey, TItem>();
        foreach (var item in target) known.TryAdd(itemKey(item), item);
        target.Clear();
        foreach (var model in source)
        {
            if (known.Remove(modelKey(model), out var item)) update(item, model);
            else item = create(model);
            target.Add(item);
        }
        return false;
    }
}
