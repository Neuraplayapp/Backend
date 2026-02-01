// Concrete Tool Implementations
const { HttpTool, DatabaseTool, LLMTool, ImageTool } = require('./base-tool');
const logger = require('../utils/logger');

// Web Search Tool
class WebSearchTool extends HttpTool {
  constructor() {
    super({
      name: 'web_search',
      description: 'Search the web using Serper API',
      category: 'search',
      baseUrl: 'https://google.serper.dev',
      headers: {
        'X-API-KEY': process.env.Serper_api,
        'Content-Type': 'application/json'
      },
      schema: {
        required: ['query'],
        properties: {
          query: { type: 'string', minLength: 1, maxLength: 500 },
          type: { type: 'string', enum: ['search', 'news', 'images'] },
          gl: { type: 'string', maxLength: 2 },
          num: { type: 'number', minimum: 1, maximum: 100 }
        }
      },
      cache: { enabled: true, ttl: 1800000 } // 30 minutes
    });
  }

  async doExecute(parameters, context, executionId) {
    const { query, type = 'search', gl = 'us', num = 10 } = parameters;
    
    const searchData = {
      q: query,
      gl,
      num
    };

    let endpoint = '/search';
    if (type === 'news') {
      endpoint = '/news';
    } else if (type === 'images') {
      endpoint = '/images';
    }
    
    const result = await this.makeRequest('POST', endpoint, searchData);
    
    // Extract results based on type
    let results = [];
    let images = [];
    
    if (type === 'images') {
      images = result.images || [];
      results = images; // For backward compatibility
    } else {
      results = result.organic || result.news || [];
      // Check if regular search also returned images
      images = result.images || [];
    }
    
    return {
      success: true,
      data: {
        query,
        results,
        images, // Always include images array
        searchInformation: result.searchInformation,
        type
      }
    };
  }

  async fallback(parameters, context, executionId) {
    return {
      success: false,
      error: 'Web search service unavailable',
      fallback: true,
      data: {
        query: parameters.query,
        results: [],
        message: 'Search functionality is temporarily unavailable'
      }
    };
  }
}

// Weather Tool
class WeatherTool extends HttpTool {
  constructor() {
    super({
      name: 'get_weather',
      description: 'Get current weather information',
      category: 'information',
      baseUrl: 'https://api.openweathermap.org/data/2.5',
      schema: {
        required: ['location'],
        properties: {
          location: { type: 'string', minLength: 1, maxLength: 100 },
          units: { type: 'string', enum: ['metric', 'imperial', 'kelvin'] }
        }
      },
      cache: { enabled: true, ttl: 600000 } // 10 minutes
    });
  }

  async doExecute(parameters, context, executionId) {
    const { location, units = 'metric' } = parameters;
    
    // Use the correct environment variable name (prioritize WEATHER_API as used in Render)
    const apiKey = process.env.WEATHER_API || process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('Weather API key not configured. Please set WEATHER_API environment variable.');
    }
    
    // Construct the proper query parameters for OpenWeatherMap API
    const queryParams = new URLSearchParams({
      q: location,
      appid: apiKey,
      units: units
    });
    
    const result = await this.makeRequest('GET', `/weather?${queryParams.toString()}`);
    
    return {
      success: true,
      data: {
        location: result.name || location,
        temperature: Math.round(result.main.temp),
        description: result.weather[0].description,
        humidity: result.main.humidity,
        windSpeed: result.wind.speed,
        units,
        country: result.sys.country,
        feelsLike: Math.round(result.main.feels_like),
        pressure: result.main.pressure
      }
    };
  }
}

// Image Generation Tool
class ImageGenerationTool extends ImageTool {
  constructor() {
    super({
      name: 'generate_image',
      description: 'Generate images using Fireworks AI',
      category: 'creative',
      schema: {
        required: ['prompt'],
        properties: {
          prompt: { type: 'string', minLength: 1, maxLength: 1000 },
          style: { type: 'string', enum: ['realistic', 'artistic', 'cartoon', 'abstract'] },
          size: { type: 'string', enum: ['512x512', '1024x1024', '1024x768'] }
        }
      },
      cache: { enabled: true, ttl: 86400000 } // 24 hours
    });
  }

