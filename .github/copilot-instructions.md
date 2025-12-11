# .NET Aspire Repository Instructions

This repository contains a .NET Aspire solution targeting Azure Container Apps with comprehensive observability, secrets management, and CI/CD practices.

## Project Overview

- **Technology Stack**: .NET 9, .NET Aspire 8.2+, Azure Developer CLI (azd) 1.9+
- **Target Platform**: Azure Container Apps Environment with Dapr and KEDA
- **Architecture**: Microservices with service discovery, distributed tracing, and centralized configuration

## Multi-Agent Development (VS Code 1.107+)

This repository is optimized for parallel agent development using VS Code's agent, subagent, and MCP capabilities introduced in VS Code 1.107 (November 2025).

### VS Code 1.107 Features Enabled

This workspace is configured to use these new capabilities:

| Feature                                  | Setting                                        | Description                                                           |
| ---------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| **Custom Agents as Subagents**           | `chat.customAgentInSubagent.enabled`           | Use custom agents (web, api, weather, infra) as specialized subagents |
| **Background Agents with Git Worktrees** | Built-in                                       | Run background agents in isolated Git worktrees to avoid conflicts    |
| **GitHub MCP Server**                    | `github.copilot.chat.githubMcpServer.enabled`  | Seamless GitHub integration without extra setup                       |
| **Claude Skills**                        | `chat.useClaudeSkills`                         | Reuse skills from `.claude/skills/` directory                         |
| **Custom Agents in Background**          | `github.copilot.chat.cli.customAgents.enabled` | Use custom agents with background agents                              |

### Custom Agents (`.github/agents/`)

Six specialized agents are available for use as subagents or directly:

| Agent File         | Purpose                     | Scope                                      |
| ------------------ | --------------------------- | ------------------------------------------ |
| `web.agent.md`     | Blazor frontend development | `aspire1.Web/`, UI components              |
| `weather.agent.md` | Backend data service        | `aspire1.WeatherService/`, data generation |
| `infra.agent.md`   | Azure infrastructure        | `infra/`, Bicep, `azure.yaml`              |
| `docs.agent.md`    | Documentation generation    | ARCHITECTURE.md, diagrams                  |
| `commit.agent.md`  | Git workflow automation     | Conventional commits, PRs                  |

**Using Custom Agents:**

- Ask in chat: "What subagents can you use?" to see available agents
- Directly invoke: Use agent-scoped prompts for specialized work
- Background agents: Continue local work to background with "Continue in" option

### Claude Skills (`.claude/skills/`)

Three skills are available for on-demand loading:

| Skill                | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `aspire-service`     | Service patterns, endpoint creation, testing |
| `azure-deploy`       | Deployment patterns, azd, Key Vault, CI/CD   |
| `agent-coordination` | Multi-agent coordination rules and protocols |

### Agent Coordination Framework

- **Agents Configuration**: `.vscode/agents.json` - Defines 4 autonomous agents (web, api, weather, infra)
- **Custom Agent Definitions**: `.github/agents/*.agent.md` - Subagent-compatible agent definitions
- **Service Boundaries**: Repo root `.agent-context.json` + per-service `.agent-context.json` files define scope, dependencies, and mutation rules
- **MCP Servers**: `.mcp-server/` directory - Provides context discovery for agents
- **Coordination Checkpoints (Guidance)**: `.agent-checkpoints/` contains guidance (integration points, dependency map, breaking changes log). If it conflicts with `.agent-context.json`, follow `.agent-context.json`.

### Agent Context Policy (Source of Truth)

- **Read before editing**: Before changing any service, read the relevant per-service `.agent-context.json` (and the repo root `.agent-context.json`) and follow its mutation rules.
- **Precedence**: per-service `.agent-context.json` → repo root `.agent-context.json` → current code/contracts → `.agent-checkpoints/*` (guidance).
- **Conflict handling**: If guidance conflicts with `.agent-context.json`, do not proceed until the conflict is resolved by updating the relevant context/checkpoint docs.

### Mutation Model

