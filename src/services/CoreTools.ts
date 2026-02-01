// Core tool definitions for the new tool registry
import { ToolDefinition, toolRegistry } from './ToolRegistry';
import { apiService } from './APIService';
import { serviceContainer } from './ServiceContainer';
import { logger } from '../utils/Logger';
import { unifiedMemoryManager, UnifiedMemoryRequest } from './UnifiedMemoryManager';
import { webSearchEngine } from './WebSearchEngine';
import { newsOrchestrator } from './NewsOrchestrator';
import { unifiedAPIRouter } from './UnifiedAPIRouter';

// Refactored LLM and Canvas services
import { CanvasDocumentService } from './canvas/CanvasDocumentService';
import { LLMResponseParser } from './llm/LLMResponseParser';
import { LLMTokenManager } from './llm/LLMTokenManager';

// Canvas state management - static import to avoid dynamic import issues in production
import { CanvasStateAdapter } from './CanvasStateAdapter';
import { useCanvasStore } from '../stores/canvasStore';

// Initialize Canvas Document Service
const canvasDocumentService = new CanvasDocumentService(unifiedAPIRouter);

/**
 * 📊 Chart Configuration Generator
 * Creates configuration objects for various chart libraries
 */
function generateChartConfig(
  data: any[], 
  chartType: string, 
  title: string, 
  is3D: boolean, 
  interactive: boolean, 
  theme: string, 
  library: string
): any {
  const colors = theme === 'purple' 
    ? ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']
    : theme === 'dark'
    ? ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa']
    : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Plotly configuration
  if (library === 'plotly') {
    const trace: any = {
      type: chartType === 'bar3d' ? 'bar' : chartType === 'scatter3d' ? 'scatter3d' : chartType,
      marker: { color: colors[0] }
    };

    if (Array.isArray(data) && data.length > 0) {
      if (typeof data[0] === 'object') {
        trace.x = data.map((d: any) => d.x || d.label || d.name || Object.keys(d)[0]);
        trace.y = data.map((d: any) => d.y || d.value || Object.values(d)[0]);
        if (is3D && data[0].z !== undefined) {
          trace.z = data.map((d: any) => d.z);
        }
      } else {
        trace.y = data;
        trace.x = data.map((_: any, i: number) => i);
      }
    }

    return {
      data: [trace],
      layout: {
        title: title,
        paper_bgcolor: theme === 'dark' ? '#1f2937' : 'white',
        plot_bgcolor: theme === 'dark' ? '#1f2937' : 'white',
        font: { color: theme === 'dark' ? '#e5e7eb' : '#1f2937' }
      },
      config: { responsive: true, displayModeBar: interactive }
    };
  }

  // Chart.js configuration
  if (library === 'chartjs') {
    return {
      type: chartType === 'scatter3d' ? 'scatter' : chartType,
      data: {
        labels: Array.isArray(data) && data.length > 0 && typeof data[0] === 'object'
          ? data.map((d: any) => d.label || d.name || d.x || '')
          : data.map((_: any, i: number) => `Item ${i + 1}`),
        datasets: [{
          label: title,
          data: Array.isArray(data) && data.length > 0 && typeof data[0] === 'object'
            ? data.map((d: any) => d.value || d.y || 0)
            : data,
          backgroundColor: colors,
          borderColor: colors[0],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true }, title: { display: true, text: title } }
      }
    };
  }

  // Default/fallback config
  return {
    type: chartType,
    data: data,
    title: title,
    is3D: is3D,
    theme: theme,
    colors: colors
  };
}

/**
 * 📚 Get CDN URL for chart libraries
 */
function getChartLibraryCDN(library: string): string {
  const cdns: Record<string, string> = {
    plotly: 'https://cdn.plot.ly/plotly-2.27.0.min.js',
    chartjs: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    threejs: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    observable: 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.11/dist/plot.umd.min.js'
  };
  return cdns[library] || cdns.plotly;
}

/**
 * 🧠 LLM-POWERED Revision Keywords Detection Helper - NO REGEX!
 */
function hasRevisionKeywords(request: string): boolean {
  const requestLower = request.toLowerCase();
  
  // CRITICAL: Exclude requests for other canvas types (code, chart, image)
  const isOtherCanvasType = 
    requestLower.includes('code') || 
    requestLower.includes('program') || 
    requestLower.includes('script') ||
    requestLower.includes('function') ||
    requestLower.includes('chart') || 
    requestLower.includes('graph') || 
    requestLower.includes('plot') || 
    requestLower.includes('visualize') ||
    requestLower.includes('image') ||
    requestLower.includes('picture') ||
    requestLower.includes('diagram');
  
  if (isOtherCanvasType) {
    // Only treat as revision if explicitly mentioning the document
    return requestLower.includes('to the document') || 
           requestLower.includes('in the document') || 
           requestLower.includes('to my document') ||
           requestLower.includes('in my document');
  }
  
  // Direct revision keywords
  if (requestLower.includes('add to') || requestLower.includes('modify') || 
      requestLower.includes('edit') || requestLower.includes('update') || 
      requestLower.includes('revise') || requestLower.includes('change') || 
      requestLower.includes('append to') || requestLower.includes('expand') || 
      requestLower.includes('include in')) return true;
  
  // Polite addition patterns - but ONLY for document-related content
  if (requestLower.includes('can you add') || requestLower.includes('please add') || 
      requestLower.includes('also add') || requestLower.includes('but can you') || 
      requestLower.includes('add a') || requestLower.includes('add some') ||
      requestLower.startsWith('add ')) {
    // Check if it's document-related content (table, section, paragraph, etc.)
    const isDocumentContent = 
      requestLower.includes('table') || 
      requestLower.includes('section') || 
      requestLower.includes('paragraph') || 
      requestLower.includes('list') || 
      requestLower.includes('heading') ||
      requestLower.includes('note') ||
      requestLower.includes('entry') ||
      requestLower.includes('item') ||
      requestLower.includes('part') ||     // "add a part about..."
      requestLower.includes('piece') ||    // "add a piece about..."
      requestLower.includes('segment') ||  // "add a segment about..."
      requestLower.includes('content') ||  // "add content about..."
      requestLower.includes('information') || // "add information about..."
      requestLower.includes('details') ||  // "add details about..."
      requestLower.includes(' about ');    // "add a X about Y" pattern
    
    return isDocumentContent;
  }
  
  // Remove/undo patterns
  if (requestLower.includes('remove that') || requestLower.includes('delete that') ||
      requestLower.includes('undo that') || requestLower.includes('remove last') ||
      requestLower.includes('remove the last') || requestLower.includes('take out')) return true;
  
  // Document reference patterns
  if (requestLower.includes('to the document') || requestLower.includes('in the document') || 
      requestLower.includes('to my document')) return true;
  
  // Complex document modification patterns
  if ((requestLower.includes('diary') || requestLower.includes('planner') || 
       requestLower.includes('document') || requestLower.includes('guide') || 
       requestLower.includes('report')) && 
      (requestLower.includes('needs') || requestLower.includes('should') || 
       requestLower.includes('could') || requestLower.includes('must')) && 
      (requestLower.includes(' a ') || requestLower.includes('have') || 
       requestLower.includes('include'))) return true;
  
  return false;
}

// LLM Completion Tool
const llmCompletionTool: ToolDefinition = {
  name: 'llm-completion',
  category: 'server',
  timeout: 60000, // 60 seconds timeout for LLM calls
  schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string' },
      model: { 
        type: 'string'
      },
      temperature: { 
        type: 'number', 
        minimum: 0, 
        maximum: 2 
      },
      maxTokens: { 
        type: 'number', 
        minimum: 1, 
        maximum: 4000 
      },
      stopSequences: {
        type: 'array',
        items: { type: 'string' }
      },
      lengthPenalty: {
        type: 'number',
        minimum: 0.1,
        maximum: 3.0
      },
      // 🎯 PROPER JSON SCHEMA ENFORCEMENT - Fireworks enforces at token level
      response_format: {
        type: 'object',
        description: 'JSON schema enforcement for structured output'
      }
    },
    required: ['prompt']
  },
  async execute(params, context) {
    const { 
      prompt, 
      model = 'accounts/fireworks/models/gpt-oss-120b', 
      temperature = 0.6, 
      maxTokens = 2000,
      stopSequences = [],
      lengthPenalty = 1.0,
      response_format = undefined
    } = params;
    
    try {
      // Use the centralized APIService for LLM calls
      // 🎯 Pass through response_format for JSON schema enforcement
      const apiResponse = await unifiedAPIRouter.llmCompletion(
        [{ role: 'user', content: prompt }],
        model,
        {
          temperature,
          max_tokens: maxTokens,
          ...(response_format && { response_format })
        }
      );

      if (!apiResponse.success) {
        logger.error('LLM API Error Details:', 'CoreTools', {
          error: apiResponse.error,
          status: apiResponse.status,
          model: model,
          promptLength: prompt.length,
          details: apiResponse.details
        });
        
        // Provide more detailed error message based on the error type
        const errorMessage = apiResponse.error || 'Unknown error';
        const statusInfo = apiResponse.status ? ` (Status: ${apiResponse.status})` : '';
        const fallbackMessage = `I encountered an API error: ${errorMessage}${statusInfo}. Please try again or contact support if this persists.`;
        
        // Don't throw - return structured error response
        return {
          success: false,
          error: `LLM API failed: ${errorMessage}${statusInfo}`,
          data: {
            completion: fallbackMessage,
            response: fallbackMessage,
            message: fallbackMessage,
            toolResults: []
          }
        };
      }

      // 🎯 CRITICAL FIX: Handle ALL possible response formats from backend
      // Format 1: { success: true, data: [...] } - normal response
      // Format 2: { success: true, response: "..." } - error fallback  
      // Format 3: { choices: [...] } - direct OpenAI format
      // Format 4: Empty/undefined - complete failure
      
      console.log('🔍 LLM Tool - FULL API RESPONSE:', JSON.stringify(apiResponse, null, 2).slice(0, 1000));
      
      let result = apiResponse.data;
      
      // If apiResponse has a direct 'response' field (error fallback format), use that
      if (!result && apiResponse.response) {
        console.log('🔍 LLM Tool - Using top-level response field (fallback format)');
        return {
          success: true,
          data: {
            completion: apiResponse.response,
            response: apiResponse.response,
            message: apiResponse.response,
            toolResults: apiResponse.toolResults || []
          }
        };
      }
      
      // Handle direct choices format (OpenAI-style response at top level)
      if (!result && apiResponse.choices?.[0]?.message?.content) {
        const content = apiResponse.choices[0].message.content;
        console.log('🔍 LLM Tool - Using top-level choices format');
        return {
          success: true,
          data: {
            completion: content,
            response: content,
            message: content,
            toolResults: []
          }
        };
      }
      
      // LAST RESORT: If everything is undefined, return a helpful error instead of crashing
      if (!result && !apiResponse.response && !apiResponse.choices) {
        console.error('❌ LLM Tool - API returned empty response:', apiResponse);
        return {
          success: true,
          data: {
            completion: 'I found your document but had trouble generating a response. Please try asking again.',
            response: 'I found your document but had trouble generating a response. Please try asking again.',
            message: 'I found your document but had trouble generating a response. Please try asking again.',
            toolResults: []
          }
        };
      }
      
      console.log('🔍 LLM Tool - FULL RAW RESPONSE:', JSON.stringify(result, null, 2));
      logger.verbose('LLM Tool - Raw response from backend', 'CoreTools', {
        responseType: typeof result,
        preview: result ? (typeof result === 'string' ? result.slice(0, 200) + '...' : JSON.stringify(result, null, 2).slice(0, 200) + '...') : 'undefined'
      });
      
      // Handle backend error fallback format first (from unified-route.cjs error handling)
      if (result && result.success === true && result.response && result.metadata && result.metadata.mode && result.metadata.mode.includes('error')) {
        console.log('🔍 LLM Tool - Error fallback format detected:', result.metadata.mode);
        const responseText = result.response;
        return {
          success: true,
          data: {
            completion: responseText,
            response: responseText,
            message: responseText,
            toolResults: result.toolResults || []
          }
        };
      }

      // Handle backend success format with data array
      if (result && result.success === true && result.data && Array.isArray(result.data) && result.data.length > 0) {
        const firstItem = result.data[0];
        const responseText = firstItem.generated_text || firstItem.content || firstItem.message || 'Response received';
        const toolResults = firstItem.tool_results || [];
        console.log('🔍 LLM Tool - Backend success format extracted text:', responseText);
        console.log('🔍 LLM Tool - Backend success format extracted tool_results:', toolResults);
        return {
          success: true,
          data: {
            completion: responseText,
            response: responseText,
            message: responseText,
            toolResults: toolResults
          }
        };
      }

      // Handle both array and object response formats from backend
      if (Array.isArray(result) && result.length > 0) {
        const responseText = result[0].generated_text || result[0].content || result[0].message || 'Response received';
        const toolResults = result[0].tool_results || [];
        console.log('🔍 LLM Tool - Array format extracted text:', responseText);
        console.log('🔍 LLM Tool - Array format extracted tool_results:', toolResults);
        return {
          success: true,
          data: {
            completion: responseText,
            response: responseText,
            message: responseText,
            toolResults: toolResults
          }
        };
      }
      
      // Handle direct object response  
      if (result && (result.response || result.generated_text || result.content || result.message)) {
        const responseText = result.response || result.generated_text || result.content || result.message;
        const toolResults = result.tool_results || [];
        console.log('🔍 LLM Tool - Object format extracted text:', responseText);
        console.log('🔍 LLM Tool - Object format extracted tool_results:', toolResults);
        return {
          success: true,
          data: {
            completion: responseText,
            response: responseText,
            message: responseText,
            toolResults: toolResults
          }
        };
      }
      
      // Fallback for unknown format or undefined result
      console.warn('⚠️ LLM Tool - Unexpected response format:', result);
      const fallbackText = (result && typeof result === 'string' && result.trim().length > 0)
        ? result
        : result === undefined || result === null 
          ? 'No response received from API'
          : 'Response received';
      return {
        success: true,
        data: {
          completion: fallbackText,
          response: fallbackText,
          message: fallbackText,
          toolResults: []
        }
      };

    } catch (error) {
      console.error('❌ LLM completion failed:', error);
      throw error;
    }
  },
  retryPolicy: { maxRetries: 2, backoff: 'exponential' }
};

