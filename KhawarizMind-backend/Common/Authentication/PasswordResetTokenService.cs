using System.Security.Cryptography;
using Microsoft.Extensions.Options;

namespace DocumentManagementSystem.Common.Authentication;

public class PasswordResetTokenService : IPasswordResetTokenService
{
    private readonly JwtOptions _options;
    private readonly TimeProvider _timeProvider;

    public PasswordResetTokenService(IOptions<JwtOptions> options, TimeProvider timeProvider)
    {
        _options = options.Value;
        _timeProvider = timeProvider;
    }

    public PasswordResetTokenDescriptor CreateToken(Guid userId)
    {
        var buffer = new byte[48];
        RandomNumberGenerator.Fill(buffer);
        var token = Convert.ToBase64String(buffer);
        var createdAt = _timeProvider.GetUtcNow();
        var expiresAt = createdAt.AddMinutes(_options.PasswordResetTokenMinutes);
        return new PasswordResetTokenDescriptor(token, expiresAt, createdAt);
    }
}
