// Agent Handler
// Integrates with existing AgentOrchestrator and AgentStateMachine for complex workflows

// any type replaced - using legacy object from AIRouter
import { AIRequest, AIResponse } from '../AIRouter';
import { toolRegistry } from '../../services/ToolRegistry';

export class AgentHandler {
  async handle(request: AIRequest, intentAnalysis: any): Promise<AIResponse> {
    try {
      console.log('🤖 AgentHandler: Processing agent mode request');

      // Use existing AgentOrchestrator for complex workflows
      const agentResult = await toolRegistry.execute('agent_orchestrator', {
        action: 'execute_workflow',
        userRequest: request.message,
        intentAnalysis: intentAnalysis,
        sessionId: request.sessionId,
        userId: request.userId
      }, {
        sessionId: request.sessionId,
        userId: request.userId,
        startTime: Date.now()
      });

      if (agentResult.success) {
        return {
          success: true,
          response: agentResult.data?.response || 'Agent workflow completed successfully',
          toolResults: [agentResult],
          metadata: {
            sessionId: request.sessionId,
            executionTime: 0,
            toolsExecuted: 1,
            mode: 'agent'
          }
        };
      }

      // Fallback: Use LLM for agent-like behavior
      const llmResult = await toolRegistry.execute('llm-completion', {
        prompt: this.buildAgentPrompt(request.message, intentAnalysis),
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.3, // Lower temperature for agent-like consistency
        maxTokens: 1500
      }, {
        sessionId: request.sessionId,
        userId: request.userId,
        startTime: Date.now()
      });

      const responseText = llmResult.data?.completion ||
                         llmResult.data?.response ||
                         llmResult.data?.message ||
                         'Agent mode response generated';

      return {
        success: true,
        response: responseText,
        toolResults: [llmResult],
        metadata: {
          sessionId: request.sessionId,
          executionTime: 0,
          toolsExecuted: 1,
          mode: 'agent-fallback'
        }
      };

    } catch (error) {
      console.error('🤖 Agent mode failed:', error);
      throw new Error(`Agent mode failed: ${(error as Error).message}`);
    }
  }

  private buildAgentPrompt(message: string, intentAnalysis: any): string {
    return `You are an AI agent designed for complex workflows and multi-step tasks.

User Request: ${message}
Intent Analysis: ${JSON.stringify(intentAnalysis, null, 2)}

Your role is to:
1. Break down complex requests into manageable steps
2. Provide structured, actionable guidance
3. Consider dependencies and prerequisites
4. Offer multiple approaches when possible
5. Maintain focus on the user's primary goal

Respond with a clear, structured plan that addresses the user's request.`;
  }
}