// Chart Creation Tool for Canvas - Single Chart Generation
const chartCreationTool: ToolDefinition = {
  name: 'scribble_chart_create',
  category: 'server',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Chart title' },
      type: { 
        type: 'string', 
        description: 'Chart type - supported: bar, line, scatter, histogram, pie, heatmap, 3d_scatter, 3d_surface, sankey, sunburst',
        enum: ['bar', 'line', 'scatter', 'histogram', 'pie', 'heatmap', '3d_scatter', '3d_surface', 'sankey', 'sunburst']
      },
      series: { type: 'array', description: 'Single data series for the chart (not multiple series)' },
      data: { type: 'object', description: 'Chart configuration data' },
      description: { type: 'string', description: 'Optional description for the chart' }
    },
    required: ['title', 'type']
  },
  async execute(params, context) {
    try {
      console.log('📊 Creating single chart with params:', params);
      
      // Ensure only supported chart types
      const supportedTypes = ['bar', 'line', 'scatter', 'histogram', 'pie', 'heatmap', '3d_scatter', '3d_surface', 'sankey', 'sunburst'];
      const chartType = supportedTypes.includes(params.type) ? params.type : 'bar';
      
      if (params.type !== chartType) {
        console.warn(`Chart type '${params.type}' not supported, falling back to 'bar'`);
      }
      
      // Clean series data to prevent multiple charts
      let cleanSeries = params.series;
      if (Array.isArray(cleanSeries) && cleanSeries.length > 1 && chartType === 'bar') {
        console.log('🔧 Preventing multiple bar charts, using first series only');
        cleanSeries = cleanSeries[0];
      }

      // Auto-generate a simple placeholder series if none supplied
      if (!cleanSeries || (Array.isArray(cleanSeries) && cleanSeries.length === 0)) {
        console.log('🔧 No series data supplied – generating placeholder values');
        cleanSeries = [
          { label: 'A', value: 10 },
          { label: 'B', value: 20 },
          { label: 'C', value: 15 }
        ];
      }
      
      // Return standardized chart data that can be processed by canvas
      const chartPayload = {
          type: 'chart',
          title: params.title || 'Chart',
          chartType: chartType,
          series: cleanSeries,
          config: params.data || {},
          style: 'interactive',
          description: params.description || '',
          library: 'echarts' as const
        };

      return {
        success: true,
        chartData: chartPayload,
        data: chartPayload,
        message: `📊 Created single ${chartType} chart: ${params.title || 'Chart'}`,
        canvasActivation: true // Signal that canvas should be activated
      };

    } catch (error) {
      console.error('❌ Chart creation failed:', error);
      return {
        success: false,
        error: `Chart creation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
};

// Helper function to enhance image prompts based on style
function enhanceImagePrompt(prompt: string, style: string): string {
  const styleEnhancements = {
    'realistic': 'photorealistic, high quality, detailed, professional photography',
    'artistic': 'artistic, creative, expressive, fine art style, masterpiece',
    'cartoon': 'cartoon style, animated, colorful, fun, whimsical',
    'abstract': 'abstract art, conceptual, modern, artistic interpretation',
    'photographic': 'professional photography, high resolution, sharp focus, well-lit',
    'digital-art': 'digital art, concept art, detailed, vibrant colors, modern',
    'cinematic': 'cinematic lighting, dramatic, movie-like, high production value'
  };

  const enhancement = styleEnhancements[style as keyof typeof styleEnhancements] || styleEnhancements.realistic;
  return `${prompt}, ${enhancement}`;
}

// Fireworks FLUX Image Generation Tool
const fireworksImageTool: ToolDefinition = {
  name: 'generate-image',
  category: 'server',
  schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', minLength: 1, maxLength: 1000 },
      style: { 
        type: 'string', 
        enum: ['realistic', 'artistic', 'cartoon', 'abstract', 'photographic', 'digital-art', 'cinematic'] 
      },
      size: { 
        type: 'string', 
        enum: ['512x512', '1024x1024', '1024x768', '768x1024'] 
      },
      steps: { type: 'number', minimum: 1, maximum: 8 },
      seed: { type: 'number', minimum: 0, maximum: 1000000 }
    },
    required: ['prompt']
  },
  async execute(params, context) {
    const { 
      prompt, 
      style = 'realistic', 
      size = '1024x1024', 
      steps = 4,
      seed = Math.floor(Math.random() * 1000000)
    } = params;
    
    try {
      console.log('🎨 Generating image with Fireworks FLUX-1-schnell-fp8:', { prompt, style, size });
      
      // Enhanced prompt based on style
      const enhancedPrompt = enhanceImagePrompt(prompt, style);
      
      // FIXED: Call unified-route directly instead of circular routing through /api
      const response = await unifiedAPIRouter.routeAPICall(
        'fireworks', 
        'image-generation', 
        {
          prompt: enhancedPrompt,
          style,
          size,
          steps,
          seed,
          model: 'flux-1-schnell-fp8'
        }
      );

      if (!response.success) {
        throw new Error(`Image generation failed: ${response.error || response.status || 'Unknown error'}`);
      }

      // FIXED: image_url is at the TOP level of response, not inside response.data
      // response.data contains the raw base64 string, not an object
      const imageUrl = response.image_url || response.url || 
                       (typeof response.data === 'object' && response.data?.image_url);
      
      if (!imageUrl) {
        console.error('❌ Image generation response missing image_url:', { 
          hasData: !!response.data, 
          dataType: typeof response.data,
          responseKeys: Object.keys(response)
        });
        throw new Error('Image generation succeeded but no image URL was returned');
      }
      
      console.log('✅ Image generated successfully, imageUrl length:', imageUrl.length);
      
      // CRITICAL: Return data directly - ToolRegistry wraps it in { success, data, metadata }
      // Do NOT return { success, data: {...} } - that causes double nesting!
      // RichMessageRenderer expects result.data.image_url, not result.data.data.image_url
      return {
        image_url: imageUrl,  // snake_case for RichMessageRenderer compatibility
        imageUrl: imageUrl,   // camelCase for other components
        prompt: enhancedPrompt,
        originalPrompt: prompt,
        style,
        size,
        seed,
        steps,
        model: 'flux-1-schnell-fp8',
        message: `✅ Generated ${style} image: "${prompt}"`
      };

    } catch (error) {
      console.error('❌ Fireworks image generation failed:', error);
      throw error;
    }
  },
  timeout: 60000,
  retryPolicy: { maxRetries: 2, backoff: 'exponential' }
};

// 3D Interactive Chart Tool (using external libraries)
const interactiveChartTool: ToolDefinition = {
  name: 'create-chart',
  category: 'server',
  schema: {
    type: 'object',
    properties: {
      data: { type: 'array' },
      chartType: { 
        type: 'string', 
        enum: ['bar', 'line', 'scatter', 'surface', 'mesh3d', 'scatter3d', 'bar3d', 'network', 'sankey', 'sunburst'] 
      },
      title: { type: 'string' },
      is3D: { type: 'boolean' },
      interactive: { type: 'boolean' },
      theme: { type: 'string', enum: ['light', 'dark', 'purple'] },
      library: { type: 'string', enum: ['plotly', 'threejs', 'observable', 'chartjs'] }
    },
    required: ['data', 'chartType']
  },
  async execute(params, context) {
    const { 
      data, 
      chartType, 
      title = 'Interactive Chart', 
      is3D = false,
      interactive = true,
      theme = 'purple',
      library = 'plotly'
    } = params;
    
    try {
      console.log('📊 Creating interactive chart:', { chartType, library, is3D });
      
      // Generate chart configuration
      const chartConfig = generateChartConfig(data, chartType, title, is3D, interactive, theme, library);
      
      return {
        success: true,
        data: {
          config: chartConfig,
          library,
          chartType,
          is3D,
          interactive,
          embeddable: true,
          cdn: getChartLibraryCDN(library)
        },
        message: `📊 Created ${is3D ? '3D ' : ''}${chartType} chart using ${library}`
      };

    } catch (error) {
      console.error('❌ Chart creation failed:', error);
      throw error;
    }
  },
  timeout: 30000,
  retryPolicy: { maxRetries: 1, backoff: 'linear' }
};

// Text Element Creation Tool for Canvas
const textCreationTool: ToolDefinition = {
  name: 'scribble_text_create',
  category: 'server',
  schema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text content to display' },
      title: { type: 'string', description: 'Optional title/header for the text' },
      fontSize: { type: 'number', description: 'Font size (default: 16)', minimum: 8, maximum: 72 },
      align: { type: 'string', description: 'Text alignment', enum: ['left', 'center', 'right'] },
      style: { type: 'string', description: 'Text style', enum: ['normal', 'header', 'subheader', 'caption'] }
    },
    required: ['text']
  },
  async execute(params, context) {
    try {
      console.log('📝 Creating text element with params:', params);
      
      let fontSize = 16;
      if (params.style === 'header') fontSize = 24;
      else if (params.style === 'subheader') fontSize = 20;
      else if (params.style === 'caption') fontSize = 12;
      else if (params.fontSize) fontSize = params.fontSize;
      
      return {
        success: true,
        data: {
          type: 'text',
          text: params.text,
          title: params.title || '',
          fontSize: fontSize,
          align: params.align || 'left',
          style: params.style || 'normal'
        },
        // Provide top-level documentData so renderers and orchestrators treat this as a document element
        documentData: {
          title: params.title || '',
          text: params.text,
          type: 'text',
          fontSize: fontSize,
          align: params.align || 'left',
          style: params.style || 'normal'
        },
        canvasActivation: params.activateCanvas !== false,
        message: `📝 Created text element: ${params.text.substring(0, 50)}${params.text.length > 50 ? '...' : ''}`
      };
    } catch (error) {
      console.error('❌ Text creation failed:', error);
      return {
        success: false,
        error: `Text creation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
};

// Math Diagram Tool - REMOVED: Use scribble_chart_create instead for all chart/diagram needs

// Reader Tool - Reads and extracts content from URLs using Jina AI
const readerTool: ToolDefinition = {
  name: 'reader',
  category: 'server',
  timeout: 20000,
  schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to read and extract content from' },
      extractMode: { type: 'string', enum: ['article', 'full', 'summary'], default: 'article' },
      includeImages: { type: 'boolean', default: false }
    },
    required: ['url']
  },
  async execute(params, context) {
    const { url, extractMode = 'article', includeImages = false } = params;
    
    try {
      console.log('📖 READER: Reading URL:', url);
      
      // Check if we're in local development - proxy to Render
      const isLocalDev = typeof window !== 'undefined' || 
        (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');
      
      if (isLocalDev) {
        console.log('🔀 READER: Local dev - proxying to Render backend');
        try {
          const response = await fetch('https://neuraplay.onrender.com/api/unified-route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service: 'jina',
              endpoint: 'reader',
              data: { url, format: 'markdown', includeImages }
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            let content = result.data?.content || result.content || '';
            
            if (extractMode === 'article' && content.length > 3000) {
              content = content.substring(0, 3000) + '...';
            }
            
            console.log('✅ READER: Got', content.length, 'chars from Render backend');
            return {
              success: true,
              data: { content, url, extractMode, title: result.data?.title || url }
            };
          }
        } catch (proxyError) {
          console.warn('⚠️ READER: Render proxy failed:', proxyError);
        }
      }
      
      // Direct API call (for production or if proxy fails)
      const apiService = await import('../services/APIService').then(m => m.apiService);
      
      const readResponse = await apiService.readURL(url, {
        format: 'markdown',
        includeImages: includeImages,
        includeLinks: true
      });
      
      if (!readResponse.success) {
        console.warn('⚠️ READER: Failed to read URL:', url, readResponse.error);
        return {
          success: false,
          error: readResponse.error || 'Failed to read URL',
          data: null
        };
      }
      
      let content = readResponse.data?.content || readResponse.data || '';
      
      if (extractMode === 'article' && typeof content === 'string' && content.length > 3000) {
        content = content.substring(0, 3000) + '...';
      } else if (extractMode === 'summary' && typeof content === 'string' && content.length > 1000) {
        content = content.substring(0, 1000) + '...';
      }
      
      console.log('✅ READER: Successfully extracted', typeof content === 'string' ? content.length : 0, 'characters from', url);
      
      return {
        success: true,
        data: {
          content: content,
          url: url,
          extractMode: extractMode,
          title: readResponse.data?.title || url
        },
        message: `Successfully read content from ${url}`
      };
      
    } catch (error) {
      console.error('❌ READER: Error reading URL:', url, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read URL',
        data: null
      };
    }
  }
};

// Web Search Tool
const webSearchTool: ToolDefinition = {
  name: 'web-search',
  category: 'server',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      numResults: { type: 'number', minimum: 1, maximum: 20 },
      safeSearch: { type: 'boolean' },
      includeImages: { type: 'boolean' }
    },
    required: ['query']
  },
  async execute(params, context) {
    const { query, numResults = 10, safeSearch = true, includeImages = false } = params;
    
    try {
      console.log('🔍 WEB SEARCH: Routing through backend API for:', query);
      
      // ENHANCED: Use APIService for consistent routing and error handling
      const apiService = await import('../services/APIService').then(m => m.apiService);
      
      const searchResponse = await apiService.webSearch(query, {
        num: numResults,
        includeImages: includeImages
      });
      
      if (!searchResponse.success) {
        console.error('❌ Web search API failed:', searchResponse.error);
        return {
          success: false,
          error: searchResponse.error || 'Web search service failed',
          message: `Could not search for "${query}": ${searchResponse.error || 'Service unavailable'}`
        };
      }
      
      // CRITICAL: Backend response is nested - data.data contains actual results
      const actualData = searchResponse.data?.data || searchResponse.data;
      const resultsCount = actualData?.results?.length || 0;
      console.log('🔍 WEB SEARCH: Results received via backend:', resultsCount, 'results');
      
      // Normalize response structure for consumers
      return {
        success: searchResponse.success,
        data: actualData,
        status: searchResponse.status
      };

    } catch (error) {
      console.error('❌ Web search failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Could not search for "${query}": ${error.message}`
      };
    }
  },
  timeout: 15000,
  retryPolicy: { maxRetries: 3, backoff: 'linear' }
};

