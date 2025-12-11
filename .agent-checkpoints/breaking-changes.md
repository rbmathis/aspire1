# Breaking Changes and Coordination Log

## Purpose

This file tracks breaking changes that affect multiple agents and requires coordination.

## Current Breaking Changes

None currently pending.

## How to Use This File

When a breaking change is needed:

1. **Identify scope**: Which services are affected?
2. **Propose change**: Document what's changing and why
3. **Notify agents**: List which agents need to coordinate
4. **Timeline**: Specify deprecation period (minimum 2 weeks)
5. **Testing**: Ensure all affected service tests pass
6. **Communication**: Update this file with status

## Template for Breaking Change

```markdown
### [Feature/Service]: [Change Description]

**Date Proposed**: YYYY-MM-DD
**Proposed Implementation Date**: YYYY-MM-DD
**Agents Affected**: 
- web-agent (if aspire1.Web changes)
- api-agent (if aspire1.ApiService changes)
- weather-agent (if aspire1.WeatherService changes)
- infra-agent (if deployment config changes)

**Breaking Change Details**:
- Old behavior: [describe]
- New behavior: [describe]
- Files affected: [list]

**Impact Analysis**:
- Web service: [impact]
- API service: [impact]
- Weather service: [impact]
- Shared defaults: [impact]

**Deprecation Plan**:
- Phase 1 (Week 1-2): Both old and new endpoints work
- Phase 2 (Week 3-4): All consumers switch to new endpoint
- Phase 3 (Week 5+): Old endpoint removed

**Status**: [Proposed | In Progress | Ready for Review | Deployed]

**Coordination Notes**:
- [Any special considerations]
```

## Example Breaking Changes (Reference)

### Health Check Format Change
If you needed to change the health check response format:

```markdown
### Health Check API Response Format

**Date Proposed**: 2024-12-11
**Proposed Implementation Date**: 2024-12-25

**Agents Affected**:
- All agents (web-agent, api-agent, weather-agent)
- infra-agent (alert rules reference health format)

**Breaking Change Details**:
- Old format:
  ```json
  {
    "Status": "Healthy",
    "Version": "1.0.0"
  }
  ```
- New format:
  ```json
  {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2024-12-11T10:00:00Z"
  }
  ```

**Impact Analysis**:
- Web service: Tests must update health check assertions
- API service: Tests must update health check assertions  
- Weather service: Tests must update health check assertions
- Shared defaults: Extensions.cs must emit new format

**Deprecation Plan**:
- Week 1-2: Both formats supported (X-Legacy-Format header optional)
- Week 3-4: New format default, old format deprecated warning
- Week 5: Old format removed

**Status**: [Would go here]
```

## Coordination Checklist

Before implementing a breaking change:

- [ ] Document the change here
- [ ] Notify all affected agents
- [ ] Create failing tests for new behavior
- [ ] Implement new behavior (with old behavior working)
- [ ] All service tests pass
- [ ] Updated ARCHITECTURE.md files
- [ ] Dependency map updated
- [ ] Wait 2 weeks minimum for deprecation
- [ ] Remove old behavior
- [ ] Final testing across all services
- [ ] Deploy in correct order (usually ServiceDefaults first)

## Deployment Order for Breaking Changes

1. **aspire1.ServiceDefaults** (if affected) - All other services depend on this
2. **aspire1.WeatherService** (if affected) - No other services depend on it
3. **aspire1.ApiService** (if affected) - Only Web depends on it
4. **aspire1.Web** (if affected) - Depends on API
5. **aspire1.AppHost** (rarely) - Last resort

## Recent Changes

### [Add entries as changes are made]

- 2024-12-11: Created initial agent coordination framework (non-breaking)
