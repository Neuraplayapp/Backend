// Platform-aware AI Service - Now using centralized AIRouter
// import { getIntelligentSearchDetector } from './IntelligentSearchDetector'; // DISABLED - was causing automatic search triggering
import { serviceContainer } from './ServiceContainer';
import { getLanguageSystemPrompt, getCurrentLanguageName, getCurrentLanguage } from '../utils/languageUtils';

// Configuration: Conversation memory management
const MAX_CONVERSATION_EXCHANGES = 25; // INCREASED: Number of user-assistant exchanges to remember (was 15, now 25)
const MAX_CONVERSATION_MESSAGES = MAX_CONVERSATION_EXCHANGES * 2; // Total messages (user + assistant)

class AIService {
  private platform: string;
  private apiBase: string;
  private wsEnabled: boolean;
  private aiRouter: any;

  constructor() {
    // Detect platform from environment or default to local
    this.platform = import.meta.env.VITE_PLATFORM || 'local';
    this.apiBase = import.meta.env.VITE_API_BASE || 
                   (this.platform === 'netlify' ? '/.netlify/functions' : '/api');
    this.wsEnabled = import.meta.env.VITE_WS_ENABLED === 'true' || this.platform === 'render';
    // Get aiRouter from serviceContainer when needed
    
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log(`🤖 AI Service initialized for platform: ${this.platform}`);
      console.log(`🔗 API Base: ${this.apiBase}`);
      console.log(`🔌 WebSocket Enabled: ${this.wsEnabled}`);
      console.log(`🎯 Using centralized AI Router`);
    }
  }

  // Enhanced API call method with streaming and cancellation support
  async apiCall(endpoint: string, options: RequestInit & { 
    streaming?: boolean; 
    abortController?: AbortController;
  } = {}): Promise<any | Response> {
    const { streaming = false, abortController, ...fetchOptions } = options;
    const url = `${this.apiBase}${endpoint}`;
    
    if (import.meta.env.DEV) {
      console.log(`🚨 DEBUG: API construction:`, {
        apiBase: this.apiBase,
        endpoint: endpoint,
        finalURL: url,
        streaming,
        hasAbortController: !!abortController
      });
      console.log(`🌐 Making API call to: ${url}`);
    }
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
        signal: abortController?.signal, // Add abort signal
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      // For streaming responses, return the Response object directly
      if (streaming) {
        return response;
      }

      // For regular responses, parse JSON as before
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (import.meta.env.DEV) {
          console.log(`⚠️ API call cancelled for ${endpoint}`);
        }
        throw new Error('Request was cancelled');
      }
      
      if (import.meta.env.DEV) {
        console.error(`❌ API call error for ${endpoint}:`, error);
      }
      throw error;
    }
  }

  // Utility method to create abort controller for request cancellation
  createAbortController(timeoutMs?: number): AbortController {
    const controller = new AbortController();
    
    if (timeoutMs) {
      setTimeout(() => {
        controller.abort();
      }, timeoutMs);
    }
    
    return controller;
  }

  // ElevenLabs TTS
  async textToSpeech(text: string, voiceId: string = '8LVfoRdkh4zgjr8v5ObE') {
    return this.apiCall('/elevenlabs-tts', {
      method: 'POST',
      body: JSON.stringify({ text, voiceId }),
    });
  }

  // ElevenLabs Streaming TTS with enhanced streaming support
  async streamingTextToSpeech(
    text: string, 
    voiceId: string = '8LVfoRdkh4zgjr8v5ObE',
    abortController?: AbortController
  ): Promise<Response> {
    return this.apiCall('/elevenlabs-streaming-tts', {
      method: 'POST',
      body: JSON.stringify({ text, voiceId }),
      streaming: true, // Enable streaming mode
      abortController, // Allow request cancellation
    }) as Promise<Response>;
  }

  // Cancellable streaming TTS with timeout
  async streamingTextToSpeechWithTimeout(
    text: string, 
    voiceId: string = '8LVfoRdkh4zgjr8v5ObE',
    timeoutMs: number = 30000
  ): Promise<{ response: Response; cancel: () => void }> {
    const controller = this.createAbortController(timeoutMs);
    
    const response = await this.streamingTextToSpeech(text, voiceId, controller);
    
    return {
      response,
      cancel: () => controller.abort()
    };
  }

  // AssemblyAI Transcription
  async transcribeAudio(audioData: string) {
    return this.apiCall('/assemblyai-transcribe', {
      method: 'POST',
      body: JSON.stringify({ audio: audioData }),
    });
  }

  // Ably Auth
  async getAblyToken() {
    return this.apiCall('/ably-auth', {
      method: 'GET',
    });
  }

  // Generic OpenAI API
  async openAICall(message: string, model: string = 'gpt-3.5-turbo') {
    return this.apiCall('/api', {
      method: 'POST',
      body: JSON.stringify({ message, model }),
    });
  }

  // Get tool definitions for the AI model
  private getToolDefinitions() {
    return [
      // CLIENT-SIDE TOOLS (handled by ToolExecutorService)
      {
        "type": "function",
        "function": {
          "name": "navigate_to_page",
          "description": "Navigate the user to a different page within the NeuraPlay application. Use this when users want to go to specific sections like playground, dashboard, forum, or profile.",
          "parameters": {
            "type": "object",
            "properties": {
              "page": {
                "type": "string",
                "enum": ["playground", "dashboard", "forum", "profile", "home", "about"],
                "description": "The page to navigate to"
              },
              "reason": {
                "type": "string",
                "description": "Optional reason for navigation"
              }
            },
            "required": ["page"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "update_settings",
          "description": "Update user settings like theme, accessibility, or preferences. Use this when users want to change their experience.",
          "parameters": {
            "type": "object",
            "properties": {
              "setting": {
                "type": "string",
                "enum": ["theme", "accessibility", "notifications", "language"],
                "description": "The setting to update"
              },
              "value": {
                "type": "string",
                "description": "The new value for the setting"
              }
            },
            "required": ["setting", "value"]
          }
        }
      },
      
      // SERVER-SIDE TOOLS (handled by server.cjs)
      {
        "type": "function",
        "function": {
          "name": "generate_image",
          "description": "Creates, generates, draws, or makes a visual image based on a user's textual description. Use this for any visual request.",
          "parameters": {
            "type": "object",
            "properties": {
              "prompt": {
                "type": "string",
                "description": "A detailed text description of the image to be generated. For example, 'a futuristic city with flying cars'."
              },
              "style": {
                "type": "string",
                "enum": ["photorealistic", "cartoon", "watercolor", "3d-render", "pixel-art", "child-friendly"],
                "description": "Optional artistic style for the image."
              }
            },
            "required": ["prompt"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "web_search",
          "description": "Search the web for current information, news, or specific topics. Use this when users ask about current events, want to search for information, or need up-to-date data.",
          "parameters": {
            "type": "object",
            "properties": {
              "query": {
                "type": "string",
                "description": "The search query to look up on the web"
              }
            },
            "required": ["query"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get current weather information for a specific location. Use this when users ask about weather conditions.",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The city, state/country, or location to get weather for"
              }
            },
            "required": ["location"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "scribble_chart_create",
          "description": "Create interactive charts, graphs, or visualizations on the canvas. Use this for any mathematical, statistical, or data visualization request.",
          "parameters": {
            "type": "object",
            "properties": {
              "concept": {
                "type": "string",
                "description": "The type of diagram to create (e.g., 'bar chart', 'pie chart', 'line graph', 'scatter plot', 'histogram')"
              },
              "data": {
                "type": "object",
                "description": "The data or mathematical concept to visualize"
              },
              "title": {
                "type": "string",
                "description": "Title for the diagram"
              }
            },
            "required": ["concept"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "get_wikipedia_summary",
          "description": "Fetch a concise Wikipedia summary (with thumbnail if available) for a topic or entity.",
          "parameters": {
            "type": "object",
            "properties": {
              "query": { "type": "string", "description": "Topic or entity to look up" }
            },
            "required": ["query"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "web_news_search",
          "description": "Search recent news using Serper and return a curated list of articles.",
          "parameters": {
            "type": "object",
            "properties": {
              "query": { "type": "string", "description": "News query" },
              "timeRange": { "type": "string", "enum": ["day", "week", "month"], "description": "Optional recency filter" }
            },
            "required": ["query"]
          }
        }
      },

    ];
  }

  // NEW: Enhanced AI Router integration method
  async sendMessageWithRouter(message: string, context?: any, enableToolCalling: boolean = true): Promise<any> {
    if (!message || typeof message !== 'string') {
      throw new Error('Invalid message: must be a non-empty string');
    }

    console.log('🎯 Using AI Router for message processing:', {
      messageLength: message.length,
      hasContext: !!context,
      enableToolCalling,
      platform: this.platform
    });

    const sessionId = context?.session?.id || `session_${Date.now()}`;
    
    try {
      // Route through the centralized AI Router
      const aiRouter = serviceContainer.get('aiRouter') as any;
      const aiResponse = await aiRouter.processRequest({
        message,
        sessionId,
        userId: context?.user?.id,
        context,
        mode: enableToolCalling ? 'agent' : 'chat',
        constraints: {
          maxTokens: 2000,
          temperature: 0.7,
          timeoutMs: 120000
        }
      });

      console.log('🎯 AI Router response:', aiResponse);

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI Router failed');
      }

      // Transform the response to match the expected format
      return {
        generated_text: aiResponse.response,
        textResponse: aiResponse.response,
        toolResults: aiResponse.toolResults || [],
        metadata: aiResponse.metadata,
        success: true
      };

    } catch (error) {
      console.error('❌ AI Router error:', error);
      throw error;
    }
  }

  // Enhanced AI Message with Tool Calling Support (Legacy method)
  // ⚠️ IMPORTANT: This service requires Render environment with Fireworks API key (Neuraplay env var)
  // Local testing will fail with "unauthorized" - this is expected and normal
  async sendMessage(
    text: string, 
    context?: any, 
    enableToolCalling: boolean = true,
    options?: {
      streaming?: boolean;
      abortController?: AbortController;
      timeout?: number;
    }
  ): Promise<{
    generated_text: string;
    tool_calls: any[];
    tool_results: any[];
  } | Response> {
    const { streaming = false, abortController, timeout } = options || {};
    
    console.log('🔍 AI Service Debug - Input:', { 
      text, enableToolCalling, context, streaming, hasAbortController: !!abortController, timeout 
    });
    
    // 🧠 INTELLIGENT SEARCH DETECTION - DISABLED TO PREVENT AUTOMATIC TRIGGERING
    // The AI should decide when to call web-search tool, not automatically detect it
    // This was causing searches to trigger on every message and return raw URLs
    // Instead, let the AI's tool-calling capabilities handle search requests naturally
    /*
    if (enableToolCalling) {
      const intelligentSearchDetector = getIntelligentSearchDetector();
      const searchAnalysis = intelligentSearchDetector.shouldTriggerSearch(text);
      if (searchAnalysis.shouldSearch) {
        console.log('🔍 Intelligent Search Triggered:', searchAnalysis);
        
        // Enhance the user message to include search context
        const enhancedQuery = searchAnalysis.searchQuery || text;
        const searchPrompt = `The user asked: "${text}". This appears to be about ${searchAnalysis.category} (${(searchAnalysis.confidence * 100).toFixed(0)}% confidence). Please search for current information using: "${enhancedQuery}" and then provide a comprehensive answer.`;
        
        // Override the text with search-enhanced prompt
        text = searchPrompt;
        console.log('🔍 Enhanced query for AI:', text);
      }
    }
    */
    
    // Image generation is now handled by the intelligent agentic tool-calling system
    // The GPT-OSS model decides when to call generate_image tool

    console.log('🔍 AI Service Debug - Will call apiBase + /api = /api');
    
    // Create timeout controller if specified
    const controller = abortController || (timeout ? this.createAbortController(timeout) : undefined);
    
    // Prepare system prompt with tool calling instructions and language context
    let systemPrompt = enableToolCalling 
      ? this.getToolCallingSystemPrompt(context)
      : this.getStandardSystemPrompt();
    
    // Add language context if provided
    if (context?.language) {
      console.log('🔍 AI Service Debug - Language Context:', context.language);
      systemPrompt += `\n\nIMPORTANT: The user is speaking in ${context.language}. Please respond in the same language unless they specifically ask you to translate or respond in another language.`;
    }

    try {
      console.log('🔍 AI Service Debug - Sending request with tool calling:', enableToolCalling, 'streaming:', streaming);
      
      // Construct message history with conversation context
      const messages: any[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Add conversation history if available (for AI continuity)
      // Implement sliding window: keep only last 15 exchanges (30 messages max)
      if (context?.conversationHistory && context.conversationHistory.length > 0) {
        const MAX_HISTORY_MESSAGES = MAX_CONVERSATION_MESSAGES;
        
        // Take only the most recent messages to prevent context pollution
        const recentHistory = context.conversationHistory.slice(-MAX_HISTORY_MESSAGES);
        
        console.log('🧠 AI Service Debug - Total history available:', context.conversationHistory.length, 'messages');
        console.log('🧠 AI Service Debug - Using recent history:', recentHistory.length, 'messages (sliding window)');
        
        // Convert conversation history to proper message format
        const historyMessages = recentHistory.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content || msg.text || '',
          ...(msg.hasImage && { 
            // Note that this message contained an image
            content: (msg.content || msg.text || '') + ' [This message included an image]'
          })
        }));
        
        messages.push(...historyMessages);
      }

      // Add current user message
      messages.push({ role: 'user', content: text });

      console.log('🧠 AI Service Debug - Total messages being sent to AI:', messages.length);
      console.log('🧠 AI Service Debug - Message structure:', messages.map(m => ({ role: m.role, contentLength: m.content?.length || 0 })));

      const response = await this.apiCall('/api', {
        method: 'POST',
        body: JSON.stringify({
          task_type: 'chat',
          input_data: {
            messages,
            tools: enableToolCalling ? this.getToolDefinitions() : undefined,
            tool_choice: enableToolCalling ? 'auto' : undefined,
            max_tokens: 1500, // Increased for better responses with context
            temperature: 0.7
          }
        }),
        streaming, // Pass streaming option
        abortController: controller // Pass abort controller
      });

      console.log('🔍 AI Service Debug - Raw Response:', response);

      // For streaming responses, return the Response object directly
      if (streaming && response instanceof Response) {
        console.log('🔍 AI Service Debug - Returning streaming response');
        return response;
      }

      // Handle the response format from the server
      if (Array.isArray(response) && response.length > 0) {
        const firstResponse = response[0];
        console.log('🔍 AI Service Debug - Tool Calls Found:', firstResponse.tool_calls?.length || 0);
        console.log('🔍 AI Service Debug - Tool Results Found:', firstResponse.tool_results?.length || 0);
        
        // 🔍 COMPREHENSIVE IMAGE DEBUGGING IN AI SERVICE
        if (firstResponse.tool_results && firstResponse.tool_results.length > 0) {
          console.log('🔍 AI Service - Detailed tool results analysis:', {
            totalResults: firstResponse.tool_results.length,
            results: firstResponse.tool_results.map((result: any, index: number) => ({
              index,
              success: result?.success,
              hasData: !!result?.data,
              hasImageUrl: !!(result?.data?.image_url),
              imageUrlLength: result?.data?.image_url?.length || 0,
              imageUrlType: typeof result?.data?.image_url,
              message: result?.message,
              dataStructure: result?.data ? Object.keys(result.data) : []
            }))
          });
          
          // Check for image results specifically
          const imageResults = firstResponse.tool_results.filter((r: any) => r?.data?.image_url);
          if (imageResults.length > 0) {
            console.log('🔍 AI Service - Found images to pass to frontend:', imageResults.length);
            imageResults.forEach((result: any, index: number) => {
              console.log(`🔍 AI Service - Image ${index}:`, {
                isValidDataUrl: result.data.image_url.startsWith('data:image/'),
                size: result.data.image_url.length,
                preview: result.data.image_url.substring(0, 100) + '...'
              });
            });
          } else {
            console.log('🔍 AI Service - No image URLs found in tool results');
          }
        }
        
        return {
          generated_text: firstResponse.generated_text || 'No response received',
          tool_calls: firstResponse.tool_calls || [],
          tool_results: firstResponse.tool_results || []
        };
      } else if (typeof response === 'string') {
        console.log('🔍 AI Service Debug - String response, no tool calls');
        return {
          generated_text: response,
          tool_calls: [],
          tool_results: []
        };
      } else if (response && typeof response === 'object') {
        console.log('🔍 AI Service Debug - Object response');
        return {
          generated_text: response.generated_text || response.text || 'No response received',
          tool_calls: response.tool_calls || [],
          tool_results: response.tool_results || []
        };
      } else {
        console.log('🔍 AI Service Debug - No valid response');
        return {
          generated_text: 'No response received',
          tool_calls: [],
          tool_results: []
        };
      }
    } catch (error) {
      console.error('🔍 AI Service Debug - Error:', error);
      throw error;
    }
  }

  // Streaming sendMessage with timeout and cancellation
  async streamingMessageWithTimeout(
    text: string,
    context?: any,
    enableToolCalling: boolean = true,
    timeoutMs: number = 30000
  ): Promise<{ response: Response; cancel: () => void }> {
    const controller = this.createAbortController(timeoutMs);
    
    const response = await this.sendMessage(text, context, enableToolCalling, {
      streaming: true,
      abortController: controller
    }) as Response;
    
    return {
      response,
      cancel: () => controller.abort()
    };
  }

  // Image generation is now handled by the intelligent agentic tool-calling system
  // The GPT-OSS model will decide when to call the generate_image tool and the server handles execution

  // Enhanced pedagogical system prompt with tool calling instructions
  private getToolCallingSystemPrompt(context?: any): string {
    // Get user's preferred language for responses
    const languagePrefix = getLanguageSystemPrompt();
    const currentLang = getCurrentLanguageName();
    const langCode = getCurrentLanguage();
    
    // Build language instruction if not English
    const languageInstruction = langCode !== 'en' 
      ? `\n\n🌍 LANGUAGE REQUIREMENT: The user's preferred language is ${currentLang}. Respond in ${currentLang} unless they explicitly request another language. All explanations, examples, and content should be in ${currentLang}.`
      : '';
    
    return `${languagePrefix}CRITICAL: You are continuing an ongoing conversation as NeuraPlay AI - do NOT introduce yourself or say "I'm NeuraPlay AI" unless this is genuinely the first message of the conversation. Maintain conversation flow.
${languageInstruction}

You specialize in pedagogical excellence, combining cognitive science research with engaging, visual learning approaches.

🧠 PEDAGOGICAL CORE PRINCIPLES:
- **Multi-Modal Learning**: Use text, visuals, and interactive elements together
- **Scaffolded Understanding**: Build from simple concepts to complex ones
- **Visual Mathematics**: Always create diagrams, graphs, and illustrations for mathematical concepts
- **Memory Enhancement**: Provide memorable examples, analogies, and visual mnemonics
- **Cognitive Load Management**: Break complex topics into digestible chunks

🛠️ TOOL CALLING BEHAVIOR:
- **Image Generation**: For ANY request to "make", "create", "draw", "generate", or "show" an image, ALWAYS use the generate_image tool
- **Proactive Visual Creation**: For ANY math/science question, immediately generate illustrative diagrams/graphs
- **Context-Aware Tools**: Use conversation history to provide more relevant responses
- **Educational Enhancement**: When explaining concepts, create visual aids automatically
- **Accessibility First**: Use accessibility tools preemptively when needed
 - **Accessibility First**: Use accessibility tools preemptively when needed
 - **Wikipedia**: When the user mentions "wiki" or "wikipedia", or asks "what is X" about a notable entity/topic, CALL get_wikipedia_summary with the entity/topic string
 - **News**: When the user asks about current events, latest updates, or recent happenings on a topic/person, CALL web_news_search (default timeRange=week)

📊 VISUAL LEARNING SPECIALIZATION:
- **Mathematical Illustrations**: Distance calculations → orbital diagrams with scale comparisons
- **Data Visualization**: Always create charts/graphs for numerical data
- **Step-by-Step Visuals**: Break complex processes into illustrated steps
- **Pedagogical Graphics**: Use colors, labels, and clear formatting for educational impact

🎯 CONVERSATION MEMORY:
- Remember previous conversation context: ${context?.conversationHistory ? 'YES - ' + context.conversationHistory.length + ' messages' : 'NO'}
- Reference earlier topics and build upon them
- Connect new concepts to previously discussed material
- Maintain learning progression throughout the conversation

🌟 RESPONSE STYLE:
- **Enthusiastic Educator**: Show excitement for learning and discovery
- **Clear Explanations**: Use analogies, real-world examples, and step-by-step breakdowns
- **Visual-First Approach**: "Let me show you..." instead of just "Let me tell you..."
- **Encouraging**: Celebrate understanding and curiosity

🔧 TOOL USAGE EXAMPLES:
- User says "make an image of a cat" → CALL generate_image tool with prompt="cute cat with whiskers, child-friendly style"
- User says "create a picture of a dog" → CALL generate_image tool immediately
- User says "draw me a house" → CALL generate_image tool for house illustration
- User says "weather in London" → CALL get_weather tool for London
- User says "search for cats" → CALL web_search tool with query="cats"

Current context: ${JSON.stringify(context || {})}`;
  }

  // Enhanced standard system prompt for pedagogical excellence
  private getStandardSystemPrompt(): string {
    return `Continue the conversation as NeuraPlay AI, an educational assistant. Maintain the ongoing conversation flow while applying these principles:

🎓 PEDAGOGICAL APPROACH:
- **Visual Learning**: Describe concepts with rich, detailed imagery and step-by-step illustrations
- **Mathematical Clarity**: Break down formulas, calculations, and concepts with clear explanations
- **Multi-Sensory Teaching**: Use analogies, real-world examples, and memorable comparisons
- **Progressive Difficulty**: Start simple and gradually build complexity

🧮 MATHEMATICAL EXPERTISE:
- Always show calculation steps clearly
- Provide intuitive explanations for mathematical concepts
- Use real-world examples (like distance to moon = X football fields)
- Create memorable mnemonics and analogies

💡 TEACHING PRINCIPLES:
- **Curiosity-Driven**: Encourage questions and exploration
- **Patient Guidance**: Never rush, always explain thoroughly
- **Positive Reinforcement**: Celebrate understanding and progress
- **Adaptive Learning**: Adjust explanations based on comprehension level

🎯 RESPONSE FORMATTING:
- Use **bold** for key concepts and important information
- Create clear section breaks and organized information
- Include practical examples and applications
- Make complex topics accessible and engaging`;
  }

  // Contact Form
  async submitContactForm(data: { name: string; email: string; message: string }) {
    return this.apiCall('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Test ElevenLabs API
  async testElevenLabs() {
    return this.apiCall('/test-elevenlabs', {
      method: 'GET',
    });
  }

  // WebSocket connection (only available on Render)
  getWebSocketUrl(): string | null {
    if (!this.wsEnabled) {
      if (import.meta.env.DEV) {
        console.log('⚠️ WebSocket not available on this platform');
      }
      return null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  // Platform information
  getPlatformInfo() {
    return {
      platform: this.platform,
      apiBase: this.apiBase,
      wsEnabled: this.wsEnabled,
    };
  }

  // Test basic API call without tool calling
  async testBasicAPI(text: string): Promise<string> {
    try {
      const response = await this.apiCall('/api', {
        method: 'POST',
        body: JSON.stringify({
          task_type: 'chat',
          input_data: {
            messages: [
              { role: 'system', content: 'You are Neural AI, an advanced educational AI teacher specializing in visual learning and mathematical concepts. Always provide clear, step-by-step explanations with rich examples and analogies.' },
              { role: 'user', content: text }
            ],
            max_tokens: 1000,
            temperature: 0.7
          }
        })
      });
      
      console.log('🔧 DEBUG: Raw AI service response:', response);
      console.log('🔧 DEBUG: Response type:', typeof response);
      console.log('🔧 DEBUG: Is array:', Array.isArray(response));
      
      // Handle the response format from the server
      if (Array.isArray(response) && response.length > 0) {
        console.log('🔧 DEBUG: Processing array response:', response[0]);
        return response[0].generated_text || 'No response received';
      } else if (typeof response === 'string') {
        console.log('🔧 DEBUG: Processing string response');
        return response;
      } else if (response.response) {
        console.log('🔧 DEBUG: Processing object response with .response');
        return response.response;
      } else {
        console.log('🔧 DEBUG: No valid response format found');
        return 'No response received';
      }
    } catch (error) {
      console.error('Test API error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService; 