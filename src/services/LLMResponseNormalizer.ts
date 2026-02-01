/**
 * 🎯 LLM RESPONSE NORMALIZER
 * 
 * Centralized service for making LLM calls with consistent patterns.
 * 
 * 🎯 CRITICAL: For structured JSON output, use response_format with json_schema:
 *   response_format: { type: 'json_schema', json_schema: { name, strict: true, schema: {...} } }
 *   This enables Fireworks to enforce JSON structure at token level = 100% reliable parsing
 * 
 * Supports multiple model types:
 *   - GPT-OSS-120B - primary model for all tasks, use json_schema for structured output
 *   - Instruction-tuned models (llama-instruct) - follow instructions
 * 
 * Usage:
 *   const greeting = await llmResponseNormalizer.generate('greeting', {
 *     name: 'Sammy',
 *     weather: '-5.8°C, mist',
 *     recentWork: 'The Multifaceted Role of Wives'
 *   });
 * 
 *   // With specific model type:
 *   const analysis = await llmResponseNormalizer.generate('json', context, { 
 *     modelType: 'thinking' 
 *   });
 */

export type OutputType = 'greeting' | 'json' | 'text' | 'code' | 'memory_analysis' | 'recall_response';
export type ModelType = 'base' | 'fast' | 'instruct' | 'thinking';

interface OutputPattern {
  systemPrompt: (context: Record<string, any>) => string;
  userPrompt: (context: Record<string, any>) => string;
  temperature: number;
  maxTokens: number;
  responseFormat?: { type: 'json_object' };
  postProcess: (text: string, context: Record<string, any>) => string;
}

interface ModelConfig {
  path: string;
  type: ModelType;
  supportsSystemPrompt: boolean;
  defaultTemperature: number;
  reasoningTokenPattern?: RegExp;  // Pattern to detect and strip reasoning
}

interface GenerateOptions {
  modelType?: ModelType;
  customModel?: string;
  temperature?: number;
  maxTokens?: number;
}

class LLMResponseNormalizer {
  private static instance: LLMResponseNormalizer;
  
  // 🎯 MODEL CONFIGURATIONS - Easy to add/switch models
  private readonly MODELS: Record<ModelType, ModelConfig> = {
    base: {
      path: 'accounts/fireworks/models/gpt-oss-120b',
      type: 'base',
      supportsSystemPrompt: true,
      defaultTemperature: 0.3,
      reasoningTokenPattern: /<\|(?:channel|message|end)\|>/g
    },
    fast: {
      // 20B for fast simple tasks (greetings, quick responses)
      path: 'accounts/fireworks/models/gpt-oss-20b',
      type: 'base',
      supportsSystemPrompt: true,
      defaultTemperature: 0.7
    },
    instruct: {
      // 🧠 Llama 70B instruct for complex tasks
      path: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
      type: 'instruct',
      supportsSystemPrompt: true,
      defaultTemperature: 0.6
    },
    thinking: {
      // 🎯 GPT-OSS-120B with json_schema for structured output - no DeepSeek needed
      path: 'accounts/fireworks/models/gpt-oss-120b',
      type: 'thinking',
      supportsSystemPrompt: true,
      defaultTemperature: 0.7,
      reasoningTokenPattern: /<think>[\s\S]*?<\/think>|<reasoning>[\s\S]*?<\/reasoning>/gi
    }
  };
  
  // Default model type
  private currentModelType: ModelType = 'base';
  
