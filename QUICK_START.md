# Quick Start: Multi-Agent Development

## Start Here

You now have a fully configured multi-agent development environment for VSCode 1.107+.

## Quick Commands

### Build & Run

```bash
# Build all services in parallel (fastest)
./scripts/build/build-all-parallel.sh

# Build individual services
./scripts/build/build-web.sh
./scripts/build/build-api.sh
./scripts/build/build-weather.sh

# Run all services via AppHost
dotnet run --project aspire1.AppHost
```

### Testing

```bash
# Run all tests (builds first)
dotnet test aspire1.sln

# Run tests by service
dotnet test aspire1.Web.Tests
dotnet test aspire1.WeatherService.Tests

# Run with coverage
dotnet test aspire1.sln /p:CollectCoverage=true
```

### VSCode Agents

Open VSCode and you'll see 3 agents ready to work:

1. **web-agent** → `aspire1.Web/` (Blazor frontend)
2. **weather-agent** → `aspire1.WeatherService/` (Microservice)
3. **infra-agent** → `infra/` (Azure/Bicep)

## Coordination Reference

### Safe to do in parallel ✅

- Different agents working on different services
- Web + Weather agents building simultaneously
- API + Weather agents testing simultaneously
- Infrastructure agent deploying while others develop

### Need to coordinate ⚠️

- Changing `aspire1.ServiceDefaults/` (affects all)
- Adding service-to-service endpoints
- Modifying shared DTOs
- Changing health check formats

### Can't do in parallel ❌

- Two agents modifying the same file
- Multiple agents changing the same API contract
- Concurrent AppHost modifications

## Key Files

| File                                       | Purpose                                  |
| ------------------------------------------ | ---------------------------------------- |
| `.vscode/agents.json`                      | Agent definitions and coordination rules |
| `.agent-checkpoints/dependency-map.md`     | Service dependencies (visual graph)      |
| `.agent-checkpoints/integration-points.md` | API contracts between services           |
| `.agent-checkpoints/breaking-changes.md`   | Breaking change tracking log             |
| `.agent-context.json` (in each service)    | Service boundaries and constraints       |
| `.mcp/services/*.mcp.json`                 | MCP context definitions                  |
| `.mcp-server/mcp-server.js`                | MCP server for context queries           |
| `AGENT_SETUP.md`                           | Full implementation details              |

## Adding a Breaking Change

1. Open `.agent-checkpoints/breaking-changes.md`
2. Add entry with date, affected agents, and timeline
3. Implement with both old + new behavior working
4. Wait 2 weeks minimum
5. All affected service tests must pass
6. Remove old behavior and deploy

## Need Help?

### Architecture Questions

→ Check `ARCHITECTURE.md` in the service directory

### Coordination Questions

→ Check `.agent-checkpoints/` files

### Agent Setup Questions

→ Check `.vscode/agents.json` and `.agent-context.json`

### Development Practices

→ Check `.github/copilot-instructions.md`

## Verify Setup Works

```bash
# 1. Build all in parallel (should complete in ~45s)
./scripts/build/build-all-parallel.sh

# 2. Run tests (all should pass)
dotnet test aspire1.sln --no-build

# 3. Run AppHost (should show dashboard)
dotnet run --project aspire1.AppHost

# 4. Check dependency graph
cat .agent-checkpoints/dependency-map.md
```

---

**Status**: ✅ Ready for parallel agent development
