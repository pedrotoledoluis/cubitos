using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Infrastructure;
using Cubitos.Publisher.Worker.Application;
using Microsoft.Extensions.Options;

namespace Cubitos.Publisher.Worker.Hosting;

/// <summary>Runs <see cref="PublishCycle"/> every <see cref="PublisherOptions.PublishInterval"/>.</summary>
public sealed class PublishWorker(PublishCycle cycle, IClock clock, IOptions<PublisherOptions> options, ILogger<PublishWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Publish loop started (every {Interval})", options.Value.PublishInterval);
        await Loop.SafeAsync(() => cycle.RecoverInterruptedAsync(stoppingToken), logger, "Recovering interrupted uploads");
        await Loop.EveryAsync(options.Value.PublishInterval, () => cycle.RunOnceAsync(clock.UtcNow, stoppingToken),
            logger, "Publish cycle", stoppingToken);
    }
}

/// <summary>Runs <see cref="StatsCycle"/> at start and then every <see cref="PublisherOptions.StatsInterval"/>.</summary>
public sealed class StatsWorker(StatsCycle cycle, IClock clock, IOptions<PublisherOptions> options, ILogger<StatsWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Stats loop started (every {Interval})", options.Value.StatsInterval);
        await Loop.EveryAsync(options.Value.StatsInterval, () => cycle.RunOnceAsync(clock.UtcNow, stoppingToken),
            logger, "Stats cycle", stoppingToken);
    }
}

internal static class Loop
{
    /// <summary>Runs <paramref name="body"/> now and then on every tick; a failing run is logged and the loop continues.</summary>
    public static async Task EveryAsync(TimeSpan interval, Func<Task> body, ILogger logger, string name, CancellationToken ct)
    {
        using var timer = new PeriodicTimer(interval);
        do
        {
            await SafeAsync(body, logger, name);
        } while (!ct.IsCancellationRequested && await WaitAsync(timer, ct));
    }

    public static async Task SafeAsync(Func<Task> body, ILogger logger, string name)
    {
        try
        {
            await body();
        }
        catch (OperationCanceledException)
        {
            // Shutdown.
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{Name} failed", name);
        }
    }

    private static async Task<bool> WaitAsync(PeriodicTimer timer, CancellationToken ct)
    {
        try
        {
            return await timer.WaitForNextTickAsync(ct);
        }
        catch (OperationCanceledException)
        {
            return false;
        }
    }
}
