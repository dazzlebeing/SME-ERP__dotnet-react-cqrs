using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Shree.Domain.Common;
using Shree.Domain.Entities;
using Shree.Domain.Interfaces;
using Shree.Infrastructure.Identity;
using System.Text.Json;

namespace Shree.Infrastructure.Persistence;

public class ShreeDbContext : IdentityDbContext<ApplicationUser>
{
    private readonly ICurrentUserService _currentUserService;

    public ShreeDbContext(DbContextOptions<ShreeDbContext> options, ICurrentUserService currentUserService)
        : base(options)
    {
        _currentUserService = currentUserService;
    }

    // Business entities
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Gatepass> Gatepasses => Set<Gatepass>();
    public DbSet<Chalan> Chalans => Set<Chalan>();
    public DbSet<Bill> Bills => Set<Bill>();
    public DbSet<BillParticular> BillParticulars => Set<BillParticular>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<SalaryRecord> SalaryRecords => Set<SalaryRecord>();
    public DbSet<Advance> Advances => Set<Advance>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ShreeDbContext).Assembly);

        // Soft delete global filter for BaseEntity
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = System.Linq.Expressions.Expression.Parameter(entityType.ClrType, "e");
                var prop = System.Linq.Expressions.Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
                var filter = System.Linq.Expressions.Expression.Lambda(
                    System.Linq.Expressions.Expression.Not(prop), parameter);
                entityType.SetQueryFilter(filter);
            }
        }
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var auditEntries = OnBeforeSaveChanges();
        var result = await base.SaveChangesAsync(cancellationToken);
        await OnAfterSaveChangesAsync(auditEntries, cancellationToken);
        return result;
    }

    private List<AuditEntry> OnBeforeSaveChanges()
    {
        ChangeTracker.DetectChanges();
        var auditEntries = new List<AuditEntry>();
        var now = DateTime.UtcNow;
        var userEmail = _currentUserService.UserEmail ?? "system";
        var userId = _currentUserService.UserId ?? "system";

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is AuditLog || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                continue;

            // Auto-set timestamps and audit fields for BaseEntity
            if (entry.Entity is BaseEntity baseEntity)
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        baseEntity.CreatedAt = now;
                        baseEntity.CreatedBy = userEmail;
                        break;
                    case EntityState.Modified:
                        baseEntity.UpdatedAt = now;
                        baseEntity.UpdatedBy = userEmail;
                        // Handle soft delete
                        if (baseEntity.IsDeleted && !baseEntity.DeletedAt.HasValue)
                        {
                            baseEntity.DeletedAt = now;
                            baseEntity.DeletedBy = userEmail;
                        }
                        break;
                    case EntityState.Deleted:
                        // Convert hard delete to soft delete
                        entry.State = EntityState.Modified;
                        baseEntity.IsDeleted = true;
                        baseEntity.DeletedAt = now;
                        baseEntity.DeletedBy = userEmail;
                        break;
                }
            }

            // Build audit entry
            var auditEntry = new AuditEntry
            {
                TableName = entry.Metadata.GetTableName() ?? entry.Entity.GetType().Name,
                Action = entry.State.ToString(),
                UserId = userId,
                UserEmail = userEmail,
                Timestamp = now
            };

            foreach (var prop in entry.Properties)
            {
                if (prop.IsTemporary) { auditEntry.HasTemporaryProperties = true; continue; }
                var propName = prop.Metadata.Name;
                switch (entry.State)
                {
                    case EntityState.Added:
                        auditEntry.NewValues[propName] = prop.CurrentValue;
                        if (prop.Metadata.IsPrimaryKey()) auditEntry.KeyValues[propName] = prop.CurrentValue;
                        break;
                    case EntityState.Deleted:
                    case EntityState.Modified:
                        if (prop.Metadata.IsPrimaryKey()) auditEntry.KeyValues[propName] = prop.CurrentValue;
                        if (prop.IsModified)
                        {
                            auditEntry.OldValues[propName] = prop.OriginalValue;
                            auditEntry.NewValues[propName] = prop.CurrentValue;
                            auditEntry.ChangedColumns.Add(propName);
                        }
                        break;
                }
            }
            auditEntries.Add(auditEntry);
        }

        // Save entries without temporary properties immediately
        foreach (var auditEntry in auditEntries.Where(a => !a.HasTemporaryProperties))
        {
            AuditLogs.Add(auditEntry.ToAuditLog());
        }

        return auditEntries.Where(a => a.HasTemporaryProperties).ToList();
    }

    private async Task OnAfterSaveChangesAsync(List<AuditEntry> auditEntries, CancellationToken ct)
    {
        if (!auditEntries.Any()) return;
        foreach (var auditEntry in auditEntries)
        {
            foreach (var prop in auditEntry.TemporaryProperties)
            {
                if (prop.Metadata.IsPrimaryKey())
                    auditEntry.KeyValues[prop.Metadata.Name] = prop.CurrentValue;
                else
                    auditEntry.NewValues[prop.Metadata.Name] = prop.CurrentValue;
            }
            AuditLogs.Add(auditEntry.ToAuditLog());
        }
        await base.SaveChangesAsync(ct);
    }
}

internal class AuditEntry
{
    public string TableName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string? UserEmail { get; set; }
    public DateTime Timestamp { get; set; }
    public bool HasTemporaryProperties { get; set; }
    public Dictionary<string, object?> KeyValues { get; } = new();
    public Dictionary<string, object?> OldValues { get; } = new();
    public Dictionary<string, object?> NewValues { get; } = new();
    public List<string> ChangedColumns { get; } = new();
    public List<PropertyEntry> TemporaryProperties { get; } = new();

    public AuditLog ToAuditLog() => new()
    {
        TableName = TableName,
        RecordId = KeyValues.Count > 0 ? JsonSerializer.Serialize(KeyValues) : null,
        Action = Action,
        OldValues = OldValues.Count > 0 ? JsonSerializer.Serialize(OldValues) : null,
        NewValues = NewValues.Count > 0 ? JsonSerializer.Serialize(NewValues) : null,
        ChangedColumns = ChangedColumns.Count > 0 ? string.Join(",", ChangedColumns) : null,
        UserId = UserId,
        UserEmail = UserEmail,
        Timestamp = Timestamp
    };
}
