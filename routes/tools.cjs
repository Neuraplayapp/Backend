// Tool execution API endpoint for new architecture
const express = require('express');
const router = express.Router();
const { executeServerTool } = require('../services/agent.cjs');

// POST /api/tools/execute - Execute tools through new architecture
router.post('/execute', async (req, res) => {
  console.log('🔧 Tool execution API called:', req.body);
  
  try {
    const { tool, parameters, sessionId, userId } = req.body;
    
    if (!tool || !parameters) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tool, parameters'
      });
    }

    console.log(`🚀 Executing server tool: ${tool}`);
    
    // Route to the existing server-side tool execution
    const result = await executeServerTool(tool, parameters);
    
    console.log(`✅ Tool execution result:`, {
      tool,
      success: result.success,
      hasData: !!result.data,
      hasError: !!result.error
    });

    res.json({
      success: result.success,
      data: result.data,
      error: result.error,
      metadata: {
        tool,
        sessionId,
        executionTime: Date.now() - req.startTime || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Tool execution API error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Tool execution failed',
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Add timestamp middleware
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

module.exports = router;
