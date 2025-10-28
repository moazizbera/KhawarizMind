using System.Security.Claims;
using DocumentManagementSystem.Common.Authentication;
using DocumentManagementSystem.Common.Data;
using DocumentManagementSystem.Common.Models.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentManagementSystem.AuthService.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly JwtTokenService _tokenService;

    public AuthController(JwtTokenService tokenService)
    {
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    [Authorize(Roles = AppRoles.Admin)]
    public ActionResult<AuthenticationResponse> Register(RegisterRequest request)
    {
        InMemoryStore.EnsureSeeded();

        if (InMemoryStore.Users.Values.Any(u => string.Equals(u.Username, request.Username, StringComparison.OrdinalIgnoreCase)))
        {
            return Conflict("A user with that username already exists.");
        }

        var user = new UserAccount
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email,
            TenantId = Guid.TryParse(request.TenantId, out var tenantId) ? tenantId : InMemoryStore.DefaultTenantId,
            PasswordHash = PasswordHasher.Hash(request.Password)
        };

        foreach (var role in request.Roles?.Distinct() ?? Enumerable.Empty<string>())
        {
            user.Roles.Add(role);
        }

        if (!user.Roles.Any())
        {
            user.Roles.Add(AppRoles.Viewer);
        }

        InMemoryStore.Users[user.Id] = user;

        var token = _tokenService.GenerateToken(user);
        return Ok(AuthenticationResponse.FromUser(user, token));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public ActionResult<AuthenticationResponse> Login(LoginRequest request)
    {
        InMemoryStore.EnsureSeeded();

        var user = InMemoryStore.Users.Values.FirstOrDefault(u => string.Equals(u.Username, request.Username, StringComparison.OrdinalIgnoreCase));
        if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized("Invalid credentials");
        }

        var token = _tokenService.GenerateToken(user);
        return Ok(AuthenticationResponse.FromUser(user, token));
    }

    [HttpGet("profile")]
    [Authorize]
    public ActionResult<UserProfileResponse> Profile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var parsedId))
        {
            return Unauthorized();
        }

        if (!InMemoryStore.Users.TryGetValue(parsedId, out var user))
        {
            return NotFound();
        }

        return new UserProfileResponse
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            TenantId = user.TenantId,
            Roles = user.Roles.ToArray()
        };
    }
}

public record LoginRequest(string Username, string Password);

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? TenantId { get; set; }
    public IEnumerable<string>? Roles { get; set; }
}

public record AuthenticationResponse(Guid UserId, string Username, string Email, Guid TenantId, string Token, IEnumerable<string> Roles)
{
    public static AuthenticationResponse FromUser(UserAccount user, string token) =>
        new(user.Id, user.Username, user.Email, user.TenantId, token, user.Roles);
}

public class UserProfileResponse
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public string[] Roles { get; set; } = Array.Empty<string>();
}
