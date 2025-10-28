namespace DocumentManagementSystem.DocumentService.Metadata;

public class DocumentMetadataStoreOptions
{
    public string FilePath { get; set; } = Path.Combine("Storage", "documents.json");
}
