namespace DocumentManagementSystem.TenantManagementService.Models;

public sealed class AuditLogEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Section { get; set; } = "general";

    public string Action { get; set; } = string.Empty;

    public string Actor { get; set; } = "system";

    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;

    public IDictionary<string, string> Details { get; set; } = new Dictionary<string, string>();

    public static AuditLogEntry FromChanges(
        string section,
        string actor,
        IDictionary<string, string> changes)
    {
        return new AuditLogEntry
        {
            Section = section,
            Actor = actor,
            Action = $"Updated {section} settings",
            Timestamp = DateTimeOffset.UtcNow,
            Details = new Dictionary<string, string>(changes),
        };
    }
}
