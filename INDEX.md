# Multi-Agent Development Framework - Complete Index

## 📋 Overview

Your project is configured for **VSCode 1.107+ Multi-Agent Development** with 4 parallel agents working across independent services:

- **web-agent** → `aspire1.Web/` (Blazor Server frontend)
- **api-agent** → `aspire1.ApiService/` (REST API layer)
- **weather-agent** → `aspire1.WeatherService/` (Microservice)
- **infra-agent** → `infra/` (Azure infrastructure)

---

## 🚀 Getting Started (Choose Your Path)

### I'm new to this project

→ Start here: [TEAM_ONBOARDING.md](TEAM_ONBOARDING.md) (10 min read)
→ Then read: [QUICK_START.md](QUICK_START.md) (2 min reference)

### I need quick commands

→ Go to: [QUICK_START.md](QUICK_START.md)

### I want technical details

→ Read: [AGENT_SETUP.md](AGENT_SETUP.md) (complete implementation)

### I'm on a specific service team

→ Check: `ARCHITECTURE.md` in your service folder

### I need coordination guidance

→ Check: `.agent-checkpoints/` directory

---

## 📁 Configuration Files

### Agent Framework

| File                                             | Purpose                                    |
| ------------------------------------------------ | ------------------------------------------ |
| [`.vscode/agents.json`](.vscode/agents.json)     | 4 agent definitions with scopes & commands |
| [`.vscode/settings.json`](.vscode/settings.json) | VSCode settings + MCP server config        |
| [`.agent-context.json`](.agent-context.json)     | Project-wide agent structure               |

### Service Boundaries (Read These First!)

| File                                                                                         | Purpose                     | Owner         |
| -------------------------------------------------------------------------------------------- | --------------------------- | ------------- |
| [`aspire1.Web/.agent-context.json`](aspire1.Web/.agent-context.json)                         | Web service constraints     | web-agent     |
| [`aspire1.ApiService/.agent-context.json`](aspire1.ApiService/.agent-context.json)           | API service constraints     | api-agent     |
| [`aspire1.WeatherService/.agent-context.json`](aspire1.WeatherService/.agent-context.json)   | Weather service constraints | weather-agent |
| [`aspire1.ServiceDefaults/.agent-context.json`](aspire1.ServiceDefaults/.agent-context.json) | Shared library (ALL agents) | Team lead     |

### MCP Infrastructure (Machine-Readable Context)

| File                                                                             | Purpose                           |
| -------------------------------------------------------------------------------- | --------------------------------- |
| [`.mcp/services/web.mcp.json`](.mcp/services/web.mcp.json)                       | Web service context schema        |
| [`.mcp/services/api.mcp.json`](.mcp/services/api.mcp.json)                       | API service context schema        |
| [`.mcp/services/weather.mcp.json`](.mcp/services/weather.mcp.json)               | Weather service context schema    |
| [`.mcp/services/infrastructure.mcp.json`](.mcp/services/infrastructure.mcp.json) | Infrastructure context schema     |
| [`.mcp/shared/defaults.mcp.json`](.mcp/shared/defaults.mcp.json)                 | Shared defaults context           |
| [`.mcp/shared/apphost.mcp.json`](.mcp/shared/apphost.mcp.json)                   | AppHost reference (read-only)     |
| [`.mcp-server/mcp-server.js`](.mcp-server/mcp-server.js)                         | Node.js MCP server implementation |

### Coordination & Checkpoints

| File                                                                                   | Purpose                               | Read When                                 |
| -------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| [`.agent-checkpoints/dependency-map.md`](.agent-checkpoints/dependency-map.md)         | Service dependency graph & safe zones | Before parallel work                      |
| [`.agent-checkpoints/integration-points.md`](.agent-checkpoints/integration-points.md) | API contracts & integration details   | Planning changes affecting other services |
| [`.agent-checkpoints/breaking-changes.md`](.agent-checkpoints/breaking-changes.md)     | Breaking change log & protocol        | Making coordinated changes                |

