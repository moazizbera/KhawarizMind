namespace DocumentManagementSystem.TenantManagementService.Authentication;

public static class DebugAuthenticationDefaults
{
    public const string AuthenticationScheme = "Debug";

    public const string UserHeaderName = "X-Debug-User";
    public const string RolesHeaderName = "X-Debug-Roles";
}
