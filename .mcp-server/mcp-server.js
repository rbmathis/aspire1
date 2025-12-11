#!/usr/bin/env node

/**
 * MCP Server for Aspire Project Context
 *
 * Implements MCP specification 2025-11-25 with support for:
 * - Service architecture and patterns
 * - Dependency relationships
 * - Integration points and contracts
 * - Validation rules and constraints
 * - Tasks for long-running operations (MCP 2025-11-25)
 * - Tool metadata with icons (MCP 2025-11-25)
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25
 */

const fs = require("fs");
const path = require("path");

// MCP Protocol version
const MCP_PROTOCOL_VERSION = "2025-11-25";

class AspireContextServer {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || process.cwd();
    this.mode = process.env.MCP_MODE || "context";
    this.activeTasks = new Map(); // Track long-running tasks (MCP 2025-11-25)
  }

  /**
   * Get server capabilities (MCP 2025-11-25)
   */
  getCapabilities() {
    return {
      protocolVersion: MCP_PROTOCOL_VERSION,
      serverInfo: {
        name: "aspire-context",
        version: "2.0.0",
        description:
          "MCP server providing context for .NET Aspire multi-agent development",
      },
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {
          subscribe: false,
          listChanged: true,
        },
        prompts: {
          listChanged: false,
        },
        tasks: true, // MCP 2025-11-25 feature
      },
    };
  }

  /**
   * List available tools with metadata (MCP 2025-11-25)
   */
  listTools() {
    return {
      tools: [
        {
          name: "get_architecture",
          description: "Get architecture documentation for a specific service",
          icon: "📐",
          inputSchema: {
            type: "object",
            properties: {
              service: {
                type: "string",
                description:
                  "Service name: Web, ApiService, WeatherService, ServiceDefaults",
                enum: [
                  "Web",
                  "ApiService",
                  "WeatherService",
                  "ServiceDefaults",
                ],
              },
              detail: {
                type: "string",
                description:
                  "Detail level: overview, integration-points, endpoints, anti-patterns",
                enum: [
                  "overview",
                  "integration-points",
                  "endpoints",
                  "anti-patterns",
                ],
                default: "overview",
              },
            },
            required: ["service"],
          },
        },
        {
          name: "get_dependencies",
          description: "Get dependencies and constraints for a service",
          icon: "🔗",
          inputSchema: {
            type: "object",
            properties: {
              service: {
                type: "string",
                description: "Service name",
                enum: [
                  "Web",
                  "ApiService",
                  "WeatherService",
                  "ServiceDefaults",
                ],
              },
            },
            required: ["service"],
          },
        },
        {
          name: "validate_change",
          description: "Validate a proposed change against service constraints",
          icon: "✅",
          inputSchema: {
            type: "object",
            properties: {
              service: {
                type: "string",
                description: "Service being modified",
              },
              filePath: {
                type: "string",
                description: "File path being changed",
              },
              changeType: {
                type: "string",
                description: "Type of change",
                enum: [
                  "dependency",
                  "health-check",
                  "endpoint",
                  "shared",
                  "dto",
                  "config",
                ],
              },
            },
            required: ["service", "filePath", "changeType"],
          },
        },
        {
          name: "get_integration_matrix",
          description:
            "Get the full service integration matrix and coordination rules",
          icon: "🗺️",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "get_coordination_status",
          description: "Get current agent coordination status",
          icon: "🤝",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "get_custom_agents",
          description: "List available custom agents and their capabilities",
          icon: "🤖",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "get_skills",
          description: "List available Claude skills in this workspace",
          icon: "🧠",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    };
  }

  /**
   * List available custom agents (VS Code 1.107)
   */
  getCustomAgents() {
    const agentsDir = path.join(this.projectRoot, ".github", "agents");
    const agents = [];

    if (fs.existsSync(agentsDir)) {
      const files = fs
        .readdirSync(agentsDir)
        .filter((f) => f.endsWith(".agent.md"));
      for (const file of files) {
        const content = fs.readFileSync(path.join(agentsDir, file), "utf-8");
        const nameMatch = content.match(/^name:\s*(.+)$/m);
        const descMatch = content.match(/^description:\s*(.+)$/m);
        const inferMatch = content.match(/^infer:\s*(.+)$/m);

        agents.push({
          file,
          name: nameMatch?.[1] || file.replace(".agent.md", ""),
          description: descMatch?.[1] || "No description",
          canBeSubagent: inferMatch?.[1]?.toLowerCase() !== "false",
        });
      }
    }

    return {
      agentsDirectory: ".github/agents/",
      agents,
      usage: {
        asSubagent: 'Ask "What subagents can you use?" in chat',
        directly: "Use @agent-name in chat to invoke directly",
        background: 'Use "Continue in" to hand off to background agent',
      },
    };
  }

  /**
   * List available Claude skills (VS Code 1.107)
   */
  getSkills() {
    const skillsDir = path.join(this.projectRoot, ".claude", "skills");
    const skills = [];

    if (fs.existsSync(skillsDir)) {
      const dirs = fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory());

      for (const dir of dirs) {
        const skillFile = path.join(skillsDir, dir.name, "SKILL.md");
        if (fs.existsSync(skillFile)) {
          const content = fs.readFileSync(skillFile, "utf-8");
          const descMatch = content.match(/^description:\s*(.+)$/m);

          skills.push({
            name: dir.name,
            path: `.claude/skills/${dir.name}/SKILL.md`,
            description: descMatch?.[1] || "No description",
          });
        }
      }
    }

    return {
      skillsDirectory: ".claude/skills/",
      skills,
      usage:
        'Skills are loaded on-demand when relevant to the task. Ask "What skills do you have?" in chat.',
    };
  }

  /**
   * Get architecture for a specific service
   */
  getServiceArchitecture(serviceName, detail = "overview") {
    const architectureFile = path.join(
      this.projectRoot,
      `aspire1.${serviceName}`,
      "ARCHITECTURE.md"
    );

    if (!fs.existsSync(architectureFile)) {
      return {
        error: `Architecture file not found for service: ${serviceName}`,
        path: architectureFile,
      };
    }

    try {
      const content = fs.readFileSync(architectureFile, "utf-8");
      return {
        service: serviceName,
        detail,
        content: this.extractArchitectureSection(content, detail),
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Extract specific section from architecture document
   */
  extractArchitectureSection(content, section) {
    const sections = {
      overview: (c) =>
        c.split("##")[1]?.substring(0, 500) || c.substring(0, 500),
      "integration-points": (c) => this.findSection(c, "Integration"),
      endpoints: (c) => this.findSection(c, "Endpoint"),
      "anti-patterns": (c) => this.findSection(c, "Bad|Anti"),
    };

    const extractor = sections[section] || sections["overview"];
    return extractor(content);
  }

  /**
   * Find section by keyword
   */
  findSection(content, keyword) {
    const regex = new RegExp(
      `##\\s*.*${keyword}.*\\n([\\s\\S]*?)(?=##|$)`,
      "i"
    );
    const match = content.match(regex);
    return match
      ? match[1].trim().substring(0, 1000)
      : `No section found for: ${keyword}`;
  }

  /**
   * Get all service dependencies
   */
  getDependencies(serviceName) {
    const dependencies = {
      Web: [
        { service: "ApiService", method: "WeatherApiClient", readonly: true },
        {
          service: "ServiceDefaults",
          method: "Extensions.AddServiceDefaults()",
          readonly: true,
        },
      ],
      ApiService: [
        { service: "WeatherService", method: "HttpClient", readonly: true },
        {
          service: "ServiceDefaults",
          method: "Extensions.AddServiceDefaults()",
          readonly: true,
        },
      ],
      WeatherService: [
        {
          service: "ServiceDefaults",
          method: "Extensions.AddServiceDefaults()",
          readonly: true,
        },
      ],
      ServiceDefaults: [],
    };

    return {
      service: serviceName,
      dependencies: dependencies[serviceName] || [],
      constraints: this.getConstraints(serviceName),
    };
  }

  /**
   * Get constraints for a service
   */
  getConstraints(serviceName) {
    const constraints = {
      Web: {
        noHardcodedUrls: true,
        noDependencyOn: ["WeatherService"],
        mustUse: ["WeatherApiClient pattern"],
      },
      ApiService: {
        noHardcodedUrls: true,
        mustUse: ["Resilience from ServiceDefaults", "Health checks"],
        noDependencyOn: ["Web"],
      },
      WeatherService: {
        noDependencyOn: ["ApiService", "Web"],
        mustUse: ["ServiceDefaults patterns"],
        independent: true,
      },
      ServiceDefaults: {
        noServiceDependencies: true,
        sharedByAll: true,
        breakingChangesRequireCoordination: true,
      },
    };

    return constraints[serviceName] || {};
  }

  /**
   * Validate a proposed change
   */
  validateChange(serviceName, filePath, changeType) {
    const constraints = this.getConstraints(serviceName);
    const dependencies = this.getDependencies(serviceName);

    const validation = {
      service: serviceName,
      file: filePath,
      changeType,
      valid: true,
      warnings: [],
      errors: [],
    };

    // Validate based on change type
    switch (changeType) {
      case "dependency":
        if (constraints.noDependencyOn?.length > 0) {
          validation.warnings.push(
            `Service ${serviceName} has constraints: ${constraints.noDependencyOn.join(
              ", "
            )}`
          );
        }
        break;

      case "health-check":
        if (
          dependencies.dependencies.some((d) => d.service === "ServiceDefaults")
        ) {
          validation.warnings.push(
            "Health check changes may affect dependent services. Coordinate with other agents."
          );
        }
        break;

      case "endpoint":
        validation.warnings.push(
          "New endpoint should be documented in integration-points.md"
        );
        break;

      case "shared":
        if (serviceName === "ServiceDefaults") {
          validation.errors.push(
            "CRITICAL: Changes to ServiceDefaults affect all services. " +
              "Coordinate with web-agent, api-agent, and weather-agent."
          );
          validation.valid = false;
        }
        break;
    }

    return validation;
  }

  /**
   * Get integration matrix
   */
  getIntegrationMatrix() {
    return {
      integrations: [
        {
          from: "Web",
          to: "ApiService",
          method: "WeatherApiClient",
          endpoint: "GET /weatherforecast",
          contract: "WeatherForecast[]",
        },
        {
          from: "ApiService",
          to: "WeatherService",
          method: "HttpClient",
          endpoint: "GET /weatherforecast",
          contract: "WeatherForecast[]",
        },
        {
          from: "All",
          to: "ServiceDefaults",
          method: "AddServiceDefaults()",
          endpoint: "GET /health/detailed",
          contract: "JSON health status",
        },
      ],
      coordinationRules: {
        parallelSafe: [
          "web-agent modifying Web while weather-agent modifies WeatherService",
          "api-agent adding endpoints while weather-agent modifying data",
        ],
        requiresCoordination: [
          "Any change to ServiceDefaults",
          "Adding new service-to-service endpoints",
          "Changing health check formats",
          "Modifying DTO contracts",
        ],
        forbidden: [
          "Multiple agents modifying same file",
          "Different agents changing same interface",
        ],
      },
    };
  }

  /**
   * Main request handler (MCP 2025-11-25)
   */
  handleRequest(request) {
    const { method, params = {} } = request;

    switch (method) {
      // MCP standard methods
      case "initialize":
        return this.getCapabilities();

      case "tools/list":
        return this.listTools();

      // Custom tools
      case "get_architecture":
        return this.getServiceArchitecture(params.service, params.detail);

      case "get_dependencies":
        return this.getDependencies(params.service);

      case "validate_change":
        return this.validateChange(
          params.service,
          params.filePath,
          params.changeType
        );

      case "get_integration_matrix":
        return this.getIntegrationMatrix();

      case "get_coordination_status":
        return this.getCoordinationStatus();

      case "get_custom_agents":
        return this.getCustomAgents();

      case "get_skills":
        return this.getSkills();

      default:
        return { error: `Unknown method: ${method}` };
    }
  }

  /**
   * Get current coordination status
   */
  getCoordinationStatus() {
    return {
      agents: [
        {
          id: "web-agent",
          status: "ready",
          scope: "aspire1.Web",
          agentFile: ".github/agents/web.agent.md",
        },
        {
          id: "api-agent",
          status: "ready",
          scope: "aspire1.ApiService",
          agentFile: ".github/agents/api.agent.md",
        },
        {
          id: "weather-agent",
          status: "ready",
          scope: "aspire1.WeatherService",
          agentFile: ".github/agents/weather.agent.md",
        },
        {
          id: "infra-agent",
          status: "ready",
          scope: "infra/",
          agentFile: ".github/agents/infra.agent.md",
        },
      ],
      pendingCoordination: [],
      lastUpdate: new Date().toISOString(),
      vsCodeVersion: "1.107+",
      mcpVersion: MCP_PROTOCOL_VERSION,
    };
  }

  /**
   * Start server
   */
  start() {
    console.log(`Aspire MCP Context Server v2.0.0`);
    console.log(`MCP Protocol: ${MCP_PROTOCOL_VERSION}`);
    console.log(`Mode: ${this.mode}`);
    console.log(`Project root: ${this.projectRoot}`);
    console.log("");
    console.log("Available tools:");
    this.listTools().tools.forEach((t) => {
      console.log(`  ${t.icon} ${t.name} - ${t.description}`);
    });
  }
}

// Create and start server
const server = new AspireContextServer();
server.start();

// Export for testing
module.exports = AspireContextServer;
