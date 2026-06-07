using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shree.Infrastructure.Identity;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;

    public UsersController(UserManager<ApplicationUser> um, RoleManager<IdentityRole> rm)
    { _userManager = um; _roleManager = rm; }

    /// <summary>List all application users (Admin only).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userManager.Users.OrderBy(u => u.Email).ToListAsync();
        var result = new List<object>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            result.Add(new
            {
                id = u.Id,
                email = u.Email,
                roles = roles,
                createdAt = u.CreatedAt,
                lockoutEnabled = u.LockoutEnabled
            });
        }
        return Ok(result);
    }

    /// <summary>Create a new user with role (Admin only).</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing != null)
            return Conflict(new { detail = "A user with this email already exists" });

        var user = new ApplicationUser { UserName = request.Email, Email = request.Email, EmailConfirmed = true, CreatedAt = DateTime.UtcNow };
        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { detail = string.Join("; ", result.Errors.Select(e => e.Description)) });

        var role = string.IsNullOrWhiteSpace(request.Role) ? "Viewer" : request.Role;
        if (await _roleManager.RoleExistsAsync(role))
            await _userManager.AddToRoleAsync(user, role);

        return CreatedAtAction(nameof(GetAll), new { }, new { id = user.Id, email = user.Email });
    }

    /// <summary>Update a user's role (Admin only).</summary>
    [HttpPatch("{id}/role")]
    public async Task<IActionResult> UpdateRole(string id, [FromBody] UpdateRoleRequest request)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        var currentRoles = await _userManager.GetRolesAsync(user);
        await _userManager.RemoveFromRolesAsync(user, currentRoles);

        if (await _roleManager.RoleExistsAsync(request.Role))
            await _userManager.AddToRoleAsync(user, request.Role);

        return NoContent();
    }

    /// <summary>Reset a user's password (Admin only).</summary>
    [HttpPatch("{id}/password")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { detail = string.Join("; ", result.Errors.Select(e => e.Description)) });

        return NoContent();
    }

    /// <summary>Delete a user (Admin only). Cannot delete self.</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        // Prevent self-deletion
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (user.Id == currentUserId)
            return BadRequest(new { detail = "Cannot delete your own account" });

        await _userManager.DeleteAsync(user);
        return NoContent();
    }
}

public record CreateUserRequest(string Email, string Password, string? Role);
public record UpdateRoleRequest(string Role);
public record ResetPasswordRequest(string Password);
