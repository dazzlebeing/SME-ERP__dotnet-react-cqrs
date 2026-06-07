namespace Shree.Application.Features.Companies.Dtos;

public record CompanyDto(
    int Id,
    string Name,
    string Address,
    string? Gstin,
    string? ContactPerson1,
    string? ContactNumber1,
    string? ContactPerson2,
    string? ContactNumber2,
    DateTime CreatedAt
);

public record CompanyListItemDto(int Id, string Name, string? Gstin);

public record CreateCompanyRequest(
    string Name,
    string Address,
    string? Gstin,
    string? ContactPerson1,
    string? ContactNumber1,
    string? ContactPerson2,
    string? ContactNumber2
);

public record UpdateCompanyRequest(
    string Name,
    string Address,
    string? Gstin,
    string? ContactPerson1,
    string? ContactNumber1,
    string? ContactPerson2,
    string? ContactNumber2
);
