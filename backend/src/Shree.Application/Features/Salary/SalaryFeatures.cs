using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Common.Models;
using Shree.Domain.Entities;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Salary;

// DTOs
public record SalaryDto(int Id, int EmployeeId, string EmployeeName, decimal WorkingDays, DateTime Date, decimal Amount, DateTime CreatedAt);
public record SalaryMonthDto(int Year, int Month);
public record CreateSalaryRequest(int EmployeeId, decimal WorkingDays, int Month, int Year, decimal Amount);

// Commands
public record CreateSalaryCommand(CreateSalaryRequest Request) : IRequest<int>;
public class CreateSalaryCommandValidator : AbstractValidator<CreateSalaryCommand>
{
    public CreateSalaryCommandValidator()
    {
        RuleFor(x => x.Request.EmployeeId).GreaterThan(0);
        RuleFor(x => x.Request.WorkingDays).GreaterThanOrEqualTo(0).LessThanOrEqualTo(31);
        RuleFor(x => x.Request.Month).InclusiveBetween(1, 12);
        RuleFor(x => x.Request.Year).GreaterThan(2000);
        RuleFor(x => x.Request.Amount).GreaterThanOrEqualTo(0);
    }
}
public class CreateSalaryCommandHandler : IRequestHandler<CreateSalaryCommand, int>
{
    private readonly ShreeDbContext _db;
    public CreateSalaryCommandHandler(ShreeDbContext db) => _db = db;
    public async Task<int> Handle(CreateSalaryCommand cmd, CancellationToken ct)
    {
        var emp = await _db.Employees.FindAsync([cmd.Request.EmployeeId], ct)
            ?? throw new KeyNotFoundException($"Employee {cmd.Request.EmployeeId} not found");

        // Prevent duplicate salary for same month/year
        var salaryDate = new DateTime(cmd.Request.Year, cmd.Request.Month, 1);
        var duplicate = await _db.SalaryRecords.AnyAsync(
            s => s.EmployeeId == cmd.Request.EmployeeId && s.Date == salaryDate, ct);
        if (duplicate) throw new InvalidOperationException(
            $"Salary for {emp.Name} for {cmd.Request.Month}/{cmd.Request.Year} already exists");

        var salary = new SalaryRecord
        {
            EmployeeId = cmd.Request.EmployeeId,
            WorkingDays = cmd.Request.WorkingDays,
            Date = salaryDate,
            Amount = cmd.Request.Amount
        };
        _db.SalaryRecords.Add(salary);
        await _db.SaveChangesAsync(ct);
        return salary.Id;
    }
}

public record DeleteSalaryCommand(int Id) : IRequest;
public class DeleteSalaryCommandHandler : IRequestHandler<DeleteSalaryCommand>
{
    private readonly ShreeDbContext _db;
    public DeleteSalaryCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(DeleteSalaryCommand cmd, CancellationToken ct)
    {
        var s = await _db.SalaryRecords.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        _db.SalaryRecords.Remove(s);
        await _db.SaveChangesAsync(ct);
    }
}

// Queries
public record GetSalaryQuery(int Page = 1, int PageSize = 10,
    int? EmployeeId = null, int? Month = null, int? Year = null) : IRequest<PagedResult<SalaryDto>>;
public class GetSalaryQueryHandler : IRequestHandler<GetSalaryQuery, PagedResult<SalaryDto>>
{
    private readonly ShreeDbContext _db;
    public GetSalaryQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PagedResult<SalaryDto>> Handle(GetSalaryQuery q, CancellationToken ct)
    {
        var query = _db.SalaryRecords.Include(s => s.Employee).AsNoTracking();
        if (q.EmployeeId.HasValue) query = query.Where(s => s.EmployeeId == q.EmployeeId.Value);
        if (q.Month.HasValue) query = query.Where(s => s.Date.Month == q.Month.Value);
        if (q.Year.HasValue) query = query.Where(s => s.Date.Year == q.Year.Value);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(s => s.Date).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(s => new SalaryDto(s.Id, s.EmployeeId, s.Employee.Name, s.WorkingDays, s.Date, s.Amount, s.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<SalaryDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }
}

public record GetSalaryMonthsQuery(int EmployeeId) : IRequest<List<SalaryMonthDto>>;
public class GetSalaryMonthsQueryHandler : IRequestHandler<GetSalaryMonthsQuery, List<SalaryMonthDto>>
{
    private readonly ShreeDbContext _db;
    public GetSalaryMonthsQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<List<SalaryMonthDto>> Handle(GetSalaryMonthsQuery q, CancellationToken ct) =>
        await _db.SalaryRecords.AsNoTracking()
            .Where(s => s.EmployeeId == q.EmployeeId)
            .OrderByDescending(s => s.Date)
            .Select(s => new SalaryMonthDto(s.Date.Year, s.Date.Month))
            .ToListAsync(ct);
}
