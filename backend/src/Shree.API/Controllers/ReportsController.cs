using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shree.Application.Features.Reports;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IMediator _mediator;
    public ReportsController(IMediator mediator) => _mediator = mediator;

    // ---- GST Reports ----

    [HttpGet("gst/gstr1")]
    public async Task<IActionResult> GetGstr1([FromQuery] int month, [FromQuery] int year)
        => Ok(await _mediator.Send(new GetGstr1Query(month, year)));

    [HttpGet("gst/gstr2")]
    public async Task<IActionResult> GetGstr2([FromQuery] int month, [FromQuery] int year)
        => Ok(await _mediator.Send(new GetGstr2Query(month, year)));

    [HttpGet("gst/3b")]
    public async Task<IActionResult> GetGstr3b([FromQuery] int month, [FromQuery] int year)
        => Ok(await _mediator.Send(new GetGstr3bQuery(month, year)));

    // ---- Sales & Purchase Reports ----

    [HttpGet("sales")]
    public async Task<IActionResult> GetSales([FromQuery] int month, [FromQuery] int year, [FromQuery] int? companyId = null)
        => Ok(await _mediator.Send(new GetSalesReportQuery(month, year, companyId)));

    [HttpGet("purchase")]
    public async Task<IActionResult> GetPurchase([FromQuery] int month, [FromQuery] int year, [FromQuery] int? vendorId = null)
        => Ok(await _mediator.Send(new GetPurchaseReportQuery(month, year, vendorId)));

    // ---- Company-wise Reports ----

    [HttpGet("company/{id:int}/bills")]
    public async Task<IActionResult> GetCompanyBills(int id, [FromQuery] int? month = null, [FromQuery] int? year = null)
        => Ok(await _mediator.Send(new GetCompanyBillsReportQuery(id, month, year)));
}
