using DocumentManagementSystem.Common.Configuration;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvironmentVariables();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddOptions<IntegrationSecretsOptions>()
    .Bind(builder.Configuration.GetSection(IntegrationSecretsOptions.SectionName))
    .PostConfigure(options => options.ApplyEnvironmentOverrides(builder.Configuration))
    .Validate(options =>
    {
        try
        {
            options.Validate();
            return true;
        }
        catch
        {
            return false;
        }
    }, "Integration secrets are not configured correctly. Ensure required environment variables are provided.");

builder.Services.AddSingleton(sp => sp.GetRequiredService<IOptions<IntegrationSecretsOptions>>().Value);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapGet("/integration/health", (IntegrationSecretsOptions options) =>
{
    return Results.Ok(new
    {
        SecretsConfigured = !string.IsNullOrWhiteSpace(options.ApiKey) &&
                             !string.IsNullOrWhiteSpace(options.WebhookSecret)
    });
});

app.Run();
