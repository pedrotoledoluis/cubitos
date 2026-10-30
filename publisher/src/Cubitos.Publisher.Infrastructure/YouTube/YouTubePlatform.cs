using Cubitos.Publisher.Core.Episodes;
using Cubitos.Publisher.Core.Ports;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Services;
using Google.Apis.Upload;
using Google.Apis.Util;
using Google.Apis.YouTube.v3;
using Google.Apis.YouTube.v3.Data;

namespace Cubitos.Publisher.Infrastructure.YouTube;

/// <summary>
/// YouTube Data API v3 adapter. Authenticates with the refresh token the Node uploader stored in
/// <c>secrets/token.json</c>; refreshed access tokens are merged back into that file. Never logs credentials.
/// </summary>
public sealed class YouTubePlatform(YouTubeService service) : IVideoPlatform, IDisposable
{
    private static readonly string[] Scopes =
        ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"];

    public static async Task<YouTubePlatform> CreateAsync(PublisherOptions options, Core.Ports.IClock clock, CancellationToken ct = default)
    {
        var secrets = (await GoogleClientSecrets.FromFileAsync(options.ClientSecretPath, ct)).Secrets;
        var store = new NodeTokenDataStore(options.TokenPath, clock);
        var token = await store.LoadAsync(ct);
        var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = secrets,
            Scopes = Scopes,
            DataStore = store,
        });
        var credential = new UserCredential(flow, "user", token);
        return new YouTubePlatform(new YouTubeService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "cubitos-publisher",
        }));
    }

    public async Task<string> UploadAsync(EpisodePackage episode, DateTimeOffset? publishAt, CancellationToken ct = default)
    {
        var video = new Video
        {
            Snippet = new VideoSnippet
            {
                Title = episode.Title.Length > 100 ? episode.Title[..100] : episode.Title,
                Description = episode.Description,
                Tags = episode.Tags.ToList(),
                CategoryId = episode.CategoryId,
                DefaultLanguage = episode.DefaultLanguage,
                DefaultAudioLanguage = episode.DefaultAudioLanguage,
            },
            Status = YouTubeMapping.BuildStatus(publishAt, episode.MadeForKids),
        };

        await using var stream = File.OpenRead(episode.VideoPath);
        var insert = service.Videos.Insert(video, Parts("snippet", "status"), stream, "video/*");
        Video? uploaded = null;
        insert.ResponseReceived += v => uploaded = v;

        var progress = await insert.UploadAsync(ct);
        ThrowIfFailed(progress);
        return uploaded?.Id ?? throw new InvalidOperationException("YouTube upload finished without a video id.");
    }

    public async Task SetThumbnailAsync(string videoId, string thumbnailPath, CancellationToken ct = default)
    {
        await using var stream = File.OpenRead(thumbnailPath);
        var contentType = thumbnailPath.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                          thumbnailPath.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ? "image/jpeg" : "image/png";
        ThrowIfFailed(await service.Thumbnails.Set(videoId, stream, contentType).UploadAsync(ct));
    }

    public async Task<IReadOnlyList<VideoStats>> GetStatsAsync(IReadOnlyCollection<string> videoIds, CancellationToken ct = default)
    {
        var result = new List<VideoStats>();
        foreach (var batch in YouTubeMapping.Batches(videoIds))
        {
            var videos = await ListVideosAsync(batch, Parts("snippet", "statistics", "status"), ct);
            result.AddRange(videos.Select(YouTubeMapping.ToStats));
        }
        return result;
    }

    public async Task<VideoPrivacy> GetPrivacyAsync(string videoId, CancellationToken ct = default) =>
        YouTubeMapping.ParsePrivacy((await GetVideoAsync(videoId, ct)).Status?.PrivacyStatus);

    /// <summary>Sets the video private and clears any scheduled publishAt. Videos on this channel are never made for kids.</summary>
    public async Task SetPrivateAsync(string videoId, CancellationToken ct = default)
    {
        var current = (await GetVideoAsync(videoId, ct)).Status;
        var status = new VideoStatus
        {
            PrivacyStatus = "private",
            PublishAtRaw = null,
            Embeddable = current?.Embeddable,
            License = current?.License,
            PublicStatsViewable = current?.PublicStatsViewable,
            ContainsSyntheticMedia = current?.ContainsSyntheticMedia ?? false,
            SelfDeclaredMadeForKids = false,
        };
        var update = service.Videos.Update(new Video { Id = videoId, Status = status }, Parts("status"));
        await YouTubeErrors.Guard(() => update.ExecuteAsync(ct));
    }

    public async Task<IReadOnlyList<ChannelVideo>> ListChannelVideosAsync(CancellationToken ct = default)
    {
        var channels = service.Channels.List(Parts("contentDetails"));
        channels.Mine = true;
        var channel = (await YouTubeErrors.Guard(() => channels.ExecuteAsync(ct))).Items?.FirstOrDefault()
            ?? throw new InvalidOperationException("The authorized account has no YouTube channel.");
        var uploadsPlaylist = channel.ContentDetails.RelatedPlaylists.Uploads;

        var result = new List<ChannelVideo>();
        string? pageToken = null;
        do
        {
            var page = service.PlaylistItems.List(Parts("snippet", "contentDetails", "status"));
            page.PlaylistId = uploadsPlaylist;
            page.MaxResults = YouTubeMapping.MaxIdsPerRequest;
            page.PageToken = pageToken;
            var response = await YouTubeErrors.Guard(() => page.ExecuteAsync(ct));
            foreach (var item in response.Items ?? [])
            {
                result.Add(new ChannelVideo(
                    item.ContentDetails?.VideoId ?? item.Snippet?.ResourceId?.VideoId ?? "",
                    item.Snippet?.Title ?? "",
                    item.ContentDetails?.VideoPublishedAtDateTimeOffset,
                    YouTubeMapping.ParsePrivacy(item.Status?.PrivacyStatus)));
            }
            pageToken = response.NextPageToken;
        } while (!string.IsNullOrEmpty(pageToken));
        return result;
    }

    public void Dispose() => service.Dispose();

    private async Task<Video> GetVideoAsync(string videoId, CancellationToken ct) =>
        (await ListVideosAsync([videoId], Parts("status"), ct)).FirstOrDefault()
        ?? throw new KeyNotFoundException($"YouTube video {videoId} not found.");

    private async Task<IList<Video>> ListVideosAsync(IReadOnlyList<string> ids, Repeatable<string> parts, CancellationToken ct)
    {
        var list = service.Videos.List(parts);
        list.Id = new Repeatable<string>(ids);
        list.MaxResults = YouTubeMapping.MaxIdsPerRequest;
        return (await YouTubeErrors.Guard(() => list.ExecuteAsync(ct))).Items ?? [];
    }

    private static Repeatable<string> Parts(params string[] parts) => new(parts);

    private static void ThrowIfFailed(IUploadProgress progress)
    {
        if (progress.Status != UploadStatus.Failed) return;
        throw YouTubeErrors.Translate(progress.Exception ?? new InvalidOperationException("YouTube upload failed."));
    }
}
