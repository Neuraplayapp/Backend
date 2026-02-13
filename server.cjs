// NeuraPlay AI Platform - State-of-the-Art Enterprise Server
// Modular microservices orchestrator with enterprise-grade features

// Load environment configuration and set defaults

// Priority: .env file first (user's correct config), then development.env as fallback
require('dotenv').config(({ path: './.env' }));
require('dotenv').config(({ path: './development.env' }));
console.log('FACEBOOK_CLIENT_ID:', process.env.FACEBOOK_CLIENT_ID);
console.log('FACEBOOK_CLIENT_SECRET:', process.env.FACEBOOK_CLIENT_SECRET);
console.log('FACEBOOK_CALLBACK_URL:', process.env.FACEBOOK_CALLBACK_URL);
// try {
//   require('dotenv').config();
// } catch (error) {
//   console.log('💡 Tip: Install dotenv for local .env file support: npm install dotenv');
// }
console.log('🚀 Starting NeuraPlay Server...');

console.log('🔥 Fireworks API Key:', process.env.Neuraplay);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('❌ Stack trace:', reason?.stack || 'No stack trace available');
  // Don't exit, just log for debugging
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Stack trace:', error?.stack || 'No stack trace available');
  // Don't exit, just log for debugging
  // process.exit(1);
});

// Load development environment if in development mode
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  const fs = require('fs');
  const path = require('path');
  
  // Try to load development.env file
  const devEnvPath = path.join(__dirname, 'development.env');
  if (fs.existsSync(devEnvPath)) {
    console.log('🔧 Loading development.env file...');
    const envContent = fs.readFileSync(devEnvPath, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...values] = trimmedLine.split('=');
        const value = values.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    
    console.log('✅ Development environment loaded');
    console.log('🔍 Database URL set:', !!process.env.DATABASE_URL);
  } else {
    console.log('⚠️ No development.env file found');
  }
}

// Ensure NODE_ENV is set (fallback for missing cross-env)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
  console.log('🔧 NODE_ENV defaulted to production');
}

const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');
const passport = require('passport');
const session = require('express-session');

// Initialize Passport
require('./routes/auth.cjs'); // This will initialize the Google strategy

// ===== ENTERPRISE SERVER SETUP =====
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ===== MIDDLEWARE STACK =====
// Enable CORS for all routes (required for frontend POST pre-flight)
app.use(cors({ origin: true, credentials: true }));
// Remove problematic wildcard route
// app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ===== MODULAR ROUTE SYSTEM =====
console.log('🔗 Initializing modular route system...');

// Import route modules with consistent pattern
let authRoutes, apiRoutes, toolRoutes, canvasApiRoutes, visionRoutes, unifiedRouter, memoryRoutes, systemCapabilitiesRoutes, adminRoutes;
let initializeDatabase, handleDatabaseRequest, handleWebSocketConnections;

try {
  console.log('🔍 Loading routes...');
  authRoutes = require('./routes/auth.cjs');
  console.log('✅ auth.cjs loaded');
  apiRoutes = require('./routes/api.cjs');
  console.log('✅ api.cjs loaded');
  toolRoutes = require('./routes/tools.cjs');
  console.log('✅ tools.cjs loaded');
  canvasApiRoutes = require('./routes/canvas-api.cjs');
  console.log('✅ canvas-api.cjs loaded');
  visionRoutes = require('./routes/vision-route.cjs');
  console.log('✅ vision-route.cjs loaded');
  unifiedRouter = require('./routes/unified-route.cjs');
  console.log('✅ unified-route.cjs loaded');
  vectorApiRoutes = require('./routes/vector-api.cjs');
  console.log('✅ vector-api.cjs loaded');
  memoryRoutes = require('./server-src/routes/memory.cjs');
  console.log('✅ memory.cjs loaded');
  systemCapabilitiesRoutes = require('./routes/system-capabilities.cjs');
  console.log('✅ system-capabilities.cjs loaded');
  adminRoutes = require('./routes/admin.cjs');
  console.log('✅ admin.cjs loaded');

  // Import services
  console.log('🔍 Loading services...');
  const dbService = require('./services/database.cjs');
  initializeDatabase = dbService.initializeDatabase;
  handleDatabaseRequest = dbService.handleDatabaseRequest;
  console.log('✅ database.cjs loaded');
  const wsService = require('./services/websockets.cjs');
  handleWebSocketConnections = wsService.handleWebSocketConnections;
  console.log('✅ websockets.cjs loaded');
  
  // Initialize WebSocket connections
  console.log('🔍 Initializing WebSocket connections...');
  handleWebSocketConnections(wss);
  console.log('✅ WebSocket connections initialized');
} catch (routeError) {
  console.error('❌ Failed to load routes/services:', routeError.message);
  console.error('Full error:', routeError);
  process.exit(1);
}

