using FluentValidation;
using System.Net;
using System.Text.Json;

namespace Shree.API.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        var (statusCode, title, detail) = ex switch
        {
            ValidationException ve => (
                HttpStatusCode.UnprocessableEntity,
                "Validation failed",
                string.Join("; ", ve.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}"))
            ),
            KeyNotFoundException => (HttpStatusCode.NotFound, "Resource not found", ex.Message),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Unauthorized", ex.Message),
            InvalidOperationException => (HttpStatusCode.Conflict, "Conflict", ex.Message),
            ArgumentException => (HttpStatusCode.BadRequest, "Bad request", ex.Message),
            _ => (HttpStatusCode.InternalServerError, "An error occurred", "An unexpected error occurred")
        };

        if (statusCode == HttpStatusCode.InternalServerError)
            _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
        else
            _logger.LogWarning("Handled exception ({Status}): {Message}", statusCode, ex.Message);

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = (int)statusCode;

        var problem = new
        {
            type = $"https://httpstatuses.io/{(int)statusCode}",
            title,
            status = (int)statusCode,
            detail,
            instance = context.Request.Path.Value
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(problem,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
    }
}
