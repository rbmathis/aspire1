# Architecture - aspire1.Web

> **Component Type:** Blazor Server  
> **Framework:** ASP.NET Core 10.0  
> **Purpose:** Public-facing web frontend with server-side rendering

## 🎯 Overview

The **Web** project is a Blazor Server application that provides the user interface for the aspire1 solution. Key features:
- Server-side Blazor rendering (no WebAssembly)
- Real-time SignalR connection for UI updates
- HTTP client integration with service discovery
- OpenTelemetry instrumentation (via ServiceDefaults)
- Output caching for performance

## 🏗️ Architecture

```mermaid
graph TB
    User[👤 Browser]
    
    subgraph "aspire1.Web"
        SignalR[SignalR Hub<br/>WebSocket Connection]
        Middleware[Middleware Pipeline]
        RazorComponents[Razor Components]
        OutputCache[Output Cache]
        HTTPClient[WeatherApiClient<br/>HTTP Client]
        ServiceDefaults[ServiceDefaults<br/>OpenTelemetry, Health]
        
        subgraph "Pages"
            Home[Home.razor]
            Weather[Weather.razor]
            Counter[Counter.razor]
            Error[Error.razor]
        end
        
        subgraph "Layout"
            MainLayout[MainLayout.razor]
            NavMenu[NavMenu.razor]
        end
    end
    
    API[aspire1.ApiService]
    AppInsights[Application Insights]
    
    User <-->|SignalR| SignalR
    SignalR --> Middleware
    Middleware --> RazorComponents
    RazorComponents --> Home
    RazorComponents --> Weather
    RazorComponents --> Counter
    RazorComponents --> Error
    RazorComponents --> MainLayout
    MainLayout --> NavMenu
    
    Weather -->|GetWeatherAsync| HTTPClient
    HTTPClient -->|Service Discovery| API
    
    Middleware --> OutputCache
    ServiceDefaults -.->|Traces, Metrics| AppInsights
    
    style RazorComponents fill:#0078d4,stroke:#005a9e,color:#fff
    style HTTPClient fill:#50e6ff
```

## 📄 Pages & Components

### `/` - Home.razor
**Purpose:** Landing page with welcome message

**Features:**
- Static content
- No API calls
- Demonstrates basic Blazor component

---

### `/counter` - Counter.razor
**Purpose:** Interactive counter demo (100% server-side)

**Features:**
- Server-side state management
- SignalR-based UI updates
- Demonstrates Blazor event handling

**Implementation:**
```razor
@page "/counter"

<h1>Counter</h1>
<p role="status">Current count: @currentCount</p>
<button @onclick="IncrementCount">Click me</button>

@code {
    private int currentCount = 0;

    private void IncrementCount()
    {
        currentCount++;
        // SignalR pushes update to browser automatically
    }
}
```

---

### `/weather` - Weather.razor
**Purpose:** Display weather forecast from API service

**Features:**
- HTTP client with service discovery
- Loading state
- Error handling
- Data binding

**Flow:**
```mermaid
sequenceDiagram
    participant User
    participant Weather.razor
    participant WeatherApiClient
    participant ServiceDiscovery
    participant API as aspire1.ApiService
    
    User->>Weather.razor: Navigate to /weather
    Weather.razor->>WeatherApiClient: GetWeatherAsync()
    WeatherApiClient->>ServiceDiscovery: Resolve "apiservice"
    ServiceDiscovery-->>WeatherApiClient: https://apiservice:8443
    WeatherApiClient->>API: GET /weatherforecast
    API-->>WeatherApiClient: Weather data (JSON)
    WeatherApiClient-->>Weather.razor: List<WeatherForecast>
    Weather.razor-->>User: Rendered table
```

---

### `/error` - Error.razor
**Purpose:** Error boundary for unhandled exceptions

**Features:**
- User-friendly error page
- Hides sensitive error details in production
- OpenTelemetry automatically captures exception traces

## 🔌 Service Integration

### WeatherApiClient.cs

**Purpose:** Typed HTTP client for API service communication

**Configuration:**
```csharp
builder.Services.AddHttpClient<WeatherApiClient>(client =>
{
    // Service discovery: "apiservice" resolves to internal URL
    client.BaseAddress = new("https+http://apiservice");
});
```

**Key Features:**
- **Service Discovery:** `"apiservice"` name resolves via Aspire
- **Resilience:** Automatic retry, circuit breaker, timeout (from ServiceDefaults)
- **Scheme Preference:** `https+http://` prefers HTTPS, falls back to HTTP
- **Instrumentation:** All HTTP calls traced via OpenTelemetry

