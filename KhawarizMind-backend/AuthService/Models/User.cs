using DocumentManagementSystem.Common.Authentication;
using System.ComponentModel.DataAnnotations;

namespace DocumentManagementSystem.AuthService.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(128)]
    public string Username { get; set; } = default!;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = default!;

    [Required]
    public string PasswordHash { get; set; } = default!;

    public Guid TenantId { get; set; }

    [Required]
    [MaxLength(64)]
    public string Role { get; set; } = Roles.User;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();
}
