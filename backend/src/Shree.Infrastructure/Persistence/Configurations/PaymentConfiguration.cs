using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shree.Domain.Entities;

namespace Shree.Infrastructure.Persistence.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.PaymentAmount).HasColumnType("decimal(12,2)");
        builder.Property(e => e.ModeOfPayment).HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.PaidBills).HasColumnType("nvarchar(max)");
        builder.HasOne(e => e.Company)
               .WithMany(c => c.Payments)
               .HasForeignKey(e => e.CompanyId)
               .OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}
