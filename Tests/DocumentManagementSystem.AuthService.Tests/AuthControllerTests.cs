using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using DocumentManagementSystem.AuthService.Models.Responses;
using DocumentManagementSystem.Common.Authentication;
using DocumentManagementSystem.AuthService.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using FluentAssertions;
using Xunit;

namespace DocumentManagementSystem.AuthService.Tests;

public class AuthControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AuthControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, configBuilder) =>
            {
                var settings = new Dictionary<string, string>
                {
                    [$"{JwtOptions.SectionName}:{nameof(JwtOptions.SigningKey)}"] = new string('A', 64),
                    [$"{JwtOptions.SectionName}:{nameof(JwtOptions.Issuer)}"] = "TestIssuer",
                    [$"{JwtOptions.SectionName}:{nameof(JwtOptions.Audience)}"] = "TestAudience",
                    [$"{JwtOptions.SectionName}:{nameof(JwtOptions.AccessTokenMinutes)}"] = "5",
                    [$"{JwtOptions.SectionName}:{nameof(JwtOptions.RefreshTokenMinutes)}"] = "60"
                };
                configBuilder.AddInMemoryCollection(settings!);
            });

            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor is not null)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<AppDbContext>(options =>
                {
                    options.UseInMemoryDatabase(Guid.NewGuid().ToString());
                });
            });
        });
    }

    [Fact]
    public async Task Register_ShouldCreateUserAndReturnTokens()
    {
        var client = _factory.CreateClient();
        var request = new
        {
            username = "alice",
            email = "alice@example.com",
            password = "Password123!",
            role = Roles.Manager
        };

        var response = await client.PostAsJsonAsync("/api/auth/register", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<AuthTokensResponse>();
        payload.Should().NotBeNull();
        payload!.AccessToken.Should().NotBeNullOrWhiteSpace();
        payload.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Login_ShouldReturnTokens_WhenCredentialsAreValid()
    {
        var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "bob",
            email = "bob@example.com",
            password = "Password123!"
        });

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            usernameOrEmail = "bob",
            password = "Password123!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<AuthTokensResponse>();
        payload.Should().NotBeNull();
        payload!.AccessToken.Should().NotBeNullOrWhiteSpace();
        payload.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Login_ShouldRejectInvalidPassword()
    {
        var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "carol",
            email = "carol@example.com",
            password = "CorrectHorseBatteryStaple1!"
        });

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            usernameOrEmail = "carol",
            password = "wrong-password"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_ShouldRotateRefreshTokens()
    {
        var client = _factory.CreateClient();
        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "dave",
            email = "dave@example.com",
            password = "Password123!"
        });
        var registerPayload = await registerResponse.Content.ReadFromJsonAsync<AuthTokensResponse>();
        registerPayload.Should().NotBeNull();

        var refreshResponse = await client.PostAsJsonAsync("/api/auth/refresh", new
        {
            refreshToken = registerPayload!.RefreshToken
        });

        refreshResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var refreshed = await refreshResponse.Content.ReadFromJsonAsync<AuthTokensResponse>();
        refreshed.Should().NotBeNull();
        refreshed!.RefreshToken.Should().NotBe(registerPayload.RefreshToken);
    }

    [Fact]
    public async Task Profile_ShouldReturnUserInformation_WhenAuthorized()
    {
        var client = _factory.CreateClient();
        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "eve",
            email = "eve@example.com",
            password = "Password123!"
        });
        var tokens = await registerResponse.Content.ReadFromJsonAsync<AuthTokensResponse>();
        tokens.Should().NotBeNull();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        var profileResponse = await client.GetAsync("/api/auth/profile");

        profileResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var profile = await profileResponse.Content.ReadFromJsonAsync<UserProfileResponse>();
        profile.Should().NotBeNull();
        profile!.Email.Should().Be("eve@example.com");
    }
}
