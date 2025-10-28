using DocumentManagementSystem.TenantManagementService.Authentication;
using DocumentManagementSystem.TenantManagementService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

builder.Services.AddAuthentication(DebugAuthenticationDefaults.AuthenticationScheme)
    .AddScheme<DebugAuthenticationOptions, DebugAuthenticationHandler>(
        DebugAuthenticationDefaults.AuthenticationScheme,
        _ => { });

builder.Services.AddAuthorization();

builder.Services.AddSingleton<ISettingsStore, FileSettingsStore>();
builder.Services.AddScoped<ITenantSettingsService, TenantSettingsService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
