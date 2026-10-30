using Cubitos.Publisher.Infrastructure;
using Microsoft.Extensions.Options;

namespace Cubitos.Publisher.Worker.Hosting;

/// <summary>Fails startup (or the CLI command) early with a clear message instead of failing inside a loop.</summary>
public sealed class PublisherOptionsValidator : IValidateOptions<PublisherOptions>
{
    public ValidateOptionsResult Validate(string? name, PublisherOptions o)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(o.RepoRoot)) errors.Add("Publisher:RepoRoot is required.");
        else if (!Directory.Exists(o.RepoRoot)) errors.Add($"Publisher:RepoRoot '{o.RepoRoot}' does not exist.");
        if (o.PublishInterval < TimeSpan.FromSeconds(10)) errors.Add("Publisher:PublishInterval must be at least 00:00:10.");
        if (o.StatsInterval < TimeSpan.FromMinutes(1)) errors.Add("Publisher:StatsInterval must be at least 00:01:00.");
        return errors.Count == 0 ? ValidateOptionsResult.Success : ValidateOptionsResult.Fail(errors);
    }
}
