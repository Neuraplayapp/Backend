// Agent Controller - Request handlers for AI Agent operations
const agentService = require('../services/agent.service');
const { validationResult } = require('express-validator');

class AgentController {
  
  /**
   * POST /api/agent/session
   * Create a new agent session
   */
  async createSession(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { userId, initialContext = {} } = req.body;
      
      console.log('🚀 Creating agent session for user:', userId);
      
      const session = await agentService.createSession(userId, initialContext);
      
      res.status(201).json({
        success: true,
        data: {
          sessionId: session.id,
          state: session.state,
          createdAt: session.created_at,
          expiresAt: session.expires_at
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'session_created'
        }
      });

    } catch (error) {
      console.error('❌ Create session error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create session',
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'session_create_failed'
        }
      });
    }
  }

  /**
   * GET /api/agent/session/:sessionId
   * Get session details
   */
  async getSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = await agentService.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
          metadata: {
            sessionId,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          state: session.state,
          phase: session.phase,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
          stateHistory: session.state_history || []
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'session_retrieved'
        }
      });

    } catch (error) {
      console.error('❌ Get session error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get session',
        metadata: {
          sessionId: req.params.sessionId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * POST /api/agent/execute
   * Execute a goal using the agent
   */
  async executeGoal(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { sessionId, goal, constraints = {} } = req.body;
      
      console.log(`🎯 Executing goal for session ${sessionId}: ${goal}`);
      
      // Set timeout for long-running operations
      const timeoutMs = constraints.timeoutMs || 120000; // 2 minutes default
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Goal execution timeout')), timeoutMs);
      });

      const executionPromise = agentService.executeGoal(sessionId, goal);
      
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      res.json({
        success: true,
        data: {
          sessionId,
          goal,
          results: result.results,
          synthesis: result.synthesis,
          plan: result.plan
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'goal_executed',
          constraints
        }
      });

    } catch (error) {
      console.error('❌ Execute goal error:', error);
      
      const statusCode = error.message.includes('timeout') ? 408 : 
                         error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to execute goal',
        metadata: {
          sessionId: req.body.sessionId,
          goal: req.body.goal,
          timestamp: new Date().toISOString(),
          action: 'goal_execution_failed'
        }
      });
    }
  }

  /**
   * POST /api/agent/plan
   * Create execution plan without executing
   */
  async planExecution(req, res) {
    try {
      const { sessionId, goal } = req.body;
      
      console.log(`📋 Planning execution for session ${sessionId}: ${goal}`);
      
      const plan = await agentService.planExecution(sessionId, goal);
      
      res.json({
        success: true,
        data: {
          sessionId,
          goal,
          plan,
          estimatedDuration: plan.estimatedDuration,
          complexity: plan.complexity
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'execution_planned'
        }
      });

    } catch (error) {
      console.error('❌ Plan execution error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create execution plan',
        metadata: {
          sessionId: req.body.sessionId,
          goal: req.body.goal,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * POST /api/agent/step
   * Execute a single step
   */
  async executeStep(req, res) {
    try {
      const { sessionId, stepIndex } = req.body;
      
      console.log(`🔧 Executing step ${stepIndex} for session ${sessionId}`);
      
      const result = await agentService.executeStep(sessionId, stepIndex);
      
      res.json({
        success: true,
        data: {
          sessionId,
          stepIndex,
          result
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'step_executed'
        }
      });

    } catch (error) {
      console.error('❌ Execute step error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to execute step',
        metadata: {
          sessionId: req.body.sessionId,
          stepIndex: req.body.stepIndex,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /api/agent/analytics/:sessionId
   * Get session analytics
   */
  async getAnalytics(req, res) {
    try {
      const { sessionId } = req.params;
      
      const analytics = await agentService.getSessionAnalytics(sessionId);
      
      res.json({
        success: true,
        data: analytics,
        metadata: {
          sessionId,
          timestamp: new Date().toISOString(),
          action: 'analytics_retrieved'
        }
      });

    } catch (error) {
      console.error('❌ Get analytics error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get analytics',
        metadata: {
          sessionId: req.params.sessionId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * POST /api/agent/context
   * Save context for a session
   */
  async saveContext(req, res) {
    try {
      const { sessionId, contextType, key, value, tags = [] } = req.body;
      
      const context = await agentService.saveContext(sessionId, contextType, key, value, tags);
      
      res.status(201).json({
        success: true,
        data: {
          contextId: context.id,
          sessionId,
          contextType,
          key,
          createdAt: context.created_at
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'context_saved'
        }
      });

    } catch (error) {
      console.error('❌ Save context error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to save context',
        metadata: {
          sessionId: req.body.sessionId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /api/agent/context/:sessionId
   * Get context for a session
   */
  async getContext(req, res) {
    try {
      const { sessionId } = req.params;
      const { contextType, key } = req.query;
      
      const contexts = await agentService.getContext(sessionId, contextType, key);
      
      res.json({
        success: true,
        data: {
          sessionId,
          contexts,
          count: contexts.length
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'context_retrieved',
          filters: { contextType, key }
        }
      });

    } catch (error) {
      console.error('❌ Get context error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get context',
        metadata: {
          sessionId: req.params.sessionId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * DELETE /api/agent/session/:sessionId
   * Close/delete a session
   */
  async closeSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      // Update session to closed state
      const session = await agentService.getSession(sessionId);
      if (session) {
        await agentService.updateSessionState(sessionId, {
          ...session.state,
          phase: 'CLOSED',
          closedAt: new Date()
        });
      }
      
      res.json({
        success: true,
        data: {
          sessionId,
          status: 'closed'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'session_closed'
        }
      });

    } catch (error) {
      console.error('❌ Close session error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to close session',
        metadata: {
          sessionId: req.params.sessionId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /api/agent/health
   * Health check for agent system
   */
  async healthCheck(req, res) {
    try {
      const dbManager = require('../config/database');
      const health = await dbManager.healthCheck();
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          layers: health,
          activeSessions: agentService.activeSessions.size,
          uptime: process.uptime()
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'health_check'
        }
      });

    } catch (error) {
      console.error('❌ Health check error:', error);
      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        details: error.message,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * POST /api/agent/memory
   * Handle memory operations (store, retrieve, search)
   */
  async handleMemory(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { action, userId, key, value, query } = req.body;
      console.log('🧠 Memory operation:', { action, userId, key: key?.substring(0, 20), query });
      
      const dbManager = require('../config/database');
      
      if (!dbManager || !dbManager.postgres) {
        console.log('⚠️ Database not available');
        return res.json({ success: false, error: 'Database not available' });
      }
      
      const db = dbManager.postgres;
      
      switch (action) {
        case 'store':
          if (!key || !value) {
            return res.status(400).json({ 
              success: false, 
              error: 'Key and value required for storing memory' 
            });
          }
          
          await db.query(`
            INSERT INTO user_memories (user_id, memory_key, memory_value, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            ON CONFLICT (user_id, memory_key) 
            DO UPDATE SET memory_value = $3, updated_at = NOW()
          `, [userId, key, value]);
          
          console.log('✅ Memory stored:', { userId, key });
          return res.json({ 
            success: true, 
            message: `I'll remember that: ${value}`,
            stored: { key, value }
          });
          
        case 'search':
        case 'retrieve':
          let whereClause = 'WHERE user_id = $1';
          let params = [userId];
          
          if (action === 'retrieve' && key) {
            whereClause += ' AND memory_key = $2';
            params.push(key);
          } else if (action === 'search' && query) {
            whereClause += ' AND (memory_key ILIKE $2 OR memory_value ILIKE $2)';
            params.push(`%${query}%`);
          }
          
          const result = await db.query(`
            SELECT memory_key, memory_value, created_at, updated_at 
            FROM user_memories 
            ${whereClause}
            ORDER BY updated_at DESC
            LIMIT 10
          `, params);
          
          const memories = result.rows.map(row => ({
            key: row.memory_key,
            content: row.memory_value,
            timestamp: row.created_at,
            updated: row.updated_at
          }));
          
          console.log('🔍 Memory search result:', { userId, query, count: memories.length });
          
          if (memories.length > 0) {
            return res.json({
              success: true,
              memories,
              count: memories.length,
              message: `Found ${memories.length} memories: ${memories.map(m => m.content).join(', ')}`
            });
          } else {
            return res.json({
              success: true,
              memories: [],
              count: 0,
              message: query ? `No memories found for "${query}"` : 'No memories found'
            });
          }
          
        default:
          return res.status(400).json({ success: false, error: 'Invalid action' });
      }
      
    } catch (error) {
      console.error('❌ Memory operation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/agent/memory/init
   * Initialize memory table in database
   */
  async initializeMemoryTable(req, res) {
    try {
      const dbManager = require('../config/database');
      
      if (!dbManager || !dbManager.postgres) {
        return res.json({ success: false, error: 'Database not available' });
      }
      
      await dbManager.postgres.query(`
        CREATE TABLE IF NOT EXISTS user_memories (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          memory_key VARCHAR(255) NOT NULL,
          memory_value TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, memory_key)
        )
      `);
      
      console.log('✅ Memory table initialized');
      res.json({ success: true, message: 'Memory table initialized' });
    } catch (error) {
      console.error('❌ Memory table initialization error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new AgentController();
