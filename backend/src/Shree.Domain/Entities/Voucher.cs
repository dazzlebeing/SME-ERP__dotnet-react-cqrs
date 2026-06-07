using Shree.Domain.Common;

namespace Shree.Domain.Entities;

public class Voucher : BaseEntity
{
    public DateTime Date { get; set; }
    public decimal Amount { get; set; }
    public string PaidTo { get; set; } = string.Empty;
    public string? Description { get; set; }
}
