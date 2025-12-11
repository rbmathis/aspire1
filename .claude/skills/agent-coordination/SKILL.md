---
description: Multi-agent coordination patterns for this repository. Use when working with multiple agents or making changes that affect multiple services.
---

# Agent Coordination Skill

This skill provides coordination patterns when multiple agents are working on the aspire1 solution.

## Agent Boundaries

| Agent         | Scope                  | Can Modify                 | Coordinates With      |
| ------------- | ---------------------- | -------------------------- | --------------------- |
| web-agent     | aspire1.Web            | Components, Pages, Clients | weather-agent (DTOs)  |
| weather-agent | aspire1.WeatherService | Data generators, Endpoints | web-agent (DTOs)      |
| infra-agent   | infra/                 | Bicep, azure.yaml          | All (for config)      |

## Coordination Required

### ServiceDefaults Changes (CRITICAL)

```
⚠️ aspire1.ServiceDefaults is used by ALL services
Any change here requires:
1. Document in .agent-checkpoints/breaking-changes.md
2. Notify all 3 agents (web, weather, infra)
3. All services must pass tests
4. 2-week deprecation for breaking changes
```

### DTO/Contract Changes

```
When changing a DTO used across services:
1. weather-agent creates/modifies the DTO in WeatherService
2. web-agent updates WeatherApiClient and usage in Web
3. Both agents coordinate on the contract
4. Build all: ./scripts/build/build-all-parallel.sh
```

### New Endpoint Flow

```
1. weather-agent: Add /resource endpoint in WeatherService
2. web-agent: Update WeatherApiClient to call new endpoint + add UI
3. Both agents coordinate on DTO contract
4. infra-agent: Update infra if new Azure resources needed
```

## Safe Parallel Work

These operations are safe to do simultaneously:

- web-agent: Modify Components/ (UI only, no API changes)
- weather-agent: Modify internal Services/ (data generation logic)
- infra-agent: Update Bicep modules
- Any agent: Update documentation

## Conflict Resolution

If `.agent-context.json` conflicts with `.agent-checkpoints/`:

1. `.agent-context.json` takes precedence
2. Do not proceed until conflict is resolved
3. Update the conflicting documentation

## Breaking Changes Protocol

1. Document in `.agent-checkpoints/breaking-changes.md`:
   ```markdown
   ## [Date] - Change Description

   - **Agent**: weather-agent
   - **Affected Services**: Web
   - **Migration**: [steps]
   - **Deprecation Date**: [+2 weeks]
   ```
2. Implement with backward compatibility
3. Wait for deprecation period
4. Remove old behavior
