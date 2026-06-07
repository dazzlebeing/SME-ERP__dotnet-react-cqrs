using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Common.Models;
using Shree.Domain.Entities;
using Shree.Domain.Enums;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Bills;

// DTOs
public record BillParticularDto(int Id, string Description, decimal Quantity, decimal Price, decimal Total);
public record BillDto(
    int Id, DateTime BillDate, string BillNumber, string? HsnCode,
    int CompanyId, string CompanyName, string? GatepassNumber, string? VehicleNumber,
    decimal BillAmount, decimal Sgst, decimal Cgst, decimal Igst, decimal BillTotal,
    decimal RoundOff, string BillStatus, string? Remarks,
    string PaymentStatus, decimal PaymentReceived, DateTime CreatedAt,
    List<BillParticularDto> Particulars);

public record BillListItemDto(
    int Id, DateTime BillDate, string BillNumber,
    int CompanyId, string CompanyName, string? GatepassNumber,
    decimal BillTotal, string BillStatus, string PaymentStatus, decimal PaymentReceived, DateTime CreatedAt);

public record SaveBillParticularRequest(string Description, decimal Quantity, decimal Price, decimal Total);
public record CreateBillRequest(
    DateTime BillDate, string BillNumber, string? HsnCode,
    int CompanyId, string? GatepassNumber, string? VehicleNumber,
    decimal BillAmount, decimal Sgst, decimal Cgst, decimal Igst,
    decimal BillTotal, decimal RoundOff, string? Remarks,
    List<SaveBillParticularRequest> Particulars);

public record UpdateBillRequest(
    DateTime BillDate, string? HsnCode, string? GatepassNumber, string? VehicleNumber,
    decimal BillAmount, decimal Sgst, decimal Cgst, decimal Igst,
    decimal BillTotal, decimal RoundOff, string? Remarks,
    List<SaveBillParticularRequest> Particulars);

// Commands
public record CreateBillCommand(CreateBillRequest Request) : IRequest<int>;
public class CreateBillCommandValidator : AbstractValidator<CreateBillCommand>
{
    public CreateBillCommandValidator()
    {
        RuleFor(x => x.Request.BillNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Request.CompanyId).GreaterThan(0);
        RuleFor(x => x.Request.BillDate).NotEmpty();
        RuleFor(x => x.Request.BillAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Request.BillTotal).GreaterThan(0);
        RuleFor(x => x.Request.Particulars).NotNull();
    }
}
public class CreateBillCommandHandler : IRequestHandler<CreateBillCommand, int>
{
    private readonly ShreeDbContext _db;
    public CreateBillCommandHandler(ShreeDbContext db) => _db = db;
    public async Task<int> Handle(CreateBillCommand cmd, CancellationToken ct)
    {
        var exists = await _db.Bills.AnyAsync(b => b.BillNumber == cmd.Request.BillNumber, ct);
        if (exists) throw new InvalidOperationException($"Bill number '{cmd.Request.BillNumber}' already exists");

        // Validate gatepass exists if provided; auto-mark as Delivered
        if (!string.IsNullOrWhiteSpace(cmd.Request.GatepassNumber))
        {
            var gp = await _db.Gatepasses.FirstOrDefaultAsync(g => g.GatepassNumber == cmd.Request.GatepassNumber, ct);
            if (gp == null) throw new KeyNotFoundException($"Gatepass '{cmd.Request.GatepassNumber}' not found");
            gp.Status = GatepassStatus.Delivered;
        }

        var bill = new Bill
        {
            BillDate = cmd.Request.BillDate,
            BillNumber = cmd.Request.BillNumber,
            HsnCode = cmd.Request.HsnCode,
            CompanyId = cmd.Request.CompanyId,
            GatepassNumber = cmd.Request.GatepassNumber,
            VehicleNumber = cmd.Request.VehicleNumber,
            BillAmount = cmd.Request.BillAmount,
            Sgst = cmd.Request.Sgst,
            Cgst = cmd.Request.Cgst,
            Igst = cmd.Request.Igst,
            BillTotal = cmd.Request.BillTotal,
            RoundOff = cmd.Request.RoundOff,
            Remarks = cmd.Request.Remarks,
            BillStatus = BillStatus.Active,
            PaymentStatus = PaymentStatus.Unpaid
        };

        foreach (var p in cmd.Request.Particulars)
            bill.Particulars.Add(new BillParticular
            {
                BillNumber = cmd.Request.BillNumber,
                Description = p.Description,
                Quantity = p.Quantity,
                Price = p.Price,
                Total = p.Total
            });

        _db.Bills.Add(bill);
        await _db.SaveChangesAsync(ct);
        return bill.Id;
    }
}

