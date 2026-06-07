using Shree.Domain.Common;

namespace Shree.Domain.Entities;

public class Expense : BaseEntity
{
    public string? InvoiceNumber { get; set; }
    public DateTime Date { get; set; }
    public decimal Amount { get; set; }
    public int VendorId { get; set; }
    public decimal TaxPercentage { get; set; }
    public decimal Cgst { get; set; }
    public decimal Sgst { get; set; }
    public decimal Igst { get; set; }
    public decimal Total { get; set; }
    public string? Description { get; set; }

    // Navigation
    public Vendor Vendor { get; set; } = null!;
}
