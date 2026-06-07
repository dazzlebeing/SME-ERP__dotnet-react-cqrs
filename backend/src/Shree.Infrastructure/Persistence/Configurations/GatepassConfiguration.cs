using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shree.Domain.Entities;

namespace Shree.Infrastructure.Persistence.Configurations;

public class GatepassConfiguration : IEntityTypeConfiguration<Gatepass>
{
    public void Configure(EntityTypeBuilder<Gatepass> builder)
    {
        builder.ToTable("Gatepasses");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.GatepassNumber).IsRequired().HasMaxLength(100);
        builder.HasIndex(e => e.GatepassNumber).IsUnique();
        builder.Property(e => e.RollsInfo).HasColumnType("nvarchar(max)");
        builder.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
        builder.HasOne(e => e.Company)
               .WithMany(c => c.Gatepasses)
               .HasForeignKey(e => e.CompanyId)
               .OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}