### Build & Test Configuration

| File                                                                         | Purpose                                 |
| ---------------------------------------------------------------------------- | --------------------------------------- |
| [`.test-matrix.json`](.test-matrix.json)                                     | Parallel test groups & commands         |
| [`scripts/build/build-web.sh`](scripts/build/build-web.sh)                   | Build Web service                       |
| [`scripts/build/build-api.sh`](scripts/build/build-api.sh)                   | Build API service                       |
| [`scripts/build/build-weather.sh`](scripts/build/build-weather.sh)           | Build Weather service                   |
| [`scripts/build/build-all-parallel.sh`](scripts/build/build-all-parallel.sh) | Build all 4 services in parallel (~45s) |

---

## 📚 Documentation

### For New Team Members

1. [TEAM_ONBOARDING.md](TEAM_ONBOARDING.md) ← **Start here!**
2. [QUICK_START.md](QUICK_START.md) ← Quick reference
3. Service `ARCHITECTURE.md` ← Your service patterns

### For Understanding the Setup

1. [AGENT_SETUP.md](AGENT_SETUP.md) ← Complete technical details
2. [.agent-checkpoints/dependency-map.md](.agent-checkpoints/dependency-map.md) ← Dependency graph
3. [.agent-checkpoints/integration-points.md](.agent-checkpoints/integration-points.md) ← API contracts

### For Development Practices

1. [.github/copilot-instructions.md](.github/copilot-instructions.md) ← Architecture-first development
2. `ARCHITECTURE.md` (solution root) ← Overall topology
3. Service `ARCHITECTURE.md` ← Patterns for your service

### For Coordination

1. [.agent-checkpoints/breaking-changes.md](.agent-checkpoints/breaking-changes.md) ← Change tracking
2. [.agent-checkpoints/integration-points.md](.agent-checkpoints/integration-points.md) ← API stability
3. [.agent-context.json](.agent-context.json) (root) ← Overall structure

---

## 🔧 Quick Command Reference

### Building

```bash
./scripts/build/build-web.sh          # Build Web service
./scripts/build/build-api.sh          # Build API service
./scripts/build/build-weather.sh      # Build Weather service
./scripts/build/build-all-parallel.sh # Build all in ~45s
```

### Testing

```bash
dotnet test aspire1.sln --no-build                           # All tests
dotnet test aspire1.Web.Tests --no-build                     # Web tests
dotnet test aspire1.ApiService.Tests --no-build              # API tests
dotnet test aspire1.WeatherService.Tests --no-build          # Weather tests
dotnet test aspire1.sln --no-build /p:CollectCoverage=true   # With coverage
```

### Running

```bash
dotnet run --project aspire1.AppHost                         # Full stack via Aspire
dotnet watch run --project aspire1.Web/aspire1.Web.csproj    # Web (watch)
dotnet watch run --project aspire1.ApiService/               # API (watch)
dotnet watch run --project aspire1.WeatherService/           # Weather (watch)
```

### Deployment

```bash
azd up          # Provision infrastructure + deploy
azd deploy      # Deploy to existing infrastructure
azd preview     # Preview infrastructure changes
azd down        # Tear down environment
```

### Verification

```bash
./verify-agent-setup.sh                # Verify all agent files present
git status                             # Check what's changed
```

---

## 🎯 Coordination Decision Matrix

### Can I do this without coordinating?

