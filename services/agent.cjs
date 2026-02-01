// For Node.js versions without native fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Tool Schema Definition for GPT-OSS
const tools = [
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
      "name": "get_wikipedia_summary",
      "description": "Fetch a concise Wikipedia summary (with thumbnail if available) for a topic or entity.",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Topic or entity name to look up on Wikipedia"
          }
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
          "query": {
            "type": "string",
            "description": "News query"
          },
          "timeRange": {
            "type": "string",
            "enum": ["day", "week", "month"],
            "description": "Optional recency filter"
          }
        },
        "required": ["query"]
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
  {
    "type": "function",
    "function": {
      "name": "recommend_game",
      "description": "Recommend educational games based on user interests, age, or learning goals. Use this when users want to play games or learn specific topics.",
      "parameters": {
        "type": "object",
        "properties": {
          "topic": {
            "type": "string",
            "description": "The learning topic or subject area"
          },
          "age_group": {
            "type": "string",
            "enum": ["3-5", "6-8", "9-12", "13+"],
            "description": "The age group for game recommendations"
          },
          "difficulty": {
            "type": "string",
            "enum": ["easy", "medium", "hard"],
            "description": "The difficulty level"
          }
        },
        "required": ["topic"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "web_search",
      "description": "Searches the live internet for up-to-date information, news, current events, or topics beyond its 2023 knowledge cutoff.",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "A concise search query, like one you would type into Google."
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
      "description": "Retrieves the current weather for a specific location.",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "The city and country, e.g., 'Taraz, Kazakhstan'."
          }
        },
        "required": ["location"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "accessibility_support",
      "description": "Apply accessibility settings for users with disabilities like color blindness, visual impairments, or other accessibility needs.",
      "parameters": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["color_blindness_support", "high_contrast", "large_text", "screen_reader"],
            "description": "The type of accessibility support needed"
          },
          "subtype": {
            "type": "string",
            "enum": ["protanopia", "deuteranopia", "tritanopia"],
            "description": "For color blindness, the specific type"
          }
        },
        "required": ["type"]
      }
    }
  },

  {
    "type": "function",
    "function": {
      "name": "generate_image",
      "description": "Generate creative, educational, or artistic images based on user descriptions. Use this when users want to create, make, draw, or generate visual content.",
      "parameters": {
        "type": "object",
        "properties": {
          "prompt": {
            "type": "string",
            "description": "Detailed description of the image to generate, including style, colors, objects, mood, etc."
          },
          "style": {
            "type": "string",
            "enum": ["realistic", "cartoon", "artistic", "educational", "child-friendly"],
            "description": "The visual style for the image"
          },
          "size": {
            "type": "string",
            "enum": ["512x512", "768x768", "1024x1024"],
            "description": "The size of the generated image"
          }
        },
        "required": ["prompt"]
      }
    }
  },
  {
    "type": "function", 
    "function": {
      "name": "create_math_diagram",
      "description": "Create beautiful, pedagogical mathematical diagrams and visualizations. Use for distance calculations, geometric concepts, data visualization, and educational illustrations.",
      "parameters": {
        "type": "object",
        "properties": {
          "concept": {
            "type": "string",
            "description": "The mathematical concept to illustrate (e.g., 'distance to moon', 'histogram', 'orbital mechanics', 'scale comparison')"
          },
          "data": {
            "type": "object",
            "description": "Relevant data for the diagram (numbers, labels, values, etc.)",
            "additionalProperties": true
          },
          "title": {
            "type": "string", 
            "description": "Title for the diagram"
          },
          "style": {
            "type": "string",
            "enum": ["clean", "colorful", "scientific", "child-friendly"],
            "description": "Visual style of the diagram"
          }
        },
        "required": ["concept", "title"]
      }
    }
  }
];

