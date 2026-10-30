using Cubitos.Publisher.Core.Episodes;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Infrastructure;
using Cubitos.Publisher.Infrastructure.YouTube;
using Microsoft.Extensions.Options;

namespace Cubitos.Publisher.Worker.Hosting;

/// <summary>
/// Creates the YouTube client on first use, so CLI commands that never touch YouTube (list, enqueue, cancel,
/// stats) never read the secrets. A failed creation is retried on the next call.
/// </summary>
public sealed class LazyYouTubePlatform(IOptions<PublisherOptions> options, IClock clock) : IVideoPlatform, IDisposable
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private YouTubePlatform? _platform;

    private async Task<YouTubePlatform> GetAsync(CancellationToken ct)
    {
        if (_platform is { } ready) return ready;
        await _gate.WaitAsync(ct);
        try
        {
            return _platform ??= await YouTubePlatform.CreateAsync(options.Value, clock, ct);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<string> UploadAsync(EpisodePackage episode, DateTimeOffset? publishAt, CancellationToken ct = default) =>
        await (await GetAsync(ct)).UploadAsync(episode, publishAt, ct);

    public async Task SetThumbnailAsync(string videoId, string thumbnailPath, CancellationToken ct = default) =>
        await (await GetAsync(ct)).SetThumbnailAsync(videoId, thumbnailPath, ct);

    public async Task<IReadOnlyList<VideoStats>> GetStatsAsync(IReadOnlyCollection<string> videoIds, CancellationToken ct = default) =>
        await (await GetAsync(ct)).GetStatsAsync(videoIds, ct);

    public async Task<VideoPrivacy> GetPrivacyAsync(string videoId, CancellationToken ct = default) =>
        await (await GetAsync(ct)).GetPrivacyAsync(videoId, ct);

    public async Task SetPrivateAsync(string videoId, CancellationToken ct = default) =>
        await (await GetAsync(ct)).SetPrivateAsync(videoId, ct);

    public async Task<IReadOnlyList<ChannelVideo>> ListChannelVideosAsync(CancellationToken ct = default) =>
        await (await GetAsync(ct)).ListChannelVideosAsync(ct);

    public void Dispose() => _platform?.Dispose();
}