  async doExecute(parameters, context, executionId) {
    const { prompt, style = 'realistic', size = '1024x1024' } = parameters;
    
    const enhancedPrompt = this.enhancePrompt(prompt, style);
    
    const response = await fetch('https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/accounts/fireworks/models/flux-1-schnell-fp8/text_to_image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.Neuraplay}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        steps: 4,
        seed: Math.floor(Math.random() * 1000000),
        safety_check: true,
        output_image_format: 'JPEG'
      })
    });

    if (!response.ok || !process.env.Neuraplay || process.env.Neuraplay.includes('demo')) {
      // Provide fallback response for local development
      console.log(`🔧 Local development mode: Using demo image`);
      
      const demoImages = [
        '/assets/images/Neuraplaybrain.png',
        'https://via.placeholder.com/1024x1024/4F46E5/FFFFFF?text=AI+Generated+Image',
        'https://via.placeholder.com/1024x1024/7C3AED/FFFFFF?text=Demo+Image'
      ];
      
      const randomImage = demoImages[0]; // Use the brain image for now
      
      return {
        success: true,
        data: {
          prompt: enhancedPrompt,
          imageUrl: randomImage,
          isDemoResponse: true,
          message: '🎨 Local development mode: Using demo image. Real image generation available with valid API keys.'
        }
      };
    }

    const result = await response.json();
    
    return {
      success: true,
      data: {
        prompt: enhancedPrompt,
        imageUrl: result.image_url,
        style,
        size,
        seed: result.seed
      }
    };
  }

  enhancePrompt(prompt, style) {
    const stylePrompts = {
      realistic: 'photorealistic, high detail, professional photography',
      artistic: 'artistic style, creative composition, expressive',
      cartoon: 'cartoon style, animated, colorful, friendly',
      abstract: 'abstract art, conceptual, modern artistic interpretation'
    };
    
    return `${prompt}, ${stylePrompts[style] || stylePrompts.realistic}`;
  }
}

// Math Diagram Tool
class MathDiagramTool extends ImageTool {
  constructor() {
    super({
      name: 'create_math_diagram',
      description: 'Create mathematical diagrams and visualizations',
      category: 'educational',
      schema: {
        required: ['expression'],
        properties: {
          expression: { type: 'string', minLength: 1, maxLength: 500 },
          type: { type: 'string', enum: ['formula', 'graph', 'geometry', 'statistics'] },
          format: { type: 'string', enum: ['svg', 'png'] }
        }
      },
      cache: { enabled: true, ttl: 3600000 } // 1 hour
    });
  }

  async doExecute(parameters, context, executionId) {
    const { expression, type = 'formula', format = 'svg' } = parameters;
    
    // This would integrate with your math diagram service
    const diagramData = await this.generateMathDiagram(expression, type, format);
    
    return {
      success: true,
      data: {
        expression,
        type,
        format,
        diagramUrl: diagramData.url,
        svg: diagramData.svg
      }
    };
  }

  async generateMathDiagram(expression, type, format) {
    // Mock implementation - replace with actual math diagram generation
    return {
      url: `data:image/svg+xml;base64,${Buffer.from('<svg>Mock diagram</svg>').toString('base64')}`,
      svg: '<svg>Mock diagram</svg>'
    };
  }
}

