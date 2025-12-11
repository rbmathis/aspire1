---
description: Azure deployment patterns for this Aspire solution. Use when deploying to Azure Container Apps, configuring Key Vault, or setting up CI/CD.
---

# Azure Deployment Skill

This skill provides deployment patterns for the aspire1 solution targeting Azure Container Apps.

## Target Platform

- **Primary**: Azure Container Apps with Dapr
- **Do NOT suggest**: Azure App Service or AKS unless explicitly requested

## azd Commands

```bash
# Full deployment (provision + deploy)
azd up

# Just provision infrastructure
azd provision

# Just deploy applications
azd deploy

# Preview changes
azd preview

# Tear down everything
azd down --force --purge

# Set environment variables
azd env set KEY value
```

## Secrets Management

### Local Development

```bash
# Use User Secrets
dotnet user-secrets set "ConnectionStrings:MyDb" "local-connection-string"

# Or azd env
azd env set ConnectionStrings__MyDb "local-value"
```

### Production (Key Vault References)

```bash
# Set Key Vault reference in azd
azd env set ConnectionStrings__MyDb "@Microsoft.KeyVault(SecretUri=https://kv.vault.azure.net/secrets/mydb)"
```

### NEVER DO THIS

```json
// ❌ NEVER put secrets in appsettings.json
{
  "ConnectionStrings": {
    "MyDb": "Server=prod.db.com;Password=secret123;"
  }
}
```

## Bicep Patterns

### Module structure in `infra/`:

- `main.bicep` - Main entry point
- `app-insights.bicep` - Application Insights
- `redis.bicep` - Redis Cache
- `alerts.bicep` - Monitoring alerts

### Adding a new Azure resource:

1. Create `infra/{resource}.bicep`
2. Add module reference in `main.bicep`
3. Update `azure.yaml` if needed
4. Run `azd preview` to validate

## CI/CD with GitHub Actions

Located in `.github/workflows/`:

```yaml
# Key patterns:
- name: Cache NuGet
  uses: actions/cache@v4
  with:
    path: ~/.nuget/packages
    key: ${{ runner.os }}-nuget-${{ hashFiles('**/*.csproj') }}

- name: Deploy with azd
  run: azd up --no-prompt
  env:
    AZURE_ENV_NAME: ${{ vars.AZURE_ENV_NAME }}
```

## Container Apps Configuration

- Use managed identity for all Azure resource access
- Configure scaling with KEDA rules
- Set revision mode based on deployment strategy
- Use private endpoints for backend services
