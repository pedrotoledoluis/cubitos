using System.Globalization;
using System.Text;
using Cubitos.Publisher.Core.Stats;

namespace Cubitos.Publisher.Worker.Hosting;

/// <summary>
/// Plain text log, one file per Peru day: <c>publisher-YYYYMMDD.log</c>. The folder is created on the first write,
/// so commands that log nothing leave no file behind. Messages must never contain credentials.
/// </summary>
public sealed class DailyFileLoggerProvider(string directory, Func<DateTimeOffset>? now = null) : ILoggerProvider
{
    private readonly Lock _lock = new();
    private readonly Func<DateTimeOffset> _now = now ?? (() => DateTimeOffset.UtcNow);

    public string Directory { get; } = directory;

    public static string FileNameFor(DateTimeOffset instant) =>
        $"publisher-{PeruTime.ToPeru(instant).ToString("yyyyMMdd", CultureInfo.InvariantCulture)}.log";

    public ILogger CreateLogger(string categoryName) => new FileLogger(this, categoryName);

    public void Dispose() { }

    private void Write(string category, LogLevel level, string message, Exception? exception)
    {
        var at = PeruTime.ToPeru(_now());
        var line = new StringBuilder()
            .Append(at.ToString("yyyy-MM-dd HH:mm:ss.fff zzz", CultureInfo.InvariantCulture))
            .Append(" [").Append(Level(level)).Append("] ").Append(category).Append(": ").Append(message);
        if (exception is not null) line.AppendLine().Append(exception);
        line.AppendLine();

        lock (_lock)
        {
            try
            {
                System.IO.Directory.CreateDirectory(Directory);
                File.AppendAllText(Path.Combine(Directory, FileNameFor(at)), line.ToString(), Encoding.UTF8);
            }
            catch (IOException)
            {
                // Logging must never take the service down.
            }
            catch (UnauthorizedAccessException)
            {
            }
        }
    }

    private static string Level(LogLevel level) => level switch
    {
        LogLevel.Trace => "TRC",
        LogLevel.Debug => "DBG",
        LogLevel.Information => "INF",
        LogLevel.Warning => "WRN",
        LogLevel.Error => "ERR",
        LogLevel.Critical => "CRT",
        _ => "---",
    };

    private sealed class FileLogger(DailyFileLoggerProvider provider, string category) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => logLevel != LogLevel.None;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel)) return;
            provider.Write(category, logLevel, formatter(state, exception), exception);
        }
    }
}