// INTELLIGENT TOOL ROUTING SYSTEM
const TOOL_ROUTING_CONFIG = {
  // Server-side tools (require server resources)
  server: {
    'web_search': {
      reason: 'Requires Serper API key and external API access',
      requires: ['api_key', 'external_api']
    },
    'get_weather': {
      reason: 'Requires Weather API key and external API access', 
      requires: ['api_key', 'external_api']
    },
    'generate_image': {
      reason: 'Requires Together AI API key for external API access',
      requires: ['api_key', 'external_api']
    },
    'create_math_diagram': {
      reason: 'Requires server-side SVG generation and mathematical processing',
      requires: ['server_processing', 'svg_generation']
    },
    'get_wikipedia_summary': {
      reason: 'Server fetch to Wikipedia REST API',
      requires: ['external_api']
    },
    'web_news_search': {
      reason: 'Server fetch to Serper News API',
      requires: ['api_key', 'external_api']
    },
    'canvas-document-creation': {
      reason: 'Requires LLM content generation, database access, and vector search',
      requires: ['llm_api', 'database_access', 'vector_search']
    },
    'canvas-chart-creation': {
      reason: 'Requires data processing and chart specification generation',
      requires: ['llm_api', 'data_processing']
    },
    'canvas-code-creation': {
      reason: 'Requires LLM code generation and syntax analysis',
      requires: ['llm_api', 'code_analysis']
    }
  },
  
  // Client-side tools (require browser/UI access)
  client: {
    'navigate_to_page': {
      reason: 'Requires React Router and browser navigation',
      requires: ['react_router', 'browser_api', 'ui_manipulation']
    },
    'update_settings': {
      reason: 'Requires local state management and UI updates',
      requires: ['local_storage', 'react_state', 'ui_manipulation']
    },
    'recommend_game': {
      reason: 'Requires user context and UI interaction',
      requires: ['user_context', 'ui_manipulation']
    },
    'accessibility_support': {
      reason: 'Requires CSS/DOM manipulation and browser APIs',
      requires: ['dom_manipulation', 'css_changes', 'browser_api']
    },

  }
};

// Extract server-side tool names for quick lookup
const SERVER_SIDE_TOOLS = Object.keys(TOOL_ROUTING_CONFIG.server);

// Tool execution functions (SERVER-SIDE ONLY)
async function executeTool(toolCall) {
  const { name, arguments: args } = toolCall.function;
  const parsedArgs = JSON.parse(args);
  
  console.log(`🔧 Server executing tool: ${name} with args:`, parsedArgs);
  
  // Only execute server-side tools here
  if (!SERVER_SIDE_TOOLS.includes(name)) {
    const clientToolConfig = TOOL_ROUTING_CONFIG.client[name];
    console.log(`📤 Client-side tool ${name} - delegating to client`);
    console.log(`📋 Reason: ${clientToolConfig?.reason || 'Unknown client-side tool'}`);
    
    return {
      success: true,
      message: `Tool ${name} will be executed on client (${clientToolConfig?.reason || 'UI/browser functionality required'})`,
      data: { 
        delegatedToClient: true,
        toolConfig: clientToolConfig,
        executionLocation: 'client'
      }
    };
  }
  
  const serverToolConfig = TOOL_ROUTING_CONFIG.server[name];
  console.log(`🖥️ Server-side tool ${name} - executing on server`);
  console.log(`📋 Reason: ${serverToolConfig?.reason || 'Unknown server-side tool'}`);
  console.log(`⚙️ Requirements: ${serverToolConfig?.requires?.join(', ') || 'Unknown'}`);
  
  switch (name) {
    case 'web_search':
      return await performWebSearch(parsedArgs.query);
      
    case 'get_weather':
      return await getWeatherData(parsedArgs.location);
      
    case 'generate_image':
      return await handleImageGenerationTool(parsedArgs);
      
    // create_math_diagram REMOVED - use scribble_chart_create for interactive charts
    case 'get_wikipedia_summary':
      return await getWikipediaSummary(parsedArgs.query);
    case 'web_news_search':
      return await performNewsSearch(parsedArgs.query, parsedArgs.timeRange);
      
    case 'canvas-document-creation':
      return await handleCanvasDocumentCreation(parsedArgs);
      
    case 'canvas-chart-creation':
      return await handleCanvasChartCreation(parsedArgs);
      
    case 'canvas-code-creation':
      return await handleCanvasCodeCreation(parsedArgs);
      
    default:
      return {
        success: false,
        message: `Unknown server-side tool: ${name}`
      };
  }
}

