using System.Security.Claims;
using DocumentManagementSystem.Common.Authentication;
using DocumentManagementSystem.Common.Data;
using DocumentManagementSystem.Common.Models.Documents;
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCommonJwtAuthentication();

var app = builder.Build();

InMemoryStore.EnsureSeeded();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

var group = app.MapGroup("/api/documents").RequireAuthorization();

group.MapGet("", () =>
{
    var results = InMemoryStore.Documents.Values
        .OrderByDescending(d => d.UploadedAt)
        .ToList();
    return Results.Ok(results);
});

group.MapGet("/{id:guid}", (Guid id) =>
{
    return InMemoryStore.Documents.TryGetValue(id, out var document)
        ? Results.Ok(document)
        : Results.NotFound();
});

group.MapPost("/upload", [Authorize(Policy = AppPolicies.DocumentsWrite)] (ClaimsPrincipal user, UploadDocumentRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest("Document name is required.");
    }

    var id = Guid.NewGuid();
    var owner = user.Identity?.Name ?? "unknown";
    var document = new DocumentItem
    {
        Id = id,
        Name = request.Name.Trim(),
        Owner = owner,
        UploadedAt = DateTimeOffset.UtcNow,
        Tags = request.Tags?.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray() ?? Array.Empty<string>(),
        SizeInKb = request.SizeInKb ?? 0,
        StoragePath = request.StoragePath
    };

    InMemoryStore.Documents[id] = document;

    return Results.Created($"/api/documents/{id}", document);
});

group.MapDelete("/{id:guid}", [Authorize(Policy = AppPolicies.DocumentsWrite)] (Guid id) =>
{
    return InMemoryStore.Documents.TryRemove(id, out _)
        ? Results.NoContent()
        : Results.NotFound();
});

app.Run();

record UploadDocumentRequest
{
    public string Name { get; init; } = string.Empty;
    public string? StoragePath { get; init; }
    public long? SizeInKb { get; init; }
    public IEnumerable<string>? Tags { get; init; }
}