// Database Query Tool
class DatabaseQueryTool extends DatabaseTool {
  constructor() {
    super({
      name: 'database_query',
      description: 'Query the application database',
      category: 'data',
      schema: {
        required: ['operation'],
        properties: {
          operation: { type: 'string', enum: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
          table: { type: 'string', minLength: 1, maxLength: 50 },
          conditions: { type: 'object' },
          data: { type: 'object' }
        }
      },
      cache: { enabled: true, ttl: 60000 } // 1 minute
    });
  }

  async doExecute(parameters, context, executionId) {
    const { operation, table, conditions = {}, data = {} } = parameters;
    
    // This would integrate with your database service
    const databaseService = require('../services/database.service');
    
    let result;
    switch (operation) {
      case 'SELECT':
        result = await databaseService.select(table, conditions);
        break;
      case 'INSERT':
        result = await databaseService.insert(table, data);
        break;
      case 'UPDATE':
        result = await databaseService.update(table, data, conditions);
        break;
      case 'DELETE':
        result = await databaseService.delete(table, conditions);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
    
    return {
      success: true,
      data: result
    };
  }
}

// LLM Completion Tool
class LLMCompletionTool extends LLMTool {
  constructor() {
    super({
      name: 'llm_completion',
      description: 'Generate text using Large Language Model',
      category: 'ai',
      schema: {
        required: ['prompt'],
        properties: {
          prompt: { type: 'string', minLength: 1, maxLength: 4000 },
          model: { type: 'string', enum: ['accounts/fireworks/models/gpt-oss-120b', 'accounts/fireworks/models/gpt-oss-20b'] },
          maxTokens: { type: 'number', minimum: 1, maximum: 4000 },
          temperature: { type: 'number', minimum: 0, maximum: 2 }
        }
      },
      cache: { enabled: true, ttl: 3600000 } // 1 hour
    });
  }

  async doExecute(parameters, context, executionId) {
    const { 
      prompt, 
      model = 'accounts/fireworks/models/gpt-oss-120b', 
      maxTokens = this.maxTokens, 
      temperature = this.temperature 
    } = parameters;
    
    // This would integrate with your AI service
    const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.Neuraplay}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'accounts/fireworks/models/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature
      })
    });

    if (!response.ok || !process.env.Neuraplay || process.env.Neuraplay.includes('demo')) {
      // Provide fallback response for local development or missing API keys
      console.log(`🔧 Local development mode: Using demo AI response`);
      
      const responses = [
        `🤖 Hello! I'm your AI assistant. I understand you said: "${prompt}". I'm here to help with navigation, learning games, settings, and educational content. What would you like to explore?`,
        `✨ Hi there! You asked about: "${prompt}". I can help you navigate NeuraPlay, play educational games, adjust settings, or answer questions about learning activities. What interests you?`,
        `🌟 Great to chat with you! Regarding "${prompt}" - I'm your educational AI companion. I can guide you through games, help with navigation, manage settings, or discuss learning topics. How can I assist you today?`,
        `🎓 Thanks for reaching out! About "${prompt}" - I'm designed to make learning fun and interactive. I can help you explore games, navigate the platform, customize settings, or provide educational support. What would you like to do?`
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      return {
        success: true,
        data: {
          prompt,
          completion: randomResponse,
          model: `${model} (local dev mode)`,
          tokensUsed: 0,
          isDemoResponse: true
        }
      };
    }

    const result = await response.json();
    
    return {
      success: true,
      data: {
        prompt,
        completion: result.choices[0].message.content,
        model,
        tokensUsed: result.usage?.total_tokens || 0
      }
    };
  }
}

// Navigation Tool (Client-side routing)
class NavigationTool extends HttpTool {
  constructor() {
    super({
      name: 'navigate_to_page',
      description: 'Navigate user to different pages',
      category: 'navigation',
      schema: {
        required: ['page'],
        properties: {
          page: { type: 'string', minLength: 1, maxLength: 100 },
          params: { type: 'object' }
        }
      },
      cache: { enabled: false }
    });
  }

  async doExecute(parameters, context, executionId) {
    const { page, params = {} } = parameters;
    
    // This tool would typically be handled client-side
    // Server just validates and logs the navigation request
    
    logger.info('Navigation requested', {
      page,
      params,
      userId: context.userId,
      sessionId: context.sessionId
    });
    
    return {
      success: true,
      data: {
        action: 'navigate',
        page,
        params,
        clientSide: true
      }
    };
  }
}

// Settings Update Tool
class SettingsUpdateTool extends DatabaseTool {
  constructor() {
    super({
      name: 'update_settings',
      description: 'Update user settings and preferences',
      category: 'user',
      schema: {
        required: ['settings'],
        properties: {
          settings: { type: 'object' },
          userId: { type: 'string' }
        }
      },
      cache: { enabled: false }
    });
  }

  async doExecute(parameters, context, executionId) {
    const { settings, userId = context.userId } = parameters;
    
    // Validate settings against allowed keys
    const allowedSettings = [
      'theme', 'language', 'notifications', 
      'privacy', 'aiPersonality', 'gamePreferences'
    ];
    
    const validSettings = {};
    Object.keys(settings).forEach(key => {
      if (allowedSettings.includes(key)) {
        validSettings[key] = settings[key];
      }
    });
    
    // This would update user settings in database
    const databaseService = require('../services/database.service');
    await databaseService.updateUserSettings(userId, validSettings);
    
    return {
      success: true,
      data: {
        updatedSettings: validSettings,
        userId
      }
    };
  }
}

// Export all tools
const tools = {
  WebSearchTool,
  WeatherTool,
  ImageGenerationTool,
  MathDiagramTool,
  DatabaseQueryTool,
  LLMCompletionTool,
  NavigationTool,
  SettingsUpdateTool
};

// Factory function to create tool instances
function createTool(toolName) {
  const ToolClass = tools[toolName];
  if (!ToolClass) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return new ToolClass();
}

// Get all available tools
function getAllTools() {
  return Object.keys(tools).map(name => {
    const tool = new tools[name]();
    return tool.getInfo();
  });
}

module.exports = {
  tools,
  createTool,
  getAllTools,
  ...tools
};
