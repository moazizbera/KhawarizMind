using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace DocumentManagementSystem.TenantManagementService.Authentication;

public sealed class DebugAuthenticationHandler : AuthenticationHandler<DebugAuthenticationOptions>
{
    public DebugAuthenticationHandler(
        IOptionsMonitor<DebugAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISystemClock clock)
        : base(options, logger, encoder, clock)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var hasUserHeader = Request.Headers.TryGetValue(DebugAuthenticationDefaults.UserHeaderName, out var userHeader);
        var hasRolesHeader = Request.Headers.TryGetValue(DebugAuthenticationDefaults.RolesHeaderName, out var rolesHeader);

        if (!hasUserHeader && !hasRolesHeader)
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var identity = new ClaimsIdentity(DebugAuthenticationDefaults.AuthenticationScheme);
        var userName = hasUserHeader && !string.IsNullOrWhiteSpace(userHeader.ToString())
            ? userHeader.ToString()
            : "system";

        identity.AddClaim(new Claim(ClaimTypes.Name, userName));

        if (hasRolesHeader)
        {
            var roles = rolesHeader.ToString()
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            foreach (var role in roles)
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, role));
            }
        }

        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, DebugAuthenticationDefaults.AuthenticationScheme);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