// === UNIFIED ROUTE REGISTRATION - SINGLE SOURCE OF TRUTH ===
// Order matters: Most specific routes first, general routes last

// CRITICAL: Register specific routes BEFORE general /api routes
app.use('/api/auth', authRoutes.router);
app.use('/api/tools', toolRoutes);
app.use('/api/canvas', canvasApiRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/system', systemCapabilitiesRoutes);
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered at /api/admin');
app.use('/api/server-memory', memoryRoutes);
app.use('/api/unified-route', unifiedRouter);
console.log('✅ Unified route registered at /api/unified-route');

// Embeddings API - For local dev to forward embedding requests to production
const embeddingsRoutes = require('./routes/embeddings-route.cjs');
app.use('/api/embeddings', embeddingsRoutes);
console.log('✅ Embeddings API routes registered at /api/embeddings');

app.use('/api/vector', vectorApiRoutes);
console.log('✅ Vector API routes registered at /api/vector');

// ML Spaced Repetition API - Neural learning system
const mlSpacedRepetitionRoutes = require('./server-src/routes/ml-spaced-repetition.cjs');
app.use('/api/ml', mlSpacedRepetitionRoutes);
console.log('✅ ML Spaced Repetition routes registered at /api/ml');

// General API routes - MUST be last to avoid conflicts
app.use('/api', apiRoutes.router);
console.log('✅ General API routes registered at /api');

// DEBUG: Add comprehensive debugging endpoint
app.get('/api/debug-routing', (req, res) => {
  console.log('🔍 DEBUG-ROUTING: Direct server route accessed');
  res.json({
    success: true,
    message: 'Direct server route working',
    timestamp: new Date().toISOString(),
    middleware_order: [
      '1. /api/auth (authRoutes.router)',
      '2. /api/tools (toolRoutes)', 
      '3. /api/canvas (canvasApiRoutes)',
      '4. /api/unified-route (unified-route.cjs) ← FIXED: Specific path only ✅',
      '5. /api (apiRoutes.router) ← NOW REACHABLE ✅'
    ]
  });
});

// Database API endpoint
app.post('/api/database', handleDatabaseRequest);

// ===== REMOVED DUPLICATE TAB ROUTES =====
// Tab routes now handled by routes/api.cjs to avoid conflicts

// GET tabs route moved to routes/api.cjs

app.delete('/api/tabs/:tabId', async (req, res) => {
  try {
    const { tabId } = req.params;
    
    console.log('🗑️ Deleting tab:', tabId);
    
    const { deleteFromDatabase, getDatabaseStatus } = require('./services/database.cjs');
    const dbStatus = getDatabaseStatus();
    
    if (dbStatus.available && dbStatus.pool) {
      const client = await dbStatus.pool.connect();
      try {
        await deleteFromDatabase(client, 'chat_tabs', tabId);
        console.log('✅ Tab deleted from database:', tabId);
      } finally {
        client.release();
      }
    } else {
      console.log('📝 Database unavailable, skipping deletion');
    }
    
    res.json({ 
      success: true, 
      message: 'Tab deleted successfully' 
    });
    
  } catch (error) {
    console.error('❌ Tab delete error:', error);
    res.status(500).json({ error: 'Failed to delete tab' });
  }
});

// ===== REAL-TIME COMMUNICATION SERVICES =====

// Store pending transcriptions for webhook callbacks
const pendingTranscriptions = new Map();

// ===== REMOVED DUPLICATE ASSEMBLYAI ROUTES =====
// AssemblyAI routes now handled by routes/api.cjs to avoid conflicts

// ===== REMOVED DUPLICATE ASSEMBLYAI TRANSCRIBE ROUTE =====
// AssemblyAI transcription moved to routes/api.cjs
// Route removed - handled by routes/api.cjs

// ===== REMOVED DUPLICATE ELEVENLABS ROUTE =====
// ElevenLabs TTS moved to routes/api.cjs - route removed

// ===== DATABASE MANAGEMENT =====
let pool = null;
let databaseAvailable = false;

// Initialize PostgreSQL connection pool
let dbUrl = process.env.RENDER_POSTGRES_URL || process.env.DATABASE_URL;

// Check if database is explicitly disabled (legacy check)
if (dbUrl === 'disabled-use-render' || dbUrl === 'disabled') {
  console.log('🔇 Database connection explicitly disabled in environment');
  dbUrl = null;
}

console.log('🔍 Database connection check:', {
  RENDER_POSTGRES_URL: !!process.env.RENDER_POSTGRES_URL,
  DATABASE_URL: !!process.env.DATABASE_URL,
  finalUrl: !!dbUrl,
  nodeEnv: process.env.NODE_ENV,
  disabled: dbUrl === null
});

if (dbUrl) {
  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.POSTGRES_SSL === 'true' || dbUrl.includes('render.com') || dbUrl.includes('postgresql://') ? {
        rejectUnauthorized: false,
        require: true,
        ca: false
      } : false,
      max: 5, // Reduce from 50 to 5 for local development
      idleTimeoutMillis: 60000, // Increase to 60 seconds
      connectionTimeoutMillis: 10000, // Increase to 10 seconds
      acquireTimeoutMillis: 60000, // Add acquire timeout
    });
    console.log('🔗 PostgreSQL connection pool initialized');
    console.log('📍 Database URL:', dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Mask credentials
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL pool:', error.message);
    pool = null;
  }
    } else {
  console.error('❌ No database URL found in environment variables');
  console.log('💡 Expected: DATABASE_URL or RENDER_POSTGRES_URL');
  pool = null;
}

