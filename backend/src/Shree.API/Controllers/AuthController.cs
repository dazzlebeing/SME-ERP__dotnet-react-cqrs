using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shree.Application.Features.Auth;
using System.Security.Claims;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    public AuthController(IMediator mediator) => _mediator = mediator;

    /// <summary>Login with email + password. Refresh token set as HttpOnly cookie.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginCommand command)
    {
        var result = await _mediator.Send(command);
        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(new { result.AccessToken, result.ExpiresIn, tokenType = "Bearer" });
    }

    /// <summary>Get a new access token using the HttpOnly refresh token cookie.</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrWhiteSpace(refreshToken))
            return Unauthorized(new { message = "Refresh token missing" });

        var result = await _mediator.Send(new RefreshTokenCommand(refreshToken));
        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(new { result.AccessToken, result.ExpiresIn, tokenType = "Bearer" });
    }

    /// <summary>Revoke the current refresh token (logout).</summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (!string.IsNullOrWhiteSpace(refreshToken))
            await _mediator.Send(new LogoutCommand(refreshToken));

        Response.Cookies.Delete("refreshToken");
        return NoContent();
    }

    /// <summary>Get current user info.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();
        var user = await _mediator.Send(new GetCurrentUserQuery(userId));
        if (user == null) return NotFound();
        return Ok(user);
    }

    /// <summary>Change own password.</summary>
    [HttpPut("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();
        await _mediator.Send(new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword));
        return NoContent();
    }

    private void SetRefreshTokenCookie(string token)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }
}

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
