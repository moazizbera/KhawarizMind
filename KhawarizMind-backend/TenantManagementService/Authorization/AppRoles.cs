namespace DocumentManagementSystem.TenantManagementService.Authorization;

public static class AppRoles
{
    public const string SettingsAdmin = "SettingsAdmin";
    public const string SettingsReader = "SettingsReader";
    public const string SecurityAdmin = "SecurityAdmin";

    public static readonly string[] AllRoles =
    {
        SettingsAdmin,
        SettingsReader,
        SecurityAdmin,
    };
}
