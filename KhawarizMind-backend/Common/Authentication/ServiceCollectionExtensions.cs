using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace DocumentManagementSystem.Common.Authentication;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCommonJwtAuthentication(this IServiceCollection services, JwtOptions? options = null)
    {
        options ??= new JwtOptions();
        services.AddSingleton(options);
        services.AddSingleton(new JwtTokenService(options));

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.SecretKey));

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(cfg =>
            {
                cfg.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = options.Issuer,
                    ValidAudience = options.Audience,
                    IssuerSigningKey = signingKey,
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            });

        services.AddAuthorization(optionsBuilder =>
        {
            optionsBuilder.AddPolicy(AppPolicies.SettingsWrite, policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.SettingsManager));

            optionsBuilder.AddPolicy(AppPolicies.DocumentsWrite, policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.DocumentManager));

            optionsBuilder.AddPolicy(AppPolicies.WorkflowWrite, policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.WorkflowDesigner));
        });

        return services;
    }
}

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string SettingsManager = "SettingsManager";
    public const string DocumentManager = "DocumentManager";
    public const string WorkflowDesigner = "WorkflowDesigner";
    public const string Viewer = "Viewer";
}

public static class AppPolicies
{
    public const string SettingsWrite = "Settings.Write";
    public const string DocumentsWrite = "Documents.Write";
    public const string WorkflowWrite = "Workflow.Write";
}