public record UpdateBillCommand(int Id, UpdateBillRequest Request) : IRequest;
public class UpdateBillCommandHandler : IRequestHandler<UpdateBillCommand>
{
    private readonly ShreeDbContext _db;
    public UpdateBillCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(UpdateBillCommand cmd, CancellationToken ct)
    {
        var bill = await _db.Bills.Include(b => b.Particulars).FirstOrDefaultAsync(b => b.Id == cmd.Id, ct)
            ?? throw new KeyNotFoundException();

        bill.BillDate = cmd.Request.BillDate;
        bill.HsnCode = cmd.Request.HsnCode;
        bill.GatepassNumber = cmd.Request.GatepassNumber;
        bill.VehicleNumber = cmd.Request.VehicleNumber;
        bill.BillAmount = cmd.Request.BillAmount;
        bill.Sgst = cmd.Request.Sgst;
        bill.Cgst = cmd.Request.Cgst;
        bill.Igst = cmd.Request.Igst;
        bill.BillTotal = cmd.Request.BillTotal;
        bill.RoundOff = cmd.Request.RoundOff;
        bill.Remarks = cmd.Request.Remarks;

        // Replace particulars
        _db.BillParticulars.RemoveRange(bill.Particulars);
        foreach (var p in cmd.Request.Particulars)
            bill.Particulars.Add(new BillParticular
            {
                BillNumber = bill.BillNumber,
                Description = p.Description,
                Quantity = p.Quantity,
                Price = p.Price,
                Total = p.Total
            });

        await _db.SaveChangesAsync(ct);
    }
}

public record UpdateBillStatusCommand(int Id, string Status) : IRequest;
public class UpdateBillStatusCommandHandler : IRequestHandler<UpdateBillStatusCommand>
{
    private readonly ShreeDbContext _db;
    public UpdateBillStatusCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(UpdateBillStatusCommand cmd, CancellationToken ct)
    {
        var bill = await _db.Bills.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        bill.BillStatus = Enum.Parse<BillStatus>(cmd.Status, true);
        await _db.SaveChangesAsync(ct);
    }
}

public record UpdateBillPaymentStatusCommand(int Id, string PaymentStatus, decimal PaymentReceived) : IRequest;
public class UpdateBillPaymentStatusCommandHandler : IRequestHandler<UpdateBillPaymentStatusCommand>
{
    private readonly ShreeDbContext _db;
    public UpdateBillPaymentStatusCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(UpdateBillPaymentStatusCommand cmd, CancellationToken ct)
    {
        var bill = await _db.Bills.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        bill.PaymentStatus = Enum.Parse<PaymentStatus>(cmd.PaymentStatus, true);
        bill.PaymentReceived = cmd.PaymentReceived;
        await _db.SaveChangesAsync(ct);
    }
}

public record DeleteBillCommand(int Id) : IRequest;
public class DeleteBillCommandHandler : IRequestHandler<DeleteBillCommand>
{
    private readonly ShreeDbContext _db;
    public DeleteBillCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(DeleteBillCommand cmd, CancellationToken ct)
    {
        var bill = await _db.Bills.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        _db.Bills.Remove(bill);
        await _db.SaveChangesAsync(ct);
    }
}

// Queries
public record GetBillsQuery(
    int Page = 1, int PageSize = 10,
    int? CompanyId = null, string? BillStatus = null, string? PaymentStatus = null,
    int? Month = null, int? Year = null) : IRequest<PagedResult<BillListItemDto>>;