async function performWebSearch(query) {
  try {
    const SERPER_API_KEY = process.env.Serper_api;
    if (!SERPER_API_KEY || SERPER_API_KEY === 'demo-serper-key') {
      console.error('❌ SERPER API KEY MISSING: Please set a valid Serper_api key in your environment variables');
      return {
        success: false,
        error: 'Search API error: 403',
        message: 'Search API key not configured. Please add your Serper API key to environment variables.',
        data: null
      };
    }
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query })
    });

    if (!response.ok) {
      console.error('❌ Serper API error:', response.status, response.statusText);
      
      if (response.status === 403) {
        console.error('❌ SERPER API 403 - API key invalid, expired, or quota exceeded');
        console.error('❌ Current API key:', SERPER_API_KEY ? `${SERPER_API_KEY.substring(0, 10)}...` : 'NOT SET');
        console.error('❌ Please check your Serper API key at https://serper.dev/dashboard');
        
        return { 
          success: false, 
          error: 'Search API error: 403',
          message: 'Search API authentication failed. Please check your Serper API key.',
          data: null,
          details: {
            status: response.status,
            statusText: response.statusText,
            apiKeyPrefix: SERPER_API_KEY ? `${SERPER_API_KEY.substring(0, 10)}...` : 'NOT SET'
          }
        };
      }
      
      return {
        success: false,
        error: `Search API error: ${response.status}`,
        message: `Search API error: ${response.status}`,
        data: null
      };
    }

    const data = await response.json();
    
    if (data.organic && data.organic.length > 0) {
      // Extract only needed fields to minimize memory usage
      const results = data.organic.slice(0, 5).map(({ title, snippet, link, source }) => ({
        title,
        snippet,
        link,
        source
      }));
      
      // ENHANCEMENT: Also fetch images for the search query to provide rich results
      let images = [];
      try {
        const imageSearchResult = await performImageSearch(query, 6);
        console.log('🖼️ RAW performImageSearch result:', JSON.stringify(imageSearchResult, null, 2));
        if (imageSearchResult.success && imageSearchResult.data) {
          // performImageSearch returns data directly as array, not nested
          images = Array.isArray(imageSearchResult.data) ? imageSearchResult.data.slice(0, 6) : [];
          console.log(`🖼️ BACKEND: Extracted ${images.length} images`);
          console.log(`🖼️ BACKEND: Sample image:`, images[0]);
          console.log(`🖼️ BACKEND: All image URLs:`, images.map(img => img.imageUrl));
        } else {
          console.warn('⚠️ Image search returned no data:', imageSearchResult);
        }
      } catch (imageError) {
        console.warn('⚠️ Image search failed, continuing without images:', imageError.message);
      }
      
      // Clear large response data
      data.organic = null;
      data.knowledge_graph = null;
      data.related_searches = null;
      
      return {
        success: true,
        message: `Found ${results.length} search results for "${query}"`,
        data: { type: 'web_results', query, results, images }
      };
    }
    
    return {
      success: false,
      message: `No search results found for "${query}"`
    };
  } catch (error) {
    return {
      success: false,
      message: `Search failed: ${error.message}`
    };
  }
}

// Wikipedia summary fetch
async function getWikipediaSummary(query) {
  try {
    const title = encodeURIComponent(query.trim());
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
    if (!res.ok) {
      return { success: false, message: `Wikipedia fetch failed: ${res.status}` };
    }
    const data = await res.json();
    const card = {
      type: 'wiki_card',
      title: data.title,
      extract_html: data.extract_html || data.extract,
      description: data.description,
      thumbnail: data.thumbnail?.source || null,
      canonical_url: data.content_urls?.desktop?.page || data.content_urls?.mobile?.page || null
    };
    return { success: true, message: `Wikipedia: ${data.title}`, data: card };
  } catch (error) {
    return { success: false, message: `Wikipedia error: ${error.message}` };
  }
}

