using Cubitos.Publisher.Core.Episodes;

namespace Cubitos.Publisher.Core.Ports;

/// <summary>A channel video known to the service; <see cref="EpisodeId"/> links it to a repo episode when known.</summary>
public sealed record CatalogVideo(string VideoId, string Title, DateTimeOffset? PublishedAt, string? EpisodeId);

/// <summary>Which channel videos exist, for stats polling and the dashboard.</summary>
public interface IVideoCatalog
{
    /// <summary>Inserts or updates by video id. A null episode id keeps the stored one.</summary>
    Task UpsertAsync(CatalogVideo video, CancellationToken ct = default);
    Task<IReadOnlyList<CatalogVideo>> GetAllAsync(CancellationToken ct = default);
}

/// <summary>Reads an episode folder into an uploadable package; throws when required files are missing.</summary>
public interface IEpisodeReader
{
    EpisodePackage Read(string episodeDir);
}
