const express = require('express');
const router = express.Router();

// Minimal logging for API routes
router.use((req, res, next) => {
  if (req.path !== '/health') console.log(`📡 API: ${req.method} ${req.path}`);
  next();
});

// For Node.js versions without native fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Agent tools and functions imported inside routes to prevent module loading failures
const { tools, executeTool, SERVER_SIDE_TOOLS, performWebSearch, performNewsSearch, getWeatherData, performImageSearch } = require('../services/agent.cjs');
const { handleImageGeneration } = require('../services/imageGeneration.cjs');

// Store pending transcription requests for webhook callbacks
const pendingTranscriptions = new Map();

// HNSW Bridge Status Check
router.get('/hnsw-bridges-status', async (req, res) => {
  try {
    console.log('🔍 Checking HNSW System Bridges status...');
    
    // Try to load HNSW System Bridges
    const path = require('path');
    const bridgesPath = path.join(__dirname, '..', 'server-src', 'hnsw-services', 'HNSWSystemBridges.cjs');
    
    try {
      const { memorySystemBridge, hnswCoreIntegration } = require(bridgesPath);
      
      if (memorySystemBridge && hnswCoreIntegration) {
        console.log('✅ HNSW System Bridges are available and functional');
        return res.json({ 
          success: true, 
          status: 'available',
          bridges: ['memorySystemBridge', 'canvasSystemBridge', 'assistantSystemBridge', 'crossChatKnowledgeBridge'],
          message: 'HNSW System Bridges ready for ultra-fast memory operations'
        });
      } else {
        console.log('⚠️ HNSW System Bridges partially available');
        return res.json({ 
          success: false, 
          status: 'partial',
          message: 'Some HNSW bridges not available'
        });
      }
    } catch (bridgeError) {
      console.warn('⚠️ HNSW System Bridges not available:', bridgeError.message);
      return res.json({ 
        success: false, 
        status: 'unavailable',
        error: bridgeError.message,
        message: 'HNSW System Bridges not available, using fallback methods'
      });
    }
    
  } catch (error) {
    console.error('❌ HNSW bridges status check failed:', error);
    res.status(500).json({ 
      success: false, 
      status: 'error',
      error: error.message 
    });
  }
});

// Simple embedding generation function for development
function generateSimpleEmbedding(text, dimensions = 768) {
  if (!text) {
    return new Array(dimensions).fill(0);
  }
  
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
  const words = cleanText.split(/\s+/).filter(word => word.length > 2);
  
  // Initialize embedding vector
  const embedding = new Array(dimensions).fill(0);
  
  // Simple hash-based embedding generation
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j);
      const index = (i * 31 + charCode * 17) % dimensions;
      embedding[index] += 0.1 * (1 - i / words.length); // Decay factor for word position
    }
  }
  
  // Add some semantic features
  const semanticKeywords = {
    'name': 0.8, 'called': 0.7, 'pet': 0.9, 'cat': 0.85, 'dog': 0.85,
    'birthday': 0.8, 'born': 0.7, 'family': 0.8, 'mother': 0.75, 'father': 0.75,
    'hobby': 0.7, 'like': 0.6, 'love': 0.7, 'enjoy': 0.6, 'preference': 0.7
  };
  
  words.forEach((word, idx) => {
    if (semanticKeywords[word]) {
      const boost = semanticKeywords[word];
      for (let k = 0; k < 10; k++) {
        const index = (idx * 13 + k * 7) % dimensions;
        embedding[index] += boost;
      }
    }
  });
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

