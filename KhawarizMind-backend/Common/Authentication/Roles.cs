using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace DocumentManagementSystem.Common.Authentication;

public static class RoleClaims
{
    public const string ClaimType = ClaimTypes.Role;
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string User = "User";
}

public static class AuthorizationPolicies
{
    public const string RequireTenantUser = "RequireTenantUser";
    public const string RequireAdministrator = "RequireAdministrator";

    public static void Configure(AuthorizationOptions options)
    {
        options.AddPolicy(RequireTenantUser, policy =>
            policy.RequireClaim(RoleClaims.ClaimType, Roles.Admin, Roles.Manager, Roles.User));

        options.AddPolicy(RequireAdministrator, policy =>
            policy.RequireClaim(RoleClaims.ClaimType, Roles.Admin));
    }
}