// REMOVED: Duplicate image generation tool - using fireworksImageTool instead

// Navigation Tool
const navigationTool: ToolDefinition = {
  name: 'navigate',
  category: 'client',
  schema: {
    type: 'object',
    properties: {
      page: { type: 'string' },
      params: { type: 'object' }
    },
    required: ['page']
  },
  async execute(params, context) {
    const { page, params: navParams } = params;
    
    // This would be handled by the client-side NavigationService
    return {
      action: 'navigate',
      page,
      params: navParams,
      timestamp: Date.now()
    };
  },
  timeout: 5000
};

// Navigation Tool (Alias) - For agentic commands like "go to homepage"
const navigateToPageTool: ToolDefinition = {
  name: 'navigate_to_page',
  category: 'client',
  schema: {
    type: 'object',
    properties: {
      page: { type: 'string' },
      course: { type: 'string' },  // 🎯 Course name for auto-opening
      params: { type: 'object' }
    },
    required: ['page']
  },
  async execute(params, context) {
    const { page, course, params: navParams } = params;
    
    // Import NavigationService dynamically to avoid circular dependency
    const { NavigationService } = await import('./NavigationService');
    const navigationService = NavigationService.getInstance();
    
    // Extract user from context for authentication
    // Context may contain user object or userId from AIRouter/ToolCallingHandler
    const user = context?.user || context?.userId || context?.currentUser;
    
    console.log('🧭 NavigateToPage Tool - Context:', { 
      hasUser: !!user, 
      userId: context?.userId,
      page,
      course 
    });
    
    // 🎯 If course is specified, navigate to that course specifically
    if (course) {
      const result = await navigationService.navigateToCourse(course, user);
      return {
        success: result.success,
        action: 'navigate_to_course',
        page: 'dashboard',
        course,
        message: result.message,
        timestamp: Date.now()
      };
    }
    
    // Handle the actual navigation with user context for auth check
    const result = await navigationService.navigateToPage(page, user);
    
    return {
      success: result.success,
      action: 'navigate',
      page,
      params: navParams,
      message: result.message,
      timestamp: Date.now()
    };
  },
  timeout: 5000
};

// Database Query Tool
const databaseQueryTool: ToolDefinition = {
  name: 'database-query',
  category: 'server',
  schema: {
    type: 'object',
    properties: {
      table: { type: 'string' },
      operation: { 
        type: 'string', 
        enum: ['select', 'insert', 'update', 'delete'] 
      },
      conditions: { type: 'object' },
      data: { type: 'object' }
    },
    required: ['table', 'operation']
  },
  async execute(params, context) {
    const { table, operation, conditions, data } = params;
    
    try {
      // This would use the database service
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table,
          operation,
          conditions,
          data,
          sessionId: context.sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Database query failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Database query failed:', error);
      throw error;
    }
  },
  timeout: 10000,
  retryPolicy: { maxRetries: 2, backoff: 'linear' }
};

// User Context Tool
const userContextTool: ToolDefinition = {
  name: 'get-user-context',
  category: 'client',
  schema: {
    type: 'object',
    properties: {
      fields: { 
        type: 'array', 
        items: { type: 'string' } 
      }
    }
  },
  async execute(params, context) {
    const { fields } = params;
    
    // This would access the UserContext from React
    return {
      action: 'get-user-context',
      fields,
      timestamp: Date.now()
    };
  },
  timeout: 1000
};

// Note: mathDiagramTool already defined above with enhanced 3D support

// Weather Tool - Enhanced with Smart Geolocation
const weatherTool: ToolDefinition = {
  name: 'get-weather',
  category: 'server',
  schema: {
    type: 'object',
    properties: {
      location: { type: 'string' },
      units: { type: 'string', enum: ['metric', 'imperial'] },
      autoDetectLocation: { type: 'boolean', default: true }
    },
    required: []  // Location now optional - can auto-detect
  },
  async execute(params, context) {
    const { location: requestedLocation, units = 'metric', autoDetectLocation = true } = params;
    
    try {
      let finalLocation = requestedLocation;
      
      // ENHANCED SMART LOCATION DETECTION: Auto-detect if no location provided
      if (!finalLocation && autoDetectLocation) {
        console.log('🌍 WEATHER: Auto-detecting user location with improved methods...');
        
        try {
          const { LocationService } = await import('../services/LocationService');
          const locationService = LocationService.getInstance();
          finalLocation = await locationService.getLocationForWeather();
          
          if (finalLocation && finalLocation !== 'Current Location' && finalLocation !== 'New York') {
            console.log('✅ Auto-detected location:', finalLocation);
          } else {
            console.log('⚠️ Location detection returned generic result, trying browser geolocation...');
            
            // Last attempt: Try direct browser geolocation with promise
            try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true,
                  timeout: 5000,
                  maximumAge: 300000 // 5 minutes
                });
              });
              
              // Use reverse geocoding to get city name
              const lat = position.coords.latitude;
              const lon = position.coords.longitude;
              finalLocation = `${lat.toFixed(4)},${lon.toFixed(4)}`; // Weather API accepts coordinates
              console.log('✅ Using GPS coordinates:', finalLocation);
              
            } catch (geoError) {
              console.log('⚠️ Direct geolocation failed:', geoError);
              finalLocation = 'New York'; // Final fallback
            }
          }
        } catch (locationError) {
          console.warn('⚠️ Location service failed:', locationError);
          finalLocation = 'New York'; // Safe fallback
        }
      } else if (!finalLocation) {
        finalLocation = 'New York'; // Default fallback
      }
      
      console.log('🌤️ WEATHER: Getting weather for:', finalLocation);
      
      // Route through backend using Render environment variables (per user preference)
      const apiService = await import('../services/APIService').then(m => m.apiService);
      
      // Use APIService's built-in weather method that routes through backend
      const weatherResponse = await apiService.getWeather(finalLocation, { units });
      
      if (!weatherResponse.success) {
        return {
          success: false,
          error: weatherResponse.error || 'Weather service failed',
          message: `Could not get weather for ${finalLocation}: ${weatherResponse.error || 'Service unavailable'}`,
          location: finalLocation,
          autoDetected: !requestedLocation && autoDetectLocation
        };
      }
      
      const weatherData = weatherResponse.data;
      console.log('🌤️ WEATHER: Data received via backend:', weatherData);
      
      // FIXED: Extract nested weather data properly
      // The data comes nested as weatherData.data.data from the backend
      const actualWeatherData = weatherData?.data?.data || weatherData?.data || weatherData;
      console.log('🌤️ WEATHER: Extracted actual data:', actualWeatherData);
      
      // Enhance weather data with location info in the format ContentRenderer expects
      const enhancedWeatherData = {
        location: actualWeatherData.location,
        country: actualWeatherData.country,
        temperature: actualWeatherData.temperature,
        description: actualWeatherData.description || actualWeatherData.condition,
        humidity: actualWeatherData.humidity,
        windSpeed: actualWeatherData.windSpeed || actualWeatherData.wind_kph,
        units: units,
        feels_like: actualWeatherData.feels_like_c || actualWeatherData.feels_like,
        requestedLocation: finalLocation,
        autoDetected: !requestedLocation && autoDetectLocation
      };
      
      // Use YOUR architecture's ContentRenderer for proper formatting
      const { ContentRenderer } = await import('./ContentRenderer');
      const contentRenderer = ContentRenderer.getInstance();
      
      const renderedWeather = contentRenderer.renderWeather(enhancedWeatherData);
      console.log('🌤️ WEATHER: Using architecture formatting:', renderedWeather);
      
      return {
        success: true,
        message: renderedWeather.formattedMessage,
        data: enhancedWeatherData,
        metadata: {
          ...renderedWeather.metadata,
          locationSource: !requestedLocation && autoDetectLocation ? 'auto-detected' : 'user-provided'
        }
      };

    } catch (error) {
      console.error('❌ Weather API failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Could not get weather: ${error.message}`,
        location: requestedLocation || 'unknown'
      };
    }
  },
  timeout: 10000,
  retryPolicy: { maxRetries: 2, backoff: 'linear' }
};

// Semantic Search Tool - MISSING INTEGRATION FIXED
const semanticSearchTool: ToolDefinition = {
  name: 'semantic-search',
  category: 'server',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'number', minimum: 1, maximum: 20, default: 10 },
      similarityThreshold: { type: 'number', minimum: 0, maximum: 1, default: 0.7 },
      userId: { type: 'string' }
    },
    required: ['query']
  },
  async execute(params, context) {
    const { query, limit = 10, similarityThreshold = 0.7, userId } = params;
    
    try {
      console.log('🧠 SEMANTIC SEARCH: Processing query:', query);
      
      // Access VectorSearchService from ServiceContainer
      const serviceContainer = await import('./ServiceContainer').then(m => m.serviceContainer);
      await serviceContainer.waitForReady();
      
      let vectorSearchService;
      try {
        vectorSearchService = serviceContainer.get('vectorSearchService');
      } catch (error) {
        // Fallback to direct import if not in container
        const { vectorSearchService: vss } = await import('./VectorSearchService');
        vectorSearchService = vss;
      }
      
      const searchResults = await vectorSearchService.semanticSearch(
        query,
        userId || context?.userId || 'anonymous',
        limit,
        similarityThreshold
      );
      
      console.log('🧠 SEMANTIC SEARCH: Found', searchResults.length, 'results');
      
      // Format results for ToolResultsRenderer compatibility
      const formattedResults = searchResults.map(result => ({
        title: `Semantic Match (${Math.round(result.similarity * 100)}%)`,
        content: result.content,
        similarity: result.similarity,
        metadata: result.metadata,
        url: result.metadata?.url || null,
        snippet: result.content.substring(0, 200) + '...'
      }));
      
      return {
        success: true,
        message: `Found ${searchResults.length} semantic matches for "${query}"`,
        data: {
          query,
          results: formattedResults,
          source: 'semantic_search',
          totalResults: searchResults.length
        },
        // ToolResultsRenderer compatible format
        results: formattedResults
      };

    } catch (error) {
      console.error('❌ Semantic search failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Semantic search failed for "${query}": ${error.message}`
      };
    }
  },
  timeout: 10000,
  retryPolicy: { maxRetries: 2, backoff: 'linear' }
};

// Settings Tool
const settingsTool: ToolDefinition = {
  name: 'update-settings',
  category: 'client',
  schema: {
    type: 'object',
    properties: {
      setting: { type: 'string' },
      value: { type: 'string' }
    },
    required: ['setting', 'value']
  },
  async execute(params, context) {
    return {
      action: 'update-settings',
      setting: params.setting,
      value: params.value,
      timestamp: Date.now()
    };
  },
  timeout: 2000
};

// Settings Tool (Alias) - For agentic commands like "change my theme to dark"
const updateSettingsTool: ToolDefinition = {
  name: 'update_settings',
  category: 'client',
  schema: {
    type: 'object',
    properties: {
      setting: { type: 'string' },
      value: { type: 'string' },
      reason: { type: 'string' }
    },
    required: ['setting', 'value']
  },
  async execute(params, context) {
    const { setting, value, reason } = params;
    
    // Import SettingsService dynamically
    const { settingsService } = await import('./SettingsService');
    
    try {
      // Apply the setting
      settingsService.setSetting(setting, value);
      
      // Dispatch an event for UI components to react
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settingsChanged', {
          detail: { setting, value, reason }
        }));
      }
      
      return {
        success: true,
        action: 'update_settings',
        setting,
        value,
        reason,
        message: `Successfully updated ${setting} to ${value}`,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        action: 'update_settings',
        setting,
        value,
        error: error instanceof Error ? error.message : 'Failed to update setting',
        timestamp: Date.now()
      };
    }
  },
  timeout: 2000
};

// Game Recommendation Tool
const gameRecommendationTool: ToolDefinition = {
  name: 'recommend-game',
  category: 'client',
  schema: {
    type: 'object',
    properties: {
      topic: { type: 'string' },
      ageGroup: { type: 'string' },
      difficulty: { type: 'string' }
    }
  },
  async execute(params, context) {
    return {
      action: 'game-recommendation',
      games: ['memory-sequence', 'pattern-matching', 'inhibition'],
      reasoning: `Based on ${params.topic} and difficulty ${params.difficulty}`,
      timestamp: Date.now()
    };
  },
  timeout: 3000
};

