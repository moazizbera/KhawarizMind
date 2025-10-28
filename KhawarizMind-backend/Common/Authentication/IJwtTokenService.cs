namespace DocumentManagementSystem.Common.Authentication;

public interface IJwtTokenService
{
    TokenPair CreateTokenPair(UserDescriptor user, IEnumerable<string> roles, IEnumerable<KeyValuePair<string, string>>? additionalClaims = null);
    RefreshTokenDescriptor CreateRefreshToken(Guid userId);
}
