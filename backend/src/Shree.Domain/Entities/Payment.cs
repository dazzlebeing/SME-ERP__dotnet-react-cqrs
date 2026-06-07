using Shree.Domain.Common;
using Shree.Domain.Enums;

namespace Shree.Domain.Entities;

public class Payment : BaseEntity
{
    public DateTime PaymentDate { get; set; }
    public int CompanyId { get; set; }
    public PaymentMode ModeOfPayment { get; set; }
    public decimal PaymentAmount { get; set; }
    public string? PaidBills { get; set; }   // JSON: [{invoice, amt}]
    public string? Description { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
}
