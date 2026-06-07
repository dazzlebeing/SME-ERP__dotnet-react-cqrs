using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Features.Companies.Dtos;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Companies.Commands;

// UPDATE
public record UpdateCompanyCommand(int Id, UpdateCompanyRequest Request) : IRequest;

public class UpdateCompanyCommandValidator : AbstractValidator<UpdateCompanyCommand>
{
    public UpdateCompanyCommandValidator()
    {
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Gstin)
            .Matches(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
            .When(x => !string.IsNullOrEmpty(x.Request.Gstin))
            .WithMessage("Invalid GSTIN format");
    }
}

public class UpdateCompanyCommandHandler : IRequestHandler<UpdateCompanyCommand>
{
    private readonly ShreeDbContext _context;
    public UpdateCompanyCommandHandler(ShreeDbContext context) => _context = context;

    public async Task Handle(UpdateCompanyCommand request, CancellationToken ct)
    {
        var company = await _context.Companies.FindAsync([request.Id], ct)
            ?? throw new KeyNotFoundException($"Company {request.Id} not found");
        var r = request.Request;
        company.Name = r.Name;
        company.Address = r.Address;
        company.Gstin = r.Gstin;
        company.ContactPerson1 = r.ContactPerson1;
        company.ContactNumber1 = r.ContactNumber1;
        company.ContactPerson2 = r.ContactPerson2;
        company.ContactNumber2 = r.ContactNumber2;
        await _context.SaveChangesAsync(ct);
    }
}

// DELETE (soft)
public record DeleteCompanyCommand(int Id) : IRequest;

public class DeleteCompanyCommandHandler : IRequestHandler<DeleteCompanyCommand>
{
    private readonly ShreeDbContext _context;
    public DeleteCompanyCommandHandler(ShreeDbContext context) => _context = context;

    public async Task Handle(DeleteCompanyCommand request, CancellationToken ct)
    {
        var company = await _context.Companies.FindAsync([request.Id], ct)
            ?? throw new KeyNotFoundException($"Company {request.Id} not found");
        _context.Companies.Remove(company);  // EF Core interceptor converts to soft delete
        await _context.SaveChangesAsync(ct);
    }
}
