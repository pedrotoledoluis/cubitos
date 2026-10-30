namespace Cubitos.Publisher.Core.Ports;

/// <summary>The platform refused the upload because the channel hit its upload limit.</summary>
public sealed class UploadLimitExceededException(string message, Exception? inner = null) : Exception(message, inner);
