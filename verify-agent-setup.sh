#!/bin/bash
# Verify Agent Configuration Setup

echo "🔍 Verifying Multi-Agent Setup for aspire1..."
echo ""

FAILED=0

# Check .vscode directory
echo "✓ Checking .vscode configuration..."
if [ -f ".vscode/agents.json" ]; then
  echo "  ✅ agents.json exists"
else
  echo "  ❌ agents.json missing"
  FAILED=$((FAILED+1))
fi

if grep -q "agent.maxParallelAgents" ".vscode/settings.json" 2>/dev/null; then
  echo "  ✅ settings.json configured for agents"
else
  echo "  ❌ settings.json not configured for agents"
  FAILED=$((FAILED+1))
fi

echo ""
echo "✓ Checking service context files..."
for service in "Web" "ApiService" "WeatherService" "ServiceDefaults"; do
  dir="aspire1.${service}"
  if [ -f "${dir}/.agent-context.json" ]; then
    echo "  ✅ ${dir}/.agent-context.json exists"
  else
    echo "  ❌ ${dir}/.agent-context.json missing"
    FAILED=$((FAILED+1))
  fi
done

echo ""
echo "✓ Checking MCP structure..."
MCP_SERVICES=("web" "api" "weather" "infrastructure")
for service in "${MCP_SERVICES[@]}"; do
  if [ -f ".mcp/services/${service}.mcp.json" ]; then
    echo "  ✅ .mcp/services/${service}.mcp.json exists"
  else
    echo "  ❌ .mcp/services/${service}.mcp.json missing"
    FAILED=$((FAILED+1))
  fi
done

if [ -f ".mcp/shared/defaults.mcp.json" ] && [ -f ".mcp/shared/apphost.mcp.json" ]; then
  echo "  ✅ Shared MCP definitions exist"
else
  echo "  ❌ Shared MCP definitions missing"
  FAILED=$((FAILED+1))
fi

echo ""
echo "✓ Checking MCP Server..."
if [ -f ".mcp-server/mcp-server.js" ]; then
  echo "  ✅ MCP server implementation exists"
  if grep -q "class AspireContextServer" ".mcp-server/mcp-server.js"; then
    echo "  ✅ MCP server has required methods"
  else
    echo "  ⚠️  MCP server may be incomplete"
  fi
else
  echo "  ❌ MCP server missing"
  FAILED=$((FAILED+1))
fi

echo ""
echo "✓ Checking coordination checkpoints..."
CHECKPOINTS=("dependency-map.md" "integration-points.md" "breaking-changes.md")
for checkpoint in "${CHECKPOINTS[@]}"; do
  if [ -f ".agent-checkpoints/${checkpoint}" ]; then
    echo "  ✅ .agent-checkpoints/${checkpoint} exists"
  else
    echo "  ❌ .agent-checkpoints/${checkpoint} missing"
    FAILED=$((FAILED+1))
  fi
done

echo ""
echo "✓ Checking build scripts..."
BUILD_SCRIPTS=("build-web.sh" "build-api.sh" "build-weather.sh" "build-all-parallel.sh")
for script in "${BUILD_SCRIPTS[@]}"; do
  if [ -x "scripts/build/${script}" ]; then
    echo "  ✅ scripts/build/${script} is executable"
  else
    echo "  ❌ scripts/build/${script} not executable or missing"
    FAILED=$((FAILED+1))
  fi
done

echo ""
echo "✓ Checking documentation..."
if [ -f "AGENT_SETUP.md" ]; then
  echo "  ✅ AGENT_SETUP.md exists"
else
  echo "  ❌ AGENT_SETUP.md missing"
  FAILED=$((FAILED+1))
fi

if [ -f "QUICK_START.md" ]; then
  echo "  ✅ QUICK_START.md exists"
else
  echo "  ❌ QUICK_START.md missing"
  FAILED=$((FAILED+1))
fi

echo ""
echo "✓ Checking test configuration..."
if [ -f ".test-matrix.json" ]; then
  echo "  ✅ .test-matrix.json exists"
else
  echo "  ❌ .test-matrix.json missing"
  FAILED=$((FAILED+1))
fi

echo ""
echo "==================================================================="
if [ $FAILED -eq 0 ]; then
  echo "✅ SETUP COMPLETE: All agent configuration files are in place!"
  echo ""
  echo "Next steps:"
  echo "1. Read QUICK_START.md for commands"
  echo "2. Check .agent-checkpoints/ for coordination details"
  echo "3. Review .vscode/agents.json for agent definitions"
  echo "4. Start VSCode 1.107+ to use agents"
  echo ""
  exit 0
else
  echo "❌ SETUP INCOMPLETE: $FAILED file(s) missing or misconfigured"
  echo ""
  echo "Please check the missing files above and re-run setup"
  exit 1
fi
