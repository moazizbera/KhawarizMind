using System.IO;
using DocumentManagementSystem.Common.Audit;
using DocumentManagementSystem.Common.Security;
using DocumentManagementSystem.DocumentService.Extensions;
using DocumentManagementSystem.DocumentService.Metadata;
using DocumentManagementSystem.DocumentService.Models;
using DocumentManagementSystem.DocumentService.Services;
using DocumentManagementSystem.DocumentService.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DocumentManagementSystem.DocumentService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentMetadataStore _metadataStore;
    private readonly IDocumentStorage _storage;
    private readonly DocumentCatalogService _catalogService;
    private readonly IAuditStore _auditStore;
    private readonly ILogger<DocumentsController> _logger;

    public DocumentsController(
        IDocumentMetadataStore metadataStore,
        IDocumentStorage storage,
        DocumentCatalogService catalogService,
        IAuditStore auditStore,
        ILogger<DocumentsController> logger)
    {
        _metadataStore = metadataStore;
        _storage = storage;
        _catalogService = catalogService;
        _auditStore = auditStore;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.DocumentReader)]
    public async Task<ActionResult<DocumentListResponse>> GetDocuments([FromQuery] string? search, CancellationToken cancellationToken)
    {
        IReadOnlyCollection<DocumentMetadata> documents;
        if (string.IsNullOrWhiteSpace(search))
        {
            documents = await _metadataStore.ListAsync(cancellationToken).ConfigureAwait(false);
        }
        else
        {
            documents = await _metadataStore.SearchAsync(search, cancellationToken).ConfigureAwait(false);
            await EmitAuditAsync("Document.Search", new Dictionary<string, string>
            {
                ["query"] = search
            }, cancellationToken).ConfigureAwait(false);
        }

        var items = documents
            .Select(metadata => _catalogService.ToItem(metadata, CreateDownloadUrl))
            .ToArray();

        if (string.IsNullOrWhiteSpace(search))
        {
            await EmitAuditAsync("Document.List", null, cancellationToken).ConfigureAwait(false);
        }

        return Ok(new DocumentListResponse(items));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.DocumentReader)]
    public async Task<ActionResult<DocumentItem>> GetDocument(Guid id, CancellationToken cancellationToken)
    {
        var metadata = await _metadataStore.FindAsync(id, cancellationToken).ConfigureAwait(false);
        if (metadata == null)
        {
            return NotFound();
        }

        await EmitAuditAsync("Document.View", new Dictionary<string, string>
        {
            ["documentId"] = id.ToString()
        }, cancellationToken).ConfigureAwait(false);

        return Ok(_catalogService.ToItem(metadata, CreateDownloadUrl));
    }

    [HttpGet("{id:guid}/content")]
    [Authorize(Policy = AuthorizationPolicies.DocumentReader)]
    public async Task<IActionResult> DownloadDocument(Guid id, CancellationToken cancellationToken)
    {
        var metadata = await _metadataStore.FindAsync(id, cancellationToken).ConfigureAwait(false);
        if (metadata == null)
        {
            return NotFound();
        }

        var stream = await _storage.OpenReadAsync(metadata, cancellationToken).ConfigureAwait(false);
        if (stream == null)
        {
            return NotFound();
        }

        await EmitAuditAsync("Document.Download", new Dictionary<string, string>
        {
            ["documentId"] = id.ToString()
        }, cancellationToken).ConfigureAwait(false);

        return File(stream, metadata.MimeType, metadata.FileName);
    }

    [HttpPost("upload")]
    [Authorize(Policy = AuthorizationPolicies.DocumentEditor)]
    [RequestSizeLimit(1024L * 1024L * 100L)]
    public async Task<ActionResult<DocumentUploadResponse>> UploadDocument([FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("A non-empty file must be supplied.");
        }

        var id = Guid.NewGuid();
        var storagePath = await _storage.SaveAsync(id, file, cancellationToken).ConfigureAwait(false);

        var metadata = new DocumentMetadata
        {
            Id = id,
            Name = Path.GetFileNameWithoutExtension(file.FileName),
            FileName = file.FileName,
            MimeType = file.ContentType ?? "application/octet-stream",
            Size = file.Length,
            StoragePath = storagePath,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedBy = User?.Identity?.Name
        };

        await _metadataStore.UpsertAsync(metadata, cancellationToken).ConfigureAwait(false);

        var item = _catalogService.ToItem(metadata, CreateDownloadUrl);
        await EmitAuditAsync("Document.Upload", new Dictionary<string, string>
        {
            ["documentId"] = id.ToString(),
            ["fileName"] = file.FileName
        }, cancellationToken).ConfigureAwait(false);

        return CreatedAtAction(nameof(GetDocument), new { id }, new DocumentUploadResponse(item));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.DocumentEditor)]
    public async Task<IActionResult> DeleteDocument(Guid id, CancellationToken cancellationToken)
    {
        var metadata = await _metadataStore.FindAsync(id, cancellationToken).ConfigureAwait(false);
        if (metadata == null)
        {
            return NotFound();
        }

        await _storage.DeleteAsync(metadata, cancellationToken).ConfigureAwait(false);
        await _metadataStore.DeleteAsync(id, cancellationToken).ConfigureAwait(false);
        await EmitAuditAsync("Document.Delete", new Dictionary<string, string>
        {
            ["documentId"] = id.ToString(),
            ["fileName"] = metadata.FileName
        }, cancellationToken).ConfigureAwait(false);

        return NoContent();
    }

    private string? CreateDownloadUrl(Guid id)
    {
        return Url.ActionLink(nameof(DownloadDocument), values: new { id });
    }

    private async Task EmitAuditAsync(string action, IReadOnlyDictionary<string, string>? metadata, CancellationToken cancellationToken)
    {
        try
        {
            var actor = User?.Identity?.Name ?? "anonymous";
            await _auditStore.WriteAsync(new AuditEntry(
                DateTimeOffset.UtcNow,
                actor,
                action,
                ResourceType: "Document",
                ResourceId: metadata != null && metadata.TryGetValue("documentId", out var id)
                    ? id
                    : string.Empty,
                metadata),
                cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to emit audit entry for {Action}", action);
        }
    }
}
