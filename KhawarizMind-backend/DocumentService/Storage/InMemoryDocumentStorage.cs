using System.Collections.Concurrent;
using DocumentManagementSystem.DocumentService.Models;
using Microsoft.AspNetCore.Http;

namespace DocumentManagementSystem.DocumentService.Storage;

public sealed class InMemoryDocumentStorage : IDocumentStorage
{
    private readonly ConcurrentDictionary<Guid, byte[]> _documents = new();

    public async Task<string> SaveAsync(Guid id, IFormFile file, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(file);
        await using var stream = new MemoryStream();
        await file.CopyToAsync(stream, cancellationToken).ConfigureAwait(false);
        _documents[id] = stream.ToArray();
        return id.ToString();
    }

    public Task<Stream?> OpenReadAsync(DocumentMetadata metadata, CancellationToken cancellationToken = default)
    {
        if (_documents.TryGetValue(metadata.Id, out var buffer))
        {
            return Task.FromResult<Stream?>(new MemoryStream(buffer, writable: false));
        }

        return Task.FromResult<Stream?>(null);
    }

    public Task DeleteAsync(DocumentMetadata metadata, CancellationToken cancellationToken = default)
    {
        _documents.TryRemove(metadata.Id, out _);
        return Task.CompletedTask;
    }
}
