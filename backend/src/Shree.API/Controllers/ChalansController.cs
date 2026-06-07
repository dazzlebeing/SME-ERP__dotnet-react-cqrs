using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shree.Application.Features.Chalans;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/chalans")]
[Authorize]
public class ChalansController : ControllerBase
{
    private readonly IMediator _mediator;
    public ChalansController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
        [FromQuery] int? companyId = null, [FromQuery] int? month = null,
        [FromQuery] int? year = null, [FromQuery] string? search = null)
        => Ok(await _mediator.Send(new GetChalansQuery(page, pageSize, companyId, month, year, search)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetChalanByIdQuery(id));
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Create([FromBody] SaveChalanRequest request)
    {
        var id = await _mediator.Send(new CreateChalanCommand(request));
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveChalanRequest request)
    {
        await _mediator.Send(new UpdateChalanCommand(id, request));
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteChalanCommand(id));
        return NoContent();
    }
}
