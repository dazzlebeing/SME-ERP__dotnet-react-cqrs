using Shree.Domain.Common;

namespace Shree.Domain.Entities;

public class SalaryRecord : BaseEntity
{
    public int EmployeeId { get; set; }
    public decimal WorkingDays { get; set; }
    public DateTime Date { get; set; }          // salary month (use first day of month)
    public decimal Amount { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
}
