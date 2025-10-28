using System.ComponentModel.DataAnnotations;

namespace DocumentManagementSystem.AuthService.Models.Requests;

public class RefreshRequest
{
    [Required]
    public string RefreshToken { get; set; } = default!;
}
