# Service Dependency Map

## Overview

```
┌─────────────────────┐
│   aspire1.Web       │
│  (Blazor Server)    │
└──────────┬──────────┘
           │ WeatherApiClient
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
- ✅ aspire1.WeatherService (via WeatherApiClient)
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
| web-agent | WeatherService, ServiceDefaults | Web components, endpoints | weather-agent if changing API expectations |
| weather-agent | ServiceDefaults | Weather data, models, endpoints | web-agent if changing endpoint contract |
| infra-agent | All services (reference) | Bicep, Azure resources | All agents before deploying breaking changes |

## Integration Points

### Web ↔ Weather
- **Interface**: `WeatherApiClient` in Web calls `WeatherService`
- **Contract**: `GET /weatherforecast`
- **Payload**: `WeatherForecast[]` DTO
- **Agents**: web-agent and weather-agent coordinate changes
- **Testing**: Integration tests in aspire1.Web.Tests

### All ↔ ServiceDefaults
- **Interface**: AddServiceDefaults() extension
- **Contract**: Health checks, OpenTelemetry, resilience policies
- **Impact**: Changes here affect ALL services
- **Agents**: All agents coordinate before making changes
- **Testing**: All service tests must pass

## Parallel Development Rules

### ✅ Safe Parallel Work
- web-agent modifying Components/ while weather-agent modifies Services/
- infra-agent deploying resources while weather-agent develops new endpoints

### ⚠️ Requires Coordination
- Any change to aspire1.ServiceDefaults (affects ALL services)
- Adding new service-to-service endpoints
- Changing health check formats
- Modifying DTO contracts between services

### ❌ Never Do In Parallel
- Multiple agents modifying the same file
- Different agents changing the same interface
- Concurrent changes to AppHost service discovery