- **Non-CRITICAL services (default allow)**: For Web/Weather/Infra, paths are allowed unless explicitly listed as forbidden in the relevant `.agent-context.json`.
- **CRITICAL shared components (strict)**: For `aspire1.ServiceDefaults` and coordination-only components like `aspire1.AppHost`, only make changes that are explicitly permitted and coordinated as documented.
- **WeatherApiClient**: Changes to `aspire1.Web/WeatherApiClient.cs` are allowed, but require web-agent + weather-agent coordination for any contract/DTO change or `/weatherforecast` behavior change.

### Available Agents

| Agent             | Service                | Scope                   | Key Responsibility                                 |
| ----------------- | ---------------------- | ----------------------- | -------------------------------------------------- |
| **web-agent**     | aspire1.Web            | Blazor UI, components   | Frontend development, WeatherApiClient integration |
| **weather-agent** | aspire1.WeatherService | Weather microservice    | Data generation, weather endpoints                 |
| **infra-agent**   | infra/                 | Bicep, Azure resources  | Infrastructure, deployment configuration           |

### Running Multiple Agents in Parallel

1. **Safe Parallel Operations**:

   - web-agent modifying Components/ while weather-agent modifies Services/
   - Both can build simultaneously: `./scripts/build/build-all-parallel.sh`

2. **Coordinated Operations** (requires agent communication):

   - Changing aspire1.ServiceDefaults (affects BOTH services)
   - Modifying service-to-service integration points
   - Updating health check formats or DTO contracts

3. **Reference Points for Agents**:
   - Dependency map: `.agent-checkpoints/dependency-map.md`
   - Integration points: `.agent-checkpoints/integration-points.md`
   - Breaking changes: `.agent-checkpoints/breaking-changes.md`

### MCP Server Context

Agents can query the `.mcp-server/` for:

- Service architecture details
- Dependency relationships
- Constraint validation
- Integration point validation

Example agent query: "Get dependencies for ApiService" → MCP returns list of dependent services and constraints.

### Coordination Rules for Agents

**ALWAYS enforce these when using multiple agents**:

1. **ServiceDefaults Changes** = ALL agents must coordinate

   - This shared library is used by both services
   - Breaking changes require 2-week deprecation notice
   - All service tests must pass before deploying

2. **Integration Point Changes** = Dependent agents coordinate

   - Web → Weather: web-agent and weather-agent coordinate on DTO/contract changes

3. **Independent Changes** = Safe to parallelize
   - Web components and Weather data models (internal logic only)
   - Infrastructure while other agents develop
   - Health checks (if not changing format)

### Build Commands for Parallel Agents

```bash
# Individual service builds (agent-specific)
./scripts/build/build-web.sh      # For web-agent
./scripts/build/build-weather.sh  # For weather-agent

# Parallel build (all agents can run simultaneously)
./scripts/build/build-all-parallel.sh
```

### Breaking Changes Protocol

When an agent needs to make a breaking change:

1. Document in `.agent-checkpoints/breaking-changes.md`
2. Notify all affected agents
3. Implement with both old and new behavior working
4. Wait 2 weeks for deprecation
5. Remove old behavior in next phase

Example: If changing health check format, weather-agent documents change, web-agent updates tests, both validate, then deploy in sequence.

## Code Patterns

### Service Discovery

- Use `WithReference()` for service-to-service communication in AppHost
- Avoid hard-coded URLs; leverage Aspire''s service discovery mechanisms
- Example: `builder.AddProject<Projects.aspire1_Web>("webfrontend").WithReference(weatherService)`

### Health Checks

- Use versioned health endpoints (e.g., `/health/detailed`)
- Match existing endpoint naming conventions (`/version`, `/health/detailed`)
- Include version metadata in health responses

### Resilience

- Follow documented resilience patterns (retry, circuit breaker) from ServiceDefaults
- Apply appropriate timeouts and fallback strategies
- ServiceDefaults automatically configures HttpClient resilience

### Observability

- Use documented OpenTelemetry patterns
- Exclude health endpoints from traces to reduce noise
- Ensure all services emit structured logs and metrics
- All telemetry flows to Application Insights in Azure

## Deployment and Infrastructure

### Target Platform

- Default deployment target: Azure Container Apps (ACA Environment with Dapr)
- Do not suggest Azure App Service or Azure Kubernetes Service unless explicitly requested

