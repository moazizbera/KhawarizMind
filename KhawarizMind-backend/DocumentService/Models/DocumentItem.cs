using System.Text.Json.Serialization;

namespace DocumentManagementSystem.DocumentService.Models;

/// <summary>
/// Response contract shared with the frontend client to represent a document.
/// </summary>
public sealed record DocumentItem
{
    public Guid Id { get; init; }

    /// <summary>
    /// User friendly display name of the document.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Original file name that was uploaded.
    /// </summary>
    public string FileName { get; init; } = string.Empty;

    /// <summary>
    /// The MIME type associated with the stored file.
    /// </summary>
    public string MimeType { get; init; } = string.Empty;

    /// <summary>
    /// Convenience shorthand used by the UI (usually the file extension).
    /// </summary>
    public string Type { get; init; } = string.Empty;

    /// <summary>
    /// The size of the file in bytes.
    /// </summary>
    public long Size { get; init; }

    public DateTimeOffset CreatedAt { get; init; }

    public string? CreatedBy { get; init; }

    /// <summary>
    /// Absolute URL that can be used to download the document.
    /// </summary>
    public string? DownloadUrl { get; init; }

    /// <summary>
    /// Alias maintained for compatibility with the legacy frontend API shape.
    /// </summary>
    [JsonPropertyName("url")]
    public string? Url { get; init; }

    /// <summary>
    /// Optional preview URL. For now this matches <see cref="DownloadUrl"/> but is a separate field
    /// to align with the API client contract.
    /// </summary>
    public string? PreviewUrl { get; init; }
}
