// Tool Service - Tool management and execution logic
const dbManager = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ToolService {
  constructor() {
    this.registeredTools = new Map();
    this.toolCategories = ['search', 'generation', 'analysis', 'communication', 'utility'];
    this.loadTools();
  }

  async loadTools() {
    try {
      // Load tool definitions from database cache
      const cachedTools = await dbManager.getToolCache();
      
      // Register built-in tools
      this.registerBuiltInTools();
      
      console.log(`🔧 Loaded ${this.registeredTools.size} tools`);
    } catch (error) {
      console.error('❌ Failed to load tools:', error);
      // Fallback to built-in tools only
      this.registerBuiltInTools();
    }
  }

  registerBuiltInTools() {
    const builtInTools = [
      {
        name: 'web_search',
        category: 'search',
        description: 'Search the web using Serper API',
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 500 }
          },
          required: ['query']
        },
        enabled: true,
        timeout: 10000,
        retryPolicy: { maxRetries: 2, backoff: 'linear' }
      },
      {
        name: 'generate_image',
        category: 'generation',
        description: 'Generate images using Fireworks AI',
        schema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', minLength: 1, maxLength: 1000 },
            style: { type: 'string', enum: ['realistic', 'artistic', 'cartoon'] }
          },
          required: ['prompt']
        },
        enabled: true,
        timeout: 30000,
        retryPolicy: { maxRetries: 1, backoff: 'linear' }
      },
      {
        name: 'llm_completion',
        category: 'generation',
        description: 'Generate text using LLM',
        schema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', minLength: 1, maxLength: 4000 },
            model: { type: 'string', enum: ['accounts/fireworks/models/gpt-oss-120b', 'accounts/fireworks/models/gpt-oss-20b'] },
            temperature: { type: 'number', minimum: 0, maximum: 2 }
          },
          required: ['prompt']
        },
        enabled: true,
        timeout: 45000,
        retryPolicy: { maxRetries: 2, backoff: 'exponential' }
      },
      {
        name: 'create_math_diagram',
        category: 'generation',
        description: 'Create mathematical diagrams and visualizations',
        schema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['equation', 'graph', 'geometry'] },
            content: { type: 'string', minLength: 1 }
          },
          required: ['type', 'content']
        },
        enabled: true,
        timeout: 15000,
        retryPolicy: { maxRetries: 1, backoff: 'linear' }
      },
      {
        name: 'navigate_to_page',
        category: 'utility',
        description: 'Navigate user to a specific page',
        schema: {
          type: 'object',
          properties: {
            page: { type: 'string', minLength: 1 },
            params: { type: 'object' }
          },
          required: ['page']
        },
        enabled: true,
        timeout: 1000,
        clientSide: true
      }
    ];

    builtInTools.forEach(tool => {
      this.registeredTools.set(tool.name, tool);
    });
  }

  async listTools(filters = {}) {
    const tools = Array.from(this.registeredTools.values());
    
    let filtered = tools;
    
    if (filters.category) {
      filtered = filtered.filter(tool => tool.category === filters.category);
    }
    
    if (filters.enabled !== undefined) {
      filtered = filtered.filter(tool => tool.enabled === filters.enabled);
    }
    
    return filtered.map(tool => ({
      name: tool.name,
      category: tool.category,
      description: tool.description,
      enabled: tool.enabled,
      clientSide: tool.clientSide || false,
      schema: tool.schema
    }));
  }

  async getToolDetails(toolName) {
    const tool = this.registeredTools.get(toolName);
    if (!tool) return null;
    
    // Get performance stats from cache
    const performanceData = await dbManager.getToolCache(toolName);
    const performance = performanceData[0] || {
      execution_count: 0,
      success_count: 0,
      failure_count: 0,
      avg_execution_time: 0
    };
    
    return {
      ...tool,
      performance: {
        totalExecutions: performance.execution_count,
        successRate: performance.execution_count > 0 
          ? Math.round((performance.success_count / performance.execution_count) * 100)
          : 0,
        avgExecutionTime: Math.round(performance.avg_execution_time),
        lastExecuted: performance.last_executed
      }
    };
  }

  async executeTool({ toolName, parameters, sessionId, userId, context = {} }) {
    const executionId = uuidv4();
    const startTime = Date.now();
    
    try {
      const tool = this.registeredTools.get(toolName);
      if (!tool) {
        throw new Error(`Tool '${toolName}' not found`);
      }
      
      if (!tool.enabled) {
        throw new Error(`Tool '${toolName}' is currently disabled`);
      }
      
      // Validate parameters against schema
      this.validateParameters(parameters, tool.schema);
      
      // Log execution start
      await dbManager.setWarmData('tool_executions', {
        id: executionId,
        session_id: sessionId,
        tool_name: toolName,
        input_params: parameters,
        output_result: {},
        status: 'pending',
        execution_time: 0,
        timestamp: new Date()
      });
      
      let result;
      
      if (tool.clientSide) {
        // Client-side tools return instructions for frontend
        result = this.executeClientSideTool(tool, parameters, context);
      } else {
        // Execute server-side tool
        result = await this.executeServerSideTool(tool, parameters, context);
      }
      
      const executionTime = Date.now() - startTime;
      
      // Log successful execution
      await dbManager.setWarmData('tool_executions', {
        id: executionId,
        session_id: sessionId,
        tool_name: toolName,
        input_params: parameters,
        output_result: result,
        status: 'success',
        execution_time: executionTime,
        timestamp: new Date()
      });
      
      // Update tool performance cache
      await this.updateToolPerformance(toolName, true, executionTime);
      
      return {
        success: true,
        data: result,
        metadata: {
          executionId,
          executionTime,
          toolName,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Log failed execution
      await dbManager.setWarmData('tool_executions', {
        id: executionId,
        session_id: sessionId,
        tool_name: toolName,
        input_params: parameters,
        output_result: {},
        status: 'failure',
        execution_time: executionTime,
        error_details: { message: error.message },
        timestamp: new Date()
      });
      
      // Update tool performance cache
      await this.updateToolPerformance(toolName, false, executionTime);
      
      throw error;
    }
  }

  executeClientSideTool(tool, parameters, context) {
    // Return instructions for client-side execution
    switch (tool.name) {
      case 'navigate_to_page':
        return {
          action: 'navigate',
          page: parameters.page,
          params: parameters.params || {}
        };
      
      default:
        return {
          action: 'client_execute',
          tool: tool.name,
          parameters
        };
    }
  }

  async executeServerSideTool(tool, parameters, context) {
    // Route to appropriate server-side tool implementation
    switch (tool.name) {
      case 'web_search':
        return await this.executeWebSearch(parameters);
      
      case 'generate_image':
        return await this.executeImageGeneration(parameters);
      
      case 'llm_completion':
        return await this.executeLLMCompletion(parameters);
      
      case 'create_math_diagram':
        return await this.executeMathDiagram(parameters);
      
      default:
        throw new Error(`Server-side execution not implemented for tool: ${tool.name}`);
    }
  }

  async executeWebSearch(parameters) {
    // This would integrate with your existing web search implementation
    const { performWebSearch } = require('../../services/agent.cjs');
    return await performWebSearch(parameters);
  }

  async executeImageGeneration(parameters) {
    // This would integrate with your existing image generation
    const { handleImageGenerationTool } = require('../../services/agent.cjs');
    return await handleImageGenerationTool(parameters);
  }

  async executeLLMCompletion(parameters) {
    // This would integrate with your existing LLM service
    return {
      text: `LLM completion for: ${parameters.prompt}`,
      model: parameters.model || 'gpt-oss-120b',
      timestamp: new Date().toISOString()
    };
  }

  async executeMathDiagram(parameters) {
    // This would integrate with your existing math diagram service
    const { createMathDiagram } = require('../../services/agent.cjs');
    return await createMathDiagram(parameters);
  }

  async getToolAnalytics({ userId, timeRange, toolName }) {
    try {
      const timeRangeMs = this.parseTimeRange(timeRange);
      const cutoffDate = new Date(Date.now() - timeRangeMs);
      
      let filters = {
        timestamp: `>=${cutoffDate.toISOString()}`
      };
      
      if (toolName) {
        filters.tool_name = toolName;
      }
      
      // Get user's sessions first
      const userSessions = await dbManager.getWarmData('agent_sessions', { 
        user_id: userId 
      });
      const sessionIds = userSessions.map(s => s.id);
      
      // Get tool executions for user's sessions
      const executions = await dbManager.getWarmData('tool_executions', {
        session_id: sessionIds
      });
      
      const recentExecutions = executions.filter(e => 
        new Date(e.timestamp) >= cutoffDate
      );
      
      return {
        timeRange,
        period: {
          start: cutoffDate.toISOString(),
          end: new Date().toISOString()
        },
        summary: {
          totalExecutions: recentExecutions.length,
          successfulExecutions: recentExecutions.filter(e => e.status === 'success').length,
          failedExecutions: recentExecutions.filter(e => e.status === 'failure').length,
          avgExecutionTime: this.calculateAvgExecutionTime(recentExecutions),
          successRate: this.calculateSuccessRate(recentExecutions)
        },
        breakdown: {
          byTool: this.groupExecutionsByTool(recentExecutions),
          byDay: this.groupExecutionsByDay(recentExecutions),
          byStatus: this.groupExecutionsByStatus(recentExecutions)
        }
      };
      
    } catch (error) {
      console.error('❌ Tool analytics error:', error);
      throw error;
    }
  }

  async getToolPerformance(toolName) {
    try {
      const performanceData = toolName 
        ? await dbManager.getToolCache(toolName)
        : await dbManager.getToolCache();
      
      return performanceData.map(data => ({
        toolName: data.tool_name,
        metrics: {
          totalExecutions: data.execution_count,
          successRate: data.execution_count > 0 
            ? Math.round((data.success_count / data.execution_count) * 100)
            : 0,
          avgExecutionTime: Math.round(data.avg_execution_time),
          lastExecuted: data.last_executed,
          reliability: this.calculateReliabilityScore(data)
        }
      }));
      
    } catch (error) {
      console.error('❌ Tool performance error:', error);
      throw error;
    }
  }

  async testTool(toolName, parameters) {
    try {
      const tool = this.registeredTools.get(toolName);
      if (!tool) {
        throw new Error(`Tool '${toolName}' not found`);
      }
      
      // Use test parameters if none provided
      const testParams = parameters || this.getTestParameters(tool);
      
      // Validate parameters
      this.validateParameters(testParams, tool.schema);
      
      // Execute with test context
      const result = await this.executeTool({
        toolName,
        parameters: testParams,
        sessionId: 'test-session',
        userId: 'test-user',
        context: { test: true }
      });
      
      return {
        success: true,
        result: result.data,
        executionTime: result.metadata.executionTime,
        testParameters: testParams
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        testParameters: parameters
      };
    }
  }

  async checkAllToolsHealth() {
    const tools = Array.from(this.registeredTools.values());
    const healthResults = [];
    
    for (const tool of tools) {
      try {
        const healthResult = await this.checkToolHealth(tool);
        healthResults.push(healthResult);
      } catch (error) {
        healthResults.push({
          toolName: tool.name,
          healthy: false,
          error: error.message,
          lastChecked: new Date().toISOString()
        });
      }
    }
    
    return healthResults;
  }

  async checkToolHealth(tool) {
    // Basic health check - try to execute with test parameters
    const testResult = await this.testTool(tool.name, this.getTestParameters(tool));
    
    return {
      toolName: tool.name,
      healthy: testResult.success,
      responseTime: testResult.executionTime,
      error: testResult.error,
      lastChecked: new Date().toISOString()
    };
  }

  // Helper methods
  validateParameters(parameters, schema) {
    // Basic JSON schema validation
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in parameters)) {
          throw new Error(`Required parameter '${field}' is missing`);
        }
      }
    }
    
    // Additional validation logic would go here
  }

  getTestParameters(tool) {
    const testParams = {
      'web_search': { query: 'test search' },
      'generate_image': { prompt: 'a simple test image' },
      'llm_completion': { prompt: 'Hello, this is a test.' },
      'create_math_diagram': { type: 'equation', content: 'x = 1' },
      'navigate_to_page': { page: '/test' }
    };
    
    return testParams[tool.name] || {};
  }

  async updateToolPerformance(toolName, success, executionTime) {
    try {
      const existing = await dbManager.getToolCache(toolName);
      const current = existing[0] || {
        tool_name: toolName,
        execution_count: 0,
        success_count: 0,
        failure_count: 0,
        avg_execution_time: 0,
        last_executed: new Date(),
        cache_data: {}
      };

      current.execution_count++;
      if (success) {
        current.success_count++;
      } else {
        current.failure_count++;
      }
      
      // Update rolling average
      current.avg_execution_time = 
        ((current.avg_execution_time * (current.execution_count - 1)) + executionTime) / 
        current.execution_count;
      
      current.last_executed = new Date();

      await dbManager.updateToolCache(current);
    } catch (error) {
      console.error('❌ Failed to update tool performance:', error);
    }
  }

  parseTimeRange(timeRange) {
    const units = {
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000,
      'm': 30 * 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([hdwm])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 24h
    
    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  calculateAvgExecutionTime(executions) {
    if (executions.length === 0) return 0;
    const total = executions.reduce((sum, e) => sum + (e.execution_time || 0), 0);
    return Math.round(total / executions.length);
  }

  calculateSuccessRate(executions) {
    if (executions.length === 0) return 0;
    const successful = executions.filter(e => e.status === 'success').length;
    return Math.round((successful / executions.length) * 100);
  }

  calculateReliabilityScore(data) {
    const successRate = data.execution_count > 0 
      ? data.success_count / data.execution_count 
      : 0;
    const consistencyScore = data.avg_execution_time < 30000 ? 1 : 0.5; // Fast tools are more reliable
    return Math.round((successRate * 0.8 + consistencyScore * 0.2) * 100);
  }

  groupExecutionsByTool(executions) {
    return executions.reduce((acc, e) => {
      acc[e.tool_name] = (acc[e.tool_name] || 0) + 1;
      return acc;
    }, {});
  }

  groupExecutionsByDay(executions) {
    return executions.reduce((acc, e) => {
      const day = new Date(e.timestamp).toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});
  }

  groupExecutionsByStatus(executions) {
    return executions.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = new ToolService();
