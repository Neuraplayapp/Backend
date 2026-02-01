// Tool Controller - Tool management and execution
const toolService = require('../services/tool.service');
const { validationResult } = require('express-validator');

class ToolController {
  
  /**
   * GET /api/tools
   * List all available tools
   */
  async listTools(req, res) {
    try {
      const { category, enabled } = req.query;
      
      const tools = await toolService.listTools({
        category,
        enabled: enabled !== undefined ? enabled === 'true' : undefined
      });
      
      res.json({
        success: true,
        data: {
          tools,
          count: tools.length,
          categories: [...new Set(tools.map(t => t.category))]
        },
        metadata: {
          timestamp: new Date().toISOString(),
          filters: { category, enabled }
        }
      });
      
    } catch (error) {
      console.error('❌ List tools error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list tools'
      });
    }
  }

  /**
   * GET /api/tools/:toolName
   * Get tool details
   */
  async getToolDetails(req, res) {
    try {
      const { toolName } = req.params;
      
      const tool = await toolService.getToolDetails(toolName);
      
      if (!tool) {
        return res.status(404).json({
          success: false,
          error: 'Tool not found',
          toolName
        });
      }
      
      res.json({
        success: true,
        data: tool,
        metadata: {
          timestamp: new Date().toISOString(),
          toolName
        }
      });
      
    } catch (error) {
      console.error('❌ Get tool details error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get tool details'
      });
    }
  }

  /**
   * POST /api/tools/execute
   * Execute a single tool
   */
  async executeTool(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { toolName, parameters, sessionId } = req.body;
      const { userId } = req.user;
      
      console.log(`🔧 Executing tool: ${toolName} for user: ${userId}`);
      
      const result = await toolService.executeTool({
        toolName,
        parameters,
        sessionId,
        userId,
        context: req.context || {}
      });
      
      res.json({
        success: true,
        data: {
          toolName,
          result: result.data,
          executionTime: result.metadata.executionTime,
          status: result.success ? 'completed' : 'failed'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionId: result.metadata.executionId,
          sessionId
        }
      });
      
    } catch (error) {
      console.error('❌ Execute tool error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Tool execution failed',
        metadata: {
          toolName: req.body.toolName,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /api/tools/analytics
   * Get tool usage analytics
   */
  async getToolAnalytics(req, res) {
    try {
      const { timeRange = '24h', toolName } = req.query;
      const { userId } = req.user;
      
      const analytics = await toolService.getToolAnalytics({
        userId,
        timeRange,
        toolName
      });
      
      res.json({
        success: true,
        data: analytics,
        metadata: {
          timestamp: new Date().toISOString(),
          timeRange,
          toolName: toolName || 'all'
        }
      });
      
    } catch (error) {
      console.error('❌ Tool analytics error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get tool analytics'
      });
    }
  }

  /**
   * GET /api/tools/performance
   * Get tool performance metrics
   */
  async getToolPerformance(req, res) {
    try {
      const { toolName } = req.query;
      
      const performance = await toolService.getToolPerformance(toolName);
      
      res.json({
        success: true,
        data: performance,
        metadata: {
          timestamp: new Date().toISOString(),
          toolName: toolName || 'all'
        }
      });
      
    } catch (error) {
      console.error('❌ Tool performance error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get tool performance'
      });
    }
  }

  /**
   * POST /api/tools/:toolName/test
   * Test a tool with sample parameters
   */
  async testTool(req, res) {
    try {
      const { toolName } = req.params;
      const { parameters = {} } = req.body;
      
      const testResult = await toolService.testTool(toolName, parameters);
      
      res.json({
        success: true,
        data: {
          toolName,
          testResult,
          status: testResult.success ? 'passed' : 'failed'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'tool_test'
        }
      });
      
    } catch (error) {
      console.error('❌ Tool test error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Tool test failed'
      });
    }
  }

  /**
   * GET /api/tools/health
   * Check health of all tools
   */
  async checkToolsHealth(req, res) {
    try {
      const healthStatus = await toolService.checkAllToolsHealth();
      
      const overallHealthy = healthStatus.every(tool => tool.healthy);
      
      res.status(overallHealthy ? 200 : 503).json({
        success: overallHealthy,
        data: {
          overallStatus: overallHealthy ? 'healthy' : 'degraded',
          tools: healthStatus,
          summary: {
            total: healthStatus.length,
            healthy: healthStatus.filter(t => t.healthy).length,
            unhealthy: healthStatus.filter(t => !t.healthy).length
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'health_check'
        }
      });
      
    } catch (error) {
      console.error('❌ Tools health check error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Health check failed'
      });
    }
  }
}

module.exports = new ToolController();
