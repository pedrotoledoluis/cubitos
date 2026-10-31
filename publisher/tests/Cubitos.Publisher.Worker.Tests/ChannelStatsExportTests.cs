using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Core.Queue;
using Cubitos.Publisher.Core.Stats;
using Cubitos.Publisher.Infrastructure.Stats;
using Cubitos.Publisher.Worker.Application;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cubitos.Publisher.Worker.Tests;

public sealed class FakeStatsWriter : IChannelStatsWriter
{
    public List<ChannelStatsReport> Written { get; } = [];
    public Exception? Error { get; set; }

    public Task WriteAsync(ChannelStatsReport report, CancellationToken ct = default)
    {
        if (Error is { } e) throw e;
        Written.Add(report);
        return Task.CompletedTask;
    }
}

public sealed class ChannelStatsExportTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 31, 17, 0, 0, TimeSpan.Zero);

    private readonly FakeSnapshotStore _snapshots = new();
    private readonly FakeCatalog _catalog = new();
    private readonly FakeQueueStore _queue = new();
    private readonly FakeUploadLog _uploads = new();
    private readonly FakeEpisodeReader _episodes = new();
    private readonly FakeStatsWriter _writer = new();

    private ChannelStatsExport Export() =>
        new(_snapshots, _catalog, _queue, _uploads, _episodes, _writer, NullLogger<ChannelStatsExport>.Instance);

    [Fact]
    public async Task Empty_database_writes_an_empty_report()
    {
        var report = await Export().RunAsync(Now);

        Assert.Same(report, Assert.Single(_writer.Written));
        Assert.Empty(report.Videos);
        Assert.Equal(0, report.Channel.Views);
        Assert.Null(report.Queue.Next);
    }

    [Fact]
    public async Task Report_uses_episode_titles_and_falls_back_to_the_slug()
    {
        _queue.Items.Add(QueueItem.Create("024-san-martin", "videos/024-san-martin", Now.AddHours(1), Now));
        _queue.Items.Add(QueueItem.Create("025-sin-carpeta", "videos/025-sin-carpeta", Now.AddHours(2), Now));
        _episodes.Missing.Add("videos/025-sin-carpeta");

        var report = await Export().RunAsync(Now);

        Assert.Equal(["Title 024-san-martin", "Sin carpeta"], report.Queue.Upcoming.Select(e => e.Title));
    }

    [Fact]
    public async Task Serialized_report_has_no_paths_secrets_or_errors()
    {
        _catalog.Videos["v1"] = new CatalogVideo("v1", "Video uno", Now.AddDays(-1), "001-a", VideoPrivacy.Public);
        _snapshots.Snapshots.Add(new VideoSnapshot("v1", "Video uno", Now.AddMinutes(-5), 10, 1, 0));
        var failing = QueueItem.Create("023-a", @"D:\PROYECTS\cubitos\videos\023-a", Now.AddHours(-1), Now.AddHours(-2));
        failing.StartUpload(Now);
        failing.WaitForQuota(Now.AddHours(5), @"Quota at C:\secrets\token.json for owner@example.com", Now);
        _queue.Items.Add(failing);

        var json = JsonChannelStatsWriter.Serialize(await Export().RunAsync(Now));

        foreach (var forbidden in new[] { @":\", ":\\\\", "secrets", "token", "@", "PROYECTS", "videos/", "Quota at" })
            Assert.DoesNotContain(forbidden, json, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("023-a", json);
        Assert.Contains("v1", json);
    }
}
