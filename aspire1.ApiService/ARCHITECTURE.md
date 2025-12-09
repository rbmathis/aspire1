# Architecture - aspire1.ApiService

> **Component Type:** Minimal API (REST)  
> **Framework:** ASP.NET Core 10.0  
> **Purpose:** Backend API service providing weather data and system metadata

## 🎯 Overview

The **ApiService** is a lightweight REST API built with ASP.NET Core Minimal APIs. It demonstrates:
- Minimal API routing (no controllers)
- OpenTelemetry instrumentation (via ServiceDefaults)
- Health checks with version metadata
- Service discovery (consumed by aspire1.Web)
- SemVer-based deployment tracking

## 🏗️ Architecture

```mermaid
graph TB
    Client[aspire1.Web<br/>HTTP Client]
    
    subgraph "aspire1.ApiService"
        Middleware[Middleware Pipeline]
        Routes[Minimal API Routes]
        ServiceDefaults[ServiceDefaults<br/>OpenTelemetry, Health]
        
        subgraph "Endpoints"
            Root[GET /]
            Weather[GET /weatherforecast]
            Version[GET /version]
            HealthDetailed[GET /health/detailed]
            Health[GET /health]
        end
    end
    
    subgraph "Azure Services"
        AppInsights[Application Insights]
        KeyVault[Key Vault]
    end
    
    Client -->|Service Discovery| Middleware
    Middleware --> Routes
    Routes --> Root
    Routes --> Weather
    Routes --> Version
    Routes --> HealthDetailed
    Routes --> Health
    
    ServiceDefaults -.->|Traces, Metrics| AppInsights
    ServiceDefaults -.->|Secrets| KeyVault
    
    style Routes fill:#0078d4,stroke:#005a9e,color:#fff
    style ServiceDefaults fill:#50e6ff
```

## 📡 API Endpoints

### `GET /`
**Purpose:** Root status message

**Response:**
```json
"API service is running. Navigate to /weatherforecast to see sample data."
```

---

### `GET /weatherforecast`
**Purpose:** Sample weather data generator

**Response:**
```json
[
  {
    "date": "2025-12-10",
    "temperatureC": 15,
    "temperatureF": 59,
    "summary": "Mild"
  },
  // ... 4 more days
]
```

**Implementation:**
- Generates 5 days of random weather forecasts
- Uses in-memory data (no database)
- Demonstrates JSON serialization

---

### `GET /version`
**Purpose:** Deployment tracking and version verification

**Response:**
```json
{
  "version": "1.0.0+a1af010e18",
  "commitSha": "a1af010",
  "service": "apiservice",
  "environment": "Production",
  "timestamp": "2025-12-09T18:30:00Z"
}
```

**Use Cases:**
- Verify deployed version in Azure Portal
- Compare versions across environments (dev/staging/prod)
- Correlate application behavior with git commits
- Smoke test after deployment

---

### `GET /health/detailed`
**Purpose:** Enhanced health check with version metadata for OpenTelemetry correlation

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0+a1af010e18",
  "commitSha": "a1af010",
  "service": "apiservice",
  "timestamp": "2025-12-09T18:30:00Z",
  "uptime": 3600.5
}
```

**Use Cases:**
- Debugging distributed traces (find which version produced a span)
- Uptime monitoring (seconds since container start)
- Service mesh health dashboards

---

### `GET /health`
**Purpose:** Standard Aspire health check (from ServiceDefaults)

**Response:** `Healthy` (200 OK) or `Unhealthy` (503 Service Unavailable)

**Checks:**
- `self`: Always returns `Healthy` (liveness probe)
- Additional checks can be added (database, cache, etc.)

**Configuration:**
- Managed by `ServiceDefaults.MapDefaultEndpoints()`
- Only exposed in Development environment by default
- ACA uses this for readiness/liveness probes

## 🔧 Startup Configuration

### Program.cs Flow

```mermaid
sequenceDiagram
    participant Main as Program.cs
    participant Builder as WebApplicationBuilder
    participant SD as ServiceDefaults
    participant App as WebApplication
    
    Main->>Builder: WebApplication.CreateBuilder(args)
    Main->>SD: builder.AddServiceDefaults()
    SD-->>Builder: OpenTelemetry, Health, Resilience
    Main->>Builder: AddProblemDetails(), AddOpenApi()
    Main->>Main: Extract version from assembly/config
    Main->>App: builder.Build()
    Main->>App: Configure middleware pipeline
    Main->>App: Map endpoints
    Main->>App: MapDefaultEndpoints()
    Main->>App: app.Run()
