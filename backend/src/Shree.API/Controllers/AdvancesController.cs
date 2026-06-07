using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shree.Application.Features.Advances;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/advances")]
[Authorize]
public class AdvancesController : ControllerBase
{
    private readonly IMediator _mediator;
    public AdvancesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] int? employeeId = null)
        => Ok(await _mediator.Send(new GetAdvancesQuery(page, pageSize, employeeId)));

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Create([FromBody] CreateAdvanceRequest request)
    {
        var id = await _mediator.Send(new CreateAdvanceCommand(request));
        return Created($"/api/v1/advances/{id}", new { id });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteAdvanceCommand(id));
        return NoContent();
    }
}