  // Patterns for each output type
  private readonly patterns: Record<OutputType, OutputPattern> = {
    // 🎯 GREETING: Plain text output - NO JSON needed!
    // Uses SINGLE user message (same pattern as Canvas which works with base models)
    greeting: {
      systemPrompt: () => '', // Empty - we'll merge into user message for base model compatibility
      userPrompt: (ctx) => {
        // 🎯 BUILD GREETING DIRECTLY - Don't rely on LLM to include context!
        // The LLM was ignoring the context in parentheses
        const name = ctx.name || 'there';
        const parts: string[] = [];
        
        // Start with greeting
        parts.push(`Hey ${name}!`);
        
        // Add weather/location if available
        if (ctx.weather && ctx.location) {
          parts.push(`It's ${ctx.weather} in ${ctx.location} right now.`);
        }
        
        // Add recent work context
        const recentWork = ctx.recentWork?.trim();
        const recentCourse = ctx.recentCourse?.trim();
        
        if (recentCourse) {
          parts.push(`Ready to continue with "${recentCourse}"?`);
        } else if (recentWork) {
          parts.push(`Want to keep working on "${recentWork}"?`);
        } else {
          parts.push(`What would you like to explore today?`);
        }
        
        // 🎯 DIRECT GREETING - Return the complete greeting, just ask LLM to make it warmer
        const baseGreeting = parts.join(' ');
        
        return `Make this greeting warmer and more natural (keep it 2-3 sentences max, keep all the specific details like names/weather/courses):

"${baseGreeting}"

Warmer version: `;
      },
      temperature: 0.6,
      maxTokens: 2000,
      // NO responseFormat - plain text output
      postProcess: (text, ctx) => this.cleanGreetingText(text, ctx.name)
    },
    
    json: {
      // 🎯 NOTE: Callers should use json_schema in their own LLM calls for 100% reliable parsing
      // This pattern is legacy - new code should call LLM directly with response_format: { type: 'json_schema', ... }
      systemPrompt: (_ctx) => `You are a JSON extraction API. Return ONLY valid JSON.`,
      userPrompt: (ctx) => ctx.prompt || '',
      temperature: 0.0,
      maxTokens: 2000,
      postProcess: (text) => text // With json_schema, no validation needed
    },
    
    text: {
      systemPrompt: (ctx) => ctx.systemPrompt || `You are a helpful AI assistant. Respond directly and concisely.`,
      userPrompt: (ctx) => ctx.prompt || ctx.userPrompt || '',
      temperature: 0.6,
      maxTokens: 2000,
      postProcess: (text) => this.stripReasoningTokens(text)
    },
    
    code: {
      // 🎯 NOTE: Use json_schema in direct LLM calls for 100% reliable parsing
      systemPrompt: (_ctx) => `You are a code generator API. Return JSON: {"language": "...", "code": "...", "title": "..."}`,
      userPrompt: (ctx) => `Generate code for: ${ctx.request || ctx.prompt}`,
      temperature: 0.2,
      maxTokens: 2000,
      postProcess: (text) => text
    },
    
    memory_analysis: {
      // 🎯 NOTE: MemoryOperations now uses json_schema directly for 100% reliable parsing
      systemPrompt: (_ctx) => `You are a memory analysis API. Return ONLY valid JSON with no additional text, explanations, or reasoning. Format: {"type": "store|recall|update|forget", "category": "...", "extractedData": {...}}`,
      userPrompt: (ctx) => ctx.message || '',
      temperature: 0.0, // CRITICAL: Deterministic = no reasoning tokens
      maxTokens: 500,
      postProcess: (text) => text
    },
    
    recall_response: {
      systemPrompt: (ctx) => `You are a memory recall assistant. The user asked about their memories. Respond naturally based on the data provided. Address them as ${ctx.name || 'friend'}.`,
      userPrompt: (ctx) => `User asked: "${ctx.query}"\n\nMemory data:\n${ctx.memories || 'No memories found.'}`,
      temperature: 0.6,
      maxTokens: 2000,
      postProcess: (text) => this.stripReasoningTokens(text)
    }
  };
  
  static getInstance(): LLMResponseNormalizer {
    if (!LLMResponseNormalizer.instance) {
      LLMResponseNormalizer.instance = new LLMResponseNormalizer();
    }
    return LLMResponseNormalizer.instance;
  }
  
  /**
   * 🔧 Set the default model type for all subsequent calls
   */
  setDefaultModelType(modelType: ModelType): void {
    this.currentModelType = modelType;
    console.log(`🎯 LLMResponseNormalizer: Default model type set to '${modelType}'`);
  }
  
  /**
   * 🔧 Get current model configuration
   */
  getModelConfig(modelType?: ModelType): ModelConfig {
    return this.MODELS[modelType || this.currentModelType];
  }
  
