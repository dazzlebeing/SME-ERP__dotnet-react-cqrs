using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Common.Models;
using Shree.Domain.Entities;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Employees;

// DTOs
public record EmployeeDto(int Id, string Name, string? Qualification, string? MobileNumber, string? Aadhar, DateTime? JoiningDate, decimal Salary, DateTime CreatedAt);
public record EmployeeListItemDto(int Id, string Name, string? MobileNumber);
public record SaveEmployeeRequest(string Name, string? Qualification, string? MobileNumber, string? Aadhar, DateTime? JoiningDate, decimal Salary);
public record EmployeeDueDto(int EmployeeId, string EmployeeName, decimal TotalAdvanceDue);

// Commands
public record CreateEmployeeCommand(SaveEmployeeRequest Request) : IRequest<int>;
public class CreateEmployeeCommandValidator : AbstractValidator<CreateEmployeeCommand>
{
    public CreateEmployeeCommandValidator()
    {
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Salary).GreaterThanOrEqualTo(0);
    }
}
public class CreateEmployeeCommandHandler : IRequestHandler<CreateEmployeeCommand, int>
{
    private readonly ShreeDbContext _db;
    public CreateEmployeeCommandHandler(ShreeDbContext db) => _db = db;
    public async Task<int> Handle(CreateEmployeeCommand cmd, CancellationToken ct)
    {
        var e = new Employee { Name = cmd.Request.Name, Qualification = cmd.Request.Qualification, MobileNumber = cmd.Request.MobileNumber, Aadhar = cmd.Request.Aadhar, JoiningDate = cmd.Request.JoiningDate, Salary = cmd.Request.Salary };
        _db.Employees.Add(e); await _db.SaveChangesAsync(ct); return e.Id;
    }
}

public record UpdateEmployeeCommand(int Id, SaveEmployeeRequest Request) : IRequest;
public class UpdateEmployeeCommandHandler : IRequestHandler<UpdateEmployeeCommand>
{
    private readonly ShreeDbContext _db;
    public UpdateEmployeeCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(UpdateEmployeeCommand cmd, CancellationToken ct)
    {
        var e = await _db.Employees.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        e.Name = cmd.Request.Name; e.Qualification = cmd.Request.Qualification; e.MobileNumber = cmd.Request.MobileNumber;
        e.Aadhar = cmd.Request.Aadhar; e.JoiningDate = cmd.Request.JoiningDate; e.Salary = cmd.Request.Salary;
        await _db.SaveChangesAsync(ct);
    }
}

public record DeleteEmployeeCommand(int Id) : IRequest;
public class DeleteEmployeeCommandHandler : IRequestHandler<DeleteEmployeeCommand>
{
    private readonly ShreeDbContext _db;
    public DeleteEmployeeCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(DeleteEmployeeCommand cmd, CancellationToken ct)
    {
        var e = await _db.Employees.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        _db.Employees.Remove(e); await _db.SaveChangesAsync(ct);
    }
}

// Queries
public record GetEmployeesQuery(int Page = 1, int PageSize = 10, string? Search = null) : IRequest<PagedResult<EmployeeDto>>;
public class GetEmployeesQueryHandler : IRequestHandler<GetEmployeesQuery, PagedResult<EmployeeDto>>
{
    private readonly ShreeDbContext _db;
    public GetEmployeesQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PagedResult<EmployeeDto>> Handle(GetEmployeesQuery q, CancellationToken ct)
    {
        var query = _db.Employees.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q.Search)) query = query.Where(e => e.Name.Contains(q.Search));
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(e => e.Name).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(e => new EmployeeDto(e.Id, e.Name, e.Qualification, e.MobileNumber, e.Aadhar, e.JoiningDate, e.Salary, e.CreatedAt)).ToListAsync(ct);
        return new PagedResult<EmployeeDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }
}

public record GetEmployeeByIdQuery(int Id) : IRequest<EmployeeDto?>;
public class GetEmployeeByIdQueryHandler : IRequestHandler<GetEmployeeByIdQuery, EmployeeDto?>
{
    private readonly ShreeDbContext _db;
    public GetEmployeeByIdQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<EmployeeDto?> Handle(GetEmployeeByIdQuery q, CancellationToken ct) =>
        await _db.Employees.AsNoTracking().Where(e => e.Id == q.Id)
            .Select(e => new EmployeeDto(e.Id, e.Name, e.Qualification, e.MobileNumber, e.Aadhar, e.JoiningDate, e.Salary, e.CreatedAt)).FirstOrDefaultAsync(ct);
}

public record GetEmployeeListQuery : IRequest<List<EmployeeListItemDto>>;
public class GetEmployeeListQueryHandler : IRequestHandler<GetEmployeeListQuery, List<EmployeeListItemDto>>
{
    private readonly ShreeDbContext _db;
    public GetEmployeeListQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<List<EmployeeListItemDto>> Handle(GetEmployeeListQuery q, CancellationToken ct) =>
        await _db.Employees.AsNoTracking().OrderBy(e => e.Name).Select(e => new EmployeeListItemDto(e.Id, e.Name, e.MobileNumber)).ToListAsync(ct);
}

public record GetEmployeeDueQuery(int EmployeeId) : IRequest<EmployeeDueDto?>;
public class GetEmployeeDueQueryHandler : IRequestHandler<GetEmployeeDueQuery, EmployeeDueDto?>
{
    private readonly ShreeDbContext _db;
    public GetEmployeeDueQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<EmployeeDueDto?> Handle(GetEmployeeDueQuery q, CancellationToken ct)
    {
        var emp = await _db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == q.EmployeeId, ct);
        if (emp == null) return null;
        var lastAdvance = await _db.Advances.AsNoTracking().Where(a => a.EmployeeId == q.EmployeeId).OrderByDescending(a => a.Date).FirstOrDefaultAsync(ct);
        return new EmployeeDueDto(emp.Id, emp.Name, lastAdvance?.TotalDue ?? 0);
    }
}
