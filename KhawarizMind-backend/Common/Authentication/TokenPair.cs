namespace DocumentManagementSystem.Common.Authentication;

public record UserDescriptor(Guid UserId, string Username, string Email, Guid TenantId);

public record RefreshTokenDescriptor(string Token, DateTimeOffset ExpiresAt, DateTimeOffset CreatedAt);

public record PasswordResetTokenDescriptor(string Token, DateTimeOffset ExpiresAt, DateTimeOffset CreatedAt);

public record TokenPair(string AccessToken, DateTimeOffset AccessTokenExpiresAt, RefreshTokenDescriptor RefreshToken);
