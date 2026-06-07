using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shree.Domain.Entities;

namespace Shree.Infrastructure.Persistence.Configurations;

public class ChalanConfiguration : IEntityTypeConfiguration<Chalan>
{
    public void Configure(EntityTypeBuilder<Chalan> builder)
    {
        builder.ToTable("Chalans");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.GatepassNumber).IsRequired().HasMaxLength(100);
        builder.Property(e => e.VehicleNumber).HasMaxLength(50);
        builder.Property(e => e.RollsInfo).HasColumnType("nvarchar(max)");
        builder.HasOne(e => e.Company)
               .WithMany(c => c.Chalans)
               .HasForeignKey(e => e.CompanyId)
               .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Gatepass)
               .WithMany(g => g.Chalans)
               .HasForeignKey(e => e.GatepassNumber)
               .HasPrincipalKey(g => g.GatepassNumber)
               .OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}
