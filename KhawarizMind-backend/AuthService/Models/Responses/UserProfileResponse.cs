namespace DocumentManagementSystem.AuthService.Models.Responses;

public record UserProfileResponse(
    Guid Id,
    string Username,
    string Email,
    Guid TenantId,
    string Role,
    DateTimeOffset CreatedAt
);