// AssemblyAI webhook endpoint for handling transcription completion
router.post('/assemblyai-webhook', async (req, res) => {
  try {
    console.log('📥 AssemblyAI webhook received:', req.body.transcript_id, req.body.status);
    
    const { transcript_id, status, text, error } = req.body;
    
    if (!transcript_id) {
      return res.status(400).json({ error: 'Missing transcript_id' });
    }
    
    // Find the pending transcription request
    const pendingRequest = pendingTranscriptions.get(transcript_id);
    
    if (!pendingRequest) {
      console.log('⚠️ Received webhook for unknown transcript_id:', transcript_id);
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    // Remove from pending requests
    pendingTranscriptions.delete(transcript_id);
    
    if (status === 'completed') {
      console.log('✅ Transcription completed:', transcript_id);
      
      // Send response to the original client
      pendingRequest.res.json({
        text: text || '',
        language_code: req.body.language_code || 'auto',
        transcript_id
      });
      
    } else if (status === 'error') {
      console.error('❌ Transcription failed:', error);
      
      pendingRequest.res.status(500).json({ 
        error: `Transcription failed: ${error}` 
      });
      
    } else {
      console.log('🔄 Transcription status:', status);
      // For 'processing' or 'queued' status, we just acknowledge but don't respond yet
    }
    
    // Always acknowledge the webhook
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// AssemblyAI transcription endpoint - fixed for development
router.post('/assemblyai-transcribe', async (req, res) => {
  try {
    console.log('🎙️ Transcription request received');
    const { audio, audioType, language_code = 'auto', speech_model = 'universal' } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // FIXED: Route through Render backend in development mode (same pattern as web search and weather)
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      console.log('🔄 Development mode - routing AssemblyAI transcription through Render backend');
      
      try {
        const renderResponse = await fetch('https://neuraplay.onrender.com/api/assemblyai-transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio,
            audioType,
            language_code,
            speech_model
          })
        });
        
        if (renderResponse.ok) {
          const renderData = await renderResponse.json();
          console.log('✅ Got transcription data from Render backend:', !!renderData.text);
          return res.json(renderData);
        } else {
          const errorText = await renderResponse.text();
          console.log('❌ Render backend failed:', renderResponse.status, errorText);
          throw new Error(`Render API returned ${renderResponse.status}: ${errorText}`);
        }
      } catch (proxyError) {
        console.log('❌ Failed to reach Render backend:', proxyError.message);
        return res.status(500).json({
          error: 'Transcription service unavailable',
          message: 'Unable to connect to transcription service. Please try again later.',
          details: proxyError.message
        });
      }
    }
    
    // Production mode - handle directly with correct environment variable names
    console.log('🏭 Production mode - handling AssemblyAI transcription directly');
    
    // Use the correct environment variable names that match Render configuration
    const apiKey = process.env.VITE_ASSEMBLYAI_API_KEY || process.env.ASSEMBLYAI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ AssemblyAI API key not found:', { 
        hasViteKey: !!process.env.VITE_ASSEMBLYAI_API_KEY,
        hasRegularKey: !!process.env.ASSEMBLYAI_API_KEY 
      });
      return res.status(500).json({ 
        error: 'AssemblyAI service not configured. Please check environment variables.' 
      });
    }

    console.log('📡 Using AssemblyAI API key:', apiKey.substring(0, 10) + '...');

    // Step 1: Upload audio data to AssemblyAI first
    console.log('📤 Step 1: Uploading audio data to AssemblyAI...');
    console.log('📊 Audio data info:', {
      audioLength: audio.length,
      audioType: audioType,
      first50Chars: audio.substring(0, 50)
    });
    
    // Convert base64 audio to binary - handle potential data URL prefix
    let cleanBase64 = audio;
    if (audio.includes(',')) {
      // Remove data URL prefix if present (e.g., "data:audio/webm;base64,")
      cleanBase64 = audio.split(',')[1];
      console.log('🧹 Stripped data URL prefix, new length:', cleanBase64.length);
    }
    
    const audioBuffer = Buffer.from(cleanBase64, 'base64');
    console.log('📦 Audio buffer created:', {
      bufferLength: audioBuffer.length,
      bufferType: typeof audioBuffer
    });
    
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: audioBuffer
    });

    console.log('📡 Upload response status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      console.error('❌ AssemblyAI upload error:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: uploadError,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      });
      return res.status(uploadResponse.status).json({ 
        error: `Audio upload failed: ${uploadError}` 
      });
    }

    const uploadResult = await uploadResponse.json();
    const audioUrl = uploadResult.upload_url;
    
    console.log('✅ Audio uploaded successfully:', audioUrl);

    // Step 2: Create transcription request with the uploaded audio URL
    const payload = {
      audio_url: audioUrl,
      speech_model: speech_model,
      punctuate: true,
      format_text: true,
      // Enable AssemblyAI's language detection when 'auto' is requested
      language_detection: language_code === 'auto',
      language_code: language_code === 'auto' ? undefined : language_code,
      // Set a lower confidence threshold for speech detection
      speech_threshold: 0.1,
      // Enable boost for low-quality audio
      boost_param: 'high',
      // Filter profanity to false to avoid filtering out words
      filter_profanity: false,
      // Enable word-level confidence scores for better speech detection
      word_boost: ['hello', 'test', 'speech', 'voice', 'recording']
    };
    
    console.log('📤 Step 2: Creating transcription request...');
    console.log('🌍 Language setting:', language_code === 'auto' ? 'auto-detection' : language_code);
    
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ AssemblyAI API error:', response.status, error);
      
      if (response.status === 401) {
        return res.status(500).json({ 
          error: 'AssemblyAI authentication failed. Please check API key configuration.' 
        });
      }
      
      return res.status(response.status).json({ 
        error: `Transcription failed: ${error}` 
      });
    }

    const result = await response.json();
    const transcriptId = result.id;
    
    console.log('📋 Transcription submitted:', transcriptId, '- polling for completion');
    
    // Poll for completion - EXTENDED for longer recordings (up to 3 minutes of audio)
    let attempts = 0;
    const maxAttempts = 120; // 120 seconds max (supports recordings up to ~3 minutes)
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;
      
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { 'Authorization': apiKey }
      });
      
      if (statusResponse.ok) {
        const statusResult = await statusResponse.json();
        
        if (statusResult.status === 'completed') {
          console.log('✅ Transcription completed:', transcriptId);
          console.log('📝 Transcript result:', {
            text: statusResult.text || '(empty)',
            textLength: (statusResult.text || '').length,
            confidence: statusResult.confidence,
            language_code: statusResult.language_code,
            audio_duration: statusResult.audio_duration,
            words: statusResult.words ? statusResult.words.length : 0
          });
          
          // Check if we got an empty result with auto-detection and try fallback to English
          if ((!statusResult.text || statusResult.text.trim() === '') && language_code === 'auto') {
            console.log('🔄 Auto-detection failed, trying fallback with English language...');
            
            // Try again with English language as fallback
            const fallbackPayload = {
              ...payload,
              language_code: 'en' // Force English instead of auto-detection
            };
            
            const fallbackResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
              method: 'POST',
              headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(fallbackPayload)
            });
            
            if (fallbackResponse.ok) {
              const fallbackResult = await fallbackResponse.json();
              const fallbackId = fallbackResult.id;
              
                // Poll for fallback completion (extended timeout for longer recordings)
                let fallbackAttempts = 0;
                while (fallbackAttempts < 60) { // 60 seconds for fallback
                await new Promise(resolve => setTimeout(resolve, 1000));
                fallbackAttempts++;
                
                const fallbackStatusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${fallbackId}`, {
                  headers: { 'Authorization': apiKey }
                });
                
                if (fallbackStatusResponse.ok) {
                  const fallbackStatusResult = await fallbackStatusResponse.json();
                  
                  if (fallbackStatusResult.status === 'completed') {
                    console.log('✅ Fallback transcription completed:', fallbackId);
                    console.log('📝 Fallback result:', {
                      text: fallbackStatusResult.text || '(empty)',
                      textLength: (fallbackStatusResult.text || '').length,
                      confidence: fallbackStatusResult.confidence,
                      language_code: fallbackStatusResult.language_code
                    });
                    
                    return res.json({
                      text: fallbackStatusResult.text || '',
                      language_code: fallbackStatusResult.language_code || 'en',
                      transcript_id: fallbackId,
                      confidence: fallbackStatusResult.confidence,
                      audio_duration: fallbackStatusResult.audio_duration,
                      used_fallback: true
                    });
                  }
                }
              }
            }
          }
          
          // Return result even if text is empty - let frontend handle it
          return res.json({
            text: statusResult.text || '',
            language_code: statusResult.language_code || 'auto',
            transcript_id: transcriptId,
            confidence: statusResult.confidence,
            audio_duration: statusResult.audio_duration
          });
        } else if (statusResult.status === 'error') {
          console.error('❌ Transcription failed:', statusResult.error);
          
          // Handle specific "no spoken audio" error with a user-friendly message
          if (statusResult.error && statusResult.error.includes('no spoken audio')) {
            return res.status(400).json({ 
              error: 'No speech detected in the audio. Please try speaking more clearly or closer to the microphone.',
              suggestion: 'Make sure you are speaking clearly and that your microphone is working properly.'
            });
          }
          
          return res.status(500).json({ 
            error: `Transcription failed: ${statusResult.error}` 
          });
        }
        
        console.log('🔄 Transcription status:', statusResult.status, `(attempt ${attempts}/${maxAttempts})`);
      }
    }
    
    // Timeout - only after 2 minutes of waiting
    console.log('⏰ Transcription timeout after', attempts, 'seconds for transcript:', transcriptId);
    return res.status(408).json({ 
      error: 'Transcription timeout - the audio may be too long or the service is busy. Please try again.',
      suggestion: 'For very long recordings (over 3 minutes), try splitting into smaller segments.'
    });

  } catch (error) {
    console.error('❌ Transcription error:', error);
    res.status(500).json({ error: `Transcription service error: ${error.message}` });
  }
});

// Helper function to get user UUID from username, email, or UUID
async function getUserUUID(userIdOrUsername, databaseManager) {
  try {
    // Check if it's already a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(userIdOrUsername)) {
      return userIdOrUsername;
    }
    
    // 🔧 CRITICAL FIX: Try email lookup FIRST (emails are unique)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(userIdOrUsername)) {
      const emailResult = await databaseManager.postgres.query(
        'SELECT id FROM users WHERE email = $1',
        [userIdOrUsername]
      );
      
      if (emailResult.rows.length > 0) {
        console.log(`✅ Found user by email: ${emailResult.rows[0].id} (${userIdOrUsername})`);
        return emailResult.rows[0].id;
      }
    }
    
    // Look up user by username
    const userResult = await databaseManager.postgres.query(
      'SELECT id, username FROM users WHERE username = $1',
      [userIdOrUsername]
    );
    
    if (userResult.rows.length > 1) {
      console.warn(`⚠️ WARNING: Multiple users found with username '${userIdOrUsername}' - returning first match. This is a database issue!`);
    }
    
    if (userResult.rows.length > 0) {
      console.log(`✅ Found user by username: ${userResult.rows[0].id} (${userIdOrUsername})`);
      return userResult.rows[0].id;
    }
    
    console.log(`❌ User not found: ${userIdOrUsername}`);
    return null;
  } catch (error) {
    console.error('❌ Error looking up user:', error);
    return null;
  }
}

// Chat tabs management endpoint - REAL DATABASE INTEGRATION
router.get('/tabs/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('📁 GET /api/tabs/:userId - Loading tabs from database for user:', userId);
    
    // Import database manager
    const databaseManager = require('../server-src/config/database.cjs');
    
    // Initialize database if not already initialized, with error handling
    if (!databaseManager.initialized) {
      console.log('🔄 Initializing database manager...');
      try {
        await databaseManager.initialize();
      } catch (initError) {
        console.error('❌ Database initialization failed:', initError);
        // Return empty array instead of throwing 500
        console.log('⚠️ Returning empty tabs array due to DB init failure');
        return res.json({ success: true, tabs: [] });
      }
    }

    if (databaseManager.postgres) {
      // Convert username to UUID if needed
      const userUUID = await getUserUUID(userId, databaseManager);
      if (!userUUID) {
        console.log('⚠️ User not found, returning empty tabs array');
        return res.json({ success: true, tabs: [] });
      }
      
      // 🔥 REDIS HOT CACHE CHECK: Try Redis first for instant response
      try {
        const redisKey = `conversations:${userUUID}:list`;
        const cached = await databaseManager.getHotData(redisKey);
        if (cached && cached.tabs && cached.tabs.length > 0) {
          console.log('🔥 Redis cache HIT - returning cached tabs');
          return res.json({ success: true, tabs: cached.tabs, source: 'redis' });
        }
      } catch (redisError) {
        console.warn('⚠️ Redis check failed (falling back to PostgreSQL):', redisError.message);
      }

      // Simplified query with 10-chat limit (YOUR REQUEST)
      // 🔧 FIX: Column is user_id not userid
      const result = await databaseManager.postgres.query(`
        SELECT * FROM chat_tabs 
        WHERE user_id = $1 
        ORDER BY last_active DESC 
        LIMIT 10
      `, [userUUID]);
      
      const tabs = result.rows.map(row => {
        // CRITICAL FIX: Safely parse JSON with fallback for corrupted data
        let messages = [];
        let context = {};
        
        try {
          // Handle case where row.messages might be "[object Object]" string
          if (row.messages && typeof row.messages === 'string' && row.messages !== '[object Object]') {
            messages = JSON.parse(row.messages);
          } else if (Array.isArray(row.messages)) {
            messages = row.messages;
          }
        } catch (e) {
          console.warn(`⚠️ Invalid messages JSON for tab ${row.id}:`, row.messages);
          messages = [];
        }
        
        try {
          // Handle case where row.context might be "[object Object]" string  
          if (row.context && typeof row.context === 'string' && row.context !== '[object Object]') {
            context = JSON.parse(row.context);
          } else if (typeof row.context === 'object' && row.context !== null) {
            context = row.context;
          }
        } catch (e) {
          console.warn(`⚠️ Invalid context JSON for tab ${row.id}:`, row.context);
          context = {};
        }
        
        return {
          id: row.id,
          title: row.title,
          messages,
          mode: row.mode,
          canvasMode: row.canvas_mode,
          context,
          createdAt: row.lastactive, // Use lastactive as created_at fallback
          lastActive: row.last_active
        };
      });
      
      console.log(`✅ Loaded ${tabs.length} recent chats (limited to 10 per your request)`);
      
      // 🔥 REDIS: Cache for next request
      try {
        const redisKey = `conversations:${userUUID}:list`;
        await databaseManager.setHotData(redisKey, { tabs, cachedAt: new Date().toISOString() }, 300); // 5 min TTL
        console.log('🔥 Tabs cached in Redis for faster subsequent loads');
      } catch (redisError) {
        console.warn('⚠️ Redis cache write failed (non-critical):', redisError.message);
      }
      
      res.json({ success: true, tabs, source: 'postgres' });
    } else {
      // Fallback to in-memory storage
      console.log('⚠️ PostgreSQL not available, using in-memory fallback');
      res.json({ success: true, tabs: [] });
    }
  } catch (error) {
    console.error('❌ Error fetching tabs:', error);
    // Always return empty array instead of 500, so UI doesn't break
    console.log('⚠️ Returning empty tabs array due to error');
    res.json({ success: true, tabs: [] });
  }
});

router.post('/tabs', async (req, res) => {
  try {
    // Accept both formats: { userId, tab } and { userId, tabData }
    const { userId, tab, tabData, title, content, messages, mode, canvasMode, context } = req.body;
    
    // Normalize to consistent format
    const normalizedTab = tab || tabData || {};
    const tabTitle = title || normalizedTab.title || 'Untitled Chat';
    const tabMessages = messages || normalizedTab.messages || [];
    const tabMode = mode || normalizedTab.mode || 'chat';
    const tabCanvasMode = canvasMode || normalizedTab.canvasMode || false;
    const tabContext = context || normalizedTab.context || {};
    
    console.log('📁 POST /api/tabs - Saving tab to database:', normalizedTab.id || tabTitle);
    
    // Import database manager
    const databaseManager = require('../server-src/config/database.cjs');
    
    // Initialize database if not already initialized
    if (!databaseManager.initialized) {
      await databaseManager.initialize();
    }

    if (databaseManager.postgres) {
      // Convert username to UUID if needed
      const userUUID = await getUserUUID(userId, databaseManager);
      if (!userUUID) {
        console.log('⚠️ User not found, returning success without persistence');
        // Don't fail - return success to prevent UI errors
        return res.json({ success: true, tab: normalizedTab });
      }
      
      // Use PostgreSQL for real persistence
      const tabId = normalizedTab.id || `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // CRITICAL FIX: Safely stringify JSON with fallback for corrupted data
      let messagesJson, contextJson;
      
      try {
        // Ensure tabMessages is a valid array
        const safeMessages = Array.isArray(tabMessages) ? tabMessages : [];
        messagesJson = JSON.stringify(safeMessages);
      } catch (e) {
        console.warn(`⚠️ Invalid messages data for tab ${tabId}:`, e.message);
        messagesJson = JSON.stringify([]);
      }
      
      try {
        // Ensure tabContext is a valid object
        const safeContext = (tabContext && typeof tabContext === 'object' && !Array.isArray(tabContext)) ? tabContext : {};
        contextJson = JSON.stringify(safeContext);
      } catch (e) {
        console.warn(`⚠️ Invalid context data for tab ${tabId}:`, e.message);
        contextJson = JSON.stringify({});
      }

      try {
      // 🔧 FIX: Column is user_id not userid
      await databaseManager.postgres.query(`
        INSERT INTO chat_tabs (id, user_id, title, messages, mode, context, last_active)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          messages = EXCLUDED.messages,
          mode = EXCLUDED.mode,
          context = EXCLUDED.context,
          last_active = NOW()
      `, [
        tabId,
        userUUID,
        tabTitle,
        messagesJson,
        tabMode,
        contextJson
      ]);
      
      console.log('✅ Tab saved to PostgreSQL:', tabId);
      
      // 🔥 REDIS HOT CACHE: Store for instant retrieval + invalidate list cache
      try {
        const redisKey = `conversation:${userUUID}:${tabId}`;
        await databaseManager.setHotData(redisKey, {
          id: tabId,
          title: tabTitle,
          messages: tabMessages,
          mode: tabMode,
          context: tabContext,
          updatedAt: new Date().toISOString()
        }, 3600); // 1 hour TTL
        
        // Invalidate list cache so next GET fetches fresh data
        await databaseManager.deleteHotData(`conversations:${userUUID}:list`);
        console.log('🔥 Tab cached in Redis + list cache invalidated');
      } catch (redisError) {
        console.warn('⚠️ Redis cache failed (non-critical):', redisError.message);
      }
      
      res.json({ success: true, tab: { id: tabId, title: tabTitle, messages: tabMessages, mode: tabMode } });
      } catch (dbError) {
        console.error('❌ PostgreSQL tab save failed:', dbError.message);
        // Don't fail - return success to prevent UI errors
        console.log('⚠️ Returning success without persistence due to DB error');
        res.json({ success: true, tab: { id: tabId, title: tabTitle, messages: tabMessages, mode: tabMode } });
      }
    } else {
      // Fallback
      console.log('⚠️ PostgreSQL not available, returning success without persistence');
      res.json({ success: true, tab });
    }
  } catch (error) {
    console.error('❌ Error saving tab:', error);
    res.status(500).json({ error: 'Failed to save tab' });
  }
});

