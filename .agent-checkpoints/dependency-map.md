# Service Dependency Map

## Overview

```
┌─────────────────────┐
│   aspire1.Web       │
│  (Blazor Server)    │
└──────────┬──────────┘
           │ WeatherApiClient (HttpClient)
           ▼
┌──────────────────────────┐
│aspire1.WeatherService    │
│  (Microservice)          │
└──────────────────────────┘

All services ▼
┌────────────────────────────┐
│aspire1.ServiceDefaults     │
│(Shared infrastructure)     │
└────────────────────────────┘
```

## Dependency Graph

### aspire1.Web → Dependencies
- ✅ aspire1.WeatherService (via WeatherApiClient HttpClient)
- ✅ aspire1.ServiceDefaults (health checks, tracing)

### aspire1.WeatherService → Dependencies
- ✅ aspire1.ServiceDefaults (health checks, tracing)
- ❌ aspire1.Web (should never call - creates cycle)

### aspire1.ServiceDefaults → Dependencies
- ✅ None (standalone shared library)
- ✅ All services depend on this

## Critical Coordination Points

| Agent | Readonly Dependencies | Can Modify | Must Notify |
|-------|----------------------|-----------|-------------|
| web-agent | WeatherService contracts, ServiceDefaults | Web components, WeatherApiClient | weather-agent if changing endpoint expectations |
| weather-agent | ServiceDefaults | Weather data, models, endpoints | web-agent if changing endpoint contract |
| infra-agent | All services (reference) | Bicep, Azure resources | All agents before deploying breaking changes |

## Integration Points

### Web ↔ Weather
- **Interface**: `WeatherApiClient` in Web calls `WeatherService` directly
- **Contract**: `GET /weatherforecast`
- **Payload**: `WeatherForecast` DTO (with Date, TemperatureC, Humidity, Summary)
- **Agents**: web-agent and weather-agent coordinate changes
- **Testing**: Integration tests in aspire1.Web.Tests

### All ↔ ServiceDefaults
- **Interface**: AddServiceDefaults() extension
- **Contract**: Health checks, OpenTelemetry, resilience policies
- **Impact**: Changes here affect BOTH services (Web and Weather)
- **Agents**: All agents coordinate before making changes
- **Testing**: All service tests must pass

## Parallel Development Rules

### ✅ Safe Parallel Work
- web-agent modifying Components/ (UI) while weather-agent modifies internal Services/ (data generation)
- infra-agent deploying resources while weather-agent develops new endpoints (no contract changes)
- Documentation updates by any agent

### ⚠️ Requires Coordination
- Any change to aspire1.ServiceDefaults (affects both services)
- Adding new WeatherService endpoints (web-agent needs to know)
- Changing health check formats
- Modifying WeatherForecast DTO contract

### ❌ Never Do In Parallel
- Multiple agents modifying the same file
- Different agents changing the WeatherForecast DTO
- Concurrent changes to AppHost service discovery
