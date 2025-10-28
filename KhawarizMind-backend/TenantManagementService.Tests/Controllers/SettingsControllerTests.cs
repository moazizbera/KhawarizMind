using System.Collections.Generic;
using System.Net;
using System.Net.Http.Json;
using DocumentManagementSystem.TenantManagementService.Authentication;
using DocumentManagementSystem.TenantManagementService.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace TenantManagementService.Tests.Controllers;

public class SettingsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public SettingsControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) => { });
        });
    }

    [Fact]
    public async Task GetSettings_Unauthorized_WhenNoPrincipal()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/settings");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetSettings_ReturnsDefaults_ForAuthorizedUser()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(DebugAuthenticationDefaults.UserHeaderName, "alice");
        client.DefaultRequestHeaders.Add(DebugAuthenticationDefaults.RolesHeaderName, "SettingsAdmin");

        var response = await client.GetAsync("/api/settings");
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<TenantSettingsResponse>();
        Assert.NotNull(payload);
        Assert.Equal("en", payload!.Preferences.Language);
        Assert.Equal("light", payload.Preferences.Theme);
    }

    [Fact]
    public async Task UpdateSettings_RecordsAuditAndPersists()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(DebugAuthenticationDefaults.UserHeaderName, "carol");
        client.DefaultRequestHeaders.Add(DebugAuthenticationDefaults.RolesHeaderName, "SettingsAdmin");

        var update = new TenantSettingsUpdateRequest
        {
            Theme = "dark",
            Notifications = new NotificationPreferencesUpdate { Email = true, Sms = false, Push = true },
            Section = "theming",
        };

        var response = await client.PutAsJsonAsync("/api/settings", update);
        response.EnsureSuccessStatusCode();

        var updated = await response.Content.ReadFromJsonAsync<TenantSettingsResponse>();
        Assert.NotNull(updated);
        Assert.Equal("dark", updated!.Theme);
        Assert.True(updated.Notifications.Email);

        var auditClient = _factory.CreateClient();
        auditClient.DefaultRequestHeaders.Add(DebugAuthenticationDefaults.UserHeaderName, "auditor");
        auditClient.DefaultRequestHeaders.Add(DebugAuthenticationDefaults.RolesHeaderName, "SecurityAdmin");

        var auditResponse = await auditClient.GetAsync("/api/settings/audit");
        auditResponse.EnsureSuccessStatusCode();

        var auditEntries = await auditResponse.Content.ReadFromJsonAsync<List<AuditLogEntry>>();
        Assert.NotNull(auditEntries);
        Assert.Contains(auditEntries!, entry => entry.Actor == "carol" && entry.Section == "theming");
    }

    [Fact]
    public async Task UpdateSettings_RequiresAdminRole()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(DebugAuthenticationDefaults.UserHeaderName, "bob");
        client.DefaultRequestHeaders.Add(DebugAuthenticationDefaults.RolesHeaderName, "SettingsReader");

        var response = await client.PutAsJsonAsync("/api/settings", new { theme = "dark" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
