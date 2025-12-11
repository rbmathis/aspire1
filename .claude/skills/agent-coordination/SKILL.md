---
description: Multi-agent coordination patterns for this repository. Use when working with multiple agents or making changes that affect multiple services.
---

# Agent Coordination Skill

This skill provides coordination patterns when multiple agents are working on the aspire1 solution.

## Agent Boundaries

| Agent         | Scope                  | Can Modify                 | Coordinates With         |
| ------------- | ---------------------- | -------------------------- | ------------------------ |
| web-agent     | aspire1.Web            | Components, Pages, Clients | api-agent (for DTOs)     |
| api-agent     | aspire1.ApiService     | Endpoints, Services        | web-agent, weather-agent |
| weather-agent | aspire1.WeatherService | Data generators, Endpoints | api-agent                |
| infra-agent   | infra/                 | Bicep, azure.yaml          | All (for config)         |

## Coordination Required

### ServiceDefaults Changes (CRITICAL)

```
⚠️ aspire1.ServiceDefaults is used by ALL services
Any change here requires:
1. Document in .agent-checkpoints/breaking-changes.md
2. Notify all 4 agents
3. All services must pass tests
4. 2-week deprecation for breaking changes
```

### DTO/Contract Changes

```
When changing a DTO used across services:
1. weather-agent creates/modifies the DTO
2. api-agent updates its usage
3. web-agent updates its client
4. Build all: ./scripts/build/build-all-parallel.sh
```

### New Endpoint Flow

```
1. weather-agent: Add /resource endpoint
2. api-agent: Add /api/resource that calls weather
3. web-agent: Add ResourceApiClient + page
4. infra-agent: Update infra if new Azure resources needed
```

## Safe Parallel Work

These operations are safe to do simultaneously:

- web-agent: Modify Components/
- weather-agent: Modify Services/
- api-agent: Add new independent endpoint
- infra-agent: Update Bicep modules

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
   - **Affected Services**: ApiService, Web
   - **Migration**: [steps]
   - **Deprecation Date**: [+2 weeks]
   ```
2. Implement with backward compatibility
3. Wait for deprecation period
4. Remove old behavior