// Setup pgvector extension for semantic search
async function setupPgVector(client) {
  try {
    console.log('🔍 Checking pgvector extension...');
    
    // Check if pgvector extension exists
    const extensionCheck = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector';
    `);
    
    if (extensionCheck.rows.length > 0) {
      console.log('✅ pgvector extension is already installed');
      
      // Test vector operations
      try {
        await client.query('CREATE TEMPORARY TABLE test_vectors (id int, embedding vector(3))');
        await client.query("INSERT INTO test_vectors VALUES (1, '[1,2,3]'), (2, '[4,5,6]')");
        const vectorTest = await client.query(`
          SELECT id, embedding <-> '[1,1,1]' as distance 
          FROM test_vectors 
          ORDER BY distance LIMIT 1
        `);
        console.log('✅ Vector operations working - distance:', vectorTest.rows[0].distance);
        
        // Clean up test table
        await client.query('DROP TABLE test_vectors');
        
      } catch (testError) {
        console.warn('⚠️ Vector operation test failed:', testError.message);
      }
      
      // Install pg_trgm for text similarity functions
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
        console.log('✅ pg_trgm extension installed for text similarity');
        
        // Test text similarity function
        const simTest = await client.query("SELECT similarity('hello world', 'hello there') as similarity");
        console.log('✅ Text similarity working - similarity:', simTest.rows[0].similarity);
        
      } catch (trgmError) {
        console.warn('⚠️ pg_trgm extension installation failed:', trgmError.message);
        console.log('💡 Text similarity functions will not be available');
      }
      
      return true;
      
    } else {
      console.log('❌ pgvector extension not found, attempting installation...');
      
      try {
        // Try to install pgvector extension
        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log('✅ pgvector extension installed successfully');
        
        // Install pg_trgm for text similarity functions
        await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
        console.log('✅ pg_trgm extension installed successfully');
        
        // Test the newly installed extension
        await client.query('CREATE TEMPORARY TABLE test_vectors (id int, embedding vector(3))');
        await client.query("INSERT INTO test_vectors VALUES (1, '[1,2,3]')");
        console.log('✅ Vector extension verified working');
        
        return true;
        
      } catch (installError) {
        console.error('❌ Failed to install pgvector extension:', installError.message);
        console.log('💡 SOLUTION: Install pgvector manually:');
        console.log('   Docker: docker exec <container> psql -U postgres -d neuraplay -c "CREATE EXTENSION vector;"');
        console.log('   Local: Install pgvector from https://github.com/pgvector/pgvector');
        console.log('🔄 Falling back to basic text search (no semantic similarity)');
        
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during pgvector setup:', error.message);
    console.log('🔄 Continuing without vector search capabilities');
    return false;
  }
}

// Initialize database (non-blocking)
async function initDatabase() {
  if (!pool) {
    console.log('⚠️ No database connection configured');
    console.log('💡 To fix: Ensure DATABASE_URL is set in development.env');
    console.log('💡 Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/neuraplay');
    console.log('💡 Check PostgreSQL is running: pg_isready -h localhost -p 5432');
    return false;
  }
  
  try {
    console.log('🔍 Testing database connection...');
    const client = await pool.connect();
    
    // Test connection
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection established');
    console.log('📅 Database time:', result.rows[0].current_time);
    console.log('🗄️ PostgreSQL version:', result.rows[0].pg_version.split(' ')[0]);
    
    // Check and setup pgvector extension for semantic search
    await setupPgVector(client);
    
    // Create essential tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'learner',
        profile JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_tabs (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        messages JSONB DEFAULT '[]',
        mode VARCHAR(100) DEFAULT 'chat',
        canvasMode BOOLEAN DEFAULT FALSE,
        lastActive TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        context JSONB DEFAULT '{}'
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_logs (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        interaction_type VARCHAR(100) NOT NULL,
        input TEXT,
        output TEXT,
        tools_used JSONB DEFAULT '[]',
        response_time INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        session_id VARCHAR(255)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        token VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    client.release();
    databaseAvailable = true;
    console.log('✅ Database tables initialized');
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    console.log('📝 Continuing with limited functionality...');
    databaseAvailable = false;
    return false;
  }
}

// ===== REMOVED DUPLICATE HEALTH ROUTE =====
// Health check moved to routes/api.cjs - route removed

// ===== STATIC FILE SERVING =====
const distPath = path.join(__dirname, 'dist');
const fs = require('fs');

console.log('📁 Serving static files from:', distPath);

// Check if build exists
if (!fs.existsSync(distPath)) {
  console.error('❌ CRITICAL: dist directory does not exist!', distPath);
  console.error('❌ Run: npm run build:render');
      } else {
  console.log('✅ dist directory exists');
}

// Serve static files with caching
app.use(express.static(distPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true
}));

// SPA catch-all route (MUST BE LAST!)
app.get('/*', (req, res) => {
  // CRITICAL: Ensure API routes are never caught by SPA fallback
  if (req.path.startsWith('/api')) {
    console.error('❌ CRITICAL: API route caught by SPA fallback!', req.path);
    return res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      message: 'This API endpoint does not exist or is not properly registered'
    });
  }
  
  console.log('🔄 SPA route:', req.path);
  console.log('🔍 User-Agent:', req.headers['user-agent'] || 'none');
  
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('✅ Serving index.html successfully');
    res.sendFile(indexPath);
      } else {
    console.error('❌ CRITICAL: index.html not found at:', indexPath);
    console.error('📁 Dist directory exists:', fs.existsSync(distPath));
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NeuraPlay - Build Error</title>
        <style>
          body { font-family: Arial; margin: 40px; background: #1a1a1a; color: white; }
          .error { background: #ff4444; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>🚨 NeuraPlay Build Error</h1>
          <p>The application build is missing or incomplete.</p>
          <p>Please run: <code>npm run build:render</code></p>
          <p>Looking for: ${indexPath}</p>
        </div>
      </body>
      </html>
    `);
  }
});

