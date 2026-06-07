using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Shree.Application.Features.Companies.Dtos;
using Shree.Domain.Entities;
using Shree.Infrastructure.Persistence;

namespace Shree.Application.Features.Companies.Commands;

public record CreateCompanyCommand(CreateCompanyRequest Request) : IRequest<int>;

public class CreateCompanyCommandValidator : AbstractValidator<CreateCompanyCommand>
{
    public CreateCompanyCommandValidator()
    {
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Address).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Request.Gstin)
            .Matches(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
            .When(x => !string.IsNullOrEmpty(x.Request.Gstin))
            .WithMessage("Invalid GSTIN format");
    }
}

public class CreateCompanyCommandHandler : IRequestHandler<CreateCompanyCommand, int>
{
    private readonly ShreeDbContext _context;
    public CreateCompanyCommandHandler(ShreeDbContext context) => _context = context;

    public async Task<int> Handle(CreateCompanyCommand request, CancellationToken ct)
    {
        var r = request.Request;
        var company = new Company
        {
            Name = r.Name,
            Address = r.Address,
            Gstin = r.Gstin,
            ContactPerson1 = r.ContactPerson1,
            ContactNumber1 = r.ContactNumber1,
            ContactPerson2 = r.ContactPerson2,
            ContactNumber2 = r.ContactNumber2
        };
        _context.Companies.Add(company);
        await _context.SaveChangesAsync(ct);
        return company.Id;
    }
}
