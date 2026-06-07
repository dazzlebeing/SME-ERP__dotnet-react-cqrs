using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shree.Domain.Entities;

namespace Shree.Infrastructure.Persistence.Configurations;

public class BillConfiguration : IEntityTypeConfiguration<Bill>
{
    public void Configure(EntityTypeBuilder<Bill> builder)
    {
        builder.ToTable("Bills");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.BillNumber).IsRequired().HasMaxLength(100);
        builder.HasIndex(e => e.BillNumber).IsUnique();
        builder.Property(e => e.BillAmount).HasColumnType("decimal(12,2)");
        builder.Property(e => e.Sgst).HasColumnType("decimal(12,2)");
        builder.Property(e => e.Cgst).HasColumnType("decimal(12,2)");
        builder.Property(e => e.Igst).HasColumnType("decimal(12,2)");
        builder.Property(e => e.BillTotal).HasColumnType("decimal(12,2)");
        builder.Property(e => e.RoundOff).HasColumnType("decimal(12,2)");
        builder.Property(e => e.PaymentReceived).HasColumnType("decimal(12,2)");
        builder.Property(e => e.HsnCode).HasMaxLength(50);
        builder.Property(e => e.VehicleNumber).HasMaxLength(50);
        builder.HasOne(e => e.Company)
               .WithMany(c => c.Bills)
               .HasForeignKey(e => e.CompanyId)
               .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Gatepass)
               .WithMany(g => g.Bills)
               .HasForeignKey(e => e.GatepassNumber)
               .HasPrincipalKey(g => g.GatepassNumber)
               .OnDelete(DeleteBehavior.SetNull)
               .IsRequired(false);
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class BillParticularConfiguration : IEntityTypeConfiguration<BillParticular>
{
    public void Configure(EntityTypeBuilder<BillParticular> builder)
    {
        builder.ToTable("BillParticulars");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Quantity).HasColumnType("decimal(10,2)");
        builder.Property(e => e.Price).HasColumnType("decimal(12,2)");
        builder.Property(e => e.Total).HasColumnType("decimal(12,2)");
        builder.HasOne(e => e.Bill)
               .WithMany(b => b.Particulars)
               .HasForeignKey(e => e.BillNumber)
               .HasPrincipalKey(b => b.BillNumber)
               .OnDelete(DeleteBehavior.Cascade);
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}
