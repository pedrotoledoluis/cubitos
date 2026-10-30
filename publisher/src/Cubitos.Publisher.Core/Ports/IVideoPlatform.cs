using Cubitos.Publisher.Core.Episodes;

namespace Cubitos.Publisher.Core.Ports;

public enum VideoPrivacy { Public, Unlisted, Private }

public sealed record VideoStats(string VideoId, string Title, long Views, long Likes, long Comments);

public sealed record ChannelVideo(string VideoId, string Title, DateTimeOffset? PublishedAt, VideoPrivacy Privacy);

/// <summary>Video hosting platform (YouTube). Adapters throw <see cref="UploadLimitExceededException"/> on the daily limit.</summary>
public interface IVideoPlatform
{
    /// <summary>Uploads the episode; a null <paramref name="publishAt"/> uploads it as public. Returns the new video id.</summary>
    Task<string> UploadAsync(EpisodePackage episode, DateTimeOffset? publishAt, CancellationToken ct = default);
    Task SetThumbnailAsync(string videoId, string thumbnailPath, CancellationToken ct = default);
    Task<IReadOnlyList<VideoStats>> GetStatsAsync(IReadOnlyCollection<string> videoIds, CancellationToken ct = default);
    Task<VideoPrivacy> GetPrivacyAsync(string videoId, CancellationToken ct = default);
    Task SetPrivateAsync(string videoId, CancellationToken ct = default);
    Task<IReadOnlyList<ChannelVideo>> ListChannelVideosAsync(CancellationToken ct = default);
}
