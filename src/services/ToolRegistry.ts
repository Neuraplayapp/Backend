// Production-ready Tool Registry System
// Simple EventEmitter implementation for browser compatibility
class SimpleEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }
}

const EventEmitter = SimpleEventEmitter;
import { databaseIntegration } from './DatabaseIntegration';

export interface ToolSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  execute: (params: any, context: ToolExecutionContext) => Promise<any>;
  schema: ToolSchema;
  retryPolicy?: {
    maxRetries: number;
    backoff: 'linear' | 'exponential';
    baseDelay?: number;
  };
  timeout?: number;
  dependencies?: string[];
  category: 'client' | 'server' | 'hybrid';
  capabilities?: string[];
}

export interface ToolExecutionContext {
  sessionId: string;
  userId?: string;
  retryCount?: number;
  startTime: number;
  metadata?: Record<string, any>;
  // 🎯 Session data for context-aware tools (like canvas document creation)
  session?: {
    conversationHistory?: Array<{
      isUser: boolean;
      text?: string;
      content?: string;
    }>;
  };
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    retryCount: number;
    fromCache?: boolean;
  };
}

class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  private readonly threshold = 5;
  private readonly resetTime = 60000; // 1 minute

  isOpen(toolName: string): boolean {
    const failures = this.failures.get(toolName) || 0;
    const lastFailure = this.lastFailureTime.get(toolName) || 0;
    
    if (failures >= this.threshold) {
      if (Date.now() - lastFailure > this.resetTime) {
        this.failures.set(toolName, 0);
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(toolName: string): void {
    this.failures.set(toolName, 0);
  }

  recordFailure(toolName: string): void {
    const current = this.failures.get(toolName) || 0;
    this.failures.set(toolName, current + 1);
    this.lastFailureTime.set(toolName, Date.now());
  }
}

// 🚀 LRU Cache for tool execution results
class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private readonly maxSize: number;
  private readonly ttl: number; // Time-to-live in milliseconds

  constructor(maxSize: number = 500, ttlMs: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, { ...entry, timestamp: Date.now() });
    return entry.value;
  }

  set(key: K, value: V): void {
    // Remove if exists (to update position)
    this.cache.delete(key);
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

export class ToolRegistry extends EventEmitter {
  private static instance: ToolRegistry;
  private tools = new Map<string, ToolDefinition>();
  private circuitBreaker = new CircuitBreaker();
  // 🚀 ENHANCED: LRU cache with TTL instead of simple Map
  private executionCache = new LRUCache<string, any>(500, 5 * 60 * 1000); // 500 items, 5 min TTL
  private middleware: Array<{
    before?: (toolName: string, params: any, context: ToolExecutionContext) => Promise<void>;
    after?: (toolName: string, result: ToolResult, context: ToolExecutionContext) => Promise<void>;
  }> = [];

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  register(tool: ToolDefinition): void {
    // PERFORMANCE FIX: Canvas tools need longer timeout for 4000-token generation
    const toolTimeout = tool.name.startsWith('canvas-') ? 120000 : 30000; // 120s for canvas, 30s for others
    
    this.tools.set(tool.name, {
      retryPolicy: { maxRetries: 3, backoff: 'exponential', baseDelay: 1000 },
      timeout: toolTimeout,
      ...tool
    });
    
    this.emit('tool-registered', tool.name);
    console.log(`🔧 Tool registered: ${tool.name} (${tool.category})`);
  }

  addMiddleware(middleware: {
    before?: (toolName: string, params: any, context: ToolExecutionContext) => Promise<void>;
    after?: (toolName: string, result: ToolResult, context: ToolExecutionContext) => Promise<void>;
  }): void {
    this.middleware.push(middleware);
  }

  async execute(toolName: string, params: any, context: ToolExecutionContext): Promise<ToolResult> {
    console.log(`🔍 ToolRegistry - Executing tool: ${toolName}`);
    console.log(`🔍 ToolRegistry - Available tools: ${this.listTools().join(', ')}`);
    
    const tool = this.tools.get(toolName);
    if (!tool) {
      console.error(`🔍 ToolRegistry - Tool '${toolName}' not found in registry!`);
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
        metadata: { executionTime: 0, retryCount: 0 }
      };
    }
    
    console.log(`🔍 ToolRegistry - Found tool: ${toolName}, executing...`);

    // Check circuit breaker
    if (this.circuitBreaker.isOpen(toolName)) {
      return {
        success: false,
        error: `Circuit breaker open for tool '${toolName}'`,
        metadata: { executionTime: 0, retryCount: 0 }
      };
    }

    // Validate parameters
    try {
      this.validateParams(params, tool.schema);
    } catch (error) {
      return {
        success: false,
        error: `Parameter validation failed: ${error.message}`,
        metadata: { executionTime: 0, retryCount: 0 }
      };
    }

    // Check cache
    const cacheKey = this.getCacheKey(toolName, params);
    if (this.executionCache.has(cacheKey)) {
      const cached = this.executionCache.get(cacheKey);
      return {
        ...cached,
        metadata: { ...cached.metadata, fromCache: true }
      };
    }

    // Execute with retry logic
    return this.executeWithRetry(tool, params, context);
  }

  private async executeWithRetry(
    tool: ToolDefinition, 
    params: any, 
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    let lastError: Error;
    const maxRetries = tool.retryPolicy!.maxRetries;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Pre-execution middleware
        for (const middleware of this.middleware) {
          if (middleware.before) {
            await middleware.before(tool.name, params, { ...context, retryCount: attempt });
          }
        }

        const startTime = Date.now();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Tool execution timeout')), tool.timeout);
        });

        // Execute tool with timeout
        const executionPromise = tool.execute(params, { ...context, retryCount: attempt, startTime });
        const data = await Promise.race([executionPromise, timeoutPromise]);
        
        const executionTime = Date.now() - startTime;
        const result: ToolResult = {
          success: true,
          data,
          metadata: { executionTime, retryCount: attempt }
        };

        // Post-execution middleware
        for (const middleware of this.middleware) {
          if (middleware.after) {
            await middleware.after(tool.name, result, context);
          }
        }

        // Cache successful results
        const cacheKey = this.getCacheKey(tool.name, params);
        this.executionCache.set(cacheKey, result);

        this.circuitBreaker.recordSuccess(tool.name);
        this.emit('tool-executed', { tool: tool.name, result, context });
        
        return result;

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Tool execution failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        
        // Don't retry on validation errors
        if (error.message.includes('validation')) {
          break;
        }

        // Calculate delay for next retry
        if (attempt < maxRetries) {
          const delay = this.calculateDelay(tool.retryPolicy!, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.circuitBreaker.recordFailure(tool.name);
    const result: ToolResult = {
      success: false,
      error: lastError!.message,
      metadata: { executionTime: 0, retryCount: maxRetries }
    };

    this.emit('tool-failed', { tool: tool.name, error: lastError, context });
    return result;
  }

  private validateParams(params: any, schema: ToolSchema): void {
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in params)) {
          throw new Error(`Required parameter '${field}' is missing`);
        }
      }
    }
    // Add more validation logic as needed
  }

  private calculateDelay(retryPolicy: NonNullable<ToolDefinition['retryPolicy']>, attempt: number): number {
    const baseDelay = retryPolicy.baseDelay || 1000;
    
    if (retryPolicy.backoff === 'exponential') {
      return baseDelay * Math.pow(2, attempt);
    } else {
      return baseDelay * (attempt + 1);
    }
  }

  private getCacheKey(toolName: string, params: any): string {
    return `${toolName}:${JSON.stringify(params)}`;
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  getToolDefinition(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  clearCache(): void {
    this.executionCache.clear();
  }
}

export const toolRegistry = ToolRegistry.getInstance();