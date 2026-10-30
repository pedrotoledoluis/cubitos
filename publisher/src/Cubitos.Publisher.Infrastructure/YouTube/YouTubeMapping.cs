using System.Globalization;
using Cubitos.Publisher.Core.Ports;
using Google.Apis.YouTube.v3.Data;

namespace Cubitos.Publisher.Infrastructure.YouTube;

/// <summary>Pure translations between Core values and YouTube API models.</summary>
public static class YouTubeMapping
{
    public const int MaxIdsPerRequest = 50;

    /// <summary>A publish time uploads as private + scheduled; null uploads as public.</summary>
    public static VideoStatus BuildStatus(DateTimeOffset? publishAt, bool madeForKids) => new()
    {
        PrivacyStatus = publishAt is null ? "public" : "private",
        PublishAtRaw = publishAt?.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture),
        SelfDeclaredMadeForKids = madeForKids,
        ContainsSyntheticMedia = false,
    };

    /// <summary>Unknown or missing values map to <see cref="VideoPrivacy.Private"/>, the safe default.</summary>
    public static VideoPrivacy ParsePrivacy(string? raw) => raw switch
    {
        "public" => VideoPrivacy.Public,
        "unlisted" => VideoPrivacy.Unlisted,
        _ => VideoPrivacy.Private,
    };

    public static IEnumerable<IReadOnlyList<string>> Batches(IEnumerable<string> ids) =>
        ids.Distinct().Chunk(MaxIdsPerRequest);

    public static VideoStats ToStats(Video video) => new(
        video.Id,
        video.Snippet?.Title ?? "",
        (long)(video.Statistics?.ViewCount ?? 0),
        (long)(video.Statistics?.LikeCount ?? 0),
        (long)(video.Statistics?.CommentCount ?? 0));
}
