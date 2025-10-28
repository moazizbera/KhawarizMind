using DocumentManagementSystem.DocumentService.Models;

namespace DocumentManagementSystem.DocumentService.Services;

public sealed class DocumentCatalogService
{
    public DocumentItem ToItem(DocumentMetadata metadata, Func<Guid, string?> urlFactory)
    {
        var downloadUrl = urlFactory(metadata.Id);
        return new DocumentItem
        {
            Id = metadata.Id,
            Name = metadata.Name,
            FileName = metadata.FileName,
            MimeType = metadata.MimeType,
            Type = ResolveType(metadata),
            Size = metadata.Size,
            CreatedAt = metadata.CreatedAt,
            CreatedBy = metadata.CreatedBy,
            DownloadUrl = downloadUrl,
            Url = downloadUrl,
            PreviewUrl = downloadUrl
        };
    }

    private static string ResolveType(DocumentMetadata metadata)
    {
        if (!string.IsNullOrWhiteSpace(metadata.MimeType))
        {
            var slashIndex = metadata.MimeType.IndexOf('/');
            if (slashIndex >= 0 && slashIndex < metadata.MimeType.Length - 1)
            {
                return metadata.MimeType[(slashIndex + 1)..];
            }
        }

        var extension = Path.GetExtension(metadata.FileName);
        return string.IsNullOrWhiteSpace(extension) ? "" : extension.TrimStart('.');
    }
}
