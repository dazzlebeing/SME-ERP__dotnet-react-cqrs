using Shree.Domain.Common;

namespace Shree.Domain.Entities;

public class Chalan : BaseEntity
{
    public DateTime Date { get; set; }
    public int CompanyId { get; set; }
    public string GatepassNumber { get; set; } = string.Empty;
    public string? VehicleNumber { get; set; }
    public string? RollsInfo { get; set; }  // JSON: [{quantity, description}]

    // Navigation
    public Company Company { get; set; } = null!;
    public Gatepass Gatepass { get; set; } = null!;
}
