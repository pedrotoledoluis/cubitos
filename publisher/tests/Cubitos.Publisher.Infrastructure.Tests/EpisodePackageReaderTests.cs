using Cubitos.Publisher.Infrastructure.Episodes;

namespace Cubitos.Publisher.Infrastructure.Tests;

public sealed class EpisodePackageReaderTests : IDisposable
{
    private readonly TempDir _root = new();

    public void Dispose() => _root.Dispose();

    private string Episode(string id, bool video = true, bool thumbnail = true, string? metadata = null,
        string? description = "Title line\n\nBody\n")
    {
        var dir = Path.Combine(_root.Path, "videos", id);
        Directory.CreateDirectory(dir);
        if (video) File.WriteAllText(Path.Combine(dir, $"{id}.mp4"), "mp4");
        if (thumbnail) File.WriteAllText(Path.Combine(dir, $"{id}-thumbnail.png"), "png");
        if (description is not null) File.WriteAllText(Path.Combine(dir, $"{id}-description.txt"), description);
        if (metadata is not null) File.WriteAllText(Path.Combine(dir, "metadata.json"), metadata);
        return $"videos/{id}";
    }

    [Fact]
    public void Reads_metadata_fields_and_description_file()
    {
        var rel = Episode("019-x", metadata: """
            { "id": "019-x", "title": "Canción: ¿por qué?", "description": "meta desc",
              "tags": ["a", "b"], "categoryId": "22", "defaultLanguage": "es", "defaultAudioLanguage": "es-419",
              "selfDeclaredMadeForKids": false, "privacyStatus": "private" }
            """);

        var p = new EpisodePackageReader(_root.Path).Read(rel);

        Assert.Equal("019-x", p.EpisodeId);
        Assert.Equal(rel, p.EpisodeDir);
        Assert.Equal(Path.Combine(_root.Path, "videos", "019-x", "019-x.mp4"), p.VideoPath);
        Assert.Equal(Path.Combine(_root.Path, "videos", "019-x", "019-x-thumbnail.png"), p.ThumbnailPath);
        Assert.Equal("Canción: ¿por qué?", p.Title);
        Assert.Equal("Title line\n\nBody\n", p.Description);
        Assert.Equal(["a", "b"], p.Tags);
        Assert.Equal("22", p.CategoryId);
        Assert.Equal("es-419", p.DefaultAudioLanguage);
        Assert.False(p.MadeForKids);
    }

    [Fact]
    public void Missing_thumbnail_is_null_and_metadata_description_is_fallback()
    {
        var rel = Episode("020-y", thumbnail: false, description: null,
            metadata: """{ "title": "T", "description": "meta desc", "tags": [] }""");

        var p = new EpisodePackageReader(_root.Path).Read(rel);

        Assert.Null(p.ThumbnailPath);
        Assert.Equal("meta desc", p.Description);
        Assert.Equal("27", p.CategoryId);
    }

    [Fact]
    public void Metadata_files_override_default_names()
    {
        var rel = Episode("021-z", video: false, metadata: """{ "title": "T", "tags": [], "files": { "video": "custom.mp4" } }""");
        File.WriteAllText(Path.Combine(_root.Path, "videos", "021-z", "custom.mp4"), "mp4");

        var p = new EpisodePackageReader(_root.Path).Read(rel);

        Assert.EndsWith("custom.mp4", p.VideoPath);
    }

    [Fact]
    public void Without_metadata_uses_first_description_line_and_default_tags()
    {
        var rel = Episode("022-w");

        var p = new EpisodePackageReader(_root.Path).Read(rel);

        Assert.Equal("Title line", p.Title);
        Assert.Contains("Shorts", p.Tags);
        Assert.Equal("es", p.DefaultLanguage);
    }

    [Fact]
    public void Long_titles_are_truncated_to_100_chars()
    {
        var title = new string('x', 120);
        var rel = Episode("023-v", metadata: "{ \"title\": \"" + title + "\", \"tags\": [] }");

        Assert.Equal(100, new EpisodePackageReader(_root.Path).Read(rel).Title.Length);
    }

    [Fact]
    public void Missing_video_throws()
    {
        var rel = Episode("024-u", video: false);

        Assert.Throws<FileNotFoundException>(() => new EpisodePackageReader(_root.Path).Read(rel));
    }
}
