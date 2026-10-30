using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Dashboard.Core.Data;
using Cubitos.Publisher.Dashboard.Core.Formatting;
using Cubitos.Publisher.Dashboard.Core.Model;

namespace Cubitos.Publisher.Dashboard.Tests;

public class EpisodeTitlesTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 17, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData("019-cancion-criolla", "Cancion criolla")]
    [InlineData("005-diogenes", "Diogenes")]
    [InlineData("plain", "Plain")]
    [InlineData("123", "123")]
    public void FromSlug_drops_the_number_and_dashes(string slug, string expected) =>
        Assert.Equal(expected, EpisodeTitles.FromSlug(slug));

    [Fact]
    public void ReadMetadataTitle_finds_repo_relative_folders_above_the_database()
    {
        var root = Path.Combine(Path.GetTempPath(), "cubitos-titles-" + Guid.NewGuid().ToString("N"));
        try
        {
            var episode = Path.Combine(root, "videos", "019-cancion-criolla");
            Directory.CreateDirectory(episode);
            Directory.CreateDirectory(Path.Combine(root, "publisher", "data"));
            File.WriteAllText(Path.Combine(episode, "metadata.json"), """{ "id": "019", "title": "Canción Criolla: ¿por qué el 31?" }""");
            var db = Path.Combine(root, "publisher", "data", "publisher.db");

            Assert.Equal("Canción Criolla: ¿por qué el 31?", EpisodeTitles.ReadMetadataTitle("videos/019-cancion-criolla", db));
            Assert.Null(EpisodeTitles.ReadMetadataTitle("videos/missing", db));

            File.WriteAllText(Path.Combine(episode, "metadata.json"), "not json");
            Assert.Null(EpisodeTitles.ReadMetadataTitle("videos/019-cancion-criolla", db));
        }
        finally
        {
            try { Directory.Delete(root, recursive: true); } catch (IOException) { }
        }
    }

    private static QueueItem Item(string episode, DateTimeOffset publishAt) =>
        new(Guid.NewGuid(), episode, "videos/" + episode, publishAt, null, null, QueueStatus.Scheduled, null, 0, null, null, Now, Now);

    [Fact]
    public void Next_publish_and_queue_use_the_metadata_title_then_catalog_then_slug()
    {
        var data = new DashboardData([], [],
            [Item("019-cancion-criolla", Now.AddHours(2)), Item("020-desfile", Now.AddHours(3)), Item("021-momias-incas", Now.AddHours(4))],
            [new CatalogVideo("v1", "Desfile de James Bond", Now.AddDays(-3), "020-desfile")],
            new Dictionary<string, string> { ["019-cancion-criolla"] = "Canción Criolla" });

        var model = DashboardBuilder.Build(data, Now);

        Assert.Equal("Canción Criolla", model.Kpis.NextPublish!.Title);
        Assert.Equal("019-cancion-criolla", model.Kpis.NextPublish.EpisodeId);
        Assert.Equal(["Canción Criolla", "Desfile de James Bond", "Momias incas"], model.Queue.Select(q => q.Title));
    }
}
