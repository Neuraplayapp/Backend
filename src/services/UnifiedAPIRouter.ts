// Unified API Router - ALL frontend API calls go through backend
import { approximateTokenCount, getContextWindowForModel } from '../utils/tokenUtils';

export class UnifiedAPIRouter {
  private static instance: UnifiedAPIRouter;
  private activeRequests = new Map<string, AbortController>();
  
  // Models known to emit reasoning tokens
  private static REASONING_TOKEN_MODELS = ['gpt-oss-120b', 'gpt-oss-20b'];
  
  static getInstance(): UnifiedAPIRouter {
    if (!UnifiedAPIRouter.instance) {
      UnifiedAPIRouter.instance = new UnifiedAPIRouter();
    }
    return UnifiedAPIRouter.instance;
  }

  /**
   * 🧠 CENTRALIZED REASONING TOKEN EXTRACTION
   * Some models (gpt-oss-*) output chain-of-thought reasoning tokens.
   * This extracts the final response cleanly.
   */
  private extractFinalResponse(text: string, model?: string): string {
    if (!text) return text;
    
    // Only process if model uses reasoning tokens OR if tokens are detected
    const hasReasoningTokens = text.includes('<|channel|>') || text.includes('<|message|>');
    if (!hasReasoningTokens) return text;
    
    // Extract content after <|message|> tag (the final response)
    const messageMatch = text.match(/<\|message\|>([^<]+)/s);
    if (messageMatch && messageMatch[1]?.trim().length > 10) {
      return messageMatch[1].trim();
    }
    
    // Fallback: get content after last reasoning token
    const parts = text.split(/<\|(?:channel|message|end)\|>/);
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart.length > 10) return lastPart;
      
