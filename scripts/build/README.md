# Build scripts for agent-parallel development

## Individual Service Builds

Use these to build individual services when working with specific agents:

```bash
# Build Web service (web-agent)
./build-web.sh

# Build API service (api-agent)
./build-api.sh

# Build Weather service (weather-agent)
./build-weather.sh
```

## Parallel Builds

Use this for maximum performance when all agents are working simultaneously:

```bash
# Build all services in parallel (4 agents)
./build-all-parallel.sh
```

## Integration with Agents

- Each script is isolated to a single service
- Parallel script allows 4 agents to build without contention
- All scripts output to stdout for agent integration
- Exit codes indicate success (0) or failure (non-zero)

## Performance Notes

- Individual builds: ~15-30s each depending on codebase size
- Parallel builds: ~30-45s total (all 4 running simultaneously)
- Requires: dotnet CLI available on PATH
