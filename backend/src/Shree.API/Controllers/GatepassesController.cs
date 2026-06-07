using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shree.Application.Features.Gatepasses;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/gatepasses")]
[Authorize]
public class GatepassesController : ControllerBase
{
    private readonly IMediator _mediator;
    public GatepassesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null, [FromQuery] int? companyId = null,
        [FromQuery] string? search = null)
        => Ok(await _mediator.Send(new GetGatepassesQuery(page, pageSize, status, companyId, search)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetGatepassByIdQuery(id));
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("check/{number}")]
    public async Task<IActionResult> CheckNumber(string number)
        => Ok(new { exists = await _mediator.Send(new CheckGatepassNumberQuery(number)) });

    [HttpGet("details/{number}")]
    public async Task<IActionResult> GetByNumber(string number)
    {
        var result = await _mediator.Send(new GetGatepassByNumberQuery(number));
        return result is null ? NotFound(new { message = $"Gatepass '{number}' not found" }) : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Create([FromBody] CreateGatepassRequest request)
    {
        var id = await _mediator.Send(new CreateGatepassCommand(request));
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateGatepassStatusRequest request)
    {
        await _mediator.Send(new UpdateGatepassStatusCommand(id, request.Status));
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteGatepassCommand(id));
        return NoContent();
    }
}
