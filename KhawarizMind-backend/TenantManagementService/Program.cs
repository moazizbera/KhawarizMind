using System.Security.Claims;
using DocumentManagementSystem.Common.Authentication;
using DocumentManagementSystem.Common.Data;
using DocumentManagementSystem.Common.Models.Audit;
using DocumentManagementSystem.Common.Models.Settings;
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCommonJwtAuthentication();

var app = builder.Build();

InMemoryStore.EnsureSeeded();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

var settingsGroup = app.MapGroup("/api/settings").RequireAuthorization();

settingsGroup.MapGet("", (ClaimsPrincipal user) =>
{
    var tenantId = ResolveTenant(user);
    var settings = InMemoryStore.TenantSettings.GetOrAdd(tenantId, _ => TenantSettings.CreateDefault());
    return Results.Ok(settings);
});

settingsGroup.MapPut("", [Authorize(Policy = AppPolicies.SettingsWrite)] (ClaimsPrincipal user, TenantSettingsUpdate update) =>
{
    var tenantId = ResolveTenant(user);
    var actor = user.Identity?.Name ?? "unknown";

    var current = InMemoryStore.TenantSettings.GetOrAdd(tenantId, _ => TenantSettings.CreateDefault());

    if (!string.IsNullOrWhiteSpace(update.Theme))
    {
        current.Theme = update.Theme!;
    }

    if (!string.IsNullOrWhiteSpace(update.Language))
    {
        current.Language = update.Language!;
    }

    if (update.Notifications is not null)
    {
        current.Notifications = new NotificationPreferences
        {
            EmailAlerts = update.Notifications.EmailAlerts,
            PushAlerts = update.Notifications.PushAlerts,
            ProductUpdates = update.Notifications.ProductUpdates
        };
    }

    if (update.Integrations is not null)
    {
        current.Integrations = new IntegrationSettings
        {
            DocumentWebhookUrl = update.Integrations.DocumentWebhookUrl ?? string.Empty,
            AiProviderApiKey = update.Integrations.AiProviderApiKey ?? string.Empty,
            StorageAccessKey = update.Integrations.StorageAccessKey ?? string.Empty
        };
    }

    current.UpdatedAt = DateTimeOffset.UtcNow;

    AppendAudit(tenantId, actor, "SettingsUpdated", update.AuditDetails ?? "Settings updated via API.");

    return Results.Ok(current);
});

settingsGroup.MapGet("/audit", (ClaimsPrincipal user) =>
{
    var tenantId = ResolveTenant(user);
    var entries = InMemoryStore.AuditLogs.TryGetValue(tenantId, out var logs)
        ? logs.OrderByDescending(e => e.Timestamp).ToList()
        : new List<AuditLogEntry>();

    return Results.Ok(entries);
});

settingsGroup.MapPost("/audit", [Authorize(Policy = AppPolicies.SettingsWrite)] (ClaimsPrincipal user, AuditCreateRequest request) =>
{
    var tenantId = ResolveTenant(user);
    var actor = user.Identity?.Name ?? "unknown";

    AppendAudit(tenantId, actor, request.Action ?? "ManualEntry", request.Details ?? "");
    return Results.Accepted();
});

app.Run();

static Guid ResolveTenant(ClaimsPrincipal user)
{
    var tenantClaim = user.FindFirstValue("tenant");
    return Guid.TryParse(tenantClaim, out var tenantId) ? tenantId : InMemoryStore.DefaultTenantId;
}

static void AppendAudit(Guid tenantId, string actor, string action, string details)
{
    var logEntry = new AuditLogEntry
    {
        Id = Guid.NewGuid(),
        TenantId = tenantId,
        Actor = actor,
        Action = action,
        Details = details,
        Timestamp = DateTimeOffset.UtcNow
    };

    var list = InMemoryStore.AuditLogs.GetOrAdd(tenantId, _ => new List<AuditLogEntry>());
    lock (list)
    {
        list.Add(logEntry);
    }
}

record TenantSettingsUpdate
{
    public string? Theme { get; init; }
    public string? Language { get; init; }
    public NotificationPreferences? Notifications { get; init; }
    public IntegrationSettings? Integrations { get; init; }
    public string? AuditDetails { get; init; }
}

record AuditCreateRequest
{
    public string? Action { get; init; }
    public string? Details { get; init; }
}
