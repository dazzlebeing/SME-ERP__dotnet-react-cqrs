using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shree.Application.Features.Salary;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/salary")]
[Authorize]
public class SalaryController : ControllerBase
{
    private readonly IMediator _mediator;
    public SalaryController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
        [FromQuery] int? employeeId = null, [FromQuery] int? month = null, [FromQuery] int? year = null)
        => Ok(await _mediator.Send(new GetSalaryQuery(page, pageSize, employeeId, month, year)));

    [HttpGet("months")]
    public async Task<IActionResult> GetMonths([FromQuery] int employeeId)
        => Ok(await _mediator.Send(new GetSalaryMonthsQuery(employeeId)));

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Create([FromBody] CreateSalaryRequest request)
    {
        var id = await _mediator.Send(new CreateSalaryCommand(request));
        return Created($"/api/v1/salary/{id}", new { id });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteSalaryCommand(id));
        return NoContent();
    }
}
