using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Domain.Enums;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Reports;

// --- GSTR-1 (Outward Supplies / Sales) ---
public record Gstr1ItemDto(
    string BillNumber, DateTime BillDate, string CompanyName, string? CompanyGstin,
    decimal TaxableAmount, decimal Cgst, decimal Sgst, decimal Igst, decimal Total);

public record GetGstr1Query(int Month, int Year) : IRequest<List<Gstr1ItemDto>>;
public class GetGstr1QueryHandler : IRequestHandler<GetGstr1Query, List<Gstr1ItemDto>>
{
    private readonly ShreeDbContext _db;
    public GetGstr1QueryHandler(ShreeDbContext db) => _db = db;
    public async Task<List<Gstr1ItemDto>> Handle(GetGstr1Query q, CancellationToken ct) =>
        await _db.Bills.Include(b => b.Company).AsNoTracking()
            .Where(b => b.BillDate.Month == q.Month && b.BillDate.Year == q.Year
                && b.BillStatus == BillStatus.Active)
            .OrderBy(b => b.BillDate).ThenBy(b => b.BillNumber)
            .Select(b => new Gstr1ItemDto(b.BillNumber, b.BillDate, b.Company.Name, b.Company.Gstin,
                b.BillAmount, b.Cgst, b.Sgst, b.Igst, b.BillTotal))
            .ToListAsync(ct);
}

// --- GSTR-2 (Inward Supplies / Purchases) ---
public record Gstr2ItemDto(
    string? InvoiceNumber, DateTime Date, string VendorName, string? VendorGstin,
    decimal TaxableAmount, decimal TaxPercentage, decimal Cgst, decimal Sgst, decimal Igst, decimal Total);

public record GetGstr2Query(int Month, int Year) : IRequest<List<Gstr2ItemDto>>;
public class GetGstr2QueryHandler : IRequestHandler<GetGstr2Query, List<Gstr2ItemDto>>
{
    private readonly ShreeDbContext _db;
    public GetGstr2QueryHandler(ShreeDbContext db) => _db = db;
    public async Task<List<Gstr2ItemDto>> Handle(GetGstr2Query q, CancellationToken ct) =>
        await _db.Expenses.Include(e => e.Vendor).AsNoTracking()
            .Where(e => e.Date.Month == q.Month && e.Date.Year == q.Year)
            .OrderBy(e => e.Date)
            .Select(e => new Gstr2ItemDto(e.InvoiceNumber, e.Date, e.Vendor.Name, e.Vendor.Gstin,
                e.Amount, e.TaxPercentage, e.Cgst, e.Sgst, e.Igst, e.Total))
            .ToListAsync(ct);
}

// --- GSTR-3B (Summary) ---
public record Gstr3bDto(
    int Month, int Year,
    decimal TotalSales, decimal SalesCgst, decimal SalesSgst, decimal SalesIgst,
    decimal TotalPurchases, decimal PurchaseCgst, decimal PurchaseSgst, decimal PurchaseIgst,
    decimal NetTaxPayable);

public record GetGstr3bQuery(int Month, int Year) : IRequest<Gstr3bDto>;
public class GetGstr3bQueryHandler : IRequestHandler<GetGstr3bQuery, Gstr3bDto>
{
    private readonly ShreeDbContext _db;
    public GetGstr3bQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<Gstr3bDto> Handle(GetGstr3bQuery q, CancellationToken ct)
    {
        var sales = await _db.Bills.AsNoTracking()
            .Where(b => b.BillDate.Month == q.Month && b.BillDate.Year == q.Year && b.BillStatus == BillStatus.Active)
            .GroupBy(b => 1)
            .Select(g => new { Total = g.Sum(b => b.BillTotal), Cgst = g.Sum(b => b.Cgst), Sgst = g.Sum(b => b.Sgst), Igst = g.Sum(b => b.Igst) })
            .FirstOrDefaultAsync(ct);

        var purchases = await _db.Expenses.AsNoTracking()
            .Where(e => e.Date.Month == q.Month && e.Date.Year == q.Year)
            .GroupBy(e => 1)
            .Select(g => new { Total = g.Sum(e => e.Total), Cgst = g.Sum(e => e.Cgst), Sgst = g.Sum(e => e.Sgst), Igst = g.Sum(e => e.Igst) })
            .FirstOrDefaultAsync(ct);

        var salesCgst = sales?.Cgst ?? 0;
        var salesSgst = sales?.Sgst ?? 0;
        var salesIgst = sales?.Igst ?? 0;
        var purCgst = purchases?.Cgst ?? 0;
        var purSgst = purchases?.Sgst ?? 0;
        var purIgst = purchases?.Igst ?? 0;

        var netTax = (salesCgst - purCgst) + (salesSgst - purSgst) + (salesIgst - purIgst);

        return new Gstr3bDto(
            q.Month, q.Year,
            sales?.Total ?? 0, salesCgst, salesSgst, salesIgst,
            purchases?.Total ?? 0, purCgst, purSgst, purIgst,
            netTax);
    }
}

