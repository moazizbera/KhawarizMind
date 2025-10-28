using System.ComponentModel.DataAnnotations;

namespace DocumentManagementSystem.AuthService.Models.Requests;

public class PasswordResetConfirmRequest
{
    [Required]
    public string Token { get; set; } = default!;

    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = default!;
}
