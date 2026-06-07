using Shree.Domain.Common;
using Shree.Domain.Enums;

namespace Shree.Domain.Entities;

public class Bill : BaseEntity
{
    public DateTime BillDate { get; set; }
    public string BillNumber { get; set; } = string.Empty;
    public string? HsnCode { get; set; }
    public int CompanyId { get; set; }
    public string? GatepassNumber { get; set; }
    public string? VehicleNumber { get; set; }
    public decimal BillAmount { get; set; }
    public decimal Sgst { get; set; }
    public decimal Cgst { get; set; }
    public decimal Igst { get; set; }
    public decimal BillTotal { get; set; }
    public decimal RoundOff { get; set; }
    public BillStatus BillStatus { get; set; } = BillStatus.Active;
    public string? Remarks { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public decimal PaymentReceived { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
    public Gatepass? Gatepass { get; set; }
    public ICollection<BillParticular> Particulars { get; set; } = new List<BillParticular>();
}
