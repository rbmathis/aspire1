#!/bin/bash
# Build Weather service
set -e
echo "🔨 Building aspire1.WeatherService..."
dotnet build aspire1.WeatherService/aspire1.WeatherService.csproj
echo "✅ aspire1.WeatherService build complete"
