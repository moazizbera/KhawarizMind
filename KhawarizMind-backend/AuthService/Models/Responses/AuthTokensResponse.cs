namespace DocumentManagementSystem.AuthService.Models.Responses;

public record AuthTokensResponse(
    string TokenType,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt
);
