namespace Shree.Domain.Entities;

public class AuditLog
{
    public long Id { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string? RecordId { get; set; }
    public string Action { get; set; } = string.Empty;   // Created, Updated, Deleted
    public string? OldValues { get; set; }   // JSON
    public string? NewValues { get; set; }   // JSON
    public string? ChangedColumns { get; set; }
    public string? UserId { get; set; }
    public string? UserEmail { get; set; }
    public DateTime Timestamp { get; set; }
}
