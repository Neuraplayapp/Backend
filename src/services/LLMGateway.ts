/**
 * 🎯 UNIFIED LLM GATEWAY
 * 
 * Single entry point for ALL LLM calls in the system.
 * 
 * Features:
 * - Easy model switching (change in one place)
 * - Request/response logging for debugging
 * - Automatic retry with exponential backoff
 * - Latency tracking
 * - response_format always forwarded correctly
 * - Model presets for different use cases
 * 
 * Usage:
 *   const result = await llmGateway.complete('greeting', messages, options);
 *   const result = await llmGateway.complete('analysis', messages, { model: 'fast' });
 */

export type LLMPreset = 
  | 'greeting'      // Fast, short responses (20b)
  | 'analysis'      // Cognitive/memory analysis (120b) 
  | 'generation'    // Canvas, courses, documents (120b)
  | 'chat'          // General conversation (120b)
  | 'recall'        // Memory recall responses (70b instruct)
  | 'code'          // Code generation (120b + json_object)
  | 'custom';       // Use provided model directly

// 🎯 Support both simple json_object and full json_schema enforcement
export type ResponseFormat = 
  | { type: 'json_object' }
  | { type: 'json_schema'; json_schema: { name: string; strict?: boolean; schema: object } };

export interface LLMRequestOptions {
  model?: string;               // Override model
  temperature?: number;         // 0-2
  maxTokens?: number;          // Max response tokens
  responseFormat?: ResponseFormat;  // 🎯 Full json_schema support for 100% reliable parsing
  timeout?: number;             // Request timeout in ms
  retries?: number;             // Number of retries
  preset?: LLMPreset;           // Use a preset configuration
}

export interface LLMResponse {
  success: boolean;
  content: string;
  raw?: any;                    // Raw API response
  latencyMs: number;
  model: string;
  tokensUsed?: number;
  error?: string;
}

interface PresetConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  responseFormat?: ResponseFormat;
}

class LLMGateway {
  private static instance: LLMGateway;
  
  // 🎯 MODEL PRESETS - Change models in ONE place
  private readonly PRESETS: Record<LLMPreset, PresetConfig> = {
    greeting: {
      // Fast 20B model is fine for simple text greetings
      model: 'accounts/fireworks/models/gpt-oss-20b',
      temperature: 0.6,
      maxTokens: 2000
    },
    analysis: {
      model: 'accounts/fireworks/models/gpt-oss-120b',
      temperature: 0.0, // CRITICAL: temp 0.0 = no reasoning tokens for JSON
      maxTokens: 2000
      // For JSON output, callers should use json_schema  
    },
    generation: {
      model: 'accounts/fireworks/models/gpt-oss-120b',
      temperature: 0.65,
      maxTokens: 4000
    },
    chat: {
      model: 'accounts/fireworks/models/gpt-oss-120b',
      temperature: 0.6,
      maxTokens: 2000
    },
    recall: {
      // 🎯 Use GPT-OSS-120B for all tasks
      model: 'accounts/fireworks/models/gpt-oss-120b',
      temperature: 0.6,
      maxTokens: 2000
    },
    code: {
      model: 'accounts/fireworks/models/gpt-oss-120b',
      temperature: 0.2,
      maxTokens: 2000
      // For JSON output, callers should use json_schema
    },
    custom: {
      model: 'accounts/fireworks/models/gpt-oss-120b',
      temperature: 0.6,
      maxTokens: 2000
    }
  };
  
  // Metrics
  private requestCount = 0;
  private totalLatency = 0;
  private errorCount = 0;

  static getInstance(): LLMGateway {
    if (!LLMGateway.instance) {
      LLMGateway.instance = new LLMGateway();
    }
    return LLMGateway.instance;
  }

