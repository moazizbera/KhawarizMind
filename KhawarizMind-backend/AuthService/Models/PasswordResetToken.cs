using System.ComponentModel.DataAnnotations;

namespace DocumentManagementSystem.AuthService.Models;

public class PasswordResetToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    public User User { get; set; } = default!;

    [Required]
    public string Token { get; set; } = default!;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? RedeemedAt { get; set; }
}
