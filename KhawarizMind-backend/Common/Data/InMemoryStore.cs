using System.Collections.Concurrent;
using DocumentManagementSystem.Common.Authentication;
using DocumentManagementSystem.Common.Models.Audit;
using DocumentManagementSystem.Common.Models.Auth;
using DocumentManagementSystem.Common.Models.Documents;
using DocumentManagementSystem.Common.Models.Settings;
using TenantSettingsModel = DocumentManagementSystem.Common.Models.Settings.TenantSettings;
using DocumentManagementSystem.Common.Models.Workflows;

namespace DocumentManagementSystem.Common.Data;

public static class InMemoryStore
{
    private static readonly object SeedLock = new();
    private static bool _seeded;

    public static Guid DefaultTenantId { get; } = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public static ConcurrentDictionary<Guid, UserAccount> Users { get; } = new();
    public static ConcurrentDictionary<Guid, TenantSettings> TenantSettings { get; } = new();
    public static ConcurrentDictionary<Guid, List<AuditLogEntry>> AuditLogs { get; } = new();
    public static ConcurrentDictionary<Guid, DocumentItem> Documents { get; } = new();
    public static ConcurrentDictionary<Guid, WorkflowDefinition> Workflows { get; } = new();

    public static void EnsureSeeded()
    {
        if (_seeded)
        {
            return;
        }

        lock (SeedLock)
        {
            if (_seeded)
            {
                return;
            }

            SeedUsers();
            SeedSettings();
            SeedDocuments();
            SeedWorkflows();
            _seeded = true;
        }
    }

    private static void SeedUsers()
    {
        var admin = new UserAccount
        {
            Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            Username = "admin",
            Email = "admin@example.com",
            TenantId = DefaultTenantId,
            PasswordHash = PasswordHasher.Hash("admin123!"),
            Roles = { AppRoles.Admin, AppRoles.SettingsManager, AppRoles.DocumentManager, AppRoles.WorkflowDesigner }
        };

        var analyst = new UserAccount
        {
            Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            Username = "analyst",
            Email = "analyst@example.com",
            TenantId = DefaultTenantId,
            PasswordHash = PasswordHasher.Hash("analyst123"),
            Roles = { AppRoles.Viewer }
        };

        Users[admin.Id] = admin;
        Users[analyst.Id] = analyst;
    }

    private static void SeedSettings()
    {
        TenantSettings[DefaultTenantId] = TenantSettingsModel.CreateDefault();
        AuditLogs[DefaultTenantId] = new List<AuditLogEntry>
        {
            new()
            {
                Id = Guid.Parse("c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1"),
                TenantId = DefaultTenantId,
                Actor = "system",
                Action = "Seed",
                Details = "Initial tenant settings created.",
                Timestamp = DateTimeOffset.UtcNow.AddMinutes(-30)
            }
        };
    }

    private static void SeedDocuments()
    {
        var now = DateTimeOffset.UtcNow;
        Documents[Guid.Parse("d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1")] = new DocumentItem
        {
            Id = Guid.Parse("d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1"),
            Name = "AI Adoption Roadmap.pdf",
            Owner = "admin",
            UploadedAt = now.AddDays(-7),
            Tags = new[] { "strategy", "ai" },
            SizeInKb = 2560
        };

        Documents[Guid.Parse("d2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2")] = new DocumentItem
        {
            Id = Guid.Parse("d2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2"),
            Name = "Invoice_Q1.xlsx",
            Owner = "analyst",
            UploadedAt = now.AddDays(-2),
            Tags = new[] { "finance" },
            SizeInKb = 780
        };
    }

    private static void SeedWorkflows()
    {
        Workflows[Guid.Parse("f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1")] = new WorkflowDefinition
        {
            Id = Guid.Parse("f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1"),
            Name = "Invoice Approval",
            Description = "Routes invoices above $5k to finance leadership for approval.",
            Steps =
            [
                new WorkflowStep("Upload", "Upload invoice document"),
                new WorkflowStep("Review", "Finance analyst review"),
                new WorkflowStep("Approval", "Finance lead approval")
            ]
        };
    }
}
