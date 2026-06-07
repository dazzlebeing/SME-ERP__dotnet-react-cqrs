using Shree.Domain.Common;

namespace Shree.Domain.Entities;

public class Employee : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Qualification { get; set; }
    public string? MobileNumber { get; set; }
    public string? Aadhar { get; set; }
    public DateTime? JoiningDate { get; set; }
    public decimal Salary { get; set; }

    // Navigation
    public ICollection<SalaryRecord> SalaryRecords { get; set; } = new List<SalaryRecord>();
    public ICollection<Advance> Advances { get; set; } = new List<Advance>();
}
