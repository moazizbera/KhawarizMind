namespace DocumentManagementSystem.Common.Workflows;

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
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? Assignee { get; set; }
}
