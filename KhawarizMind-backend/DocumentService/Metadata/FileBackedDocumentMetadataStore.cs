using System.Text.Json;
using DocumentManagementSystem.DocumentService.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DocumentManagementSystem.DocumentService.Metadata;

public sealed class FileBackedDocumentMetadataStore : IDocumentMetadataStore, IDisposable
{
    private readonly ILogger<FileBackedDocumentMetadataStore> _logger;
    private readonly string _filePath;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly Dictionary<Guid, DocumentMetadata> _documents = new();
    private bool _disposed;

    public FileBackedDocumentMetadataStore(
        IOptions<DocumentMetadataStoreOptions> options,
        IHostEnvironment environment,
        ILogger<FileBackedDocumentMetadataStore> logger)
    {
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(environment);
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        var configuredPath = options.Value.FilePath;
        if (string.IsNullOrWhiteSpace(configuredPath))
        {
            configuredPath = Path.Combine("Storage", "documents.json");
        }

        _filePath = Path.IsPathRooted(configuredPath)
            ? configuredPath
            : Path.Combine(environment.ContentRootPath, configuredPath);

        Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
        LoadExistingEntries();
    }

    public async Task<IReadOnlyCollection<DocumentMetadata>> ListAsync(CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            return _documents.Values
                .OrderByDescending(d => d.CreatedAt)
                .ToArray();
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<IReadOnlyCollection<DocumentMetadata>> SearchAsync(string query, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var comparison = StringComparison.OrdinalIgnoreCase;
            return _documents.Values
                .Where(d =>
                    d.Name.Contains(query, comparison) ||
                    d.FileName.Contains(query, comparison))
                .OrderByDescending(d => d.CreatedAt)
                .ToArray();
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<DocumentMetadata?> FindAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            return _documents.TryGetValue(id, out var metadata) ? metadata : null;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task UpsertAsync(DocumentMetadata metadata, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(metadata);
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            _documents[metadata.Id] = metadata;
            await PersistUnsafeAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (!_documents.Remove(id))
            {
                return false;
            }

            await PersistUnsafeAsync(cancellationToken).ConfigureAwait(false);
            return true;
        }
        finally
        {
            _gate.Release();
        }
    }

    private void LoadExistingEntries()
    {
        if (!File.Exists(_filePath))
        {
            return;
        }

        try
        {
            var json = File.ReadAllText(_filePath);
            if (string.IsNullOrWhiteSpace(json))
            {
                return;
            }

            var documents = JsonSerializer.Deserialize<List<DocumentMetadata>>(json);
            if (documents == null)
            {
                return;
            }

            foreach (var document in documents)
            {
                if (!_documents.ContainsKey(document.Id))
                {
                    _documents.Add(document.Id, document);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read persisted document metadata from {File}", _filePath);
        }
    }

    private async Task PersistUnsafeAsync(CancellationToken cancellationToken)
    {
        try
        {
            var payload = JsonSerializer.Serialize(_documents.Values, new JsonSerializerOptions
            {
                WriteIndented = true
            });
            await File.WriteAllTextAsync(_filePath, payload, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist document metadata to {File}", _filePath);
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _gate.Dispose();
        _disposed = true;
    }
}