public class GetBillsQueryHandler : IRequestHandler<GetBillsQuery, PagedResult<BillListItemDto>>
{
    private readonly ShreeDbContext _db;
    public GetBillsQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PagedResult<BillListItemDto>> Handle(GetBillsQuery q, CancellationToken ct)
    {
        var query = _db.Bills.Include(b => b.Company).AsNoTracking();
        if (q.CompanyId.HasValue) query = query.Where(b => b.CompanyId == q.CompanyId.Value);
        if (!string.IsNullOrWhiteSpace(q.BillStatus) && Enum.TryParse<BillStatus>(q.BillStatus, true, out var bs))
            query = query.Where(b => b.BillStatus == bs);
        if (!string.IsNullOrWhiteSpace(q.PaymentStatus) && Enum.TryParse<PaymentStatus>(q.PaymentStatus, true, out var ps))
            query = query.Where(b => b.PaymentStatus == ps);
        if (q.Month.HasValue) query = query.Where(b => b.BillDate.Month == q.Month.Value);
        if (q.Year.HasValue) query = query.Where(b => b.BillDate.Year == q.Year.Value);

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(b => b.BillDate).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(b => new BillListItemDto(
                b.Id, b.BillDate, b.BillNumber, b.CompanyId, b.Company.Name,
                b.GatepassNumber, b.BillTotal, b.BillStatus.ToString(),
                b.PaymentStatus.ToString(), b.PaymentReceived, b.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<BillListItemDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }
}

public record GetBillByIdQuery(int Id) : IRequest<BillDto?>;
public class GetBillByIdQueryHandler : IRequestHandler<GetBillByIdQuery, BillDto?>
{
    private readonly ShreeDbContext _db;
    public GetBillByIdQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<BillDto?> Handle(GetBillByIdQuery q, CancellationToken ct)
    {
        var b = await _db.Bills.Include(x => x.Company).Include(x => x.Particulars)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == q.Id, ct);
        if (b == null) return null;
        var particulars = b.Particulars.Select(p => new BillParticularDto(p.Id, p.Description, p.Quantity, p.Price, p.Total)).ToList();
        return new BillDto(b.Id, b.BillDate, b.BillNumber, b.HsnCode, b.CompanyId, b.Company.Name,
            b.GatepassNumber, b.VehicleNumber, b.BillAmount, b.Sgst, b.Cgst, b.Igst,
            b.BillTotal, b.RoundOff, b.BillStatus.ToString(), b.Remarks,
            b.PaymentStatus.ToString(), b.PaymentReceived, b.CreatedAt, particulars);
    }
}

public record GetPendingBillsQuery(int? CompanyId = null) : IRequest<List<BillListItemDto>>;
public class GetPendingBillsQueryHandler : IRequestHandler<GetPendingBillsQuery, List<BillListItemDto>>
{
    private readonly ShreeDbContext _db;
    public GetPendingBillsQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<List<BillListItemDto>> Handle(GetPendingBillsQuery q, CancellationToken ct)
    {
        var query = _db.Bills.Include(b => b.Company).AsNoTracking()
            .Where(b => b.PaymentStatus != PaymentStatus.Paid && b.BillStatus == BillStatus.Active);
        if (q.CompanyId.HasValue) query = query.Where(b => b.CompanyId == q.CompanyId.Value);
        return await query.OrderBy(b => b.BillDate)
            .Select(b => new BillListItemDto(
                b.Id, b.BillDate, b.BillNumber, b.CompanyId, b.Company.Name,
                b.GatepassNumber, b.BillTotal, b.BillStatus.ToString(),
                b.PaymentStatus.ToString(), b.PaymentReceived, b.CreatedAt))
            .ToListAsync(ct);
    }
}

public record CheckBillNumberQuery(string Number) : IRequest<bool>;
public class CheckBillNumberQueryHandler : IRequestHandler<CheckBillNumberQuery, bool>
{
    private readonly ShreeDbContext _db;
    public CheckBillNumberQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<bool> Handle(CheckBillNumberQuery q, CancellationToken ct) =>
        await _db.Bills.AnyAsync(b => b.BillNumber == q.Number, ct);
}
