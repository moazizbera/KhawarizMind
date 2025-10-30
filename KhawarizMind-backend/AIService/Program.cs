using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using DocumentManagementSystem.Common;
using DocumentManagementSystem.Common.Ai;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<SharedAppStore>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapPost("/api/ai/query", async Task<IResult> (
    AiQueryRequest request,
    SharedAppStore store,
    HttpContext context,
    CancellationToken cancellationToken) =>
{
    if (request is null || string.IsNullOrWhiteSpace(request.Prompt))
    {
        return Results.BadRequest(new { message = "A prompt is required." });
    }

    if (!RoleGuard.HasAllRoles(context, RoleConstants.AiQuery))
    {
        return RoleGuard.Forbid(context, RoleConstants.AiQuery);
    }

    var normalized = AiQueryNormalizer.Normalize(request);

    if (normalized.History.Count > 0)
    {
        var historyMessages = normalized.History.Select(history => new AiMessage
        {
            Role = history.Role,
            Content = history.Content,
            Timestamp = history.Timestamp,
        });

        store.AppendConversationMessages(normalized.ConversationId, historyMessages, normalized.Metadata);
    }

    store.AppendConversationMessages(
        normalized.ConversationId,
        new[]
        {
            new AiMessage
            {
                Role = "user",
                Content = normalized.Prompt,
                Timestamp = DateTime.UtcNow,
            },
        },
        normalized.Metadata);

    var plan = AiResponsePlanner.BuildPlan(normalized);

    if (normalized.Stream)
    {
        return Results.Stream(async (stream, ct) =>
        {
            await using var writer = new StreamWriter(stream, new UTF8Encoding(false), leaveOpen: true);
            var aggregate = new StringBuilder();

            try
            {
                foreach (var segment in plan.Segments)
                {
                    ct.ThrowIfCancellationRequested();
                    aggregate.Append(segment);
                    var chunkPayload = JsonSerializer.Serialize(
                        new AiStreamChunk
                        {
                            ConversationId = normalized.ConversationId,
                            Token = segment,
                        },
                        AiResponsePlanner.SerializerOptions);

                    await writer.WriteAsync($"data: {chunkPayload}\n\n");
                    await writer.FlushAsync();

                    if (plan.DelayBetweenSegments > TimeSpan.Zero)
                    {
                        await Task.Delay(plan.DelayBetweenSegments, ct);
                    }
                }

                var answer = aggregate.ToString().Trim();
                var finalPayload = JsonSerializer.Serialize(
                    new AiStreamChunk
                    {
                        ConversationId = normalized.ConversationId,
                        Answer = answer,
                        Usage = plan.Usage,
                        Suggestions = plan.Suggestions,
                        Done = true,
                    },
                    AiResponsePlanner.SerializerOptions);

                await writer.WriteAsync($"data: {finalPayload}\n\n");
                await writer.WriteAsync("data: [DONE]\n\n");
                await writer.FlushAsync();

                var metadata = AiResponsePlanner.MergeMetadata(normalized.Metadata, plan.Metadata);
                metadata["answerLength"] = answer.Length.ToString();

                store.AppendConversationMessages(
                    normalized.ConversationId,
                    new[]
                    {
                        new AiMessage
                        {
                            Role = "assistant",
                            Content = answer,
                            Timestamp = DateTime.UtcNow,
                        },
                    },
                    metadata);
            }
            catch (OperationCanceledException)
            {
                await writer.WriteAsync("data: [DONE]\n\n");
                await writer.FlushAsync();
            }
        }, "text/event-stream");
    }

    var responseText = string.Concat(plan.Segments).Trim();
    var finalMetadata = AiResponsePlanner.MergeMetadata(normalized.Metadata, plan.Metadata);
    finalMetadata["answerLength"] = responseText.Length.ToString();

    store.AppendConversationMessages(
        normalized.ConversationId,
        new[]
        {
            new AiMessage
            {
                Role = "assistant",
                Content = responseText,
                Timestamp = DateTime.UtcNow,
            },
        },
        finalMetadata);

    var response = new AiQueryResponse
    {
        ConversationId = normalized.ConversationId,
        Answer = responseText,
        Usage = plan.Usage,
        Suggestions = plan.Suggestions,
        Context = normalized.ContextDescriptor,
        Limitations = AiResponsePlanner.Limitations,
    };

    return Results.Ok(response);
});

