using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Common.Models;
using Shree.Domain.Entities;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Advances;

// DTOs
public record AdvanceDto(int Id, int EmployeeId, string EmployeeName, DateTime Date,
    decimal TakenAmount, decimal ReturnedAmount, decimal TotalDue, DateTime CreatedAt);
public record CreateAdvanceRequest(int EmployeeId, DateTime Date, decimal TakenAmount, decimal ReturnedAmount, decimal TotalDue);

// Commands
public record CreateAdvanceCommand(CreateAdvanceRequest Request) : IRequest<int>;
public class CreateAdvanceCommandValidator : AbstractValidator<CreateAdvanceCommand>
{
    public CreateAdvanceCommandValidator()
    {
        RuleFor(x => x.Request.EmployeeId).GreaterThan(0);
        RuleFor(x => x.Request.Date).NotEmpty();
        RuleFor(x => x.Request.TakenAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Request.ReturnedAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Request.TotalDue).GreaterThanOrEqualTo(0);
    }
}
public class CreateAdvanceCommandHandler : IRequestHandler<CreateAdvanceCommand, int>
{
    private readonly ShreeDbContext _db;
    public CreateAdvanceCommandHandler(ShreeDbContext db) => _db = db;
    public async Task<int> Handle(CreateAdvanceCommand cmd, CancellationToken ct)
    {
        var empExists = await _db.Employees.AnyAsync(e => e.Id == cmd.Request.EmployeeId, ct);
        if (!empExists) throw new KeyNotFoundException($"Employee {cmd.Request.EmployeeId} not found");

        var advance = new Advance
        {
            EmployeeId = cmd.Request.EmployeeId,
            Date = cmd.Request.Date,
            TakenAmount = cmd.Request.TakenAmount,
            ReturnedAmount = cmd.Request.ReturnedAmount,
            TotalDue = cmd.Request.TotalDue
        };
        _db.Advances.Add(advance);
        await _db.SaveChangesAsync(ct);
        return advance.Id;
    }
}

public record DeleteAdvanceCommand(int Id) : IRequest;
public class DeleteAdvanceCommandHandler : IRequestHandler<DeleteAdvanceCommand>
{
    private readonly ShreeDbContext _db;
    public DeleteAdvanceCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(DeleteAdvanceCommand cmd, CancellationToken ct)
    {
        var a = await _db.Advances.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        _db.Advances.Remove(a);
        await _db.SaveChangesAsync(ct);
    }
}

// Queries
public record GetAdvancesQuery(int Page = 1, int PageSize = 20, int? EmployeeId = null) : IRequest<PagedResult<AdvanceDto>>;
public class GetAdvancesQueryHandler : IRequestHandler<GetAdvancesQuery, PagedResult<AdvanceDto>>
{
    private readonly ShreeDbContext _db;
    public GetAdvancesQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PagedResult<AdvanceDto>> Handle(GetAdvancesQuery q, CancellationToken ct)
    {
        var query = _db.Advances.Include(a => a.Employee).AsNoTracking();
        if (q.EmployeeId.HasValue) query = query.Where(a => a.EmployeeId == q.EmployeeId.Value);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(a => a.Date).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(a => new AdvanceDto(a.Id, a.EmployeeId, a.Employee.Name, a.Date,
                a.TakenAmount, a.ReturnedAmount, a.TotalDue, a.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<AdvanceDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }
}
