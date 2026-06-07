using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Common.Models;
using Shree.Domain.Entities;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Vouchers;

// DTOs
public record VoucherDto(int Id, DateTime Date, decimal Amount, string PaidTo, string? Description, DateTime CreatedAt);
public record SaveVoucherRequest(DateTime Date, decimal Amount, string PaidTo, string? Description);

// Commands
public record CreateVoucherCommand(SaveVoucherRequest Request) : IRequest<int>;
public class CreateVoucherCommandValidator : AbstractValidator<CreateVoucherCommand>
{
    public CreateVoucherCommandValidator()
    {
        RuleFor(x => x.Request.PaidTo).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Date).NotEmpty().LessThanOrEqualTo(DateTime.Today.AddDays(1))
            .WithMessage("Date cannot be in the future");
        RuleFor(x => x.Request.Amount).GreaterThan(0);
    }
}
public class CreateVoucherCommandHandler : IRequestHandler<CreateVoucherCommand, int>
{
    private readonly ShreeDbContext _db;
    public CreateVoucherCommandHandler(ShreeDbContext db) => _db = db;
    public async Task<int> Handle(CreateVoucherCommand cmd, CancellationToken ct)
    {
        var v = new Voucher
        {
            Date = cmd.Request.Date,
            Amount = cmd.Request.Amount,
            PaidTo = cmd.Request.PaidTo,
            Description = cmd.Request.Description
        };
        _db.Vouchers.Add(v);
        await _db.SaveChangesAsync(ct);
        return v.Id;
    }
}

public record UpdateVoucherCommand(int Id, SaveVoucherRequest Request) : IRequest;
public class UpdateVoucherCommandHandler : IRequestHandler<UpdateVoucherCommand>
{
    private readonly ShreeDbContext _db;
    public UpdateVoucherCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(UpdateVoucherCommand cmd, CancellationToken ct)
    {
        var v = await _db.Vouchers.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        v.Date = cmd.Request.Date; v.Amount = cmd.Request.Amount;
        v.PaidTo = cmd.Request.PaidTo; v.Description = cmd.Request.Description;
        await _db.SaveChangesAsync(ct);
    }
}

public record DeleteVoucherCommand(int Id) : IRequest;
public class DeleteVoucherCommandHandler : IRequestHandler<DeleteVoucherCommand>
{
    private readonly ShreeDbContext _db;
    public DeleteVoucherCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(DeleteVoucherCommand cmd, CancellationToken ct)
    {
        var v = await _db.Vouchers.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        _db.Vouchers.Remove(v);
        await _db.SaveChangesAsync(ct);
    }
}

// Queries
public record GetVouchersQuery(int Page = 1, int PageSize = 10, int? Month = null, int? Year = null)
    : IRequest<PagedResult<VoucherDto>>;
public class GetVouchersQueryHandler : IRequestHandler<GetVouchersQuery, PagedResult<VoucherDto>>
{
    private readonly ShreeDbContext _db;
    public GetVouchersQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PagedResult<VoucherDto>> Handle(GetVouchersQuery q, CancellationToken ct)
    {
        var query = _db.Vouchers.AsNoTracking();
        if (q.Month.HasValue) query = query.Where(v => v.Date.Month == q.Month.Value);
        if (q.Year.HasValue) query = query.Where(v => v.Date.Year == q.Year.Value);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(v => v.Date).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(v => new VoucherDto(v.Id, v.Date, v.Amount, v.PaidTo, v.Description, v.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<VoucherDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }
}

public record GetVoucherByIdQuery(int Id) : IRequest<VoucherDto?>;
public class GetVoucherByIdQueryHandler : IRequestHandler<GetVoucherByIdQuery, VoucherDto?>
{
    private readonly ShreeDbContext _db;
    public GetVoucherByIdQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<VoucherDto?> Handle(GetVoucherByIdQuery q, CancellationToken ct) =>
        await _db.Vouchers.AsNoTracking().Where(v => v.Id == q.Id)
            .Select(v => new VoucherDto(v.Id, v.Date, v.Amount, v.PaidTo, v.Description, v.CreatedAt))
            .FirstOrDefaultAsync(ct);
}
