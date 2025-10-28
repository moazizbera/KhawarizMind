using System.Security.Claims;
using DocumentManagementSystem.Common.Authentication;
using DocumentManagementSystem.Common.Data;
using DocumentManagementSystem.Common.Models.Workflows;
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCommonJwtAuthentication();

var dataDirectory = Path.Combine(AppContext.BaseDirectory, "App_Data");
Directory.CreateDirectory(dataDirectory);
builder.Services.AddSingleton(new WorkflowRepository(Path.Combine(dataDirectory, "workflows.json")));

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

var group = app.MapGroup("/api/workflows").RequireAuthorization();

group.MapGet("", () => Results.Ok(InMemoryStore.Workflows.Values.OrderBy(w => w.Name)));

group.MapGet("/{id:guid}", (Guid id) =>
    InMemoryStore.Workflows.TryGetValue(id, out var workflow)
        ? Results.Ok(workflow)
        : Results.NotFound());

group.MapPost("", [Authorize(Policy = AppPolicies.WorkflowWrite)] (WorkflowUpsertRequest request, ClaimsPrincipal user) =>
{
    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest("Workflow name is required.");
    }

    var workflow = new WorkflowDefinition
    {
        Id = Guid.NewGuid(),
        Name = request.Name,
        Description = request.Description ?? string.Empty,
        Steps = request.Steps?.Select(s => new WorkflowStep(s.Name, s.Description ?? string.Empty)).ToList() ?? new List<WorkflowStep>()
    };

    InMemoryStore.Workflows[workflow.Id] = workflow;

    return Results.Created($"/api/workflows/{workflow.Id}", workflow);
});

group.MapPut("/{id:guid}", [Authorize(Policy = AppPolicies.WorkflowWrite)] (Guid id, WorkflowUpsertRequest request) =>
{
    if (!InMemoryStore.Workflows.TryGetValue(id, out var workflow))
    {
        return Results.NotFound();
    }

    if (!string.IsNullOrWhiteSpace(request.Name))
    {
        workflow.Name = request.Name;
    }

    workflow.Description = request.Description ?? workflow.Description;
    if (request.Steps is not null)
    {
        workflow.Steps = request.Steps.Select(s => new WorkflowStep(s.Name, s.Description ?? string.Empty)).ToList();
    }

    return Results.Ok(workflow);
});

group.MapDelete("/{id:guid}", [Authorize(Policy = AppPolicies.WorkflowWrite)] (Guid id) =>
    InMemoryStore.Workflows.TryRemove(id, out _)
        ? Results.NoContent()
        : Results.NotFound());

app.Run();

record WorkflowUpsertRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public IEnumerable<WorkflowStepContract>? Steps { get; init; }
}

record WorkflowStepContract(string Name, string? Description);