  /**
   * 🎯 MAIN API: Generate LLM output with the correct pattern
   * 
   * @param outputType - Type of output (greeting, json, text, etc.)
   * @param context - Context data for the prompt
   * @param options - Optional: model type, custom model, temperature override
   */
  async generate(
    outputType: OutputType, 
    context: Record<string, any>,
    options?: GenerateOptions
  ): Promise<string> {
    const pattern = this.patterns[outputType];
    if (!pattern) {
      throw new Error(`Unknown output type: ${outputType}`);
    }
    
    // Get model configuration
    // 🚀 FAST: Use smaller model for greetings (saves ~5 seconds)
    const modelType = outputType === 'greeting' 
      ? (options?.modelType || 'fast')  // Default to fast model for greetings
      : (options?.modelType || this.currentModelType);
    const modelConfig = this.MODELS[modelType];
    
    const modelPath = options?.customModel || modelConfig.path;
    
    const systemPrompt = pattern.systemPrompt(context);
    const userPrompt = pattern.userPrompt(context);
    
    console.log(`🎯 LLMResponseNormalizer: Generating ${outputType} with model type '${modelType}'`);
    
    try {
      // 🎯 USE TOOLREGISTRY (same pattern as commit 2bbe42f which worked!)
      const { toolRegistry } = await import('./ToolRegistry');
      
      // 🎯 BUILD PROMPT - Single string for base model compatibility
      // This is how Canvas and the old greeting code worked
      let fullPrompt: string;
      if (systemPrompt.trim()) {
        fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      } else {
        fullPrompt = userPrompt;
      }
      
      const llmResult = await toolRegistry.execute('llm-completion', {
        prompt: fullPrompt,
        model: modelPath,
        temperature: options?.temperature ?? modelConfig.defaultTemperature,
        maxTokens: options?.maxTokens ?? pattern.maxTokens
      }, { sessionId: 'greeting-generation', userId: 'system', startTime: Date.now() });
      
      // 🔍 DEBUG: Log full response structure
      console.log('🔍 LLMResponseNormalizer llmResult:', {
        success: llmResult?.success,
        hasData: !!llmResult?.data,
        dataType: typeof llmResult?.data,
        dataKeys: llmResult?.data ? Object.keys(llmResult.data).slice(0, 10) : [],
        dataPreview: JSON.stringify(llmResult?.data)?.substring(0, 300)
      });
      
      // 🔧 EXTRACT RESPONSE - handle ALL possible response structures
      // ToolRegistry wraps result: { success, data: { success, data: { completion } } }
      let rawText: string | null = null;
      
      if (llmResult?.data) {
        const outerData = llmResult.data;
        
        // Log structure to debug
        console.log('🔍 LLMResponseNormalizer: Extracting from structure:', {
          hasOuterData: !!outerData,
          outerDataKeys: outerData ? Object.keys(outerData) : [],
          hasInnerData: !!outerData?.data,
          innerDataKeys: outerData?.data ? Object.keys(outerData.data) : [],
          directCompletion: outerData?.completion,
          nestedCompletion: outerData?.data?.completion
        });
        
        // 🎯 PRIMARY PATH: ToolRegistry wraps as data.data.completion
        if (outerData?.data?.completion) {
          rawText = outerData.data.completion;
          console.log('✅ Found text at data.data.completion:', rawText?.substring(0, 100));
        }
        // 🎯 SECONDARY: Direct on data object
        else if (outerData?.completion || outerData?.response || outerData?.message) {
          rawText = outerData.completion || outerData.response || outerData.message;
          console.log('✅ Found text at data level:', rawText?.substring(0, 100));
        }
        // 🎯 TERTIARY: Nested data.data.response or data.data.message
        else if (outerData?.data?.response || outerData?.data?.message) {
          rawText = outerData.data.response || outerData.data.message;
          console.log('✅ Found text at data.data.response/message:', rawText?.substring(0, 100));
        }
        // OpenAI/Chat format
        else if (outerData?.choices?.[0]?.message?.content) {
          rawText = outerData.choices[0].message.content;
        }
        // Array format
        else if (Array.isArray(outerData) && outerData[0]?.generated_text) {
          rawText = outerData[0].generated_text;
        }
        else if (Array.isArray(outerData?.data) && outerData.data[0]?.generated_text) {
          rawText = outerData.data[0].generated_text;
        }
        // Direct string
        else if (typeof outerData === 'string') {
          rawText = outerData;
        }
        
        // 🔧 LAST RESORT: Recursive search
        if (!rawText && typeof outerData === 'object') {
          const findText = (obj: any, depth = 0): string | null => {
            if (depth > 5) return null;
            if (typeof obj === 'string' && obj.length > 10) return obj;
            if (Array.isArray(obj)) {
              for (const item of obj) {
                const found = findText(item, depth + 1);
                if (found) return found;
              }
            } else if (obj && typeof obj === 'object') {
              for (const key of ['completion', 'response', 'message', 'text', 'content', 'generated_text']) {
                if (typeof obj[key] === 'string' && obj[key].length > 5) return obj[key];
              }
              for (const value of Object.values(obj)) {
                const found = findText(value, depth + 1);
                if (found) return found;
              }
            }
            return null;
          };
          rawText = findText(outerData);
          if (rawText) console.log('✅ Found text via recursive search:', rawText?.substring(0, 100));
        }
      }
      
      if (!rawText) {
        console.warn(`⚠️ LLMResponseNormalizer: No response text for ${outputType}`);
        console.warn('🔍 Full llmResult structure:', JSON.stringify(llmResult, null, 2)?.substring(0, 1000));
        return this.getFallback(outputType, context);
      }
      
      // 🧠 STRIP REASONING TOKENS (for base and thinking models)
      if (modelConfig.reasoningTokenPattern) {
        rawText = this.stripModelReasoningTokens(rawText, modelConfig.reasoningTokenPattern);
      }
      
      // Apply output-type-specific post-processing
      let processed = pattern.postProcess(rawText, context);
      
      // 🎯 FINAL SANITIZATION: Remove any UUIDs from the response
      // This ensures we NEVER expose technical IDs to the user
      processed = this.sanitizeUUIDsFromResponse(processed);
      
      console.log(`✅ LLMResponseNormalizer: Generated ${outputType} (${processed.length} chars) via ${modelType}`);
      return processed;
      
    } catch (error) {
      console.error(`❌ LLMResponseNormalizer: Failed for ${outputType}:`, error);
      return this.getFallback(outputType, context);
    }
  }
  
