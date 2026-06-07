using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Domain.Enums;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Dashboard;

// DTOs
public record DashboardStatsDto(
    int BillsThisMonth, decimal SalesThisMonth,
    int PendingGatepasses, decimal PendingPayments,
    int TotalEmployees, int TotalVendors, int TotalCompanies);

public record MonthlyGraphItemDto(int Month, int Year, decimal SalesAmount, decimal ExpenseAmount);

public record RecentGatepassDto(int Id, string CompanyName, string GatepassNumber,
    DateTime GatepassDate, string Status);

// Queries
public record GetDashboardStatsQuery : IRequest<DashboardStatsDto>;
public class GetDashboardStatsQueryHandler : IRequestHandler<GetDashboardStatsQuery, DashboardStatsDto>
{
    private readonly ShreeDbContext _db;
    public GetDashboardStatsQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<DashboardStatsDto> Handle(GetDashboardStatsQuery q, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1);

        var billsThisMonth = await _db.Bills.CountAsync(b => b.BillDate >= monthStart, ct);
        var salesThisMonth = await _db.Bills
            .Where(b => b.BillDate >= monthStart && b.BillStatus == BillStatus.Active)
            .SumAsync(b => (decimal?)b.BillTotal, ct) ?? 0;
        var pendingGatepasses = await _db.Gatepasses
            .CountAsync(g => g.Status == GatepassStatus.Pending, ct);
        var pendingPayments = await _db.Bills
            .Where(b => b.PaymentStatus != PaymentStatus.Paid && b.BillStatus == BillStatus.Active)
            .SumAsync(b => (decimal?)(b.BillTotal - b.PaymentReceived), ct) ?? 0;
        var totalEmployees = await _db.Employees.CountAsync(ct);
        var totalVendors = await _db.Vendors.CountAsync(ct);
        var totalCompanies = await _db.Companies.CountAsync(ct);

        return new DashboardStatsDto(billsThisMonth, salesThisMonth,
            pendingGatepasses, pendingPayments,
            totalEmployees, totalVendors, totalCompanies);
    }
}

public record GetDashboardGraphQuery(int Year) : IRequest<List<MonthlyGraphItemDto>>;
public class GetDashboardGraphQueryHandler : IRequestHandler<GetDashboardGraphQuery, List<MonthlyGraphItemDto>>
{
    private readonly ShreeDbContext _db;
    public GetDashboardGraphQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<List<MonthlyGraphItemDto>> Handle(GetDashboardGraphQuery q, CancellationToken ct)
    {
        var bills = await _db.Bills.AsNoTracking()
            .Where(b => b.BillDate.Year == q.Year && b.BillStatus == BillStatus.Active)
            .GroupBy(b => b.BillDate.Month)
            .Select(g => new { Month = g.Key, Sales = g.Sum(b => b.BillTotal) })
            .ToListAsync(ct);

        var expenses = await _db.Expenses.AsNoTracking()
            .Where(e => e.Date.Year == q.Year)
            .GroupBy(e => e.Date.Month)
            .Select(g => new { Month = g.Key, Expense = g.Sum(e => e.Total) })
            .ToListAsync(ct);

        var result = Enumerable.Range(1, 12).Select(month =>
        {
            var sales = bills.FirstOrDefault(b => b.Month == month)?.Sales ?? 0;
            var expense = expenses.FirstOrDefault(e => e.Month == month)?.Expense ?? 0;
            return new MonthlyGraphItemDto(month, q.Year, sales, expense);
        }).ToList();

        return result;
    }
}

public record GetRecentGatepassesForDashboardQuery(int Count = 5) : IRequest<List<RecentGatepassDto>>;
public class GetRecentGatepassesForDashboardQueryHandler : IRequestHandler<GetRecentGatepassesForDashboardQuery, List<RecentGatepassDto>>
{
    private readonly ShreeDbContext _db;
    public GetRecentGatepassesForDashboardQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<List<RecentGatepassDto>> Handle(GetRecentGatepassesForDashboardQuery q, CancellationToken ct) =>
        await _db.Gatepasses.Include(g => g.Company).AsNoTracking()
            .OrderByDescending(g => g.GatepassDate)
            .Take(q.Count)
            .Select(g => new RecentGatepassDto(g.Id, g.Company.Name, g.GatepassNumber, g.GatepassDate, g.Status.ToString()))
            .ToListAsync(ct);
}
