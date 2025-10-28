namespace DocumentManagementSystem.Common.Ai;

public sealed record AiMessage
{
    public string Role { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}

public sealed record AiConversation
{
    public string Id { get; init; } = Guid.NewGuid().ToString("N");
    public List<AiMessage> Messages { get; init; } = new();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Dictionary<string, string?> Metadata { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}
