using DocumentManagementSystem.DocumentService.Models;

namespace DocumentManagementSystem.DocumentService.Metadata;

public interface IDocumentMetadataStore
{
    Task<IReadOnlyCollection<DocumentMetadata>> ListAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<DocumentMetadata>> SearchAsync(string query, CancellationToken cancellationToken = default);
    Task<DocumentMetadata?> FindAsync(Guid id, CancellationToken cancellationToken = default);
    Task UpsertAsync(DocumentMetadata metadata, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
