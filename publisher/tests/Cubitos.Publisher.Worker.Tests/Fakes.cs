using Cubitos.Publisher.Core.Episodes;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;

namespace Cubitos.Publisher.Worker.Tests;

public sealed class FakeClock(DateTimeOffset now) : IClock
{
    public DateTimeOffset UtcNow { get; set; } = now;
}

public sealed class FakeQueueStore : IQueueStore
{
    public List<QueueItem> Items { get; } = [];
    /// <summary>Every persisted status, in write order.</summary>
    public List<(Guid Id, QueueStatus Status)> Writes { get; } = [];

    public Task<IReadOnlyList<QueueItem>> GetAllAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<QueueItem>>(Items.ToList());

    public Task<QueueItem?> GetAsync(Guid id, CancellationToken ct = default) =>
        Task.FromResult(Items.FirstOrDefault(i => i.Id == id));

    public Task AddAsync(QueueItem item, CancellationToken ct = default)
    {
        Items.Add(item);
        Writes.Add((item.Id, item.Status));
        return Task.CompletedTask;
    }

    public Task UpdateAsync(QueueItem item, CancellationToken ct = default)
    {
        Writes.Add((item.Id, item.Status));
        return Task.CompletedTask;
    }
}

public sealed class FakeEpisodeReader : IEpisodeReader
{
    public string? ThumbnailPath { get; set; } = "thumb.png";
    public HashSet<string> Missing { get; } = [];

    public EpisodePackage Read(string episodeDir)
    {
        if (Missing.Contains(episodeDir)) throw new DirectoryNotFoundException($"Episode folder not found: {episodeDir}");
        var id = episodeDir.Split('/', '\\').Last();
        return new EpisodePackage(id, episodeDir, $"{id}.mp4", ThumbnailPath, $"Title {id}", "desc", ["tag"]);
    }
}

public sealed class FakeUploadLog : IUploadLog
{
    public List<UploadLogEntry> Entries { get; } = [];

    public Task AppendAsync(UploadLogEntry entry, CancellationToken ct = default)
    {
        Entries.Add(entry);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<UploadLogEntry>> ReadAllAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<UploadLogEntry>>(Entries.ToList());
}

public sealed class FakePlatform : IVideoPlatform
{
    public List<(string EpisodeId, DateTimeOffset? PublishAt)> Uploads { get; } = [];
    public List<string> Thumbnails { get; } = [];
    public List<string> MadePrivate { get; } = [];
    public Dictionary<string, long> Views { get; } = [];
    public Dictionary<string, VideoPrivacy> Privacy { get; } = [];
    public List<ChannelVideo> ChannelVideos { get; } = [];
    public List<IReadOnlyCollection<string>> StatsRequests { get; } = [];
    public Func<Exception>? UploadError { get; set; }
    public Exception? ThumbnailError { get; set; }
    public string NextVideoId { get; set; } = "new1";

    public Task<string> UploadAsync(EpisodePackage episode, DateTimeOffset? publishAt, CancellationToken ct = default)
    {
        if (UploadError is { } error) throw error();
        Uploads.Add((episode.EpisodeId, publishAt));
        return Task.FromResult(NextVideoId);
    }

    public Task SetThumbnailAsync(string videoId, string thumbnailPath, CancellationToken ct = default)
    {
        if (ThumbnailError is { } error) throw error;
        Thumbnails.Add(videoId);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<VideoStats>> GetStatsAsync(IReadOnlyCollection<string> videoIds, CancellationToken ct = default)
    {
        StatsRequests.Add(videoIds);
        IReadOnlyList<VideoStats> stats = videoIds.Where(Views.ContainsKey)
            .Select(id => new VideoStats(id, $"T {id}", Views[id], 1, 2)).ToList();
        return Task.FromResult(stats);
    }

    public Task<VideoPrivacy> GetPrivacyAsync(string videoId, CancellationToken ct = default) =>
        Privacy.TryGetValue(videoId, out var p)
            ? Task.FromResult(p)
            : throw new KeyNotFoundException($"YouTube video {videoId} not found.");

    public Task SetPrivateAsync(string videoId, CancellationToken ct = default)
    {
        if (!Privacy.ContainsKey(videoId)) throw new KeyNotFoundException($"YouTube video {videoId} not found.");
        Privacy[videoId] = VideoPrivacy.Private;
        MadePrivate.Add(videoId);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<ChannelVideo>> ListChannelVideosAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<ChannelVideo>>(ChannelVideos.ToList());
}

public sealed class FakeCatalog : IVideoCatalog
{
    public Dictionary<string, CatalogVideo> Videos { get; } = [];

    public Task UpsertAsync(CatalogVideo video, CancellationToken ct = default)
    {
        Videos[video.VideoId] = video with { EpisodeId = video.EpisodeId ?? Videos.GetValueOrDefault(video.VideoId)?.EpisodeId };
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<CatalogVideo>> GetAllAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<CatalogVideo>>(Videos.Values.ToList());
}

public sealed class FakeSnapshotStore : ISnapshotStore
{
    public List<VideoSnapshot> Snapshots { get; } = [];

    public Task AddRangeAsync(IEnumerable<VideoSnapshot> snapshots, CancellationToken ct = default)
    {
        Snapshots.AddRange(snapshots);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<VideoSnapshot>> GetSinceAsync(DateTimeOffset since, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<VideoSnapshot>>(Snapshots.Where(s => s.TakenAt >= since).ToList());

    public Task<IReadOnlyList<VideoSnapshot>> GetForVideoAsync(string videoId, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<VideoSnapshot>>(Snapshots.Where(s => s.VideoId == videoId).ToList());
}
