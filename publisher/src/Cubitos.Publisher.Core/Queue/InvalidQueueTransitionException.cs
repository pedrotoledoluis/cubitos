namespace Cubitos.Publisher.Core.Queue;

public sealed class InvalidQueueTransitionException(QueueStatus from, string transition)
    : InvalidOperationException($"Cannot {transition} a queue item in state {from}.")
{
    public QueueStatus From { get; } = from;
    public string Transition { get; } = transition;
}
