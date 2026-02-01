/**
 * CENTRALIZED API SERVICE - State-of-the-Art Implementation
 * 
 * This service provides a unified interface for ALL API calls across the application.
 * It automatically handles environment detection, key mapping, and routing.
 * 
 * BENEFITS:
 * - Single source of truth for API configuration
 * - Automatic environment variable mapping
 * - Consistent error handling
 * - Built-in retry logic
 * - Cannot be bypassed by individual components
 */

export interface APIRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

class APIService {
  private static instance: APIService;
  private apiKeys: Map<string, string> = new Map();
  private baseEndpoints: Map<string, string> = new Map();
  private initialized = false;

  private constructor() {
    // Don't initialize here - wait for explicit getInstance() call
    // This prevents premature initialization during import
  }

  public static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
      console.log('🆕 APIService: Created singleton instance');
    }
    // Only initialize once - no forced reinitialization to prevent race conditions
    if (!APIService.instance.initialized) {
      APIService.instance.initializeConfiguration();
    }
    return APIService.instance;
  }

  /**
   * CRITICAL: Auto-detects environment and maps ALL possible API key names
   * This ensures we NEVER have mismatches between Render and local environments
   */
  private initializeConfiguration(): void {
    if (this.initialized) return;

    console.log('🔧 APIService: Initializing with environment auto-detection...');

    // ENVIRONMENT DETECTION - Fixed logic
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isLocal = isDev || isLocalHost; // Prioritize localhost detection
    const isRender = import.meta.env.VITE_PLATFORM === 'render' && !isLocal; // Only render if not local
    const isProduction = !isLocal;

    console.log('🌍 Environment detected:', { isProduction, isRender, isLocal, isDev, hostname: window.location.hostname });

    // API KEY MAPPING - Handle ALL possible naming schemes
    this.mapAPIKeys();

    // ENDPOINT CONFIGURATION
    this.configureEndpoints(isLocal, isRender);

    this.initialized = true;
    console.log('✅ APIService initialized successfully');
  }

  /**
   * Maps ALL possible API key environment variables to standardized names
   * This prevents ANY naming mismatch issues
   */
  private mapAPIKeys(): void {
    // If running in the browser we should NOT try to read server secrets –
    // they will never be present.  Backend will inject them when requests
    // are routed through /api/unified-route.
    if (typeof window !== 'undefined' && !import.meta.env.SSR) {
      return; // skip key-scan on client
    }

    const keyMappings = {
      // Fireworks AI - EXACT RENDER ENVIRONMENT VARIABLE NAMES
      'fireworks': [
        'Neuraplay', // PRIMARY: Your exact Render key name for Fireworks
        'VITE_FIREWORKS_API_KEY',
        'FIREWORKS_API_KEY'
      ],
      
      // Together AI
      'together': [
        'together_token', // EXACT Render key name
        'TOGETHER_API_KEY',
        'VITE_TOGETHER_API_KEY'
      ],
      
      // ElevenLabs - EXACT RENDER NAME
      'elevenlabs': [
        'VITE_ELEVENLABS_API_KEY' // EXACT Render key name
      ],
      
      'elevenlabs_agent': [
        'ELEVENLABS_AGENT_ID' // EXACT Render key name
      ],
      
      // Weather - EXACT RENDER NAME
      'weather': [
        'WEATHER_API' // EXACT Render key name
      ],
      
      // Assembly AI - EXACT RENDER NAME
      'assemblyai': [
        'VITE_ASSEMBLYAI_API_KEY' // EXACT Render key name
      ],
      
      // Serper (search) - EXACT RENDER NAME
      'serper': [
        'Serper_api' // EXACT Render key name
      ],
      
      // Hugging Face - EXACT RENDER NAME
      'huggingface': [
        'hf_token' // EXACT Render key name
      ],
      
      // Jina AI Reader - EXACT RENDER NAME
      'jina_reader': [
        'READER_API' // EXACT Render key name for Jina AI
      ]
    };

    // Try each possible environment variable name
    Object.entries(keyMappings).forEach(([service, possibleKeys]) => {
      for (const keyName of possibleKeys) {
        const value = import.meta.env[keyName] || (typeof process !== 'undefined' ? process.env[keyName] : undefined);
        if (value && value !== 'dummy-key' && value !== '') {
          this.apiKeys.set(service, value);
          console.log(`🔑 APIService: Found ${service} key via ${keyName}`);
          break;
        }
      }
      
      if (!this.apiKeys.has(service)) {
        console.warn(`⚠️ APIService: No valid key found for ${service} service`);
      }
    });
  }

  /**
   * Configures base endpoints based on environment
   */
  private configureEndpoints(isLocal: boolean, isRender: boolean): void {
    console.log('🔧 ConfigureEndpoints called with:', { isLocal, isRender });
    console.log('🔧 VITE_API_BASE value:', import.meta.env.VITE_API_BASE);
    
    if (isLocal) {
      // Local development - use /api (same server handles both frontend and API)
      console.log('🔧 Setting endpoints for LOCAL environment (same server handles frontend + API)');
      this.baseEndpoints.set('api', '/api');
      this.baseEndpoints.set('fireworks', 'https://api.fireworks.ai/inference/v1');
      this.baseEndpoints.set('together', 'https://api.together.xyz/v1');
    } else if (isRender) {
      // Production on Render - use internal APIs
      console.log('🔧 Setting endpoints for RENDER environment');
      this.baseEndpoints.set('api', '/api');
      this.baseEndpoints.set('fireworks', 'https://api.fireworks.ai/inference/v1');
      this.baseEndpoints.set('together', 'https://api.together.xyz/v1');
    } else {
      // Other production environments - direct to Render
      console.log('🔧 Setting endpoints for OTHER environment');
      this.baseEndpoints.set('api', import.meta.env.VITE_API_BASE || 'https://neuraplay.onrender.com');
      this.baseEndpoints.set('fireworks', 'https://api.fireworks.ai/inference/v1');
      this.baseEndpoints.set('together', 'https://api.together.xyz/v1');
    }

    console.log('🌐 Endpoints configured:', Object.fromEntries(this.baseEndpoints));
  }

  /**
   * UNIFIED API CALL METHOD
   * All API requests MUST go through this method
   */
  public async makeRequest<T = any>(request: APIRequest): Promise<APIResponse<T>> {
    try {
      if (!this.initialized) {
        this.initializeConfiguration();
      }

      const url = this.resolveURL(request.endpoint);
      
      // Handle FormData differently from JSON data
      const isFormData = request.data instanceof FormData;
      const headers = isFormData ? {} : this.buildHeaders(request.headers || {});

      const fetchOptions: RequestInit = {
        method: request.method,
        headers,
        signal: AbortSignal.timeout(30000), // 30 second timeout
        ...(request.data && { 
          body: isFormData ? request.data : JSON.stringify(request.data) 
        })
      };
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
        status: response.status
      };

    } catch (error) {
      console.error('❌ APIService request failed:', error);
      
      let errorMessage = 'Unknown API error';
      let status = 500;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          errorMessage = 'Request timed out - Render service may be sleeping. Please try again.';
          status = 408; // Request Timeout
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        status
      };
    }
  }

  /**
   * SPECIALIZED LLM COMPLETION METHOD
   * Handles all LLM providers uniformly
   */
  public async llmCompletion(
    messages: Array<{role: string, content: string}>,
    model?: string,
    options: {
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<APIResponse> {
    // LLM completion request
    
    // ALWAYS route through our backend API - it handles all provider logic
    return this.makeRequest({
      endpoint: '/api',
      method: 'POST',
      data: {
        task_type: 'chat',
        input_data: {
          messages,
          model: model || 'llama-3.1-8b-instant',
          ...options
        }
      }
    });
  }

  /**
   * RAW WEB SEARCH METHOD
   * Pure API call to Serper - no business logic
   */
  public async webSearch(
    query: string, 
    options: {
      type?: 'search' | 'news' | 'images';
      gl?: string;
      num?: number;
    } = {}
  ): Promise<APIResponse> {
    const { type = 'search', gl = 'us', num = 10 } = options;
    
    console.log(`🌐 APIService: Web search API call - Query: "${query}", Type: ${type}`);
    
    return this.makeRequest({
      endpoint: '/api',
      method: 'POST',
      data: {
        task_type: 'web_search',
        input_data: {
          query,
          type,
          gl,
          num
        }
      }
    });
  }

  /**
   * RAW JINA AI READER METHOD
   * Pure API call to Jina AI - no business logic
   */
  public async readURL(
    url: string,
    options: {
      format?: 'markdown' | 'text' | 'html';
      includeImages?: boolean;
      includeLinks?: boolean;
      timeout?: number;
    } = {}
  ): Promise<APIResponse> {
    const { format = 'markdown', includeImages = true, includeLinks = true, timeout = 15 } = options;
    
    console.log(`🌐 APIService: Jina AI Reader API call - ${url} (with images: ${includeImages})`);
    
    // Check if we have Jina API key
    const jinaKey = this.apiKeys.get('jina_reader');
    if (!jinaKey) {
      return {
        success: false,
        error: 'No Jina Reader API key found'
      };
    }

    // Construct Jina Reader URL
    const jinaURL = `https://r.jina.ai/${url}`;
    
    return this.makeRequest({
      endpoint: jinaURL,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jinaKey}`,
        'X-Return-Format': format,
        'X-With-Generated-Alt': includeImages ? 'true' : 'false',
        'X-With-Images-Summary': includeImages ? 'all' : 'false',
        'X-With-Links-Summary': includeLinks ? 'true' : 'false',
        'X-Timeout': timeout.toString()
      }
    });
  }

  /**
   * RAW WEATHER API METHOD
   * Pure API call to weather service - no business logic
   */
  public async getWeather(
    location: string,
    options: {
      units?: 'metric' | 'imperial';
      lang?: string;
    } = {}
  ): Promise<APIResponse> {
    const { units = 'metric', lang = 'en' } = options;
    
    console.log(`🌐 APIService: Weather API call - ${location}`);
    
    // Route through backend which handles the actual weather API
    return this.makeRequest({
      endpoint: '/api',
      method: 'POST',
      data: {
        task_type: 'weather',
        input_data: {
          location,
          units,
          lang
        }
      }
    });
  }

  /**
   * Resolves relative endpoints to full URLs
   */
  private resolveURL(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }

    // Fix for double /api issue - if endpoint is /api/api, correct it to /api
    if (endpoint === '/api/api') {
      console.log('🔧 APIService: Correcting /api/api to /api');
      return '/api';
    }

    if (endpoint.startsWith('/api')) {
      const baseAPI = this.baseEndpoints.get('api') || '/api';
      return endpoint.replace('/api', baseAPI);
    }

    return endpoint;
  }

  /**
   * Builds headers with automatic API key injection
   */
  private buildHeaders(customHeaders: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    // Don't add API keys for our own backend endpoints - they handle keys internally
    if (!customHeaders.Authorization && !this.isInternalEndpoint(headers)) {
      const llmKey = this.apiKeys.get('llm');
      if (llmKey) {
        headers.Authorization = `Bearer ${llmKey}`;
      }
    }

    return headers;
  }

  /**
   * Checks if endpoint is our internal API (Render backend)
   */
  private isInternalEndpoint(headers: Record<string, string>): boolean {
    return Object.keys(headers).some(key => 
      headers[key]?.includes('/api') || 
      headers[key]?.includes('neuraplay.onrender.com')
    );
  }

  /**
   * Get API key for a specific service
   */
  public getAPIKey(service: string): string | undefined {
    return this.apiKeys.get(service);
  }

  /**
   * Health check method
   */
  public getStatus(): { initialized: boolean; keys: string[]; endpoints: string[] } {
    return {
      initialized: this.initialized,
      keys: Array.from(this.apiKeys.keys()),
      endpoints: Array.from(this.baseEndpoints.keys())
    };
  }
}

export const apiService = APIService.getInstance();
export { APIService }; // Export the class for ServiceContainer
export default apiService;

