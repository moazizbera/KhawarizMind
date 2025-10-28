using Microsoft.Extensions.Configuration;

namespace DocumentManagementSystem.Infrastructure.Persistence;

public class DatabaseOptions
{
    public const string SectionName = "Database";
    public const string DefaultConnectionStringName = "PrimaryConnection";
    public string? ConnectionString { get; set; }

    public static string ResolveConnectionString(IConfiguration configuration)
    {
        var fromEnvironment = configuration["DB_CONNECTION_STRING"];
        if (!string.IsNullOrWhiteSpace(fromEnvironment))
        {
            return fromEnvironment!;
        }

        var fromSection = configuration.GetSection(SectionName).GetValue<string>(nameof(ConnectionString));
        if (!string.IsNullOrWhiteSpace(fromSection))
        {
            return fromSection!;
        }

        var dataDirectory = Path.Combine(AppContext.BaseDirectory, "Data");
        Directory.CreateDirectory(dataDirectory);
        var fallbackPath = Path.Combine(dataDirectory, "khawarizmind.db");
        return $"Data Source={fallbackPath}";
    }
}
