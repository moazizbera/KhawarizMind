using System.ComponentModel.DataAnnotations;

namespace DocumentManagementSystem.Common.Authentication;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    public string Issuer { get; set; } = "KhawarizMind";

    [Required]
    public string Audience { get; set; } = "KhawarizMindClients";

    [Required]
    [StringLength(256, MinimumLength = 32)]
    public string SigningKey { get; set; } = "LocalDevelopmentSigningKey_ChangeMe1234567890";

    [Range(1, 720)]
    public int AccessTokenMinutes { get; set; } = 30;

    [Range(30, 60 * 24 * 14)]
    public int RefreshTokenMinutes { get; set; } = 60 * 24 * 7;

    [Range(5, 60 * 24)]
    public int PasswordResetTokenMinutes { get; set; } = 60;
}
