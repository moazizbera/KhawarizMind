using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.Json.Serialization;
using DocumentManagementSystem.Common.Ai;
using DocumentManagementSystem.Common.Workflows;

namespace DocumentManagementSystem.Common;

public sealed class SharedAppStore
{
    private readonly ConcurrentDictionary<Guid, WorkflowDefinition> _workflows = new();
    private readonly ConcurrentDictionary<string, AiConversation> _conversations = new(StringComparer.OrdinalIgnoreCase);
    private readonly JsonSerializerOptions _serializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public SharedAppStore()
    {
        var sample = WorkflowHelpers.CreateSampleWorkflow();
        _workflows[sample.Id] = WorkflowHelpers.DeepClone(sample);
    }

    public IReadOnlyList<WorkflowDefinition> GetWorkflows()
        => _workflows.Values.Select(WorkflowHelpers.DeepClone).OrderByDescending(w => w.UpdatedAt).ToList();

    public WorkflowDefinition? GetWorkflow(Guid id)
        => _workflows.TryGetValue(id, out var workflow) ? WorkflowHelpers.DeepClone(workflow) : null;

    public WorkflowDefinition SaveWorkflow(WorkflowDefinition workflow)
    {
        if (workflow.Id == Guid.Empty)
        {
            workflow.Id = Guid.NewGuid();
        }

        if (workflow.CreatedAt == default)
        {
            workflow.CreatedAt = DateTime.UtcNow;
        }

        workflow.UpdatedAt = DateTime.UtcNow;
        var clone = WorkflowHelpers.DeepClone(workflow);
        _workflows[clone.Id] = clone;
        return WorkflowHelpers.DeepClone(clone);
    }

    public bool TryRemoveWorkflow(Guid id) => _workflows.TryRemove(id, out _);

    public AiConversation AppendConversationMessages(
        string conversationId,
        IEnumerable<AiMessage> messages,
        IDictionary<string, string?>? metadata = null)
    {
        if (string.IsNullOrWhiteSpace(conversationId))
        {
            conversationId = Guid.NewGuid().ToString("N");
        }

        var now = DateTime.UtcNow;
        var normalizedMessages = (messages ?? Array.Empty<AiMessage>())
            .Where(message => message is not null)
            .Select(message => new AiMessage
            {
                Role = string.IsNullOrWhiteSpace(message.Role) ? "assistant" : message.Role.Trim().ToLowerInvariant(),
                Content = message.Content ?? string.Empty,
                Timestamp = message.Timestamp == default
                    ? now
                    : DateTime.SpecifyKind(message.Timestamp, DateTimeKind.Utc),
            })
            .ToList();

        var conversation = _conversations.AddOrUpdate(
            conversationId,
            _ => new AiConversation
            {
                Id = conversationId,
                CreatedAt = now,
                UpdatedAt = now,
                Messages = normalizedMessages,
                Metadata = metadata is null
                    ? new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
                    : new Dictionary<string, string?>(metadata, StringComparer.OrdinalIgnoreCase),
            },
            (_, existing) =>
            {
                var clone = Clone(existing);
                clone.Messages.AddRange(normalizedMessages);
                clone.UpdatedAt = now;
                if (metadata is not null)
                {
                    foreach (var pair in metadata)
                    {
                        clone.Metadata[pair.Key] = pair.Value;
                    }
                }

                return clone;
            });

        _conversations[conversationId] = Clone(conversation);
        return Clone(conversation);
    }

    public AiConversation? GetConversation(string conversationId)
    {
        if (string.IsNullOrWhiteSpace(conversationId))
        {
            return null;
        }

        return _conversations.TryGetValue(conversationId, out var conversation) ? Clone(conversation) : null;
    }

    private AiConversation Clone(AiConversation conversation)
    {
        var json = JsonSerializer.Serialize(conversation, _serializerOptions);
        return JsonSerializer.Deserialize<AiConversation>(json, _serializerOptions) ?? new AiConversation();
    }
}
