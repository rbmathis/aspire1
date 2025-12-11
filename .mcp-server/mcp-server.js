#!/usr/bin/env node

/**
 * MCP Server for Aspire Project Context
 * 
 * Provides agents with contextual information about:
 * - Service architecture and patterns
 * - Dependency relationships
 * - Integration points and contracts
 * - Validation rules and constraints
 */

const fs = require('fs');
const path = require('path');

class AspireContextServer {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || process.cwd();
    this.mode = process.env.MCP_MODE || 'context';
  }

  /**
   * Get architecture for a specific service
   */
  getServiceArchitecture(serviceName, detail = 'overview') {
    const architectureFile = path.join(
      this.projectRoot,
      `aspire1.${serviceName}`,
      'ARCHITECTURE.md'
    );

    if (!fs.existsSync(architectureFile)) {
      return {
        error: `Architecture file not found for service: ${serviceName}`,
        path: architectureFile
      };
    }

    try {
      const content = fs.readFileSync(architectureFile, 'utf-8');
      return {
        service: serviceName,
        detail,
        content: this.extractArchitectureSection(content, detail)
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
      'overview': (c) => c.split('##')[1]?.substring(0, 500) || c.substring(0, 500),
      'integration-points': (c) => this.findSection(c, 'Integration'),
      'endpoints': (c) => this.findSection(c, 'Endpoint'),
      'anti-patterns': (c) => this.findSection(c, 'Bad|Anti')
    };

    const extractor = sections[section] || sections['overview'];
    return extractor(content);
  }

  /**
   * Find section by keyword
   */
  findSection(content, keyword) {
    const regex = new RegExp(`##\\s*.*${keyword}.*\\n([\\s\\S]*?)(?=##|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim().substring(0, 1000) : `No section found for: ${keyword}`;
  }

  /**
   * Get all service dependencies
   */
  getDependencies(serviceName) {
    const dependencies = {
      'Web': [
        { service: 'ApiService', method: 'WeatherApiClient', readonly: true },
        { service: 'ServiceDefaults', method: 'Extensions.AddServiceDefaults()', readonly: true }
      ],
      'ApiService': [
        { service: 'WeatherService', method: 'HttpClient', readonly: true },
        { service: 'ServiceDefaults', method: 'Extensions.AddServiceDefaults()', readonly: true }
      ],
      'WeatherService': [
        { service: 'ServiceDefaults', method: 'Extensions.AddServiceDefaults()', readonly: true }
      ],
      'ServiceDefaults': []
    };

    return {
      service: serviceName,
      dependencies: dependencies[serviceName] || [],
      constraints: this.getConstraints(serviceName)
    };
  }

  /**
   * Get constraints for a service
   */
  getConstraints(serviceName) {
    const constraints = {
      'Web': {
        noHardcodedUrls: true,
        noDependencyOn: ['WeatherService'],
        mustUse: ['WeatherApiClient pattern']
      },
      'ApiService': {
        noHardcodedUrls: true,
        mustUse: ['Resilience from ServiceDefaults', 'Health checks'],
        noDependencyOn: ['Web']
      },
      'WeatherService': {
        noDependencyOn: ['ApiService', 'Web'],
        mustUse: ['ServiceDefaults patterns'],
        independent: true
      },
      'ServiceDefaults': {
        noServiceDependencies: true,
        sharedByAll: true,
        breakingChangesRequireCoordination: true
      }
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
      errors: []
    };

    // Validate based on change type
    switch (changeType) {
      case 'dependency':
        if (constraints.noDependencyOn?.length > 0) {
          validation.warnings.push(
            `Service ${serviceName} has constraints: ${constraints.noDependencyOn.join(', ')}`
          );
        }
        break;

      case 'health-check':
        if (dependencies.dependencies.some(d => d.service === 'ServiceDefaults')) {
          validation.warnings.push(
            'Health check changes may affect dependent services. Coordinate with other agents.'
          );
        }
        break;

      case 'endpoint':
        validation.warnings.push(
          'New endpoint should be documented in integration-points.md'
        );
        break;

      case 'shared':
        if (serviceName === 'ServiceDefaults') {
          validation.errors.push(
            'CRITICAL: Changes to ServiceDefaults affect all services. ' +
            'Coordinate with web-agent, api-agent, and weather-agent.'
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
          from: 'Web',
          to: 'ApiService',
          method: 'WeatherApiClient',
          endpoint: 'GET /weatherforecast',
          contract: 'WeatherForecast[]'
        },
        {
          from: 'ApiService',
          to: 'WeatherService',
          method: 'HttpClient',
          endpoint: 'GET /weatherforecast',
          contract: 'WeatherForecast[]'
        },
        {
          from: 'All',
          to: 'ServiceDefaults',
          method: 'AddServiceDefaults()',
          endpoint: 'GET /health/detailed',
          contract: 'JSON health status'
        }
      ],
      coordinationRules: {
        parallelSafe: [
          'web-agent modifying Web while weather-agent modifies WeatherService',
          'api-agent adding endpoints while weather-agent modifying data'
        ],
        requiresCoordination: [
          'Any change to ServiceDefaults',
          'Adding new service-to-service endpoints',
          'Changing health check formats',
          'Modifying DTO contracts'
        ],
        forbidden: [
          'Multiple agents modifying same file',
          'Different agents changing same interface'
        ]
      }
    };
  }

  /**
   * Main request handler
   */
  handleRequest(request) {
    const { method, params } = request;

    switch (method) {
      case 'get_architecture':
        return this.getServiceArchitecture(params.service, params.detail);
      
      case 'get_dependencies':
        return this.getDependencies(params.service);
      
      case 'validate_change':
        return this.validateChange(params.service, params.filePath, params.changeType);
      
      case 'get_integration_matrix':
        return this.getIntegrationMatrix();
      
      case 'get_coordination_status':
        return this.getCoordinationStatus();
      
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
        { id: 'web-agent', status: 'ready', scope: 'aspire1.Web' },
        { id: 'api-agent', status: 'ready', scope: 'aspire1.ApiService' },
        { id: 'weather-agent', status: 'ready', scope: 'aspire1.WeatherService' },
        { id: 'infra-agent', status: 'ready', scope: 'infra/' }
      ],
      pendingCoordination: [],
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Start server (if needed)
   */
  start() {
    console.log(`Aspire MCP Context Server started in ${this.mode} mode`);
    console.log(`Project root: ${this.projectRoot}`);
  }
}

// Create and start server
const server = new AspireContextServer();
server.start();

// Export for testing
module.exports = AspireContextServer;
