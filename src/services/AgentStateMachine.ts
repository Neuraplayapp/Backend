// Agent State Machine with Redux-like Pattern
import { EventEmitter } from 'events';
import { toolRegistry } from './ToolRegistry';
import { databaseIntegration } from './DatabaseIntegration';

export interface AgentState {
  phase: 'IDLE' | 'PLANNING' | 'EXECUTING' | 'SYNTHESIZING' | 'COMPLETED' | 'ERROR';
  sessionId: string;
  userId?: string;
  goal?: string;
  context: Record<string, any>;
  toolQueue: ToolStep[];
  executedSteps: ExecutedStep[];
  results: Record<string, any>;
  errors: AgentError[];
  metadata: {
    startTime: number;
    lastUpdated: number;
    totalExecutionTime?: number;
  };
}

export interface ToolStep {
  id: string;
  tool: string;
  params: any;
  reason: string;
  dependencies?: string[];
  priority?: number;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
}

export interface ExecutedStep extends ToolStep {
  result?: any;
  error?: string;
  executionTime: number;
  timestamp: number;
}

export interface AgentError {
  type: 'VALIDATION' | 'EXECUTION' | 'TIMEOUT' | 'CIRCUIT_BREAKER' | 'UNKNOWN';
  message: string;
  stepId?: string;
  timestamp: number;
  recoverable: boolean;
}

export interface AgentAction {
  type: 'PLAN_EXECUTION' | 'EXECUTE_STEP' | 'HANDLE_ERROR' | 'UPDATE_CONTEXT' | 
        'ADD_STEP' | 'COMPLETE_EXECUTION' | 'RESET_SESSION';
  payload: any;
}

export class AgentStateMachine extends EventEmitter {
  private state: AgentState;
  private persistenceAdapter?: StatePersistenceAdapter;

  constructor(sessionId: string, persistenceAdapter?: StatePersistenceAdapter) {
    super();
    this.persistenceAdapter = persistenceAdapter;
    this.state = this.createInitialState(sessionId);
  }

  private createInitialState(sessionId: string): AgentState {
    return {
      phase: 'IDLE',
      sessionId,
      context: {},
      toolQueue: [],
      executedSteps: [],
      results: {},
      errors: [],
      metadata: {
        startTime: Date.now(),
        lastUpdated: Date.now()
      }
    };
  }

