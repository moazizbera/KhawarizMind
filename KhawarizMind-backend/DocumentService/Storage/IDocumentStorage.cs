using DocumentManagementSystem.DocumentService.Models;
using Microsoft.AspNetCore.Http;

namespace DocumentManagementSystem.DocumentService.Storage;

public interface IDocumentStorage
{
    Task<string> SaveAsync(Guid id, IFormFile file, CancellationToken cancellationToken = default);
    Task<Stream?> OpenReadAsync(DocumentMetadata metadata, CancellationToken cancellationToken = default);
    Task DeleteAsync(DocumentMetadata metadata, CancellationToken cancellationToken = default);
}
