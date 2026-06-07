using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shree.Application.Features.Bills;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/bills")]
[Authorize]
public class BillsController : ControllerBase
{
    private readonly IMediator _mediator;
    public BillsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
        [FromQuery] int? companyId = null, [FromQuery] string? billStatus = null,
        [FromQuery] string? paymentStatus = null, [FromQuery] int? month = null, [FromQuery] int? year = null)
        => Ok(await _mediator.Send(new GetBillsQuery(page, pageSize, companyId, billStatus, paymentStatus, month, year)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetBillByIdQuery(id));
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPending([FromQuery] int? companyId = null)
        => Ok(await _mediator.Send(new GetPendingBillsQuery(companyId)));

    [HttpGet("check/{number}")]
    public async Task<IActionResult> CheckNumber(string number)
        => Ok(new { exists = await _mediator.Send(new CheckBillNumberQuery(number)) });

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Create([FromBody] CreateBillRequest request)
    {
        var id = await _mediator.Send(new CreateBillCommand(request));
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBillRequest request)
    {
        await _mediator.Send(new UpdateBillCommand(id, request));
        return NoContent();
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateBillStatusRequest request)
    {
        await _mediator.Send(new UpdateBillStatusCommand(id, request.Status));
        return NoContent();
    }

    [HttpPatch("{id:int}/payment-status")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> UpdatePaymentStatus(int id, [FromBody] UpdateBillPaymentStatusRequest request)
    {
        await _mediator.Send(new UpdateBillPaymentStatusCommand(id, request.PaymentStatus, request.PaymentReceived));
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteBillCommand(id));
        return NoContent();
    }
}

// Request bodies for PATCH endpoints
public record UpdateBillStatusRequest(string Status);
public record UpdateBillPaymentStatusRequest(string PaymentStatus, decimal PaymentReceived);
