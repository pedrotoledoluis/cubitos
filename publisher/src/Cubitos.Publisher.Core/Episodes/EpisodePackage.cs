namespace Cubitos.Publisher.Core.Episodes;

/// <summary>Everything needed to upload one episode. Infrastructure reads and parses the files.</summary>
public sealed record EpisodePackage(
    string EpisodeId,
    string EpisodeDir,
    string VideoPath,
    string ThumbnailPath,
    string Title,
    string Description,
    IReadOnlyList<string> Tags);
