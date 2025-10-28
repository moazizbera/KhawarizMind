namespace DocumentManagementSystem.Common.Models.Workflows;

public class WorkflowDefinition
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<WorkflowStep> Steps { get; set; } = new();
}

public record WorkflowStep(string Name, string Description);
