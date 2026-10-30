using System.Text;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Infrastructure;
using Cubitos.Publisher.Infrastructure.Episodes;
using Cubitos.Publisher.Infrastructure.Sqlite;
using Cubitos.Publisher.Infrastructure.UploadLog;
using Cubitos.Publisher.Worker.Application;
using Cubitos.Publisher.Worker.Cli;
using Cubitos.Publisher.Worker.Hosting;
using Microsoft.Extensions.Hosting.WindowsServices;
using Microsoft.Extensions.Options;

const string ServiceName = "CubitosPublisher";

// "--Publisher:Key=value" arguments are configuration overrides; anything else is a CLI command.
static bool IsConfigArg(string a) => a.StartsWith("--Publisher:", StringComparison.OrdinalIgnoreCase);
var configArgs = args.Where(IsConfigArg).ToArray();
var cliArgs = args.Where(a => !IsConfigArg(a)).ToArray();
var cliMode = cliArgs.Length > 0;
var verbose = !cliMode || string.Equals(cliArgs[0], "run-once", StringComparison.OrdinalIgnoreCase);

var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
{
    Args = configArgs,
    // A service starts in System32; read appsettings.json next to the exe.
    ContentRootPath = AppContext.BaseDirectory,
});

var section = builder.Configuration.GetSection(PublisherOptions.SectionName);
builder.Services.AddWindowsService(o => o.ServiceName = ServiceName);
builder.Services.AddOptions<PublisherOptions>().Bind(section).ValidateOnStart();
builder.Services.AddSingleton<IValidateOptions<PublisherOptions>, PublisherOptionsValidator>();

builder.Logging.ClearProviders();
if (WindowsServiceHelpers.IsWindowsService() && OperatingSystem.IsWindows())
    AddEventLog(builder.Logging);
else if (verbose)
    builder.Logging.AddSimpleConsole(o => o.TimestampFormat = "HH:mm:ss ");
if (verbose)
    builder.Logging.AddProvider(new DailyFileLoggerProvider((section.Get<PublisherOptions>() ?? new()).ResolvedLogDirectory));

[System.Runtime.Versioning.SupportedOSPlatform("windows")]
static void AddEventLog(ILoggingBuilder logging) => logging.AddEventLog(new Microsoft.Extensions.Logging.EventLog.EventLogSettings { SourceName = ServiceName });

static PublisherOptions Opt(IServiceProvider sp) => sp.GetRequiredService<IOptions<PublisherOptions>>().Value;
var services = builder.Services;
services.AddSingleton<IClock, SystemClock>();
services.AddSingleton(sp => new SqliteDatabase(Opt(sp).ResolvedDatabasePath));
services.AddSingleton<IQueueStore, SqliteQueueStore>();
services.AddSingleton<ISnapshotStore, SqliteSnapshotStore>();
services.AddSingleton<IVideoCatalog, SqliteVideoCatalog>();
services.AddSingleton<IUploadLog>(sp => new UploadedJsonLog(Opt(sp).UploadLogPath));
services.AddSingleton<IEpisodeReader>(sp => new EpisodePackageReader(Opt(sp).RepoRoot));
services.AddSingleton<IVideoPlatform, LazyYouTubePlatform>();
services.AddSingleton<PublishCycle>();
services.AddSingleton<StatsCycle>();

if (!cliMode)
{
    services.AddHostedService<PublishWorker>();
    services.AddHostedService<StatsWorker>();
    await builder.Build().RunAsync();
    return 0;
}

Console.OutputEncoding = Encoding.UTF8;
using var host = builder.Build();
var sp = host.Services;
PublisherOptions options;
try
{
    options = Opt(sp);
}
catch (OptionsValidationException ex)
{
    Console.Error.WriteLine($"Invalid configuration: {string.Join(" ", ex.Failures)}");
    return 1;
}

using var cts = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    cts.Cancel();
};

var clock = sp.GetRequiredService<IClock>();
var cli = new CliCommands(
    sp.GetRequiredService<IQueueStore>(), sp.GetRequiredService<IEpisodeReader>(), sp.GetRequiredService<ISnapshotStore>(),
    clock, options.RepoRoot, Console.Out,
    async ct =>
    {
        await sp.GetRequiredService<PublishCycle>().RunOnceAsync(clock.UtcNow, ct);
        await sp.GetRequiredService<StatsCycle>().RunOnceAsync(clock.UtcNow, ct);
    });
try
{
    return await cli.RunAsync(cliArgs, cts.Token);
}
catch (OperationCanceledException)
{
    Console.Error.WriteLine("Cancelled.");
    return 130;
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Error: {ex.Message}");
    return 1;
}
