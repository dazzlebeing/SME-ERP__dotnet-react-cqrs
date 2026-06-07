using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shree.Infrastructure.Persistence;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/audit-logs")]
[Authorize(Roles = "Admin")]
public class AuditLogsController : ControllerBase
{
    private readonly ShreeDbContext _db;
    public AuditLogsController(ShreeDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? entity = null,
        [FromQuery] string? recordId = null,
        [FromQuery] string? userId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = _db.AuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(entity)) query = query.Where(a => a.TableName == entity);
        if (!string.IsNullOrWhiteSpace(recordId)) query = query.Where(a => a.RecordId == recordId);
        if (!string.IsNullOrWhiteSpace(userId)) query = query.Where(a => a.UserId == userId);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id, a.TableName, a.RecordId, a.Action,
                a.OldValues, a.NewValues, a.ChangedColumns,
                a.UserId, a.UserEmail, a.Timestamp
            })
            .ToListAsync(ct);

        return Ok(new { items, totalCount = total, page, pageSize, totalPages = (int)Math.Ceiling(total / (double)pageSize) });
    }
}
