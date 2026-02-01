// Agent Service - Business Logic for AI Agent Operations
const dbManager = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AgentService {
  constructor() {
    this.activeSessions = new Map(); // In-memory session tracking
  }

  /**
   * Data Flow Pattern Implementation:
   * 1. Session Start → Load Context → Plan Execution → Execute Steps → Store Results → Update Context
   */
  
  // Session Management (Hot/Warm Pattern)
  async createSession(userId, initialContext = {}) {
    const sessionId = uuidv4();
    const sessionData = {
      id: sessionId,
      user_id: userId,
      state: {
        phase: 'IDLE',
        sessionId,
        userId,
        context: initialContext,
        toolQueue: [],
        results: {},
        errors: []
      },
      context: initialContext,
      state_history: [],
      phase: 'IDLE',
      created_at: new Date(),
      updated_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    // Save to warm layer (PostgreSQL)
    await dbManager.saveSession(sessionData);
    
    // Track in hot memory
    this.activeSessions.set(sessionId, {
      ...sessionData,
      lastActivity: Date.now()
    });

    console.log('🚀 Created agent session:', sessionId);
    return sessionData;
  }

  async getSession(sessionId) {
    // 1. Check hot memory first
    if (this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      session.lastActivity = Date.now();
      return session;
    }

    // 2. Try database layers
    const session = await dbManager.getSession(sessionId);
    if (session) {
      // Add to hot memory
      this.activeSessions.set(sessionId, {
        ...session,
        lastActivity: Date.now()
      });
    }

    return session;
  }

  async updateSessionState(sessionId, newState) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Update state
    session.state = newState;
    session.phase = newState.phase;
    session.updated_at = new Date();
    
    // Add to state history
    if (!session.state_history) session.state_history = [];
    session.state_history.push({
      timestamp: new Date(),
      phase: newState.phase,
      snapshot: { ...newState }
    });

    // Keep only last 50 state changes
    if (session.state_history.length > 50) {
      session.state_history = session.state_history.slice(-50);
    }

    // Save to database (warm layer)
    await dbManager.saveSession(session);
    
    // Update hot memory
    this.activeSessions.set(sessionId, session);

    return session;
  }

  // Execution Flow Implementation
  async planExecution(sessionId, goal) {
    console.log(`📋 Planning execution for goal: ${goal}`);
    
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Update to planning phase
    await this.updateSessionState(sessionId, {
      ...session.state,
      phase: 'PLANNING',
      currentGoal: goal,
      planningStartTime: Date.now()
    });

    // Get relevant context from semantic search
    const relevantContext = await dbManager.semanticSearch(goal, 'context_store', 5);
    
    // This would call LLM to create execution plan
    const executionPlan = await this.generateExecutionPlan(goal, relevantContext, session.context);
    
    // Update session with plan
    await this.updateSessionState(sessionId, {
      ...session.state,
      phase: 'EXECUTING',
      executionPlan,
      toolQueue: executionPlan.steps || [],
      planningTime: Date.now() - session.state.planningStartTime
    });

    return executionPlan;
  }

  async executeStep(sessionId, stepIndex) {
    const session = await this.getSession(sessionId);
    if (!session || !session.state.toolQueue) {
      throw new Error('No execution plan found');
    }

    const step = session.state.toolQueue[stepIndex];
    if (!step) {
      throw new Error(`Step ${stepIndex} not found`);
    }

    const executionId = uuidv4();
    const startTime = Date.now();

    try {
      console.log(`🔧 Executing step ${stepIndex}: ${step.tool}`);
      
      // Save execution start to database
      await this.logToolExecution({
        id: executionId,
        sessionId,
        toolName: step.tool,
        inputParams: step.params,
        status: 'pending',
        executionTime: 0
      });

      // Execute the tool (this would call the actual tool)
      const result = await this.callTool(step.tool, step.params, session.context);
      
      const executionTime = Date.now() - startTime;

      // Log successful execution
      await this.logToolExecution({
        id: executionId,
        sessionId,
        toolName: step.tool,
        inputParams: step.params,
        outputResult: result,
        status: 'success',
        executionTime
      });

      // Update session results
      const updatedState = { ...session.state };
      if (!updatedState.results) updatedState.results = {};
      updatedState.results[`step_${stepIndex}`] = {
        tool: step.tool,
        result,
        executionTime,
        timestamp: new Date()
      };

      await this.updateSessionState(sessionId, updatedState);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Log failed execution
      await this.logToolExecution({
        id: executionId,
        sessionId,
        toolName: step.tool,
        inputParams: step.params,
        status: 'failure',
        executionTime,
        errorDetails: { message: error.message, stack: error.stack }
      });

      throw error;
    }
  }

  async executeGoal(sessionId, goal) {
    try {
      // 1. Plan execution
      const plan = await this.planExecution(sessionId, goal);
      
      // 2. Execute steps
      const results = {};
      for (let i = 0; i < plan.steps.length; i++) {
        results[`step_${i}`] = await this.executeStep(sessionId, i);
      }

      // 3. Synthesize results
      const synthesis = await this.synthesizeResults(sessionId, results, goal);

      // 4. Update to completed state
      await this.updateSessionState(sessionId, {
        ...await this.getSession(sessionId).then(s => s.state),
        phase: 'COMPLETED',
        finalResults: results,
        synthesis,
        completedAt: new Date()
      });

      return {
        success: true,
        results,
        synthesis,
        plan
      };

    } catch (error) {
      // Update to error state
      await this.updateSessionState(sessionId, {
        ...await this.getSession(sessionId).then(s => s.state),
        phase: 'ERROR',
        error: {
          message: error.message,
          timestamp: new Date()
        }
      });

      throw error;
    }
  }

  // Context Management (Layered Storage)
  async saveContext(sessionId, contextType, key, value, tags = []) {
    const contextId = uuidv4();
    const contextData = {
      id: contextId,
      session_id: sessionId,
      context_type: contextType, // 'short-term', 'working', 'long-term', 'semantic'
      context_key: key,
      context_value: value,
      tags,
      created_at: new Date(),
      updated_at: new Date(),
      expires_at: this.getExpirationDate(contextType)
    };

    // Save to warm layer
    await dbManager.setWarmData('context_store', contextData);

    // Cache frequently accessed context in hot layer
    if (contextType === 'short-term' || contextType === 'working') {
      await dbManager.setHotData(`context:${sessionId}:${key}`, value, 300);
    }

    return contextData;
  }

  async getContext(sessionId, contextType = null, key = null) {
    // Try hot layer first for short-term context
    if (key && (contextType === 'short-term' || contextType === 'working')) {
      const hotValue = await dbManager.getHotData(`context:${sessionId}:${key}`);
      if (hotValue) return [{ context_value: hotValue }];
    }

    // Query warm layer
    const filters = { session_id: sessionId };
    if (contextType) filters.context_type = contextType;
    if (key) filters.context_key = key;

    return await dbManager.getWarmData('context_store', filters);
  }

  // Tool execution logging
  async logToolExecution(executionData) {
    await dbManager.setWarmData('tool_executions', {
      ...executionData,
      timestamp: new Date()
    });
  }

  // Analytics and monitoring
  async getSessionAnalytics(sessionId) {
    const session = await this.getSession(sessionId);
    const executions = await dbManager.getWarmData('tool_executions', { session_id: sessionId });
    
    return {
      session: {
        id: sessionId,
        phase: session?.state?.phase,
        duration: session ? Date.now() - new Date(session.created_at).getTime() : 0,
        stateChanges: session?.state_history?.length || 0
      },
      executions: {
        total: executions.length,
        successful: executions.filter(e => e.status === 'success').length,
        failed: executions.filter(e => e.status === 'failure').length,
        avgExecutionTime: executions.reduce((sum, e) => sum + (e.execution_time || 0), 0) / executions.length || 0
      },
      tools: executions.reduce((acc, e) => {
        acc[e.tool_name] = (acc[e.tool_name] || 0) + 1;
        return acc;
      }, {})
    };
  }

  // Cleanup and maintenance
  async cleanupExpiredSessions() {
    // Clean hot memory (remove inactive sessions)
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > inactiveThreshold) {
        this.activeSessions.delete(sessionId);
      }
    }

    // Database cleanup would be handled by a separate maintenance job
    console.log(`🧹 Cleaned up inactive sessions from memory`);
  }

  // Helper methods
  getExpirationDate(contextType) {
    const now = new Date();
    switch (contextType) {
      case 'short-term': return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
      case 'working': return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
      case 'long-term': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      case 'semantic': return null; // No expiration
      default: return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
    }
  }

  async generateExecutionPlan(goal, context, sessionContext) {
    // This would call your LLM service to generate a plan
    // For now, return a mock plan
    return {
      goal,
      steps: [
        { tool: 'web_search', params: { query: goal } },
        { tool: 'llm_completion', params: { prompt: `Analyze: ${goal}` } }
      ],
      estimatedDuration: 30000,
      complexity: 'medium'
    };
  }

  async callTool(toolName, params, context) {
    // This would integrate with your actual tool execution system
    // For now, return mock result
    return {
      tool: toolName,
      success: true,
      data: `Mock result for ${toolName}`,
      timestamp: new Date()
    };
  }

  async synthesizeResults(sessionId, results, originalGoal) {
    // This would use LLM to synthesize results into a coherent response
    return `Synthesized response for goal: ${originalGoal}`;
  }
}

module.exports = new AgentService();