// Serper Image search
async function performImageSearch(query, num = 12) {
  try {
    const SERPER_API_KEY = process.env.Serper_api;
    if (!SERPER_API_KEY || SERPER_API_KEY === 'demo-serper-key') {
      console.error('❌ SERPER API KEY MISSING: Please set a valid Serper_api key for image search');
      return {
        success: false,
        error: 'Image search API error: 403',
        message: 'Image search API key not configured. Please add your Serper API key to environment variables.',
        data: null
      };
    }
    
    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, num: num })
    });

    if (!response.ok) {
      console.error('❌ Serper Image API error:', response.status, response.statusText);
      return {
        success: false,
        error: `Image search API error: ${response.status}`,
        message: `Image search failed: ${response.status}`,
        data: null
      };
    }

    const data = await response.json();
    console.log('🖼️ SERPER RAW RESPONSE:', JSON.stringify(data, null, 2).substring(0, 1000));
    console.log('🖼️ Serper Image API response:', { 
      query, 
      imagesFound: data.images?.length || 0,
      sampleImage: data.images?.[0] 
    });

    const images = (data.images || []).map(img => ({
      title: img.title || img.alt || query,
      imageUrl: img.imageUrl || img.image || img.url,  // Multiple fallbacks
      link: img.link || img.pageUrl || img.imageUrl,
      source: img.source || img.domain || 'Google Images',
      width: img.width,
      height: img.height,
      thumbnail: img.thumbnailUrl || img.thumbnail
    }));

    return {
      success: true,
      data: images
    };
    
  } catch (error) {
    console.error('❌ Image search error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Image search failed',
      data: null
    };
  }
}

// Serper News search
async function performNewsSearch(query, timeRange = 'week') {
  try {
    const SERPER_API_KEY = process.env.Serper_api;
    if (!SERPER_API_KEY) {
      return { success: false, message: 'Serper API key not configured' };
    }
    const body = { q: query, num: 6, tbs: timeRange === 'day' ? 'qdr:d' : timeRange === 'month' ? 'qdr:m' : 'qdr:w' };
    const res = await fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    const items = (data.news || []).slice(0, 6).map(n => ({
      title: n.title,
      snippet: n.snippet,
      source: n.source,
      date: n.date,
      link: n.link,
      imageUrl: n.imageUrl || null
    }));
    return { success: true, message: `Found ${items.length} news results`, data: { type: 'news_card', items } };
  } catch (error) {
    return { success: false, message: `News search error: ${error.message}` };
  }
}

