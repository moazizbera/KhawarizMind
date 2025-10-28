namespace DocumentManagementSystem.DocumentService.Models;

public sealed record DocumentListResponse(IReadOnlyCollection<DocumentItem> Items);
