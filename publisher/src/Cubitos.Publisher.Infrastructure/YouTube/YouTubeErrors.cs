using Cubitos.Publisher.Core.Ports;
using Google;

namespace Cubitos.Publisher.Infrastructure.YouTube;

/// <summary>Maps Google API errors to Core signals. Unmapped exceptions are returned unchanged.</summary>
public static class YouTubeErrors
{
    private const string UploadLimitMessage = "exceeded the number of videos they may upload";
    private static readonly string[] QuotaReasons = ["quotaExceeded", "dailyLimitExceeded"];

    public static Exception Translate(Exception ex)
    {
        if (ex is not GoogleApiException api) return ex;

        var reasons = api.Error?.Errors?.Select(e => e.Reason).OfType<string>().ToList() ?? [];
        var messages = new[] { api.Message, api.Error?.Message }
            .Concat(api.Error?.Errors?.Select(e => e.Message) ?? [])
            .OfType<string>();

        if (reasons.Contains("uploadLimitExceeded") ||
            messages.Any(m => m.Contains(UploadLimitMessage, StringComparison.OrdinalIgnoreCase)))
            return new UploadLimitExceededException("YouTube upload limit reached for this channel.", api);

        if (reasons.Any(r => QuotaReasons.Contains(r)))
            return new PlatformQuotaExceededException("YouTube Data API daily quota exceeded.", api);

        return ex;
    }

    /// <summary>Runs a Google API call, rethrowing mapped errors.</summary>
    internal static async Task<T> Guard<T>(Func<Task<T>> call)
    {
        try
        {
            return await call();
        }
        catch (GoogleApiException ex)
        {
            var mapped = Translate(ex);
            if (ReferenceEquals(mapped, ex)) throw;
            throw mapped;
        }
    }
}
