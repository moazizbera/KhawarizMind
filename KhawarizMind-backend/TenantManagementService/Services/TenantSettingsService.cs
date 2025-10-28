using System.Security.Claims;
using DocumentManagementSystem.TenantManagementService.Models;

namespace DocumentManagementSystem.TenantManagementService.Services;

public sealed class TenantSettingsService : ITenantSettingsService
{
    private readonly ISettingsStore _store;
    private readonly ILogger<TenantSettingsService> _logger;

    public TenantSettingsService(ISettingsStore store, ILogger<TenantSettingsService> logger)
    {
        _store = store;
        _logger = logger;
    }

    public Task<TenantSettings> GetAsync(CancellationToken cancellationToken = default)
    {
        return _store.GetSettingsAsync(cancellationToken);
    }

    public async Task<TenantSettings> UpdateAsync(
        TenantSettingsUpdateRequest request,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        var settings = await _store.GetSettingsAsync(cancellationToken);

        var changes = ApplyUpdate(settings, request);

        if (changes.Count == 0)
        {
            _logger.LogInformation("Tenant settings update from {User} contained no changes", user.Identity?.Name ?? "anonymous");
            return settings;
        }

        var actor = user.Identity?.Name ?? "system";
        settings.Metadata.UpdatedAt = DateTimeOffset.UtcNow;
        settings.Metadata.UpdatedBy = actor;

        var section = DetermineSection(request, changes.Keys);
        var auditEntry = AuditLogEntry.FromChanges(section, actor, changes);

        await _store.UpdateSettingsAsync(settings, auditEntry, cancellationToken);

        _logger.LogInformation(
            "Tenant settings updated by {User}. Section: {Section}. Changes: {ChangeSummary}",
            actor,
            section,
            string.Join(", ", changes.Select(kvp => $"{kvp.Key}={kvp.Value}")));

        return settings;
    }

    public Task<IReadOnlyList<AuditLogEntry>> GetAuditAsync(
        int? take = null,
        CancellationToken cancellationToken = default)
    {
        return _store.GetAuditAsync(take, cancellationToken);
    }

    private static Dictionary<string, string> ApplyUpdate(TenantSettings settings, TenantSettingsUpdateRequest request)
    {
        var changes = new Dictionary<string, string>();

        if (request.Preferences is not null)
        {
            if (!string.IsNullOrWhiteSpace(request.Preferences.Language) &&
                !string.Equals(settings.Preferences.Language, request.Preferences.Language, StringComparison.OrdinalIgnoreCase))
            {
                changes["preferences.language"] = $"{settings.Preferences.Language} -> {request.Preferences.Language}";
                settings.Preferences.Language = request.Preferences.Language;
            }

            if (!string.IsNullOrWhiteSpace(request.Preferences.Theme) &&
                !string.Equals(settings.Preferences.Theme, request.Preferences.Theme, StringComparison.OrdinalIgnoreCase))
            {
                changes["preferences.theme"] = $"{settings.Preferences.Theme} -> {request.Preferences.Theme}";
                settings.Preferences.Theme = request.Preferences.Theme;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Language) &&
            !string.Equals(settings.Preferences.Language, request.Language, StringComparison.OrdinalIgnoreCase))
        {
            changes["language"] = $"{settings.Preferences.Language} -> {request.Language}";
            settings.Preferences.Language = request.Language;
        }

        if (!string.IsNullOrWhiteSpace(request.Theme) &&
            !string.Equals(settings.Preferences.Theme, request.Theme, StringComparison.OrdinalIgnoreCase))
        {
            changes["theme"] = $"{settings.Preferences.Theme} -> {request.Theme}";
            settings.Preferences.Theme = request.Theme;
        }

        if (request.Notifications is { } notificationUpdate)
        {
            if (notificationUpdate.EmailSpecified)
            {
                var next = notificationUpdate.Email ?? false;
                if (settings.Notifications.Email != next)
                {
                    changes["notifications.email"] = $"{settings.Notifications.Email} -> {next}";
                    settings.Notifications.Email = next;
                }
            }

            if (notificationUpdate.SmsSpecified)
            {
                var next = notificationUpdate.Sms ?? false;
                if (settings.Notifications.Sms != next)
                {
                    changes["notifications.sms"] = $"{settings.Notifications.Sms} -> {next}";
                    settings.Notifications.Sms = next;
                }
            }

            if (notificationUpdate.PushSpecified)
            {
                var next = notificationUpdate.Push ?? false;
                if (settings.Notifications.Push != next)
                {
                    changes["notifications.push"] = $"{settings.Notifications.Push} -> {next}";
                    settings.Notifications.Push = next;
                }
            }
        }

        if (request.Integrations is { } integrationsUpdate)
        {
            if (integrationsUpdate.SlackWebhookSpecified)
            {
                if (!string.Equals(settings.Integrations.SlackWebhook, integrationsUpdate.SlackWebhook, StringComparison.Ordinal))
                {
                    changes["integrations.slackWebhook"] = DescribeSecretChange(settings.Integrations.SlackWebhook, integrationsUpdate.SlackWebhook);
                    settings.Integrations.SlackWebhook = integrationsUpdate.SlackWebhook;
                }
            }

            if (integrationsUpdate.TeamsWebhookSpecified)
            {
                if (!string.Equals(settings.Integrations.TeamsWebhook, integrationsUpdate.TeamsWebhook, StringComparison.Ordinal))
                {
                    changes["integrations.teamsWebhook"] = DescribeSecretChange(settings.Integrations.TeamsWebhook, integrationsUpdate.TeamsWebhook);
                    settings.Integrations.TeamsWebhook = integrationsUpdate.TeamsWebhook;
                }
            }

            if (integrationsUpdate.ApiKeySpecified)
            {
                if (!string.Equals(settings.Integrations.ApiKey, integrationsUpdate.ApiKey, StringComparison.Ordinal))
                {
                    changes["integrations.apiKey"] = DescribeSecretChange(settings.Integrations.ApiKey, integrationsUpdate.ApiKey);
                    settings.Integrations.ApiKey = integrationsUpdate.ApiKey;
                }
            }
        }

        return changes;
    }

    private static string DetermineSection(TenantSettingsUpdateRequest request, IEnumerable<string> changedKeys)
    {
        if (!string.IsNullOrWhiteSpace(request.Section))
        {
            return request.Section.Trim().ToLowerInvariant();
        }

        var keys = changedKeys.ToList();

        if (keys.Count == 0)
        {
            return "general";
        }

        if (keys.All(k => k.StartsWith("preferences.", StringComparison.OrdinalIgnoreCase) || k == "language"))
        {
            return "localization";
        }

        if (keys.All(k => k.StartsWith("theme", StringComparison.OrdinalIgnoreCase) || k == "theme" || k == "preferences.theme"))
        {
            return "theming";
        }

        if (keys.All(k => k.StartsWith("notifications", StringComparison.OrdinalIgnoreCase)))
        {
            return "notifications";
        }

        if (keys.All(k => k.StartsWith("integrations", StringComparison.OrdinalIgnoreCase)))
        {
            return "integrations";
        }

        return "general";
    }

    private static string DescribeSecretChange(string? previous, string? current)
    {
        if (string.IsNullOrEmpty(previous) && string.IsNullOrEmpty(current))
        {
            return "unchanged";
        }

        if (string.IsNullOrEmpty(previous))
        {
            return "set";
        }

        if (string.IsNullOrEmpty(current))
        {
            return "cleared";
        }

        return "updated";
    }
}
