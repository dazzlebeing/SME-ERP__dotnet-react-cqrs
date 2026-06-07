using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shree.Domain.Entities;

namespace Shree.Infrastructure.Persistence.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("Employees");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(255);
        builder.Property(e => e.MobileNumber).HasMaxLength(20);
        builder.Property(e => e.Aadhar).HasMaxLength(20);
        builder.Property(e => e.Salary).HasColumnType("decimal(12,2)");
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class SalaryRecordConfiguration : IEntityTypeConfiguration<SalaryRecord>
{
    public void Configure(EntityTypeBuilder<SalaryRecord> builder)
    {
        builder.ToTable("SalaryRecords");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.WorkingDays).HasColumnType("decimal(5,2)");
        builder.Property(e => e.Amount).HasColumnType("decimal(12,2)");
        builder.HasOne(e => e.Employee)
               .WithMany(emp => emp.SalaryRecords)
               .HasForeignKey(e => e.EmployeeId)
               .OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}

public class AdvanceConfiguration : IEntityTypeConfiguration<Advance>
{
    public void Configure(EntityTypeBuilder<Advance> builder)
    {
        builder.ToTable("Advances");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.TakenAmount).HasColumnType("decimal(12,2)");
        builder.Property(e => e.ReturnedAmount).HasColumnType("decimal(12,2)");
        builder.Property(e => e.TotalDue).HasColumnType("decimal(12,2)");
        builder.HasOne(e => e.Employee)
               .WithMany(emp => emp.Advances)
               .HasForeignKey(e => e.EmployeeId)
               .OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}
