# aspire1 - .NET Aspire Microservices on Azure Container Apps

[![Build Status](https://github.com/rbmathis/aspire1/actions/workflows/deploy.yml/badge.svg)](https://github.com/rbmathis/aspire1/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-ready **microservices solution** demonstrating cloud-native architecture patterns with .NET Aspire, Blazor Server frontend, and RESTful backend APIs deployed to **Azure Container Apps**.

## Features

- 🎯 **Service Orchestration** – .NET Aspire 13 for service discovery and local development
- 🔐 **Secrets Management** – Azure Key Vault with managed identities (never hardcoded secrets)
- 📊 **Observability** – OpenTelemetry with Application Insights traces, metrics, and logs
- 🚀 **Feature Flags** – Azure App Configuration for runtime feature toggles
- 💾 **Distributed Caching** – Redis for cache and session state
- 🧪 **Comprehensive Tests** – xUnit, FluentAssertions, NSubstitute (>80% coverage)
- 🐳 **Container-Ready** – Automatic Docker image builds with semantic versioning
- 🔄 **CI/CD Pipeline** – GitHub Actions with Azure Developer CLI (azd)
- 🌐 **Offline-First** – All Azure integrations have graceful fallbacks for local development

## Quick Start

### Prerequisites

- **.NET 10.0** SDK ([download](https://dotnet.microsoft.com/download/dotnet/10.0))
- **Git** 2.30+
- **Docker** (optional, for container builds)
- **Azure CLI** 2.50+ (optional, for Azure deployment)
- **Azure Developer CLI (azd)** 1.9+ (optional, for Azure deployment)

**Recommended:** Use the [DevContainer](/.devcontainer/README.md) for a pre-configured development environment.

### Getting Started

#### 1. Clone and Restore

```bash
git clone https://github.com/rbmathis/aspire1.git
cd aspire1
dotnet restore
```

#### 2. Run Locally with Aspire Dashboard

```bash
dotnet run --project aspire1.AppHost
```

Open the **Aspire Dashboard** at: **http://localhost:15888** (or **https://localhost:18848** for HTTPS)

The dashboard will show:
- ✅ **aspire1-web** (Blazor Server frontend) → http://localhost:5188
- ✅ **aspire1-apiservice** (REST API backend) → http://localhost:7002
- 📊 OpenTelemetry traces, metrics, and logs in real-time

#### 3. View Service Status

```bash
# Check API health
curl http://localhost:7002/health

# Get version info (includes commit SHA)
curl http://localhost:7002/version

# Access weather forecast API
curl http://localhost:7002/weatherforecast
```

#### 4. Access the Web Frontend

Navigate to **http://localhost:5188** in your browser. The Blazor Server app will display:
- Weather page (calls the API via service discovery)
- Feature flags page (shows enabled/disabled features)

### 📁 Project Structure

```
aspire1/
├── aspire1.AppHost/                 # Service orchestration & discovery
│   ├── Program.cs                   # Defines service topology
│   └── ARCHITECTURE.md              # AppHost-specific patterns
│
├── aspire1.ApiService/              # REST API backend (Minimal APIs)
│   ├── Program.cs                   # API endpoints & middleware
│   ├── Services/                    # Business logic (CachedWeatherService)
│   └── ARCHITECTURE.md              # API patterns & examples
│
├── aspire1.Web/                     # Blazor Server frontend
│   ├── Program.cs                   # Web app configuration
│   ├── Components/                  # Blazor components & pages
│   └── ARCHITECTURE.md              # Blazor patterns & examples
│
├── aspire1.ServiceDefaults/         # Shared Aspire configuration
│   ├── Extensions.cs                # OpenTelemetry, health checks, resilience
│   └── ARCHITECTURE.md              # Service defaults patterns
│
├── aspire1.ApiService.Tests/        # Unit tests for API service
│   └── Services/                    # CachedWeatherService tests
│
├── aspire1.Web.Tests/               # Unit tests for Web app
│   └── WeatherApiClientTests.cs     # HTTP client tests
│
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Actions CI/CD pipeline
│
├── ARCHITECTURE.md                  # Solution-wide architecture docs
├── AZURE_APP_CONFIG_SETUP.md        # Feature flags setup guide
├── azure.yaml                       # Azure Developer CLI manifest
└── Directory.Build.props            # MinVer automatic versioning
```

### 🧪 Testing

```bash
# Run all unit tests
dotnet test

# Run specific project tests
dotnet test aspire1.ApiService.Tests
dotnet test aspire1.Web.Tests

# Run tests with code coverage
dotnet test --collect:"XPlat Code Coverage"

# Watch mode (auto-rerun on file changes)
dotnet watch --project aspire1.ApiService.Tests
```

**Test Coverage:**
- ✅ `aspire1.ApiService.Tests` – 7 tests covering cache logic, error handling (>80% coverage)
- ✅ `aspire1.Web.Tests` – 10 tests covering HTTP client behavior, edge cases (>80% coverage)

See [ARCHITECTURE.md](ARCHITECTURE.md#-testing-strategy) for detailed test patterns.

---

## 🏗️ Architecture

### High-Level Topology

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              Azure Container Apps Environment           │
│                                                         │
│  ┌───────────────────┐        ┌─────────────────────┐  │
│  │  aspire1-web      │        │  aspire1-apiservice │  │
│  │  (Blazor Server)  │───────▶│  (Minimal API)      │  │
│  │                   │        │                     │  │
│  │ Min: 1, Max: 10   │        │ Min: 1, Max: 5      │  │
│  │ Ingress: External │        │ Ingress: Internal   │  │
│  └───────────────────┘        └─────────────────────┘  │
│           ▼                             ▼               │
│  ┌───────────────────────────────────────────────────┐  │
│  │    Azure Key Vault (Secrets)                      │  │
│  │    Azure App Configuration (Features)            │  │
│  │    Redis (Caching & Sessions)                    │  │
│  └───────────────────────────────────────────────────┘  │
│           ▼                             ▼               │
│  ┌───────────────────────────────────────────────────┐  │
│  │   Application Insights (Observability)           │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Service Discovery

Services communicate using **Aspire's built-in service discovery**:

```csharp
// In AppHost (defines topology)
var apiService = builder.AddProject<Projects.aspire1_ApiService>("apiservice");
var webApp = builder.AddProject<Projects.aspire1_Web>("webfrontend")
    .WithReference(apiService);  // Service discovery!
```

Internally, `aspire1-web` resolves `apiservice` automatically via HTTPS with fallback to HTTP.

### Observability

All services emit structured **OpenTelemetry** data:
- **Traces** – Distributed tracing for request flows
- **Metrics** – ASP.NET Core, HttpClient, Runtime metrics
- **Logs** – Structured logging with severity levels
- **Destination** – Application Insights in Azure

Health check endpoints are automatically excluded from traces to reduce noise.

See [ARCHITECTURE.md](ARCHITECTURE.md#-observability--monitoring) for detailed monitoring setup.

### Versioning

Versions are automatically generated from **git tags** using **MinVer**:

```bash
# Create and push a version tag
git tag v1.1.0
git push origin v1.1.0

# Check current version
minver
```

Container images are tagged with the version: `aspire1-apiservice:1.1.0`

See [ARCHITECTURE.md](ARCHITECTURE.md#-versioning-strategy) for full details.

---

## 🚀 Deployment

### Local Development

```bash
# Run the full application locally
dotnet run --project aspire1.AppHost

# Access Aspire Dashboard at http://localhost:15888
# Access Web frontend at http://localhost:5188
# Access API at http://localhost:7002
```

### Azure Deployment

Deploy to **Azure Container Apps** using Azure Developer CLI (azd):

```bash
# Login to Azure
azd auth login

# Initialize environment (first time only)
azd env new dev

# Provision infrastructure and deploy
azd up

# Check deployment status
azd show

# View logs
az containerapp logs show --name aspire1-web --resource-group rg-aspire1-dev

# Tear down resources
azd down --force --purge
```

**What azd does:**
1. Provisions Azure Container Apps, Key Vault, App Configuration, Application Insights, Container Registry
2. Extracts version with MinVer
3. Builds and pushes container images
4. Deploys to Azure Container Apps with service discovery

See [ARCHITECTURE.md](ARCHITECTURE.md#-deployment-topology) for architecture and resource details.

### Feature Flags

Feature flags are managed via **Azure App Configuration**:

```bash
# Set a feature flag
az appconfig feature set --name $APPCONFIG_NAME --feature WeatherForecast --label Development --yes

# Disable a feature
az appconfig feature disable --name $APPCONFIG_NAME --feature WeatherForecast --label Development

# Test locally
dotnet user-secrets set "AppConfig:Endpoint" "https://your-appconfig.azconfig.io"
dotnet run --project aspire1.AppHost
```

See [AZURE_APP_CONFIG_SETUP.md](AZURE_APP_CONFIG_SETUP.md) for complete feature flag setup.

---

## 🤝 Contributing

### Branching Strategy

This repository enforces a **feature branch workflow** via git hooks. Direct commits to `main`/`master` are blocked.

```bash
# Create a feature branch
git checkout -b feature/add-weather-endpoint

# Commit your changes
git add .
git commit -m "feat: add detailed weather endpoint"

# Push and create a pull request
git push origin feature/add-weather-endpoint
```

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make changes** and write tests
3. **Run tests locally** – `dotnet test`
4. **Push changes** and open a pull request
5. **Reference issues** using "Closes #N" or "Fixes #N"
6. **Get code review** from team members
7. **Merge to main** – triggers CI/CD pipeline

### Code Standards

- **Language:** C# 13 with nullable reference types enabled
- **Testing:** xUnit with FluentAssertions and NSubstitute
- **Test Naming:** `[MethodName]_[Scenario]_[ExpectedResult]`
- **Coverage:** Target >80% on business logic
- **Architecture:** Follow patterns documented in project ARCHITECTURE.md files
- **Linting:** Built-in .NET analyzers (via Directory.Build.props)

### Adding New Features

Before implementing:

1. Check relevant **ARCHITECTURE.md** for existing patterns
2. Follow established endpoints and naming conventions
3. Add unit tests with >80% coverage target
4. Update relevant ARCHITECTURE.md if adding new patterns
5. Verify service discovery works if adding inter-service communication

---

## 📚 Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Solution-wide architecture, topology, deployment, CI/CD, troubleshooting | Everyone |
| **[.devcontainer/README.md](.devcontainer/README.md)** | DevContainer setup, VS Code extensions, Codespaces | Developers |
| **[AZURE_APP_CONFIG_SETUP.md](AZURE_APP_CONFIG_SETUP.md)** | Feature flags setup and management | DevOps, Developers |
| **aspire1.AppHost/ARCHITECTURE.md** | Service orchestration, AppHost configuration | Backend Developers |
| **aspire1.ApiService/ARCHITECTURE.md** | API endpoints, OpenTelemetry, health checks | API Developers |
| **aspire1.Web/ARCHITECTURE.md** | Blazor components, HTTP clients, SignalR | Frontend Developers |
| **aspire1.ServiceDefaults/ARCHITECTURE.md** | Shared OpenTelemetry, health checks, resilience | All Developers |

---

## 🔧 Common Commands

```bash
# Build & Run
dotnet restore                              # Restore NuGet packages
dotnet build                                # Build solution
dotnet run --project aspire1.AppHost        # Run with Aspire Dashboard

# Testing
dotnet test                                 # Run all tests
dotnet test aspire1.ApiService.Tests        # Run API service tests
dotnet test --collect:"XPlat Code Coverage" # Generate coverage report

# Versioning
minver                                      # Check current version
git tag v1.1.0 && git push --tags          # Create and push version tag

# Azure Deployment
azd auth login                              # Login to Azure
azd up                                      # Provision & deploy
azd deploy                                  # Deploy only (after provision)
azd down --force --purge                    # Tear down resources

# Debugging
dotnet run --project aspire1.ApiService     # Run API service standalone
dotnet run --project aspire1.Web            # Run web app standalone
```

---

## 🐛 Troubleshooting

### Aspire Dashboard Won't Start

```bash
# Check if port 15888 is in use
netstat -tuln | grep 15888

# Kill existing process
pkill -f aspire1.AppHost

# Restart
dotnet run --project aspire1.AppHost
```

### HTTPS Certificate Issues

```bash
# Clean and re-trust development certificates
dotnet dev-certs https --clean
dotnet dev-certs https --trust
```

### Service Discovery Not Working

Ensure services are registered in `aspire1.AppHost/Program.cs`:

```csharp
var apiService = builder.AddProject<Projects.aspire1_ApiService>("apiservice");
var webApp = builder.AddProject<Projects.aspire1_Web>("webfrontend")
    .WithReference(apiService);
```

Service names must match the string passed to `AddProject()`.

### Tests Failing After Code Changes

```bash
# Clean and rebuild
dotnet clean
dotnet restore
dotnet build
dotnet test
```

For more troubleshooting, see [ARCHITECTURE.md § Troubleshooting](ARCHITECTURE.md#-troubleshooting-cheat-sheet).

---

## 📊 Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Runtime** | .NET | 10.0 |
| **Orchestration** | .NET Aspire | 13.0.2 |
| **Frontend** | Blazor Server | Built-in |
| **Backend** | Minimal APIs | Built-in |
| **Deployment** | Azure Container Apps | Current |
| **Caching** | Redis | 9.1.0 |
| **Config** | Azure App Configuration | Latest |
| **Secrets** | Azure Key Vault | Latest |
| **Observability** | OpenTelemetry | Latest |
| **Monitoring** | Application Insights | Built-in |
| **Testing** | xUnit + FluentAssertions + NSubstitute | 2.9.3 + 6.12.0 + 5.1.0 |
| **Versioning** | MinVer | 6.0.0 |

---

## 📋 Production Readiness

- ✅ Centralized versioning (MinVer from git tags)
- ✅ Secrets in Key Vault only (never in code)
- ✅ OpenTelemetry to Application Insights
- ✅ Health checks on all services
- ✅ Managed identities for Azure resources
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Unit test coverage >80% target
- ✅ Offline-first design (graceful fallbacks)
- ⏳ Custom domain + SSL certificate (planned)
- ⏳ Azure Front Door for CDN + WAF (planned)

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## 🤔 Need Help?

- **Documentation:** See [ARCHITECTURE.md](ARCHITECTURE.md) for deep dives
- **Getting Started:** Check the [Quick Start](#quick-start) section above
- **Deployment:** Review [AZURE_APP_CONFIG_SETUP.md](AZURE_APP_CONFIG_SETUP.md) for Azure setup
- **Issues:** Open a [GitHub issue](https://github.com/rbmathis/aspire1/issues)

---

**Happy coding! 🚀**

*Last updated: April 2026*
