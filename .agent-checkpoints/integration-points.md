# Service Integration Points

This document outlines all integration points between services and how agents should coordinate changes.

## Current Integration Points

### 1. Web → API Service
**Location**: `aspire1.Web/WeatherApiClient.cs`

```csharp
// Contract
public async Task<WeatherForecast[]> GetWeatherAsync(CancellationToken cancellationToken = default)

// Endpoint: aspire1.ApiService GET /weatherforecast
```

**Coordination**:
- web-agent cannot change `WeatherApiClient` without api-agent coordination
- api-agent must maintain backward compatibility with `/weatherforecast` endpoint
- Changes to DTO require updates in both projects

**Testing**:
- Integration tests in `aspire1.Web.Tests/WeatherApiClientTests.cs`
- Must pass before either agent can deploy

### 2. API Service → Weather Service
**Location**: `aspire1.ApiService/Program.cs` (HttpClient factory)

```csharp
// Calls WeatherService: GET /weatherforecast
// Returns: WeatherForecast[] DTO
```

**Coordination**:
- api-agent cannot change call pattern without weather-agent coordination
- weather-agent must maintain `/weatherforecast` endpoint signature
- Both use the same `WeatherForecast` DTO - changes require both agents

**Testing**:
- Integration tests in `aspire1.ApiService.Tests/`
- Must verify resilience (retries, circuit breaker) against WeatherService

### 3. Health Check Coordination (All Services)
**Location**: `aspire1.ServiceDefaults/Extensions.cs`

```csharp
public static IHealthChecksBuilder AddServiceDefaults(...)
// All services call: builder.AddServiceDefaults()
```

**Critical Points**:
- Endpoint: GET `/health/detailed`
- Format: Standardized JSON response with status, version, timestamp
- All agents depend on this

**Coordination**:
- **MUST** coordinate ALL four agents before changing health check format
- Any service change must have corresponding health check update
- Backward compatibility required for 30 days minimum

**Testing**:
- Health endpoints tested in each service's integration tests
- AppHost must verify health checks during startup

### 4. OpenTelemetry Configuration (All Services)
**Location**: `aspire1.ServiceDefaults/Extensions.cs`

```csharp
builder.ConfigureOpenTelemetry(...)
// Configures tracing, metrics, and logging
```

**Coordination**:
- Changes here affect Application Insights ingestion for ALL services
- Requires infrastructure-agent coordination (alert rules may change)
- Must maintain compatibility with existing dashboards

**Testing**:
- Verify traces appear in Application Insights
- Check that health endpoints are excluded from traces

## DTOs and Shared Models

### WeatherForecast
**Defined in**: Each service defines its own version
**Used by**: Web → API → Weather

```csharp
public record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary);
```

**Coordination**:
- If changing structure, ALL agents must update together
- Currently defined in 3 locations (duplication is OK for independent deployment)
- Breaking changes require 2+ week deprecation notice

## Endpoint Contracts

| Service | Endpoint | Method | Agent | Input | Output |
|---------|----------|--------|-------|-------|--------|
| ApiService | `/weatherforecast` | GET | api-agent | none | `WeatherForecast[]` |
| WeatherService | `/weatherforecast` | GET | weather-agent | none | `WeatherForecast[]` |
| All | `/health/detailed` | GET | All | none | JSON health status |
| All | `/version` | GET | All | none | JSON with version |

## Adding New Integration Points

When adding a new integration point:

1. **Document it here** before implementing
2. **Notify relevant agents** via .agent-checkpoints/breaking-changes.md
3. **Write integration tests** for both sides of the call
4. **Update dependency-map.md** with the new integration
5. **Ensure backward compatibility** (if adding to existing endpoints)
6. **Wait for coordination** - don't deploy unilaterally

## Deprecation Process

For breaking changes:

1. Create PR with new endpoint (keep old one working)
2. Notify dependent agents
3. All dependent services update to use new endpoint
4. Old endpoint deprecated for 2 weeks
5. After 2 weeks, remove old endpoint
6. Deploy in order: ServiceDefaults → dependent services

Example:
- Week 1: New endpoint deployed alongside old one
- Week 2: All consumers switched to new endpoint
- Week 3: Old endpoint removed

## Request-Response Flow

```
┌─────────────┐
│ Browser     │
└──────┬──────┘
       │ HTTP
       ▼
┌───────────────────┐       WeatherApiClient        ┌──────────────┐
│ aspire1.Web       │─────────────────────────────→│ aspire1.Api  │
│ (Blazor Server)   │ GET /weatherforecast          │   Service    │
│                   │←─────────────────────────────│              │
│ WeatherForecast[] │                               └──────┬───────┘
└───────────────────┘                                      │
                                                           │ HttpClient
                                                           ▼
                                                    ┌──────────────────────┐
                                                    │ aspire1.WeatherService│
                                                    │ GET /weatherforecast  │
                                                    │                       │
                                                    │ → WeatherForecast[]   │
                                                    └──────────────────────┘
```

## Failure Handling

### If WeatherService is down
- ApiService: Circuit breaker activates, returns 503 or cached response
- Web: WeatherApiClient gets timeout, displays error to user
- **Agent action**: weather-agent must fix WeatherService, no breaking changes to API contract

### If API Service is down
- Web: Cannot load weather data, displays error
- **Agent action**: api-agent must restore service, maintain endpoint contract

### If health checks fail
- AppHost: Service marked unhealthy, may not receive traffic
- Alerts: infra-agent receives notifications
- **Agent action**: All agents investigate which service is failing
