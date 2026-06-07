using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Common.Models;
using Shree.Domain.Entities;
using Shree.Domain.Enums;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Gatepasses;

// DTOs
public record GatepassDto(int Id, int CompanyId, string CompanyName, string GatepassNumber, DateTime GatepassDate, string? RollsInfo, string Status, DateTime CreatedAt);
public record CreateGatepassRequest(int CompanyId, string GatepassNumber, DateTime GatepassDate, string? RollsInfo);
public record UpdateGatepassStatusRequest(string Status);

// Commands
public record CreateGatepassCommand(CreateGatepassRequest Request) : IRequest<int>;
public class CreateGatepassCommandValidator : AbstractValidator<CreateGatepassCommand>
{
    public CreateGatepassCommandValidator()
    {
        RuleFor(x => x.Request.CompanyId).GreaterThan(0);
        RuleFor(x => x.Request.GatepassNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Request.GatepassDate).NotEmpty();
    }
}
public class CreateGatepassCommandHandler : IRequestHandler<CreateGatepassCommand, int>
{
    private readonly ShreeDbContext _db;
    public CreateGatepassCommandHandler(ShreeDbContext db) => _db = db;
    public async Task<int> Handle(CreateGatepassCommand cmd, CancellationToken ct)
    {
        var exists = await _db.Gatepasses.AnyAsync(g => g.GatepassNumber == cmd.Request.GatepassNumber, ct);
        if (exists) throw new InvalidOperationException($"Gatepass number '{cmd.Request.GatepassNumber}' already exists");
        var g = new Gatepass { CompanyId = cmd.Request.CompanyId, GatepassNumber = cmd.Request.GatepassNumber, GatepassDate = cmd.Request.GatepassDate, RollsInfo = cmd.Request.RollsInfo, Status = GatepassStatus.Pending };
        _db.Gatepasses.Add(g); await _db.SaveChangesAsync(ct); return g.Id;
    }
}

public record UpdateGatepassStatusCommand(int Id, string Status) : IRequest;
public class UpdateGatepassStatusCommandHandler : IRequestHandler<UpdateGatepassStatusCommand>
{
    private readonly ShreeDbContext _db;
    public UpdateGatepassStatusCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(UpdateGatepassStatusCommand cmd, CancellationToken ct)
    {
        var g = await _db.Gatepasses.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        g.Status = Enum.Parse<GatepassStatus>(cmd.Status, true);
        await _db.SaveChangesAsync(ct);
    }
}

public record DeleteGatepassCommand(int Id) : IRequest;
public class DeleteGatepassCommandHandler : IRequestHandler<DeleteGatepassCommand>
{
    private readonly ShreeDbContext _db;
    public DeleteGatepassCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(DeleteGatepassCommand cmd, CancellationToken ct)
    {
        var g = await _db.Gatepasses.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        _db.Gatepasses.Remove(g); await _db.SaveChangesAsync(ct);
    }
}

// Queries
public record GetGatepassesQuery(int Page = 1, int PageSize = 10, string? Status = null, int? CompanyId = null, string? Search = null) : IRequest<PagedResult<GatepassDto>>;
public class GetGatepassesQueryHandler : IRequestHandler<GetGatepassesQuery, PagedResult<GatepassDto>>
{
    private readonly ShreeDbContext _db;
    public GetGatepassesQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PagedResult<GatepassDto>> Handle(GetGatepassesQuery q, CancellationToken ct)
    {
        var query = _db.Gatepasses.Include(g => g.Company).AsNoTracking();
        if (q.CompanyId.HasValue) query = query.Where(g => g.CompanyId == q.CompanyId.Value);
        if (!string.IsNullOrWhiteSpace(q.Status) && Enum.TryParse<GatepassStatus>(q.Status, true, out var s)) query = query.Where(g => g.Status == s);
        if (!string.IsNullOrWhiteSpace(q.Search))
            query = query.Where(g => g.GatepassNumber.Contains(q.Search) || g.Company.Name.Contains(q.Search));
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(g => g.GatepassDate).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(g => new GatepassDto(g.Id, g.CompanyId, g.Company.Name, g.GatepassNumber, g.GatepassDate, g.RollsInfo, g.Status.ToString(), g.CreatedAt)).ToListAsync(ct);
        return new PagedResult<GatepassDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }
}

public record GetGatepassByIdQuery(int Id) : IRequest<GatepassDto?>;
public class GetGatepassByIdQueryHandler : IRequestHandler<GetGatepassByIdQuery, GatepassDto?>
{
    private readonly ShreeDbContext _db;
    public GetGatepassByIdQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<GatepassDto?> Handle(GetGatepassByIdQuery q, CancellationToken ct) =>
        await _db.Gatepasses.Include(g => g.Company).AsNoTracking().Where(g => g.Id == q.Id)
            .Select(g => new GatepassDto(g.Id, g.CompanyId, g.Company.Name, g.GatepassNumber, g.GatepassDate, g.RollsInfo, g.Status.ToString(), g.CreatedAt)).FirstOrDefaultAsync(ct);
}

public record CheckGatepassNumberQuery(string Number) : IRequest<bool>;
public class CheckGatepassNumberQueryHandler : IRequestHandler<CheckGatepassNumberQuery, bool>
{
    private readonly ShreeDbContext _db;
    public CheckGatepassNumberQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<bool> Handle(CheckGatepassNumberQuery q, CancellationToken ct) =>
        await _db.Gatepasses.AnyAsync(g => g.GatepassNumber == q.Number, ct);
}

// Lookup gatepass by number (for chalan auto-fill)
public record GetGatepassByNumberQuery(string Number) : IRequest<GatepassDto?>;
public class GetGatepassByNumberQueryHandler : IRequestHandler<GetGatepassByNumberQuery, GatepassDto?>
{
    private readonly ShreeDbContext _db;
    public GetGatepassByNumberQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<GatepassDto?> Handle(GetGatepassByNumberQuery q, CancellationToken ct) =>
        await _db.Gatepasses.Include(g => g.Company).AsNoTracking().Where(g => g.GatepassNumber == q.Number)
            .Select(g => new GatepassDto(g.Id, g.CompanyId, g.Company.Name, g.GatepassNumber, g.GatepassDate, g.RollsInfo, g.Status.ToString(), g.CreatedAt)).FirstOrDefaultAsync(ct);
}

public record GetRecentGatepassesQuery(int Count = 5) : IRequest<List<GatepassDto>>;
public class GetRecentGatepassesQueryHandler : IRequestHandler<GetRecentGatepassesQuery, List<GatepassDto>>
{
    private readonly ShreeDbContext _db;
    public GetRecentGatepassesQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<List<GatepassDto>> Handle(GetRecentGatepassesQuery q, CancellationToken ct) =>
        await _db.Gatepasses.Include(g => g.Company).AsNoTracking().OrderByDescending(g => g.GatepassDate).Take(q.Count)
            .Select(g => new GatepassDto(g.Id, g.CompanyId, g.Company.Name, g.GatepassNumber, g.GatepassDate, g.RollsInfo, g.Status.ToString(), g.CreatedAt)).ToListAsync(ct);
}