**Implementation:**
```csharp
public class WeatherApiClient(HttpClient httpClient)
{
    public async Task<WeatherForecast[]?> GetWeatherAsync(
        int maxItems = 10, 
        CancellationToken cancellationToken = default)
    {
        // Calls: https://apiservice:8443/weatherforecast?maxItems=10
        return await httpClient.GetFromJsonAsync<WeatherForecast[]>(
            $"/weatherforecast?maxItems={maxItems}", 
            cancellationToken);
    }
}

public record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
```

## 🎨 Layout & Styling

### MainLayout.razor
**Purpose:** Application shell (navigation + content area)

**Structure:**
```razor
<div class="page">
    <div class="sidebar">
        <NavMenu />
    </div>

    <main>
        <article class="content">
            @Body  <!-- Page content renders here -->
        </article>
    </main>
</div>
```

### NavMenu.razor
**Purpose:** Navigation links

**Routes:**
- `/` - Home
- `/counter` - Counter
- `/weather` - Weather

### Styling
- **Framework:** Bootstrap 5
- **Location:** `wwwroot/lib/bootstrap/`
- **Custom CSS:** `wwwroot/app.css`

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
    Main->>Builder: AddRazorComponents().AddInteractiveServerComponents()
    Main->>Builder: AddOutputCache()
    Main->>Builder: AddHttpClient<WeatherApiClient>()
    Main->>App: builder.Build()
    Main->>App: Configure middleware
    Main->>App: MapRazorComponents<App>()
    Main->>App: MapDefaultEndpoints()
    Main->>App: app.Run()
```

### Key Configuration Steps

1. **Service Defaults:** OpenTelemetry, health checks, resilience handlers
2. **Razor Components:** Blazor Server rendering engine
3. **Interactive Server Mode:** SignalR-based component updates
4. **Output Cache:** Response caching for performance
5. **HTTP Client:** Typed client with service discovery
6. **Middleware Pipeline:**
   - Exception handler (production)
   - HSTS (production)
   - HTTPS redirection
   - Antiforgery tokens (CSRF protection)
   - Static files
7. **Health Endpoints:** `/health`, `/alive` (from ServiceDefaults)

## 📊 Performance Optimization

### Output Caching

**Purpose:** Cache responses to reduce load on API service

**Configuration:**
```csharp
builder.Services.AddOutputCache();
app.UseOutputCache();
```

**Usage Example (Future):**
```csharp
// Cache weather data for 60 seconds
app.MapGet("/api/weather", async (WeatherApiClient client) =>
{
    return await client.GetWeatherAsync();
})
.CacheOutput(policy => policy.Expire(TimeSpan.FromSeconds(60)));
```

### SignalR Optimization

**Connection Management:**
- **Reconnection:** Automatic with exponential backoff
- **Compression:** Enabled by default
- **Transport:** WebSocket preferred, falls back to Server-Sent Events

**Best Practices:**
- Keep component state minimal
- Use `@key` directives for efficient rendering
- Avoid frequent state changes (debounce user input)

## 🔐 Configuration & Secrets

### Configuration Sources (Priority Order)

1. **Environment Variables** (highest priority)
   - `ASPNETCORE_ENVIRONMENT` - `Development`, `Staging`, `Production`
   - `APP_VERSION` - Injected by AppHost or azd
   - `COMMIT_SHA` - Injected by AppHost or GitHub Actions

2. **appsettings.{Environment}.json**
   - Environment-specific settings

3. **appsettings.json**
   - Default settings

4. **User Secrets** (local dev only)
   - `dotnet user-secrets set "Key" "Value"`

### Example: Adding Feature Flags (Future)

```csharp
// Add Azure App Configuration
builder.Configuration.AddAzureAppConfiguration(options =>
{
    options.Connect(new Uri(builder.Configuration["AppConfig:Endpoint"]!), 
                    new DefaultAzureCredential())
           .UseFeatureFlags();
});

// Use in Razor component
@inject IFeatureManager FeatureManager

@if (await FeatureManager.IsEnabledAsync("NewWeatherUI"))
{
    <NewWeatherComponent />
}
else
{
    <Weather />
}
```

## 🚀 Deployment

### Local Development

```bash
# Run standalone (requires AppHost for service discovery to API)
dotnet run --project aspire1.Web

# Access app
# https://localhost:7001
```

### Azure Container Apps

**Container Image:**
- **Registry:** `{acr}.azurecr.io`
- **Repository:** `aspire1-web`
- **Tag:** `{version}` (e.g., `1.0.0`)

**Environment Variables (injected by azd):**
- `APP_VERSION`: `1.0.0`
- `COMMIT_SHA`: `a1af010`
- `ASPNETCORE_ENVIRONMENT`: `Production`
- `services__apiservice__https__0`: `https://aspire1-apiservice.internal.{env}.azurecontainerapps.io` (service discovery)

