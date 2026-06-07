using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Common.Models;
using Shree.Application.Features.Companies.Dtos;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Companies.Queries;

// Paginated list
public record GetCompaniesQuery(int Page = 1, int PageSize = 10, string? Search = null)
    : IRequest<PagedResult<CompanyDto>>;

public class GetCompaniesQueryHandler : IRequestHandler<GetCompaniesQuery, PagedResult<CompanyDto>>
{
    private readonly ShreeDbContext _context;
    public GetCompaniesQueryHandler(ShreeDbContext context) => _context = context;

    public async Task<PagedResult<CompanyDto>> Handle(GetCompaniesQuery request, CancellationToken ct)
    {
        var query = _context.Companies.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(request.Search))
            query = query.Where(c => c.Name.Contains(request.Search) || (c.Gstin != null && c.Gstin.Contains(request.Search)));

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(c => c.Name)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(c => new CompanyDto(c.Id, c.Name, c.Address, c.Gstin, c.ContactPerson1, c.ContactNumber1, c.ContactPerson2, c.ContactNumber2, c.CreatedAt))
            .ToListAsync(ct);

        return new PagedResult<CompanyDto> { Items = items, TotalCount = total, Page = request.Page, PageSize = request.PageSize };
    }
}

// By ID
public record GetCompanyByIdQuery(int Id) : IRequest<CompanyDto?>;

public class GetCompanyByIdQueryHandler : IRequestHandler<GetCompanyByIdQuery, CompanyDto?>
{
    private readonly ShreeDbContext _context;
    public GetCompanyByIdQueryHandler(ShreeDbContext context) => _context = context;

    public async Task<CompanyDto?> Handle(GetCompanyByIdQuery request, CancellationToken ct)
    {
        return await _context.Companies.AsNoTracking()
            .Where(c => c.Id == request.Id)
            .Select(c => new CompanyDto(c.Id, c.Name, c.Address, c.Gstin, c.ContactPerson1, c.ContactNumber1, c.ContactPerson2, c.ContactNumber2, c.CreatedAt))
            .FirstOrDefaultAsync(ct);
    }
}

// Dropdown list
public record GetCompanyListQuery : IRequest<List<CompanyListItemDto>>;

public class GetCompanyListQueryHandler : IRequestHandler<GetCompanyListQuery, List<CompanyListItemDto>>
{
    private readonly ShreeDbContext _context;
    public GetCompanyListQueryHandler(ShreeDbContext context) => _context = context;

    public async Task<List<CompanyListItemDto>> Handle(GetCompanyListQuery request, CancellationToken ct)
    {
        return await _context.Companies.AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CompanyListItemDto(c.Id, c.Name, c.Gstin))
            .ToListAsync(ct);
    }
}