router.put('/tabs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { updates } = req.body;
    console.log('📁 PUT /api/tabs/:id - Updating tab:', id);
    res.json({ success: true, id, updates });
  } catch (error) {
    console.error('❌ Error updating tab:', error);
    res.status(500).json({ error: 'Failed to update tab' });
  }
});

router.delete('/tabs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📁 DELETE /api/tabs/:id - Deleting tab:', id);
    res.json({ success: true, id });
  } catch (error) {
    console.error('❌ Error deleting tab:', error);
    res.status(500).json({ error: 'Failed to delete tab' });
  }
});

// ElevenLabs TTS endpoint - adding both paths for compatibility
// Removed duplicate/non-streaming TTS route to avoid conflicts; use server.cjs /api/elevenlabs-tts

// Main AI API endpoint with tool calling
router.post('/', async (req, res) => {
  try {
    console.log('🤖 AI request:', req.method, req.path);
    
    // COMPREHENSIVE ERROR HANDLING: Check for missing body
    if (!req.body || Object.keys(req.body).length === 0) {
      console.warn('⚠️ Empty request body received');
      return res.json({ 
        success: true, 
        message: 'API endpoint is working. Provide task_type and input_data for AI processing.',
        received: req.body,
        timestamp: new Date().toISOString()
      });
    }
    
    const { task_type, input_data } = req.body;
    
    // Import agent tools with comprehensive error handling
    let tools, executeTool, SERVER_SIDE_TOOLS, handleImageGeneration;
    try {
      const agentModule = require('../services/agent.cjs');
      ({ tools, executeTool, SERVER_SIDE_TOOLS } = agentModule);
      
      const imageModule = require('../services/imageGeneration.cjs');
      ({ handleImageGeneration } = imageModule);
      
      console.log('✅ Agent and image generation modules loaded successfully');
    } catch (moduleError) {
      console.error('❌ Failed to load required modules:', moduleError.message);
      return res.json({
        success: false,
        error: 'Service modules unavailable',
        message: 'AI processing services are currently unavailable. Please try again later.',
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle specific task types before falling through to GPT-OSS
    if (task_type === 'web_search') {
      try {
        const { query, num = 10, type = 'search' } = input_data;
        const isNewsSearch = type === 'news';
        console.log(`🔍 ${isNewsSearch ? '📰 NEWS' : 'Web'} search request:`, query, `(type: ${type})`);
        
        // Validate query
        if (!query || typeof query !== 'string') {
          console.error('❌ Invalid search query:', query);
          return res.status(400).json({
            success: false,
            error: 'Invalid search query',
            message: 'Please provide a valid search query'
          });
        }
        
        // FIXED: Route through Render backend in development mode (same pattern as weather)
        if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
          console.log('🔄 Development mode - routing web search through Render backend');
          
          try {
            const renderResponse = await fetch('https://neuraplay.onrender.com/api', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task_type: 'web_search',
                input_data: { query, num, type, includeImages: input_data.includeImages || false } // Only include images if explicitly requested
              })
            });
            
            if (renderResponse.ok) {
              const renderData = await renderResponse.json();
              console.log('✅ Got search data from Render backend:', renderData.success);
              
              // ENHANCED DEBUG: Log the complete response structure to see where images are
              console.log('🔍 RENDER RESPONSE DEBUG:');
              console.log('- Success:', renderData.success);
              console.log('- Data keys:', renderData.data ? Object.keys(renderData.data) : 'no data');
              console.log('- Images in data:', renderData.data?.images ? `${renderData.data.images.length} images` : 'no images in data');
              console.log('- Full response structure:', JSON.stringify(renderData, null, 2));
              
              // Only log image info if images were requested
              if (input_data.includeImages && renderData.success && renderData.data) {
                console.log('🖼️ Images in response:', renderData.data.images?.length || 0);
              }
              
              return res.json(renderData);
            } else {
              console.log('❌ Render backend failed, falling back to local search');
              throw new Error(`Render API returned ${renderResponse.status}`);
            }
          } catch (proxyError) {
            console.log('❌ Failed to reach Render, using local search:', proxyError.message);
            // Fall through to local search
          }
        }
        
        // CRITICAL FIX: Route news searches to performNewsSearch, not performWebSearch
        let searchResult;
        if (isNewsSearch) {
          console.log('📰 Using performNewsSearch for news-specific results:', query);
          searchResult = await performNewsSearch(query);
          // Transform news results to expected format with 'news' field
          if (searchResult.success && searchResult.data) {
            searchResult.data.news = searchResult.data.items || searchResult.data.results || [];
            searchResult.data.type = 'news_results';
          }
        } else {
          console.log('🔍 Using performWebSearch with query:', query);
          searchResult = await performWebSearch(query);
        }
        console.log(`🔍 ${isNewsSearch ? '📰 News' : 'Web'} search result structure:`, {
          success: searchResult.success,
          hasData: !!searchResult.data,
          dataKeys: searchResult.data ? Object.keys(searchResult.data) : [],
          newsCount: searchResult.data?.news?.length || 0,
          itemsCount: searchResult.data?.items?.length || 0,
          imagesCount: searchResult.data?.images?.length || 0,
          imagesPreview: searchResult.data?.images?.slice(0, 2)
        });
        
        if (searchResult.success) {
          // Only log image details if images were actually requested
          if (input_data.includeImages && searchResult.data?.images?.length > 0) {
            console.log('🖼️ Images included:', searchResult.data.images.length);
          }
          return res.json(searchResult);
        } else {
          console.error('🔍 Search failed:', searchResult.message);
          return res.json({ 
            success: false,
            error: searchResult.message || 'Web search failed',
            message: searchResult.message || 'Could not complete web search',
            data: searchResult.data || null
          });
        }
      } catch (error) {
        console.error('❌ Web search error details:', {
          message: error.message,
          stack: error.stack,
          type: error.constructor.name
        });
        return res.status(500).json({ 
          success: false,
          error: `Web search failed: ${error.message}`,
          message: 'An error occurred while performing the search'
        });
      }
    }
    
    // Handle embeddings requests for vector search
    if (task_type === 'embeddings') {
      try {
        const { input, model = 'nomic-ai/nomic-embed-text-v1.5', dimensions = 768 } = input_data;
        console.log('🧠 Embeddings request:', { model, dimensions, inputLength: input?.length });
        
        // For now, generate a simple embedding locally
        // In production, this would call OpenAI or another embedding service
        const embedding = generateSimpleEmbedding(input, dimensions);
        
        return res.json({
          success: true,
          data: {
            object: 'list',
            data: [{
              object: 'embedding',
              embedding: embedding,
              index: 0
            }],
            model: model,
            usage: {
              prompt_tokens: Math.ceil(input.length / 4),
              total_tokens: Math.ceil(input.length / 4)
            }
          }
        });
      } catch (error) {
        console.error('Embeddings error:', error);
        return res.status(500).json({ error: `Embeddings generation failed: ${error.message}` });
      }
    }
    
    // Handle weather requests
    if (task_type === 'weather') {
      try {
        const { location, autoDetectLocation } = input_data;
        console.log('☁️ Weather request:', location || 'auto-detect');
        
        // FIXED: Better location validation and fallback
        let finalLocation = location;
        
        // If location is invalid (like "Whats"), use auto-detection
        if (!location || location.toLowerCase().match(/^(what|whats|how|when|where|why)$/)) {
          console.log('🔍 Invalid or missing location, using auto-detect');
          finalLocation = 'Current Location'; // This will trigger location service
        }
        
        // Get weather data
        const weatherResult = await getWeatherData(finalLocation || 'New York');
        
        if (weatherResult.success) {
          return res.json(weatherResult);
        } else {
          // FIXED: Return proper error format instead of 500
          console.log('⚠️ Weather request failed, returning structured error:', weatherResult);
          return res.json({
            success: false,
            error: weatherResult.error || weatherResult.message || 'Weather request failed',
            message: weatherResult.message || `Could not get weather for ${finalLocation}`,
            location: finalLocation,
            autoDetected: autoDetectLocation || false
          });
        }
      } catch (error) {
        console.error('Weather error:', error);
        // FIXED: Return structured error instead of 500 status
        return res.json({
          success: false,
          error: `Weather request failed: ${error.message}`,
          message: `Could not get weather: ${error.message}`,
          location: input_data?.location || 'unknown'
        });
      }
    }
    
    // Handle image generation separately
    if (task_type === 'image') {
      try {
        const { prompt } = input_data;
        console.log('🖼️ Image generation request:', prompt);
        
        // Try Fireworks first, then fallback to TogetherAI
        const fireworksKey = process.env.Neuraplay || process.env.FIREWORKS_API_KEY || process.env.VITE_FIREWORKS_API_KEY;
        const togetherKey = process.env.together_token || process.env.TOGETHER_API_KEY || process.env.VITE_TOGETHER_API_KEY;
        
        if (fireworksKey && !fireworksKey.includes('demo')) {
          try {
            const imageResult = await handleImageGeneration(input_data, fireworksKey);
            return res.json(imageResult);
          } catch (fireworksError) {
            console.warn('🖼️ Fireworks image generation failed, trying TogetherAI:', fireworksError.message);
          }
        }
        
        if (togetherKey && !togetherKey.includes('demo')) {
          try {
            console.log('🖼️ Using TogetherAI for image generation');
            const response = await fetch('https://api.together.xyz/v1/images/generations', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${togetherKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'black-forest-labs/FLUX.1-schnell-Free',
                prompt: `Create a beautiful, high-quality image: ${prompt}. Style: vibrant colors, detailed, professional.`,
                width: 512,
                height: 512,
                steps: 4,
                n: 1
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              const imageUrl = result.data?.[0]?.url;
              
              if (imageUrl) {
                // Download the image and convert to base64
                const imageResponse = await fetch(imageUrl);
                const imageBuffer = await imageResponse.buffer();
                const base64Image = imageBuffer.toString('base64');
                const dataUrl = `data:image/png;base64,${base64Image}`;
                
                return res.json({
                  image_url: dataUrl,
                  contentType: 'image/png',
                  data: base64Image
                });
              }
            }
          } catch (togetherError) {
            console.warn('🖼️ TogetherAI image generation failed:', togetherError.message);
          }
        }
        
        // Fallback response
        return res.status(500).json({ 
          error: 'Image generation failed: No valid API keys available for Fireworks or TogetherAI' 
        });
        
      } catch (error) {
        console.error('Image generation error:', error);
        return res.status(500).json({ error: `Image generation failed: ${error.message}` });
      }
    }
    
    if (!input_data || !input_data.messages) {
      console.log('❌ DEBUG: Validation failed - input_data:', !!input_data, 'messages:', !!input_data?.messages);
      console.log('❌ DEBUG: Full request body for 400 error:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({ error: 'No messages provided' });
    }

    // Extract parameters with defaults
    const maxTokens = input_data.max_tokens || 2000;
    // CRITICAL FIX: Use explicit check because 0 is falsy (temperature 0.0 was becoming 0.6)
    const temperature = input_data.temperature !== undefined ? input_data.temperature : 0.6;

    // Process with AI Router system
    
    // 🎯 PRIMARY SYSTEM: Use your sophisticated AIRouter architecture
    console.log('🧠 Using AIRouter (Primary System Only)');
    
    // Extract user message and session info for AIRouter
    const userMessage = input_data.messages[input_data.messages.length - 1]?.content || "";
    const sessionId = input_data.sessionId || `session-${Date.now()}`;
    const userId = input_data.userId || 'anonymous';
    
    // Load and execute via AIRouter
    const ServiceContainerModule = require('../src/services/ServiceContainer');
    const serviceContainer = ServiceContainerModule.serviceContainer || ServiceContainerModule.default;
    
    if (!serviceContainer) {
      throw new Error('ServiceContainer not available');
    }
    
    await serviceContainer.waitForReady();
    const aiRouter = serviceContainer.get('aiRouter');
    
    if (!aiRouter) {
      throw new Error('AIRouter not found');
    }
    
    const aiRouterResponse = await aiRouter.processRequest({
      message: userMessage,
      sessionId: sessionId,
      userId: userId,
      context: input_data.context || {},
      constraints: {
        maxTokens: maxTokens,
            temperature: temperature
          }
    });
    
    // Process successful response
    
    // Return AIRouter response
    return res.json([{
      generated_text: aiRouterResponse.response,
      tool_results: aiRouterResponse.toolResults || [],
      metadata: {
        ...aiRouterResponse.metadata,
        systemUsed: 'aiRouter-primary'
      }
    }]);

  } catch (error) {
    console.error('❌ COMPREHENSIVE AI API ERROR:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request details:', {
      method: req.method,
      path: req.path,
      body: req.body,
      headers: req.headers['content-type']
    });
    
    // ENSURE we always return JSON, never let it fall through to SPA
    const errorResponse = {
      success: false,
      error: 'AI service error',
      details: error.message,
      timestamp: new Date().toISOString(),
      endpoint: '/api',
      method: 'POST'
    };
    
    // Set explicit JSON header to prevent any confusion
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json(errorResponse);
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// COMPREHENSIVE API TEST ENDPOINT
router.post('/test-connectivity', (req, res) => {
  console.log('🔍 API test endpoint called:', req.method, req.path);
  console.log('🔍 Request body:', req.body);
  
  res.setHeader('Content-Type', 'application/json');
  res.json({
    success: true,
    message: 'API endpoint is working correctly',
    endpoint: '/api/test-connectivity',
    method: 'POST',
    timestamp: new Date().toISOString(),
    received: req.body,
    headers: {
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']
    }
  });
});

// Memory API endpoints - HNSW Vector Search with Database Fallback
router.post('/memory', async (req, res) => {
  try {
    console.log('🧠 Memory API request received:', req.body.action);
    
    const { action, userId, key, value, query, limit, categories, excludeCategories } = req.body;
    
    // Validate required parameters
    if (!action || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Action and userId are required'
      });
    }
    
    // 🔑 CRITICAL: Convert username to UUID for database queries
    const databaseManager = require('../server-src/config/database.cjs');
    if (!databaseManager.initialized) {
      await databaseManager.initialize();
    }
    const resolvedUserId = await getUserUUID(userId, databaseManager);
    console.log(`🔑 Resolved userId: ${userId} -> ${resolvedUserId || 'NOT FOUND'}`);
    
    // 🚀 PRIMARY: HNSW Vector Search
    try {
      const path = require('path');
      const hnswCorePath = path.join(__dirname, '..', 'server-src', 'hnsw-services', 'HNSWCoreIntegration.cjs');
      const { hnswCoreIntegration } = require(hnswCorePath);
      
      if (hnswCoreIntegration) {
        console.log('🚀 Using pgvector as PRIMARY retrieval method');
        
        // Initialize if needed
        if (!hnswCoreIntegration.initialized) {
          await hnswCoreIntegration.initialize();
        }
        
        // Handle different actions
        if (action === 'search' || action === 'vector_search') {
          // 🔑 Use resolved UUID for HNSW search
          const userIdForSearch = resolvedUserId || userId;
          
          // 🎯 ALL COMPONENT TYPES: Include personal types for comprehensive memory search
          const allComponentTypes = [
            'chat_knowledge', 'general', 'memory',              // Legacy
            'personal_identity', 'relationships', 'professional', // Personal
            'personal_context', 'emotional_state', 'preferences', // Context
            'interests', 'goals', 'learning',                     // Behavioral
            'canvas_document', 'document', 'code_canvas', 'chart_canvas' // Canvas
          ];
          
          const searchOptions = {
            userId: userIdForSearch,
            // 🎯 Include ALL types including personal for comprehensive search
            componentTypes: req.body.componentTypes || allComponentTypes,
            categories: categories, // 🎯 Category filter for intent-driven retrieval
            excludeCategories: excludeCategories, // 🎯 EXCLUDE specific categories at DATABASE level
            conversationId: req.body.conversationId, // 🎯 CRITICAL: Filter canvas docs by conversation
            limit: limit || 20,
            similarityThreshold: 0.1, // Low threshold for better recall
            includeMetadata: true,
            excludeNonPersonal: req.body.excludeNonPersonal, // 🎯 Filter out canvas docs
            includeLearningMoments: req.body.includeLearningMoments || false, // 🎯 Exclude by default, include for learning queries
            // 🎯 CRITICAL: Pass category boosts to backend for identity prioritization
            categoryBoosts: req.body.categoryBoosts,                  // Frontend sends hierarchical boosts
            legacyHandling: req.body.legacyHandling,                  // How to handle null/undefined categories
            prioritizeIdentity: req.body.prioritizeIdentity || true   // Enable identity-first scoring
          };
          
          // Removed verbose HNSW log to reduce noise
          const results = await hnswCoreIntegration.searchVectors(query || '', searchOptions);
          
          // Transform results to expected format
          let memories = results.map(result => ({
            id: result.id,
            memory_key: result.metadata?.memoryKey || result.id,
            memory_value: result.content,
            content: result.content,
            similarity: result.similarity,
            metadata: result.metadata || {},
            source: 'hnsw_accelerated',
            created_at: result.metadata?.timestamp
          }));
          
          // 🎯 FILTER: Remove canvas documents from personal recall queries
          if (req.body.excludeNonPersonal) {
            memories = memories.filter(m => m.metadata?.isPersonalMemory !== false);
            console.log(`🎯 Filtered out non-personal memories (canvas docs), ${memories.length} remaining`);
          }
          
          // Removed verbose HNSW log to reduce noise
          
          // 🔄 CRITICAL: If HNSW returns empty, get ALL user memories (no semantic search - just fetch all)
          if (memories.length === 0 && resolvedUserId) {
            console.log('🔄 Vector search returned 0 - fetching all user memories');
            try {
              if (databaseManager.postgres) {
                const db = databaseManager.postgres;
                
                // SIMPLE FIX: Just get ALL memories for the user, let LLM filter
                const textResult = await db.query(`
                  SELECT * FROM user_memories
                  WHERE user_id = $1
                  ORDER BY updated_at DESC
                  LIMIT $2
                `, [resolvedUserId, limit || 50]);
                
                if (textResult.rows.length > 0) {
                  console.log(`✅ Database found ${textResult.rows.length} memories for user ${resolvedUserId}`);
                  memories = textResult.rows.map(row => ({
                    id: row.id,
                    memory_key: row.memory_key,
                    memory_value: row.memory_value || row.content,
                    content: row.content || row.memory_value,
                    similarity: 1.0, // All memories are relevant
                    metadata: row.metadata || row.context || {},
                    source: 'database_direct',
                    created_at: row.created_at
                  }));
                }
              }
            } catch (dbErr) {
              console.warn('⚠️ Database fallback failed:', dbErr.message);
            }
          }
          
          return res.json({
            success: true,
            memories,
            total: memories.length,
            source: memories.length > 0 ? (memories[0].source || 'hnsw_primary') : 'empty'
          });
          
        } else if (action === 'store') {
          if (!key || !value) {
            return res.status(400).json({
              success: false,
              error: 'Key and value are required for store operations'
            });
          }
          
          // 🔑 Use resolved UUID for consistent storage
          const userIdForStorage = resolvedUserId || userId;
          
          // 🎯 PROPER COMPONENT TYPE: Use determined type for efficient filtering at scale
          const memoryCategory = req.body.metadata?.category || '';
          const determinedComponentType = hnswCoreIntegration.determineComponentType(key, memoryCategory);
          
          const vectorData = {
            id: `${userIdForStorage}_${key}_${Date.now()}`,
            content: value,  // Store ONLY the value, key is in metadata
            componentType: determinedComponentType,  // 🎯 Proper type instead of hardcoded 'chat_knowledge'
            userId: userIdForStorage,
            sessionId: req.body.sessionId || 'default_session',
            metadata: {
              memoryKey: key,
              originalUsername: userId, // Keep original for reference
              timestamp: new Date().toISOString(),
              ...(req.body.metadata || {})
            }
          };
          
          const storeResult = await hnswCoreIntegration.storeVector(vectorData);
          
          if (storeResult.success) {
            // Removed verbose HNSW log to reduce noise
            return res.json({
              success: true,
              message: 'Memory stored successfully via HNSW',
              data: { key, value },
              source: 'hnsw_primary'
            });
          } else {
            // 🔧 FALLBACK: HNSW failed, try direct database storage
            console.warn(`⚠️ HNSW store failed, falling back to database storage for ${key}`);
            
            if (databaseManager.postgres && userIdForStorage) {
              try {
                const db = databaseManager.postgres;
                const insertResult = await db.query(`
                  INSERT INTO user_memories (user_id, memory_key, content, metadata, created_at, updated_at)
                  VALUES ($1, $2, $3, $4, NOW(), NOW())
                  ON CONFLICT (user_id, memory_key) 
                  DO UPDATE SET content = $3, metadata = $4, updated_at = NOW()
                  RETURNING id
                `, [userIdForStorage, key, value, JSON.stringify(req.body.metadata || {})]);
                
                console.log(`✅ Memory stored in database fallback: ${key} for user ${userIdForStorage}`);
                return res.json({
                  success: true,
                  message: 'Memory stored successfully via database fallback',
                  data: { key, value },
                  source: 'database_fallback'
                });
              } catch (dbError) {
                console.error(`❌ Database fallback also failed:`, dbError.message);
                return res.status(500).json({
                  success: false,
                  error: `Both HNSW and database storage failed: ${dbError.message}`
                });
              }
            } else {
              return res.status(500).json({
                success: false,
                error: 'HNSW failed and database not available for fallback'
              });
            }
          }
        } else if (action === 'delete') {
          // 🗑️ DELETE MEMORY - Handle memory deletion from ALL tables
          if (!key) {
            return res.status(400).json({
              success: false,
              error: 'Key is required for delete operations'
            });
          }
          
          const userIdForDelete = resolvedUserId || userId;
          console.log(`🗑️ Deleting memory: key="${key}" for user=${userIdForDelete}`);
          
          // Delete from ALL memory-related tables (cascade delete)
          if (databaseManager.postgres && userIdForDelete) {
            const db = databaseManager.postgres;
            let totalDeleted = 0;
            
            // 1. Delete from user_memories (primary)
            try {
              const result1 = await db.query(`
                DELETE FROM user_memories
                WHERE user_id = $1 AND memory_key = $2
                RETURNING id
              `, [userIdForDelete, key]);
              totalDeleted += result1.rowCount || 0;
              if (result1.rowCount > 0) console.log(`✅ Deleted ${result1.rowCount} from user_memories`);
            } catch (e) { console.warn('user_memories delete:', e.message); }
            
            // 2. Delete from hnsw_vector_metadata (vector index)
            try {
              const result2 = await db.query(`
                DELETE FROM hnsw_vector_metadata
                WHERE user_id = $1 AND (memory_key = $2 OR id = $2)
                RETURNING id
              `, [userIdForDelete, key]);
              totalDeleted += result2.rowCount || 0;
              if (result2.rowCount > 0) console.log(`✅ Deleted ${result2.rowCount} from hnsw_vector_metadata`);
            } catch (e) { /* Table might not exist */ }
            
            // 3. Delete from vector_embeddings (pgvector storage)
            try {
              const result3 = await db.query(`
                DELETE FROM vector_embeddings
                WHERE user_id = $1 AND (id = $2 OR content LIKE $3)
                RETURNING id
              `, [userIdForDelete, key, `%${key}%`]);
              totalDeleted += result3.rowCount || 0;
              if (result3.rowCount > 0) console.log(`✅ Deleted ${result3.rowCount} from vector_embeddings`);
            } catch (e) { /* Table might not exist */ }
            
            // 4. Delete from semantic_embeddings
            try {
              const result4 = await db.query(`
                DELETE FROM semantic_embeddings
                WHERE user_id = $1 AND (id::text = $2 OR content LIKE $3)
                RETURNING id
              `, [userIdForDelete, key, `%${key}%`]);
              totalDeleted += result4.rowCount || 0;
              if (result4.rowCount > 0) console.log(`✅ Deleted ${result4.rowCount} from semantic_embeddings`);
            } catch (e) { /* Table might not exist */ }
            
            // 5. Delete from cross_chat_knowledge
            try {
              const result5 = await db.query(`
                DELETE FROM cross_chat_knowledge
                WHERE user_id = $1 AND (id::text = $2 OR content LIKE $3)
                RETURNING id
              `, [userIdForDelete, key, `%${key}%`]);
              totalDeleted += result5.rowCount || 0;
              if (result5.rowCount > 0) console.log(`✅ Deleted ${result5.rowCount} from cross_chat_knowledge`);
            } catch (e) { /* Table might not exist */ }
            
            console.log(`🗑️ Total deleted across all tables: ${totalDeleted}`);
            
            return res.json({
              success: true,
              message: totalDeleted > 0 ? 'Memory deleted successfully' : 'Memory not found or already deleted',
              deleted: totalDeleted
            });
          } else {
            return res.status(500).json({
              success: false,
              error: 'Database not available for deletion'
            });
          }
        } else if (action === 'delete_all') {
          // 🔥 DELETE ALL MEMORIES for a user - NUCLEAR OPTION
          const userIdForDelete = resolvedUserId || userId;
          if (!userIdForDelete) {
            return res.status(400).json({
              success: false,
              error: 'User ID required for delete_all'
            });
          }
          
          console.log(`🔥 DELETING ALL MEMORIES for user: ${userIdForDelete}`);
          
          if (databaseManager.postgres) {
            const db = databaseManager.postgres;
            const results = {};
            
            // List of all tables that store user data (including courses!)
            const tablesToClear = [
              { name: 'user_memories', column: 'user_id' },
              { name: 'hnsw_vector_metadata', column: 'user_id' },
              { name: 'vector_embeddings', column: 'user_id' },
              { name: 'semantic_embeddings', column: 'user_id' },
              { name: 'cross_chat_knowledge', column: 'user_id' },
              { name: 'canvas_documents', column: 'user_id' },
              { name: 'canvas_preferences', column: 'user_id' },
              { name: 'learning_moments', column: 'user_id' },
              { name: 'emotional_states', column: 'user_id' },
              { name: 'user_courses', column: 'user_id' },  // ✅ Added: Course data
              { name: 'chat_tabs', column: 'user_id' },     // ✅ Added: Conversation history
              { name: 'user_behavior_patterns', column: 'user_id' }
            ];
            
            for (const table of tablesToClear) {
              try {
                const result = await db.query(
                  `DELETE FROM ${table.name} WHERE ${table.column} = $1 RETURNING id`,
                  [userIdForDelete]
                );
                results[table.name] = result.rowCount || 0;
                if (result.rowCount > 0) {
                  console.log(`✅ Deleted ${result.rowCount} rows from ${table.name}`);
                }
              } catch (e) {
                results[table.name] = `Error: ${e.message.split('\n')[0]}`;
              }
            }
            
            const totalDeleted = Object.values(results)
              .filter(v => typeof v === 'number')
              .reduce((sum, n) => sum + n, 0);
            
            console.log(`🔥 DELETE_ALL complete: ${totalDeleted} total records deleted`);
            
            return res.json({
              success: true,
              message: `Deleted ${totalDeleted} records across all tables`,
              deleted: totalDeleted,
              details: results
            });
          } else {
            return res.status(500).json({
              success: false,
              error: 'Database not available'
            });
          }
        } else if (action === 'delete_by_category') {
          // 🗑️ DELETE BY CATEGORY - For supersession of singleton values (name, location, etc.)
          const category = req.body.category;
          const userIdForDelete = resolvedUserId || userId;
          
          if (!category || !userIdForDelete) {
            return res.status(400).json({
              success: false,
              error: 'Category and userId required for delete_by_category'
            });
          }
          
          console.log(`🗑️ DELETE_BY_CATEGORY: Deleting all "${category}" memories for user ${userIdForDelete}`);
          
          if (databaseManager.postgres) {
            const db = databaseManager.postgres;
            
            // Delete memories where category matches OR key contains the category pattern
            const result = await db.query(`
              DELETE FROM user_memories
              WHERE user_id = $1 
                AND (
                  metadata->>'category' ILIKE $2
                  OR memory_key ILIKE $3
                  OR memory_key ILIKE $4
                )
              RETURNING id, memory_key
            `, [
              userIdForDelete, 
              category, 
              `%user_${category}%`,
              `%_${category}_%`
            ]);
            
            console.log(`🗑️ DELETE_BY_CATEGORY: Deleted ${result.rowCount} memories with category "${category}"`);
            
            return res.json({
              success: true,
              message: `Deleted ${result.rowCount} memories with category "${category}"`,
              deleted: result.rowCount,
              deletedKeys: result.rows.map(r => r.memory_key)
            });
          } else {
            return res.status(500).json({
              success: false,
              error: 'Database not available'
            });
          }
        } else if (action === 'update') {
          // 📝 UPDATE MEMORY - Handle memory update
          if (!key || !value) {
            return res.status(400).json({
              success: false,
              error: 'Key and value are required for update operations'
            });
          }
          
          const userIdForUpdate = resolvedUserId || userId;
          console.log(`📝 Updating memory: key="${key}" for user=${userIdForUpdate}`);
          
          if (databaseManager.postgres && userIdForUpdate) {
            const db = databaseManager.postgres;
            const updateResult = await db.query(`
              UPDATE user_memories
              SET content = $3, updated_at = NOW()
              WHERE user_id = $1 AND memory_key = $2
              RETURNING id
            `, [userIdForUpdate, key, value]);
            
            if (updateResult.rowCount > 0) {
              console.log(`✅ Memory updated in database: ${key}`);
              return res.json({
                success: true,
                message: 'Memory updated successfully'
              });
            } else {
              // Memory doesn't exist, create it
              console.log(`⚠️ Memory not found for update, creating new: ${key}`);
              // Fall through to store logic by continuing
            }
          }
        }
      }
    } catch (hnswError) {
      console.warn('⚠️ HNSW failed, using database fallback:', hnswError.message);
    }
    
    // 🔄 FALLBACK: Direct Database Access
    console.log('🔄 Using database fallback for memory operations');
    
    try {
      if (databaseManager.postgres && resolvedUserId) {
        const db = databaseManager.postgres;
        
        if (action === 'search') {
          let memories;
          
          // SIMPLE FIX: Always get ALL memories - let LLM filter
          memories = await db.query(`
            SELECT * FROM user_memories
            WHERE user_id = $1
            ORDER BY updated_at DESC
            LIMIT $2
          `, [resolvedUserId, limit || 50]);
          
          console.log(`✅ Database found ${memories.rows.length} memories for user ${resolvedUserId}`);
          return res.json({
            success: true,
            memories: memories.rows,
            total: memories.rows.length,
            source: 'database_fallback'
          });
        } else if (action === 'delete') {
          // 🗑️ DELETE FALLBACK
          if (!key) {
            return res.status(400).json({
              success: false,
              error: 'Key is required for delete operations'
            });
          }
          
          console.log(`🗑️ [FALLBACK] Deleting memory: key="${key}" for user=${resolvedUserId}`);
          const deleteResult = await db.query(`
            DELETE FROM user_memories
            WHERE user_id = $1 AND memory_key = $2
            RETURNING id
          `, [resolvedUserId, key]);
          
          return res.json({
            success: true,
            message: deleteResult.rowCount > 0 ? 'Memory deleted successfully' : 'Memory not found',
            deleted: deleteResult.rowCount
          });
        } else if (action === 'update') {
          // 📝 UPDATE FALLBACK
          if (!key || !value) {
            return res.status(400).json({
              success: false,
              error: 'Key and value are required for update operations'
            });
          }
          
          console.log(`📝 [FALLBACK] Updating memory: key="${key}" for user=${resolvedUserId}`);
          const updateResult = await db.query(`
            UPDATE user_memories
            SET content = $3, updated_at = NOW()
            WHERE user_id = $1 AND memory_key = $2
            RETURNING id
          `, [resolvedUserId, key, value]);
          
          if (updateResult.rowCount > 0) {
            return res.json({
              success: true,
              message: 'Memory updated successfully'
            });
          } else {
            // Create if not exists - 🎯 FIX: Include metadata to preserve category
            const createMetadata = req.body.metadata || {};
            await db.query(`
              INSERT INTO user_memories (user_id, memory_key, content, metadata, created_at, updated_at)
              VALUES ($1, $2, $3, $4, NOW(), NOW())
            `, [resolvedUserId, key, value, JSON.stringify(createMetadata)]);
            return res.json({
              success: true,
              message: 'Memory created successfully'
            });
          }
        } else if (action === 'store') {
          // 💾 STORE FALLBACK
          if (!key || !value) {
            return res.status(400).json({
              success: false,
              error: 'Key and value are required for store operations'
            });
          }
          
          console.log(`💾 [FALLBACK] Storing memory: key="${key}" for user=${resolvedUserId}`);
          
          // 🎯 FIX: Include metadata to preserve category for ranking
          const metadata = req.body.metadata || {};
          
          // Upsert: Update if exists, insert if not - INCLUDE METADATA
          await db.query(`
            INSERT INTO user_memories (user_id, memory_key, content, metadata, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (user_id, memory_key) 
            DO UPDATE SET content = $3, metadata = $4, updated_at = NOW()
          `, [resolvedUserId, key, value, JSON.stringify(metadata)]);
          
          return res.json({
            success: true,
            message: 'Memory stored successfully',
            data: { key, value }
          });
        }
      } else if (!resolvedUserId) {
        console.warn('⚠️ Could not resolve user UUID for:', userId);
      }
    } catch (dbError) {
      console.error('❌ Database fallback also failed:', dbError.message);
    }
    
    // 💀 ULTIMATE FALLBACK: Empty result
    console.log('⚠️ All retrieval methods failed, returning empty results');
    return res.json({
      success: true,
      memories: [],
      total: 0,
      source: 'empty_fallback',
      message: 'No memories found. Vector store is empty - add memories through conversation.'
    });
    
  } catch (error) {
    console.error('❌ Memory API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Memory API error',
      details: error.message
    });
  }
});

// Simple memory test endpoint (temporary)
router.get('/memory/test', (req, res) => {
  console.log('🧪 Memory test endpoint called');
  if (!global.memoryStore) {
    global.memoryStore = new Map();
  }
  res.json({ success: true, message: 'Memory test working', storeSize: global.memoryStore.size });
});

// Route status test endpoint
router.get('/route-test', (req, res) => {
  console.log('🔍 Route test endpoint called');
  res.json({ 
    success: true, 
    message: 'API routes are working',
    timestamp: new Date().toISOString(),
    endpoint: '/api/route-test'
  });
});

// Get all memories for a user
router.get('/memory/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 Getting memories for user:', userId);
    
    // Import database manager
    const databaseManager = require('../server-src/config/database.cjs');
    
    // Initialize database if not already initialized
    if (!databaseManager.initialized) {
      console.log('🔄 Initializing database manager...');
      await databaseManager.initialize();
    }
    
    // Check if PostgreSQL is available, use fallback if not
    if (!databaseManager || !databaseManager.postgres) {
      console.log('⚠️ PostgreSQL not available, using in-memory fallback');
      
      if (!global.memoryStore) {
        global.memoryStore = new Map();
      }
      
      const results = [];
      for (const [storeKey, data] of global.memoryStore.entries()) {
        if (storeKey.startsWith(`${userId}_`)) {
          const memKey = storeKey.replace(`${userId}_`, '');
          results.push({ 
            id: results.length + 1,
            memory_key: memKey, 
            content: data.value, 
            created_at: data.timestamp 
          });
        }
      }
      return res.json(results);
    }
    
    const db = databaseManager.postgres;
    
    const result = await db.query(`
      SELECT id, memory_key, content, created_at, updated_at 
      FROM user_memories 
      WHERE user_id = $1
      ORDER BY updated_at DESC
    `, [userId]);
    
    const memories = result.rows.map(row => ({
      id: row.id,
      memory_key: row.memory_key,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: row.memory_key // Use memory_key as category for compatibility
    }));
    
    console.log(`🔍 Found ${memories.length} memories for user ${userId}`);
    res.json(memories);
    
  } catch (error) {
    console.error('❌ Error fetching user memories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fix memory table schema
router.get('/memory/fix-schema', async (req, res) => {
  try {
    console.log('🔧 Memory schema fix endpoint called');
    
    // Import database manager
    const databaseManager = require('../server-src/config/database.cjs');
    
    // Initialize database if not already initialized
    if (!databaseManager.initialized) {
      console.log('🔄 Initializing database manager...');
      await databaseManager.initialize();
    }
    
    if (!databaseManager || !databaseManager.postgres) {
      return res.json({ 
        success: false, 
        message: 'PostgreSQL not available',
        error: 'Database not connected'
      });
    }
    
    // Drop the table and recreate it with the correct schema
    await databaseManager.postgres.query('DROP TABLE IF EXISTS user_memories CASCADE');
    
    // Create with the unified schema from database.cjs
    await databaseManager.postgres.query(`
      CREATE TABLE user_memories (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        memory_key VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        context JSONB DEFAULT '{}',
        tags TEXT[] DEFAULT '{}',
        importance_score DECIMAL DEFAULT 0.5,
        access_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, memory_key)
      )
    `);
    
    console.log('✅ Memory table recreated with correct schema');
    res.json({ 
      success: true, 
      message: 'Memory table schema fixed', 
      action: 'recreated'
    });
    
  } catch (error) {
    console.error('❌ Memory schema fix error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create memory table if it doesn't exist
router.get('/memory/init', async (req, res) => {
  try {
    console.log('🧪 Memory init endpoint called');
    
    // Import database manager - FORCE PostgreSQL usage (moved inside route to prevent module loading failure)
    const databaseManager = require('../server-src/config/database.cjs');
    
    // Initialize database if not already initialized
    if (!databaseManager.initialized) {
      console.log('🔄 Initializing database manager...');
      await databaseManager.initialize();
    }
    
    console.log('🔍 Database manager status:', {
      initialized: databaseManager.initialized,
      hasPostgres: !!databaseManager.postgres,
      postgresStatus: databaseManager.postgres ? 'connected' : 'not connected'
    });
    
    // Check PostgreSQL availability with fallback for production
    if (!databaseManager || !databaseManager.postgres) {
      console.log('⚠️ PostgreSQL not available for memory init, using fallback response');
      return res.json({ 
        success: true, 
        message: 'Memory system ready (fallback mode)', 
        database: 'fallback',
        fallback: true 
      });
    }
    
    await databaseManager.postgres.query(`
      CREATE TABLE IF NOT EXISTS user_memories (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        memory_key VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, memory_key)
      )
    `);
    
    console.log('✅ PostgreSQL memory table initialized successfully');
    res.json({ 
      success: true, 
      message: 'Memory table initialized in PostgreSQL', 
      database: 'postgresql',
      fallback: false 
    });
  } catch (error) {
    console.error('❌ Memory table initialization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ElevenLabs TTS endpoint
// Contact form endpoint - sends to support@neuraplay.biz
router.post('/contact', async (req, res) => {
  try {
    console.log('📧 Contact form submission received:', req.body);
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields: name, email, message' });
    }
    
    // Send email to support
    const emailService = require('../services/email.cjs');
    const nodemailer = require('nodemailer');
    
    // Create transporter (reuse settings from email service)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      name: 'neuraplay.biz',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_APP_PASSWORD
      }
    });
    
    // Send to support email
    await transporter.sendMail({
      from: `"NeuraPlay Contact Form" <smt@neuraplay.biz>`,
      to: 'support@neuraplay.biz',
      replyTo: email,
      subject: `[Contact Form] Message from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">New Contact Form Submission</h2>
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <h3>Message:</h3>
          <p style="background: #f3f4f6; padding: 15px; border-radius: 8px;">${message.replace(/\n/g, '<br>')}</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Submitted: ${new Date().toLocaleString()}<br>
            Reply directly to this email to respond to ${name}.
          </p>
        </div>
      `
    });
    
    console.log('✅ Contact form email sent to support@neuraplay.biz');
    
    res.json({ 
      success: true, 
      message: 'Contact form submitted successfully' 
    });
  } catch (error) {
    console.error('❌ Contact form error:', error);
    // Still return success to user (don't expose email failures)
    res.json({ 
      success: true, 
      message: 'Contact form submitted successfully' 
    });
  }
});

// Users sync endpoint - saves user data including profile avatar
router.post('/users/sync', async (req, res) => {
  try {
    console.log('🔄 User sync request received');
    const { userId, userData, syncData } = req.body;
    const dataToSync = userData || syncData;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    // Use existing databaseManager instead of creating new pool
    const databaseManager = require('../server-src/config/database.cjs');
    if (!databaseManager.initialized) {
      await databaseManager.initialize();
    }
    
    if (!databaseManager.postgres) {
      console.warn('⚠️ Database not available for user sync');
      // Return success anyway - don't block the frontend
      return res.json({ 
        success: true, 
        message: 'User data accepted (database unavailable)',
        syncedAt: new Date().toISOString()
      });
    }
    
    const db = databaseManager.postgres;
    
    // Check if user_profiles table exists, create if not
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id TEXT PRIMARY KEY,
          avatar TEXT,
          profile_data JSONB,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } catch (tableError) {
      console.warn('⚠️ Could not create user_profiles table:', tableError.message);
      // Continue anyway - table might already exist
    }
    
    // Upsert the profile data
    const profileData = dataToSync?.profile || {};
    const avatar = profileData.avatar || null;
    
    try {
      await db.query(`
        INSERT INTO user_profiles (user_id, avatar, profile_data, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          avatar = COALESCE($2, user_profiles.avatar),
          profile_data = COALESCE(user_profiles.profile_data, '{}'::jsonb) || $3::jsonb,
          updated_at = NOW()
      `, [userId, avatar, JSON.stringify(profileData)]);
      
      console.log('✅ User profile synced to database:', { userId, hasAvatar: !!avatar });
    } catch (upsertError) {
      console.error('❌ User profile upsert failed:', upsertError.message);
      // Return success anyway to not block frontend
      return res.json({ 
        success: true, 
        message: 'User data accepted (upsert failed)',
        error: upsertError.message,
        syncedAt: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      message: 'User data synced successfully',
      syncedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ User sync error:', error.message, error.stack);
    // Return 200 with error details instead of 500 to not break frontend
    res.json({ 
      success: false, 
      error: error.message,
      message: 'User sync encountered an error but did not fail'
    });
  }
});

router.post('/elevenlabs-tts', async (req, res) => {
  try {
    console.log('🔊 ElevenLabs TTS request received');
    const { text, voiceId, modelId, voice_id } = req.body;
    console.log('🔊 TTS - Voice selection:', { voiceId, voice_id, textLength: text?.length });
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Route through Render backend ONLY when running locally (not on Render itself)
    // Check for Render-specific env var OR explicit production mode to avoid self-routing
    const isRunningOnRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;
    const isProduction = process.env.NODE_ENV === 'production';
    const shouldRouteToRender = !isRunningOnRender && !isProduction;
    
    if (shouldRouteToRender) {
      console.log('🔄 Local dev mode - routing ElevenLabs TTS through Render backend');
      
      try {
        const renderResponse = await fetch('https://neuraplay.onrender.com/api/elevenlabs-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceId: voiceId || voice_id,
            modelId: modelId || 'eleven_turbo_v2_5'
          })
        });
        
        if (renderResponse.ok) {
          // Stream the audio response directly to the client
          res.setHeader('Content-Type', 'audio/mpeg');
          renderResponse.body.pipe(res);
          return;
        } else {
          const errorText = await renderResponse.text();
          console.log('❌ Render backend TTS failed:', renderResponse.status, errorText);
          throw new Error(`Render TTS API returned ${renderResponse.status}: ${errorText}`);
        }
      } catch (proxyError) {
        console.log('❌ Failed to reach Render backend for TTS:', proxyError.message);
        return res.status(500).json({
          error: 'TTS service unavailable',
          details: proxyError.message
        });
      }
    }

    // Production mode - handle directly with environment variables
    console.log('🏭 Production mode - handling ElevenLabs TTS directly');
    
    const apiKey = process.env.VITE_ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('❌ ElevenLabs API key not found');
      return res.status(500).json({ error: 'TTS service not configured' });
    }
    
    const finalVoiceId = voiceId || voice_id || 'pNInz6obpgDQGcFmaJgB'; // Default to Adam voice
    console.log('🔊 ElevenLabs TTS request:', { text: text.substring(0, 50) + '...', voiceId: finalVoiceId });
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: modelId || 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ ElevenLabs API error:', error);
      return res.status(response.status).json({ error: 'TTS generation failed' });
    }
    
    // Stream the audio response directly to the client
    res.setHeader('Content-Type', 'audio/mpeg');
    response.body.pipe(res);
    
  } catch (error) {
    console.error('❌ TTS error:', error);
    res.status(500).json({ error: 'TTS service error' });
  }
});

// ==========================================
// 📚 COURSE STORAGE API - Permanent DB Storage
// ==========================================

// 🎯 FIX: Use shared databaseManager instead of creating separate pool
// This ensures courses use the same connection as the rest of the app
const getPool = async () => {
  const databaseManager = require('../server-src/config/database.cjs');
  
  // 🎯 CRITICAL: Initialize if not already done
  if (!databaseManager.initialized) {
    await databaseManager.initialize();
  }
  
  if (!databaseManager.postgres) {
    console.error('❌ Database not initialized! Courses will not persist.');
    throw new Error('Database connection not available');
  }
  
  return databaseManager.postgres;
};

// Initialize courses table
const initCoursesTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_courses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'custom',
      difficulty TEXT DEFAULT 'Beginner',
      course_data JSONB NOT NULL,
      progress_data JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Create index for faster user lookups
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON user_courses(user_id)
  `);
};

// GET /api/courses/:userId - Load all courses for a user (supports metadataOnly for fast loading)
router.get('/courses/:userId', async (req, res) => {
  const pool = await getPool();
  try {
    const { userId } = req.params;
    const { metadataOnly } = req.query;
    const startTime = Date.now();
    
    console.log(`📚 Loading courses for user: ${userId} (metadataOnly: ${!!metadataOnly})`);
    
    await initCoursesTable(pool);
    
    // 🚀 LAZY LOADING: If metadataOnly, select only essential columns (MUCH faster)
    const selectClause = metadataOnly 
      ? 'id, title, description, category, difficulty, updated_at'
      : '*';
    
    const result = await pool.query(
      `SELECT ${selectClause} FROM user_courses WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    
    // Transform DB rows to frontend format
    const courses = result.rows.map(row => {
      // For metadata-only, return lightweight object
      if (metadataOnly) {
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          difficulty: row.difficulty,
          lastAccessed: row.updated_at,
          // Placeholder indicating content exists
          hasGeneratedContent: true,
          estimatedMinutes: 30,
          sectionCount: 5 // Placeholder - actual count from full load
        };
      }
      
      // Full course load (original behavior)
      let courseData = row.course_data;
      if (typeof courseData === 'string') {
        try {
          courseData = JSON.parse(courseData);
        } catch (e) {
          console.warn('⚠️ Failed to parse course_data for:', row.id);
          courseData = {};
        }
      }
      
      let progressData = row.progress_data;
      if (typeof progressData === 'string') {
        try {
          progressData = JSON.parse(progressData);
        } catch (e) {
          progressData = {};
        }
      }
      
      const course = {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        difficulty: row.difficulty,
        ...courseData,
        progress: progressData
      };
      
      if (course.generatedCourse) {
        console.log(`📚 Course ${row.id} has generatedCourse with ${course.generatedCourse.sections?.length || 0} sections`);
      }
      
      return course;
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Loaded ${courses.length} courses in ${loadTime}ms (metadataOnly: ${!!metadataOnly})`);
    res.json({ success: true, courses });
    
  } catch (error) {
    console.error('❌ Failed to load courses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/courses/:userId/:courseId - Load a SINGLE full course (lazy load)
router.get('/courses/:userId/:courseId', async (req, res) => {
  const pool = await getPool();
  try {
    const { userId, courseId } = req.params;
    const startTime = Date.now();
    
    console.log(`📚 Loading full course: ${courseId} for user: ${userId}`);
    
    await initCoursesTable(pool);
    
    const result = await pool.query(
      'SELECT * FROM user_courses WHERE id = $1 AND user_id = $2',
      [courseId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    const row = result.rows[0];
    
    // Parse course data
    let courseData = row.course_data;
    if (typeof courseData === 'string') {
      try {
        courseData = JSON.parse(courseData);
      } catch (e) {
        console.warn('⚠️ Failed to parse course_data for:', row.id);
        courseData = {};
      }
    }
    
    let progressData = row.progress_data;
    if (typeof progressData === 'string') {
      try {
        progressData = JSON.parse(progressData);
      } catch (e) {
        progressData = {};
      }
    }
    
    const course = {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      ...courseData,
      progress: progressData
    };
    
    const loadTime = Date.now() - startTime;
    const sectionCount = course.generatedCourse?.sections?.length || 0;
    const chunkCount = course.generatedCourse?.sections?.reduce((acc, s) => acc + (s.chunks?.length || 0), 0) || 0;
    
    console.log(`✅ Full course loaded in ${loadTime}ms: ${sectionCount} sections, ${chunkCount} chunks`);
    res.json({ success: true, course });
    
  } catch (error) {
    console.error('❌ Failed to load full course:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/courses - Save a course
router.post('/courses', async (req, res) => {
  const pool = await getPool();
  try {
    const { userId, course } = req.body;
    
    if (!userId || !course) {
      return res.status(400).json({ success: false, error: 'userId and course required' });
    }
    
    console.log('📚 Saving course:', { userId, courseId: course.id, title: course.title });
    
    await initCoursesTable(pool);
    
    // Extract fields for indexing, store full data in JSONB
    const { id, title, description, category, difficulty, progress, ...restData } = course;
    
    await pool.query(`
      INSERT INTO user_courses (id, user_id, title, description, category, difficulty, course_data, progress_data, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        difficulty = EXCLUDED.difficulty,
        course_data = EXCLUDED.course_data,
        progress_data = EXCLUDED.progress_data,
        updated_at = NOW()
    `, [
      id,
      userId,
      title || 'Untitled Course',
      description || '',
      category || 'custom',
      difficulty || 'Beginner',
      JSON.stringify(restData),
      JSON.stringify(progress || {})
    ]);
    
    console.log('✅ Course saved successfully:', course.id);
    res.json({ success: true, courseId: course.id });
    
  } catch (error) {
    console.error('❌ Failed to save course:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/courses/:courseId/progress - Update course progress
router.put('/courses/:courseId/progress', async (req, res) => {
  const pool = await getPool();
  try {
    const { courseId } = req.params;
    const { userId, progress } = req.body;
    
    if (!userId || !progress) {
      return res.status(400).json({ success: false, error: 'userId and progress required' });
    }
    
    console.log('📊 Updating progress for course:', courseId);
    
    await initCoursesTable(pool);
    
    await pool.query(`
      UPDATE user_courses 
      SET progress_data = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
    `, [JSON.stringify(progress), courseId, userId]);
    
    console.log('✅ Progress updated for course:', courseId);
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Failed to update progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/courses/:courseId - Delete a course AND all related memories
router.delete('/courses/:courseId', async (req, res) => {
  const pool = await getPool();
  try {
    const { courseId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    console.log('🗑️ Deleting course:', courseId, 'for user:', userId);
    
    await initCoursesTable(pool);
    
    // 🎯 FIX: Delete course from user_courses table
    await pool.query(
      'DELETE FROM user_courses WHERE id = $1 AND user_id = $2',
      [courseId, userId]
    );
    
    // 🎯 FIX: Delete ALL related course memories from memory tables
    // Course memories use patterns: course_{courseId}_summary, course_{courseId}_section_X_chunk_Y
    const courseKeyPattern = `course_${courseId}_%`;
    const courseIdPattern = `%_course_${courseId}_%`;
    
    const memoryTables = [
      { table: 'user_memories', keyColumn: 'memory_key', userColumn: 'user_id' },
      { table: 'hnsw_vector_metadata', keyColumn: 'id', userColumn: 'user_id', useIdPattern: true },
      { table: 'vector_embeddings', keyColumn: 'memory_key', userColumn: 'user_id' },
      { table: 'semantic_embeddings', keyColumn: 'memory_key', userColumn: 'user_id' }
    ];
    
    let totalMemoriesDeleted = 0;
    
    for (const { table, keyColumn, userColumn, useIdPattern } of memoryTables) {
      try {
        // Check if table exists first
        const tableCheck = await pool.query(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
          [table]
        );
        
        if (tableCheck.rows[0].exists) {
          // Delete memories matching course pattern
          const pattern = useIdPattern ? courseIdPattern : courseKeyPattern;
          const deleteResult = await pool.query(
            `DELETE FROM ${table} WHERE ${userColumn} = $1 AND ${keyColumn} LIKE $2`,
            [userId, pattern]
          );
          
          if (deleteResult.rowCount > 0) {
            console.log(`  🧹 Deleted ${deleteResult.rowCount} memories from ${table}`);
            totalMemoriesDeleted += deleteResult.rowCount;
          }
        }
      } catch (tableError) {
        // Table might not exist, skip silently
        console.warn(`  ⚠️ Could not clean ${table}:`, tableError.message);
      }
    }
    
    console.log(`✅ Course deleted: ${courseId} (+ ${totalMemoriesDeleted} related memories)`);
    res.json({ success: true, memoriesDeleted: totalMemoriesDeleted });
    
  } catch (error) {
    console.error('❌ Failed to delete course:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export the router and the pending transcriptions map
module.exports = {
  router,
  pendingTranscriptions
};

