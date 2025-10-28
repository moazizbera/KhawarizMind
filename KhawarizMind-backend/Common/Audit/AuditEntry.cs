namespace DocumentManagementSystem.Common.Audit;

/// <summary>
/// Represents an immutable audit log entry shared across services.
/// </summary>
/// <param name="Timestamp">The UTC timestamp associated with the action.</param>
/// <param name="Actor">The logical actor that initiated the action.</param>
/// <param name="Action">The canonical action identifier (for example <c>Document.Upload</c>).</param>
/// <param name="ResourceType">The type of resource affected by the action.</param>
/// <param name="ResourceId">The identifier of the affected resource.</param>
/// <param name="Metadata">Additional metadata that provides context for the action.</param>
public sealed record AuditEntry(
    DateTimeOffset Timestamp,
    string Actor,
    string Action,
    string ResourceType,
    string ResourceId,
    IReadOnlyDictionary<string, string>? Metadata = null
);
