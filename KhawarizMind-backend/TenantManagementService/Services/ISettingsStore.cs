using DocumentManagementSystem.TenantManagementService.Models;

namespace DocumentManagementSystem.TenantManagementService.Services;

public interface ISettingsStore
{
    Task<TenantSettings> GetSettingsAsync(CancellationToken cancellationToken = default);

    Task UpdateSettingsAsync(
        TenantSettings settings,
        AuditLogEntry? auditEntry,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditLogEntry>> GetAuditAsync(
        int? take = null,
        CancellationToken cancellationToken = default);
}