// --- Sales Report ---
public record SalesReportItemDto(string BillNumber, DateTime BillDate, string CompanyName,
    decimal BillAmount, decimal Cgst, decimal Sgst, decimal Igst, decimal BillTotal,
    string PaymentStatus, decimal PaymentReceived);

public record SalesReportSummaryDto(
    int Month, int Year, int TotalBills,
    decimal TotalSales, decimal TotalTax, decimal TotalReceived, decimal TotalPending,
    List<SalesReportItemDto> Items);

public record GetSalesReportQuery(int Month, int Year, int? CompanyId = null)
    : IRequest<SalesReportSummaryDto>;
public class GetSalesReportQueryHandler : IRequestHandler<GetSalesReportQuery, SalesReportSummaryDto>
{
    private readonly ShreeDbContext _db;
    public GetSalesReportQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<SalesReportSummaryDto> Handle(GetSalesReportQuery q, CancellationToken ct)
    {
        var query = _db.Bills.Include(b => b.Company).AsNoTracking()
            .Where(b => b.BillDate.Month == q.Month && b.BillDate.Year == q.Year
                && b.BillStatus == BillStatus.Active);
        if (q.CompanyId.HasValue) query = query.Where(b => b.CompanyId == q.CompanyId.Value);

        var items = await query.OrderBy(b => b.BillDate).ThenBy(b => b.BillNumber)
            .Select(b => new SalesReportItemDto(b.BillNumber, b.BillDate, b.Company.Name,
                b.BillAmount, b.Cgst, b.Sgst, b.Igst, b.BillTotal,
                b.PaymentStatus.ToString(), b.PaymentReceived))
            .ToListAsync(ct);

        return new SalesReportSummaryDto(
            q.Month, q.Year, items.Count,
            items.Sum(i => i.BillTotal),
            items.Sum(i => i.Cgst + i.Sgst + i.Igst),
            items.Sum(i => i.PaymentReceived),
            items.Sum(i => i.BillTotal - i.PaymentReceived),
            items);
    }
}

// --- Purchase Report ---
public record PurchaseReportItemDto(string? InvoiceNumber, DateTime Date, string VendorName,
    decimal Amount, decimal TaxPercentage, decimal Cgst, decimal Sgst, decimal Igst, decimal Total, string? Description);

public record PurchaseReportSummaryDto(
    int Month, int Year, int TotalExpenses,
    decimal TotalAmount, decimal TotalTax,
    List<PurchaseReportItemDto> Items);

public record GetPurchaseReportQuery(int Month, int Year, int? VendorId = null)
    : IRequest<PurchaseReportSummaryDto>;
public class GetPurchaseReportQueryHandler : IRequestHandler<GetPurchaseReportQuery, PurchaseReportSummaryDto>
{
    private readonly ShreeDbContext _db;
    public GetPurchaseReportQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PurchaseReportSummaryDto> Handle(GetPurchaseReportQuery q, CancellationToken ct)
    {
        var query = _db.Expenses.Include(e => e.Vendor).AsNoTracking()
            .Where(e => e.Date.Month == q.Month && e.Date.Year == q.Year);
        if (q.VendorId.HasValue) query = query.Where(e => e.VendorId == q.VendorId.Value);

        var items = await query.OrderBy(e => e.Date)
            .Select(e => new PurchaseReportItemDto(e.InvoiceNumber, e.Date, e.Vendor.Name,
                e.Amount, e.TaxPercentage, e.Cgst, e.Sgst, e.Igst, e.Total, e.Description))
            .ToListAsync(ct);

        return new PurchaseReportSummaryDto(
            q.Month, q.Year, items.Count,
            items.Sum(i => i.Amount),
            items.Sum(i => i.Cgst + i.Sgst + i.Igst),
            items);
    }
}

// --- Company-wise Bill & Payment report ---
public record CompanyBillsReportItemDto(string BillNumber, DateTime BillDate,
    decimal BillTotal, string PaymentStatus, decimal PaymentReceived);

public record GetCompanyBillsReportQuery(int CompanyId, int? Month = null, int? Year = null)
    : IRequest<List<CompanyBillsReportItemDto>>;
public class GetCompanyBillsReportQueryHandler : IRequestHandler<GetCompanyBillsReportQuery, List<CompanyBillsReportItemDto>>
{
    private readonly ShreeDbContext _db;
    public GetCompanyBillsReportQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<List<CompanyBillsReportItemDto>> Handle(GetCompanyBillsReportQuery q, CancellationToken ct)
    {
        var query = _db.Bills.AsNoTracking()
            .Where(b => b.CompanyId == q.CompanyId && b.BillStatus == BillStatus.Active);
        if (q.Month.HasValue) query = query.Where(b => b.BillDate.Month == q.Month.Value);
        if (q.Year.HasValue) query = query.Where(b => b.BillDate.Year == q.Year.Value);
        return await query.OrderByDescending(b => b.BillDate)
            .Select(b => new CompanyBillsReportItemDto(b.BillNumber, b.BillDate,
                b.BillTotal, b.PaymentStatus.ToString(), b.PaymentReceived))
            .ToListAsync(ct);
    }
}
