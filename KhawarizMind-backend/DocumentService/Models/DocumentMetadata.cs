namespace DocumentManagementSystem.DocumentService.Models;

public sealed record DocumentMetadata
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string FileName { get; init; } = string.Empty;
    public string MimeType { get; init; } = "application/octet-stream";
    public long Size { get; init; }
    public string StoragePath { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public string? CreatedBy { get; init; }
}
