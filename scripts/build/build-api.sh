#!/bin/bash
# Build API service
set -e
echo "🔨 Building aspire1.ApiService..."
dotnet build aspire1.ApiService/aspire1.ApiService.csproj
echo "✅ aspire1.ApiService build complete"
