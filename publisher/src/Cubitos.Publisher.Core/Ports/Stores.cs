using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;

namespace Cubitos.Publisher.Core.Ports;

public interface IQueueStore
{
    Task<IReadOnlyList<QueueItem>> GetAllAsync(CancellationToken ct = default);
    Task<QueueItem?> GetAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(QueueItem item, CancellationToken ct = default);
    Task UpdateAsync(QueueItem item, CancellationToken ct = default);
}

public interface ISnapshotStore
{
    Task AddRangeAsync(IEnumerable<VideoSnapshot> snapshots, CancellationToken ct = default);
    Task<IReadOnlyList<VideoSnapshot>> GetSinceAsync(DateTimeOffset since, CancellationToken ct = default);
    Task<IReadOnlyList<VideoSnapshot>> GetForVideoAsync(string videoId, CancellationToken ct = default);
}

/// <summary>One entry of <c>uploader/uploaded.json</c>: <c>{ "&lt;episodeId&gt;": { videoId, uploadedAt, publishAt } }</c>.</summary>
public sealed record UploadLogEntry(string EpisodeId, string VideoId, DateTimeOffset UploadedAt, DateTimeOffset? PublishAt);

/// <summary>The upload log shared with the Node uploader.</summary>
public interface IUploadLog
{
    Task AppendAsync(UploadLogEntry entry, CancellationToken ct = default);
    Task<IReadOnlyList<UploadLogEntry>> ReadAllAsync(CancellationToken ct = default);
}

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}
