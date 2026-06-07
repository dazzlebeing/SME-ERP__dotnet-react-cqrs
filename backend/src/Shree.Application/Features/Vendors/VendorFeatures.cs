using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Common.Models;
using Shree.Domain.Entities;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Vendors;

// DTOs
public record VendorDto(int Id, string Name, string? Address, string? Description, string? Gstin, DateTime CreatedAt);
public record VendorListItemDto(int Id, string Name, string? Gstin);
public record SaveVendorRequest(string Name, string? Address, string? Description, string? Gstin);

// Commands
public record CreateVendorCommand(SaveVendorRequest Request) : IRequest<int>;
public class CreateVendorCommandValidator : AbstractValidator<CreateVendorCommand>
{
    public CreateVendorCommandValidator() => RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
}
public class CreateVendorCommandHandler : IRequestHandler<CreateVendorCommand, int>
{
    private readonly ShreeDbContext _db;
    public CreateVendorCommandHandler(ShreeDbContext db) => _db = db;
    public async Task<int> Handle(CreateVendorCommand cmd, CancellationToken ct)
    {
        var v = new Vendor { Name = cmd.Request.Name, Address = cmd.Request.Address, Description = cmd.Request.Description, Gstin = cmd.Request.Gstin };
        _db.Vendors.Add(v); await _db.SaveChangesAsync(ct); return v.Id;
    }
}

public record UpdateVendorCommand(int Id, SaveVendorRequest Request) : IRequest;
public class UpdateVendorCommandHandler : IRequestHandler<UpdateVendorCommand>
{
    private readonly ShreeDbContext _db;
    public UpdateVendorCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(UpdateVendorCommand cmd, CancellationToken ct)
    {
        var v = await _db.Vendors.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        v.Name = cmd.Request.Name; v.Address = cmd.Request.Address; v.Description = cmd.Request.Description; v.Gstin = cmd.Request.Gstin;
        await _db.SaveChangesAsync(ct);
    }
}

public record DeleteVendorCommand(int Id) : IRequest;
public class DeleteVendorCommandHandler : IRequestHandler<DeleteVendorCommand>
{
    private readonly ShreeDbContext _db;
    public DeleteVendorCommandHandler(ShreeDbContext db) => _db = db;
    public async Task Handle(DeleteVendorCommand cmd, CancellationToken ct)
    {
        var v = await _db.Vendors.FindAsync([cmd.Id], ct) ?? throw new KeyNotFoundException();
        _db.Vendors.Remove(v); await _db.SaveChangesAsync(ct);
    }
}

// Queries
public record GetVendorsQuery(int Page = 1, int PageSize = 10, string? Search = null) : IRequest<PagedResult<VendorDto>>;
public class GetVendorsQueryHandler : IRequestHandler<GetVendorsQuery, PagedResult<VendorDto>>
{
    private readonly ShreeDbContext _db;
    public GetVendorsQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<PagedResult<VendorDto>> Handle(GetVendorsQuery q, CancellationToken ct)
    {
        var query = _db.Vendors.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q.Search)) query = query.Where(v => v.Name.Contains(q.Search));
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(v => v.Name).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(v => new VendorDto(v.Id, v.Name, v.Address, v.Description, v.Gstin, v.CreatedAt)).ToListAsync(ct);
        return new PagedResult<VendorDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }
}

public record GetVendorByIdQuery(int Id) : IRequest<VendorDto?>;
public class GetVendorByIdQueryHandler : IRequestHandler<GetVendorByIdQuery, VendorDto?>
{
    private readonly ShreeDbContext _db;
    public GetVendorByIdQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<VendorDto?> Handle(GetVendorByIdQuery q, CancellationToken ct) =>
        await _db.Vendors.AsNoTracking().Where(v => v.Id == q.Id)
            .Select(v => new VendorDto(v.Id, v.Name, v.Address, v.Description, v.Gstin, v.CreatedAt)).FirstOrDefaultAsync(ct);
}

public record GetVendorListQuery : IRequest<List<VendorListItemDto>>;
public class GetVendorListQueryHandler : IRequestHandler<GetVendorListQuery, List<VendorListItemDto>>
{
    private readonly ShreeDbContext _db;
    public GetVendorListQueryHandler(ShreeDbContext db) => _db = db;
    public async Task<List<VendorListItemDto>> Handle(GetVendorListQuery q, CancellationToken ct) =>
        await _db.Vendors.AsNoTracking().OrderBy(v => v.Name).Select(v => new VendorListItemDto(v.Id, v.Name, v.Gstin)).ToListAsync(ct);
}