| Change                             | Safe?    | Why                 | What to Do                   |
| ---------------------------------- | -------- | ------------------- | ---------------------------- |
| Add new component to Web           | ✅ Yes   | Isolated to Web     | Just implement               |
| Add new API endpoint to ApiService | ✅ Yes   | New endpoint        | Just implement               |
| Change existing API endpoint       | ❌ No    | Web depends on it   | Coordinate with web-agent    |
| Modify Weather endpoint signature  | ❌ No    | API depends on it   | Coordinate with api-agent    |
| Change health check format         | ❌ No    | All services use it | Coordinate with ALL agents   |
| Update ServiceDefaults             | ❌ No    | All services depend | Coordinate with ALL agents   |
| Add dependency to external API     | ⚠️ Maybe | Check constraints   | Read `.agent-context.json`   |
| New service-to-service call        | ❌ No    | Adds integration    | Coordinate with target agent |

**Legend**: ✅ No coordination needed | ❌ Requires coordination | ⚠️ Check constraints first

---

## 📊 Service Dependencies at a Glance

```
┌──────────────┐
│ aspire1.Web  │─ calls ──→ ApiService
└──────────────┘

┌─────────────────────┐
│ aspire1.ApiService  │─ calls ──→ WeatherService
└─────────────────────┘

┌───────────────────────┐
│ aspire1.WeatherService│─ calls ──→ (nothing)
└───────────────────────┘

All 3 services:
    │
    └──→ aspire1.ServiceDefaults (shared)
```

**Key**: Changes to ServiceDefaults affect ALL services.

---

## 🏆 Best Practices

### For Each Agent

- ✅ Read your service's `ARCHITECTURE.md` first
- ✅ Check `.agent-context.json` for your allowed mutations
- ✅ Follow patterns documented in "Good vs Bad" sections
- ✅ Write tests for your changes
- ✅ Run `dotnet test` before pushing

### For Coordination

- ✅ Document breaking changes in `.agent-checkpoints/breaking-changes.md`
- ✅ Notify affected agents via GitHub issues
- ✅ Wait for deprecation period (minimum 2 weeks)
- ✅ All affected services must test and pass
- ✅ Deploy in dependency order

### For Parallel Work

- ✅ Use the parallel build script: `./scripts/build/build-all-parallel.sh`
- ✅ Check dependency-map.md before assuming you can work in parallel
- ✅ Run tests in isolation to avoid cross-service interference
- ✅ Document integration points before implementing

---

## ❓ FAQ

**Q: Can two agents edit the same file?**
A: No. Check `.agent-context.json` to see who owns each file.

**Q: How do I know if my change breaks other services?**
A: 1) Check integration-points.md, 2) Run all tests, 3) Read dependent service ARCHITECTURE.md.

**Q: What's the deprecation period for breaking changes?**
A: Minimum 2 weeks. Document in breaking-changes.md before starting.

**Q: Can I call WeatherService from Web?**
A: No. See dependency constraints in Web's `.agent-context.json`.

**Q: How long should parallel builds take?**
A: `./scripts/build/build-all-parallel.sh` should complete in ~45 seconds.

**Q: Where do I find error definitions?**
A: Check the MCP files in `.mcp/` for schema definitions.

**Q: What if there's a conflict between agents?**
A: Refer to breaking-changes.md protocol or escalate to team lead.

---

## 🔗 Related Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Solution topology and deployment
- **[README.md](README.md)** - Project overview
- **[TELEMETRY.md](TELEMETRY.md)** - Observability configuration
- **[AZURE_APP_CONFIG_SETUP.md](AZURE_APP_CONFIG_SETUP.md)** - Azure App Config guide
- **Service ARCHITECTURE.md** - Patterns for specific services

---

## 📞 Getting Help

1. **Setup problems?** → Run `./verify-agent-setup.sh`
2. **Command questions?** → Check [QUICK_START.md](QUICK_START.md)
3. **Coordination questions?** → Check [.agent-checkpoints/](.agent-checkpoints/)
4. **Architecture questions?** → Read relevant `ARCHITECTURE.md`
5. **Still stuck?** → Review [TEAM_ONBOARDING.md](TEAM_ONBOARDING.md)

---

**Last Updated**: December 11, 2025
**Status**: ✅ Ready for multi-agent development