### Secrets Management

- **Local Development**: Use User Secrets (`dotnet user-secrets`) and azd environment variables
- **Dev/Production**: Use Azure Key Vault references with managed identity only
- **Never**: Store secrets in `appsettings.json`, connection strings in AppHost code, or commit secrets to source control
- Use user-assigned managed identities when cross-resource access is required
- For local development: Azure CLI authentication or `.env` files with User Secrets

### CI/CD Pipeline Requirements

- Use GitHub Actions with Azure Developer CLI (azd) only
- Cache dotnet restore, NuGet packages, and azd bicep modules
- Run restore/build/test in parallel where possible
- Target deployment time: under 120 seconds for typical Aspire apps
- Zero secrets in logs
- Use matrix strategy for multiple environments
- Provide exact workflow YAML snippets and azd hooks when suggesting improvements

## Azure Services Configuration

### Feature Flags (Azure App Configuration)

- Use `Microsoft.Extensions.Configuration.AzureAppConfiguration` + `Microsoft.FeatureManagement.AspNetCore`
- Authenticate with managed identity only (never connection strings)
- Configure sentinel key for 30-second cache refresh
- Use labels for environments (dev, staging, prod)
- Namespace flags appropriately (e.g., `FeatureName:SubFeature`)
- In AppHost: `AddAzureAppConfiguration().WithReference()`
- Local development: `UseFeatureFlags()` with `appsettings.json` fallback
- Enable/disable via Azure Portal or CLI with zero redeployment

### Feature Flag Patterns

- Use `IFeatureManager` for runtime checks
- Use `[FeatureGate]` attribute for controllers and Minimal APIs
- Use `IVariantFeatureManager` for A/B testing
- Keep flags short-lived (less than 90 days)
- Remove unused flags aggressively
- Test both enabled and disabled paths in unit tests using `InMemoryFeatureManager`

### Redis Caching and Sessions

- **Service**: Azure Cache for Redis (Premium tier for persistence and geo-replication)
- **In AppHost**: Use `AddRedis()` with `WithReference()`
- **Distributed Cache**: `Microsoft.Extensions.Caching.StackExchangeRedis` with `IDistributedCache`
- **Session State**: `AddStackExchangeRedisCache()` for distributed sessions
- **Expiration**:
  - Sessions: Sliding expiration 20-30 minutes
  - Cache: Absolute expiration 1-24 hours based on data volatility
- **Caching Patterns**:
  - Cache-aside for reads (check cache → miss → fetch from DB → store in cache)
  - Write-through for critical updates
  - Key naming: `{service}:{entity}:{id}` (e.g., `api:user:12345`)
  - Use `RedisKey` for type safety
  - Serialize with `System.Text.Json` for performance
  - Cache null results (5 minute TTL) to prevent database hammering
  - Monitor hit rates via OpenTelemetry custom metrics
- Use Redis channels for pub/sub scenarios
- Never store secrets in cache

### Session Management

- Use `AddSession()` + `AddStackExchangeRedisCache()` for distributed sessions
- Store only user context (userId, tenantId, culture) - never business data
- Cookie settings: `SameSite=Lax`, `HttpOnly=true`, `Secure=true` (production)
- Sliding expiration: 30 minutes, absolute maximum: 8 hours
- For APIs: Use Redis-backed JWT refresh tokens instead of sessions
- AppHost: `redis.WithReference()` ensures connection string injection

## Development Practices

### Offline-First Development

- All Azure resource integrations must have local fallbacks
- Application must run and debug completely disconnected from Azure
- Wrap all Azure connections in try-catch with graceful fallback to local alternatives (appsettings.json, in-memory, local emulators)
- Never block application startup on Azure service availability

### Testing Strategy

#### Unit Tests

- Framework: xUnit + FluentAssertions + NSubstitute
- Requirements: Fast (under 100ms), no I/O, no real dependencies
- Mock all external dependencies
- Naming convention: `[MethodName]_[Scenario]_[ExpectedResult]`
- Target: 80%+ coverage on business logic

#### Integration Tests