app.MapGet("/", () => Results.Ok(new
{
    service = "AIService",
    status = "ok",
    limitations = AiResponsePlanner.Limitations,
}));

app.Run();

internal sealed record AiQueryRequest
{
    public string Prompt { get; init; } = string.Empty;
    public bool? Stream { get; init; }
    public string? ConversationId { get; init; }
    public string? ContextId { get; init; }
    public string? ContextLabel { get; init; }
    public string? Language { get; init; }
    public List<AiHistoryItem>? History { get; init; }
}

internal sealed record AiHistoryItem
{
    public string Role { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public DateTime Timestamp { get; init; }
}

internal sealed record AiQueryResponse
{
    public string ConversationId { get; init; } = string.Empty;
    public string Answer { get; init; } = string.Empty;
    public AiUsage Usage { get; init; } = new();
    public IReadOnlyList<string> Suggestions { get; init; } = Array.Empty<string>();
    public AiQueryContextDescriptor? Context { get; init; }
    public IReadOnlyList<string> Limitations { get; init; } = Array.Empty<string>();
}

internal sealed record AiQueryContextDescriptor
{
    public string? Id { get; init; }
    public string? Label { get; init; }
    public string? Language { get; init; }
}

internal sealed class AiUsage
{
    public int PromptTokens { get; init; }
    public int CompletionTokens { get; init; }
    public int TotalTokens => PromptTokens + CompletionTokens;
}

internal sealed record AiStreamChunk
{
    public string ConversationId { get; init; } = string.Empty;
    public string? Token { get; init; }
    public string? Answer { get; init; }
    public AiUsage? Usage { get; init; }
    public IReadOnlyList<string>? Suggestions { get; init; }
    public bool? Done { get; init; }
}

internal sealed record AiQueryContext(
    string ConversationId,
    string Prompt,
    bool Stream,
    string? ContextId,
    string? ContextLabel,
    string? Language,
    IReadOnlyList<AiHistoryItem> History,
    Dictionary<string, string?> Metadata,
    AiQueryContextDescriptor? ContextDescriptor);

internal sealed record AiResponsePlan(
    IReadOnlyList<string> Segments,
    AiUsage Usage,
    IReadOnlyList<string> Suggestions,
    Dictionary<string, string?> Metadata,
    TimeSpan DelayBetweenSegments);

internal static class AiQueryNormalizer
{
    public static AiQueryContext Normalize(AiQueryRequest request)
    {
        var conversationId = string.IsNullOrWhiteSpace(request.ConversationId)
            ? Guid.NewGuid().ToString("N")
            : request.ConversationId.Trim();

        var history = (request.History ?? new List<AiHistoryItem>())
            .Where(item => !string.IsNullOrWhiteSpace(item.Content))
            .Select(item => item with
            {
                Role = NormalizeRole(item.Role),
                Content = item.Content.Trim(),
                Timestamp = item.Timestamp == default
                    ? DateTime.UtcNow
                    : DateTime.SpecifyKind(item.Timestamp, DateTimeKind.Utc),
            })
            .ToList();

        var metadata = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["conversationId"] = conversationId,
            ["language"] = string.IsNullOrWhiteSpace(request.Language) ? null : request.Language!.Trim(),
        };

        var descriptor = new AiQueryContextDescriptor
        {
            Id = string.IsNullOrWhiteSpace(request.ContextId) ? null : request.ContextId!.Trim(),
            Label = string.IsNullOrWhiteSpace(request.ContextLabel) ? null : request.ContextLabel!.Trim(),
            Language = string.IsNullOrWhiteSpace(request.Language) ? null : request.Language!.Trim(),
        };

