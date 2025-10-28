namespace DocumentManagementSystem.Common.Models.Documents;

public class DocumentItem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public DateTimeOffset UploadedAt { get; set; }
    public string[] Tags { get; set; } = Array.Empty<string>();
    public long SizeInKb { get; set; }
    public string? StoragePath { get; set; }
}
