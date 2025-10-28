using System.Collections.Concurrent;

namespace DocumentManagementSystem.Common.Audit;

/// <summary>
/// Basic in-memory implementation of the <see cref="IAuditStore"/> interface. This is intended for
/// development and test scenarios and can easily be replaced by a persistent implementation.
/// </summary>
public sealed class InMemoryAuditStore : IAuditStore
{
    private readonly ConcurrentQueue<AuditEntry> _entries = new();

    public Task WriteAsync(AuditEntry entry, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(entry);
        _entries.Enqueue(entry);
        return Task.CompletedTask;
    }

    /// <summary>
    /// Returns a snapshot of the stored entries. This helper is primarily intended for diagnostic
    /// scenarios and is not part of the <see cref="IAuditStore"/> contract.
    /// </summary>
    public IReadOnlyCollection<AuditEntry> Snapshot() => _entries.ToArray();
}
