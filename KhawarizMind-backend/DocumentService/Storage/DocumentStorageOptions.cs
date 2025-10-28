namespace DocumentManagementSystem.DocumentService.Storage;

public class DocumentStorageOptions
{
    public string Provider { get; set; } = "InMemory";

    /// <summary>
    /// Root directory for providers that rely on the file system (e.g. <c>Local</c> provider).
    /// </summary>
    public string RootPath { get; set; } = Path.Combine("Storage", "Documents");
}
