using System.Security.Claims;
using System.Text.Encodings.Web;
using DocumentManagementSystem.Common.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace DocumentManagementSystem.DocumentService.Authentication;

/// <summary>
/// Minimal authentication handler that maps bearer tokens to well known roles. This keeps the sample
/// service self-contained while still exercising the authorization pipeline.
/// </summary>
public sealed class SimpleTokenAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "SimpleToken";

    public SimpleTokenAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISystemClock clock)
        : base(options, logger, encoder, clock)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var headerValues))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var header = headerValues.ToString();
        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var token = header["Bearer ".Length..].Trim();
        if (string.IsNullOrEmpty(token))
        {
            return Task.FromResult(AuthenticateResult.Fail("Missing bearer token"));
        }

        var claims = new List<Claim>();
        var roles = new List<string>();

        switch (token.ToLowerInvariant())
        {
            case "editor":
            case "documenteditor":
                roles.Add(RoleNames.DocumentEditor);
                roles.Add(RoleNames.DocumentReader);
                claims.Add(new Claim(ClaimTypes.Name, "document-editor"));
                break;
            case "reader":
            case "documentreader":
                roles.Add(RoleNames.DocumentReader);
                claims.Add(new Claim(ClaimTypes.Name, "document-reader"));
                break;
            default:
                return Task.FromResult(AuthenticateResult.Fail("Unknown token"));
        }

        foreach (var role in roles.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
