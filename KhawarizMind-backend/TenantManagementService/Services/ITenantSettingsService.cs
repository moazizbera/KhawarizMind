using System.Security.Claims;
using DocumentManagementSystem.TenantManagementService.Models;

namespace DocumentManagementSystem.TenantManagementService.Services;

public interface ITenantSettingsService
{
    Task<TenantSettings> GetAsync(CancellationToken cancellationToken = default);

    Task<TenantSettings> UpdateAsync(
        TenantSettingsUpdateRequest request,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditLogEntry>> GetAuditAsync(
        int? take = null,
        CancellationToken cancellationToken = default);
}
