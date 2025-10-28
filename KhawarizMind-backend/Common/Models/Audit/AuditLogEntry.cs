namespace DocumentManagementSystem.Common.Models.Audit;

public class AuditLogEntry
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Actor { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; }
}
