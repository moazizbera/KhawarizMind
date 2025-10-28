using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DocumentManagementSystem.Common.Authentication;

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;
    private readonly TimeProvider _timeProvider;

    public JwtTokenService(IOptions<JwtOptions> options, TimeProvider timeProvider)
    {
        _options = options.Value;
        _timeProvider = timeProvider;
    }

    public TokenPair CreateTokenPair(UserDescriptor user, IEnumerable<string> roles, IEnumerable<KeyValuePair<string, string>>? additionalClaims = null)
    {
        var handler = new JwtSecurityTokenHandler();
        var now = _timeProvider.GetUtcNow();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("tenant_id", user.TenantId.ToString())
        };

        foreach (var role in roles.Where(r => !string.IsNullOrWhiteSpace(r)))
        {
            claims.Add(new Claim(RoleClaims.ClaimType, role));
        }

        if (additionalClaims != null)
        {
            foreach (var kvp in additionalClaims)
            {
                claims.Add(new Claim(kvp.Key, kvp.Value));
            }
        }

        var expires = now.AddMinutes(_options.AccessTokenMinutes);
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expires.UtcDateTime,
            signingCredentials: credentials);

        var accessToken = handler.WriteToken(token);
        var refreshToken = CreateRefreshToken(user.UserId);

        return new TokenPair(accessToken, expires, refreshToken);
    }

    public RefreshTokenDescriptor CreateRefreshToken(Guid userId)
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        var token = Convert.ToBase64String(bytes);
        var now = _timeProvider.GetUtcNow();
        var expires = now.AddMinutes(_options.RefreshTokenMinutes);
        return new RefreshTokenDescriptor(token, expires, now);
    }
}
