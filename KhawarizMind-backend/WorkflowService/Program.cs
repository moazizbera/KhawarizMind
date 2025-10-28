using DocumentManagementSystem.Common;
using DocumentManagementSystem.Common.Workflows;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddSingleton<SharedAppStore>();

var app = builder.Build();

InMemoryStore.EnsureSeeded();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/api/workflows", (SharedAppStore store, HttpContext context) =>
{
    if (!RoleGuard.HasAllRoles(context, RoleConstants.WorkflowViewer))
    {
        return RoleGuard.Forbid(context, RoleConstants.WorkflowViewer);
    }

    var workflows = store.GetWorkflows();
    return Results.Ok(workflows);
});

app.MapGet("/api/workflows/{id:guid}", (Guid id, SharedAppStore store, HttpContext context) =>
{
    if (!RoleGuard.HasAllRoles(context, RoleConstants.WorkflowViewer))
    {
        return RoleGuard.Forbid(context, RoleConstants.WorkflowViewer);
    }

    var workflow = store.GetWorkflow(id);
    return workflow is null ? Results.NotFound() : Results.Ok(workflow);
});

app.MapPost("/api/workflows", (WorkflowUpsertRequest request, SharedAppStore store, HttpContext context) =>
{
    if (request is null)
    {
        return Results.BadRequest(new { message = "Request payload is required." });
    }

    if (!RoleGuard.HasAllRoles(context, RoleConstants.WorkflowManager))
    {
        return RoleGuard.Forbid(context, RoleConstants.WorkflowManager);
    }

    var now = DateTime.UtcNow;
    var nodes = WorkflowHelpers.NormalizeNodes(request.Nodes);
    var workflow = new WorkflowDefinition
    {
        Id = Guid.NewGuid(),
        Name = string.IsNullOrWhiteSpace(request.Name) ? "Untitled workflow" : request.Name.Trim(),
        Description = request.Description?.Trim() ?? string.Empty,
        Owner = string.IsNullOrWhiteSpace(request.Owner) ? "KhawarizMind" : request.Owner.Trim(),
        Status = WorkflowHelpers.NormalizeStatus(request.Status),
        SlaMinutes = request.SlaMinutes,
        CreatedAt = now,
        UpdatedAt = now,
        DueAt = request.DueAt ?? WorkflowHelpers.CalculateDueAt(now, request.SlaMinutes),
        Nodes = nodes,
        Edges = WorkflowHelpers.NormalizeEdges(request.Edges),
        Stages = WorkflowHelpers.NormalizeStages(request.Stages, nodes),
        Activities = WorkflowHelpers.NormalizeActivities(request.Activities, nodes),
    };

    var saved = store.SaveWorkflow(workflow);
    return Results.Created($"/api/workflows/{saved.Id}", saved);
});

app.MapPost("/api/workflows/{id:guid}/activate", (Guid id, SharedAppStore store, HttpContext context) =>
{
    if (!RoleGuard.HasAllRoles(context, RoleConstants.WorkflowAdmin))
    {
        return RoleGuard.Forbid(context, RoleConstants.WorkflowAdmin);
    }

    var workflow = store.GetWorkflow(id);
    if (workflow is null)
    {
        return Results.NotFound();
    }

    var now = DateTime.UtcNow;
    workflow.Status = WorkflowHelpers.StatusActive;
    workflow.UpdatedAt = now;
    workflow.DueAt ??= WorkflowHelpers.CalculateDueAt(now, workflow.SlaMinutes);
    workflow.Activities ??= new List<WorkflowActivity>();
    workflow.Activities.Add(new WorkflowActivity
    {
        Id = $"activation-{now.Ticks}",
        Title = "Workflow activated",
        Description = "Activated via WorkflowService mock API.",
        Status = WorkflowHelpers.StatusActive,
        Timestamp = now,
        Assignee = context.Request.Headers.TryGetValue("X-Activated-By", out var activatedBy)
            ? activatedBy.ToString()
            : "system",
    });

    var saved = store.SaveWorkflow(workflow);
    return Results.Ok(saved);
});

app.MapGet("/", () => Results.Ok(new
{
    service = "WorkflowService",
    status = "ok",
    limitations = WorkflowLimitations,
}));

app.Run();

internal sealed record WorkflowUpsertRequest
{
    public string? Name { get; init; }
    public string? Description { get; init; }
    public string? Owner { get; init; }
    public string? Status { get; init; }
    public int? SlaMinutes { get; init; }
    public DateTime? DueAt { get; init; }
    public List<WorkflowNode>? Nodes { get; init; }
    public List<WorkflowEdge>? Edges { get; init; }
    public List<WorkflowStage>? Stages { get; init; }
    public List<WorkflowActivity>? Activities { get; init; }
}

internal static class WorkflowLimitations
{
    public static readonly IReadOnlyList<string> Value = new[]
    {
        "Workflows are stored in-memory using a shared demo store.",
        "Persistence resets when the service restarts.",
    };

    public static implicit operator IReadOnlyList<string>(WorkflowLimitations _) => Value;
}
