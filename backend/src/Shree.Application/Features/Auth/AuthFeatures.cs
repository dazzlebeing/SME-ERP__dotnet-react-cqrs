using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Shree.Infrastructure.Identity;
using Shree.Infrastructure.Persistence;
using Shree.Infrastructure.Services;

namespace Shree.Application.Features.Auth;

// DTOs
public record AuthTokensDto(string AccessToken, string RefreshToken, int ExpiresIn);
public record CurrentUserDto(string Id, string Email, string? FullName, IList<string> Roles);

// Commands
public record LoginCommand(string Email, string Password) : IRequest<AuthTokensDto>;
public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}
public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthTokensDto>
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly JwtTokenService _jwtService;

    public LoginCommandHandler(UserManager<ApplicationUser> um,
        SignInManager<ApplicationUser> sm, JwtTokenService jwt)
    { _userManager = um; _signInManager = sm; _jwtService = jwt; }

    public async Task<AuthTokensDto> Handle(LoginCommand cmd, CancellationToken ct)
    {
        var user = await _userManager.FindByEmailAsync(cmd.Email)
            ?? throw new UnauthorizedAccessException("Invalid credentials");

        var result = await _signInManager.CheckPasswordSignInAsync(user, cmd.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            if (result.IsLockedOut) throw new UnauthorizedAccessException("Account is locked out. Try again later.");
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        var accessToken = await _jwtService.GenerateAccessTokenAsync(user);
        var refreshToken = await _jwtService.GenerateRefreshTokenAsync(user.Id);
        return new AuthTokensDto(accessToken, refreshToken.Token, 15 * 60);
    }
}

public record RefreshTokenCommand(string Token) : IRequest<AuthTokensDto>;
public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthTokensDto>
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtTokenService _jwtService;
    private readonly ShreeDbContext _db;

    public RefreshTokenCommandHandler(UserManager<ApplicationUser> um,
        JwtTokenService jwt, ShreeDbContext db)
    { _userManager = um; _jwtService = jwt; _db = db; }

    public async Task<AuthTokensDto> Handle(RefreshTokenCommand cmd, CancellationToken ct)
    {
        var storedToken = await _db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == cmd.Token, ct)
            ?? throw new UnauthorizedAccessException("Invalid refresh token");

        if (!storedToken.IsActive)
            throw new UnauthorizedAccessException("Refresh token has expired or been revoked");

        // Revoke old token
        storedToken.IsRevoked = true;
        await _db.SaveChangesAsync(ct);

        var user = storedToken.User;
        var accessToken = await _jwtService.GenerateAccessTokenAsync(user);
        var newRefreshToken = await _jwtService.GenerateRefreshTokenAsync(user.Id);
        return new AuthTokensDto(accessToken, newRefreshToken.Token, 15 * 60);
    }
}

public record LogoutCommand(string Token) : IRequest;
public class LogoutCommandHandler : IRequestHandler<LogoutCommand>
{
    private readonly ShreeDbContext _db;
    public LogoutCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(LogoutCommand cmd, CancellationToken ct)
    {
        var token = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == cmd.Token, ct);
        if (token == null) return;
        token.IsRevoked = true;
        await _db.SaveChangesAsync(ct);
    }
}

public record ChangePasswordCommand(string UserId, string CurrentPassword, string NewPassword) : IRequest;
public class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordCommandValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8);
    }
}
public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand>
{
    private readonly UserManager<ApplicationUser> _userManager;
    public ChangePasswordCommandHandler(UserManager<ApplicationUser> um) => _userManager = um;
    public async Task Handle(ChangePasswordCommand cmd, CancellationToken ct)
    {
        var user = await _userManager.FindByIdAsync(cmd.UserId) ?? throw new KeyNotFoundException("User not found");
        var result = await _userManager.ChangePasswordAsync(user, cmd.CurrentPassword, cmd.NewPassword);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
    }
}

// Queries
public record GetCurrentUserQuery(string UserId) : IRequest<CurrentUserDto?>;
public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, CurrentUserDto?>
{
    private readonly UserManager<ApplicationUser> _userManager;
    public GetCurrentUserQueryHandler(UserManager<ApplicationUser> um) => _userManager = um;
    public async Task<CurrentUserDto?> Handle(GetCurrentUserQuery q, CancellationToken ct)
    {
        var user = await _userManager.FindByIdAsync(q.UserId);
        if (user == null) return null;
        var roles = await _userManager.GetRolesAsync(user);
        return new CurrentUserDto(user.Id, user.Email!, user.FullName, roles);
    }
}
