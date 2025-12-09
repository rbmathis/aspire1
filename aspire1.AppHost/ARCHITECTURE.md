# Architecture - aspire1.AppHost

> **Component Type:** Orchestrator  
> **Framework:** .NET Aspire 13.x  
> **Purpose:** Service discovery, orchestration, and local development environment

## 🎯 Overview

The **AppHost** project is the heart of your Aspire application. It defines the service topology, manages dependencies, and provides the local development dashboard. In production, it generates the infrastructure-as-code (Bicep) for Azure Container Apps deployment.

## 🏗️ Responsibilities

1. **Service Registration:** Defines all projects and their relationships
2. **Service Discovery:** Configures internal DNS for inter-service communication
3. **Environment Configuration:** Injects environment variables (VERSION, COMMIT_SHA, etc.)
4. **Container Image Metadata:** Annotates services with registry and tag information
5. **Health Checks:** Configures health endpoints for each service
6. **Development Dashboard:** Provides real-time monitoring during local dev

## 📊 Service Topology

```mermaid
graph TB
    AppHost[aspire1.AppHost<br/>Orchestrator]
    
    subgraph "Managed Services"
        API[aspire1.ApiService<br/>Internal API]
        Web[aspire1.Web<br/>Public Frontend]
    end
    
    AppHost -->|Registers| API
    AppHost -->|Registers| Web
    Web -->|WithReference| API
    Web -->|WaitFor| API
    
    style AppHost fill:#ff6b6b,stroke:#c92a2a,color:#fff
    style API fill:#0078d4,stroke:#005a9e,color:#fff
    style Web fill:#0078d4,stroke:#005a9e,color:#fff
```

## 🔧 Current Configuration

### AppHost.cs Breakdown

```csharp
// 1. Capture version metadata from configuration or environment
var version = builder.Configuration["VERSION"] ?? "1.0.0-local";
var commitSha = builder.Configuration["COMMIT_SHA"] ?? 
                Environment.GetEnvironmentVariable("GITHUB_SHA")?[..7] ?? "local";

// 2. Register API Service
var apiService = builder.AddProject<Projects.aspire1_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")                    // Health probe endpoint
    .WithEnvironment("APP_VERSION", version)           // Pass version to service
    .WithEnvironment("COMMIT_SHA", commitSha)          // Pass commit SHA
    .WithAnnotation(new ContainerImageAnnotation {     // Container metadata for ACA
        Registry = builder.Configuration["CONTAINER_REGISTRY"],
        Image = "aspire1-apiservice",
        Tag = version
    });

// 3. Register Web Frontend
builder.AddProject<Projects.aspire1_Web>("webfrontend")
    .WithExternalHttpEndpoints()                       // Expose to internet
    .WithHttpHealthCheck("/health")                    // Health probe endpoint
    .WithEnvironment("APP_VERSION", version)           // Pass version to service
    .WithEnvironment("COMMIT_SHA", commitSha)          // Pass commit SHA
    .WithReference(apiService)                         // Service discovery reference
    .WaitFor(apiService)                               // Startup dependency
    .WithAnnotation(new ContainerImageAnnotation {     // Container metadata for ACA
        Registry = builder.Configuration["CONTAINER_REGISTRY"],
        Image = "aspire1-web",
        Tag = version
    });
```

## 🌐 Service Discovery

### How It Works

```mermaid
sequenceDiagram
    participant Web as aspire1.Web
    participant AppHost as AppHost Registry
    participant API as aspire1.ApiService
    
    Web->>AppHost: Resolve "apiservice"
    AppHost-->>Web: https://apiservice:8443
    Web->>API: GET /weatherforecast
    API-->>Web: Weather data
```

**Key Points:**
- Service names (`"apiservice"`, `"webfrontend"`) become DNS entries
- `WithReference(apiService)` injects `services__apiservice__https__0` environment variable
- Scheme resolution: `https+http://` prefers HTTPS, falls back to HTTP
- Internal communication stays within ACA Environment (no internet egress)

## 🏃 Running Locally

### Start the Application

```bash
# From solution root
dotnet run --project aspire1.AppHost
```

**Output:**
```
Aspire Dashboard: http://localhost:5000
aspire1-web: http://localhost:7001
aspire1-apiservice: http://localhost:7002
```

### Dashboard Features

| Feature | Purpose |
|---------|---------|
| **Resources** | View all services, their status, and endpoints |
| **Console Logs** | Real-time logs from each service |
| **Traces** | Distributed tracing visualization (OpenTelemetry) |
| **Metrics** | Live metrics (requests/sec, CPU, memory) |
| **Structured Logs** | Filterable, searchable log viewer |

### Testing Service Discovery

```bash
# From aspire1.Web container, "apiservice" resolves automatically
curl http://apiservice/weatherforecast
```

## ☁️ Production Deployment

### azd Integration

When you run `azd up`, the AppHost:

1. **Generates Bicep IaC** from service annotations
2. **Creates Azure resources:**
   - Container Apps Environment
   - Container Registry
   - Application Insights
   - Log Analytics Workspace
