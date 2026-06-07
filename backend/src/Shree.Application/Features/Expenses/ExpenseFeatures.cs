using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Common.Models;
using Shree.Domain.Entities;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Expenses;

// DTOs
public record ExpenseDto(int Id, string? InvoiceNumber, DateTime Date, decimal Amount, int VendorId, string VendorName,
    decimal TaxPercentage, decimal Cgst, decimal Sgst, decimal Igst, decimal Total, string? Description, DateTime CreatedAt);
public record SaveExpenseRequest(string? InvoiceNumber, DateTime Date, decimal Amount, int VendorId,
    decimal TaxPercentage, decimal Cgst, decimal Sgst, decimal Igst, decimal Total, string? Description);

// Commands
public record CreateExpenseCommand(SaveExpenseRequest Request) : IRequest<int>;
public class CreateExpenseCommandValidator : AbstractValidator<CreateExpenseCommand>
{
    public CreateExpenseCommandValidator()
    {
        RuleFor(x => x.Request.VendorId).GreaterThan(0);
        RuleFor(x => x.Request.Date).NotEmpty().LessThanOrEqualTo(DateTime.Today.AddDays(1))
            .WithMessage("Date cannot be in the future");
        RuleFor(x => x.Request.Amount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Request.Total).GreaterThan(0);
    }
}
public class CreateExpenseCommandHandler : IRequestHandler<CreateExpenseCommand, int>
{
    private readonly ShreeDbContext _db;
    public CreateExpenseCommandHandler(ShreeDbContext db) => _db = db;
    public async Task<int> Handle(CreateExpenseCommand cmd, CancellationToken ct)
    {
        var vendorExists = await _db.Vendors.AnyAsync(v => v.Id == cmd.Request.VendorId, ct);
        if (!vendorExists) throw new KeyNotFoundException($"Vendor {cmd.Request.VendorId} not found");

        var expense = new Expense
        {
            InvoiceNumber = cmd.Request.InvoiceNumber,
            Date = cmd.Request.Date,
            Amount = cmd.Request.Amount,
            VendorId = cmd.Request.VendorId,
            TaxPercentage = cmd.Request.TaxPercentage,
            Cgst = cmd.Request.Cgst,
            Sgst = cmd.Request.Sgst,
            Igst = cmd.Request.Igst,
            Total = cmd.Request.Total,
            Description = cmd.Request.Description
        };
        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync(ct);
        return expense.Id;
    }
}

public record UpdateExpenseCommand(int Id, SaveExpenseRequest Request) : IRequest;
public class UpdateExpenseCommandHandler : IRequestHandler<UpdateExpenseCommand>
{
    private readonly ShreeDbContext _db;
    public UpdateExpenseCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(UpdateExpenseCommand cmd, CancellationToken ct)
    {
        var expense = await _db.Expenses.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        expense.InvoiceNumber = cmd.Request.InvoiceNumber;
        expense.Date = cmd.Request.Date;
        expense.Amount = cmd.Request.Amount;
        expense.VendorId = cmd.Request.VendorId;
        expense.TaxPercentage = cmd.Request.TaxPercentage;
        expense.Cgst = cmd.Request.Cgst;
        expense.Sgst = cmd.Request.Sgst;
        expense.Igst = cmd.Request.Igst;
        expense.Total = cmd.Request.Total;
        expense.Description = cmd.Request.Description;
        await _db.SaveChangesAsync(ct);
    }
}

public record DeleteExpenseCommand(int Id) : IRequest;
public class DeleteExpenseCommandHandler : IRequestHandler<DeleteExpenseCommand>
{
    private readonly ShreeDbContext _db;
    public DeleteExpenseCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(DeleteExpenseCommand cmd, CancellationToken ct)
    {
        var expense = await _db.Expenses.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync(ct);
    }
}

// Queries
public record GetExpensesQuery(int Page = 1, int PageSize = 10,
    int? VendorId = null, int? Month = null, int? Year = null) : IRequest<PagedResult<ExpenseDto>>;
public class GetExpensesQueryHandler : IRequestHandler<GetExpensesQuery, PagedResult<ExpenseDto>>
{
    private readonly ShreeDbContext _db;
    public GetExpensesQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PagedResult<ExpenseDto>> Handle(GetExpensesQuery q, CancellationToken ct)
    {
        var query = _db.Expenses.Include(e => e.Vendor).AsNoTracking();
        if (q.VendorId.HasValue) query = query.Where(e => e.VendorId == q.VendorId.Value);
        if (q.Month.HasValue) query = query.Where(e => e.Date.Month == q.Month.Value);
        if (q.Year.HasValue) query = query.Where(e => e.Date.Year == q.Year.Value);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(e => e.Date).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(e => new ExpenseDto(e.Id, e.InvoiceNumber, e.Date, e.Amount, e.VendorId, e.Vendor.Name,
                e.TaxPercentage, e.Cgst, e.Sgst, e.Igst, e.Total, e.Description, e.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<ExpenseDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }
}

public record GetExpenseByIdQuery(int Id) : IRequest<ExpenseDto?>;
public class GetExpenseByIdQueryHandler : IRequestHandler<GetExpenseByIdQuery, ExpenseDto?>
{
    private readonly ShreeDbContext _db;
    public GetExpenseByIdQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<ExpenseDto?> Handle(GetExpenseByIdQuery q, CancellationToken ct) =>
        await _db.Expenses.Include(e => e.Vendor).AsNoTracking().Where(e => e.Id == q.Id)
            .Select(e => new ExpenseDto(e.Id, e.InvoiceNumber, e.Date, e.Amount, e.VendorId, e.Vendor.Name,
                e.TaxPercentage, e.Cgst, e.Sgst, e.Igst, e.Total, e.Description, e.CreatedAt))
            .FirstOrDefaultAsync(ct);
}
