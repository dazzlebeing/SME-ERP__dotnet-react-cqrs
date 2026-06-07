using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shree.Domain.Entities;

namespace Shree.Infrastructure.Persistence.Configurations;

public class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> builder)
    {
        builder.ToTable("Companies");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(255);
        builder.Property(e => e.Address).HasMaxLength(1000);
        builder.Property(e => e.Gstin).HasMaxLength(20);
        builder.Property(e => e.ContactPerson1).HasMaxLength(255);
        builder.Property(e => e.ContactNumber1).HasMaxLength(50);
        builder.Property(e => e.ContactPerson2).HasMaxLength(255);
        builder.Property(e => e.ContactNumber2).HasMaxLength(50);
        builder.HasIndex(e => e.Name);
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}