async function getWeatherData(location) {
  console.log('🌟 getWeatherData called with location:', location);
  try {
    const WEATHER_API = process.env.WEATHER_API;
    console.log('🔑 WEATHER_API check:', WEATHER_API ? `Found (${WEATHER_API.substring(0, 10)}...)` : 'NOT FOUND');
    
    // In development mode, always route through Render backend with real WEATHER_API keys
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      console.log('🔄 Development mode - routing weather through Render backend with real WEATHER_API');
      
      try {
        const renderResponse = await fetch('https://neuraplay.onrender.com/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_type: 'weather',
            input_data: { location }
          })
        });
        
        if (renderResponse.ok) {
          const renderData = await renderResponse.json();
          console.log('✅ Got weather data from Render backend:', renderData);
          return renderData;
        } else {
          console.log('❌ Render backend failed, falling back to local (limited functionality)');
          throw new Error(`Render API returned ${renderResponse.status}`);
        }
      } catch (proxyError) {
        console.log('❌ Failed to reach Render, using local WEATHER_API if available:', proxyError.message);
        // Fall through to use local WEATHER_API if Render is unavailable
      }
    }
    
    if (!WEATHER_API) {
      return {
        success: false,
        message: "WEATHER_API not configured"
      };
    }
    
    // Use HTTPS and validate response before parsing
    const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API}&q=${encodeURIComponent(location)}&aqi=no`;
    console.log('🌤️ Weather API URL:', weatherUrl.replace(WEATHER_API, '***'));
    
    const response = await fetch(weatherUrl);
    
    // Check if response is OK before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Weather API HTTP error:', response.status, errorText.substring(0, 200));
      return {
        success: false,
        error: `Weather API returned ${response.status}`,
        message: `Weather service error (${response.status}). The API key may be invalid or expired.`,
        location: location
      };
    }
    
    // Check content type to avoid parsing HTML as JSON
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('❌ Weather API returned non-JSON:', contentType, textResponse.substring(0, 200));
      return {
        success: false,
        error: 'Weather API returned invalid response',
        message: `Weather service unavailable. Received non-JSON response.`,
        location: location
      };
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.log('❌ Weather API error for location:', location, data.error);
      return {
        success: false,
        error: `Location not found: ${location}`,
        message: `Could not get weather for "${location}". Please check the location name or try a major city name.`,
        location: location,
        autoDetected: false
      };
    }
    
    return {
      success: true,
      message: `Current weather for ${location}`,
      data: {
        location: data.location.name,
        country: data.location.country,
        temperature: data.current.temp_c,        // Fixed: Add "temperature" field for weather card
        temperature_c: data.current.temp_c,      // Keep original for backwards compatibility
        temperature_f: data.current.temp_f,
        description: data.current.condition.text, // Fixed: Add "description" field for weather card
        condition: data.current.condition.text,   // Keep original for backwards compatibility
        humidity: data.current.humidity,
        windSpeed: data.current.wind_kph,         // Fixed: Add "windSpeed" field for weather card
        wind_kph: data.current.wind_kph,          // Keep original for backwards compatibility
        units: 'metric',                          // Add units field for weather card
        feels_like_c: data.current.feelslike_c
      }
    };
  } catch (error) {
    console.error('Weather error:', error);
    return {
      success: false,
      message: `Weather data unavailable: ${error.message}`
    };
  }
}

// Import the math diagram and image generation functions (these would be moved here)
const { createMathDiagram } = require('./mathDiagrams.cjs');
const { handleImageGeneration } = require('./imageGeneration.cjs');

// Image generation tool handler (for agentic system)
async function handleImageGenerationTool(params) {
  try {
    const { prompt, style = 'child-friendly', size = '512x512' } = params;
    console.log('🎨 Generating image:', { prompt, style, size });
    
    const imageResult = await handleImageGeneration({ prompt, size }, process.env.Neuraplay);
    
    // Clean response without keeping large data in memory
    const finalResult = {
      success: true,
      message: `🎨 I've created a beautiful ${style} image for you: "${prompt}"`,
      data: { 
        image_url: imageResult.image_url,
        prompt,
        style,
        size
      }
    };
    
    // Clear large data from memory
    imageResult.image_url = null;
    
    return finalResult;
    
  } catch (error) {
    console.error('🔍 IMAGE GENERATION TOOL EXECUTION FAILED');
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    const errorResult = {
      success: false,
      message: `Sorry, I couldn't generate that image: ${error.message}`
    };
    
    console.log('🔍 Error result structure:', errorResult);
    return errorResult;
  }
}

// Helper function for new architecture
async function executeServerTool(toolName, parameters) {
  console.log(`🔧 Executing server tool: ${toolName}`, parameters);
  
  try {
    // Try to use new tool system first
    try {
      const { createTool } = require('../server-src/tools/concrete-tools');
      const toolMap = {
        'web_search': 'WebSearchTool',
        'news_search': 'WebSearchTool', 
        'generate_image': 'ImageGenerationTool',
        'scribble_chart_create': 'ChartCreationTool',
        'get_weather': 'WeatherTool',
        'llm_completion': 'LLMCompletionTool'
      };
      
      if (toolMap[toolName]) {
        const tool = createTool(toolMap[toolName]);
        const context = { sessionId: parameters.sessionId, userId: parameters.userId };
        
        // Handle news search special case
        if (toolName === 'news_search') {
          parameters.type = 'news';
        }
        
        const result = await tool.execute(parameters, context);
        return result;
      }
    } catch (error) {
      console.log(`⚠️ New tool system not available, falling back to legacy: ${error.message}`);
    }
    
    // Fallback to legacy system
    switch (toolName) {
      case 'web_search':
        return await performWebSearch({ query: parameters.query });
      
      case 'news_search':
        return await performWebSearch({ query: parameters.query, type: 'news' });
      
      case 'generate_image':
        return await handleImageGenerationTool(parameters);
      
      case 'scribble_chart_create':
        return await tools.scribble_chart_create.execute(parameters);
      
      case 'get_weather':
        return await getWeatherData(parameters.location);
      
      default:
        console.log(`⚠️ Unknown server tool: ${toolName}`);
        return {
          success: false,
          error: `Unknown tool: ${toolName}`
        };
    }
  } catch (error) {
    console.error(`❌ Server tool execution failed for ${toolName}:`, error);
    return {
      success: false,
      error: error.message || 'Tool execution failed'
    };
  }
}