        if (!string.IsNullOrWhiteSpace(descriptor.Id))
        {
            metadata["contextId"] = descriptor.Id;
        }

        if (!string.IsNullOrWhiteSpace(descriptor.Label))
        {
            metadata["contextLabel"] = descriptor.Label;
        }

        metadata["updatedAt"] = DateTime.UtcNow.ToString("O");

        return new AiQueryContext(
            conversationId,
            request.Prompt.Trim(),
            request.Stream ?? false,
            descriptor.Id,
            descriptor.Label,
            descriptor.Language,
            history,
            metadata,
            descriptor);
    }

    private static string NormalizeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return "assistant";
        }

        var normalized = role.Trim().ToLowerInvariant();
        return normalized is "user" or "assistant" or "system" ? normalized : "assistant";
    }
}

internal static class AiResponsePlanner
{
    public static IReadOnlyList<string> Limitations { get; } = new[]
    {
        "Responses are mock data generated for demo purposes.",
        "No real AI model is executed; connect your provider for production.",
    };

    public static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static AiResponsePlan BuildPlan(AiQueryContext context)
    {
        var segments = Tokenize(BuildResponseText(context));
        var suggestions = BuildSuggestions(context);
        var usage = EstimateUsage(context, segments.Count);

        var metadata = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["promptTokens"] = usage.PromptTokens.ToString(),
            ["completionTokens"] = usage.CompletionTokens.ToString(),
            ["totalTokens"] = usage.TotalTokens.ToString(),
            ["suggestionCount"] = suggestions.Count.ToString(),
        };

        return new AiResponsePlan(segments, usage, suggestions, metadata, TimeSpan.FromMilliseconds(55));
    }

    public static Dictionary<string, string?> MergeMetadata(
        Dictionary<string, string?> source,
        Dictionary<string, string?> overlay)
    {
        var combined = new Dictionary<string, string?>(source, StringComparer.OrdinalIgnoreCase);
        foreach (var pair in overlay)
        {
            combined[pair.Key] = pair.Value;
        }

        combined["updatedAt"] = DateTime.UtcNow.ToString("O");
        return combined;
    }

    private static string BuildResponseText(AiQueryContext context)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"Here's what I found for \"{context.Prompt}\":");

        if (!string.IsNullOrWhiteSpace(context.ContextLabel))
        {
            builder.AppendLine($"- Context: {context.ContextLabel}.");
        }

        if (context.History.Count > 0)
        {
            builder.AppendLine($"- Considered {context.History.Count} earlier message(s) in this conversation.");
        }

        builder.AppendLine("- This is a simulated KhawarizMind response. Integrate a real model to unlock live AI capabilities.");
        builder.AppendLine("- Generated at " + DateTime.UtcNow.ToString("u") + ".");
        builder.AppendLine("Let me know if you want a summary, follow-up tasks, or escalation recommendations.");

        return builder.ToString();
    }

    private static List<string> BuildSuggestions(AiQueryContext context)
    {
        var suggestions = new List<string>
        {
            "Summarize the latest update",
            "Highlight potential risks",
        };

        if (!string.IsNullOrWhiteSpace(context.ContextLabel))
        {
            suggestions.Add($"What are the next steps for {context.ContextLabel}?");
        }
        else
        {
            suggestions.Add("Suggest next actions");
        }

        suggestions.Add("Draft a status update email");
        return suggestions;
    }

    private static AiUsage EstimateUsage(AiQueryContext context, int completionTokens)
    {
        var promptTokens = CountTokens(context.Prompt);
        promptTokens += context.History.Sum(item => CountTokens(item.Content));
        return new AiUsage
        {
            PromptTokens = promptTokens,
            CompletionTokens = completionTokens,
        };
    }

    private static List<string> Tokenize(string text)
    {
        var tokens = new List<string>();
        foreach (var word in text.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            tokens.Add(word + " ");
        }

        if (tokens.Count == 0)
        {
            tokens.Add("...");
        }

        return tokens;
    }

    private static int CountTokens(string text)
        => string.IsNullOrWhiteSpace(text)
            ? 0
            : text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
}

