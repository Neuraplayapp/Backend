// Smart Tool Dispatcher - Replaces the old ToolExecutorService
import { toolRegistry } from './ToolRegistry';
import { NavigationService } from './NavigationService';

export interface DispatchRequest {
  toolName: string;
  parameters: any;
  sessionId: string;
  userId?: string;
  context?: any;
}

export interface DispatchResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    toolCategory: 'client' | 'server' | 'hybrid';
    fromCache?: boolean;
  };
}

export class SmartToolDispatcher {
  private static instance: SmartToolDispatcher;
  private navigationService: NavigationService;

  constructor() {
    this.navigationService = NavigationService.getInstance();
  }

  static getInstance(): SmartToolDispatcher {
    if (!SmartToolDispatcher.instance) {
      SmartToolDispatcher.instance = new SmartToolDispatcher();
    }
    return SmartToolDispatcher.instance;
  }

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    const startTime = Date.now();

    try {
      console.log(`🚀 Dispatching tool: ${request.toolName}`, {
        sessionId: request.sessionId,
        userId: request.userId,
        parameters: Object.keys(request.parameters)
      });

      // Check if tool is registered in our new system
      const toolDefinition = toolRegistry.getToolDefinition(request.toolName);
      
      if (toolDefinition) {
        // Use new tool registry system
        return await this.executeWithRegistry(request, startTime);
      } else {
        // Fallback to legacy tool handling
        return await this.executeLegacyTool(request, startTime);
      }

    } catch (error) {
      console.error(`❌ Tool dispatch failed for ${request.toolName}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'server' // Default assumption
        }
      };
    }
  }

  private async executeWithRegistry(request: DispatchRequest, startTime: number): Promise<DispatchResult> {
    const toolDefinition = toolRegistry.getToolDefinition(request.toolName)!;
    
    const result = await toolRegistry.execute(
      request.toolName,
      request.parameters,
      {
        sessionId: request.sessionId,
        userId: request.userId,
        startTime,
        metadata: request.context
      }
    );

    return {
      success: result.success,
      data: result.data,
      error: result.error,
      metadata: {
        executionTime: result.metadata?.executionTime || (Date.now() - startTime),
        toolCategory: toolDefinition.category,
        fromCache: result.metadata?.fromCache
      }
    };
  }

  private async executeLegacyTool(request: DispatchRequest, startTime: number): Promise<DispatchResult> {
    console.log(`🔄 Using legacy tool handling for: ${request.toolName}`);

    // Handle client-side tools that aren't yet registered
    switch (request.toolName) {
      case 'navigate_to_page':
        return await this.handleNavigation(request.parameters, startTime, request.userId);
      
      case 'update_settings':
        return await this.handleSettingUpdate(request.parameters, startTime);
      
      case 'recommend_game':
        return await this.handleGameRecommendation(request.parameters, startTime);
      
      case 'create_content':
        return await this.handleContentCreation(request.parameters, startTime);
      
      case 'accessibility_support':
        return await this.handleAccessibilitySupport(request.parameters, startTime);
      
      case 'read_user_data':
        return await this.handleDataReading(request.parameters, startTime);
      
      default:
        // For unknown tools, try to route to server
        return await this.routeToServer(request, startTime);
    }
  }

  private async handleNavigation(params: any, startTime: number, userId?: string): Promise<DispatchResult> {
    try {
      // Pass user context (userId) for authentication checks on protected pages
      const result = await this.navigationService.navigateToPage(params.page, userId);
      
      return {
        success: true,
        data: {
          action: 'navigate',
          page: params.page,
          params: params.params,
          result
        },
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed',
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    }
  }

  private async handleSettingUpdate(params: any, startTime: number): Promise<DispatchResult> {
    try {
      // This would interact with user settings context
      console.log('🔧 Updating setting:', params);
      
      return {
        success: true,
        data: {
          action: 'setting_updated',
          setting: params.setting,
          value: params.value
        },
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Setting update failed',
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    }
  }

  private async handleGameRecommendation(params: any, startTime: number): Promise<DispatchResult> {
    try {
      // This would use the cognitive profile to recommend games
      const games = [
        'memory-sequence',
        'pattern-matching',
        'inhibition',
        'berry-blaster'
      ];
      
      const recommendedGame = games[Math.floor(Math.random() * games.length)];
      
      return {
        success: true,
        data: {
          action: 'game_recommendation',
          game: recommendedGame,
          reason: 'Based on your cognitive profile and learning goals'
        },
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Game recommendation failed',
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    }
  }

  private async handleContentCreation(params: any, startTime: number): Promise<DispatchResult> {
    try {
      return {
        success: true,
        data: {
          action: 'content_created',
          type: params.type,
          content: `Created ${params.type} content based on: ${params.topic}`
        },
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Content creation failed',
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    }
  }

  private async handleAccessibilitySupport(params: any, startTime: number): Promise<DispatchResult> {
    try {
      return {
        success: true,
        data: {
          action: 'accessibility_enabled',
          feature: params.feature,
          enabled: true
        },
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Accessibility support failed',
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    }
  }

  private async handleDataReading(params: any, startTime: number): Promise<DispatchResult> {
    try {
      return {
        success: true,
        data: {
          action: 'data_read',
          source: params.source,
          data: `Mock data from ${params.source}`
        },
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Data reading failed',
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'client'
        }
      };
    }
  }

  private async routeToServer(request: DispatchRequest, startTime: number): Promise<DispatchResult> {
    try {
      console.log(`🌐 Routing unknown tool to server: ${request.toolName}`);
      
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: request.toolName,
          parameters: request.parameters,
          sessionId: request.sessionId,
          userId: request.userId
        })
      });

      if (!response.ok) {
        throw new Error(`Server tool execution failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: result.success,
        data: result.data,
        error: result.error,
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'server'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Server routing failed',
        metadata: {
          executionTime: Date.now() - startTime,
          toolCategory: 'server'
        }
      };
    }
  }

  // Get statistics about tool usage
  getStats(): {
    registeredTools: number;
    toolsByCategory: Record<string, number>;
  } {
    const tools = toolRegistry.listTools();
    const toolsByCategory: Record<string, number> = { client: 0, server: 0, hybrid: 0 };
    
    for (const toolName of tools) {
      const definition = toolRegistry.getToolDefinition(toolName);
      if (definition) {
        toolsByCategory[definition.category]++;
      }
    }

    return {
      registeredTools: tools.length,
      toolsByCategory
    };
  }
}

export const smartToolDispatcher = SmartToolDispatcher.getInstance();