- Use `Aspire.Hosting.Testing` package
- Spin up `DistributedApplication` with real containers (Postgres, Redis, etc.)
- Use `WebApplicationFactory` for HTTP services
- Clean up resources in `Dispose()`
- Tests should hit real APIs and databases but complete in under 5 seconds each
- For AppHost: Use `DistributedApplicationTestingBuilder`, assert service discovery works, verify health endpoints, test `WithReference()` chains

#### Test Structure

- Unit tests: `[ProjectName].Tests`
- Integration tests: `[ProjectName].IntegrationTests`
- Keep integration tests separate so CI can run unit tests in under 10 seconds
- Run integration tests in parallel matrix jobs

#### Integration Test Best Practices

- Use unique database names per test class (Guid suffix)
- Seed minimal data
- Always clean up in `finally` or `Dispose()`
- Use Respawn for database resets between tests if needed
- Never test deployment infrastructure here (use azd deploy smoke tests for that)

## Build and Validation

### Initial Setup

Before starting development, install Git hooks to enforce branching strategy:

```powershell
.\scripts\Install-GitHooks.ps1
```

This installs hooks that prevent direct commits and pushes to `main`/`master` branches, enforcing a feature branch workflow.

### Build Commands

```bash
# Restore dependencies
dotnet restore

# Build solution
dotnet build aspire1.sln --no-restore

# Run tests
dotnet test aspire1.sln --no-build --verbosity normal

# Run AppHost (starts all services via Aspire Dashboard)
dotnet run --project aspire1.AppHost/aspire1.AppHost.csproj
```

### Versioning

- Uses MinVer for automatic semantic versioning based on git tags
- Version command: `minver` (from solution root)

### Deployment

```bash
# Full provision and deploy
azd up

# Deploy only (after infrastructure exists)
azd deploy

# Tear down environment
azd down --force --purge
```

### Common Issues and Workarounds

- Always run `dotnet restore` before building after changing dependencies
- If build fails, check that all ARCHITECTURE.md files are present (they''re referenced by projects)
- For local debugging, ensure Aspire Dashboard is accessible (typically https://localhost:15888)
- When adding new services, update the AppHost Program.cs and relevant ARCHITECTURE.md files

## Code Examples

### Good: Service Discovery with WithReference

```csharp
// In AppHost AppHost.cs
var weatherService = builder.AddProject<Projects.aspire1_WeatherService>("weatherservice");
var webApp = builder.AddProject<Projects.aspire1_Web>("webfrontend")
    .WithReference(weatherService);  // ✓ Automatic service discovery
```

### Bad: Hard-coded URLs

```csharp
// ✗ Don''t do this
var httpClient = new HttpClient { BaseAddress = new Uri("https://localhost:7123") };
```

### Good: Key Vault Reference for Secrets

```bash
# Set in Azure environment
azd env set ConnectionStrings__MyDb "@Microsoft.KeyVault(SecretUri=https://kv.vault.azure.net/secrets/mydb-connection)"
```

### Bad: Secrets in Configuration Files

```json
// ✗ Never put secrets in appsettings.json
{
  "ConnectionStrings": {
    "MyDb": "Server=prod.db.com;Password=secret123;"
  }
}
```

### Good: Versioned Health Endpoint

```csharp
app.MapGet("/health/detailed", (IConfiguration config) => new
{
    Status = "Healthy",
    Version = config["App:Version"],
    Timestamp = DateTime.UtcNow
});
```

### Good: HTTP Client with Resilience

```csharp
// WeatherApiClient already includes resilience patterns from ServiceDefaults
public class WeatherApiClient(HttpClient httpClient)
{
    public async Task<WeatherForecast[]> GetWeatherAsync(CancellationToken cancellationToken = default)
    {
        return await httpClient.GetFromJsonAsync<WeatherForecast[]>("/weatherforecast", cancellationToken)
            ?? [];
    }
}
```

## Response Guidelines

When providing code recommendations:

- Show both the anti-pattern to avoid and the correct implementation
- Include complete code examples, not just snippets
- Verify suggestions against documented patterns
- If a WeatherApiClient-style typed client already exists, use that pattern for new HTTP clients
- Provide clear explanations of the reasoning behind recommendations
- Highlight potential pitfalls or common mistakes to avoid
- Suggest validation steps to verify implementations
