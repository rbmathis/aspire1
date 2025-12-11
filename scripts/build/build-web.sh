#!/bin/bash
# Build Web service
set -e
echo "🔨 Building aspire1.Web..."
dotnet build aspire1.Web/aspire1.Web.csproj
echo "✅ aspire1.Web build complete"
