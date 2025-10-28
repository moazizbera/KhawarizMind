using DocumentManagementSystem.AuthService.Models;
using DocumentManagementSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSharedSqliteDbContext<AppDbContext>(builder.Configuration);
builder.Services.AddAuthentication("Bearer").AddJwtBearer();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