  /**
   * 🧠 STRIP MODEL-SPECIFIC REASONING TOKENS
   * Different models use different reasoning token formats
   */
  private stripModelReasoningTokens(text: string, pattern: RegExp): string {
    if (!text) return text;
    
    // Check if reasoning tokens are present
    if (pattern.test(text)) {
      console.log('🧠 LLMResponseNormalizer: Stripping reasoning tokens');
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      return text.replace(pattern, '').trim();
    }
    
    return text;
  }
  
  /**
   * 🎯 SANITIZE UUIDs FROM RESPONSE
   * Prevents LLM from exposing technical identifiers to users
   */
  private sanitizeUUIDsFromResponse(text: string): string {
    if (!text) return text;
    
    // UUID pattern: 8-4-4-4-12 hex characters
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    
    // Canvas element ID pattern
    const canvasIdPattern = /canvas-\d+-[a-z0-9]+/gi;
    
    // Check if we need to sanitize
    if (uuidPattern.test(text) || canvasIdPattern.test(text)) {
      console.log('🔒 LLMResponseNormalizer: Sanitizing UUIDs from response');
      // Reset lastIndex
      uuidPattern.lastIndex = 0;
      canvasIdPattern.lastIndex = 0;
      
      return text
        .replace(uuidPattern, 'the document')
        .replace(canvasIdPattern, 'the document');
    }
    
    return text;
  }
  
  /**
   * 🧹 POST-PROCESSORS
   */
  
