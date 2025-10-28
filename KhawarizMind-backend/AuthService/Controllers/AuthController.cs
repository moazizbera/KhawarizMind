using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DocumentManagementSystem.AuthService.Models;
using DocumentManagementSystem.AuthService.Models.Requests;
using DocumentManagementSystem.AuthService.Models.Responses;
using DocumentManagementSystem.Common.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DocumentManagementSystem.AuthService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IJwtTokenService _tokenService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IPasswordResetTokenService _passwordResetTokenService;

    public AuthController(
        AppDbContext dbContext,
        IJwtTokenService tokenService,
        IPasswordHasher passwordHasher,
        IPasswordResetTokenService passwordResetTokenService)
    {
        _dbContext = dbContext;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _passwordResetTokenService = passwordResetTokenService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthTokensResponse>> RegisterAsync([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedUsername = request.Username.Trim();
        var existingUser = await _dbContext.Users
            .AnyAsync(u => u.Email.ToLower() == normalizedEmail || u.Username == normalizedUsername, cancellationToken);

        if (existingUser)
        {
            return Conflict(new { message = "User already exists." });
        }

        var tenantId = request.TenantId ?? Guid.NewGuid();
        var user = new User
        {
            Username = normalizedUsername,
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            TenantId = tenantId,
            Role = string.IsNullOrWhiteSpace(request.Role) ? Roles.User : request.Role
        };

        _dbContext.Users.Add(user);
        var tokens = _tokenService.CreateTokenPair(new UserDescriptor(user.Id, user.Username, user.Email, user.TenantId), new[] { user.Role });

        _dbContext.RefreshTokens.Add(new RefreshToken
        {
            User = user,
            Token = tokens.RefreshToken.Token,
            CreatedAt = tokens.RefreshToken.CreatedAt,
            ExpiresAt = tokens.RefreshToken.ExpiresAt
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetProfileAsync), new { }, ToResponse(tokens));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthTokensResponse>> LoginAsync([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var usernameOrEmail = request.UsernameOrEmail.Trim();
        var user = await _dbContext.Users
            .Include(u => u.RefreshTokens)
            .SingleOrDefaultAsync(u => u.Username == usernameOrEmail || u.Email == usernameOrEmail.ToLower(), cancellationToken);

        if (user is null)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        if (!_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var tokenPair = _tokenService.CreateTokenPair(new UserDescriptor(user.Id, user.Username, user.Email, user.TenantId), new[] { user.Role });

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = tokenPair.RefreshToken.Token,
            CreatedAt = tokenPair.RefreshToken.CreatedAt,
            ExpiresAt = tokenPair.RefreshToken.ExpiresAt
        };

        _dbContext.RefreshTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(tokenPair));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthTokensResponse>> RefreshAsync([FromBody] RefreshRequest request, CancellationToken cancellationToken)
    {
        var refreshToken = await _dbContext.RefreshTokens
            .Include(t => t.User)
            .SingleOrDefaultAsync(t => t.Token == request.RefreshToken, cancellationToken);

        if (refreshToken is null || refreshToken.IsExpired || refreshToken.IsRevoked)
        {
            return Unauthorized(new { message = "Refresh token is invalid." });
        }

        refreshToken.RevokedAt = DateTimeOffset.UtcNow;

        var user = refreshToken.User;
        var tokenPair = _tokenService.CreateTokenPair(new UserDescriptor(user.Id, user.Username, user.Email, user.TenantId), new[] { user.Role });

        _dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = tokenPair.RefreshToken.Token,
            CreatedAt = tokenPair.RefreshToken.CreatedAt,
            ExpiresAt = tokenPair.RefreshToken.ExpiresAt
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(tokenPair));
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<UserProfileResponse>> GetProfileAsync(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var user = await _dbContext.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(new UserProfileResponse(user.Id, user.Username, user.Email, user.TenantId, user.Role, user.CreatedAt));
    }

    [HttpPost("password/reset")]
    [AllowAnonymous]
    public async Task<ActionResult> RequestPasswordResetAsync([FromBody] PasswordResetRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users.SingleOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (user is null)
        {
            // respond with success to avoid user enumeration
            return Accepted();
        }

        var tokenDescriptor = _passwordResetTokenService.CreateToken(user.Id);
        _dbContext.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            Token = tokenDescriptor.Token,
            CreatedAt = tokenDescriptor.CreatedAt,
            ExpiresAt = tokenDescriptor.ExpiresAt
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Accepted(new
        {
            message = "Password reset token generated.",
            token = tokenDescriptor.Token,
            expiresAt = tokenDescriptor.ExpiresAt
        });
    }

    [HttpPost("password/reset/confirm")]
    [AllowAnonymous]
    public async Task<ActionResult> ConfirmPasswordResetAsync([FromBody] PasswordResetConfirmRequest request, CancellationToken cancellationToken)
    {
        var token = await _dbContext.PasswordResetTokens
            .Include(t => t.User)
            .SingleOrDefaultAsync(t => t.Token == request.Token, cancellationToken);

        if (token is null || token.RedeemedAt.HasValue || token.ExpiresAt < DateTimeOffset.UtcNow)
        {
            return BadRequest(new { message = "Password reset token is invalid." });
        }

        token.User.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        token.RedeemedAt = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static AuthTokensResponse ToResponse(TokenPair tokenPair) =>
        new("Bearer", tokenPair.AccessToken, tokenPair.AccessTokenExpiresAt, tokenPair.RefreshToken.Token, tokenPair.RefreshToken.ExpiresAt);
}