// CANVAS TOOL HANDLERS
async function handleCanvasDocumentCreation(params) {
  try {
    console.log('📄 Creating canvas document:', params.request);
    
    // Generate document content using LLM
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'neuraplay-ai-platform.onrender.com'}` 
      : 'http://localhost:3001';
    
    const contentPrompt = `Create a comprehensive, well-structured document about: "${params.request}"

Requirements:
- Use markdown formatting with proper headers (# ## ###)
- Include relevant sections with detailed content
- Add factual information and explanations  
- Make it educational and informative
- Target length: 1000-2000 words

Generate ONLY the document content, no explanations.`;

    const response = await fetch(`${baseUrl}/api/unified-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'fireworks',
        endpoint: 'llm-completion',
        data: {
          model: 'accounts/fireworks/models/gpt-oss-120b',
          messages: [
            { role: 'system', content: 'You are an expert content creator. Generate well-structured educational documents.' },
            { role: 'user', content: contentPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.7
        }
      })
    });
    
    let documentContent = 'Document creation in progress...';
    if (response.ok) {
      const data = await response.json();
      documentContent = data.data?.[0]?.generated_text || documentContent;
    }
    
    // Extract title from content or use request
    const titleMatch = documentContent.match(/^#\s+(.+)/m);
    const documentTitle = titleMatch ? titleMatch[1] : `Document: ${params.request}`;
    
    // Return structured document data for frontend canvas
    return {
      success: true,
      data: {
        type: 'document',
        title: documentTitle,
        content: documentContent,
        metadata: {
          wordCount: documentContent.split(' ').length,
          readingTime: Math.ceil(documentContent.split(' ').length / 200),
          sections: documentContent.split('\n').filter(line => line.trim().startsWith('#')),
          type: 'generated',
          style: 'professional'
        },
        exportFormats: ['txt', 'md', 'pdf'],
        canvasActivated: params.activateCanvas,
        revisionNumber: 1,
        revisionHistory: [{
          version: 1,
          content: documentContent,
          title: documentTitle,
          timestamp: new Date().toISOString(),
          request: params.request
        }]
      },
      message: `✅ Document created: "${documentTitle}"`
    };
    
  } catch (error) {
    console.error('❌ Canvas document creation failed:', error);
    return {
      success: false,
      error: `Failed to create document: ${error.message}`
    };
  }
}

