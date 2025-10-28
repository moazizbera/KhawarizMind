namespace DocumentManagementSystem.TenantManagementService.Models;

public sealed class TenantSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public TenantPreferences Preferences { get; set; } = new();

    public NotificationPreferences Notifications { get; set; } = new();

    public IntegrationSettings Integrations { get; set; } = new();

    public TenantSettingsMetadata Metadata { get; set; } = new();

    public string Language
    {
        get => Preferences.Language;
        set => Preferences.Language = value;
    }

    public string Theme
    {
        get => Preferences.Theme;
        set => Preferences.Theme = value;
    }

    public TenantSettings Clone()
    {
        return new TenantSettings
        {
            Id = Id,
            Preferences = Preferences.Clone(),
            Notifications = Notifications.Clone(),
            Integrations = Integrations.Clone(),
            Metadata = Metadata.Clone(),
        };
    }

    public static TenantSettings CreateDefault()
    {
        return new TenantSettings
        {
            Metadata = new TenantSettingsMetadata
            {
                UpdatedAt = DateTimeOffset.UtcNow,
                UpdatedBy = "system",
            },
        };
    }
}

public sealed class TenantPreferences
{
    public string Language { get; set; } = "en";

    public string Theme { get; set; } = "light";

    public TenantPreferences Clone()
    {
        return new TenantPreferences
        {
            Language = Language,
            Theme = Theme,
        };
    }
}

public sealed class NotificationPreferences
{
    public bool Email { get; set; }
    public bool Sms { get; set; }
    public bool Push { get; set; }

    public NotificationPreferences Clone()
    {
        return new NotificationPreferences
        {
            Email = Email,
            Sms = Sms,
            Push = Push,
        };
    }

}

public sealed class IntegrationSettings
{
    public string? SlackWebhook { get; set; }
    public string? TeamsWebhook { get; set; }
    public string? ApiKey { get; set; }

    public IntegrationSettings Clone()
    {
        return new IntegrationSettings
        {
            SlackWebhook = SlackWebhook,
            TeamsWebhook = TeamsWebhook,
            ApiKey = ApiKey,
        };
    }

}

public sealed class TenantSettingsMetadata
{
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string UpdatedBy { get; set; } = "system";

    public TenantSettingsMetadata Clone()
    {
        return new TenantSettingsMetadata
        {
            UpdatedAt = UpdatedAt,
            UpdatedBy = UpdatedBy,
        };
    }
}
