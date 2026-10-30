namespace Cubitos.Publisher.Core.Ports;

/// <summary>The platform's daily API quota is spent; the call is retryable after the quota resets.</summary>
public sealed class PlatformQuotaExceededException(string message, Exception? inner = null) : Exception(message, inner);
