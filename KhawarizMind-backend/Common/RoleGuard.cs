using System.Collections.Concurrent;
using Microsoft.AspNetCore.Http;

namespace DocumentManagementSystem.Common;

public static class RoleGuard
{
    private static readonly ConcurrentDictionary<string, string[]> TokenRoleMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["admin-token"] = new[]
        {
            RoleConstants.AiQuery,
            RoleConstants.WorkflowViewer,
            RoleConstants.WorkflowManager,
            RoleConstants.WorkflowAdmin,
        },
        ["ai-token"] = new[] { RoleConstants.AiQuery },
        ["workflow-token"] = new[] { RoleConstants.WorkflowViewer, RoleConstants.WorkflowManager },
        ["workflow-admin-token"] = new[]
        {
            RoleConstants.WorkflowViewer,
            RoleConstants.WorkflowManager,
            RoleConstants.WorkflowAdmin,
        },
    };

    private static readonly string[] RoleHeaders =
    {
        "X-Roles",
        "X-User-Roles",
        "X-Requested-Roles",
    };

    public static bool HasAllRoles(HttpContext context, params string[] requiredRoles)
    {
        if (requiredRoles is null || requiredRoles.Length == 0)
        {
            return true;
        }

        var granted = GetGrantedRoles(context);
        return requiredRoles.All(role => granted.Contains(role));
    }

    public static IResult Forbid(HttpContext context, params string[] requiredRoles)
    {
        var granted = GetGrantedRoles(context);
        var payload = new
        {
            message = "Forbidden", // intentionally terse for UI consumption
            requiredRoles,
            grantedRoles = granted.ToArray(),
        };

        return Results.Json(payload, statusCode: StatusCodes.Status403Forbidden);
    }

    public static HashSet<string> GetGrantedRoles(HttpContext context)
    {
        var roles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var headerName in RoleHeaders)
        {
            if (!context.Request.Headers.TryGetValue(headerName, out var values))
            {
                continue;
            }

            foreach (var value in values)
            {
                if (string.IsNullOrWhiteSpace(value))
                {
                    continue;
                }

                var parts = value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    roles.Add(part);
                }
            }
        }

        if (context.Request.Headers.TryGetValue("Authorization", out var authorizationHeaders))
        {
            foreach (var auth in authorizationHeaders)
            {
                if (string.IsNullOrWhiteSpace(auth))
                {
                    continue;
                }

                const string prefix = "Bearer ";
                if (!auth.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var token = auth[prefix.Length..].Trim();
                if (string.IsNullOrEmpty(token))
                {
                    continue;
                }

                if (TokenRoleMap.TryGetValue(token, out var mappedRoles))
                {
                    foreach (var mappedRole in mappedRoles)
                    {
                        roles.Add(mappedRole);
                    }
                }
                else
                {
                    var tokenParts = token.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                    foreach (var tokenPart in tokenParts)
                    {
                        roles.Add(tokenPart);
                    }
                }
            }
        }

        return roles;
    }
}