  async dispatch(action: AgentAction): Promise<AgentState> {
    const previousState = { ...this.state };
    
    try {
      // Apply state transition
      this.state = await this.reduce(this.state, action);
      this.state.metadata.lastUpdated = Date.now();

      // Persist state if adapter available
      if (this.persistenceAdapter) {
        await this.persistenceAdapter.saveState(this.state);
      }

      // Emit state change event
      this.emit('state-change', {
        previous: previousState,
        current: this.state,
        action
      });

      return this.state;

    } catch (error) {
      console.error('❌ State machine error:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Revert to previous state and add error
      this.state = {
        ...previousState,
        errors: [...previousState.errors, {
          type: 'UNKNOWN',
          message: errorMessage,
          timestamp: Date.now(),
          recoverable: false
        }]
      };

      throw error;
    }
  }

  private async reduce(state: AgentState, action: AgentAction): Promise<AgentState> {
    switch (action.type) {
      case 'PLAN_EXECUTION':
        return this.planExecution(state, action.payload);
      
      case 'EXECUTE_STEP':
        return this.executeStep(state, action.payload);
      
      case 'HANDLE_ERROR':
        return this.handleError(state, action.payload);
      
      case 'UPDATE_CONTEXT':
        return {
          ...state,
          context: { ...state.context, ...action.payload.context }
        };
      
      case 'ADD_STEP':
        return {
          ...state,
          toolQueue: [...state.toolQueue, action.payload.step]
        };
      
      case 'COMPLETE_EXECUTION':
        return {
          ...state,
          phase: 'COMPLETED',
          metadata: {
            ...state.metadata,
            totalExecutionTime: Date.now() - state.metadata.startTime
          }
        };
      
      case 'RESET_SESSION':
        return this.createInitialState(state.sessionId);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async planExecution(state: AgentState, payload: {
    goal: string;
    availableTools: string[];
    userContext?: any;
  }): Promise<AgentState> {
    const { goal, availableTools, userContext } = payload;

    // Use AI to create execution plan
    const planningResult = await toolRegistry.execute('llm-completion', {
      prompt: `Return ONLY valid JSON with no explanations or reasoning.\n\n${this.createPlanningPrompt(goal, availableTools, state.context, userContext)}`,
      model: 'accounts/fireworks/models/gpt-oss-120b',
      temperature: 0.0 // CRITICAL: temp 0.0 = no reasoning tokens
    }, {
      sessionId: state.sessionId,
      startTime: Date.now()
    });

    if (!planningResult.success) {
      throw new Error(`Planning failed: ${planningResult.error}`);
    }

    let executionPlan;
    try {
      // 🔧 FIX: Check if data is already parsed object or string
      if (typeof planningResult.data === 'string') {
        executionPlan = JSON.parse(planningResult.data);
      } else if (typeof planningResult.data === 'object' && planningResult.data !== null) {
        executionPlan = planningResult.data;
      } else {
        throw new Error('Invalid data type from LLM result');
      }
      
      console.log('🔍 AgentStateMachine - Parsed execution plan:', executionPlan);
    } catch (error) {
      console.error('🔍 AgentStateMachine - Raw planningResult.data:', planningResult.data);
      console.error('🔍 AgentStateMachine - Type:', typeof planningResult.data);
      throw new Error(`Invalid execution plan format from AI: ${(error as Error).message}`);
    }

    // Validate and enrich plan
    const toolQueue = this.validateAndEnrichPlan(executionPlan, availableTools);

    return {
      ...state,
      phase: 'EXECUTING',
      goal,
      toolQueue,
      context: { ...state.context, ...userContext, executionPlan }
    };
  }

  private async executeStep(state: AgentState, payload: { stepId: string }): Promise<AgentState> {
    const step = state.toolQueue.find(s => s.id === payload.stepId);
    if (!step) {
      throw new Error(`Step ${payload.stepId} not found`);
    }

    if (step.status !== 'pending') {
      return state; // Skip if already processed
    }

    // Check dependencies
    const dependenciesMet = this.checkDependencies(step, state.executedSteps);
    if (!dependenciesMet) {
      return {
        ...state,
        toolQueue: state.toolQueue.map(s => 
          s.id === step.id ? { ...s, status: 'skipped' } : s
        )
      };
    }

    // Mark as executing
    const updatedQueue = state.toolQueue.map(s => 
      s.id === step.id ? { ...s, status: 'executing' as const } : s
    );

    const executingState = { ...state, toolQueue: updatedQueue };

    // Execute the tool
    const startTime = Date.now();
    const toolResult = await toolRegistry.execute(step.tool, step.params, {
      sessionId: state.sessionId,
      startTime
    });

    const executionTime = Date.now() - startTime;
    const executedStep: ExecutedStep = {
      ...step,
      status: toolResult.success ? 'completed' : 'failed',
      result: toolResult.data,
      error: toolResult.error,
      executionTime,
      timestamp: Date.now()
    };

    return {
      ...executingState,
      toolQueue: executingState.toolQueue.map(s => 
        s.id === step.id ? executedStep : s
      ),
      executedSteps: [...state.executedSteps, executedStep],
      results: {
        ...state.results,
        [step.id]: toolResult.data
      }
    };
  }

  private handleError(state: AgentState, payload: {
    error: Error;
    stepId?: string;
    recoverable?: boolean;
  }): AgentState {
    const agentError: AgentError = {
      type: this.classifyError(payload.error),
      message: payload.error.message,
      stepId: payload.stepId,
      timestamp: Date.now(),
      recoverable: payload.recoverable ?? true
    };

    return {
      ...state,
      phase: agentError.recoverable ? state.phase : 'ERROR',
      errors: [...state.errors, agentError]
    };
  }

  private createPlanningPrompt(
    goal: string, 
    availableTools: string[], 
    currentContext: any,
    userContext?: any
  ): string {
    return `
You are an AI agent planning system. Create a step-by-step execution plan to achieve the given goal.

Goal: ${goal}

Available tools: ${availableTools.join(', ')}

Current context: ${JSON.stringify(currentContext, null, 2)}

User context: ${JSON.stringify(userContext || {}, null, 2)}

Create a plan in this exact JSON format:
{
  "steps": [
    {
      "id": "step_1",
      "tool": "tool_name",
      "params": { "param1": "value1" },
      "reason": "Why this step is needed",
      "dependencies": ["step_0"],
      "priority": 1
    }
  ],
  "reasoning": "Overall strategy explanation"
}

Requirements:
- Steps must use only available tools
- Dependencies must reference valid step IDs
- Each step should have a clear reason
- Parameters must match the tool's expected schema
- Priority: 1 (highest) to 5 (lowest)
`;
  }

  private validateAndEnrichPlan(plan: any, availableTools: string[]): ToolStep[] {
    if (!plan.steps || !Array.isArray(plan.steps)) {
      throw new Error('Invalid plan: missing steps array');
    }

    return plan.steps.map((step: any, index: number) => ({
      id: step.id || `step_${index}`,
      tool: step.tool,
      params: step.params || {},
      reason: step.reason || 'No reason provided',
      dependencies: step.dependencies || [],
      priority: step.priority || 3,
      status: 'pending' as const
    })).filter((step: ToolStep) => {
      if (!availableTools.includes(step.tool)) {
        console.warn(`⚠️ Filtering out step with unavailable tool: ${step.tool}`);
        return false;
      }
      return true;
    });
  }

  private checkDependencies(step: ToolStep, executedSteps: ExecutedStep[]): boolean {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }

    return step.dependencies.every(depId => 
      executedSteps.some(executed => 
        executed.id === depId && executed.status === 'completed'
      )
    );
  }

  private classifyError(error: Error): AgentError['type'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation')) return 'VALIDATION';
    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('circuit breaker')) return 'CIRCUIT_BREAKER';
    
    return 'EXECUTION';
  }

  // Public getters
  getState(): AgentState {
    return { ...this.state };
  }

  getPhase(): AgentState['phase'] {
    return this.state.phase;
  }

  getResults(): Record<string, any> {
    return { ...this.state.results };
  }

  getErrors(): AgentError[] {
    return [...this.state.errors];
  }

  // State persistence
  async loadState(sessionId: string): Promise<AgentState | null> {
    if (!this.persistenceAdapter) return null;
    return this.persistenceAdapter.loadState(sessionId);
  }
}

export interface StatePersistenceAdapter {
  saveState(state: AgentState): Promise<void>;
  loadState(sessionId: string): Promise<AgentState | null>;
}
