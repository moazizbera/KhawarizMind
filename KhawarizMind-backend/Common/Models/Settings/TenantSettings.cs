namespace DocumentManagementSystem.Common.Models.Settings;

public class TenantSettings
{
    public string Theme { get; set; } = "light";
    public string Language { get; set; } = "en";
    public NotificationPreferences Notifications { get; set; } = new();
    public IntegrationSettings Integrations { get; set; } = new();
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public static TenantSettings CreateDefault() => new()
    {
        Theme = "light",
        Language = "en",
        Notifications = new NotificationPreferences
        {
            EmailAlerts = true,
            ProductUpdates = true,
            PushAlerts = false
        },
        Integrations = new IntegrationSettings
        {
            DocumentWebhookUrl = "https://hooks.example.com/documents",
            AiProviderApiKey = "demo-ai-key",
            StorageAccessKey = "demo-storage-key"
        }
    };
}

public class NotificationPreferences
{
    public bool EmailAlerts { get; set; }
    public bool PushAlerts { get; set; }
    public bool ProductUpdates { get; set; }
}

public class IntegrationSettings
{
    public string DocumentWebhookUrl { get; set; } = string.Empty;
    public string AiProviderApiKey { get; set; } = string.Empty;
    public string StorageAccessKey { get; set; } = string.Empty;
}
