using Shree.Domain.Common;

namespace Shree.Domain.Entities;

public class Company : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Gstin { get; set; }
    public string? ContactPerson1 { get; set; }
    public string? ContactNumber1 { get; set; }
    public string? ContactPerson2 { get; set; }
    public string? ContactNumber2 { get; set; }

    // Navigation
    public ICollection<Gatepass> Gatepasses { get; set; } = new List<Gatepass>();
    public ICollection<Bill> Bills { get; set; } = new List<Bill>();
    public ICollection<Chalan> Chalans { get; set; } = new List<Chalan>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
