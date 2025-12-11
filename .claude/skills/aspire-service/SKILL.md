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

### In WeatherService (backend data service):

```csharp
// In Program.cs
app.MapGet("/{resource}", (IDataGenerator generator) => generator.Generate())
    .WithName("Get{Resource}")
    .WithOpenApi();
```

### In ApiService (API gateway):

```csharp
// In Program.cs
app.MapGet("/api/{resource}", async (HttpClient backendClient, CancellationToken ct) =>
{
    var data = await backendClient.GetFromJsonAsync<ResourceDto[]>("/{resource}", ct);
    return Results.Ok(data);
})
.WithName("GetApi{Resource}")
.WithOpenApi()
.Produces<ResourceDto[]>(StatusCodes.Status200OK);
```

### In Web (frontend client):

```csharp
// Create {Resource}ApiClient.cs following WeatherApiClient pattern
public class ResourceApiClient(HttpClient httpClient)
{
    public async Task<Resource[]> GetAsync(CancellationToken ct = default)
    {
        return await httpClient.GetFromJsonAsync<Resource[]>("/api/{resource}", ct) ?? [];
    }
}

// Register in Program.cs
builder.Services.AddHttpClient<ResourceApiClient>(client =>
{
    client.BaseAddress = new("https+http://apiservice");
});
```

## AppHost Registration

When adding new services, register them in `aspire1.AppHost/AppHost.cs`:

```csharp
var newService = builder.AddProject<Projects.aspire1_NewService>("newservice");

var apiService = builder.AddProject<Projects.aspire1_ApiService>("apiservice")
    .WithReference(newService);  // Add reference for service discovery
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
