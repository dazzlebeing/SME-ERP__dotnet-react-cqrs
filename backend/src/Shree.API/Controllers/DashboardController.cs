using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shree.Application.Features.Dashboard;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IMediator _mediator;
    public DashboardController(IMediator mediator) => _mediator = mediator;

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
        => Ok(await _mediator.Send(new GetDashboardStatsQuery()));

    [HttpGet("graph")]
    public async Task<IActionResult> GetGraph([FromQuery] int year = 0)
    {
        if (year <= 0) year = DateTime.UtcNow.Year;
        return Ok(await _mediator.Send(new GetDashboardGraphQuery(year)));
    }

    [HttpGet("recent-gatepasses")]
    public async Task<IActionResult> GetRecentGatepasses([FromQuery] int count = 5)
        => Ok(await _mediator.Send(new GetRecentGatepassesForDashboardQuery(count)));
}
