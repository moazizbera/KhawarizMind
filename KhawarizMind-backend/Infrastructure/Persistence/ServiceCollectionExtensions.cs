using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentManagementSystem.Infrastructure.Persistence;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddSharedSqliteDbContext<TContext>(
        this IServiceCollection services,
        IConfiguration configuration)
        where TContext : DbContext
    {
        var connectionString = DatabaseOptions.ResolveConnectionString(configuration);
        services.AddDbContext<TContext>(options => options.UseSqlite(connectionString));
        return services;
    }
}
