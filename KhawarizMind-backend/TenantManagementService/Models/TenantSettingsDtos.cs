using System.Text.Json.Serialization;

namespace DocumentManagementSystem.TenantManagementService.Models;

public sealed class TenantSettingsResponse
{
    public Guid Id { get; set; }
    public TenantPreferences Preferences { get; set; } = new();
    public NotificationPreferences Notifications { get; set; } = new();
    public IntegrationSettings Integrations { get; set; } = new();
    public TenantSettingsMetadata Metadata { get; set; } = new();

    public string Language => Preferences.Language;
    public string Theme => Preferences.Theme;

    public static TenantSettingsResponse FromModel(TenantSettings model)
    {
        return new TenantSettingsResponse
        {
            Id = model.Id,
            Preferences = model.Preferences.Clone(),
            Notifications = model.Notifications.Clone(),
            Integrations = model.Integrations.Clone(),
            Metadata = model.Metadata.Clone(),
        };
    }
}

public sealed class TenantSettingsUpdateRequest
{
    public string? Section { get; set; }
    public TenantPreferences? Preferences { get; set; }
    public string? Language { get; set; }
    public string? Theme { get; set; }
    public NotificationPreferencesUpdate? Notifications { get; set; }
    public IntegrationSettingsUpdate? Integrations { get; set; }
}

public sealed class NotificationPreferencesUpdate
{
    [JsonIgnore]
    public bool EmailSpecified { get; private set; }

    private bool? _email;
    public bool? Email
    {
        get => _email;
        set
        {
            _email = value;
            EmailSpecified = true;
        }
    }

    [JsonIgnore]
    public bool SmsSpecified { get; private set; }

    private bool? _sms;
    public bool? Sms
    {
        get => _sms;
        set
        {
            _sms = value;
            SmsSpecified = true;
        }
    }

    [JsonIgnore]
    public bool PushSpecified { get; private set; }

    private bool? _push;
    public bool? Push
    {
        get => _push;
        set
        {
            _push = value;
            PushSpecified = true;
        }
    }
}

public sealed class IntegrationSettingsUpdate
{
    [JsonIgnore]
    public bool SlackWebhookSpecified { get; private set; }

    private string? _slackWebhook;
    public string? SlackWebhook
    {
        get => _slackWebhook;
        set
        {
            _slackWebhook = value;
            SlackWebhookSpecified = true;
        }
    }

    [JsonIgnore]
    public bool TeamsWebhookSpecified { get; private set; }

    private string? _teamsWebhook;
    public string? TeamsWebhook
    {
        get => _teamsWebhook;
        set
        {
            _teamsWebhook = value;
            TeamsWebhookSpecified = true;
        }
    }

    [JsonIgnore]
    public bool ApiKeySpecified { get; private set; }

    private string? _apiKey;
    public string? ApiKey
    {
        get => _apiKey;
        set
        {
            _apiKey = value;
            ApiKeySpecified = true;
        }
    }
}
