using Shree.Domain.Common;
using Shree.Domain.Enums;

namespace Shree.Domain.Entities;

public class Gatepass : BaseEntity
{
    public int CompanyId { get; set; }
    public string GatepassNumber { get; set; } = string.Empty;
    public DateTime GatepassDate { get; set; }
    public string? RollsInfo { get; set; }  // JSON: [{quantity, description}]
    public GatepassStatus Status { get; set; } = GatepassStatus.Pending;

    // Navigation
    public Company Company { get; set; } = null!;
    public ICollection<Chalan> Chalans { get; set; } = new List<Chalan>();
    public ICollection<Bill> Bills { get; set; } = new List<Bill>();
}
