using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Shree.Infrastructure.Identity;

namespace Shree.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(ShreeDbContext context, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
    {
        // Apply any pending migrations
        if ((await context.Database.GetPendingMigrationsAsync()).Any())
            await context.Database.MigrateAsync();

        // Seed roles
        string[] roles = ["Admin", "Accountant", "Viewer"];
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Seed admin user
        const string adminEmail = "shree@prodevelopers.in";
        if (await userManager.FindByEmailAsync(adminEmail) == null)
        {
            var admin = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FullName = "Shree Admin",
                EmailConfirmed = true
            };
            var result = await userManager.CreateAsync(admin, "keepsmiling");
            if (result.Succeeded)
                await userManager.AddToRoleAsync(admin, "Admin");
        }

        // Seed accountant user
        const string accountantEmail = "admin@prodevelopers.in";
        if (await userManager.FindByEmailAsync(accountantEmail) == null)
        {
            var accountant = new ApplicationUser
            {
                UserName = accountantEmail,
                Email = accountantEmail,
                FullName = "Shree Accountant",
                EmailConfirmed = true
            };
            var result = await userManager.CreateAsync(accountant, "keepsmiling");
            if (result.Succeeded)
                await userManager.AddToRoleAsync(accountant, "Accountant");
        }
    }
}
