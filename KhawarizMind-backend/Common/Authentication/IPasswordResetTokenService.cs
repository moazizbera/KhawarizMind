namespace DocumentManagementSystem.Common.Authentication;

public interface IPasswordResetTokenService
{
    PasswordResetTokenDescriptor CreateToken(Guid userId);
}
