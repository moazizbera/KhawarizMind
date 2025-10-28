using Microsoft.Extensions.Configuration;

namespace DocumentManagementSystem.Common.Configuration;

public class IntegrationSecretsOptions
{
    public const string SectionName = "IntegrationSecrets";

    public string? ApiKey { get; set; }
    public string? WebhookSecret { get; set; }

    public void ApplyEnvironmentOverrides(IConfiguration configuration)
    {
        ApiKey = !string.IsNullOrWhiteSpace(configuration["INTEGRATION_API_KEY"]) ?
            configuration["INTEGRATION_API_KEY"] : ApiKey;
        WebhookSecret = !string.IsNullOrWhiteSpace(configuration["INTEGRATION_WEBHOOK_SECRET"]) ?
            configuration["INTEGRATION_WEBHOOK_SECRET"] : WebhookSecret;
    }

    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(ApiKey))
        {
            throw new InvalidOperationException("Integration API key is not configured. Set INTEGRATION_API_KEY or configure IntegrationSecrets:ApiKey.");
        }

        if (string.IsNullOrWhiteSpace(WebhookSecret))
        {
            throw new InvalidOperationException("Integration webhook secret is not configured. Set INTEGRATION_WEBHOOK_SECRET or configure IntegrationSecrets:WebhookSecret.");
        }
    }
}