async function handleCanvasChartCreation(params) {
  try {
    console.log('📊 Creating canvas chart:', params.request);
    
    // Generate chart specification using LLM
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'neuraplay-ai-platform.onrender.com'}` 
      : 'http://localhost:3001';
    
    const chartPrompt = `Create a Plotly chart specification for: "${params.request}"

Return ONLY a JSON object with this structure:
{
  "data": [{"x": [...], "y": [...], "type": "scatter/bar/line", "name": "..."}],
  "layout": {"title": "...", "xaxis": {"title": "..."}, "yaxis": {"title": "..."}},
  "config": {"responsive": true}
}

Make it realistic with sample data if needed. Use appropriate chart type for the request.`;

    const response = await fetch(`${baseUrl}/api/unified-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'fireworks',
        endpoint: 'llm-completion',
        data: {
          model: 'accounts/fireworks/models/gpt-oss-120b',
          messages: [
            { role: 'system', content: 'You are an expert data visualization specialist. Return only valid JSON.' },
            { role: 'user', content: chartPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.3
        }
      })
    });
    
    let chartData = {
      data: [{ x: [1, 2, 3, 4], y: [10, 11, 12, 13], type: 'scatter', name: 'Sample Data' }],
      layout: { title: params.request, xaxis: { title: 'X Axis' }, yaxis: { title: 'Y Axis' } },
      config: { responsive: true }
    };
    
    if (response.ok) {
      const data = await response.json();
      const rawText = data.data?.[0]?.generated_text || '';
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          chartData = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.warn('Failed to parse chart JSON, using default');
      }
    }
    
    return {
      success: true,
      data: {
        type: 'chart',
        chartData: chartData,
        title: chartData.layout?.title || params.request,
        metadata: {
          chartType: chartData.data?.[0]?.type || 'scatter',
          dataPoints: chartData.data?.reduce((sum, series) => sum + (series.x?.length || 0), 0) || 0,
          created: new Date().toISOString()
        },
        canvasActivated: params.activateCanvas
      },
      message: `✅ Chart created: "${chartData.layout?.title || params.request}"`
    };
    
  } catch (error) {
    console.error('❌ Canvas chart creation failed:', error);
    return {
      success: false,
      error: `Failed to create chart: ${error.message}`
    };
  }
}

async function handleCanvasCodeCreation(params) {
  try {
    console.log('💻 Creating canvas code:', params.request);
    
    // Generate code using LLM
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'neuraplay-ai-platform.onrender.com'}` 
      : 'http://localhost:3001';
    
    const codePrompt = `Generate clean, well-commented code for: "${params.request}"

Requirements:
- Include proper comments and documentation
- Use best practices and clean code principles
- Make it functional and complete
- Choose appropriate language based on the request
- Add error handling where relevant

Generate ONLY the code, no explanations.`;

    const response = await fetch(`${baseUrl}/api/unified-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'fireworks',
        endpoint: 'llm-completion',
        data: {
          model: 'accounts/fireworks/models/gpt-oss-120b',
          messages: [
            { role: 'system', content: 'You are an expert programmer. Generate clean, well-documented code.' },
            { role: 'user', content: codePrompt }
          ],
          max_tokens: 1500,
          temperature: 0.3
        }
      })
    });
    
    let codeContent = '// Code generation in progress...';
    if (response.ok) {
      const data = await response.json();
      codeContent = data.data?.[0]?.generated_text || codeContent;
    }
    
    // Detect language from content
    const detectLanguage = (code) => {
      if (code.includes('function') && code.includes('{')) return 'javascript';
      if (code.includes('def ') || code.includes('import ')) return 'python';
      if (code.includes('<html>') || code.includes('<div>')) return 'html';
      if (code.includes('#include') || code.includes('int main')) return 'cpp';
      return 'text';
    };
    
    const language = detectLanguage(codeContent);
    const title = `${language.toUpperCase()} Code: ${params.request}`;
    
    return {
      success: true,
      data: {
        type: 'code',
        title: title,
        content: codeContent,
        language: language,
        metadata: {
          lines: codeContent.split('\n').length,
          characters: codeContent.length,
          language: language,
          created: new Date().toISOString()
        },
        canvasActivated: params.activateCanvas
      },
      message: `✅ Code created: "${title}"`
    };
    
  } catch (error) {
    console.error('❌ Canvas code creation failed:', error);
    return {
      success: false,
      error: `Failed to create code: ${error.message}`
    };
  }
}

module.exports = {
  tools,
  TOOL_ROUTING_CONFIG,
  SERVER_SIDE_TOOLS,
  executeTool,
  performWebSearch,
  performNewsSearch, // ADDED: Export news search for proper news routing
  performImageSearch, // ADDED: Export image search function
  getWeatherData,
  handleImageGenerationTool,
  executeServerTool,
  handleCanvasDocumentCreation,
  handleCanvasChartCreation,
  handleCanvasCodeCreation
};
