using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shree.Application.Features.Employees;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/employees")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly IMediator _mediator;
    public EmployeesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null)
        => Ok(await _mediator.Send(new GetEmployeesQuery(page, pageSize, search)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetEmployeeByIdQuery(id));
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("list")]
    public async Task<IActionResult> GetList()
        => Ok(await _mediator.Send(new GetEmployeeListQuery()));

    [HttpGet("{id:int}/due")]
    public async Task<IActionResult> GetDue(int id)
    {
        var result = await _mediator.Send(new GetEmployeeDueQuery(id));
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Create([FromBody] SaveEmployeeRequest request)
    {
        var id = await _mediator.Send(new CreateEmployeeCommand(request));
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveEmployeeRequest request)
    {
        await _mediator.Send(new UpdateEmployeeCommand(id, request));
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteEmployeeCommand(id));
        return NoContent();
    }
}
