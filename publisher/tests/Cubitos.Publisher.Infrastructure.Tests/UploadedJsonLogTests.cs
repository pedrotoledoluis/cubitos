using System.Text.Json.Nodes;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Infrastructure.UploadLog;

namespace Cubitos.Publisher.Infrastructure.Tests;

public sealed class UploadedJsonLogTests : IDisposable
{
    private static readonly DateTimeOffset T0 = new(2026, 10, 30, 17, 0, 0, TimeSpan.Zero);
    private readonly TempDir _dir = new();
    private string LogPath => _dir.File("uploaded.json");

    public void Dispose() => _dir.Dispose();

    private JsonObject ReadJson() => JsonNode.Parse(File.ReadAllText(LogPath))!.AsObject();

    [Fact]
    public async Task Append_creates_file_in_node_format()
    {
        await new UploadedJsonLog(LogPath).AppendAsync(new UploadLogEntry("019-x", "vidA", T0, null));

        var text = File.ReadAllText(LogPath);
        Assert.Equal(
            "{\n  \"019-x\": {\n    \"videoId\": \"vidA\",\n    \"uploadedAt\": \"2026-10-30T17:00:00.000Z\",\n    \"publishAt\": null\n  }\n}",
            text);
    }

    [Fact]
    public async Task Append_preserves_other_entries_and_unknown_keys()
    {
        File.WriteAllText(LogPath, """
            { "001-a": { "videoId": "v1", "uploadedAt": "2026-10-01T00:00:00.000Z", "publishAt": null, "note": "keep" },
              "_meta": 7 }
            """);

        await new UploadedJsonLog(LogPath).AppendAsync(new UploadLogEntry("002-b", "v2", T0, T0.AddHours(5)));

        var json = ReadJson();
        Assert.Equal("keep", (string?)json["001-a"]!["note"]);
        Assert.Equal(7, (int?)json["_meta"]);
        Assert.Equal("2026-10-30T22:00:00.000Z", (string?)json["002-b"]!["publishAt"]);
        Assert.Equal(["001-a", "_meta", "002-b"], json.Select(p => p.Key));
    }

    [Fact]
    public async Task Reupload_moves_previous_entries_to_old_suffixes()
    {
        var log = new UploadedJsonLog(LogPath);
        await log.AppendAsync(new UploadLogEntry("019-x", "first", T0, null));
        await log.AppendAsync(new UploadLogEntry("019-x", "second", T0.AddDays(1), null));
        await log.AppendAsync(new UploadLogEntry("019-x", "third", T0.AddDays(2), null));

        var json = ReadJson();
        Assert.Equal("third", (string?)json["019-x"]!["videoId"]);
        Assert.Equal("first", (string?)json["019-x-old"]!["videoId"]);
        Assert.Equal("second", (string?)json["019-x-old2"]!["videoId"]);
    }

    [Fact]
    public async Task Read_all_returns_valid_entries_and_skips_others()
    {
        File.WriteAllText(LogPath, """
            { "001-a": { "videoId": "v1", "uploadedAt": "2026-10-01T05:00:00.000Z", "publishAt": "2026-10-02T17:00:00.000Z" },
              "_meta": 7, "broken": { "uploadedAt": "x" } }
            """);

        var entries = await new UploadedJsonLog(LogPath).ReadAllAsync();

        var e = Assert.Single(entries);
        Assert.Equal(new UploadLogEntry("001-a", "v1", new DateTimeOffset(2026, 10, 1, 5, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 10, 2, 17, 0, 0, TimeSpan.Zero)), e);
    }

    [Fact]
    public async Task Read_all_of_missing_file_is_empty_and_no_temp_files_remain()
    {
        var log = new UploadedJsonLog(LogPath);
        Assert.Empty(await log.ReadAllAsync());

        await log.AppendAsync(new UploadLogEntry("a", "v", T0, null));

        Assert.Equal(["uploaded.json"], Directory.GetFiles(_dir.Path).Select(Path.GetFileName));
    }

    [Fact]
    public async Task Non_ascii_text_is_written_unescaped()
    {
        File.WriteAllText(LogPath, """{ "x": { "videoId": "v", "uploadedAt": "2026-10-01T00:00:00.000Z", "publishAt": null, "title": "Canción" } }""");

        await new UploadedJsonLog(LogPath).AppendAsync(new UploadLogEntry("y", "v2", T0, null));

        Assert.Contains("Canción", File.ReadAllText(LogPath));
    }
}
