# Service Integration Points

This document outlines all integration points between services and how agents should coordinate changes.

Note: This file is guidance. Mutation rules live in `.agent-context.json` (repo root + per-service).

## Current Integration Points

### 1. Web → Weather Service (Direct)
**Location**: `aspire1.Web/WeatherApiClient.cs`

```csharp
// Contract
public async Task<WeatherForecast[]> GetWeatherAsync(int maxItems = 10, CancellationToken cancellationToken = default)

// Endpoint: aspire1.WeatherService GET /weatherforecast
```

**Coordination**:
- web-agent may change `WeatherApiClient`; coordinate with weather-agent for any contract/DTO change or `/weatherforecast` behavior change
- weather-agent must maintain backward compatibility with `/weatherforecast` endpoint
- Changes to `WeatherForecast` DTO require updates in both projects

**Testing**:
- Integration tests in `aspire1.Web.Tests/WeatherApiClientTests.cs`
- Must pass before either agent can deploy

### 2. Health Check Coordination (All Services)
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
- **MUST** coordinate both web-agent and weather-agent before changing health check format
- Any service change must have corresponding health check update
- Backward compatibility required for 30 days minimum

**Testing**:
- Health endpoints tested in each service's integration tests
- AppHost must verify health checks during startup

### 3. OpenTelemetry Configuration (All Services)
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
**Used by**: Web → Weather

```csharp
public record WeatherForecast(DateOnly Date, int TemperatureC, int Humidity, string? Summary);
```

**Coordination**:
- If changing structure, both web-agent and weather-agent must update together
- Currently defined in 2 locations (duplication is OK for independent deployment)
- Breaking changes require 2+ week deprecation notice

## Endpoint Contracts

| Service | Endpoint | Method | Agent | Input | Output |
|---------|----------|--------|-------|-------|--------|
| WeatherService | `/weatherforecast` | GET | weather-agent | none | `WeatherForecast[]` |
| All | `/health/detailed` | GET | All | none | JSON health status |
| All | `/version` | GET | All | none | JSON with version |

Note: aspire1.ApiService exists but is not currently used in AppHost orchestration.

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
┌───────────────────┐       WeatherApiClient        ┌──────────────────────┐
│ aspire1.Web       │─────────────────────────────→│ aspire1.Weather      │
│ (Blazor Server)   │ GET /weatherforecast          │    Service           │
│                   │←─────────────────────────────│                      │
│ WeatherForecast[] │                               │ → WeatherForecast[]  │
└───────────────────┘                               └──────────────────────┘
```

## Failure Handling

### If WeatherService is down
- Web: WeatherApiClient gets timeout/error, displays error to user
- **Agent action**: weather-agent must fix WeatherService, no breaking changes to API contract

### If health checks fail
- AppHost: Service marked unhealthy, may not receive traffic
- Alerts: infra-agent receives notifications
- **Agent action**: Relevant agent investigates which service is failing
