using Shree.Domain.Common;

namespace Shree.Domain.Entities;

public class BillParticular : BaseEntity
{
    public string BillNumber { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal Total { get; set; }

    // Navigation
    public Bill Bill { get; set; } = null!;
}
