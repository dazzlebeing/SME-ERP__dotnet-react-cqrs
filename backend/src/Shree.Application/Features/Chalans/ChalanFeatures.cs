using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Common.Models;
using Shree.Domain.Entities;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Chalans;

public record ChalanDto(int Id, DateTime Date, int CompanyId, string CompanyName, string GatepassNumber, string? VehicleNumber, string? RollsInfo, DateTime CreatedAt);
public record SaveChalanRequest(DateTime Date, int CompanyId, string GatepassNumber, string? VehicleNumber, string? RollsInfo);

public record CreateChalanCommand(SaveChalanRequest Request) : IRequest<int>;
public class CreateChalanCommandValidator : AbstractValidator<CreateChalanCommand>
{
    public CreateChalanCommandValidator()
    {
        RuleFor(x => x.Request.CompanyId).GreaterThan(0);
        RuleFor(x => x.Request.GatepassNumber).NotEmpty();
        RuleFor(x => x.Request.Date).NotEmpty();
    }
}
public class CreateChalanCommandHandler : IRequestHandler<CreateChalanCommand, int>
{
    private readonly ShreeDbContext _db;
    public CreateChalanCommandHandler(ShreeDbContext db) => _db = db;
    public async Task<int> Handle(CreateChalanCommand cmd, CancellationToken ct)
    {
        var gpExists = await _db.Gatepasses.AnyAsync(g => g.GatepassNumber == cmd.Request.GatepassNumber, ct);
        if (!gpExists) throw new KeyNotFoundException($"Gatepass '{cmd.Request.GatepassNumber}' not found");
        var c = new Chalan { Date = cmd.Request.Date, CompanyId = cmd.Request.CompanyId, GatepassNumber = cmd.Request.GatepassNumber, VehicleNumber = cmd.Request.VehicleNumber, RollsInfo = cmd.Request.RollsInfo };
        _db.Chalans.Add(c); await _db.SaveChangesAsync(ct); return c.Id;
    }
}

public record UpdateChalanCommand(int Id, SaveChalanRequest Request) : IRequest;
public class UpdateChalanCommandHandler : IRequestHandler<UpdateChalanCommand>
{
    private readonly ShreeDbContext _db;
    public UpdateChalanCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(UpdateChalanCommand cmd, CancellationToken ct)
    {
        var c = await _db.Chalans.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        c.Date = cmd.Request.Date; c.CompanyId = cmd.Request.CompanyId; c.GatepassNumber = cmd.Request.GatepassNumber;
        c.VehicleNumber = cmd.Request.VehicleNumber; c.RollsInfo = cmd.Request.RollsInfo;
        await _db.SaveChangesAsync(ct);
    }
}

public record DeleteChalanCommand(int Id) : IRequest;
public class DeleteChalanCommandHandler : IRequestHandler<DeleteChalanCommand>
{
    private readonly ShreeDbContext _db;
    public DeleteChalanCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(DeleteChalanCommand cmd, CancellationToken ct)
    {
        var c = await _db.Chalans.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        _db.Chalans.Remove(c); await _db.SaveChangesAsync(ct);
    }
}

public record GetChalansQuery(int Page = 1, int PageSize = 10, int? CompanyId = null, int? Month = null, int? Year = null, string? Search = null) : IRequest<PagedResult<ChalanDto>>;
public class GetChalansQueryHandler : IRequestHandler<GetChalansQuery, PagedResult<ChalanDto>>
{
    private readonly ShreeDbContext _db;
    public GetChalansQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PagedResult<ChalanDto>> Handle(GetChalansQuery q, CancellationToken ct)
    {
        var query = _db.Chalans.Include(c => c.Company).AsNoTracking();
        if (q.CompanyId.HasValue) query = query.Where(c => c.CompanyId == q.CompanyId.Value);
        if (q.Month.HasValue) query = query.Where(c => c.Date.Month == q.Month.Value);
        if (q.Year.HasValue) query = query.Where(c => c.Date.Year == q.Year.Value);
        if (!string.IsNullOrWhiteSpace(q.Search))
            query = query.Where(c => c.GatepassNumber.Contains(q.Search) || c.Company.Name.Contains(q.Search));
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(c => c.Date).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(c => new ChalanDto(c.Id, c.Date, c.CompanyId, c.Company.Name, c.GatepassNumber, c.VehicleNumber, c.RollsInfo, c.CreatedAt)).ToListAsync(ct);
        return new PagedResult<ChalanDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }
}

public record GetChalanByIdQuery(int Id) : IRequest<ChalanDto?>;
public class GetChalanByIdQueryHandler : IRequestHandler<GetChalanByIdQuery, ChalanDto?>
{
    private readonly ShreeDbContext _db;
    public GetChalanByIdQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<ChalanDto?> Handle(GetChalanByIdQuery q, CancellationToken ct) =>
        await _db.Chalans.Include(c => c.Company).AsNoTracking().Where(c => c.Id == q.Id)
            .Select(c => new ChalanDto(c.Id, c.Date, c.CompanyId, c.Company.Name, c.GatepassNumber, c.VehicleNumber, c.RollsInfo, c.CreatedAt)).FirstOrDefaultAsync(ct);
}