  /**
   * 🎯 CLEAN GREETING TEXT (Plain text output)
   * No JSON parsing needed - just clean up the raw greeting text
   */
  private cleanGreetingText(text: string, name?: string): string {
    const fallback = `Hey ${name || 'there'}! Great to see you. How can I help?`;
    if (!text) return fallback;
    
    let cleaned = text.trim();
    
    // Remove any markdown formatting
    cleaned = cleaned.replace(/^```.*$/gm, '').trim();
    
    // Remove any JSON wrapper if model still outputs it
    if (cleaned.startsWith('{') && cleaned.includes('greeting')) {
      try {
        const json = JSON.parse(cleaned);
        cleaned = json.greeting || json.message || json.text || cleaned;
      } catch { /* not JSON, use as-is */ }
    }
    
    // Remove quotes at start/end
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
    
    // The prompt already starts with "Hey {name}!" so the model continues from there
    // Prepend "Hey {name}! " if the model didn't include it
    if (!cleaned.match(/^(Hey|Hi|Hello|Good|Welcome|Greetings)/i)) {
      cleaned = `Hey ${name || 'there'}! ${cleaned}`;
    }
    
    // Limit to 3 sentences
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    const result = sentences.slice(0, 3).join(' ').trim();
    
    return result.length > 10 ? result : fallback;
  }

  private validateJSON(text: string): string {
    try {
      // Try to parse as-is
      JSON.parse(text);
      return text;
    } catch {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          JSON.parse(jsonMatch[0]);
          return jsonMatch[0];
        } catch {
          // Return empty object as safe fallback
          return '{}';
        }
      }
      return '{}';
    }
  }
  
  private stripReasoningTokens(text: string): string {
    if (!text) return text;
    
    // 🧠 COMPREHENSIVE REASONING TOKEN PATTERNS
    // Supports multiple model formats for future compatibility
    
    // 1. Base model tokens (gpt-oss-120b)
    if (text.includes('<|channel|>') || text.includes('<|message|>')) {
      const messageMatch = text.match(/<\|message\|>([^<]+)/s);
      if (messageMatch && messageMatch[1]?.trim().length > 10) {
        return messageMatch[1].trim();
      }
      return text.replace(/<\|[^|]+\|>/g, '').trim();
    }
    
    // 2. DeepSeek R1/V3 style: <think>...</think> or <thinking>...</thinking>
    if (text.includes('<think>') || text.includes('<thinking>')) {
      const thinkStripped = text
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .trim();
      if (thinkStripped.length > 10) return thinkStripped;
    }
    
    // 3. Generic reasoning blocks: <reasoning>...</reasoning>
    if (text.includes('<reasoning>')) {
      const reasoningStripped = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').trim();
      if (reasoningStripped.length > 10) return reasoningStripped;
    }
    
    // 4. Bracket notation: [thinking]...[/thinking]
    if (text.includes('[thinking]')) {
      const bracketStripped = text.replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, '').trim();
      if (bracketStripped.length > 10) return bracketStripped;
    }
    
    // 5. OpenAI o1 style: reasoning is in separate field, but may leak
    // Pattern: "Let me think..." or "I need to..." before actual response
    const thinkingPhrases = /^(Let me think|I need to|First,? let me|To answer|I'll|I will|Let's|Okay,? so)\b/i;
    if (thinkingPhrases.test(text)) {
      // Look for actual response after reasoning
      const responsePatterns = [
        /(?:Here's|Here is|The answer is|Based on|In summary)(.+)/is,
        /(?:\n\n)([^<]+)$/s  // Last paragraph after double newline
      ];
      for (const pattern of responsePatterns) {
        const match = text.match(pattern);
        if (match && match[1]?.trim().length > 10) {
          return match[1].trim();
        }
      }
    }
    
    return text.trim();
  }
  
  /**
   * 📋 FALLBACKS - Build proper greetings with ALL context data
   */
  private getFallback(outputType: OutputType, context: Record<string, any>): string {
    // 🔍 DEBUG: Log the context we received
    console.log('🔍 LLMResponseNormalizer.getFallback called with context:', JSON.stringify(context, null, 2));
    
    switch (outputType) {
      case 'greeting':
        // 🎯 BUILD A PROPER GREETING WITH ALL THE DATA WE HAVE
        const name = context.name || 'there';
        const parts: string[] = [];
        
        // Greeting with name
        parts.push(`Hey ${name}!`);
        
        // Weather and location
        if (context.weather && context.location) {
          parts.push(`It's ${context.weather} in ${context.location}.`);
        } else if (context.location) {
          parts.push(`Hope you're doing well in ${context.location}!`);
        } else {
          parts.push(`Great to see you!`);
        }
        
        // Recent work/course
        if (context.recentCourse) {
          parts.push(`Ready to continue with "${context.recentCourse}"?`);
        } else if (context.recentWork) {
          parts.push(`Want to keep working on "${context.recentWork}"?`);
        } else {
          parts.push(`What would you like to explore today?`);
        }
        
        return parts.join(' ');
        
      case 'json':
      case 'code':
      case 'memory_analysis':
        return '{}';
      case 'text':
      case 'recall_response':
        return "I'm here to help! What would you like to know?";
      default:
        return '';
    }
  }
  
  /**
   * 🔒 ROBUST JSON PARSER - PUBLIC STATIC METHOD
   * Use this whenever parsing LLM output that should be JSON.
   * Handles: reasoning tokens, markdown code blocks, malformed JSON
   * 
   * Usage:
   *   import { LLMResponseNormalizer } from './LLMResponseNormalizer';
   *   const parsed = LLMResponseNormalizer.safeParseJSON(llmOutput);
   */
  static safeParseJSON(content: any): any {
    if (!content) return null;
    if (typeof content !== 'string') return content;
    
    let text = content.trim();
    
    // 🔍 DEBUG: Log what we're trying to parse
    console.log('🔍 safeParseJSON input (first 300 chars):', text.substring(0, 300));
    
    // 1. Strip reasoning tokens (DeepSeek, o1-style, base model)
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    text = text.replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, '');
    text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
    text = text.replace(/<\|[^|]+\|>/g, '');  // Base model tokens
    
    // 🔧 AGGRESSIVE: Strip GPT-OSS chain-of-thought reasoning patterns
    // These patterns indicate the model is explaining instead of outputting JSON
    const reasoningPreambles = [
      /^We need to output[\s\S]*?(?=\{)/i,
      /^We must follow[\s\S]*?(?=\{)/i,
      /^The (?:user|schema|instruction|message)[\s\S]*?(?=\{)/i,
      /^(?:So|Thus|Therefore|Hence),?\s*(?:we|I)[\s\S]*?(?=\{)/i,
      /^Let me analyze[\s\S]*?(?=\{)/i,
      /^I(?:'d| would| will| should| need)[\s\S]*?(?=\{)/i,
      /^(?:First|Now|Next|Okay),?\s*[\s\S]*?(?=\{)/i,
      /^Based on[\s\S]*?(?=\{)/i,
      /^To classify[\s\S]*?(?=\{)/i,
      /^Looking at[\s\S]*?(?=\{)/i,
      /^Analyzing[\s\S]*?(?=\{)/i,
    ];
    
    for (const pattern of reasoningPreambles) {
      if (pattern.test(text)) {
        text = text.replace(pattern, '').trim();
        console.log('🔧 safeParseJSON: Stripped reasoning preamble');
        break;
      }
    }
    
    // If still no JSON, find where it actually starts
    if (!text.startsWith('{') && !text.startsWith('[')) {
      const jsonStart = text.search(/[\[{]/);
      if (jsonStart > 0) {
        console.log('🔧 safeParseJSON: Stripping', jsonStart, 'chars of reasoning before JSON');
        text = text.substring(jsonStart);
      }
    }
    
    // 2. Strip markdown code blocks
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      text = jsonBlockMatch[1].trim();
    }
    
    // 3. Find JSON object boundaries
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    } else {
      // Also try array
      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        text = text.substring(firstBracket, lastBracket + 1);
      }
    }
    
    // 🔧 NEW: Handle truncated JSON by attempting to close it
    if (text.startsWith('{') && !text.endsWith('}')) {
      console.log('🔧 safeParseJSON: Attempting to fix truncated JSON object');
      // Count open braces and close them
      const openBraces = (text.match(/{/g) || []).length;
      const closeBraces = (text.match(/}/g) || []).length;
      const missing = openBraces - closeBraces;
      if (missing > 0 && missing < 5) {
        // Try to close properly - first close any open strings
        if (text.match(/"[^"]*$/)) {
          text += '"';
        }
        text += '}'.repeat(missing);
      }
    }
    
    // 4. Try parsing
    try {
      return JSON.parse(text);
    } catch {
      // 5. Fix common issues: unquoted keys, single quotes, trailing commas
      try {
        let fixed = text
          .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')  // Unquoted keys
          .replace(/'/g, '"')                             // Single quotes
          .replace(/,(\s*[}\]])/g, '$1');                 // Trailing commas
        return JSON.parse(fixed);
      } catch {
        console.warn('⚠️ LLMResponseNormalizer.safeParseJSON: JSON parse failed even after fixes');
        return null;
      }
    }
  }
}

// Export singleton instance
export const llmResponseNormalizer = LLMResponseNormalizer.getInstance();
export { LLMResponseNormalizer };