// Canvas Chart Creation Tool
const canvasChartCreationTool: ToolDefinition = {
  name: 'canvas-chart-creation',
  category: 'hybrid',
  timeout: 20000, // INCREASED: Chart generation can be slow
  retryPolicy: {
    maxRetries: 0, // CRITICAL: Never retry canvas creation - it creates duplicates
    backoff: 'linear' as const
  },
  schema: {
    type: 'object',
    properties: {
      request: { type: 'string' },
      activateCanvas: { type: 'boolean' },
      position: { type: 'object' },
      size: { type: 'object' }
    },
    required: ['request']
  },
  async execute(params, context) {
    console.log('🎨 Canvas Chart Creation Tool - Executing with params:', params);
    
    try {
      // Generate chart data using AI
      const chartGeneration = await unifiedAPIRouter.llmCompletion(
        [{ 
          role: 'user', 
          content: `Create a chart based on this request: "${params.request}". 

Analyze the request and generate appropriate chart data in this JSON format:
{
  "chartType": "bar|line|pie|scatter",
  "title": "Chart Title",
  "series": [
    {"label": "Item 1", "value": 10},
    {"label": "Item 2", "value": 20}
  ],
  "description": "Brief description of the chart"
}

Make the data meaningful and relevant to the request. If it's a mathematical function, generate appropriate x,y coordinates. If it's data analysis, create realistic sample data.

IMPORTANT: Return ONLY the JSON object, no explanations or reasoning.` 
        }],
        'accounts/fireworks/models/gpt-oss-120b',
        { temperature: 0.0, max_tokens: 1000 } // CRITICAL: temp 0.0 = no reasoning tokens
      );

      let chartData;
      
      if (chartGeneration.success && chartGeneration.data) {
        const response = chartGeneration.data.response || chartGeneration.data.completion || '';
        
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            chartData = JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            console.warn('Failed to parse chart JSON, using fallback');
          }
        }
      }
      
      // Fallback chart data if AI generation fails
      if (!chartData) {
        chartData = {
          chartType: 'bar',
          title: 'Sample Chart',
          series: [
            { label: 'A', value: 30 },
            { label: 'B', value: 50 },
            { label: 'C', value: 80 },
            { label: 'D', value: 60 }
          ],
          description: 'Generated from: ' + params.request
        };
      }

      // CRITICAL: Sync canvas store conversation ID before adding elements
      const currentConvId = useCanvasStore.getState().currentConversationId;
      if (context.sessionId && currentConvId !== context.sessionId) {
        console.log('🔄 CoreTools: Syncing canvas store conversation ID for chart:', context.sessionId);
        useCanvasStore.getState().setCurrentConversation(context.sessionId);
      }
      console.log('🔍 CoreTools: Canvas store conversation ID:', context.sessionId || currentConvId);
      
      const chartId = CanvasStateAdapter.addChart({
        title: chartData.title,
        chartType: chartData.chartType,
        series: chartData.series,
        userRequest: params.request, // Pass the original request for parsing
        position: params.position || { x: 100, y: 100 },
        size: params.size || { width: 600, height: 400 }
      });
      
      console.log('📊 CoreTools: Added chart to canvas store with ID:', chartId);
      
      // CRITICAL FIX: Also add to ConversationService so it persists across conversation switches
      const chartElement = useCanvasStore.getState().canvasElementsByConversation[context.sessionId]?.find(el => el.id === chartId);
      if (chartElement) {
        const { conversationService } = await import('./ConversationService');
        conversationService.addCanvasElement({
          ...chartElement,
          type: 'chart',
          title: chartData.title,
          content: { title: chartData.title, chartType: chartData.chartType, series: chartData.series }
        });
        console.log('✅ CoreTools: Synced chart element to ConversationService');
      }
      
      // Debug: Check if element was actually added
      const elementsAfter = useCanvasStore.getState().getCurrentCanvasElements();
      console.log('🔍 CoreTools: Canvas elements after add:', elementsAfter.length);

      return {
        success: true,
        data: {
          message: `✅ Chart created successfully: "${chartData.title}"`,
          chartData: chartData,
          canvasActivated: params.activateCanvas
        }
      };

    } catch (error) {
      console.error('❌ Canvas chart creation failed:', error);
      return {
        success: false,
        error: `Failed to create chart: ${error.message}`
      };
    }
  }
};