      // Try second-to-last part if last is empty
      const secondLast = parts[parts.length - 2]?.trim();
      if (secondLast && secondLast.length > 10) return secondLast;
    }
    
    // Final fallback: strip all tokens
    return text.replace(/<\|[^|]+\|>/g, '').trim();
  }

  /**
   * 🧹 Clean LLM response data structure
   */
  private cleanLLMResponseData(responseData: any, model?: string): any {
    if (!responseData) return responseData;
    
    // Handle array format: [{ generated_text: "..." }]
    if (Array.isArray(responseData) && responseData[0]?.generated_text) {
      const cleaned = this.extractFinalResponse(responseData[0].generated_text, model);
      responseData[0].generated_text = cleaned;
      return responseData;
    }
    
    // Handle nested data format: { data: [{ generated_text: "..." }] }
    if (responseData.data && Array.isArray(responseData.data) && responseData.data[0]?.generated_text) {
      const cleaned = this.extractFinalResponse(responseData.data[0].generated_text, model);
      responseData.data[0].generated_text = cleaned;
      return responseData;
    }
    
    // Handle choices format: { choices: [{ message: { content: "..." } }] }
    if (responseData.choices?.[0]?.message?.content) {
      const cleaned = this.extractFinalResponse(responseData.choices[0].message.content, model);
      responseData.choices[0].message.content = cleaned;
      return responseData;
    }
    
    return responseData;
  }

  // CRITICAL: ALL API calls route through backend - NO direct external API calls from frontend
  async routeAPICall(service: string, endpoint: string, data: any, signal?: AbortSignal): Promise<any> {
    // Routing ${service} call through backend - model: ${data?.model}
    
    // Add retry logic for race conditions
    const maxRetries = 3;
    let lastError: any = null;
    let lastResponse: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Use relative path - same server handles both frontend and API routes
        const url = '/api/unified-route';
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal,
          body: JSON.stringify({
            service,
            endpoint, 
            data,
            timestamp: Date.now(),
            attempt
          })
        });
        
        // Parse the JSON response regardless of status
        let responseData;
        try {
          responseData = await response.json();
        } catch (parseError) {
          responseData = {
            success: false,
            error: `Failed to parse response: ${response.status} ${response.statusText}`,
            status: response.status
          };
        }
        
        if (response.ok) {
          // 🧠 Clean LLM responses from reasoning tokens
          if (endpoint === 'llm-completion' || endpoint === 'chat-completion') {
            return this.cleanLLMResponseData(responseData, data?.model);
          }
          return responseData;
        }
        
        // Store the last response for error reporting
        lastResponse = {
          ...responseData,
          status: response.status,
          statusText: response.statusText
        };
        
        // If 404, wait longer for server startup (Render needs more time)
        if (response.status === 404 && attempt < maxRetries) {
          const delay = attempt * 2000; // 2s, 4s, 6s delays
          console.warn(`🔄 UnifiedAPIRouter: Got 404 on attempt ${attempt}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // For other HTTP errors, return structured error instead of throwing
        return {
          success: false,
          error: responseData.error || `API routing failed: ${response.status} ${response.statusText}`,
          status: response.status,
          details: responseData.details || responseData
        };
        
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request was cancelled',
            cancelled: true
          };
        }
        
        if (attempt < maxRetries) {
          const delay = attempt * 2000; // Extended delays for server startup
          console.warn(`🔄 UnifiedAPIRouter: Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Return structured error instead of throwing
    return {
      success: false,
      error: `API routing failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      status: lastResponse?.status,
      details: lastResponse || { lastError: lastError?.message }
    };
  }

  // Image generation through backend
  async generateImage(prompt: string): Promise<any> {
    return this.routeAPICall('fireworks', 'image-generation', { prompt });
  }

  // Cancel an active request
  cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      console.log(`🛑 Request ${requestId} cancelled`);
      return true;
    }
    return false;
  }

  // LLM completion with streaming support - uses regular completion as fallback
  // Backend handles streaming from Fireworks internally and returns complete response
  async streamCompletion(
    messages: any[],
    model: string,
    options: {
      temperature?: number;
      max_tokens?: number;
      onChunk?: (chunk: string) => void;
      onComplete?: (fullText: string) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<{ success: boolean; fullText?: string; error?: string }> {
    const { temperature = 0.7, max_tokens = 4000, onChunk, onComplete, onError } = options;
    
    // FALLBACK: Backend streams from Fireworks internally but returns JSON to frontend
    // So we use regular completion - backend handles the streaming, we get the full result
    console.log('🌊 StreamCompletion: Using fallback (backend handles streaming internally)');
    
    try {
      const result = await this.llmCompletion(messages, model, {
        temperature,
        max_tokens
      });

      if (!result.success) {
        const error = new Error(result.error || 'LLM completion failed');
        onError?.(error);
        return { success: false, error: error.message };
      }

      // Extract content from response
      let fullText = '';
      if (typeof result.data === 'string') {
        fullText = result.data;
      } else if (Array.isArray(result.data) && result.data[0]?.generated_text) {
        fullText = result.data[0].generated_text;
      } else if (result.data?.choices?.[0]?.message?.content) {
        fullText = result.data.choices[0].message.content;
      } else if (result.content) {
        fullText = result.content;
      }

      if (fullText) {
        onChunk?.(fullText);
        onComplete?.(fullText);
        return { success: true, fullText };
      } else {
        const error = new Error('Could not extract content from LLM response');
        onError?.(error);
        return { success: false, error: error.message };
      }

    } catch (error) {
      const err = error as Error;
      console.error('StreamCompletion error:', err);
      onError?.(err);
      return { success: false, error: err.message };
    }
  }

  // LLM completion through backend  
  async llmCompletion(messages: any[], model: any, options: any = {}): Promise<any> {
    // Backwards-compat: allow callers to pass (messages, optionsObject) or (messages, modelString, options)
    let opts: any = options || {};
    let finalModel: string = typeof model === 'string' ? model : (model?.model || '');
    if (typeof model !== 'string' && model && typeof model === 'object') {
      opts = { ...model };
      if (!finalModel && typeof opts.model === 'string') {
        finalModel = opts.model;
      }
      delete opts.model;
    }

    if (!finalModel || (typeof finalModel === 'string' && finalModel.includes('gpt-4'))) {
      // Default/legacy model -> map to OSS 120B for text
      finalModel = 'accounts/fireworks/models/gpt-oss-120b';
    } else if (typeof finalModel === 'string' && (finalModel.includes('coder') || finalModel.includes('code'))) {
      // If caller passed code keyword choose 20B coder
      finalModel = 'accounts/fireworks/models/gpt-oss-20b';
    }
    // -------- Smart token sizing --------
    try {
      if (!opts.disableSmartSizing) {
        const promptTokens = messages.reduce((sum: number, m: any) => sum + approximateTokenCount(m.content || ''), 0) + messages.length * 4; // tiny overhead per message
        const ctxWindow = getContextWindowForModel(finalModel);
        const safety = 200;
        if (!opts.max_tokens) {
          opts.max_tokens = Math.max(256, ctxWindow - promptTokens - safety);
        }

        // Remove END_OF_TEXT marker - causes unrefined responses
        // if (options.ensureSentenceEnd !== false) {
        //   const stopMarker = '<END_OF_TEXT>';
        //   // append instruction to assistant
        //   messages[messages.length - 1].content += `\n\nEnd your response with ${stopMarker}`;
        //   opts.stopSequences = opts.stopSequences || [stopMarker];
        // }
      }
    } catch (_) { /* ignore safeguarding errors */ }

    // Generate unique request ID and create AbortController
    const requestId = options.requestId || `llm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);

    const result = await this.routeAPICall('fireworks', 'llm-completion',
      { messages, model: finalModel, ...opts },
      controller.signal
    );
    
    // Clean up request tracking
    this.activeRequests.delete(requestId);
    
    // Return the result with requestId, whether success or failure
    return { ...result, requestId };
  }

  // Chart generation through backend
  async generateChart(prompt: string, type: string): Promise<any> {
    return this.routeAPICall('fireworks', 'chart-generation', { prompt, type });
  }

  // Document generation through backend with proper models
  async generateDocument(prompt: string, type: string): Promise<any> {
    return this.routeAPICall('fireworks', 'document-generation', { 
      prompt, 
      type,
      model: 'accounts/fireworks/models/gpt-oss-120b',
      comprehensiveness: 'maximum',
      style: 'professional'
    });
  }
}

export const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
