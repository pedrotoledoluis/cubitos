namespace Cubitos.Publisher.Core.Episodes;

/// <summary>Everything needed to upload one episode. Infrastructure reads and parses the files.</summary>
/// <param name="ThumbnailPath">Null when the episode has no thumbnail file.</param>
public sealed record EpisodePackage(
    string EpisodeId,
    string EpisodeDir,
    string VideoPath,
    string? ThumbnailPath,
    string Title,
    string Description,
    IReadOnlyList<string> Tags,
    string CategoryId = "27",
    string DefaultLanguage = "es",
    string DefaultAudioLanguage = "es",
    bool MadeForKids = false);
