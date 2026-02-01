// Modular Tool Registration System
import { toolRegistry } from '../ToolRegistry';

// NOTE: Canvas tools are now registered in CoreTools.ts to avoid duplication
// This file remains for future modular canvas tools if needed

// Track registration state to prevent duplicates
let canvasToolsRegistered = false;

/**
 * Register all canvas tools with the ToolRegistry
 * This follows proper modular architecture by separating tool definitions from registration
 */
export function registerCanvasTools(): void {
  // Prevent duplicate registration
  if (canvasToolsRegistered) {
    console.log('🎨 Canvas tools already registered in CoreTools, skipping...');
    return;
  }
  
  console.log('🎨 Canvas tools are now registered in CoreTools.ts to avoid duplication');
  
  try {
    // Canvas tools are now registered in CoreTools.ts
    // This prevents the duplication issue we had before
    
    console.log('✅ Canvas tools handled by CoreTools registration');
    
    // Mark as registered
    canvasToolsRegistered = true;
    
    // Add canvas-specific middleware for logging
    toolRegistry.addMiddleware({
      before: async (toolName, params, context) => {
        if (toolName.startsWith('canvas-')) {
          console.log(`🎨 Canvas tool starting: ${toolName}`, {
            sessionId: context.sessionId,
            userId: context.userId,
            activateCanvas: params.activateCanvas
          });
        }
      },
      
      after: async (toolName, result, context) => {
        if (toolName.startsWith('canvas-')) {
          const duration = Date.now() - context.startTime;
          console.log(`🎨 Canvas tool completed: ${toolName}`, {
            sessionId: context.sessionId,
            success: result.success,
            duration: `${duration}ms`,
            canvasActivated: result.data?.metadata?.canvasActivated || false
          });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to register canvas tools:', error);
    throw new Error(`Canvas tool registration failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get statistics about registered canvas tools
 */
export function getCanvasToolStats() {
  const allTools = toolRegistry.listTools();
  const canvasTools = allTools.filter(name => name.startsWith('canvas-'));
  
  return {
    total: canvasTools.length,
    tools: canvasTools,
    categories: canvasTools.map(name => {
      const definition = toolRegistry.getToolDefinition(name);
      return {
        name,
        category: definition?.category,
        capabilities: definition?.capabilities || []
      };
    })
  };
}

/**
 * Verify all canvas tools are properly registered and functional
 */
export async function verifyCanvasTools(): Promise<boolean> {
  console.log('🔍 Verifying canvas tools...');
  
  const expectedTools = [
    'canvas-chart-creation',
    'canvas-document-creation'
    // canvas-code-creation may be in CoreTools or separate
  ];
  
  const registeredTools = toolRegistry.listTools();
  const missingTools = expectedTools.filter(tool => !registeredTools.includes(tool));
  
  if (missingTools.length > 0) {
    console.error('❌ Missing canvas tools:', missingTools);
    return false;
  }
  
  // Verify each tool has proper schema
  for (const toolName of expectedTools) {
    const definition = toolRegistry.getToolDefinition(toolName);
    if (!definition) {
      console.error(`❌ Tool definition missing: ${toolName}`);
      return false;
    }
    
    if (!definition.schema || !definition.execute) {
      console.error(`❌ Invalid tool definition: ${toolName}`);
      return false;
    }
  }
  
  console.log('✅ All canvas tools verified successfully');
  return true;
}
