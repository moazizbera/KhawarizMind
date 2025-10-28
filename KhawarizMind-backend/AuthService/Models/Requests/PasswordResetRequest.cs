using System.ComponentModel.DataAnnotations;

namespace DocumentManagementSystem.AuthService.Models.Requests;

public class PasswordResetRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = default!;
}
