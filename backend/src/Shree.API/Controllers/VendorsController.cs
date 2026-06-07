using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shree.Application.Features.Vendors;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/vendors")]
[Authorize]
public class VendorsController : ControllerBase
{
    private readonly IMediator _mediator;
    public VendorsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null)
        => Ok(await _mediator.Send(new GetVendorsQuery(page, pageSize, search)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetVendorByIdQuery(id));
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("list")]
    public async Task<IActionResult> GetList()
        => Ok(await _mediator.Send(new GetVendorListQuery()));

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Create([FromBody] SaveVendorRequest request)
    {
        var id = await _mediator.Send(new CreateVendorCommand(request));
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveVendorRequest request)
    {
        await _mediator.Send(new UpdateVendorCommand(id, request));
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteVendorCommand(id));
        return NoContent();
    }
}
