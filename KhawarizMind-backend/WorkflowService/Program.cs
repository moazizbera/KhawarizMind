using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var dataDirectory = Path.Combine(AppContext.BaseDirectory, "App_Data");
Directory.CreateDirectory(dataDirectory);
builder.Services.AddSingleton(new WorkflowRepository(Path.Combine(dataDirectory, "workflows.json")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/api/workflows", async (WorkflowRepository repository) =>
{
    var items = await repository.GetAllAsync();
    var ordered = items.OrderByDescending(w => w.UpdatedAt).ToList();
    return Results.Ok(ordered);
});

app.MapGet("/api/workflows/{id:guid}", async (Guid id, WorkflowRepository repository) =>
{
    var workflow = await repository.GetAsync(id);
    return workflow is null ? Results.NotFound() : Results.Ok(workflow);
});

app.MapPost("/api/workflows", async (WorkflowUpsertRequest request, WorkflowRepository repository) =>
{
    var now = DateTime.UtcNow;
    var normalizedNodes = WorkflowHelpers.NormalizeNodes(request.Nodes);
    var workflow = new WorkflowDefinition
    {
        Id = Guid.NewGuid(),
        Name = string.IsNullOrWhiteSpace(request.Name) ? "Untitled Workflow" : request.Name.Trim(),
        Description = request.Description?.Trim() ?? string.Empty,
        Owner = request.Owner?.Trim() ?? string.Empty,
        Status = WorkflowHelpers.NormalizeStatus(request.Status),
        SlaMinutes = request.SlaMinutes,
        CreatedAt = now,
        UpdatedAt = now,
        DueAt = request.DueAt ?? WorkflowHelpers.CalculateDueAt(now, request.SlaMinutes),
        Nodes = normalizedNodes,
        Edges = WorkflowHelpers.NormalizeEdges(request.Edges),
        Stages = WorkflowHelpers.NormalizeStages(request.Stages, normalizedNodes),
        Activities = WorkflowHelpers.NormalizeActivities(request.Activities, normalizedNodes),
    };

    await repository.SaveAsync(workflow);
    return Results.Created($"/api/workflows/{workflow.Id}", workflow);
});

app.MapPut("/api/workflows/{id:guid}", async (Guid id, WorkflowUpsertRequest request, WorkflowRepository repository) =>
{
    var existing = await repository.GetAsync(id);
    if (existing is null)
    {
        return Results.NotFound();
    }

    if (!string.IsNullOrWhiteSpace(request.Name))
    {
        existing.Name = request.Name.Trim();
    }

    if (request.Description is not null)
    {
        existing.Description = request.Description.Trim();
    }

    if (!string.IsNullOrWhiteSpace(request.Owner))
    {
        existing.Owner = request.Owner.Trim();
    }

    if (!string.IsNullOrWhiteSpace(request.Status))
    {
        existing.Status = WorkflowHelpers.NormalizeStatus(request.Status);
    }

    existing.SlaMinutes = request.SlaMinutes;
    existing.DueAt = request.DueAt ?? WorkflowHelpers.CalculateDueAt(existing.CreatedAt, request.SlaMinutes ?? existing.SlaMinutes) ?? existing.DueAt;

    var normalizedNodes = WorkflowHelpers.NormalizeNodes(request.Nodes ?? existing.Nodes);
    existing.Nodes = normalizedNodes;
    existing.Edges = WorkflowHelpers.NormalizeEdges(request.Edges ?? existing.Edges);
    existing.Stages = WorkflowHelpers.NormalizeStages(request.Stages, normalizedNodes);
    existing.Activities = WorkflowHelpers.NormalizeActivities(request.Activities, normalizedNodes);
    existing.UpdatedAt = DateTime.UtcNow;

    await repository.SaveAsync(existing);
    return Results.Ok(existing);
});

app.Run();

public sealed record WorkflowDefinition
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public string Status { get; set; } = WorkflowHelpers.DefaultStatus;
    public int? SlaMinutes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DueAt { get; set; }
    public List<WorkflowNode> Nodes { get; set; } = new();
    public List<WorkflowEdge> Edges { get; set; } = new();
    public List<WorkflowStage> Stages { get; set; } = new();
    public List<WorkflowActivity> Activities { get; set; } = new();
}

