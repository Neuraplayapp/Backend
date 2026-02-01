// 🔒 NEURAPLAY AI SYSTEM CONFIGURATION - IMMUTABLE
// This file defines the system architecture and must not be modified

export const SYSTEM_CONFIG = {
  // Architecture version - increment only with user approval
  ARCHITECTURE_VERSION: '2.0.0-FINAL',
  
  // Core entry point - NEVER change
  AI_ROUTER_PATH: 'src/ai/AIRouter.ts',
  
  // Service paths - IMMUTABLE
  SERVICES: {
    INTENT_ANALYSIS: 'src/ai/intent/IntentAnalysisService.ts',
    SAFETY_SERVICE: 'src/ai/safety/SafetyService.ts',
    MODE_HANDLER_FACTORY: 'src/ai/handlers/ModeHandlerFactory.ts',
    SERVICE_CONTAINER: 'src/services/ServiceContainer.ts'
  },
  
  // Existing infrastructure to preserve
  EXISTING_TOOLS: {
    SMART_TOOL_DISPATCHER: 'src/services/SmartToolDispatcher.ts',
    TOOL_EXECUTOR: 'src/services/ToolExecutorService.ts',
    TOOL_REGISTRY: 'src/services/ToolRegistry.ts',
    AGENT_ORCHESTRATOR: 'src/services/AgentOrchestrator.ts',
    AGENT_STATE_MACHINE: 'src/services/AgentStateMachine.ts',
    CORE_TOOLS: 'src/services/CoreTools.ts'
  },
  
  // Access patterns
  AI_ACCESS_PATTERN: "serviceContainer.get('aiRouter')",
  
  // Architectural rules
  RULES: {
    SINGLE_ENTRY_POINT: true,
    PRESERVE_EXISTING_TOOLS: true,
    NO_DUPLICATE_FUNCTIONALITY: true,
    DI_CONTAINER_REQUIRED: true
  },
  
  // System status
  STATUS: 'IMMUTABLE_FINAL',
  LAST_REFACTOR: new Date().toISOString(),
  
  // Validation function
  validateArchitecture(): boolean {
    return this.STATUS === 'IMMUTABLE_FINAL' && 
           this.ARCHITECTURE_VERSION === '2.0.0-FINAL';
  }
} as const;

// Type safety for configuration
export type SystemConfig = typeof SYSTEM_CONFIG;

// Export for system validation
export const isArchitectureValid = () => SYSTEM_CONFIG.validateArchitecture();
