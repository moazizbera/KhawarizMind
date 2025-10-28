namespace DocumentManagementSystem.Common.Authentication;

public class JwtOptions
{
    public string Issuer { get; set; } = "KhawarizMind";
    public string Audience { get; set; } = "KhawarizMind";
    public string SecretKey { get; set; } = "super-secret-development-key-change-me";
    public int ExpirationMinutes { get; set; } = 120;
}
