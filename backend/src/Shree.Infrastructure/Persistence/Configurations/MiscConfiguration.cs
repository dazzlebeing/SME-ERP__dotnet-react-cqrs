using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shree.Domain.Entities;
using Shree.Infrastructure.Identity;

namespace Shree.Infrastructure.Persistence.Configurations;

public class VendorConfiguration : IEntityTypeConfiguration<Vendor>
{
    public void Configure(EntityTypeBuilder<Vendor> builder)
    {
        builder.ToTable("Vendors");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(255);
        builder.Property(e => e.Gstin).HasMaxLength(20);
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> builder)
    {
        builder.ToTable("Expenses");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Amount).HasColumnType("decimal(12,2)");
        builder.Property(e => e.Cgst).HasColumnType("decimal(12,2)");
        builder.Property(e => e.Sgst).HasColumnType("decimal(12,2)");
        builder.Property(e => e.Igst).HasColumnType("decimal(12,2)");
        builder.Property(e => e.Total).HasColumnType("decimal(12,2)");
        builder.Property(e => e.TaxPercentage).HasColumnType("decimal(5,2)");
        builder.HasOne(e => e.Vendor)
               .WithMany(v => v.Expenses)
               .HasForeignKey(e => e.VendorId)
               .OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class VoucherConfiguration : IEntityTypeConfiguration<Voucher>
{
    public void Configure(EntityTypeBuilder<Voucher> builder)
    {
        builder.ToTable("Vouchers");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Amount).HasColumnType("decimal(12,2)");
        builder.Property(e => e.PaidTo).HasMaxLength(255);
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedOnAdd();
        builder.Property(e => e.TableName).HasMaxLength(100);
        builder.Property(e => e.Action).HasMaxLength(20);
        builder.Property(e => e.OldValues).HasColumnType("nvarchar(max)");
        builder.Property(e => e.NewValues).HasColumnType("nvarchar(max)");
        builder.HasIndex(e => e.TableName);
        builder.HasIndex(e => e.Timestamp);
    }
}

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Token).HasMaxLength(500);
        builder.HasOne(e => e.User)
               .WithMany(u => u.RefreshTokens)
               .HasForeignKey(e => e.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
