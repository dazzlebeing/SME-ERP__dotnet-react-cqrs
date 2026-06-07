using Shree.Domain.Common;

namespace Shree.Domain.Entities;

public class Advance : BaseEntity
{
    public int EmployeeId { get; set; }
    public DateTime Date { get; set; }
    public decimal TakenAmount { get; set; }
    public decimal ReturnedAmount { get; set; }
    public decimal TotalDue { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
}