// ===== WEBSOCKET SERVER =====
const elevenLabsConnections = new Map();

wss.on('connection', (ws) => {
  console.log('🔗 WebSocket client connected');
  const clientId = Math.random().toString(36).substring(7);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📥 WebSocket message:', data.type);
      
      switch (data.type) {
        case 'connect_elevenlabs':
          await handleElevenLabsConnection(ws, clientId);
          break;
          
        case 'audio_chunk':
          await handleAudioChunk(ws, clientId, data.audio);
          break;
          
        case 'tts_request':
          await handleTTSRequest(ws, data.text, data.voiceId, data.modelId);
          break;
          
        default:
          console.log('📥 Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('❌ WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket disconnected');
    const elevenLabsWs = elevenLabsConnections.get(clientId);
    if (elevenLabsWs) {
      elevenLabsWs.close();
      elevenLabsConnections.delete(clientId);
    }
  });
});

// ElevenLabs WebSocket handlers (implementation from your existing code)
async function handleElevenLabsConnection(clientWs, clientId) {
  try {
    const ElevenLabsWS = require('ws');
    const agentId = process.env.ELEVENLABS_AGENT_ID || 'agent_2201k13zjq5nf9faywz14701hyhb';
    const apiKey = process.env.VITE_ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key not found');
    }
    
    const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
    const elevenLabsWs = new ElevenLabsWS(wsUrl, {
      headers: { 'xi-api-key': apiKey }
    });
    
    elevenLabsWs.on('open', () => {
      console.log('✅ ElevenLabs connected');
      elevenLabsConnections.set(clientId, elevenLabsWs);
      
      elevenLabsWs.send(JSON.stringify({
        type: 'conversation_initiation_client_data',
        conversation_config_override: {
          agent: {
            prompt: { prompt: "You are a helpful AI assistant for NeuraPlay." },
            first_message: "Hi! I'm your AI assistant. How can I help you today?",
            language: "en"
          }
        }
      }));
      
      clientWs.send(JSON.stringify({
        type: 'elevenlabs_connected',
        message: 'Connected to ElevenLabs'
      }));
    });
    
    elevenLabsWs.on('message', (data) => {
      try {
        const response = JSON.parse(data);
        
        if (response.type === 'audio') {
          clientWs.send(JSON.stringify({
            type: 'audio_chunk',
            audio: response.audio_event?.audio_base_64
          }));
        } else if (response.type === 'agent_response') {
          clientWs.send(JSON.stringify({
            type: 'ai_response',
            text: response.agent_response_event?.agent_response
          }));
        } else if (response.type === 'ping') {
          elevenLabsWs.send(JSON.stringify({
            type: 'pong',
            event_id: response.ping_event?.event_id
          }));
        }
      } catch (error) {
        console.error('❌ ElevenLabs message error:', error);
      }
    });
    
    elevenLabsWs.on('error', (error) => {
      console.error('❌ ElevenLabs error:', error);
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'ElevenLabs connection error'
      }));
    });
    
  } catch (error) {
    console.error('❌ ElevenLabs connection failed:', error);
    clientWs.send(JSON.stringify({
      type: 'error',
      message: 'Failed to connect to ElevenLabs'
    }));
  }
}

