// Unified Route Handler - ALL external API calls go through here
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Simple in-memory cache for LLM responses
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(data) {
  // Create cache key from messages and key parameters
  const messages = data.messages?.slice(-2) || []; // Last 2 messages
  const keyData = {
    messages: messages.map(m => ({ role: m.role, content: m.content?.substring(0, 100) })),
    model: data.model,
    max_tokens: data.max_tokens
  };
  return JSON.stringify(keyData);
}

function getCachedResponse(cacheKey) {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  responseCache.delete(cacheKey);
  return null;
}

function setCachedResponse(cacheKey, response) {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
}

// For Node.js versions without native fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// 🔐 SECURITY: Rate limiting for LLM endpoints (expensive API calls)
const llmRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 500, // 150 LLM calls per minute per IP (increased for course generation)
  message: {
    success: false,
    error: 'Too many LLM requests. Please wait before trying again.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip || 'anonymous';
  },
  skip: (req) => {
    // Skip rate limiting for authenticated users with valid sessions
    return req.user?.id && process.env.NODE_ENV === 'development';
  }
});

// Apply rate limiting to all requests on this router
router.use(llmRateLimiter);

// Render backend URL - where all API calls are routed for production security
const RENDER_BACKEND_URL = 'https://neuraplay.onrender.com';

// 🔧 CRITICAL: Sanitize strings to remove invalid Unicode surrogates
// Fixes: "lone leading surrogate in hex escape" errors from Fireworks API
function sanitizeForJSON(str) {
  if (typeof str !== 'string') return str;
  
  // Remove lone surrogates (invalid Unicode that breaks JSON)
  // Surrogate pairs are U+D800 to U+DFFF
  // A "lone" surrogate is one without its pair
  return str
    // Remove lone high surrogates (U+D800-U+DBFF not followed by low surrogate)
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    // Remove lone low surrogates (U+DC00-U+DFFF not preceded by high surrogate)
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    // Also remove other problematic control characters (except newlines/tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// Import modules inside routes to prevent module loading failures
// const { handleImageGeneration } = require('../services/imageGeneration.cjs');

// DEBUG: Add comprehensive logging to unified-route.cjs
router.use((req, res, next) => {
  console.log(`🔍 UNIFIED-ROUTE DEBUG: ${req.method} ${req.originalUrl}`);
  console.log(`🔍 Route matched in unified-route.cjs: ${req.path} (mounted at /api/unified-route)`);
  console.log(`🔍 Available routes in unified-route: [POST /, GET /debug]`);
  next();
});

// DEBUG: Add health check endpoint to test basic routing
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    message: 'Unified-route.cjs is receiving requests',
    timestamp: new Date().toISOString(),
    availableRoutes: ['POST / (mapped to /api/unified-route)', 'GET /debug'],
    mountPoint: '/api/unified-route'
  });
});

