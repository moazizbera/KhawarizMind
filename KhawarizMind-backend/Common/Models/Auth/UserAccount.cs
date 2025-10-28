using DocumentManagementSystem.Common.Authentication;

namespace DocumentManagementSystem.Common.Models.Auth;

public class UserAccount
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public List<string> Roles { get; set; } = new();
}