// Canvas Document Creation Tool
const canvasDocumentCreationTool: ToolDefinition = {
  name: 'canvas-document-creation',
  category: 'hybrid',
  timeout: 120000, // 120 seconds - Long documents with streaming can take time
  retryPolicy: {
    maxRetries: 0, // CRITICAL: Never retry canvas creation - it creates duplicates
    backoff: 'linear' as const
  },
  schema: {
    type: 'object',
    properties: {
      request: { type: 'string' },
      activateCanvas: { type: 'boolean' },
      position: { type: 'object' },
      size: { type: 'object' },
      mode: { type: 'string', enum: ['create', 'revise', 'append'], default: 'create' },
      targetDocumentId: { type: 'string' }
    },
    required: ['request']
  },
  async execute(params, context) {
    console.log('📄 Canvas Document Creation Tool - Executing with params:', params);
    
    // Check for cancellation at start
    if ((context as any).cancelled) {
      console.log('🛑 Canvas document creation cancelled at start');
      return {
        success: false,
        error: 'Document creation cancelled by user',
        cancelled: true
      };
    }
    
    try {
      // ENHANCED REVISION DETECTION - Check params, intentAnalysis, and revision keywords
      const intentAnalysis = params.intentAnalysis || {};
      const isRevisionRequest = params.preferAppend === true || 
                                params.targetDocumentId || 
                                intentAnalysis.isCanvasRevision === true ||
                                intentAnalysis.targetDocumentId ||
                                /\b(write more|add to|expand|continue|append|update|revise|modify|edit).*(doc|document)\b/i.test(params.request);
      
      if (isRevisionRequest) {
        console.log('🧠 CoreTools: Detected revision request, searching for existing document across multiple sources');
        
        let existingDoc = null;
        
        // SOURCE 0: If targetDocumentId is provided directly (from params or intentAnalysis), use it
        const targetDocId = params.targetDocumentId || intentAnalysis.targetDocumentId;
        if (targetDocId) {
          console.log('📄 CoreTools: Using provided targetDocumentId:', targetDocId);
          const store = useCanvasStore.getState();
          const targetConversationId = context?.sessionId || store.currentConversationId;
          const allElements = store.canvasElementsByConversation[targetConversationId] || [];
          existingDoc = allElements.find((el: any) => el.id === targetDocId && el.type === 'document');
          if (existingDoc) {
            console.log('📄 CoreTools: Found target document by ID:', existingDoc.id);
          }
        }
        
        // SOURCE 1: Check canvas store if no target ID provided
        if (!existingDoc) {
        try {
        const store = useCanvasStore.getState();
        
        // Use sessionId from context if available
        const targetConversationId = context?.sessionId || store.currentConversationId;
        const allElements = store.canvasElementsByConversation[targetConversationId] || [];
        
        console.log('📄 CoreTools: Looking for documents in conversation:', {
          targetConversationId,
          currentConversationId: store.currentConversationId,
          elementCount: allElements.length,
          elementIds: allElements.map(e => e.id)
        });
        
          // CRITICAL FIX: Find the document with the most versions
          // This ensures V3 is applied to the same document as V2
          existingDoc = allElements
            .filter(el => el.type === 'document')
            .sort((a, b) => {
              // First sort by number of versions or currentVersion (highest first)
              const revA = a.currentVersion || a.versions?.length || a.content?.revisionNumber || 1;
              const revB = b.currentVersion || b.versions?.length || b.content?.revisionNumber || 1;
              if (revA !== revB) return revB - revA;
              
              // Then by timestamp (most recent first)
              return Number(b.timestamp || 0) - Number(a.timestamp || 0);
            })[0];
        
        if (existingDoc) {
            console.log('📄 CoreTools: Found existing document in canvas store:', {
              id: existingDoc.id,
              conversationId: existingDoc.conversationId,
              currentVersion: existingDoc.currentVersion,
              versionCount: existingDoc.versions?.length
            });
          }
        } catch (error) {
          console.warn('⚠️ CoreTools: Canvas store check failed:', error);
        }
        } // Close the if (!existingDoc) block from line 1220
        
        // SOURCE 2: Check external state machine if canvas store is empty/stale
        if (!existingDoc) {
          try {
            // Try to access FSM through global state or window object if available
            const fsm = (globalThis as any).canvasStateMachine?.getState?.() || null;
            
            if (fsm && fsm.state?.elements) {
              // Find the most recent document in FSM
              const fsmDocuments = Object.values(fsm.state.elements)
                .filter((el: any) => el.type === 'document')
                .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
              
              if (fsmDocuments.length > 0) {
                const fsmDoc = fsmDocuments[0] as any;
                // Convert FSM format to expected canvas format
                existingDoc = {
                  id: fsmDoc.id,
                  type: 'document',
                  content: {
                    title: fsmDoc.content || 'Document',
                    content: fsmDoc.versions?.length > 0 ? 
                      fsmDoc.versions[fsmDoc.versions.length - 1].content : 
                      (fsmDoc.content || ''),
                    revisionNumber: fsmDoc.versions?.length || 1,
                    revisionHistory: fsmDoc.versions?.map((v: any, i: number) => ({
                      version: i + 1,
                      content: v.content,
                      timestamp: v.createdAt,
                      request: v.request || (i === 0 ? 'Original version' : 'Revision')
                    })) || []
                  },
                  timestamp: fsmDoc.createdAt || new Date().toISOString()
                };
                console.log('📄 CoreTools: Found existing document in FSM:', existingDoc.id);
              }
            }
          } catch (error) {
            console.warn('⚠️ CoreTools: FSM check failed:', error);
          }
        }
        
        // SOURCE 3: Check optimized session context for document continuity hints (using TokenAwareContextManager)
        if (!existingDoc) {
          try {
            // Wait for services to be ready
            await serviceContainer.waitForReady();
            
            let recentMessages: any[] = [];
            
            try {
              // Try to use TokenAwareContextManager for optimized context
              const tokenAwareContextManager = serviceContainer.get('tokenAwareContextManager') as any;
              const optimizedContext = await tokenAwareContextManager.getOptimizedContext(
                context?.sessionId || 'unknown', 
                context?.userId,
                params.request
              );
              
              recentMessages = optimizedContext.messages || [];
              console.log('📄 CoreTools: Using TokenAwareContextManager for document context', {
                messageCount: recentMessages.length,
                compressionApplied: optimizedContext.compressionApplied
              });
              
            } catch (tokenManagerError) {
              console.warn('⚠️ CoreTools: TokenAwareContextManager not available, using fallback context:', tokenManagerError);
              // Fallback to empty array - no legacy context structure
              recentMessages = [];
            }
            
            // Look for recent document creation messages in conversation
            const documentCreationPattern = /Document created.*?["'](.+?)["']|created successfully.*?["'](.+?)["']/i;
            
            for (const msg of recentMessages.reverse()) {
              if (msg.role === 'assistant' && documentCreationPattern.test(msg.content)) {
                console.log('📄 CoreTools: Found document reference in conversation history');
                // Create a minimal document structure for continuity
                existingDoc = {
                  id: 'session-document-' + Date.now(),
                  type: 'document',
                  content: {
                    title: 'Document',
                    content: '', // Will be built from conversation context
                    revisionNumber: 1,
                    revisionHistory: []
                  },
                  timestamp: new Date().toISOString()
                };
                break;
              }
            }
          } catch (error) {
            console.warn('⚠️ CoreTools: Session context check failed:', error);
          }
        }
        
        if (existingDoc) {
          console.log('📄 CoreTools: Successfully found existing document for revision:', {
            id: existingDoc.id,
            title: existingDoc.content?.title || 'Unknown',
            revisionNumber: existingDoc.content?.revisionNumber || 1,
            source: existingDoc.id.includes('session-') ? 'session-context' : 'state-management'
          });
          // CRITICAL FIX: Add intentAnalysis to context so createDocumentRevision can use it
          const contextWithIntent = {
            ...context,
            intentAnalysis: params.intentAnalysis // Pass through from ToolCallingHandler
          };
          return await createDocumentRevision(params, contextWithIntent, existingDoc, params.preferAppend || false);
        } else {
          console.log('📄 CoreTools: No existing document found across all sources, will create new document');
        }
      }
      
      // 🧠 SMART CONTENT DETECTION: Check if user already provided content in conversation
      let documentContent = '';
      let documentTitle = 'Generated Document';
      
      // 🎯 IMPROVED: Broader detection for back-reference requests
      // Catches: "make it a document", "put this in canvas", "document this", "write that as a document", etc.
      const requestLower = params.request.toLowerCase();
      const hasBackReference = 
        requestLower.includes('make it') || 
        requestLower.includes('put it') ||
        requestLower.includes('this') || 
        requestLower.includes('that') ||
        requestLower.includes('write it') ||
        requestLower.includes('create it') ||
        requestLower.includes('turn it') ||
        requestLower.includes('convert') ||
        params.request.length < 50; // Short requests often reference previous context
        
      const wantsDocument = 
        requestLower.includes('document') || 
        requestLower.includes('canvas') ||
        requestLower.includes('write') ||
        params.intentAnalysis?.canvasActivation?.type === 'document';
      
      // Get conversation context for back-references
      let conversationContext = '';
      if (context.session?.conversationHistory) {
        const recentMessages = context.session.conversationHistory.slice(-8);
        conversationContext = recentMessages
          .map((msg: any) => `${msg.isUser ? 'User' : 'AI'}: ${(msg.text || msg.content || '').substring(0, 500)}`)
          .join('\n');
        console.log('📄 CoreTools: Built conversation context from', recentMessages.length, 'messages');
      }
      
      // Check if request is asking to convert existing content to document
      if (hasBackReference && wantsDocument && context.session?.conversationHistory) {
        console.log('🧠 CoreTools: Detected conversion/back-reference request');
        
        // Get the last few messages to find the content
        const recentMessages = context.session.conversationHistory.slice(-5);
        const lastAssistantMessage = recentMessages.filter((msg: any) => !msg.isUser).pop();
        
        if (lastAssistantMessage && (lastAssistantMessage.text || lastAssistantMessage.content)) {
          const msgContent = lastAssistantMessage.text || lastAssistantMessage.content;
          if (msgContent.length > 100) {
            documentContent = msgContent;
            console.log('📄 CoreTools: Using existing content from conversation, length:', documentContent.length);
            
            // Extract title from content or request
            const contentLines = documentContent.split('\n');
            const possibleTitle = contentLines.find((line: string) => 
              line.includes('diary') || line.includes('journal') || line.startsWith('#') || 
              (line.length > 10 && line.length < 100 && !line.includes('|'))
            );
            
            if (possibleTitle) {
              documentTitle = possibleTitle.replace(/^#+\s*/, '').replace(/[🌟📥📌📚🎯❤️🧘‍♀️]/g, '').trim();
            } else {
              documentTitle = params.request.replace(/create it as|make it a|convert to|turn into|document|canvas|write/gi, '').trim() || 'Converted Document';
            }
          }
        }
      }
      
      // 🎯 Store conversation context for document generation to use
      params.conversationContext = conversationContext;
      
      // If no existing content found, delegate to document generation service
      if (!documentContent) {
        console.log('📄 CoreTools: No existing content found, delegating to document generation');
        // FIXED: Use available services instead of looking for intentService
        const cognitiveAnalyzer = serviceContainer.get('unifiedCognitiveAnalyzer');
        if (!cognitiveAnalyzer) {
          throw new Error('UnifiedCognitiveAnalyzer not available for enhanced generation');
        }
        
              // Check for cancellation
      if (context.cancelled) {
        console.log('🛑 Canvas document creation cancelled');
        return {
          success: false,
          error: 'Document creation cancelled by user',
          cancelled: true
        };
      }
      
      // Use CanvasDocumentService for generation
      try {
        console.log('📄 CoreTools: Delegating to CanvasDocumentService');
        
        // SIMPLIFIED: Just pass the intent analysis directly from ToolCallingHandler
        const intentAnalysis = params.intentAnalysis || null;
        
        // 🧠 LLM-BASED MEMORY INJECTION: Use intent analysis, NOT regex
        // The LLM determines what's relevant based on semantic understanding
        let personalMemories = '';
        
        if (context.userId && context.userId !== 'anonymous') {
          try {
            // 🎯 STEP 1: Use LLM to analyze what memories are needed
            // The intentAnalysis from UnifiedCognitiveAnalyzer already contains semantic understanding
            const conversationContext = params.conversationContext || '';
            const fullRequest = `${params.request} ${conversationContext}`;
            
            // 🎯 STEP 2: ALWAYS search for relevant memories - let vector similarity decide
            // The search query is the full request - semantic search handles relevance
            const { vectorSearchService } = await import('./VectorSearchService');
            const vectorResults = await vectorSearchService.semanticSearch(
              fullRequest,  // Use full request as search query
              undefined,
              context.userId,
              15,   // Get more results, let similarity sort
              0.40  // Lower threshold - include more, filter by relevance
            );
            
            console.log('🧠 CoreTools: Vector search returned', vectorResults.length, 'results for canvas');
            
            // 🎯 STEP 3: Filter out canvas docs (they're not personal memories)
            // Use PERSONAL_CATEGORIES from single source of truth
            const { PERSONAL_CATEGORIES, isDocumentCategory } = await import('./MemoryCategoryRegistry');
            
            const personalResults = vectorResults.filter((r: any) => {
              const category = (r.category || r.metadata?.category || '').toLowerCase();
              const key = (r.memory_key || r.key || '').toLowerCase();
              
              // Exclude canvas documents and document categories
              if (isDocumentCategory(category)) return false;
              if (key.startsWith('canvas_')) return false;
              
              // Include ALL personal categories (name, family, friend, colleague, pet, hobby, etc.)
              if (PERSONAL_CATEGORIES.includes(category)) return true;
              
              // Also include education categories for course context
              if (['education', 'course', 'learning_moment'].includes(category)) return true;
              
              // Include 'general' category (legacy data often has useful info)
              if (category === 'general') return true;
              
              // Include if similarity is very high (semantic relevance)
              if (r.similarity && r.similarity > 0.55) return true;
              
              return false;
            });
            
            console.log('🧠 CoreTools: After personal filter:', personalResults.length, 'memories');
            
            // 🎯 STEP 4: Format memories for injection
            if (personalResults.length > 0) {
              personalMemories = personalResults
                .slice(0, 8)  // Top 8 most relevant
                .map((m: any) => {
                  const key = m.memory_key || m.key || 'info';
                  const content = m.content || m.memory_value || '';
                  const category = m.category || m.metadata?.category || '';
                  return `- [${category}] ${key}: ${content}`;
                })
                  .join('\n');
              console.log('🧠 CoreTools: Injecting', personalResults.length, 'memories into canvas');
            }
          } catch (memError) {
            console.warn('⚠️ CoreTools: Failed to fetch memories:', memError);
          }
        }
        
        // Add memories to params for document generation
        params.personalMemories = personalMemories;
        
        // 🎓 COURSE CONTEXT INTEGRATION: Add learning context if user has active courses
        let courseContext = '';
        if (context.userId && context.userId !== 'anonymous') {
          try {
            const { unifiedLearningContextService } = await import('./UnifiedLearningContextService');
            const learningContext = await unifiedLearningContextService.getLearningContext(context.userId);
            
            if (learningContext && (learningContext.recentCourses?.length > 0 || learningContext.currentProgress)) {
              // Format course info for canvas context
              const courses = learningContext.recentCourses || [];
              if (courses.length > 0) {
                courseContext = `\n\nUSER'S ACTIVE COURSES:\n${courses.slice(0, 3).map((c: any) => 
                  `- ${c.title || c.courseName} (${c.progress || 0}% complete)`
                ).join('\n')}`;
              }
              
              if (learningContext.currentProgress) {
                courseContext += `\nCurrent step: ${learningContext.currentProgress.currentStep || 0}/${learningContext.currentProgress.totalSteps || 0}`;
              }
              
              console.log('🎓 CoreTools: Added course context to canvas');
            }
          } catch (courseError) {
            console.warn('⚠️ CoreTools: Failed to fetch course context:', courseError);
          }
        }
        
        // Combine memories with course context
        params.personalMemories = personalMemories + courseContext;
        
        console.log('📄 CoreTools: Passing to CanvasDocumentService:', {
          hasIntentAnalysis: !!intentAnalysis,
          lengthRequirement: intentAnalysis?.lengthRequirement,
          hasConversationContext: !!params.conversationContext,
          hasPersonalMemories: !!personalMemories,
          hasCourseContext: !!courseContext
        });
        
        const result = await canvasDocumentService.generateDocument(params, intentAnalysis);
        documentContent = result.content;
        documentTitle = result.title;
      } catch (error) {
        console.error('📄 CoreTools: LLM generation failed, using fallback:', error);
        
        // Check for cancellation
        if (context.cancelled) {
          console.log('🛑 Canvas document creation cancelled after generation');
          return {
            success: false,
            error: 'Document creation cancelled by user',
            cancelled: true
          };
        }
        
        // Fallback: Generate simple content
        documentContent = `# ${params.request}\n\n[Document content will be generated based on your request]\n\nRequest: "${params.request}"`;
        documentTitle = params.request.substring(0, 50) || 'Generated Document';
      }
      } // Close the if (!documentContent) block from line 1293
      
      // Final fallback if content is still empty
      if (!documentContent || documentContent === 'Unable to generate document content.') {
        documentContent = `# ${params.request}\n\nThis document was created based on your request: "${params.request}"\n\nPlease note: The AI content generation service may be experiencing issues. You can edit this document directly in the canvas.`;
        console.log('📄 CoreTools: Used fallback content');
      }

      const documentData = {
        type: 'document',
        title: documentTitle,
        content: documentContent,
        metadata: {
          wordCount: documentContent.split(' ').length,
          readingTime: Math.ceil(documentContent.split(' ').length / 200), // Words per minute
          sections: documentContent.split('\n').filter(line => line.trim().startsWith('#')),
          type: 'generated',
          style: 'professional'
        },
        exportFormats: ['txt', 'md', 'pdf']
      };

      // CRITICAL: Sync canvas store conversation ID before adding elements
      const canvasCurrentId = useCanvasStore.getState().currentConversationId;
      if (context.sessionId && canvasCurrentId !== context.sessionId) {
        console.log('🔄 CoreTools: Syncing canvas store conversation ID:', context.sessionId);
        useCanvasStore.getState().setCurrentConversation(context.sessionId);
      }
      
      // Add document to canvas store via CanvasStateAdapter
      const documentId = CanvasStateAdapter.addDocument({
        title: documentTitle,
        content: documentContent,
        position: params.position || { x: 50, y: 50 },
        size: params.size || { width: 700, height: 500 },
        metadata: {
          wordCount: documentContent.split(' ').length,
          readingTime: Math.ceil(documentContent.split(' ').length / 200),
          sections: documentContent.split('\n').filter(line => line.trim().startsWith('#'))
        }
      });
      
      console.log('📄 CoreTools: Added document to canvas store with ID:', documentId, '(versions created automatically)');
      
      // CRITICAL FIX: Also add to ConversationService so it persists across conversation switches
      const canvasElement = useCanvasStore.getState().canvasElementsByConversation[context.sessionId]?.find(el => el.id === documentId);
      if (canvasElement) {
        const { conversationService } = await import('./ConversationService');
        conversationService.addCanvasElement({
          ...canvasElement,
          type: 'document',
          title: documentTitle,
          content: { title: documentTitle, content: documentContent }
        });
        console.log('✅ CoreTools: Synced canvas element to ConversationService');
      }

      return {
        success: true,
        data: {
          documentData: documentData,
          canvasActivated: params.activateCanvas
        }
      };

    } catch (error) {
      console.error('❌ Canvas document creation failed:', error);
      return {
        success: false,
        error: `Failed to create document: ${error.message}`
      };
    }
  }
};

// Helper function to detect request type for structured fallback
function detectRequestType(request: string): string {
  const req = request.toLowerCase();
  if (req.includes('table')) return 'table';
  if (req.includes('roadmap') || req.includes('timeline')) return 'roadmap';
  if (req.includes('swot')) return 'swot';
  if (req.includes('q1') || req.includes('q2') || req.includes('q3') || req.includes('q4')) return 'quarterly';
  if (req.includes('section')) return 'section';
  if (req.includes('milestones') || req.includes('milestone')) return 'milestones';
  return 'general';
}

// Helper function to generate structured fallback content
function generateStructuredFallback(type: string, request: string, existingContent: string): string {
  switch (type) {
    case 'table':
      return `## Data Overview

| Item | Description | Value | Status |
|------|-------------|-------|--------|
| Metric 1 | Performance indicator | 85% | Good |
| Metric 2 | Usage statistics | 1,250 | Growing |
| Metric 3 | Quality score | 4.2/5 | Excellent |`;

    case 'roadmap':
    case 'quarterly':
      return `## Roadmap

### Phase 1: Planning (Month 1)
- Define objectives and key results
- Resource allocation
- Stakeholder alignment

### Phase 2: Execution (Months 2-3)
- Core implementation
- Quality assurance
- Progress tracking

### Phase 3: Review (Month 4)
- Performance analysis
- Lessons learned
- Next steps planning`;

    case 'swot':
      return `## SWOT Analysis

### Strengths
- Strong market position
- Experienced team
- Proven track record

### Weaknesses
- Limited resources
- Market dependencies
- Technical debt

### Opportunities
- Market expansion
- New technologies
- Strategic partnerships

### Threats
- Competition
- Market changes
- Regulatory challenges`;

    case 'milestones':
      return `## Key Milestones

- **M1**: Project kickoff and scope definition
- **M2**: Requirements finalized and approved
- **M3**: Prototype completed and tested
- **M4**: Beta release and user feedback
- **M5**: Final launch and deployment`;

    case 'section':
    case 'general':
    default:
      // Extract topic from request (remove "add" etc)
      const topic = request.replace(/^(add|create|write|generate)\s+(a|an|the)?\s*(section|chapter|part)?\s*(about|on|for)?\s*/i, '').trim();
      
      return `## ${topic.charAt(0).toUpperCase() + topic.slice(1)}

### Overview
${topic.charAt(0).toUpperCase() + topic.slice(1)} represents an important area of focus with significant implications for business and strategy. This section explores key aspects, trends, and considerations.

### Key Characteristics
- **Market Dynamics**: The landscape is shaped by rapid changes and evolving consumer preferences
- **Innovation Focus**: Continuous adaptation and technological integration drive success
- **Strategic Positioning**: Understanding competitive advantages and market positioning is crucial

### Current Trends
- Digital transformation and technology adoption
- Sustainable practices and social responsibility
- Globalization and cross-border opportunities
- Customer-centric approaches and personalization

### Strategic Considerations
- **Risk Management**: Identifying and mitigating potential challenges
- **Growth Opportunities**: Exploring expansion possibilities and partnerships
- **Operational Excellence**: Streamlining processes for efficiency
- **Competitive Advantage**: Developing unique value propositions

### Implementation Approach
1. **Assessment Phase**: Evaluate current state and identify gaps
2. **Planning Phase**: Develop comprehensive strategy and roadmap
3. **Execution Phase**: Implement initiatives with clear milestones
4. **Review Phase**: Monitor progress and adjust based on results

### Success Metrics
- Performance indicators aligned with strategic goals
- Quantifiable outcomes and benchmarks
- Continuous improvement and learning

### Future Outlook
As the landscape continues to evolve, staying informed about emerging trends and maintaining flexibility will be key to long-term success in ${topic}.`;
  }
}

// Helper function for document revision
async function createDocumentRevision(params: any, context: any, existingDoc: any, isAppend: boolean = false): Promise<any> {
  try {
    console.log('📄 CoreTools: Creating document revision for:', existingDoc.id, { isAppend });
    
    // Get intent analysis if available from context (passed from ToolCallingHandler)
    let intentAnalysisData = context.intentAnalysis || null;
    
    // Check if this is a remove/undo request
    const requestLower = (params.request || '').toLowerCase();
    const isRemoveRequest = requestLower.includes('remove that') || requestLower.includes('delete that') ||
                            requestLower.includes('undo that') || requestLower.includes('remove last') ||
                            requestLower.includes('remove the last') || requestLower.includes('take out');
    
    if (isRemoveRequest) {
      console.log('🗑️ CoreTools: Remove/undo request detected');
      
      // Remove the last version if there are multiple versions
      if (existingDoc.versions && existingDoc.versions.length > 1) {
        const { updateCanvasElement } = useCanvasStore.getState();
        
        // Remove the last version
        const updatedVersions = existingDoc.versions.slice(0, -1);
        const newCurrentVersion = updatedVersions.length;
        
        updateCanvasElement(existingDoc.id, {
          versions: updatedVersions,
          currentVersion: newCurrentVersion
        });
        
        console.log(`✅ Removed last version. Now at version ${newCurrentVersion}`);
        
        return {
          success: true,
          data: {
            message: `✅ Removed the last section. Document is now at Version ${newCurrentVersion}.`,
            isRevision: true,
            revisionType: 'remove'
          }
        };
      } else {
        return {
          success: false,
          error: 'Cannot remove - this is the only version of the document.'
        };
      }
    }
    
    // Get existing content and metadata from new version format
    const currentRevisionNumber = existingDoc.currentVersion || existingDoc.versions?.length || existingDoc.content?.revisionNumber || 1;
    const latestVersion = existingDoc.versions?.[existingDoc.versions.length - 1];
    const existingContent = latestVersion?.content || existingDoc.content?.content || existingDoc.content || '';
    const existingTitle = existingDoc.content?.title || existingDoc.title || 'Document';
    const existingHistory = existingDoc.content?.revisionHistory || [];
    
    // Delta versioning support (non-breaking enhancement)
    // CRITICAL FIX: Properly establish and use base content for delta versioning
    let baseContent = existingDoc.content?.baseContent;
    
    // If no baseContent exists, establish it based on revision number
    if (!baseContent) {
      if (currentRevisionNumber === 1) {
        // V1 document: the current content IS the base content
        baseContent = existingContent;
      } else {
        // V2+ document without baseContent: try to extract V1 from history or use current as fallback
        const v1History = existingHistory.find((h: any) => h.version === 1);
        baseContent = v1History?.content || existingContent;
      }
    }
    
    const versionDeltas = existingDoc.content?.versionDeltas || [];
    
    console.log('📄 CoreTools: Delta versioning context', {
      currentRevision: currentRevisionNumber,
      baseContentLength: baseContent.length,
      existingContentLength: existingContent.length,
      deltaCount: versionDeltas.length,
      willPassBaseOnly: currentRevisionNumber > 1
    });
    
    // Use UnifiedCognitiveAnalyzer for LLM-based analysis
    const cognitiveAnalyzer = serviceContainer.get('unifiedCognitiveAnalyzer');
    if (!cognitiveAnalyzer) {
      throw new Error('UnifiedCognitiveAnalyzer not available for document revision');
    }
    
    // If we don't have intent analysis from context, generate it now
    if (!intentAnalysisData) {
      console.log('🎯 CoreTools: Generating LLM analysis for document revision');
    const cognitiveResult = await cognitiveAnalyzer.analyzeMessage({
      message: params.request,
      sessionContext: {
        sessionId: context?.sessionId,
        userId: context?.userId
      }
    });
    
      // Update intentAnalysisData
      intentAnalysisData = {
      primaryIntent: cognitiveResult.intent.primaryIntent,
      processingMode: cognitiveResult.processingMode.mode,
      confidence: cognitiveResult.confidence,
      layer2_intent: cognitiveResult.intent,
        canvasActivation: cognitiveResult.canvasActivation,
        // Include full intent for enhanced generation
        intent: cognitiveResult.intent,
        // CRITICAL: Include lengthRequirement and complexityLevel for token calculation
        lengthRequirement: cognitiveResult.intent.lengthRequirement,
        complexityLevel: cognitiveResult.intent.complexityLevel,
        characteristics: {
          // 🧠 LLM-POWERED: Use cognitive analysis for natural language understanding
          isAppend: cognitiveResult.intent.primaryIntent === 'modification' || 
                    cognitiveResult.intent.primaryIntent === 'creation' ||
                    cognitiveResult.intent.secondaryIntent?.includes('continue') ||
                    cognitiveResult.intent.secondaryIntent?.includes('expand') ||
                    cognitiveResult.intent.secondaryIntent?.includes('append'),
          isRevision: cognitiveResult.intent.primaryIntent === 'modification'
        }
      };
      
      console.log('✅ Generated NPU analysis for revision:', {
        primaryDomain: intentAnalysisData.intent?.primaryDomain,
        complexityLevel: intentAnalysisData.intent?.complexityLevel,
        lengthRequirement: intentAnalysisData.lengthRequirement
      });
    } else {
      console.log('✅ Using intent analysis from context:', {
        lengthRequirement: intentAnalysisData.lengthRequirement,
        complexityLevel: intentAnalysisData.complexityLevel
      });
    }
    
    // Use CanvasDocumentService for revision
    console.log('📄 CoreTools: Delegating to CanvasDocumentService for revision');
    
    // 🎯 CRITICAL: Build conversation context so AI knows WHAT to add
    // When user says "add it", we need the AI's previous proposal from conversation
    let conversationContext = '';
    try {
      const conversationHistory = context.session?.conversationHistory || [];
      if (conversationHistory.length > 0) {
        // Get last 4-6 messages to capture the proposal
        const recentMessages = conversationHistory.slice(-6);
        conversationContext = recentMessages
          .map((m: any) => {
            // Handle both formats: { role: 'user' } and { isUser: true }
            const isUser = m.isUser === true || m.role === 'user';
            return `${isUser ? 'User' : 'AI'}: ${String(m.content || m.text || '').substring(0, 600)}`;
          })
          .join('\n');
        console.log('📄 CoreTools: Built conversation context for revision', {
          messageCount: recentMessages.length,
          contextLength: conversationContext.length,
          preview: conversationContext.substring(0, 200)
        });
      }
    } catch (e) {
      console.warn('⚠️ CoreTools: Failed to build conversation context:', e);
    }
    
    // Add conversation context to params
    const paramsWithContext = {
      ...params,
      conversationContext
    };
    
    const result = await canvasDocumentService.generateRevision(paramsWithContext, existingDoc, intentAnalysisData, isAppend);
    const newContent = result.content;
    const revisedTitle = result.title;
    
    // Prepare revision history early
    let updatedHistory = [...existingHistory];
    
    // If this is the first revision (going from v1 to v2), save v1 to history
    if (currentRevisionNumber === 1 && updatedHistory.length === 0) {
      updatedHistory.push({
        version: 1,
        content: existingContent,
        title: existingTitle,
        timestamp: existingDoc.timestamp || new Date().toISOString(),
        request: 'Original version'
      });
    }
    
    // Build final content (already cumulative from service)
    const finalContent = newContent;
    
    // Delta versioning tracking
    let updatedVersionDeltas = [...versionDeltas];
    let updatedBaseContent = baseContent;
    
    // If this is the first revision (V1 -> V2), establish base content
    if (currentRevisionNumber === 1 && !updatedBaseContent) {
      updatedBaseContent = existingContent;
    }
    
    
 
    // Create the new revision number
    const newRevisionNumber = currentRevisionNumber + 1;
    
    // CRITICAL FIX: Store the CURRENT version in history before creating the new one
    // This ensures V2 content is properly stored when V3 is created
    const currentVersionEntry = {
      version: currentRevisionNumber,
      content: existingContent,
      title: existingTitle,
      timestamp: new Date().toISOString(),
      request: existingDoc.content?.lastRevisionRequest || 'Previous version'
    };
    
    // Check if current version already in history
    const currentVersionInHistory = updatedHistory.some(h => h?.version === currentRevisionNumber);
    if (!currentVersionInHistory && currentRevisionNumber > 0) {
      updatedHistory.push(currentVersionEntry);
      console.log(`📄 CoreTools: Stored V${currentRevisionNumber} in history before creating V${newRevisionNumber}`);
    }
    
    console.log('📄 CoreTools: Delta versioning update', {
      oldRevision: currentRevisionNumber,
      newRevision: newRevisionNumber,
      deltaCount: updatedVersionDeltas.length,
      finalContentLength: finalContent.length,
      baseContentLength: updatedBaseContent.length
    });

    // CRITICAL FIX: Sort history by version number to ensure proper ordering
    try {
      // Remove any accidental current version entries (the new version being created)
      updatedHistory = updatedHistory.filter(h => h?.version !== newRevisionNumber);
      
      // Sort history by version number
      updatedHistory.sort((a, b) => (a?.version || 0) - (b?.version || 0));
      
      console.log('📄 CoreTools: Revision history updated, current version will be typed');
      console.log('📄 CoreTools: History versions:', updatedHistory.map(h => h?.version));
    } catch {}
    
    // Add new version to document using new format
    // Extract conversation ID from existing element or context
    const elementConversationId = existingDoc.conversationId || context?.sessionId;
    
    console.log('📄 CoreTools: Adding version with conversation ID:', {
      elementId: existingDoc.id,
      conversationId: elementConversationId,
      contextSessionId: context?.sessionId
    });
    
    console.log('📄 CoreTools: ABOUT TO ADD VERSION - DIAGNOSTIC:', {
      elementId: existingDoc.id,
      existingContent_length: existingContent.length,
      existingContent_preview: existingContent.substring(0, 100),
      newContent_length: newContent.length,
      newContent_preview: newContent.substring(0, 200),
      finalContent_length: finalContent.length,
      finalContent_preview: finalContent.substring(0, 200),
      isAppend
    });
    
    const newVersionNumber = CanvasStateAdapter.addVersionToDocument(
      existingDoc.id,
      finalContent,
      params.request || `Version ${newRevisionNumber}`,
      elementConversationId // Pass explicit conversation ID
    );
    
    // Update title if it changed
    if (revisedTitle !== existingDoc.content?.title) {
      CanvasStateAdapter.updateDocument(existingDoc.id, {
        title: revisedTitle
      });
    }
    
    console.log('📄 CoreTools: New version added to document', {
      id: existingDoc.id,
      conversationId: elementConversationId,
      oldVersion: currentRevisionNumber,
      newVersion: newVersionNumber,
      isAppend,
      contentLength: finalContent.length,
      finalContentPreview: finalContent.substring(0, 300)
    });

    return {
      success: true,
      data: {
        message: `✅ I've ${isAppend ? 'added new content to' : 'revised'} "${revisedTitle}" (Version ${newVersionNumber}). ${params.request ? `Updated based on your request: "${params.request}".` : ''} The ${isAppend ? 'additions are' : 'changes are'} now being typed in your Canvas Workspace.`,
        documentData: {
          type: 'document',
          title: revisedTitle,
          content: finalContent,
          revisionNumber: newVersionNumber,
          lastRevisionRequest: params.request
        },
        canvasActivated: params.activateCanvas,
        isRevision: true,
        revisionType: isAppend ? 'append' : 'revision'
      }
    };

  } catch (error) {
    console.error('❌ Document revision failed:', error);
    return {
      success: false,
      error: `Failed to ${isAppend ? 'append to' : 'revise'} document: ${error.message}`
    };
  }
}

// Canvas Code Creation Tool
const canvasCodeCreationTool: ToolDefinition = {
  name: 'canvas-code-creation',
  category: 'hybrid',
  timeout: 20000, // INCREASED: Code generation can be slow
  retryPolicy: {
    maxRetries: 0, // CRITICAL: Never retry canvas creation - it creates duplicates
    backoff: 'linear' as const
  },
  schema: {
    type: 'object',
    properties: {
      request: { type: 'string' },
      language: { type: 'string' },
      activateCanvas: { type: 'boolean' },
      position: { type: 'object' },
      size: { type: 'object' }
    },
    required: ['request']
  },
  async execute(params, context) {
    console.log('💻 Canvas Code Creation Tool - Executing with params:', params);
    
    try {
      // Generate code using AI with better model
      const codeGeneration = await unifiedAPIRouter.llmCompletion(
        [
          { 
            role: 'system', 
            content: 'You are an expert programmer. Generate clean, functional, well-commented code. Always respond with ONLY valid JSON in this exact format: {"language": "python|javascript|etc", "code": "actual code", "title": "Brief Title", "description": "What it does"}'
          },
          { 
            role: 'user', 
            content: `Generate code for: ${params.request}`
          }
        ],
        'accounts/fireworks/models/gpt-oss-120b', // Use full model path
        { 
          temperature: 0.2, 
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        }
      );

      console.log('💻 CoreTools: LLM response structure:', {
        hasData: !!codeGeneration.data,
        hasContent: !!codeGeneration.content,
        hasChoices: !!codeGeneration.choices,
        keys: Object.keys(codeGeneration || {})
      });

      let codeData;
      try {
        // Extract response from various possible formats
        // Try direct content first (UnifiedAPIRouter format)
        const response = codeGeneration.content ||
                        codeGeneration.data?.content ||
                        codeGeneration.data?.response ||
                        codeGeneration.data?.completion ||
                        codeGeneration.data?.generated_text ||
                        codeGeneration.data?.choices?.[0]?.message?.content ||
                        codeGeneration.data?.choices?.[0]?.text ||
                        codeGeneration.choices?.[0]?.message?.content ||
                        '';
        
        console.log('💻 CoreTools: Extracted response:', response.substring(0, 200));
        
        const codeContent = String(response).trim();
        
        // Try to parse as JSON first
        if (codeContent.startsWith('{') && codeContent.endsWith('}')) {
          codeData = JSON.parse(codeContent);
          console.log('💻 CoreTools: Parsed JSON code data:', { language: codeData.language, codeLength: codeData.code?.length });
        } else {
          // Fallback: create structured data from plain text
          const language = params.language || 'python';
          codeData = {
            language: language,
            code: codeContent,
            title: `Generated ${language.charAt(0).toUpperCase() + language.slice(1)} Code`,
            description: `Code generated for: ${params.request}`
          };
          console.log('💻 CoreTools: Using fallback code structure');
        }
      } catch (parseError) {
        console.warn('💻 Failed to parse AI response, using fallback:', parseError);
        // Create fallback code structure
        const language = params.language || 'python';
        codeData = {
          language: language,
          code: `# Generated code for: ${params.request}\n# Please modify as needed\n\nprint("Hello, World!")`,
          title: `${params.request}`,
          description: `Code generated for: ${params.request}`
        };
      }

      // CRITICAL: Sync canvas store conversation ID before adding elements
      const canvasConvId = useCanvasStore.getState().currentConversationId;
      if (context.sessionId && canvasConvId !== context.sessionId) {
        console.log('🔄 CoreTools: Syncing canvas store conversation ID for code:', context.sessionId);
        useCanvasStore.getState().setCurrentConversation(context.sessionId);
      }
      
      // Add code to canvas store via CanvasStateAdapter
      const codeId = CanvasStateAdapter.addCode({
        language: codeData.language,
        code: codeData.code,
        title: codeData.title,
        description: codeData.description,
        position: params.position || { x: 150, y: 150 },
        size: params.size || { width: 700, height: 500 }
      });
      
      console.log('💻 CoreTools: Added code to canvas store with ID:', codeId);
      
      // CRITICAL FIX: Also add to ConversationService so it persists across conversation switches
      const codeElement = useCanvasStore.getState().canvasElementsByConversation[context.sessionId]?.find(el => el.id === codeId);
      if (codeElement) {
        const { conversationService } = await import('./ConversationService');
        conversationService.addCanvasElement({
          ...codeElement,
          type: 'code',
          title: codeData.title,
          content: { title: codeData.title, code: codeData.code, language: codeData.language }
        });
        console.log('✅ CoreTools: Synced code element to ConversationService');
      }

      return {
        success: true,
        data: {
          message: `✅ Code created successfully: "${codeData.title}"`,
          codeData: codeData,
          canvasActivated: params.activateCanvas
        }
      };

    } catch (error) {
      console.error('❌ Canvas Code Creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: { message: '❌ Failed to create code. Please try again.' }
      };
    }
  }
};

// Register all core tools
let coreToolsRegistered = false;
export function registerCoreTools(): void {
  if (coreToolsRegistered) {
    console.log('🔧 Core tools already registered, skipping...');
    return;
  }
  
  console.log('🔧 Registering core tools...');
  coreToolsRegistered = true;
  
  // Memory Management Tool
  const memoryTool = {
    name: 'store_memory',
    description: 'Store and retrieve user memories across chat sessions',
    schema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string' as const, enum: ['store', 'retrieve', 'search'] },
        key: { type: 'string' as const, description: 'Memory key/identifier' },
        value: { type: 'string' as const, description: 'Memory content to store' },
        query: { type: 'string' as const, description: 'Search query for retrieving memories' }
      },
      required: ['action']
    },
    category: 'server' as const,
    execute: async (params: any, context: any) => {
      try {
        console.log('🚀 STATE-OF-ART MEMORY TOOL: Using VectorSearchService + HNSW');
        
        const userId = context?.userId || context?.user?.id || 'anonymous';
        console.log('🔍 Memory Tool User ID:', userId);
        
        // ✅ USE STATE-OF-THE-ART: VectorSearchService with HNSW acceleration
        const serviceContainer = await import('./ServiceContainer').then(m => m.serviceContainer);
        await serviceContainer.waitForReady();
        
        const vectorSearchService = serviceContainer.get('vectorSearchService');
        
        if (params.action === 'store') {
          console.log('💾 VECTOR STORAGE: Generating embedding and storing with HNSW');
          
          // 🚀 GENERATE EMBEDDING FIRST - This is critical for semantic search
          const contentToStore = params.value || params.content;
          const embedding = await vectorSearchService.generateEmbedding(contentToStore);
          
          console.log('🧠 Generated embedding with', embedding.length, 'dimensions');
          
          // CRITICAL FIX: Smart category and entity type detection
          // Prevents family member names from being confused with user's name
          const entityType = this.detectEntityType(params.key);
          const category = this.determineMemoryCategory(params.key, entityType);
          
          console.log('🔍 Memory categorization:', {
            key: params.key,
            entityType,
            category,
            content: contentToStore.substring(0, 50)
          });
          
          // 🚀 STORE WITH EMBEDDING using the correct storeEmbedding method
          await vectorSearchService.storeEmbedding({
            id: `${userId}_${params.key}_${Date.now()}`,
            content: contentToStore,
            embedding: embedding,
            metadata: {
              userId: userId,
              key: params.key,
              memoryKey: params.key,
              entityType: entityType, // 'user' | 'family' | 'friend' | 'pet' | 'general'
              category: category, // Properly categorized
              contentType: params.key.includes('name') ? 'user_info' : 'general',
              timestamp: Date.now(),
              source: 'conversation'
            }
          });
          
          console.log('✅ VECTOR STORAGE SUCCESS: Memory stored with HNSW-accelerated embeddings');
          return { 
            success: true, 
            message: 'Memory stored with vector embeddings for semantic search', 
            data: { 
              key: params.key,
              embeddingDimensions: embedding.length,
              source: 'hnsw_vector_storage'
            } 
          };
          
        } else if (params.action === 'search' || params.action === 'retrieve') {
          console.log('🔍 VECTOR SEARCH: Using HNSW-accelerated semantic similarity');
          
          // 🚀 SEMANTIC SEARCH with proper parameters
          const results = await vectorSearchService.semanticSearch(
            params.query || params.key,
            undefined, // Let it auto-generate query embedding
            userId,
            5, // limit
            0.3 // similarityThreshold - lower for broader search
          );
          
          console.log('🎯 VECTOR SEARCH RESULTS:', results);
          
          // 🎯 CRITICAL FIX: Include ALL fields that RecallMachine expects
          // RecallMachine uses: memory_key, metadata.category, memory_value
          // 🔥 VectorSearchService returns `id` (aliased from memory_key in DB) - check `id` FIRST!
          const memories = results.map((result: any) => ({
            // RecallMachine expects memory_key - VectorSearchService returns it as `id`!
            memory_key: result.id || result.memory_key || result.metadata?.memoryKey || result.metadata?.key || result.key || 'memory',
            key: result.id || result.memory_key || result.metadata?.memoryKey || result.metadata?.key || result.key || 'memory',
            content: result.content,
            memory_value: result.content,
            value: result.content,
            similarity: result.similarity,
            category: result.metadata?.category || 'general',
            timestamp: result.metadata?.timestamp || Date.now(),
            // Pass through full metadata for RecallMachine
            metadata: result.metadata || {}
          }));
          
          return { 
            success: true, 
            memories: memories,
            count: memories.length,
            source: 'vector_search_hnsw',
            message: `Found ${memories.length} relevant memories using semantic search`
          };
        }
        
        return { success: false, error: 'Invalid action' };
      } catch (error) {
        console.error('❌ Vector Memory tool error:', error);
        // FALLBACK: Use basic memory API if vector search fails
        console.log('🔄 FALLBACK: Using basic memory API');
        
        try {
          const response = await fetch('/api/memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: params.action,
              userId: userId,
              key: params.key,
              value: params.value,
              query: params.query
            })
          });
          
          const result = await response.json();
          return { ...result, source: 'fallback_api' };
        } catch (fallbackError) {
          return { success: false, error: (error as Error).message };
        }
      }
      }
};