async function handleAudioChunk(clientWs, clientId, audioBase64) {
    const elevenLabsWs = elevenLabsConnections.get(clientId);
    
  if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
    elevenLabsWs.send(JSON.stringify({
      user_audio_chunk: audioBase64
    }));
    
    clientWs.send(JSON.stringify({
      type: 'audio_ack',
      message: 'Audio chunk received'
    }));
  }
}

async function handleTTSRequest(clientWs, text, voiceId = '8LVfoRdkh4zgjr8v5ObE', modelId = 'eleven_turbo_v2_5') {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.VITE_ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });
    
    if (response.ok) {
    const audioBuffer = await response.buffer();
    const base64Audio = audioBuffer.toString('base64');
    
    clientWs.send(JSON.stringify({
      type: 'audio_chunk',
      audio: base64Audio
    }));
    }
  } catch (error) {
    console.error('❌ TTS error:', error);
  }
}

// ===== SERVER STARTUP =====
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Required for Render

// TEMPORARILY DISABLED: Initialize database (non-blocking)
console.log('🔄 Initializing database systems...');
initDatabase().catch(err => {
  console.log('⚠️ Database initialization failed, continuing with limited functionality');
  console.log('Error details:', err.message);
});

// Initialize the database service that sets databaseAvailable flag
initializeDatabase().then(async () => {
  console.log('✅ Database service initialization completed successfully');
  
  // 🚀 AUTO-BACKFILL: Automatically fix missing embeddings on startup
  try {
    const { pool } = require('./services/database.cjs');
    const dbPool = pool();
    
    if (dbPool) {
      const result = await dbPool.query(`
        SELECT COUNT(*) as missing_count
        FROM user_memories
        WHERE embedding IS NULL
        AND created_at < NOW() - INTERVAL '1 hour'
      `);
      
      const missingCount = parseInt(result.rows[0]?.missing_count || 0);
      
      if (missingCount > 0) {
        console.log(`🚨 Found ${missingCount} memories without embeddings - AUTO-BACKFILLING NOW...`);
        
        // Run backfill asynchronously (don't block server startup)
        const { backfillEmbeddings } = require('./scripts/backfill-embeddings.cjs');
        
        // Run in background
        setImmediate(async () => {
          try {
            await backfillEmbeddings();
            console.log('✅ Auto-backfill completed successfully!');
          } catch (backfillError) {
            console.error('❌ Auto-backfill failed:', backfillError.message);
            console.log('💡 You can manually run: node scripts/backfill-embeddings.cjs');
          }
        });
        
        console.log('✅ Backfill started in background - server will continue normally');
      } else {
        console.log(`✅ All memories have embeddings - pgvector search fully operational`);
      }
    }
  } catch (checkError) {
    console.log('⚠️ Could not check for missing embeddings:', checkError.message);
  }
}).catch(err => {
  console.log('⚠️ Database service initialization failed, using in-memory fallback');
  console.log('Error details:', err.message);
});

