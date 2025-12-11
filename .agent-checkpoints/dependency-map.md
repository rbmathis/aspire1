# Service Dependency Map

## Overview

```
┌─────────────────────┐
│   aspire1.Web       │
│  (Blazor Server)    │
└──────────┬──────────┘
           │ WeatherApiClient
           ▼
┌─────────────────────┐
│  aspire1.ApiService │
│  (Minimal API)      │
└──────────┬──────────┘
           │ HttpClient
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
- ✅ aspire1.ApiService (via WeatherApiClient)
- ✅ aspire1.ServiceDefaults (health checks, tracing)
- ❌ aspire1.WeatherService (should never call directly)

### aspire1.ApiService → Dependencies
- ✅ aspire1.WeatherService (via HttpClient)
- ✅ aspire1.ServiceDefaults (health checks, tracing, resilience)
- ❌ aspire1.Web (should never call directly)

### aspire1.WeatherService → Dependencies
- ✅ aspire1.ServiceDefaults (health checks, tracing)
- ❌ aspire1.ApiService (should never call - creates cycle)
- ❌ aspire1.Web (should never call)

### aspire1.ServiceDefaults → Dependencies
- ✅ None (standalone shared library)
- ✅ All services depend on this

## Critical Coordination Points

| Agent | Readonly Dependencies | Can Modify | Must Notify |
|-------|----------------------|-----------|-------------|
| web-agent | ApiService, ServiceDefaults, Defaults | Web components, endpoints | weather-agent if changing API expectations |
| api-agent | WeatherService, ServiceDefaults, Defaults | API endpoints, handlers | weather-agent if changing weather endpoint contract |
| weather-agent | ServiceDefaults, Defaults | Weather data, models, endpoints | api-agent if changing endpoint contract |
| infra-agent | All services (reference) | Bicep, Azure resources | All agents before deploying breaking changes |

## Integration Points

### Web ↔ API
- **Interface**: `WeatherApiClient` in Web calls `ApiService`
- **Contract**: `GET /weatherforecast`
- **Payload**: `WeatherForecast[]` DTO
- **Agents**: web-agent and api-agent coordinate changes
- **Testing**: Integration tests in aspire1.Web.Tests

### API ↔ Weather
- **Interface**: `HttpClient` in ApiService calls WeatherService
- **Contract**: `GET /weatherforecast`
- **Payload**: `WeatherForecast[]` DTO
- **Agents**: api-agent and weather-agent coordinate changes
- **Testing**: Integration tests in aspire1.ApiService.Tests

### All ↔ ServiceDefaults
- **Interface**: AddServiceDefaults() extension
- **Contract**: Health checks, OpenTelemetry, resilience policies
- **Impact**: Changes here affect ALL three services
- **Agents**: All agents coordinate before making changes
- **Testing**: All service tests must pass

## Parallel Development Rules

### ✅ Safe Parallel Work
- web-agent modifying Components/ while weather-agent modifies Services/
- api-agent adding endpoints while weather-agent modifying weather data
- infra-agent deploying resources while api-agent develops new endpoints

### ⚠️ Requires Coordination
- Any change to aspire1.ServiceDefaults (breaks all if wrong)
- Adding new service-to-service endpoints
- Changing health check formats
- Modifying DTO contracts between services

### ❌ Never Do In Parallel
- Multiple agents modifying the same file
- Different agents changing the same interface
- Concurrent changes to AppHost service discovery