// Educational Coder Tool - For basic explanations, flowcharts, and math
const educationalCoderTool: ToolDefinition = {
  name: 'educational_coder',
  category: 'server',
  schema: {
    type: 'object',
    properties: {
      explanationType: {
        type: 'string',
        enum: ['step_by_step', 'flowchart', 'math_calculation', 'process_breakdown', 'algorithm_explanation']
      },
      topic: { type: 'string' },
      complexity: {
        type: 'string',
        enum: ['simple', 'intermediate']
      }
    },
    required: ['explanationType', 'topic']
  },
  async execute(params, context) {
    const { explanationType, topic, complexity = 'simple' } = params;
    
    try {
      console.log('🎓 Educational Coder - Generating explanation:', { explanationType, topic, complexity });
      
      let result = '';
      let explanation = '';
      let title = '';
      
      switch (explanationType) {
        case 'step_by_step':
          ({ content: result, explanation, title } = generateStepByStep(topic, complexity));
          break;
        case 'flowchart':
          ({ content: result, explanation, title } = generateSimpleFlowchart(topic, complexity));
          break;
        case 'math_calculation':
          ({ content: result, explanation, title } = generateMathCalculation(topic, complexity));
          break;
        case 'process_breakdown':
          ({ content: result, explanation, title } = generateProcessBreakdown(topic, complexity));
          break;
        case 'algorithm_explanation':
          ({ content: result, explanation, title } = generateAlgorithmExplanation(topic, complexity));
          break;
        default:
          throw new Error(`Unsupported explanation type: ${explanationType}`);
      }
      
      return {
        success: true,
        data: {
          type: 'educational_explanation',
          title: title || `${explanationType} for ${topic}`,
          content: result,
          explanation: explanation,
          explanationType: explanationType,
          topic: topic,
          complexity: complexity
        },
        message: `Generated ${explanationType} explanation for ${topic}`
      };
      
    } catch (error) {
      console.error('🎓 Educational Coder - Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Educational explanation failed',
        data: null
      };
    }
  }
};

