using Cubitos.Publisher.Core.Stats;

namespace Cubitos.Publisher.Core.Ports;

/// <summary>Publishes the public channel stats summary (the website JSON file).</summary>
public interface IChannelStatsWriter
{
    Task WriteAsync(ChannelStatsReport report, CancellationToken ct = default);
}
