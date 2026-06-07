using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Common.Models;
using Shree.Domain.Entities;
using Shree.Domain.Enums;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Payments;

// DTOs
public record PaymentDto(int Id, DateTime PaymentDate, int CompanyId, string CompanyName,
    string ModeOfPayment, decimal PaymentAmount, string? PaidBills, string? Description, DateTime CreatedAt);
public record SavePaymentRequest(DateTime PaymentDate, int CompanyId, string ModeOfPayment,
    decimal PaymentAmount, string? PaidBills, string? Description);

// Commands
public record CreatePaymentCommand(SavePaymentRequest Request) : IRequest<int>;
public class CreatePaymentCommandValidator : AbstractValidator<CreatePaymentCommand>
{
    private static readonly string[] ValidModes = ["Cash", "Cheque", "RTGS", "NEFT", "UPI"];
    public CreatePaymentCommandValidator()
    {
        RuleFor(x => x.Request.CompanyId).GreaterThan(0);
        RuleFor(x => x.Request.PaymentDate).NotEmpty();
        RuleFor(x => x.Request.PaymentAmount).GreaterThan(0);
        RuleFor(x => x.Request.ModeOfPayment).NotEmpty()
            .Must(m => ValidModes.Contains(m, StringComparer.OrdinalIgnoreCase))
            .WithMessage("ModeOfPayment must be one of: Cash, Cheque, RTGS, NEFT, UPI");
    }
}
public class CreatePaymentCommandHandler : IRequestHandler<CreatePaymentCommand, int>
{
    private readonly ShreeDbContext _db;
    public CreatePaymentCommandHandler(ShreeDbContext db) => _db = db;
    public async Task<int> Handle(CreatePaymentCommand cmd, CancellationToken ct)
    {
        var companyExists = await _db.Companies.AnyAsync(c => c.Id == cmd.Request.CompanyId, ct);
        if (!companyExists) throw new KeyNotFoundException($"Company {cmd.Request.CompanyId} not found");

        var payment = new Payment
        {
            PaymentDate = cmd.Request.PaymentDate,
            CompanyId = cmd.Request.CompanyId,
            ModeOfPayment = Enum.Parse<PaymentMode>(cmd.Request.ModeOfPayment, true),
            PaymentAmount = cmd.Request.PaymentAmount,
            PaidBills = cmd.Request.PaidBills,
            Description = cmd.Request.Description
        };
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync(ct);
        return payment.Id;
    }
}

public record DeletePaymentCommand(int Id) : IRequest;
public class DeletePaymentCommandHandler : IRequestHandler<DeletePaymentCommand>
{
    private readonly ShreeDbContext _db;
    public DeletePaymentCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(DeletePaymentCommand cmd, CancellationToken ct)
    {
        var p = await _db.Payments.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        _db.Payments.Remove(p);
        await _db.SaveChangesAsync(ct);
    }
}

// Queries
public record GetPaymentsQuery(int Page = 1, int PageSize = 10,
    int? CompanyId = null, int? Month = null, int? Year = null) : IRequest<PagedResult<PaymentDto>>;
public class GetPaymentsQueryHandler : IRequestHandler<GetPaymentsQuery, PagedResult<PaymentDto>>
{
    private readonly ShreeDbContext _db;
    public GetPaymentsQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PagedResult<PaymentDto>> Handle(GetPaymentsQuery q, CancellationToken ct)
    {
        var query = _db.Payments.Include(p => p.Company).AsNoTracking();
        if (q.CompanyId.HasValue) query = query.Where(p => p.CompanyId == q.CompanyId.Value);
        if (q.Month.HasValue) query = query.Where(p => p.PaymentDate.Month == q.Month.Value);
        if (q.Year.HasValue) query = query.Where(p => p.PaymentDate.Year == q.Year.Value);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(p => p.PaymentDate).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(p => new PaymentDto(p.Id, p.PaymentDate, p.CompanyId, p.Company.Name,
                p.ModeOfPayment.ToString(), p.PaymentAmount, p.PaidBills, p.Description, p.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<PaymentDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }
}

public record GetPaymentByIdQuery(int Id) : IRequest<PaymentDto?>;
public class GetPaymentByIdQueryHandler : IRequestHandler<GetPaymentByIdQuery, PaymentDto?>
{
    private readonly ShreeDbContext _db;
    public GetPaymentByIdQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PaymentDto?> Handle(GetPaymentByIdQuery q, CancellationToken ct) =>
        await _db.Payments.Include(p => p.Company).AsNoTracking().Where(p => p.Id == q.Id)
            .Select(p => new PaymentDto(p.Id, p.PaymentDate, p.CompanyId, p.Company.Name,
                p.ModeOfPayment.ToString(), p.PaymentAmount, p.PaidBills, p.Description, p.CreatedAt))
            .FirstOrDefaultAsync(ct);
}