```

### Key Configuration Steps

1. **Service Defaults:** Registers OpenTelemetry, health checks, resilience handlers
2. **Problem Details:** Standardized error responses (RFC 7807)
3. **OpenAPI:** Swagger/OpenAPI documentation generation
4. **Version Extraction:** Reads from `APP_VERSION` env var or assembly metadata
5. **Middleware Pipeline:** Exception handler, HTTPS redirection (production)
6. **Endpoint Mapping:** Minimal API routes
7. **Health Endpoints:** `/health`, `/alive` (from ServiceDefaults)

## 🔐 Configuration & Secrets

### Configuration Sources (Priority Order)

1. **Environment Variables** (highest priority)
   - `APP_VERSION` - Injected by AppHost or azd
   - `COMMIT_SHA` - Injected by AppHost or GitHub Actions
   - `OTEL_EXPORTER_OTLP_ENDPOINT` - Application Insights endpoint

2. **Azure Key Vault References** (production)
   - Connection strings
   - API keys
   - External service credentials

3. **appsettings.{Environment}.json**
   - Environment-specific non-sensitive config

4. **appsettings.json**
   - Default non-sensitive config

5. **User Secrets** (local dev only)
   - `dotnet user-secrets set "MySecret" "value"`

### Example: Adding a Database Connection

```csharp
// ❌ DON'T: Hard-code in appsettings.json
{
  "ConnectionStrings": {
    "MyDb": "Server=...;Password=..." // NEVER COMMIT THIS
  }
}

// ✅ DO: Use environment variable (Key Vault reference in ACA)
var connectionString = builder.Configuration.GetConnectionString("MyDb");
builder.Services.AddDbContext<MyDbContext>(options =>
    options.UseNpgsql(connectionString));
```

**In Azure:**
```yaml
# Bicep generates this (from AppHost)
env:
  - name: ConnectionStrings__MyDb
    secretRef: mydb-connection  # Points to Key Vault secret
```

## 📊 OpenTelemetry Instrumentation

### What's Instrumented (via ServiceDefaults)

| Type | Instrumented Components | Example |
|------|-------------------------|---------|
| **Traces** | ASP.NET Core requests, HttpClient calls | Request → `/weatherforecast` span |
| **Metrics** | Request rate, duration, CPU, memory, exceptions | `http.server.request.duration` |
| **Logs** | Structured logs with scopes and formatted messages | `Processing weather request for 5 days` |

### Example Trace Flow

```mermaid
sequenceDiagram
    participant User
    participant Web as aspire1.Web
    participant API as aspire1.ApiService
    participant OTEL as Application Insights
    
    User->>Web: GET /weather
    Note over Web: Trace ID: abc123
    Web->>API: GET /weatherforecast
    Note over API: Parent Span: Web<br/>Child Span: API
    API-->>Web: Weather data
    Web-->>User: Rendered page
    
    Web->>OTEL: Export trace (Span: Web)
    API->>OTEL: Export trace (Span: API)
    
    Note over OTEL: Correlate spans by Trace ID<br/>Show end-to-end latency
```

### Querying Traces in Application Insights

```kql
// Find all requests to /weatherforecast with version 1.0.0
dependencies
| where target == "apiservice"
| where name contains "weatherforecast"
| extend version = tostring(customDimensions.version)
| where version == "1.0.0"
| project timestamp, duration, success, version
```

## 🚀 Deployment

### Local Development

```bash
# Run standalone (requires AppHost for service discovery)
dotnet run --project aspire1.ApiService

# Access endpoints
curl http://localhost:7002/weatherforecast
curl http://localhost:7002/version
```

### Azure Container Apps

**Container Image:**
- **Registry:** `{acr}.azurecr.io`
- **Repository:** `aspire1-apiservice`
- **Tag:** `{version}` (e.g., `1.0.0`)

**Environment Variables (injected by azd):**
- `APP_VERSION`: `1.0.0`
- `COMMIT_SHA`: `a1af010`
- `OTEL_EXPORTER_OTLP_ENDPOINT`: `https://...` (Application Insights)
- `ASPNETCORE_ENVIRONMENT`: `Production`

