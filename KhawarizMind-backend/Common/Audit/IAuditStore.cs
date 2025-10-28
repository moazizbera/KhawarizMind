namespace DocumentManagementSystem.Common.Audit;

/// <summary>
/// Contract for persisting audit entries so that other services can consume them.
/// </summary>
public interface IAuditStore
{
    /// <summary>
    /// Persists a new audit entry.
    /// </summary>
    Task WriteAsync(AuditEntry entry, CancellationToken cancellationToken = default);
}
