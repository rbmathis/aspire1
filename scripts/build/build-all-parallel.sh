#!/bin/bash
# Build all services in parallel
set -e
echo "🔨 Building all services in parallel..."

(
  echo "Building aspire1.Web..."
  dotnet build aspire1.Web/aspire1.Web.csproj
) &

(
  echo "Building aspire1.ApiService..."
  dotnet build aspire1.ApiService/aspire1.ApiService.csproj
) &

(
  echo "Building aspire1.WeatherService..."
  dotnet build aspire1.WeatherService/aspire1.WeatherService.csproj
) &

(
  echo "Building aspire1.AppHost..."
  dotnet build aspire1.AppHost/aspire1.AppHost.csproj
) &

# Wait for all background jobs
wait
echo "✅ All services built successfully"