  /**
   * 🎯 MAIN API: Make an LLM completion request
   * 
   * @param preset - Use case preset (greeting, analysis, generation, etc.)
   * @param messages - Array of {role, content} messages
   * @param options - Override options
   */
  async complete(
    preset: LLMPreset,
    messages: Array<{ role: string; content: string }>,
    options?: LLMRequestOptions
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    this.requestCount++;
    
    // Merge preset with options
    const config = this.PRESETS[preset];
    const finalModel = options?.model || config.model;
    const finalTemp = options?.temperature ?? config.temperature;
    const finalMaxTokens = options?.maxTokens ?? config.maxTokens;
    const finalResponseFormat = options?.responseFormat || config.responseFormat;
    const retries = options?.retries ?? 2;
    
    console.log(`🎯 LLMGateway: ${preset} request`, {
      model: finalModel.split('/').pop(),
      messages: messages.length,
      maxTokens: finalMaxTokens
    });
    
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const { UnifiedAPIRouter } = await import('./UnifiedAPIRouter');
        const router = UnifiedAPIRouter.getInstance();
        
        const requestBody: any = {
          messages,
          model: finalModel,
          temperature: finalTemp,
          max_tokens: finalMaxTokens
        };
        
        // 🎯 ALWAYS include response_format if specified (this was the bug before)
        if (finalResponseFormat) {
          requestBody.response_format = finalResponseFormat;
        }
        
        const result = await router.routeAPICall('fireworks', 'llm-completion', requestBody);
        
        const latency = Date.now() - startTime;
        this.totalLatency += latency;
        
        // Extract content from various response formats
        const content = this.extractContent(result);
        
        if (content) {
          console.log(`✅ LLMGateway: ${preset} complete in ${latency}ms`);
          return {
            success: true,
            content,
            raw: result,
            latencyMs: latency,
            model: finalModel,
            tokensUsed: result?.usage?.total_tokens
          };
        }
        
        // No content - might be an error
        lastError = new Error('No content in response');
        
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ LLMGateway: Attempt ${attempt} failed:`, error.message);
        
        if (attempt < retries + 1) {
          // Exponential backoff
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      }
    }
    
    // All retries failed
    this.errorCount++;
    const latency = Date.now() - startTime;
    
    console.error(`❌ LLMGateway: ${preset} failed after ${retries + 1} attempts`);
    
    return {
      success: false,
      content: '',
      latencyMs: latency,
      model: finalModel,
      error: lastError?.message || 'Unknown error'
    };
  }

  /**
   * 🔧 Extract content from various API response formats
   */
  private extractContent(result: any): string | null {
    if (!result) return null;
    
    // Direct content
    if (result.content && typeof result.content === 'string') {
      return result.content;
    }
    
    // Nested data.content
    if (result.data?.content) {
      return result.data.content;
    }
    
    // Array format: [{ generated_text: "..." }]
    if (Array.isArray(result.data) && result.data[0]?.generated_text) {
      return result.data[0].generated_text;
    }
    
    // Choices format: { choices: [{ message: { content: "..." } }] }
    if (result.data?.choices?.[0]?.message?.content) {
      return result.data.choices[0].message.content;
    }
    
    if (result.choices?.[0]?.message?.content) {
      return result.choices[0].message.content;
    }
    
    // Choices text format: { choices: [{ text: "..." }] }
    if (result.data?.choices?.[0]?.text) {
      return result.data.choices[0].text;
    }
    
    return null;
  }

  /**
   * 📊 Get gateway metrics
   */
  getMetrics(): { requests: number; avgLatencyMs: number; errorRate: number } {
    return {
      requests: this.requestCount,
      avgLatencyMs: this.requestCount > 0 ? Math.round(this.totalLatency / this.requestCount) : 0,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0
    };
  }

  /**
   * 🔧 Update a preset's model (runtime configuration)
   */
  setPresetModel(preset: LLMPreset, model: string): void {
    if (this.PRESETS[preset]) {
      this.PRESETS[preset].model = model;
      console.log(`🔧 LLMGateway: Updated ${preset} model to ${model}`);
    }
  }

  /**
   * 📋 List all presets and their current models
   */
  listPresets(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, config] of Object.entries(this.PRESETS)) {
      result[key] = config.model;
    }
    return result;
  }
}

// Export singleton
export const llmGateway = LLMGateway.getInstance();

