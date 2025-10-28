using DocumentManagementSystem.DocumentService.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DocumentManagementSystem.DocumentService.Storage;

public sealed class LocalDiskDocumentStorage : IDocumentStorage
{
    private readonly ILogger<LocalDiskDocumentStorage> _logger;
    private readonly string _rootPath;

    public LocalDiskDocumentStorage(
        IOptions<DocumentStorageOptions> options,
        IHostEnvironment environment,
        ILogger<LocalDiskDocumentStorage> logger)
    {
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(environment);
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        var configuredRoot = options.Value.RootPath;
        if (string.IsNullOrWhiteSpace(configuredRoot))
        {
            configuredRoot = Path.Combine("Storage", "Documents");
        }

        _rootPath = Path.IsPathRooted(configuredRoot)
            ? configuredRoot
            : Path.Combine(environment.ContentRootPath, configuredRoot);

        Directory.CreateDirectory(_rootPath);
    }

    public async Task<string> SaveAsync(Guid id, IFormFile file, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(file);

        var extension = Path.GetExtension(file.FileName);
        var fileName = string.Concat(id.ToString("N"), extension);
        var destination = Path.Combine(_rootPath, fileName);

        await using var targetStream = File.Create(destination);
        await file.CopyToAsync(targetStream, cancellationToken).ConfigureAwait(false);

        return fileName;
    }

    public Task<Stream?> OpenReadAsync(DocumentMetadata metadata, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_rootPath, metadata.StoragePath);
        if (!File.Exists(fullPath))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream stream;
        try
        {
            stream = File.OpenRead(fullPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to open document content at {Path}", fullPath);
            return Task.FromResult<Stream?>(null);
        }

        return Task.FromResult<Stream?>(stream);
    }

    public Task DeleteAsync(DocumentMetadata metadata, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_rootPath, metadata.StoragePath);
        if (File.Exists(fullPath))
        {
            try
            {
                File.Delete(fullPath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete document content at {Path}", fullPath);
            }
        }

        return Task.CompletedTask;
    }
}