3. **Builds and pushes container images** with version tags
4. **Deploys containers** with configured health checks, scale rules, ingress

### Environment Variables Injected by azd

| Variable | Source | Purpose |
|----------|--------|---------|
| `VERSION` | MinVer (git tag) | Injected during `azd up` preprovision hook |
| `COMMIT_SHA` | Git or `GITHUB_SHA` | Short commit hash for traceability |
| `CONTAINER_REGISTRY` | Azure Container Registry endpoint | Set during `azd up` prepackage hook |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Application Insights | OpenTelemetry export target |

## 🎨 Customization Examples

### Add Redis Cache

```csharp
var redis = builder.AddRedis("cache")
    .WithRedisCommander();  // Optional: Redis management UI

var apiService = builder.AddProject<Projects.aspire1_ApiService>("apiservice")
    .WithReference(redis)   // Injects connection string
    .WithHttpHealthCheck("/health");
```

### Add PostgreSQL Database

```csharp
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()          // Optional: pgAdmin UI
    .AddDatabase("aspiredb");

var apiService = builder.AddProject<Projects.aspire1_ApiService>("apiservice")
    .WithReference(postgres)
    .WithHttpHealthCheck("/health");
```

### Add Azure Service Bus

```csharp
var serviceBus = builder.AddAzureServiceBus("messaging");

var apiService = builder.AddProject<Projects.aspire1_ApiService>("apiservice")
    .WithReference(serviceBus)  // Injects connection string from Key Vault
    .WithHttpHealthCheck("/health");
```

## 🔐 Secrets Management

### Local Development

```csharp
// Secrets come from:
// 1. User Secrets (dotnet user-secrets)
// 2. appsettings.Development.json (non-sensitive defaults)
// 3. Environment variables

// AppHost automatically loads secrets and passes them to services
```

### Azure Production

```csharp
// AppHost generates Bicep with Key Vault references
// Example generated Bicep:
// {
//   name: 'ConnectionStrings__MyDb'
//   secretRef: 'mydb-connection'  // Points to Key Vault secret
// }

// Services receive secrets as environment variables
// NO connection strings in appsettings.json!
```

## 📏 Best Practices

### ✅ DO

- Use `WithReference()` for service dependencies (enables service discovery)
- Use `WaitFor()` to enforce startup order
- Set `WithHttpHealthCheck()` on all services for ACA health probes
- Pass version metadata via `WithEnvironment()` for deployment tracking
- Use `WithExternalHttpEndpoints()` only on public-facing services

### ❌ DON'T

- Hard-code service URLs (use service discovery instead)
- Expose internal APIs with `WithExternalHttpEndpoints()`
- Put secrets in `appsettings.json` (use Key Vault)
- Skip health checks (ACA needs them for readiness/liveness)
- Forget to version-tag container images

## 🐛 Troubleshooting

### Service Discovery Not Working

**Symptom:** `HttpClient` can't resolve service name

**Fix:**
```csharp
// Ensure service has a reference
builder.AddProject<Projects.aspire1_Web>("webfrontend")
    .WithReference(apiService)  // ← Add this

// In aspire1.Web Program.cs:
builder.Services.AddHttpClient<WeatherApiClient>(client =>
{
    client.BaseAddress = new("https+http://apiservice");  // ← Use service name
});
```

### Dashboard Not Loading

**Symptom:** `http://localhost:5000` shows 404

**Possible Causes:**
1. Port conflict (another process using 5000)
2. AppHost not running (`dotnet run --project aspire1.AppHost`)

**Fix:**
```bash
# Check if port is in use
netstat -ano | findstr :5000

# Kill the process or change port in launchSettings.json
```

### Version Shows "1.0.0-local" in Production

**Symptom:** `/version` endpoint returns local version

**Fix:**
```bash
# Ensure azd hooks set VERSION environment variable
azd env get-values | findstr VERSION

# If empty, run preprovision hook manually:
dotnet tool install -g minver-cli
$version = minver
azd env set VERSION $version
```

## 📚 Related Documentation

- [Root Architecture](../ARCHITECTURE.md) - Full solution architecture
- [API Service Architecture](../aspire1.ApiService/ARCHITECTURE.md)
- [Web Service Architecture](../aspire1.Web/ARCHITECTURE.md)
- [Service Defaults](../aspire1.ServiceDefaults/ARCHITECTURE.md)

## 🔗 Useful Commands

```bash
# Run AppHost with custom environment
$env:VERSION="2.0.0-preview"; dotnet run --project aspire1.AppHost

# Build AppHost for release (generates optimized Bicep)
dotnet build aspire1.AppHost -c Release

# Publish AppHost (for container deployment)
dotnet publish aspire1.AppHost -c Release

# Generate manifest for manual inspection
dotnet run --project aspire1.AppHost -- --publisher manifest --output-path ./manifest.json
```

---

**Next:** [API Service Architecture](../aspire1.ApiService/ARCHITECTURE.md) →