// Educational helper functions
function generateStepByStep(topic: string, complexity: string) {
  const topicLower = topic.toLowerCase();
  
  if (topicLower.includes('photosynthesis')) {
    return {
      content: `## Step-by-Step: Photosynthesis Process

**Step 1: Light Absorption**
Chloroplasts in plant leaves capture sunlight
Light energy hits chlorophyll molecules
Energy conversion begins

**Step 2: Water Splitting (Light Reactions)**
Water molecules (H₂O) are broken apart
Oxygen (O₂) is released as a byproduct
Energy is stored in ATP and NADPH

**Step 3: Carbon Dioxide Capture**
Plants take in CO₂ from the air through stomata
CO₂ enters the Calvin Cycle

**Step 4: Sugar Production (Dark Reactions)**
ATP and NADPH provide energy
CO₂ is converted into glucose (C₆H₁₂O₆)
Food is created for the plant

### Simple Equation:
\`\`\`
6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂
\`\`\``,
      explanation: 'Step-by-step breakdown makes photosynthesis easy to understand',
      title: 'Photosynthesis: Step by Step'
    };
  }
  
  if (topicLower.includes('algebra') || topicLower.includes('solve')) {
    return {
      content: `## Step-by-Step: Solving Algebraic Equations

**Step 1: Identify the Equation Type**
Linear equation (x + 5 = 10)
Quadratic equation (x² + 2x = 8)
Look for the highest power of x

**Step 2: Isolate the Variable**
Move all x terms to one side
Move all numbers to the other side
Use inverse operations

**Step 3: Simplify**
Combine like terms
Divide or multiply to get x alone
Check your answer

### Example:
\`\`\`
2x + 6 = 14
2x = 14 - 6
2x = 8
x = 4
\`\`\``,
      explanation: 'Clear steps for solving any algebraic equation',
      title: 'Algebra: Step-by-Step Solution'
    };
  }
  
  return {
    content: `## Step-by-Step: ${topic}

**Step 1: Understand the Problem**
Break down what you need to do
Identify the key components

**Step 2: Plan Your Approach**
Decide on the method
Gather necessary information

**Step 3: Execute the Solution**
Follow your plan systematically
Check each step as you go

**Step 4: Verify Your Answer**
Does the result make sense?
Test with different examples`,
    explanation: `General step-by-step framework for ${topic}`,
    title: `${topic}: Step-by-Step Guide`
  };
}

function generateSimpleFlowchart(topic: string, complexity: string) {
  const topicLower = topic.toLowerCase();
  
  if (topicLower.includes('solve') || topicLower.includes('problem')) {
    return {
      content: `## Problem Solving Flowchart

\`\`\`
┌─────────────────┐
│  Start Problem  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Understand What │
│  Is Being Asked │
└─────────┬───────┘
          │
          ▼
    ┌─────────┐
    │ Do I    │ ──Yes──→ ┌─────────────┐
    │ Know    │          │ Apply Known │
    │ How?    │          │  Method     │
    └─────┬───┘          └─────────────┘
          │                      │
         No                      │
          │                      │
          ▼                      │
┌─────────────────┐              │
│  Research or    │              │
│   Ask for Help  │              │
└─────────┬───────┘              │
          │                      │
          ▼                      │
┌─────────────────┐              │
│ Try Solution    │ ←────────────┘
└─────────┬───────┘
          │
          ▼
    ┌─────────┐
    │ Does    │ ──No───→ ┌─────────────┐
    │ It      │          │ Try Another │
    │ Work?   │          │  Approach   │
    └─────┬───┘          └─────────────┘
          │                      │
         Yes                     │
          │                      │
          ▼              ←───────┘
┌─────────────────┐
│   Success!      │
│ Problem Solved  │
└─────────────────┘
\`\`\``,
      explanation: 'Visual flowchart for systematic problem solving',
      title: 'Problem Solving Process'
    };
  }
  
  return {
    content: `## ${topic} Flowchart

\`\`\`
┌─────────────┐
│    Start    │
│   ${topic}  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Step 1    │
│  Prepare    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Step 2    │
│  Execute    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Step 3    │
│  Complete   │
└─────────────┘
\`\`\``,
    explanation: `Simple flowchart layout for ${topic}`,
    title: `${topic} Flow`
  };
}

function generateMathCalculation(topic: string, complexity: string) {
  const topicLower = topic.toLowerCase();
  
  if (topicLower.includes('quadratic') || topicLower.includes('x²')) {
    return {
      content: `## Math Calculation: Quadratic Functions

### Basic Form: y = ax² + bx + c

### Key Calculations:

**1. Vertex Formula:**
\`\`\`
x = -b/(2a)
y = f(-b/(2a))
\`\`\`

**2. Discriminant:**
\`\`\`
Δ = b² - 4ac

If Δ > 0: Two real solutions
If Δ = 0: One real solution  
If Δ < 0: No real solutions
\`\`\`

**3. Quadratic Formula:**
\`\`\`
x = (-b ± √(b² - 4ac)) / 2a
\`\`\`

**Example: x² - 4x + 3 = 0**
a = 1, b = -4, c = 3
Δ = (-4)² - 4(1)(3) = 16 - 12 = 4
x = (4 ± √4) / 2 = (4 ± 2) / 2
Solutions: x = 3 or x = 1`,
      explanation: 'Essential quadratic function calculations with examples',
      title: 'Quadratic Math Calculations'
    };
  }
  
  if (topicLower.includes('percentage') || topicLower.includes('%')) {
    return {
      content: `## Math Calculation: Percentages

### Basic Percentage Formulas:

**1. Find Percentage:**
\`\`\`
Percentage = (Part/Whole) × 100
\`\`\`

**2. Find the Part:**
\`\`\`
Part = (Percentage/100) × Whole
\`\`\`

**3. Find the Whole:**
\`\`\`
Whole = Part ÷ (Percentage/100)
\`\`\`

**Quick Examples:**

**25% of 80 = ?**
(25/100) × 80 = 20

**15 is what % of 60?**
(15/60) × 100 = 25%

**30% of what number is 21?**
21 ÷ (30/100) = 70`,
      explanation: 'Essential percentage calculations for everyday use',
      title: 'Percentage Calculations'
    };
  }
  
  return {
    content: `## Math Calculation: ${topic}

### Key Formula:
\`\`\`
[Insert relevant formula here]
\`\`\`

### Step-by-Step:
1. **Identify** what you know
2. **Choose** the right formula  
3. **Substitute** your values
4. **Calculate** the result
5. **Check** if it makes sense

### Example:
\`\`\`
[Show worked example]
\`\`\``,
    explanation: `Mathematical framework for ${topic}`,
    title: `${topic} Calculations`
  };
}

function generateProcessBreakdown(topic: string, complexity: string) {
  return {
    content: `## Process Breakdown: ${topic}

**Phase 1: Preparation**
Gather materials/information
Set up your workspace
Review the requirements

**Phase 2: Execution**
Follow the steps systematically
Monitor progress as you go
Make adjustments if needed

**Phase 3: Completion**
Verify the results
Clean up and organize
Document what you learned

**Key Success Factors:**
✓ Patience - Don't rush the process
✓ Attention to detail - Small things matter
✓ Persistence - Keep going when it gets tough`,
    explanation: `Systematic breakdown of the ${topic} process`,
    title: `${topic} Process Breakdown`
  };
}