**Ingress:**
- **Type:** External (public internet)
- **Port:** 8080
- **Transport:** HTTP/2
- **Allow Insecure:** No (HTTPS only)

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
- **Max Replicas:** 10
- **Scale Rule:** HTTP - 100 concurrent requests per replica
- **Scale In Delay:** 5 minutes

## 🎯 Testing

### Unit Tests (Future)

```csharp
// Example with bUnit + xUnit
public class WeatherPageTests : TestContext
{
    [Fact]
    public void Weather_ShowsLoadingMessage_Initially()
    {
        // Arrange
        var mockClient = Substitute.For<WeatherApiClient>();
        Services.AddSingleton(mockClient);

        // Act
        var cut = RenderComponent<Weather>();

        // Assert
        cut.Find("p").TextContent.Should().Contain("Loading...");
    }

    [Fact]
    public async Task Weather_DisplaysData_AfterLoading()
    {
        // Arrange
        var mockClient = Substitute.For<WeatherApiClient>();
        mockClient.GetWeatherAsync().Returns([
            new WeatherForecast(DateOnly.FromDateTime(DateTime.Now), 25, "Sunny")
        ]);
        Services.AddSingleton(mockClient);

        // Act
        var cut = RenderComponent<Weather>();
        await cut.InvokeAsync(() => { }); // Wait for OnInitializedAsync

        // Assert
        cut.Find("table").Should().NotBeNull();
        cut.Find("td").TextContent.Should().Contain("Sunny");
    }
}
```

### Integration Tests (Future)

```csharp
// Example with Aspire.Hosting.Testing
public class WebIntegrationTests : IAsyncLifetime
{
    private DistributedApplication _app = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        var appHost = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.aspire1_AppHost>();
        _app = await appHost.BuildAsync();
        await _app.StartAsync();

        _client = _app.CreateHttpClient("webfrontend");
    }

    [Fact]
    public async Task HomePage_ReturnsSuccess()
    {
        // Act
        var response = await _client.GetAsync("/");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var html = await response.Content.ReadAsStringAsync();
        html.Should().Contain("Hello, world!");
    }

    [Fact]
    public async Task WeatherPage_CallsApiService()
    {
        // Act
        var response = await _client.GetAsync("/weather");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var html = await response.Content.ReadAsStringAsync();
        html.Should().Contain("Weather Forecast");
    }

    public async Task DisposeAsync() => await _app.DisposeAsync();
}
```

## 🐛 Troubleshooting

### SignalR Connection Fails

**Symptom:** Browser console shows WebSocket errors, components don't update

**Diagnostics:**
```javascript
// Browser console
Blazor: WebSocket connection failed: Error during WebSocket handshake
```

**Fix:**
- Ensure WebSocket is enabled in ACA ingress
- Check firewall rules (WebSocket uses port 8080)
- Verify HTTPS is configured (SignalR requires HTTPS in production)

### Service Discovery Fails

**Symptom:** `WeatherApiClient` throws `HttpRequestException`

**Diagnostics:**
```bash
# Check service discovery environment variable
azd env get-values | findstr apiservice
```

**Fix:**
- Ensure AppHost uses `WithReference(apiService)` on Web
- Verify base address uses service name: `https+http://apiservice`
- Check API service is healthy: `curl https://apiservice:8443/health`

### Weather Page Shows "Loading..." Forever

**Symptom:** Weather page never loads data

**Diagnostics:**
- Check browser developer tools → Network tab
- Check Application Insights for failed dependencies

**Fix:**
- Ensure API service is running and healthy
- Verify `WeatherApiClient` is registered in DI container
- Check for exceptions in API service logs

## 📚 Related Documentation

- [Root Architecture](../ARCHITECTURE.md)
- [AppHost Architecture](../aspire1.AppHost/ARCHITECTURE.md)
- [API Service Architecture](../aspire1.ApiService/ARCHITECTURE.md)
- [Service Defaults](../aspire1.ServiceDefaults/ARCHITECTURE.md)

## 🔗 Useful Commands

```bash
# Run with hot reload
dotnet watch --project aspire1.Web

# Test locally (requires AppHost)
dotnet run --project aspire1.AppHost
# Navigate to: https://localhost:7001

# Build release
dotnet publish -c Release

# Run in container locally
docker build -t aspire1-web:1.0.0 .
docker run -p 8080:8080 -e APP_VERSION=1.0.0 aspire1-web:1.0.0
```

---

**Next:** [Service Defaults Architecture](../aspire1.ServiceDefaults/ARCHITECTURE.md) →
