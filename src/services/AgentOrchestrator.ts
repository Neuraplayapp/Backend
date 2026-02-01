// Agent Orchestrator - Main execution engine
import { AgentStateMachine, AgentState, ToolStep, ExecutedStep } from './AgentStateMachine';
import { ToolRegistry, toolRegistry } from './ToolRegistry';
import { ContextManager } from './ContextManager';

export interface ExecutionRequest {
  goal: string;
  sessionId: string;
  userId?: string;
  userContext?: any;
  constraints?: {
    maxSteps?: number;
    timeoutMs?: number;
    allowedTools?: string[];
  };
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  synthesis?: string;
  executedSteps: ExecutedStep[];
  errors: any[];
  metadata: {
    totalTime: number;
    stepsExecuted: number;
    stepsSkipped: number;
    stepsFailed: number;
  };
}

export class AgentOrchestrator {
  private stateMachine: AgentStateMachine;
  private contextManager: ContextManager;
  private activeSessions = new Map<string, AgentStateMachine>();

  constructor(
    private toolRegistry: ToolRegistry,
    private contextManager: ContextManager
  ) {}

  async executeGoal(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Get or create session
      const stateMachine = await this.getOrCreateSession(request.sessionId);
      
      // Phase 1: Planning
      console.log('🎯 Phase 1: Planning execution...');
      await stateMachine.dispatch({
        type: 'PLAN_EXECUTION',
        payload: {
          goal: request.goal,
          availableTools: this.getAvailableTools(request.constraints?.allowedTools),
          userContext: request.userContext
        }
      });

      const state = stateMachine.getState();
      const dependencyGraph = this.buildDependencyGraph(state.toolQueue);
      
      // Phase 2: Execution with dependency resolution
      console.log('⚙️ Phase 2: Executing plan...');
      const executionBatches = this.topologicalSort(dependencyGraph);
      
      for (const batch of executionBatches) {
        await this.executeBatch(batch, stateMachine, request.constraints);
      }

      // Phase 3: Synthesis
      console.log('🔮 Phase 3: Synthesizing results...');
      const synthesis = await this.synthesizeResults(stateMachine.getState(), request.goal);

      await stateMachine.dispatch({ type: 'COMPLETE_EXECUTION', payload: {} });

      const finalState = stateMachine.getState();
      const totalTime = Date.now() - startTime;

      return {
        success: true,
        result: finalState.results,
        synthesis,
        executedSteps: finalState.executedSteps,
        errors: finalState.errors,
        metadata: {
          totalTime,
          stepsExecuted: finalState.executedSteps.filter(s => s.status === 'completed').length,
          stepsSkipped: finalState.executedSteps.filter(s => s.status === 'skipped').length,
          stepsFailed: finalState.executedSteps.filter(s => s.status === 'failed').length
        }
      };

    } catch (error) {
      console.error('❌ Orchestration failed:', error);
      
      const stateMachine = this.activeSessions.get(request.sessionId);
      const state = stateMachine?.getState();
      
      return {
        success: false,
        result: undefined,
        executedSteps: state?.executedSteps || [],
        errors: state?.errors || [{ message: error.message, timestamp: Date.now() }],
        metadata: {
          totalTime: Date.now() - startTime,
          stepsExecuted: 0,
          stepsSkipped: 0,
          stepsFailed: 1
        }
      };
    }
  }

  private async getOrCreateSession(sessionId: string): Promise<AgentStateMachine> {
    if (this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!;
    }

    const stateMachine = new AgentStateMachine(sessionId);
    
    // Set up event handlers
    stateMachine.on('state-change', (event) => {
      console.log(`🔄 State change in session ${sessionId}: ${event.previous.phase} → ${event.current.phase}`);
    });

    this.activeSessions.set(sessionId, stateMachine);
    return stateMachine;
  }

  private getAvailableTools(allowedTools?: string[]): string[] {
    const allTools = this.toolRegistry.listTools();
    
    if (allowedTools) {
      return allTools.filter(tool => allowedTools.includes(tool));
    }
    
    return allTools;
  }

  private buildDependencyGraph(steps: ToolStep[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    for (const step of steps) {
      graph.set(step.id, step.dependencies || []);
    }
    
    return graph;
  }

  private topologicalSort(graph: Map<string, string[]>): string[][] {
    const batches: string[][] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();
    
    // Calculate in-degrees
    for (const [node, deps] of graph) {
      if (!inDegree.has(node)) inDegree.set(node, 0);
      
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0));
        inDegree.set(node, inDegree.get(node)! + 1);
      }
    }
    
    // Process nodes with no dependencies first
    while (visited.size < graph.size) {
      const currentBatch: string[] = [];
      
      for (const [node, degree] of inDegree) {
        if (degree === 0 && !visited.has(node)) {
          currentBatch.push(node);
        }
      }
      
      if (currentBatch.length === 0) {
        // Circular dependency detected - break it by taking any unvisited node
        const remaining = Array.from(graph.keys()).filter(n => !visited.has(n));
        if (remaining.length > 0) {
          currentBatch.push(remaining[0]);
          console.warn('⚠️ Circular dependency detected, breaking with:', remaining[0]);
        }
      }
      
      // Mark batch as visited and update in-degrees
      for (const node of currentBatch) {
        visited.add(node);
        inDegree.set(node, -1); // Mark as processed
        
        // Reduce in-degree for dependent nodes
        for (const [otherNode, deps] of graph) {
          if (deps.includes(node)) {
            inDegree.set(otherNode, inDegree.get(otherNode)! - 1);
          }
        }
      }
      
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }
    }
    
    return batches;
  }

  private async executeBatch(
    batch: string[], 
    stateMachine: AgentStateMachine,
    constraints?: ExecutionRequest['constraints']
  ): Promise<void> {
    console.log(`📦 Executing batch: ${batch.join(', ')}`);
    
    const promises = batch.map(stepId => 
      this.executeStepWithTimeout(stepId, stateMachine, constraints?.timeoutMs)
    );
    
    await Promise.allSettled(promises);
  }

  private async executeStepWithTimeout(
    stepId: string,
    stateMachine: AgentStateMachine,
    timeoutMs?: number
  ): Promise<void> {
    const timeout = timeoutMs || 60000; // Default 1 minute
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Step ${stepId} timed out`)), timeout);
    });
    
    const executionPromise = stateMachine.dispatch({
      type: 'EXECUTE_STEP',
      payload: { stepId }
    });
    
    try {
      await Promise.race([executionPromise, timeoutPromise]);
    } catch (error) {
      console.error(`❌ Step ${stepId} failed:`, error);
      await stateMachine.dispatch({
        type: 'HANDLE_ERROR',
        payload: {
          error: error as Error,
          stepId,
          recoverable: true
        }
      });
    }
  }

  private async synthesizeResults(state: AgentState, goal: string): Promise<string> {
    const resultsData = state.results;
    const executedSteps = state.executedSteps;
    
    const synthesisPrompt = `
You are a results synthesizer. Analyze the execution results and provide a comprehensive summary.

Original Goal: ${goal}

Executed Steps:
${executedSteps.map(step => `
- ${step.tool}: ${step.reason}
  Status: ${step.status}
  ${step.result ? `Result: ${JSON.stringify(step.result, null, 2)}` : ''}
  ${step.error ? `Error: ${step.error}` : ''}
`).join('\n')}

Results Data:
${JSON.stringify(resultsData, null, 2)}

Provide a clear, concise summary of:
1. What was accomplished
2. Key insights or findings
3. Any issues encountered
4. Recommendations for next steps

Format as a human-readable summary, not JSON.
`;

    try {
      const synthesisResult = await this.toolRegistry.execute('llm-completion', {
        prompt: synthesisPrompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.5
      }, {
        sessionId: state.sessionId,
        startTime: Date.now()
      });

      return synthesisResult.success ? synthesisResult.data : 'Synthesis failed';
    } catch (error) {
      console.error('❌ Synthesis failed:', error);
      return `Goal: ${goal}\n\nResults: ${JSON.stringify(resultsData, null, 2)}`;
    }
  }

  // Session management
  async closeSession(sessionId: string): Promise<void> {
    const stateMachine = this.activeSessions.get(sessionId);
    if (stateMachine) {
      await stateMachine.dispatch({ type: 'RESET_SESSION', payload: {} });
      this.activeSessions.delete(sessionId);
    }
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  getSessionState(sessionId: string): AgentState | null {
    const stateMachine = this.activeSessions.get(sessionId);
    return stateMachine ? stateMachine.getState() : null;
  }
}
