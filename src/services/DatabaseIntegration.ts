// Database Integration Layer for New AI Architecture
import { AgentState } from './AgentStateMachine';

export interface AgentSessionData {
  id: string;
  userId: string;
  state: AgentState;
  context: any;
  stateHistory: AgentState[];
  phase: string;
  expiresAt?: Date;
}

export interface ToolExecutionData {
  id: string;
  sessionId: string;
  toolName: string;
  inputParams: any;
  outputResult: any;
  status: 'success' | 'failure' | 'pending' | 'timeout';
  executionTime: number;
  errorDetails?: any;
  retryCount?: number;
}

export interface ContextStoreData {
  id: string;
  sessionId: string;
  contextType: 'short-term' | 'working' | 'long-term' | 'semantic';
  contextKey: string;
  contextValue: any;
  tags?: string[];
  expiresAt?: Date;
}

export interface ToolRegistryCacheData {
  toolName: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  avgExecutionTime: number;
  lastExecuted: Date;
  cacheData: any;
}

export class DatabaseIntegration {
  private static instance: DatabaseIntegration;
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/database';
  }

  static getInstance(): DatabaseIntegration {
    if (!DatabaseIntegration.instance) {
      DatabaseIntegration.instance = new DatabaseIntegration();
    }
    return DatabaseIntegration.instance;
  }

  // Agent Sessions
  async saveAgentSession(data: AgentSessionData): Promise<void> {
    try {
      await this.makeRequest('POST', {
        collection: 'agent_sessions',
        action: 'create',
        data: {
          id: data.id,
          userId: data.userId,
          state: data.state,
          context: data.context,
          stateHistory: data.stateHistory,
          phase: data.phase,
          expiresAt: data.expiresAt?.toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Failed to save agent session:', error);
      throw error;
    }
  }

  async getAgentSession(sessionId: string): Promise<AgentSessionData | null> {
    try {
      const result = await this.makeRequest('POST', {
        collection: 'agent_sessions',
        action: 'read',
        key: sessionId
      });
      
      return result.data?.[0] || null;
    } catch (error) {
      console.error('❌ Failed to get agent session:', error);
      return null;
    }
  }

  async getUserAgentSessions(userId: string, filters: any = {}): Promise<AgentSessionData[]> {
    try {
      const result = await this.makeRequest('POST', {
        collection: 'agent_sessions',
        action: 'read',
        key: userId,
        filters
      });
      
      return result.data || [];
    } catch (error) {
      console.error('❌ Failed to get user agent sessions:', error);
      return [];
    }
  }

  async deleteAgentSession(sessionId: string): Promise<void> {
    try {
      await this.makeRequest('POST', {
        collection: 'agent_sessions',
        action: 'delete',
        key: sessionId
      });
    } catch (error) {
      console.error('❌ Failed to delete agent session:', error);
      throw error;
    }
  }

  // Tool Executions
  async saveToolExecution(data: ToolExecutionData): Promise<void> {
    try {
      await this.makeRequest('POST', {
        collection: 'tool_executions',
        action: 'create',
        data: {
          id: data.id,
          sessionId: data.sessionId,
          toolName: data.toolName,
          inputParams: data.inputParams,
          outputResult: data.outputResult,
          status: data.status,
          executionTime: data.executionTime,
          errorDetails: data.errorDetails,
          retryCount: data.retryCount || 0
        }
      });
    } catch (error) {
      console.error('❌ Failed to save tool execution:', error);
      throw error;
    }
  }

  async getToolExecutions(sessionId: string, filters: any = {}): Promise<ToolExecutionData[]> {
    try {
      const result = await this.makeRequest('POST', {
        collection: 'tool_executions',
        action: 'read',
        key: sessionId,
        filters
      });
      
      return result.data || [];
    } catch (error) {
      console.error('❌ Failed to get tool executions:', error);
      return [];
    }
  }

  // Context Store
  async saveContext(data: ContextStoreData): Promise<void> {
    try {
      await this.makeRequest('POST', {
        collection: 'context_store',
        action: 'create',
        data: {
          id: data.id,
          sessionId: data.sessionId,
          contextType: data.contextType,
          contextKey: data.contextKey,
          contextValue: data.contextValue,
          tags: data.tags,
          expiresAt: data.expiresAt?.toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Failed to save context:', error);
      throw error;
    }
  }

  async getContext(sessionId: string, contextType?: string, contextKey?: string): Promise<ContextStoreData[]> {
    try {
      const filters: any = {};
      if (contextType) filters.contextType = contextType;
      if (contextKey) filters.contextKey = contextKey;

      const result = await this.makeRequest('POST', {
        collection: 'context_store',
        action: 'read',
        key: sessionId,
        filters
      });
      
      return result.data || [];
    } catch (error) {
      console.error('❌ Failed to get context:', error);
      return [];
    }
  }

  async deleteContext(contextId: string): Promise<void> {
    try {
      await this.makeRequest('POST', {
        collection: 'context_store',
        action: 'delete',
        key: contextId
      });
    } catch (error) {
      console.error('❌ Failed to delete context:', error);
      throw error;
    }
  }

  // Tool Registry Cache
  async updateToolCache(data: ToolRegistryCacheData): Promise<void> {
    try {
      await this.makeRequest('POST', {
        collection: 'tool_registry_cache',
        action: 'create',
        data: {
          toolName: data.toolName,
          executionCount: data.executionCount,
          successCount: data.successCount,
          failureCount: data.failureCount,
          avgExecutionTime: data.avgExecutionTime,
          lastExecuted: data.lastExecuted.toISOString(),
          cacheData: data.cacheData
        }
      });
    } catch (error) {
      console.error('❌ Failed to update tool cache:', error);
      throw error;
    }
  }

  async getToolCache(toolName?: string): Promise<ToolRegistryCacheData[]> {
    try {
      const result = await this.makeRequest('POST', {
        collection: 'tool_registry_cache',
        action: 'read',
        key: toolName || undefined
      });
      
      return result.data || [];
    } catch (error) {
      console.error('❌ Failed to get tool cache:', error);
      return [];
    }
  }

  // Cleanup expired data
  async cleanupExpiredData(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // This would need a custom endpoint for cleanup queries
      console.log('🧹 Cleanup expired data - would need custom SQL queries');
      
      // For now, we'll implement this as a maintenance endpoint
    } catch (error) {
      console.error('❌ Failed to cleanup expired data:', error);
    }
  }

  // Analytics and Statistics
  async getToolExecutionStats(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<any> {
    try {
      // This would need aggregation queries
      const executions = await this.getToolExecutions('', {});
      
      // Basic stats calculation
      const stats = {
        totalExecutions: executions.length,
        successRate: executions.filter(e => e.status === 'success').length / executions.length,
        avgExecutionTime: executions.reduce((sum, e) => sum + e.executionTime, 0) / executions.length,
        toolBreakdown: executions.reduce((acc, e) => {
          acc[e.toolName] = (acc[e.toolName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return stats;
    } catch (error) {
      console.error('❌ Failed to get tool execution stats:', error);
      return null;
    }
  }

  private async makeRequest(method: 'GET' | 'POST', data?: any): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        throw new Error(`Database request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Database request error:', error);
      throw error;
    }
  }

  // Helper method to generate IDs
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const databaseIntegration = DatabaseIntegration.getInstance();
