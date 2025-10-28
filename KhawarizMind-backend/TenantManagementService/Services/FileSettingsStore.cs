using System.Text.Json;
using DocumentManagementSystem.TenantManagementService.Models;

namespace DocumentManagementSystem.TenantManagementService.Services;

public sealed class FileSettingsStore : ISettingsStore
{
    private readonly string _filePath;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly SemaphoreSlim _mutex = new(1, 1);

    public FileSettingsStore(IHostEnvironment hostEnvironment)
    {
        var dataDirectory = Path.Combine(hostEnvironment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);
        _filePath = Path.Combine(dataDirectory, "tenant-settings.json");
        _jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            WriteIndented = true,
        };
    }

    public async Task<TenantSettings> GetSettingsAsync(CancellationToken cancellationToken = default)
    {
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var snapshot = await ReadSnapshotAsync(cancellationToken);
            if (snapshot is null)
            {
                var defaults = TenantSettings.CreateDefault();
                await PersistSnapshotAsync(new SettingsSnapshot(defaults.Clone(), new List<AuditLogEntry>()), cancellationToken);
                return defaults;
            }

            return snapshot.Settings.Clone();
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task UpdateSettingsAsync(
        TenantSettings settings,
        AuditLogEntry? auditEntry,
        CancellationToken cancellationToken = default)
    {
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var snapshot = await ReadSnapshotAsync(cancellationToken) ??
                           new SettingsSnapshot(TenantSettings.CreateDefault(), new List<AuditLogEntry>());

            snapshot.Settings = settings.Clone();

            if (auditEntry is not null)
            {
                snapshot.Audit.Add(auditEntry);
                if (snapshot.Audit.Count > 200)
                {
                    snapshot.Audit = snapshot.Audit
                        .OrderByDescending(entry => entry.Timestamp)
                        .Take(200)
                        .ToList();
                }
            }

            await PersistSnapshotAsync(snapshot, cancellationToken);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<IReadOnlyList<AuditLogEntry>> GetAuditAsync(
        int? take = null,
        CancellationToken cancellationToken = default)
    {
        await _mutex.WaitAsync(cancellationToken);
        try
        {
            var snapshot = await ReadSnapshotAsync(cancellationToken);
            if (snapshot is null)
            {
                return Array.Empty<AuditLogEntry>();
            }

            var ordered = snapshot.Audit
                .OrderByDescending(entry => entry.Timestamp)
                .ToList();

            if (take.HasValue && take.Value > 0)
            {
                ordered = ordered.Take(take.Value).ToList();
            }

            return ordered.Select(entry => new AuditLogEntry
            {
                Id = entry.Id,
                Section = entry.Section,
                Action = entry.Action,
                Actor = entry.Actor,
                Timestamp = entry.Timestamp,
                Details = new Dictionary<string, string>(entry.Details),
            }).ToList();
        }
        finally
        {
            _mutex.Release();
        }
    }

    private async Task<SettingsSnapshot?> ReadSnapshotAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_filePath))
        {
            return null;
        }

        await using var stream = File.OpenRead(_filePath);
        return await JsonSerializer.DeserializeAsync<SettingsSnapshot>(stream, _jsonOptions, cancellationToken);
    }

    private async Task PersistSnapshotAsync(SettingsSnapshot snapshot, CancellationToken cancellationToken)
    {
        await using var stream = File.Create(_filePath);
        await JsonSerializer.SerializeAsync(stream, snapshot, _jsonOptions, cancellationToken);
    }

    private sealed class SettingsSnapshot
    {
        public SettingsSnapshot()
        {
            Settings = TenantSettings.CreateDefault();
            Audit = new List<AuditLogEntry>();
        }

        public SettingsSnapshot(TenantSettings settings, IList<AuditLogEntry> audit)
        {
            Settings = settings;
            Audit = audit;
        }

        public TenantSettings Settings { get; set; }

        public IList<AuditLogEntry> Audit { get; set; }
    }
}
