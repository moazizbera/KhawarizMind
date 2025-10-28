using System.Security.Claims;
using DocumentManagementSystem.Common.Authentication;
using DocumentManagementSystem.Common.Data;
using DocumentManagementSystem.Common.Models.Documents;

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

var group = app.MapGroup("/api/ai").RequireAuthorization();

group.MapPost("/query", (ClaimsPrincipal user, AiQueryRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Prompt))
    {
        return Results.BadRequest("Prompt is required.");
    }

    var requestedIds = request.ContextDocumentIds?.ToHashSet() ?? new HashSet<Guid>();
    var documents = requestedIds.Any()
        ? InMemoryStore.Documents.Values.Where(d => requestedIds.Contains(d.Id)).ToList()
        : InMemoryStore.Documents.Values.Take(3).ToList();

    var reply = ComposeReply(user, request.Prompt, documents);

    return Results.Ok(new AiQueryResponse
    {
        Reply = reply,
        ReferencedDocuments = documents.Select(d => new ReferencedDocument(d.Id, d.Name, d.Owner)).ToArray(),
        SuggestedFollowUps =
        [
            "Show me recent uploads",
            "Draft a summary for leadership",
            "What workflows are impacted?"
        ]
    });
});

app.Run();

static string ComposeReply(ClaimsPrincipal user, string prompt, IEnumerable<DocumentItem> documents)
{
    var userName = user.Identity?.Name ?? "team";
    var docSummary = !documents.Any()
        ? "No documents were referenced for this query."
        : "Key documents:" + string.Join(", ", documents.Select(d => $" {d.Name} ({d.Owner})"));

    return $"Hi {userName}, here is a concise take on '{prompt}'. {docSummary}. " +
           "Consider triggering the Invoice Approval workflow if the request touches finance operations.";
}

record AiQueryRequest
{
    public string Prompt { get; init; } = string.Empty;
    public IEnumerable<Guid>? ContextDocumentIds { get; init; }
}

record AiQueryResponse
{
    public string Reply { get; init; } = string.Empty;
    public IEnumerable<ReferencedDocument> ReferencedDocuments { get; init; } = Array.Empty<ReferencedDocument>();
    public IEnumerable<string> SuggestedFollowUps { get; init; } = Array.Empty<string>();
}

record ReferencedDocument(Guid Id, string Name, string Owner);
