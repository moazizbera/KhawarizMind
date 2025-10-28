using DocumentManagementSystem.Common.Audit;
using DocumentManagementSystem.DocumentService.Authentication;
using DocumentManagementSystem.DocumentService.Metadata;
using DocumentManagementSystem.DocumentService.Services;
using DocumentManagementSystem.DocumentService.Storage;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DocumentManagementSystem.DocumentService.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDocumentServiceCore(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<DocumentCatalogService>();
        services.AddSingleton<IAuditStore, InMemoryAuditStore>();

        services.Configure<DocumentStorageOptions>(configuration.GetSection("DocumentStorage"));
        services.Configure<DocumentMetadataStoreOptions>(configuration.GetSection("MetadataStore"));

        services.AddSingleton<IDocumentStorage>(sp =>
        {
            var options = sp.GetRequiredService<IOptions<DocumentStorageOptions>>().Value;
            var env = sp.GetRequiredService<IHostEnvironment>();
            var logger = sp.GetRequiredService<ILogger<LocalDiskDocumentStorage>>();
            if (string.Equals(options.Provider, "local", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(options.Provider, "disk", StringComparison.OrdinalIgnoreCase))
            {
                return new LocalDiskDocumentStorage(sp.GetRequiredService<IOptions<DocumentStorageOptions>>(), env, logger);
            }

            return new InMemoryDocumentStorage();
        });

        services.AddSingleton<IDocumentMetadataStore, FileBackedDocumentMetadataStore>();

        services.AddAuthentication(SimpleTokenAuthenticationHandler.SchemeName)
            .AddScheme<AuthenticationSchemeOptions, SimpleTokenAuthenticationHandler>(
                SimpleTokenAuthenticationHandler.SchemeName,
                static _ => { });

        services.AddAuthorization(options =>
        {
            options.AddPolicy(AuthorizationPolicies.DocumentReader, policy =>
                policy.RequireRole(DocumentManagementSystem.Common.Security.RoleNames.DocumentReader,
                    DocumentManagementSystem.Common.Security.RoleNames.DocumentEditor));
            options.AddPolicy(AuthorizationPolicies.DocumentEditor, policy =>
                policy.RequireRole(DocumentManagementSystem.Common.Security.RoleNames.DocumentEditor));
        });

        return services;
    }
}