// 🚀 Initialize HNSW Vector Search System
(async () => {
  try {
    const path = require('path');
    const hnswCorePath = path.join(__dirname, 'server-src', 'hnsw-services', 'HNSWCoreIntegration.cjs');
    const { hnswCoreIntegration } = require(hnswCorePath);
    
    console.log('🚀 Initializing HNSW Vector Search System...');
    await hnswCoreIntegration.initialize();
    console.log('✅ HNSW Vector Search System initialized - ready for ultra-fast semantic search');
  } catch (hnswError) {
    console.log('⚠️ HNSW initialization skipped (will initialize on-demand):', hnswError.message);
  }
})();

server.listen(PORT, HOST, () => {
  console.log('🚀 NeuraPlay AI Platform Server Started');
  console.log(`🌐 Server: http://${HOST}:${PORT}`);
  console.log(`📁 Static files: ${distPath}`);
  console.log(`🔗 WebSocket: Ready`);
  console.log(`🗄️ Database: ${databaseAvailable ? 'Connected' : 'Limited Mode'}`);
  console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Platform: ${process.env.RENDER ? 'Render' : 'Local'}`);
  
  // ===== ROUTE VERIFICATION SYSTEM =====
  console.log('🔍 Starting route verification...');
  try {
    const { verifyServerRoutes } = require('./routes/route-verification.cjs');
    const verification = verifyServerRoutes(app);
    
    if (verification.success) {
      console.log('✅ Route verification passed - all critical routes registered');
    } else {
      console.log('⚠️ Route verification found issues - check logs above');
    }
  } catch (routeVerifyError) {
    console.log('⚠️ Route verification failed:', routeVerifyError.message);
  }
  
  console.log('✅ All systems operational');
  
  // Add debugging to see if server stays running
  console.log('🔍 DEBUG: Server callback completed, should stay running...');
  
  // Test if server is actually listening
  setTimeout(() => {
    console.log('🔍 DEBUG: Server still running after 2 seconds');
  }, 2000);
  
  setTimeout(() => {
    console.log('🔍 DEBUG: Server still running after 5 seconds');
  }, 5000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    if (pool) {
      pool.end(() => {
        console.log('✅ Database pool closed');
    process.exit(0);
  });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    if (pool) {
      pool.end(() => {
        console.log('✅ Database pool closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});