**Health Probes:**
```yaml
livenessProbe:
  httpGet:
    path: /alive
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

**Scaling:**
- **Min Replicas:** 1 (always warm)
- **Max Replicas:** 5
- **Scale Rule:** HTTP - 50 concurrent requests per replica
- **Scale In Delay:** 5 minutes

## 🎯 Testing

### Unit Tests (Future)

```csharp
// Example with xUnit + FluentAssertions
public class WeatherForecastTests
{
    [Fact]
    public void GetWeatherForecast_Returns5Days()
    {
        // Arrange
        var forecast = GetWeatherForecast(); // Extracted logic

        // Act
        var result = forecast.ToArray();

        // Assert
        result.Should().HaveCount(5);
        result.All(f => f.Date > DateOnly.FromDateTime(DateTime.Now))
            .Should().BeTrue();
    }
}
```

### Integration Tests (Future)

```csharp
// Example with Aspire.Hosting.Testing
public class ApiServiceTests : IAsyncLifetime
{
    private DistributedApplication _app = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        var appHost = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.aspire1_AppHost>();
        _app = await appHost.BuildAsync();
        await _app.StartAsync();

        _client = _app.CreateHttpClient("apiservice");
    }

    [Fact]
    public async Task WeatherForecast_ReturnsSuccessAndData()
    {
        // Act
        var response = await _client.GetAsync("/weatherforecast");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = await response.Content.ReadFromJsonAsync<WeatherForecast[]>();
        data.Should().HaveCount(5);
    }

    public async Task DisposeAsync() => await _app.DisposeAsync();
}
```

## 🐛 Troubleshooting

### Service Discovery Fails

**Symptom:** aspire1.Web can't reach `/weatherforecast`

**Diagnostics:**
```bash
# From aspire1.Web container
curl http://apiservice/health
```

**Fix:**
- Ensure AppHost uses `WithReference(apiService)` on Web
- Verify service name matches: `"apiservice"` (not `"aspire1.ApiService"`)

### Version Shows "unknown"

**Symptom:** `/version` returns `{ "version": "unknown" }`

**Diagnostics:**
```bash
# Check environment variables
azd env get-values | findstr VERSION

# Check assembly version
dotnet build -c Release
$dll = Get-Item "bin/Release/net10.0/aspire1.ApiService.dll"
[System.Diagnostics.FileVersionInfo]::GetVersionInfo($dll.FullName)
```

**Fix:**
- Ensure MinVer is installed: `dotnet tool install -g minver-cli`
- Tag git repo: `git tag v1.0.0`
- Set environment variable: `azd env set VERSION $(minver)`

### Health Check Fails in ACA

**Symptom:** Container restarts repeatedly, logs show "Health check failed"

**Diagnostics:**
```bash
# View container logs
az containerapp logs show \
  --name aspire1-apiservice \
  --resource-group rg-aspire1-prod \
  --follow
```

**Fix:**
- Ensure `/health` endpoint returns 200 OK
- Check `MapDefaultEndpoints()` is called in `Program.cs`
- Verify health check is configured in ACA (via AppHost `WithHttpHealthCheck()`)

## 📚 Related Documentation

- [Root Architecture](../ARCHITECTURE.md)
- [AppHost Architecture](../aspire1.AppHost/ARCHITECTURE.md)
- [Web Service Architecture](../aspire1.Web/ARCHITECTURE.md)
- [Service Defaults](../aspire1.ServiceDefaults/ARCHITECTURE.md)

## 🔗 Useful Commands

```bash
# Run with custom version
$env:APP_VERSION="2.0.0"; dotnet run

# Test all endpoints
curl http://localhost:7002/
curl http://localhost:7002/weatherforecast
curl http://localhost:7002/version
curl http://localhost:7002/health/detailed
curl http://localhost:7002/health

# Build release container
dotnet publish -c Release
docker build -t aspire1-apiservice:1.0.0 .

# Run in container locally
docker run -p 8080:8080 -e APP_VERSION=1.0.0 aspire1-apiservice:1.0.0
```

---

**Next:** [Web Service Architecture](../aspire1.Web/ARCHITECTURE.md) →
