# Team Onboarding: Multi-Agent Development Setup

This document helps team members understand and work with the new multi-agent development framework.

## What's New?

Your project now uses **VSCode 1.107+ Agent Framework** for parallel development across 4 independent services. This allows multiple developers (or agents) to work on different services simultaneously without conflicts.

## Prerequisites

- **VSCode 1.107 or later** (with Agents support)
- **.NET 9 SDK**
- **Node.js 18+** (for MCP server)
- **Azure CLI** (for infrastructure development)

## First Time Setup

### 1. Clone and Open

```bash
git clone <repo>
cd aspire1
code .
```

VSCode should recognize the agent configuration automatically.

### 2. Verify Setup

```bash
./verify-agent-setup.sh
```

Expected output: All ✅ checks passing.

### 3. Review Documentation

- **Quick overview**: Read [QUICK_START.md](QUICK_START.md) (2 minutes)
- **Detailed setup**: Read [AGENT_SETUP.md](AGENT_SETUP.md) (10 minutes)
- **Your service**: Check relevant `ARCHITECTURE.md` file

### 4. Build & Test

```bash
# Build everything in parallel
./scripts/build/build-all-parallel.sh

# Run all tests
dotnet test aspire1.sln --no-build

# Run AppHost to see Aspire Dashboard
dotnet run --project aspire1.AppHost
```

## Which Agent Am I?

### Web Frontend Developer? → web-agent

- **Scope**: `aspire1.Web/`
- **Technology**: Blazor Server, SignalR, C#
- **Can modify**: Components/, views, styles, client-side logic
- **Depends on**: ApiService (read-only), ServiceDefaults (read-only)
- **Build**: `./scripts/build/build-web.sh`
- **Test**: `dotnet test aspire1.Web.Tests`

### Backend API Developer? → api-agent

- **Scope**: `aspire1.ApiService/`
- **Technology**: Minimal API, ASP.NET Core, C#
- **Can modify**: Endpoints, handlers, business logic
- **Depends on**: WeatherService (read-only), ServiceDefaults (read-only)
- **Build**: `./scripts/build/build-api.sh`
- **Test**: `dotnet test aspire1.ApiService.Tests`

### Microservice Developer? → weather-agent

- **Scope**: `aspire1.WeatherService/`
- **Technology**: Minimal API, ASP.NET Core, C#
- **Can modify**: Data models, services, endpoints
- **Depends on**: ServiceDefaults (read-only)
- **Can NOT**: Depend on Api or Web services
- **Build**: `./scripts/build/build-weather.sh`
- **Test**: `dotnet test aspire1.WeatherService.Tests`

### Infrastructure/DevOps? → infra-agent

- **Scope**: `infra/`
- **Technology**: Bicep, Azure, YAML
- **Can modify**: Bicep templates, azure.yaml, deployment config
- **Depends on**: All services (reference only, read-only)
- **Build**: `az bicep build-params ./infra/main.bicep`
- **Deploy**: `azd up` or `azd deploy`

## Development Workflow

### Daily Routine

```bash
# 1. Get latest changes
git pull origin main

# 2. Build your service
./scripts/build/build-<your-service>.sh

# 3. Run your service (in watch mode for dev)
dotnet watch run --project aspire1.<YourService>

# 4. Run tests
dotnet test aspire1.<YourService>.Tests --watch
```

### Making Changes

#### Safe Changes (No Coordination Needed)

- Modifying your own service's code
- Adding endpoints (new ones, not modifying existing)
- Adding tests
- Updating documentation specific to your service

Example: web-agent adding a new component is safe.

#### Changes Requiring Coordination

- **Modifying `aspire1.ServiceDefaults/`** → Coordinate with ALL agents
- **Adding new service-to-service integration** → Coordinate with dependent agents
- **Changing API endpoint signatures** → Coordinate with dependent services
- **Changing DTO structures** → Coordinate with consuming services

### Coordinated Change Workflow

1. **Create an issue** describing the breaking change
2. **Document in `.agent-checkpoints/breaking-changes.md`**
3. **Notify affected agents** via issue/PR comments
4. **Implement with both old and new working** (no breaking)
5. **All service tests must pass**
6. **Wait 2 weeks** for deprecation period
7. **All agents update** to use new behavior
8. **Deploy in order**: ServiceDefaults → dependent services
9. **After 2 weeks**: Remove old behavior

## Coordination Rules

### ✅ These ARE Safe to Do in Parallel

```
web-agent     api-agent     weather-agent     infra-agent
    │             │               │                 │
    ├─ Build ────┼─ Build ────┼─ Build ────┼─ Deploy
    │             │               │                 │
    ├─ Test  ────┼─ Test  ────┼─ Test  ────┼─ (no test)
    │             │               │
    └─ Components API Endpoints   Services
```

### ⚠️ These Require Coordination

- ServiceDefaults changes
- Adding new service-to-service APIs
- Changing health check response format
- Modifying shared DTOs

### ❌ These Cannot Be Done in Parallel

- Multiple agents editing the same file
- Different agents changing the same API contract
- Concurrent modifications to AppHost

## Key Files Reference

| File                                       | Purpose           | Who Uses             |
| ------------------------------------------ | ----------------- | -------------------- |
| `.vscode/agents.json`                      | Agent definitions | Team lead, DevOps    |
| `ARCHITECTURE.md` (root)                   | Overall topology  | Everyone             |
| `ARCHITECTURE.md` (service)                | Service patterns  | Service owner        |
| `.agent-checkpoints/dependency-map.md`     | Dependencies      | Everyone             |
| `.agent-checkpoints/integration-points.md` | API contracts     | All service owners   |
| `.agent-checkpoints/breaking-changes.md`   | Change log        | Team lead, reviewers |
| `.agent-context.json` (service)            | Constraints       | Service owner        |
| `QUICK_START.md`                           | Quick reference   | New team members     |

## Communication Channels

When coordinating with other agents:

1. **Planned changes** → Comment in breaking-changes.md
2. **New endpoints** → Document in integration-points.md
3. **Questions** → Refer to ARCHITECTURE.md in relevant service
4. **Issues** → Create GitHub issue, tag affected agents

## Troubleshooting

### "Agent can't modify this file"

→ Check `.agent-context.json` in your service. File may be in `forbiddenMutations`.

### "Service X failed due to dependency on Y"

→ Check `.agent-checkpoints/dependency-map.md` to understand dependencies.

### "Tests are failing from other services"

→ You may have broken an API contract. Check `.agent-checkpoints/integration-points.md`.

### "How do I know what changed?"

→ Run: `git diff aspire1.ServiceDefaults/` to see shared changes.
→ Check: `.agent-checkpoints/breaking-changes.md` for recent coordinated changes.

## Success Criteria

You're ready to work when:

- ✅ `./verify-agent-setup.sh` shows all green checkmarks
- ✅ `./scripts/build/build-all-parallel.sh` completes in ~45 seconds
- ✅ `dotnet test aspire1.sln` passes all tests
- ✅ You've read `ARCHITECTURE.md` for your service
- ✅ You understand the coordination rules above

## Need Help?

1. **Setup questions**: Read [AGENT_SETUP.md](AGENT_SETUP.md)
2. **Quick reference**: Read [QUICK_START.md](QUICK_START.md)
3. **Architecture questions**: Read `ARCHITECTURE.md` in your service directory
4. **Coordination questions**: Check `.agent-checkpoints/` files
5. **Development practices**: Read `.github/copilot-instructions.md`

---

**Welcome to the team!** 🎉 You're now set up for productive parallel development with clear boundaries and coordination practices.