function generateAlgorithmExplanation(topic: string, complexity: string) {
  const topicLower = topic.toLowerCase();
  
  if (topicLower.includes('search') || topicLower.includes('find')) {
    return {
      content: `## Algorithm Explanation: Binary Search

### The Problem:
Find a specific item in a **sorted** list quickly

### The Algorithm:
\`\`\`
1. Start with the middle item
2. If it's what you want → FOUND!
3. If your target is smaller → search left half
4. If your target is larger → search right half
5. Repeat until found or no items left
\`\`\`

**Why It's Fast:**
Each step eliminates half the remaining items
For 1000 items, you need at most 10 steps
Much faster than checking every item!

### Example - Finding 7 in [1,3,5,7,9,11,13]:
\`\`\`
Step 1: Check 7 (middle) → FOUND! ✓
\`\`\``,
      explanation: 'Simple explanation of how binary search works',
      title: 'Binary Search Algorithm'
    };
  }
  
  return {
    content: `## Algorithm Explanation: ${topic}

### What It Does:
[Brief description of the algorithm's purpose]

### How It Works:
1. **Input**: What data does it need?
2. **Process**: What steps does it follow?
3. **Output**: What result does it produce?

**Why Use This Algorithm:**
Efficiency: How fast is it?
Reliability: Does it always work?
Simplicity: Is it easy to understand?

### Simple Example:
\`\`\`
[Show a basic example]
\`\`\``,
    explanation: `Clear explanation of the ${topic} algorithm`,
    title: `${topic} Algorithm Explained`
  };
}

toolRegistry.register(llmCompletionTool);
  toolRegistry.register(memoryTool);
  
  // 🧠 UNIFIED MEMORY SEARCH TOOL - Coordinates all memory systems
  const unifiedMemorySearchTool: ToolDefinition = {
    name: 'unified_memory_search',
    category: 'server',
    timeout: 30000,
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'store'] },
        query: { type: 'string', description: 'Memory search query or content to store' },
        key: { type: 'string', description: 'Memory key for storage' },
        content: { type: 'string', description: 'Memory content for storage' },
        userId: { type: 'string', description: 'User identifier' },
        sessionId: { type: 'string', description: 'Session identifier' },
        context: { 
          type: 'object', 
          description: 'Additional context for memory search',
          properties: {
            conversationContext: { type: 'object' },
            userPreferences: { type: 'object' },
            sessionHistory: { type: 'object' }
          }
        }
      },
      required: ['action', 'userId']
    },
    execute: async (params: any, context: any) => {
      try {
        console.log('🧠 UnifiedMemorySearchTool: Processing request:', params);
        
        // Initialize unified memory manager
        await unifiedMemoryManager.initialize();
        
        // Create unified memory request
        const memoryRequest: UnifiedMemoryRequest = {
          userId: params.userId || context?.userId || 'anonymous',
          sessionId: params.sessionId || context?.sessionId || `session_${Date.now()}`,
          query: params.query,
          action: params.action || 'search',
          data: params.data,
          context: params.context || {}
        };
        
        if (params.action === 'search') {
          // Use unified memory search
          const result = await unifiedMemoryManager.searchMemories(memoryRequest);
          
          console.log('✅ UnifiedMemorySearchTool: Search completed:', {
            success: result.success,
            count: result.count,
            sources: result.sources
          });
          
          return {
            success: result.success,
            data: {
              memories: result.memories,
              count: result.count,
              sources: result.sources,
              message: result.message
            },
            metadata: {
              executionTime: Date.now() - (context?.startTime || Date.now()),
              retryCount: 0
            }
          };
        } else if (params.action === 'store') {
          // Use unified memory storage - FIX: Build proper request structure
          const storeRequest: UnifiedMemoryRequest = {
            userId: params.userId || context?.userId || 'anonymous',
            sessionId: params.sessionId || context?.sessionId || `session_${Date.now()}`,
            query: params.query || 'store',
            action: 'store',
            data: {
              key: params.key || `memory_${Date.now()}`,
              content: params.content || params.query,
              metadata: params.context || {}
            },
            context: params.context || {}
          };
          
          const result = await unifiedMemoryManager.storeMemory(storeRequest);
          
          return {
            success: result.success,
            data: {
              message: result.message,
              count: result.count
            },
            metadata: {
              executionTime: Date.now() - (context?.startTime || Date.now()),
              retryCount: 0
            }
          };
        }
        
        return {
          success: false,
          error: 'Invalid action specified',
          data: null
        };
        
      } catch (error: any) {
        console.error('❌ UnifiedMemorySearchTool error:', error);
        return {
          success: false,
          error: error?.message || 'Unified memory search failed',
          data: {
            memories: [],
            count: 0,
            sources: [],
            message: 'Memory search failed'
          }
        };
      }
    }
  };
  
  toolRegistry.register(unifiedMemorySearchTool);
  toolRegistry.register(webSearchTool);
  
  // Web Search Engine Tool - Professional Perplexity-style responses
  const webSearchEngineTool: ToolDefinition = {
    name: 'web-search-engine',
    category: 'server',
    timeout: 60000,
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        searchType: { type: 'string', enum: ['auto', 'web', 'semantic', 'intelligent'] },
        userId: { type: 'string' },
        sessionId: { type: 'string' },
        conversationContext: { type: 'array', items: { type: 'string' } }
      },
      required: ['query', 'userId', 'sessionId']
    },
    execute: async (params: any, context?: any) => {
      try {
        console.log('🔍 WebSearchEngine: Executing professional search with Perplexity formatting');
        
        const searchContext = await webSearchEngine.executeSearch({
          query: params.query,
          userId: params.userId,
          sessionId: params.sessionId,
          searchType: params.searchType || 'auto',
          conversationContext: params.conversationContext || []
        });

        // Log what we're returning to help debug image issues
        console.log('🖼️ WebSearchEngine tool returning:', {
          hasImages: !!searchContext.images,
          imageCount: searchContext.images?.length || 0,
          imagesPreview: searchContext.images?.slice(0, 2)
        });
        
        return {
          success: true,
          data: searchContext,
          perplexityResponse: searchContext.perplexityResponse,
          suggestions: searchContext.suggestions,
          message: searchContext.perplexityResponse 
            ? `Professional analysis complete with ${searchContext.results.length} sources`
            : `Found ${searchContext.results.length} search results`
        };
      } catch (error) {
        console.error('🚨 WebSearchEngine error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Search failed',
          data: null
        };
      }
    }
  };
  
  toolRegistry.register(webSearchEngineTool);
  
  // News Orchestrator Tool - Systematic multi-category news discovery
  const newsOrchestratorTool: ToolDefinition = {
    name: 'news-orchestrator',
    category: 'server',
    timeout: 90000, // Extended timeout for comprehensive news search
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        userId: { type: 'string' },
        sessionId: { type: 'string' },
        conversationContext: { type: 'array', items: { type: 'string' } }
      },
      required: ['query', 'userId', 'sessionId']
    },
    execute: async (params: any, context?: any) => {
      try {
        console.log('📰 NewsOrchestrator: Executing systematic news search');
        
        const newsResponse = await newsOrchestrator.orchestrateNewsSearch({
          query: params.query,
          userId: params.userId,
          sessionId: params.sessionId,
          conversationContext: params.conversationContext || []
        });

        return {
          success: true,
          data: {
            ...newsResponse,
            query: params.query // Ensure query is available for UI rendering
          },
          metadata: {
            executionTime: newsResponse.searchTime,
            categoriesSearched: newsResponse.categories.length,
            totalResults: newsResponse.totalResults,
            toolType: 'news-orchestrator'
          }
        };
      } catch (error) {
        logger.error('News orchestration failed', 'CoreTools', {
          error: error instanceof Error ? error.message : String(error),
          sessionId: context?.sessionId,
          query: params.query
        });
        
        return {
          success: false,
          error: `News search failed: ${error instanceof Error ? error.message : String(error)}`,
          metadata: { executionTime: 0, retryCount: context?.retryCount || 0 }
        };
      }
    }
  };
  
  toolRegistry.register(newsOrchestratorTool);
  
  // Intelligent Search Tool - Deep research with comprehensive analysis
  const intelligentSearchTool: ToolDefinition = {
    name: 'intelligent-search',
    category: 'server',
    timeout: 45000,
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        depth: { type: 'string', enum: ['basic', 'comprehensive', 'expert'], default: 'comprehensive' },
        numResults: { type: 'number', minimum: 5, maximum: 15, default: 10 }
      },
      required: ['query']
    },
    execute: async (params: any, context?: any) => {
      try {
        console.log('🧠 IntelligentSearch: Deep research mode activated for:', params.query);
        
        // Use enhanced web search with more results for comprehensive analysis
        const { apiService } = await import('../services/APIService');
        
        const searchResponse = await apiService.webSearch(params.query, {
          num: params.numResults || 10,
          // Enhanced parameters for intelligent search
          safeSearch: 'moderate',
          type: 'search'
        });
        
        if (!searchResponse.success) {
          console.error('❌ Intelligent search failed:', searchResponse.error);
          return {
            success: false,
            error: searchResponse.error || 'Intelligent search service failed',
            message: `Could not perform intelligent search for "${params.query}": ${searchResponse.error || 'Service unavailable'}`
          };
        }
        
        // Enhance results with intelligent analysis markers
        const enhancedResults = searchResponse.data?.results?.map((result: any, index: number) => ({
          ...result,
          intelligenceScore: Math.max(0.7, 1 - (index * 0.05)), // Higher scores for top results
          analysisDepth: params.depth,
          researchContext: 'comprehensive_analysis'
        })) || [];
        
        console.log('🧠 IntelligentSearch: Enhanced', enhancedResults.length, 'results with intelligence scoring');
        
        return {
          success: true,
          data: {
            ...searchResponse.data,
            results: enhancedResults,
            searchType: 'intelligent',
            analysisDepth: params.depth,
            intelligenceEnhanced: true
          },
          message: `Intelligent search completed: ${enhancedResults.length} comprehensive results analyzed`
        };
        
      } catch (error) {
        console.error('❌ Intelligent search failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Intelligent search failed',
          message: `Could not perform intelligent search for "${params.query}": ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    retryPolicy: { maxRetries: 2, backoff: 'exponential' }
  };
  
  toolRegistry.register(intelligentSearchTool);
  toolRegistry.register(readerTool);
  toolRegistry.register(fireworksImageTool);
  // REMOVED: toolRegistry.register(imageGenerationTool); - duplicate removed, using fireworksImageTool
  toolRegistry.register(chartCreationTool);
  toolRegistry.register(interactiveChartTool);  // 'create-chart' - used by document canvas chart extraction
  toolRegistry.register(textCreationTool);
  toolRegistry.register(educationalCoderTool);
  toolRegistry.register(navigationTool);
  toolRegistry.register(navigateToPageTool);  // Agentic navigation alias
  toolRegistry.register(databaseQueryTool);
  toolRegistry.register(userContextTool);
  // mathDiagramTool REMOVED - use chartCreationTool instead
  toolRegistry.register(weatherTool);
  toolRegistry.register(semanticSearchTool);
  toolRegistry.register(settingsTool);
  toolRegistry.register(updateSettingsTool);  // Agentic settings alias
  toolRegistry.register(gameRecommendationTool);
  toolRegistry.register(canvasChartCreationTool);
  toolRegistry.register(canvasDocumentCreationTool);
  toolRegistry.register(canvasCodeCreationTool);

  // Add logging middleware (reduced verbosity)
  toolRegistry.addMiddleware({
    before: async (_toolName, _params, _context) => {
      // Tool execution logging disabled for production
    },
    after: async (_toolName, _result, _context) => {
      // Tool completion logging disabled for production
    }
  });

  console.log(`✅ Registered ${toolRegistry.listTools().length} core tools`);
}

/**
 * CRITICAL HELPER: Detect entity type from memory key
 * Prevents family member names from being stored as user's name
 */
function detectEntityType(key: string): 'user' | 'family' | 'friend' | 'pet' | 'general' {
  const keyLower = key.toLowerCase();
  
  // PRIORITY 1: Exact user keys
  if (keyLower === 'user_name' || keyLower === 'my_name') {
    return 'user';
  }
  
  // PRIORITY 2: Family member keys
  const familyKeywords = ['son', 'daughter', 'brother', 'sister', 'mother', 'father', 
                          'mom', 'dad', 'wife', 'husband', 'spouse', 'parent', 'child',
                          'uncle', 'aunt', 'cousin', 'grandma', 'grandpa', 'grandfather', 'grandmother'];
  
  for (const keyword of familyKeywords) {
    if (keyLower.includes(keyword + '_') || keyLower.startsWith(keyword)) {
      return 'family';
    }
  }
  
  // PRIORITY 3: Friend keys
  const friendKeywords = ['friend', 'buddy', 'colleague', 'coworker', 'classmate', 'roommate'];
  for (const keyword of friendKeywords) {
    if (keyLower.includes(keyword)) {
      return 'friend';
    }
  }
  
  // PRIORITY 4: Pet keys
  const petKeywords = ['pet', 'dog', 'cat', 'bird', 'fish', 'hamster', 'rabbit'];
  for (const keyword of petKeywords) {
    if (keyLower.includes(keyword)) {
      return 'pet';
    }
  }
  
  return 'general';
}

/**
 * CRITICAL HELPER: Determine proper memory category
 * Ensures user info vs family info are properly separated
 */
function determineMemoryCategory(key: string, entityType: 'user' | 'family' | 'friend' | 'pet' | 'general'): string {
  // CRITICAL: User's own information always gets 'user' category
  if (entityType === 'user') {
    return 'user';
  }
  
  // Family/friends/pets get their entity type as category
  if (entityType === 'family' || entityType === 'friend' || entityType === 'pet') {
    return entityType;
  }
  
  // Fallback to key-based detection for backwards compatibility
  const keyLower = key.toLowerCase();
  if (keyLower.includes('name')) return 'name';
  if (keyLower.includes('location') || keyLower.includes('place')) return 'location';
  if (keyLower.includes('hobby') || keyLower.includes('interest')) return 'hobby';
  if (keyLower.includes('job') || keyLower.includes('work') || keyLower.includes('profession')) return 'profession';
  
  return 'general';
}