// Unified API routing endpoint - now at root since mounted at /api/unified-route
router.post('/', async (req, res) => {
  try {
    const { service, endpoint, data } = req.body;
    console.log(`🔀 UnifiedRoute: Processing ${service}/${endpoint}`);
    
    // Route based on service and endpoint
    switch (service) {
      case 'fireworks':
        return await handleFireworksRequest(endpoint, data, res);
      case 'together':
        return await handleTogetherRequest(endpoint, data, res);
      case 'elevenlabs':
        return await handleElevenLabsRequest(endpoint, data, res);
      case 'jina':
        return await handleJinaRequest(endpoint, data, res);
      default:
        return res.status(400).json({ error: `Unknown service: ${service}` });
    }
  } catch (error) {
    console.error('❌ UnifiedRoute error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEVELOPMENT FALLBACK: Provides mock responses when using demo API keys
async function handleDemoFireworksResponse(endpoint, data, res) {
  switch (endpoint) {

    case 'llm-completion':
      try {
        console.log('🔍 llm-completion - data.model:', data.model);
        console.log('🔍 llm-completion - messages count:', data.messages?.length);

        // --- Check cache first ---
        const cacheKey = getCacheKey(data);
        const cachedResponse = getCachedResponse(cacheKey);
        if (cachedResponse) {
          console.log('✅ Returning cached response');
          return res.json(cachedResponse);
        }

      } catch (err) {
        console.error('⚠️ Error checking cache:', err);
        // Continue even if caching fails
      }

      // --- Mock LLM response for chat completions ---
      const completion = `This is a demo response for development. Your message was: "${data.messages?.slice(-1)[0]?.content || 'No message'}"`;

      const mockResponse = {
        choices: [{
          message: {
            role: 'assistant',
            content: completion,
            tool_calls: data.messages?.some(m => m.content?.includes('canvas') || m.content?.includes('image') || m.content?.includes('chart'))
              ? [{
                  id: 'demo_tool_call',
                  type: 'function',
                  function: {
                    name: 'canvas-document-creation',
                    arguments: JSON.stringify({
                      content: `# Demo Canvas Document\n\nThis is a demo response for development mode. The system detected your request and created this placeholder content.\n\n**Your request:** ${data.messages?.slice(-1)[0]?.content || 'Canvas request'}\n\n**Status:** Development mode - using fallback responses.`,
                      mode: 'create'
                    })
                  }
                }]
              : undefined
          },
          finish_reason: 'stop'
        }],
        model: data.model || 'demo-model',
        usage: { prompt_tokens: 10, completion_tokens: 25, total_tokens: 35 }
      };

      // --- Set cache ---
      try {
        const cacheKey = getCacheKey(data);
        setCachedResponse(cacheKey, mockResponse);
      } catch (err) {
        console.error('⚠️ Error setting cache:', err);
      }

      return res.json(mockResponse);

    case 'vision':
      // Mock vision analysis response
      const visionResponse = {
        choices: [{
          message: {
            role: 'assistant',
            content: 'This is a demo vision analysis response. In development mode, I cannot actually analyze images, but this simulates the expected response format for testing purposes.'
          },
          finish_reason: 'stop'
        }],
        model: 'demo-vision-model',
        usage: { prompt_tokens: 15, completion_tokens: 30, total_tokens: 45 }
      };
      return res.json(visionResponse);

    case 'image-generation':
      const imageResponse = {
        success: true,
        images: [{
          url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzM0OTVmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RGVtbyBJbWFnZTwvdGV4dD48L3N2Zz4=',
          revised_prompt: `Demo image for: ${data.prompt || 'development testing'}`
        }],
        metadata: { model: 'demo-image-model', mode: 'development' }
      };
      return res.json(imageResponse);

    default:
      return res.status(400).json({ error: `Demo mode: Unsupported endpoint ${endpoint}` });
  }
}

async function handleFireworksRequest(endpoint, data, res) {
  console.log(`🔥 handleFireworksRequest CALLED - endpoint: "${endpoint}", dataKeys: ${Object.keys(data || {}).join(', ')}`);
  
  const apiKey = process.env.Neuraplay || process.env.FIREWORKS_API_KEY || process.env.VITE_FIREWORKS_API_KEY;
  if (!apiKey) {
    console.error('❌ FIREWORKS API KEY MISSING');
    return res.status(500).json({ error: 'Fireworks API key not configured' });
  }
  console.log('✅ Fireworks API key found');

  // DETECT ENVIRONMENT: Use RENDER env var as primary detection method
  const hostname = require('os').hostname();
  const isRenderEnvironment = (process.env.RENDER === 'true' || process.env.NODE_ENV === 'production');
  const isLocalDevelopment = !isRenderEnvironment;
  
  console.log('🔍 Environment Detection:', {
    hostname,
    isRenderEnvironment,
    isLocalDevelopment,
    NODE_ENV: process.env.NODE_ENV,
    RENDER_env: process.env.RENDER,
    RAILWAY_env: process.env.RAILWAY_ENVIRONMENT
  });
  
  if (isLocalDevelopment) {
    console.log('🔀 LOCAL DEV: Routing all requests through Render backend for endpoint:', endpoint);
    // Local development - forward to Render backend for consistency
  } else {
    console.log('🏭 RENDER/PROD: Handling API calls directly for endpoint:', endpoint);
    // Running on Render or production - handle API calls directly to external services
  }

  console.log(`🔍 SWITCH DEBUG - endpoint value: "${endpoint}" (type: ${typeof endpoint})`);
  console.log(`🔍 SWITCH DEBUG - Available cases: image-generation, vision, llm-completion, embeddings`);
  
  switch (endpoint) {
    case 'image-generation':
      try {
        // ENVIRONMENT-AWARE ROUTING: Local dev forwards to Render, Render handles directly
        if (isLocalDevelopment) {
          // LOCAL DEVELOPMENT: Forward to Render backend
          console.log('🔀 LOCAL DEV: Forwarding image-generation to Render backend');
          
          const requestPayload = {
            service: 'fireworks',
            endpoint: 'image-generation',
            data: data
          };

          // Use same serialization pattern as working LLM completion
          let serializedPayload;
          try {
            serializedPayload = JSON.stringify(requestPayload);
            console.log('🔍 IMAGE DEBUG - JSON payload successfully created:');
            console.log('   📏 Size:', serializedPayload.length, 'bytes');
          } catch (jsonError) {
            console.error('❌ JSON serialization failed for image:', jsonError.message);
            return res.status(500).json({ error: 'JSON serialization failed' });
          }

          const response = await fetch(`${RENDER_BACKEND_URL}/api/unified-route`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Accept': 'application/json',
              'Accept-Charset': 'utf-8'
            },
            body: serializedPayload
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Render backend error: ${response.status} - ${errorText.slice(0,200)}`);
            return res.status(500).json({ error: `Render backend error: ${response.status} - ${errorText}` });
          }

          const result = await response.json();
          // NORMALIZE RESPONSE: Ensure success flag is present if image_url exists
          if (result.image_url && result.success === undefined) {
            result.success = true;
          }
          return res.json(result);
        } else {
          // RENDER/PRODUCTION: Handle image generation directly
          const { handleImageGeneration } = require('../services/imageGeneration.cjs');
          const result = await handleImageGeneration(data, apiKey);
          return res.json(result);
        }
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }

    case 'vision':
      try {
        // ENVIRONMENT-AWARE ROUTING: Forward to Render in local dev
        if (isLocalDevelopment) {
          console.log('🔀 LOCAL DEV: Forwarding vision request to Render backend');
          
          const renderResponse = await fetch(`${RENDER_BACKEND_URL}/api/unified-route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service: 'fireworks',
              endpoint: 'vision',
              data: data
            })
          });

          const renderData = await renderResponse.json();
          return res.status(renderResponse.status).json(renderData);
        }
        
        // RENDER/PROD: Handle vision API calls directly
        const { 
          model = 'accounts/fireworks/models/llama-v4-maverick-vision', 
          messages, 
          tools,
          tool_choice,
          ...options 
        } = data;

        if (!Array.isArray(messages) || messages.length === 0) {
          return res.status(400).json({ error: 'messages array required for vision analysis' });
        }

        // Determine model display name for logging
        const modelName = model.includes('scout') ? 'Llama4-Scout' : 'Llama4-Maverick-Vision';
        console.log(`👁️ UnifiedRoute: Processing vision request with ${modelName}`);
        console.log(`📋 Tool calling: ${tools ? 'enabled' : 'disabled'}`);

        // Build request body with tool support
        // 🔧 FIX: Fireworks requires stream=true for max_tokens > 4096
        const maxTokens = options.max_tokens ?? 2000;
        const needsStreaming = maxTokens > 4096;
        
        const requestBody = {
          model,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: maxTokens,
          stream: needsStreaming,  // Enable streaming for >4096 tokens
          top_p: options.top_p ?? 1.0
        };
        
        if (needsStreaming) {
          console.log(`🌊 Enabling streaming for ${maxTokens} tokens (>4096 requires stream=true)`);
        }

        // Add tools if provided
        if (tools && Array.isArray(tools)) {
          requestBody.tools = tools;
          if (tool_choice) {
            requestBody.tool_choice = tool_choice;
          }
        }

        const fwRes = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!fwRes.ok) {
          const txt = await fwRes.text();
          console.error(`🚨 Fireworks Vision API failed: ${fwRes.status}`);
          console.error(`🚨 Full error response:`, txt);
          console.error(`🚨 Model used:`, model);
          console.error(`🚨 Request body size:`, JSON.stringify(requestBody).length);
          
          return res.status(fwRes.status).json({
            success: false,
            error: `Fireworks Vision API error: ${fwRes.status} - ${txt}`,
            details: {
              status: fwRes.status,
              model: model,
              endpoint: 'vision',
              modelName: modelName,
              fullError: txt
            }
          });
        }

        let fwJson;
        
        // 🌊 Handle streaming response (for >4096 tokens)
        if (needsStreaming) {
          console.log('🌊 Processing streaming response (vision, Node.js style)...');
          let fullContent = '';
          
          try {
            // Node.js fetch returns an async iterable body
            for await (const chunk of fwRes.body) {
              const chunkText = chunk.toString();
              const lines = chunkText.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') continue;
                  if (!data) continue;
                  
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    fullContent += content;
                  } catch (e) {
                    // Skip invalid JSON lines
                  }
                }
              }
            }
            
            console.log(`✅ Streaming complete (vision), collected ${fullContent.length} characters`);
            
            // Convert to standard format
            fwJson = {
              choices: [{
                message: {
                  role: 'assistant',
                  content: fullContent
                },
                finish_reason: 'stop'
              }]
            };
          } catch (streamError) {
            console.error('❌ Streaming failed (vision):', streamError);
            return res.status(500).json({
              success: false,
              error: `Streaming failed: ${streamError.message}`
            });
          }
        } else {
          // Non-streaming response
          fwJson = await fwRes.json();
        }
        
        const message = fwJson.choices?.[0]?.message || {};
        
        // Return complete response with tool calls support
        return res.json({
          success: true,
          data: {
            response: message.content || '',
            completion: message.content || '',
            generated_text: message.content || '',
            choices: fwJson.choices // Include full choices for tool_calls
          },
          usage: fwJson.usage,
          model: model,
          modelName: modelName
        });
      } catch (err) {
        console.error('🚨 vision error:', err);
        
        return res.status(500).json({
          success: false,
          error: `Vision analysis failed: ${err.message || String(err)}`,
          details: {
            model: data.model || 'llama-v4-maverick-vision',
            endpoint: 'vision',
            errorType: err.name || 'Unknown'
          }
        });
      }

    case 'llm-completion':
      try {
        console.log('🔍 llm-completion - data.model:', data.model);
        console.log('🔍 llm-completion - messages count:', data.messages?.length);

        // Check cache first for faster responses
        const cacheKey = getCacheKey(data);
        const cachedResponse = getCachedResponse(cacheKey);
        if (cachedResponse) {
          console.log('⚡ Returning cached LLM response');
          return res.json(cachedResponse);
        }

        // PROPER FIX: Sanitize content to remove invalid Unicode surrogates that break JSON
        // This fixes "lone leading surrogate in hex escape" errors from Fireworks API
        const cleanMessages = (data.messages || []).map(msg => ({
          role: String(msg.role || 'user').trim(),
          content: sanitizeForJSON(String(msg.content || '').trim())
        }));

        // ENVIRONMENT-AWARE ROUTING: Local dev forwards to Render, Render handles directly
        if (isLocalDevelopment) {
          console.log('🔀 LOCAL DEV: Forwarding llm-completion to Render backend');        
          
          // CRITICAL FIX: Use unified route format for forwarding
          // 🎯 INCLUDE response_format for structured JSON output
          const requestPayload = {
            service: 'fireworks',
            endpoint: 'llm-completion',
            data: {
            messages: cleanMessages,
            max_tokens: Number(data.max_tokens) || 2000,
            // CRITICAL FIX: Use ?? instead of || because Number(0.0) is falsy!
            // temperature 0.0 was being overwritten to 0.6
            temperature: data.temperature !== undefined ? Number(data.temperature) : 0.6,
              model: data.model || 'accounts/fireworks/models/gpt-oss-120b',
              ...(data.response_format && { response_format: data.response_format })
            }
          };

          // 🔍 DEBUG: Log if response_format is being forwarded
          console.log('🎯 LOCAL DEV - response_format check:', {
            has_response_format_in_data: !!data.response_format,
            has_response_format_in_payload: !!requestPayload.data.response_format,
            response_format_type: requestPayload.data.response_format?.type
          });
          
          // VALIDATE JSON SERIALIZATION: Test before sending to catch issues early
          let serializedPayload;
          try {
            serializedPayload = JSON.stringify(requestPayload);
            console.log('🔍 LOCAL DEBUG - JSON payload successfully created:');
            console.log('   📏 Size:', serializedPayload.length, 'bytes');
            console.log('   📝 First 200 chars:', serializedPayload.substring(0, 200));
            console.log('   📝 Last 200 chars:', serializedPayload.substring(serializedPayload.length - 200));
            console.log('   🔤 Encoding check:', Buffer.from(serializedPayload).toString('utf8').length === serializedPayload.length ? 'UTF-8 Safe' : 'ENCODING ISSUE');
          } catch (jsonError) {
            console.error('❌ JSON serialization failed locally:', jsonError.message);
            console.error('🔍 Problematic payload structure:', {
              messageCount: cleanMessages.length,
              hasEmptyContent: cleanMessages.some(m => !m.content),
              contentLengths: cleanMessages.map(m => m.content?.length || 0)
            });
            return res.status(500).json({
              success: false,
              error: 'JSON serialization failed',
              details: jsonError.message
            });
          }

          const response = await fetch(`${RENDER_BACKEND_URL}/api/unified-route`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Accept': 'application/json',
              'Accept-Charset': 'utf-8'
            },
            body: serializedPayload
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Render backend error: ${response.status} - ${errorText.slice(0,200)}`);
            
            // ENHANCED ERROR HANDLING: Provide more specific error responses
            let userFriendlyError = 'AI service temporarily unavailable';
            if (response.status === 429) {
              userFriendlyError = 'AI service is busy, please try again in a moment';
            } else if (response.status === 500) {
              userFriendlyError = 'AI processing error, please try again';
            } else if (response.status === 503) {
              userFriendlyError = 'AI service is temporarily down for maintenance';
            }
            
            return res.status(200).json({
              success: true,
              response: `I apologize, but I'm experiencing a temporary issue: ${userFriendlyError}. Please try your message again in a moment.`,
              toolResults: [],
              metadata: {
                sessionId: data.sessionId || 'unknown',
                executionTime: 0,
                toolsExecuted: 0,
                mode: 'error_fallback',
                originalError: response.status
              }
            });
          }

          const result = await response.json();
          console.log('🔍 RENDER BACKEND RESPONSE:', JSON.stringify(result, null, 2).slice(0, 1000));
          return res.json(result);
          
        } else {
          // RENDER BACKEND: Handle API calls directly to Fireworks
          console.log('🏭 RENDER BACKEND: Making direct API call to Fireworks');
          
          const maxTokens = Number(data.max_tokens) || 2000;
          const needsStreaming = maxTokens > 4096;
          
          // 🎯 INCLUDE response_format for structured JSON output (e.g., greetings, memory analysis)
          const requestBody = {
            model: data.model || 'accounts/fireworks/models/llama-v3p1-70b-instruct',
            messages: cleanMessages,
            max_tokens: maxTokens,
            // CRITICAL FIX: Use explicit check instead of || because Number(0.0) is falsy!
            // temperature 0.0 was being overwritten to 0.6
            temperature: data.temperature !== undefined ? Number(data.temperature) : 0.6,
            stream: needsStreaming,
            ...(data.response_format && { response_format: data.response_format })
          };
          
          console.log('📤 Fireworks request body:', JSON.stringify({
            model: requestBody.model,
            messagesCount: requestBody.messages.length,
            max_tokens: requestBody.max_tokens,
            temperature: requestBody.temperature,
            stream: requestBody.stream,
            has_response_format: !!requestBody.response_format,
            response_format_type: requestBody.response_format?.type,
            response_format_schema_name: requestBody.response_format?.json_schema?.name
          }));
          
          // 🔍 DEBUG: Log full response_format if present
          if (requestBody.response_format) {
            console.log('🎯 RESPONSE_FORMAT being sent to Fireworks:', JSON.stringify(requestBody.response_format, null, 2));
          }
          
          const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Fireworks API error: ${response.status} - ${errorText}`);
            console.error(`❌ Model: ${data.model || 'accounts/fireworks/models/llama-v3p1-70b-instruct'}`);
            
            return res.status(200).json({
              success: true,
              response: "I apologize, but I'm having trouble connecting to the AI service right now. Please try again in a moment.",
              toolResults: [],
              metadata: {
                sessionId: data.sessionId || 'unknown',
                executionTime: 0,
                toolsExecuted: 0,
                mode: 'fireworks_error',
                originalError: response.status
              }
            });
          }

          let fireworksResult;
          
          // 🌊 Handle streaming response (for >4096 tokens)
          if (needsStreaming) {
            console.log('🌊 Processing streaming response (Node.js style)...');
            let fullContent = '';
            
            try {
              // Node.js fetch returns an async iterable body
              for await (const chunk of response.body) {
                const chunkText = chunk.toString();
                const lines = chunkText.split('\n');
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;
                    if (!data) continue;
                    
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content || '';
                      fullContent += content;
                    } catch (e) {
                      // Skip invalid JSON lines
                    }
                  }
                }
              }
              
              console.log(`✅ Streaming complete, collected ${fullContent.length} characters`);
              
              // Convert to standard format
              fireworksResult = {
                choices: [{
                  message: {
                    role: 'assistant',
                    content: fullContent
                  },
                  finish_reason: 'stop'
                }]
              };
            } catch (streamError) {
              console.error('❌ Streaming failed:', streamError);
              return res.status(500).json({
                success: false,
                error: `Streaming failed: ${streamError.message}`
              });
            }
          } else {
            // Non-streaming response
            fireworksResult = await response.json();
          }
          
          // 🔍 DEBUG: Log Fireworks response structure
          console.log('🔍 Fireworks response structure:', {
            hasChoices: !!fireworksResult.choices,
            choicesLength: fireworksResult.choices?.length,
            firstChoiceKeys: fireworksResult.choices?.[0] ? Object.keys(fireworksResult.choices[0]) : [],
            hasMessage: !!fireworksResult.choices?.[0]?.message,
            messageKeys: fireworksResult.choices?.[0]?.message ? Object.keys(fireworksResult.choices[0].message) : []
          });
          
          // 🎯 COMPREHENSIVE PARSING: Try multiple response formats
          let completion = null;
          
          // Format 1: Standard OpenAI-style (choices[0].message.content)
          if (fireworksResult.choices?.[0]?.message?.content) {
            completion = fireworksResult.choices[0].message.content;
            console.log('✅ Parsed from choices[0].message.content');
          }
          // Format 2: Direct text field
          else if (fireworksResult.choices?.[0]?.text) {
            completion = fireworksResult.choices[0].text;
            console.log('✅ Parsed from choices[0].text');
          }
          // Format 3: Response in data field
          else if (fireworksResult.data?.choices?.[0]?.message?.content) {
            completion = fireworksResult.data.choices[0].message.content;
            console.log('✅ Parsed from data.choices[0].message.content');
          }
          // Format 4: Direct response field
          else if (fireworksResult.response) {
            completion = fireworksResult.response;
            console.log('✅ Parsed from response field');
          }
          // Format 5: Reasoning content fallback (when model only returns reasoning_content)
          else if (fireworksResult.choices?.[0]?.message?.reasoning_content) {
            completion = fireworksResult.choices[0].message.reasoning_content;
            console.log('⚠️ Parsed from choices[0].message.reasoning_content (content field missing)');
          }
          
          if (!completion) {
            console.error('❌ Could not parse Fireworks response, using fallback');
            console.error('Full response:', JSON.stringify(fireworksResult).slice(0, 500));
            completion = 'Response received';
          }
          
          // 🧠 STRIP REASONING TOKENS from response (gpt-oss sometimes leaks chain-of-thought)
          // Only strip for non-JSON responses (JSON responses need full content for parsing)
          if (completion && !data.response_format) {
            const originalLength = completion.length;
            // Pattern 1: <think>...</think> blocks
            completion = completion.replace(/<think>[\s\S]*?<\/think>/gi, '');
            // Pattern 2: <thinking>...</thinking> blocks
            completion = completion.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
            // Pattern 3: <reasoning>...</reasoning> blocks
            completion = completion.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
            // Pattern 4: Base model tokens
            completion = completion.replace(/<\|(?:channel|message|end)\|>/g, '');
            // Pattern 5: Chain-of-thought preambles
            const preamblePatterns = [
              /^We need to (?:respond|output|answer|help)[\s\S]*?(?=\n\n|[A-Z][a-z]+ )/i,
              /^The (?:user|context|message|instruction)[\s\S]*?(?=\n\n|[A-Z][a-z]+ )/i,
              /^(?:Let me|I should|I need to|I'll think|We should)[\s\S]*?(?=\n\n)/i,
            ];
            for (const pattern of preamblePatterns) {
              if (pattern.test(completion)) {
                const stripped = completion.replace(pattern, '').trim();
                if (stripped.length > 20) {
                  completion = stripped;
                  break;
                }
              }
            }
            completion = completion.trim();
            if (completion.length < originalLength) {
              console.log(`🧠 Stripped reasoning tokens: ${originalLength} → ${completion.length} chars`);
            }
          }
          
          const responseData = {
            success: true,
            data: [{
              generated_text: completion,
              tool_results: []
            }]
          };

          // Cache the successful response
          setCachedResponse(cacheKey, responseData);

          return res.json(responseData);
        }
        
      } catch (err) {
        console.error('🚨 llm-completion error:', err);
        console.error('🔍 Error details:', {
          message: err.message,
          stack: err.stack?.slice(0,500),
          renderBackend: RENDER_BACKEND_URL
        });
        
        // GRACEFUL ERROR HANDLING: Return user-friendly response instead of 500 error
        return res.status(200).json({
          success: true,
          response: "I'm experiencing a temporary connection issue. Please try your message again in a moment.",
          toolResults: [],
          metadata: {
            sessionId: data.sessionId || 'unknown',
            executionTime: 0,
            toolsExecuted: 0,
            mode: 'connection_error_fallback',
            errorType: err.name || 'NetworkError'
          }
        });
      }

    case 'chart-generation':
      try {
        const { prompt, type } = data;
        const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
            messages: [{
              role: 'system',
              content: `You are a data visualization expert. Create comprehensive chart specifications based on user requests.

CRITICAL: Return ONLY a JSON object with this exact structure:
{
  "title": "Chart Title",
  "chartType": "${type || 'bar'}",
  "series": [{"label": "Label", "value": number}],
  "description": "Detailed explanation of the chart and its insights"
}`
            }, {
              role: 'user',
              content: `Create a ${type || 'bar'} chart for: ${prompt}`
            }],
            temperature: 0.3,
            max_tokens: 1000
          })
        });

        const result = await response.json();
        const chartSpec = JSON.parse(result.choices[0].message.content);
        
        return res.json({
          success: true,
          data: {
            type: 'chart',
            ...chartSpec,
            library: 'plotly'
          }
        });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }

    case 'document-generation':
      try {
        const { prompt, type, comprehensiveness, style } = data;
        const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'accounts/fireworks/models/llama-v3p1-70b-instruct', // Document model, not coder
            messages: [{
              role: 'system',
              content: `You are an expert document writer and researcher. Create comprehensive, well-structured documents with maximum detail and professional quality.

DOCUMENT GENERATION REQUIREMENTS:
- Comprehensiveness: MAXIMUM (1000+ words minimum)
- Professional Quality: EXPERT LEVEL
- Detail Level: EXTENSIVE with examples, explanations, and insights
- Structure: Clear headings, subheadings, and logical flow
- Format: Markdown with rich formatting
- Style: ${style || 'professional'}

Create documents that are:
✓ Thoroughly researched and informative
✓ Well-organized with clear sections
✓ Rich in detail and examples
✓ Professional and engaging
✓ Comprehensive and complete

NEVER create short or sparse content. Always provide full, detailed information.`
            }, {
              role: 'user',
              content: `Create a comprehensive ${type || 'document'} about: ${prompt}`
            }],
            temperature: 0.7,
            max_tokens: 4000 // More tokens for comprehensive content
          })
        });

        const result = await response.json();
        const content = result.choices[0].message.content;
        
        // Extract title from first heading or generate one
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : `${type || 'Document'}: ${prompt.substring(0, 50)}`;
        
        return res.json({
          success: true,
          data: {
            content,
            title,
            type: type || 'document',
            wordCount: content.split(/\s+/).length,
            metadata: {
              generatedAt: Date.now(),
              model: 'llama-v3p1-70b-instruct',
              comprehensiveness: 'maximum'
            }
          }
        });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }

    case 'embeddings':
      try {
        console.log('🧠 Processing embeddings request via Fireworks AI');
        
        // ENVIRONMENT-AWARE ROUTING
        if (isLocalDevelopment) {
          console.log('🔀 LOCAL DEV: Forwarding embeddings to Render backend');
          
          const response = await fetch(`${RENDER_BACKEND_URL}/api/unified-route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service: 'fireworks',
              endpoint: 'embeddings',
              data: data
            })
          });

          const result = await response.json();
          return res.status(response.status).json(result);
        }
        
        // RENDER/PROD: Handle embeddings directly
        const { input, model = 'nomic-ai/nomic-embed-text-v1.5', dimensions = 768 } = data;
        
        if (!input) {
          return res.status(400).json({ error: 'Input text required for embeddings' });
        }

        console.log(`🔍 Generating embedding with model: ${model}, dimensions: ${dimensions}`);
        
        const response = await fetch('https://api.fireworks.ai/inference/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: input,
            model: model,
            dimensions: dimensions
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Fireworks embeddings API error: ${response.status} - ${errorText}`);
          return res.status(response.status).json({ 
            error: `Embeddings API error: ${response.status}`,
            details: errorText
          });
        }

        const result = await response.json();
        console.log(`✅ Embedding generated successfully`);
        
        return res.json({
          success: true,
          data: result
        });
      } catch (error) {
        console.error('❌ Embeddings error:', error);
        return res.status(500).json({ error: error.message });
      }

    default:
      return res.status(400).json({ error: `Unknown Fireworks endpoint: ${endpoint}` });
  }
}

async function handleTogetherRequest(endpoint, data, res) {
  const apiKey = process.env.together_token || process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Together AI API key not configured' });
  }
  
  // Implement Together AI routing here
  return res.status(501).json({ error: 'Together AI routing not implemented yet' });
}

async function handleElevenLabsRequest(endpoint, data, res) {
  const apiKey = process.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }
  
  // Implement ElevenLabs routing here
  return res.status(501).json({ error: 'ElevenLabs routing not implemented yet' });
}

// Jina AI Reader handler
async function handleJinaRequest(endpoint, data, res) {
  console.log(`📖 handleJinaRequest CALLED - endpoint: "${endpoint}"`);
  
  const jinaKey = process.env.READER_API || process.env.JINA_API_KEY;
  
  // Environment detection
  const hostname = require('os').hostname();
  const isRenderEnvironment = hostname.startsWith('srv-') || process.env.RENDER === 'true';
  const isLocalDevelopment = process.env.NODE_ENV === 'development' || 
    (!isRenderEnvironment && !process.env.RAILWAY_ENVIRONMENT);
  
  // Local dev: forward to Render
  if (isLocalDevelopment) {
    console.log('🔀 LOCAL DEV: Forwarding Jina request to Render backend');
    try {
      const response = await fetch('https://neuraplay.onrender.com/api/unified-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'jina',
          endpoint: endpoint,
          data: data
        })
      });
      const result = await response.json();
      return res.status(response.status).json(result);
    } catch (proxyError) {
      console.warn('⚠️ Jina proxy to Render failed:', proxyError.message);
      // Fall through to try local handling
    }
  }
  
  // Production: handle directly
  if (!jinaKey) {
    console.error('❌ JINA READER API KEY MISSING');
    return res.status(500).json({ error: 'Jina Reader API key not configured' });
  }
  
  switch (endpoint) {
    case 'reader':
      try {
        const { url, format = 'markdown', includeImages = false } = data;
        
        if (!url) {
          return res.status(400).json({ error: 'URL required for reader' });
        }
        
        console.log(`📖 Jina Reader: Reading URL: ${url}`);
        
        const jinaURL = `https://r.jina.ai/${url}`;
        const response = await fetch(jinaURL, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${jinaKey}`,
            'X-Return-Format': format,
            'X-With-Generated-Alt': includeImages ? 'true' : 'false',
            'X-With-Images-Summary': includeImages ? 'all' : 'false',
            'X-With-Links-Summary': 'true',
            'X-Timeout': '15'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Jina Reader error: ${response.status} - ${errorText.substring(0, 200)}`);
          return res.status(response.status).json({
            success: false,
            error: `Jina Reader error: ${response.status}`
          });
        }
        
        const content = await response.text();
        console.log(`✅ Jina Reader: Got ${content.length} characters from ${url}`);
        
        return res.json({
          success: true,
          data: {
            content: content,
            url: url,
            title: url
          }
        });
      } catch (error) {
        console.error('❌ Jina Reader error:', error);
        return res.status(500).json({ error: error.message });
      }
      
    default:
      return res.status(400).json({ error: `Unknown Jina endpoint: ${endpoint}` });
  }
}

module.exports = router;