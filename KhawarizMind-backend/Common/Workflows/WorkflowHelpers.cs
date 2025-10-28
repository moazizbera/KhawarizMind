using System.Text.Json;
using System.Text.Json.Serialization;

namespace DocumentManagementSystem.Common.Workflows;

public static class WorkflowHelpers
{
    public const string DefaultStatus = "draft";
    public const string StatusActive = "active";

    private static readonly HashSet<string> AllowedStatuses = new(
        new[] { "draft", "active", "in_progress", "completed", "paused", "overdue" },
        StringComparer.OrdinalIgnoreCase);

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

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
                Id = string.IsNullOrWhiteSpace(node.Id) ? Guid.NewGuid().ToString("N") : node.Id.Trim(),
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
                Id = string.IsNullOrWhiteSpace(edge.Id) ? Guid.NewGuid().ToString("N") : edge.Id.Trim(),
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
                    Id = string.IsNullOrWhiteSpace(stage.Id) ? Guid.NewGuid().ToString("N") : stage.Id.Trim(),
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
                    Id = string.IsNullOrWhiteSpace(activity.Id) ? Guid.NewGuid().ToString("N") : activity.Id.Trim(),
                    Title = string.IsNullOrWhiteSpace(activity.Title) ? "Activity" : activity.Title.Trim(),
                    Description = activity.Description?.Trim(),
                    Status = NormalizeStatus(activity.Status),
                    Timestamp = activity.Timestamp == default
                        ? DateTime.UtcNow
                        : DateTime.SpecifyKind(activity.Timestamp, DateTimeKind.Utc),
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

    public static T DeepClone<T>(T value) where T : class
    {
        if (value is null)
        {
            throw new ArgumentNullException(nameof(value));
        }

        var json = JsonSerializer.Serialize(value, SerializerOptions);
        return JsonSerializer.Deserialize<T>(json, SerializerOptions) ?? throw new InvalidOperationException("Failed to clone value.");
    }
}
