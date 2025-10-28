using System.ComponentModel.DataAnnotations;
using DocumentManagementSystem.Common.Authentication;

namespace DocumentManagementSystem.AuthService.Models.Requests;

public class RegisterRequest
{
    [Required]
    [MaxLength(128)]
    public string Username { get; set; } = default!;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = default!;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = default!;

    public Guid? TenantId { get; set; }

    [MaxLength(64)]
    public string Role { get; set; } = Roles.User;
}