public sealed record WorkflowNode
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Type { get; set; } = "default";
    public double X { get; set; }
    public double Y { get; set; }
    public WorkflowNodeData Data { get; set; } = new();
}

public sealed record WorkflowNodeData
{
    public string? Label { get; set; }
    public string? Assignee { get; set; }
    public int? SlaMinutes { get; set; }
    public string? Status { get; set; }
}

public sealed record WorkflowEdge
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Source { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string? Label { get; set; }
}

public sealed record WorkflowStage
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = WorkflowHelpers.DefaultStatus;
    public int Order { get; set; }
}

public sealed record WorkflowActivity
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = WorkflowHelpers.DefaultStatus;
    public DateTime Timestamp { get; set; }
    public string? Assignee { get; set; }
}

public sealed class WorkflowUpsertRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Owner { get; set; }
    public string? Status { get; set; }
    public int? SlaMinutes { get; set; }
    public DateTime? DueAt { get; set; }
    public List<WorkflowNode>? Nodes { get; set; }
    public List<WorkflowEdge>? Edges { get; set; }
    public List<WorkflowStage>? Stages { get; set; }
    public List<WorkflowActivity>? Activities { get; set; }
}

public sealed class WorkflowRepository
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _mutex = new(1, 1);
    private readonly JsonSerializerOptions _serializerOptions;
    private List<WorkflowDefinition> _cache = new();

    public WorkflowRepository(string filePath)
    {
        _filePath = filePath;
        Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
        _serializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            Converters = { new JsonStringEnumConverter() },
        };

        if (File.Exists(filePath))
        {
            try
            {
                using var stream = File.OpenRead(filePath);
                var existing = JsonSerializer.Deserialize<List<WorkflowDefinition>>(stream, _serializerOptions);
                if (existing is not null)
                {
                    _cache = existing;
                }
            }
            catch
            {
                _cache = new List<WorkflowDefinition>();
            }
        }

        if (_cache.Count == 0)
        {
            _cache.Add(WorkflowHelpers.CreateSampleWorkflow());
            Persist();
        }
    }

    public async Task<IReadOnlyList<WorkflowDefinition>> GetAllAsync()
    {
        await _mutex.WaitAsync();
        try
        {
            return _cache.Select(Clone).ToList();
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<WorkflowDefinition?> GetAsync(Guid id)
    {
        await _mutex.WaitAsync();
        try
        {
            var item = _cache.FirstOrDefault(w => w.Id == id);
            return item is null ? null : Clone(item);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task SaveAsync(WorkflowDefinition workflow)
    {
        await _mutex.WaitAsync();
        try
        {
            var index = _cache.FindIndex(w => w.Id == workflow.Id);
            if (index >= 0)
            {
                _cache[index] = Clone(workflow);
            }
            else
            {
                _cache.Add(Clone(workflow));
            }

            await PersistAsync();
        }
        finally
        {
            _mutex.Release();
        }
    }

    private WorkflowDefinition Clone(WorkflowDefinition workflow) =>
        JsonSerializer.Deserialize<WorkflowDefinition>(
            JsonSerializer.Serialize(workflow, _serializerOptions),
            _serializerOptions) ?? new WorkflowDefinition();

    private void Persist()
    {
        var json = JsonSerializer.Serialize(_cache, _serializerOptions);
        File.WriteAllText(_filePath, json);
    }

    private async Task PersistAsync()
    {
        var json = JsonSerializer.Serialize(_cache, _serializerOptions);
        await File.WriteAllTextAsync(_filePath, json);
    }
}

public static class WorkflowHelpers
{
    public const string DefaultStatus = "draft";

    private static readonly HashSet<string> AllowedStatuses = new(
        new[] { "draft", "active", "in_progress", "completed", "paused", "overdue" },
        StringComparer.OrdinalIgnoreCase);

    public static string NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return DefaultStatus;
        }

        var normalized = status.Trim().ToLowerInvariant();
        return AllowedStatuses.Contains(normalized) ? normalized : DefaultStatus;
    }

    public static DateTime? CalculateDueAt(DateTime reference, int? slaMinutes)
        => slaMinutes.HasValue ? reference.AddMinutes(slaMinutes.Value) : null;

    public static List<WorkflowNode> NormalizeNodes(IEnumerable<WorkflowNode>? nodes)
    {
        if (nodes is null)
        {
            return new List<WorkflowNode>();
        }

        var normalized = new List<WorkflowNode>();
        foreach (var node in nodes)
        {
            if (node is null)
            {
                continue;
            }

            normalized.Add(new WorkflowNode
            {
                Id = string.IsNullOrWhiteSpace(node.Id) ? Guid.NewGuid().ToString("N") : node.Id,
                Type = string.IsNullOrWhiteSpace(node.Type) ? "default" : node.Type.Trim(),
                X = node.X,
                Y = node.Y,
                Data = new WorkflowNodeData
                {
                    Label = string.IsNullOrWhiteSpace(node.Data?.Label) ? "Task" : node.Data!.Label!.Trim(),
                    Assignee = node.Data?.Assignee?.Trim(),
                    SlaMinutes = node.Data?.SlaMinutes,
                    Status = NormalizeStatus(node.Data?.Status),
                },
            });
        }

        return normalized;
    }

    public static List<WorkflowEdge> NormalizeEdges(IEnumerable<WorkflowEdge>? edges)
    {
        if (edges is null)
        {
            return new List<WorkflowEdge>();
        }

        var normalized = new List<WorkflowEdge>();
        foreach (var edge in edges)
        {
            if (edge is null)
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(edge.Source) || string.IsNullOrWhiteSpace(edge.Target))
            {
                continue;
            }

            normalized.Add(new WorkflowEdge
            {
                Id = string.IsNullOrWhiteSpace(edge.Id) ? Guid.NewGuid().ToString("N") : edge.Id,
                Source = edge.Source.Trim(),
                Target = edge.Target.Trim(),
                Label = edge.Label?.Trim(),
            });
        }

        return normalized;
    }

    public static List<WorkflowStage> NormalizeStages(IEnumerable<WorkflowStage>? stages, IEnumerable<WorkflowNode>? nodes)
    {
        var normalized = new List<WorkflowStage>();
        if (stages is not null)
        {
            var ordered = stages
                .Where(stage => stage is not null)
                .OrderBy(stage => stage!.Order)
                .ToList();

            var index = 0;
            foreach (var stage in ordered)
            {
                if (stage is null)
                {
                    continue;
                }

                normalized.Add(new WorkflowStage
                {
                    Id = string.IsNullOrWhiteSpace(stage.Id) ? Guid.NewGuid().ToString("N") : stage.Id,
                    Name = string.IsNullOrWhiteSpace(stage.Name) ? $"Stage {index + 1}" : stage.Name.Trim(),
                    Status = NormalizeStatus(stage.Status),
                    Order = index++,
                });
            }
        }

        if (normalized.Count == 0 && nodes is not null)
        {
            var index = 0;
            foreach (var node in nodes)
            {
                if (node is null)
                {
                    continue;
                }

                normalized.Add(new WorkflowStage
                {
                    Id = string.IsNullOrWhiteSpace(node.Id) ? Guid.NewGuid().ToString("N") : node.Id,
                    Name = string.IsNullOrWhiteSpace(node.Data?.Label) ? $"Stage {index + 1}" : node.Data!.Label!,
                    Status = NormalizeStatus(node.Data?.Status),
                    Order = index++,
                });
            }
        }

        return normalized;
    }

    public static List<WorkflowActivity> NormalizeActivities(IEnumerable<WorkflowActivity>? activities, IEnumerable<WorkflowNode>? nodes)
    {
        var normalized = new List<WorkflowActivity>();
        if (activities is not null)
        {
            foreach (var activity in activities.Where(a => a is not null).OrderBy(a => a!.Timestamp))
            {
                if (activity is null)
                {
                    continue;
                }

                normalized.Add(new WorkflowActivity
                {
                    Id = string.IsNullOrWhiteSpace(activity.Id) ? Guid.NewGuid().ToString("N") : activity.Id,
                    Title = string.IsNullOrWhiteSpace(activity.Title) ? "Activity" : activity.Title.Trim(),
                    Description = activity.Description?.Trim(),
                    Status = NormalizeStatus(activity.Status),
                    Timestamp = activity.Timestamp == default ? DateTime.UtcNow : DateTime.SpecifyKind(activity.Timestamp, DateTimeKind.Utc),
                    Assignee = activity.Assignee?.Trim(),
                });
            }
        }

        if (normalized.Count == 0 && nodes is not null)
        {
            var timestamp = DateTime.UtcNow;
            foreach (var node in nodes)
            {
                if (node is null)
                {
                    continue;
                }

                normalized.Add(new WorkflowActivity
                {
                    Id = $"auto-{node.Id}",
                    Title = string.IsNullOrWhiteSpace(node.Data?.Label) ? "Task" : node.Data!.Label!,
                    Description = node.Data?.Assignee,
                    Status = NormalizeStatus(node.Data?.Status),
                    Timestamp = timestamp,
                    Assignee = node.Data?.Assignee,
                });

                timestamp = timestamp.AddMinutes(15);
            }
        }

        return normalized;
    }

    public static WorkflowDefinition CreateSampleWorkflow()
    {
        var createdAt = DateTime.UtcNow.AddHours(-6);
        var slaMinutes = 1440;
        var nodes = new List<WorkflowNode>
        {
            new()
            {
                Id = "intake",
                X = 80,
                Y = 80,
                Data = new WorkflowNodeData
                {
                    Label = "Invoice Intake",
                    Assignee = "Nina Rivera",
                    Status = "completed",
                    SlaMinutes = 120,
                },
            },
            new()
            {
                Id = "classification",
                X = 320,
                Y = 160,
                Data = new WorkflowNodeData
                {
                    Label = "AI Classification",
                    Assignee = "AI Bot",
                    Status = "active",
                    SlaMinutes = 240,
                },
            },
            new()
            {
                Id = "approval",
                X = 560,
                Y = 120,
                Data = new WorkflowNodeData
                {
                    Label = "Manager Approval",
                    Assignee = "Fatima Al-Zahra",
                    Status = "in_progress",
                    SlaMinutes = 720,
                },
            },
            new()
            {
                Id = "posting",
                X = 800,
                Y = 200,
                Data = new WorkflowNodeData
                {
                    Label = "ERP Posting",
                    Assignee = "ERP Bridge",
                    Status = "draft",
                    SlaMinutes = 360,
                },
            },
        };

        var edges = new List<WorkflowEdge>
        {
            new() { Id = "e1", Source = "intake", Target = "classification", Label = "Validated" },
            new() { Id = "e2", Source = "classification", Target = "approval", Label = "Ready" },
            new() { Id = "e3", Source = "approval", Target = "posting", Label = "Approved" },
        };

        var stages = nodes.Select((node, index) => new WorkflowStage
        {
            Id = $"stage-{index + 1}",
            Name = node.Data.Label ?? $"Stage {index + 1}",
            Status = NormalizeStatus(node.Data.Status),
            Order = index,
        }).ToList();

        var activities = new List<WorkflowActivity>
        {
            new()
            {
                Id = "act-1",
                Title = "Workflow created",
                Description = "Finance automation initiated the workflow.",
                Status = "completed",
                Timestamp = createdAt,
                Assignee = "Finance Automation",
            },
            new()
            {
                Id = "act-2",
                Title = "Invoice Intake",
                Description = "Invoices ingested from shared mailbox.",
                Status = "completed",
                Timestamp = createdAt.AddMinutes(45),
                Assignee = "Nina Rivera",
            },
            new()
            {
                Id = "act-3",
                Title = "AI Classification",
                Description = "AI extracted key metadata and detected anomalies.",
                Status = "active",
                Timestamp = createdAt.AddHours(2),
                Assignee = "AI Bot",
            },
            new()
            {
                Id = "act-4",
                Title = "Manager Approval",
                Description = "Awaiting approval from regional manager.",
                Status = "in_progress",
                Timestamp = createdAt.AddHours(5),
                Assignee = "Fatima Al-Zahra",
            },
        };

        return new WorkflowDefinition
        {
            Id = Guid.NewGuid(),
            Name = "Invoice Approval",
            Description = "Route invoices through validation, review, and ERP posting steps.",
            Owner = "Finance Automation",
            Status = "active",
            SlaMinutes = slaMinutes,
            CreatedAt = createdAt,
            UpdatedAt = DateTime.UtcNow,
            DueAt = createdAt.AddMinutes(slaMinutes),
            Nodes = nodes,
            Edges = edges,
            Stages = stages,
            Activities = activities,
        };
    }
}
