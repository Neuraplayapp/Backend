// Mode Handler Factory
// A factory to select the appropriate handler based on the intent result, removing the switch block from AIRouter

// any type replaced - using legacy object from AIRouter
import { AIRequest, AIResponse } from '../AIRouter';
import { ChatHandler } from './ChatHandler';
import { ToolCallingHandler } from './ToolCallingHandler';
import { AgentHandler } from './AgentHandler';
import { SocraticHandler } from './SocraticHandler';
import { VisionHandler } from './VisionHandler';

export interface ModeHandler {
  handle(request: AIRequest, intentAnalysis: any): Promise<AIResponse>;
}

export class ModeHandlerFactory {
  private modeHandlers: Map<string, ModeHandler> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🏭 ModeHandlerFactory: Initializing...');
    
    // Register all mode handlers
    this.registerModeHandler('chat', new ChatHandler());
    this.registerModeHandler('tool-calling', new ToolCallingHandler());
    this.registerModeHandler('agent', new AgentHandler());
    this.registerModeHandler('socratic_chat', new SocraticHandler());
    this.registerModeHandler('vision', new VisionHandler());
    
    this.initialized = true;
    console.log('✅ ModeHandlerFactory: Initialized with', this.modeHandlers.size, 'handlers');
  }

  /**
   * Get the appropriate handler for a given mode
   */
  getHandler(mode: string): ModeHandler | undefined {
    return this.modeHandlers.get(mode);
  }

  /**
   * Register a new mode handler
   */
  registerModeHandler(mode: string, handler: ModeHandler): void {
    this.modeHandlers.set(mode, handler);
    console.log(`🎯 ModeHandlerFactory: Registered handler for '${mode}' mode`);
  }

  /**
   * Unregister a mode handler
   */
  unregisterModeHandler(mode: string): boolean {
    const removed = this.modeHandlers.delete(mode);
    if (removed) {
      console.log(`🎯 ModeHandlerFactory: Unregistered handler for '${mode}' mode`);
    }
    return removed;
  }

  /**
   * Get all available modes
   */
  getAvailableModes(): string[] {
    return Array.from(this.modeHandlers.keys());
  }

  /**
   * Check if a mode is supported
   */
  hasMode(mode: string): boolean {
    return this.modeHandlers.has(mode);
  }

  /**
   * Get handler statistics
   */
  getHandlerStats(): any {
    return {
      totalHandlers: this.modeHandlers.size,
      availableModes: this.getAvailableModes(),
      initialized: this.initialized
    };
  }
}
