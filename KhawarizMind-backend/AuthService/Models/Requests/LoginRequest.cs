using System.ComponentModel.DataAnnotations;

namespace DocumentManagementSystem.AuthService.Models.Requests;

public class LoginRequest
{
    [Required]
    public string UsernameOrEmail { get; set; } = default!;

    [Required]
    public string Password { get; set; } = default!;
}
