---
description: Aspire service architecture patterns and code generation for this .NET Aspire solution. Use when creating new services, endpoints, or integrations.
---

# Aspire Service Architecture Skill

This skill provides patterns for creating new services, endpoints, and integrations in the aspire1 .NET Aspire solution.

## Service Structure

All services follow this structure:

- `aspire1.{ServiceName}/` - Main project
- `aspire1.{ServiceName}.Tests/` - Test project
- `aspire1.{ServiceName}/ARCHITECTURE.md` - Service-specific patterns

## Adding a New Endpoint

**Current Architecture**: This solution uses a **two-tier architecture** where the Web frontend directly calls backend services like WeatherService. There is no ApiService intermediary layer.

### In WeatherService (backend service):

```csharp
// In Program.cs
app.MapGet("/{resource}", (IDataGenerator generator) => generator.Generate())
    .WithName("Get{Resource}")
    .WithOpenApi();
```

### In Web (frontend client):

```csharp
// Create {Resource}ApiClient.cs following WeatherApiClient pattern
public class ResourceApiClient(HttpClient httpClient)
{
    public async Task<Resource[]> GetAsync(CancellationToken ct = default)
    {
        // Call backend service directly (e.g., "weatherservice")
        return await httpClient.GetFromJsonAsync<Resource[]>("/{resource}", ct) ?? [];
    }
}

// Register in Program.cs
builder.Services.AddHttpClient<ResourceApiClient>(client =>
{
    // Use service discovery - references backend service directly
    // Note: For production, add configuration fallbacks like WeatherApiClient
    client.BaseAddress = new("https+http://weatherservice");
});
```

## AppHost Registration

When adding new services, register them in `aspire1.AppHost/AppHost.cs`:

```csharp
// Add backend service
var newService = builder.AddProject<Projects.aspire1_NewService>("newservice")
    .WithHttpHealthCheck("/health");

// Web frontend references backend service directly
var webFrontend = builder.AddProject<Projects.aspire1_Web>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithReference(newService)  // Direct reference for service discovery
    .WaitFor(newService);
```

### Future: Three-Tier Architecture with API Gateway

If you need to add an API gateway layer (ApiService) in the future:

```csharp
// In ApiService (API gateway pattern - not currently implemented):
app.MapGet("/api/{resource}", async (HttpClient backendClient, CancellationToken ct) =>
{
    var data = await backendClient.GetFromJsonAsync<ResourceDto[]>("/{resource}", ct);
    return Results.Ok(data);
})
.WithName("GetApi{Resource}")
.WithOpenApi()
.Produces<ResourceDto[]>(StatusCodes.Status200OK);

// In AppHost for three-tier:
var backend = builder.AddProject<Projects.aspire1_BackendService>("backend");
var api = builder.AddProject<Projects.aspire1_ApiService>("apiservice")
    .WithReference(backend);
var web = builder.AddProject<Projects.aspire1_Web>("webfrontend")
    .WithReference(api);  // Web calls API, API calls backend
```

## Health Check Pattern

Every service should expose:

- `GET /health/detailed` - Detailed health with version info
- `GET /version` - Version metadata

```csharp
app.MapGet("/health/detailed", (IConfiguration config) => new
{
    Status = "Healthy",
    Version = config["App:Version"] ?? "unknown",
    Timestamp = DateTime.UtcNow,
    Service = "{ServiceName}"
});
```

## Testing Pattern

Use xUnit + FluentAssertions + NSubstitute:

```csharp
public class ServiceTests
{
    [Fact]
    public async Task GetResource_ReturnsData_WhenAvailable()
    {
        // Arrange
        var generator = Substitute.For<IDataGenerator>();
        generator.Generate().Returns([new Resource(1, "Test")]);

        // Act
        var result = await sut.GetAsync();

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("Test");
    }
}
```
