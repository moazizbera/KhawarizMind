using DocumentManagementSystem.TenantManagementService.Authorization;
using DocumentManagementSystem.TenantManagementService.Models;
using DocumentManagementSystem.TenantManagementService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentManagementSystem.TenantManagementService.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SettingsController : ControllerBase
{
    private readonly ITenantSettingsService _service;

    public SettingsController(ITenantSettingsService service)
    {
        _service = service;
    }

    [HttpGet]
    [Authorize(Roles = $"{AppRoles.SettingsAdmin},{AppRoles.SettingsReader},{AppRoles.SecurityAdmin}")]
    public async Task<ActionResult<TenantSettingsResponse>> GetAsync(CancellationToken cancellationToken)
    {
        var settings = await _service.GetAsync(cancellationToken);
        return Ok(TenantSettingsResponse.FromModel(settings));
    }

    [HttpPut]
    [Authorize(Roles = AppRoles.SettingsAdmin)]
    public async Task<ActionResult<TenantSettingsResponse>> UpdateAsync(
        [FromBody] TenantSettingsUpdateRequest request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest("A request body is required.");
        }

        var updated = await _service.UpdateAsync(request, User, cancellationToken);
        return Ok(TenantSettingsResponse.FromModel(updated));
    }

    [HttpGet("audit")]
    [Authorize(Roles = $"{AppRoles.SecurityAdmin},{AppRoles.SettingsAdmin}")]
    public async Task<ActionResult<IReadOnlyList<AuditLogEntry>>> GetAuditAsync(
        [FromQuery] int? take,
        CancellationToken cancellationToken)
    {
        var entries = await _service.GetAuditAsync(take, cancellationToken);
        return Ok(entries);
    }
}
