using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shree.Application.Features.Companies.Commands;
using Shree.Application.Features.Companies.Dtos;
using Shree.Application.Features.Companies.Queries;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/companies")]
[Authorize]
public class CompaniesController : ControllerBase
{
    private readonly IMediator _mediator;
    public CompaniesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null)
        => Ok(await _mediator.Send(new GetCompaniesQuery(page, pageSize, search)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetCompanyByIdQuery(id));
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("list")]
    public async Task<IActionResult> GetList()
        => Ok(await _mediator.Send(new GetCompanyListQuery()));

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Create([FromBody] CreateCompanyRequest request)
    {
        var id = await _mediator.Send(new CreateCompanyCommand(request));
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCompanyRequest request)
    {
        await _mediator.Send(new UpdateCompanyCommand(id, request));
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteCompanyCommand(id));
        return NoContent();
    }
}
