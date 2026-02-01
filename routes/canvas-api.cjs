const express = require('express');
const router = express.Router();
const { EventEmitter } = require('events');

// In-memory storage for canvas data (replace with database in production)
const canvasSessions = new Map();
const canvasIterations = new Map();
const canvasElements = new Map();

class CanvasEventBus extends EventEmitter {}
const canvasEventBus = new CanvasEventBus();

// Chat Canvas Sessions
router.post('/sessions', async (req, res) => {
  try {
    const session = req.body;
    canvasSessions.set(session.chatId, {
      ...session,
      savedAt: new Date()
    });
    
    console.log(`✅ Canvas session saved for chat: ${session.chatId}`);
    res.json({ success: true, message: 'Session saved successfully' });
  } catch (error) {
    console.error('❌ Error saving canvas session:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

router.get('/sessions/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const session = canvasSessions.get(chatId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    console.log(`📋 Canvas session loaded for chat: ${chatId}`);
    res.json(session);
  } catch (error) {
    console.error('❌ Error loading canvas session:', error);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// Canvas Iterations
router.post('/iterations', async (req, res) => {
  try {
    const iteration = req.body;
    const chatId = iteration.chatId;
    
    // Store iteration
    if (!canvasIterations.has(chatId)) {
      canvasIterations.set(chatId, []);
    }
    
    const iterations = canvasIterations.get(chatId);
    
    // Remove existing iteration with same ID if updating
    const existingIndex = iterations.findIndex(iter => iter.id === iteration.id);
    if (existingIndex >= 0) {
      iterations[existingIndex] = { ...iteration, updatedAt: new Date() };
    } else {
      iterations.push({ ...iteration, createdAt: new Date() });
    }
    
    console.log(`📝 Canvas iteration saved for chat: ${chatId}, iteration: ${iteration.id}`);
    res.json({ success: true, message: 'Iteration saved successfully' });
  } catch (error) {
    console.error('❌ Error saving canvas iteration:', error);
    res.status(500).json({ error: 'Failed to save iteration' });
  }
});

router.get('/iterations/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const iterations = canvasIterations.get(chatId) || [];
    
    // Sort by creation date, newest first
    const sortedIterations = iterations.sort((a, b) => 
      new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
    );
    
    console.log(`📚 ${iterations.length} canvas iterations loaded for chat: ${chatId}`);
    res.json(sortedIterations);
  } catch (error) {
    console.error('❌ Error loading canvas iterations:', error);
    res.status(500).json({ error: 'Failed to load iterations' });
  }
});

// Canvas Elements
router.post('/elements', async (req, res) => {
  try {
    const elements = req.body;
    
    // Group elements by chatId
    const elementsByChat = {};
    elements.forEach(element => {
      if (!elementsByChat[element.chatId]) {
        elementsByChat[element.chatId] = [];
      }
      elementsByChat[element.chatId].push({
        ...element,
        savedAt: new Date()
      });
    });
    
    // Store elements
    Object.entries(elementsByChat).forEach(([chatId, chatElements]) => {
      canvasElements.set(chatId, chatElements);
      console.log(`🎨 ${chatElements.length} canvas elements saved for chat: ${chatId}`);
    });
    
    res.json({ success: true, message: 'Elements saved successfully' });
  } catch (error) {
    console.error('❌ Error saving canvas elements:', error);
    res.status(500).json({ error: 'Failed to save elements' });
  }
});

router.get('/elements/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const elements = canvasElements.get(chatId) || [];
    
    console.log(`🎨 ${elements.length} canvas elements loaded for chat: ${chatId}`);
    res.json(elements);
  } catch (error) {
    console.error('❌ Error loading canvas elements:', error);
    res.status(500).json({ error: 'Failed to load elements' });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    sessions: canvasSessions.size,
    iterations: Array.from(canvasIterations.values()).reduce((total, arr) => total + arr.length, 0),
    elements: Array.from(canvasElements.values()).reduce((total, arr) => total + arr.length, 0),
    timestamp: new Date()
  });
});

// Clear all data (for development)
router.delete('/clear', (req, res) => {
  canvasSessions.clear();
  canvasIterations.clear();
  canvasElements.clear();
  
  console.log('🗑️ All canvas data cleared');
  res.json({ success: true, message: 'All canvas data cleared' });
});

// ===== NEW RENDER ENDPOINT =====
router.post('/render', async (req, res) => {
  try {
    const { type, data = {}, chatId = 'default', position, size } = req.body || {};
    console.log(`🎨 /api/canvas/render → ${type}`);

    if (!type) return res.status(400).json({ success: false, error: 'Missing type' });

    let element;
    switch (type) {
      case 'chart':
        element = {
          id: `chart_${Date.now()}`,
          type: 'chart',
          content: {
            type: 'chart',
            title: data.title || 'Chart',
            chartType: data.chartType || data.type || 'bar',
            series: data.series || [],
            config: data.config || {},
            library: data.library || 'plotly'
          },
          position: position || { x: 100, y: 100 },
          size: size || { width: 600, height: 400 },
          style: {}
        };
        break;
      case 'document':
        element = {
          id: `doc_${Date.now()}`,
          type: 'text',
          content: {
            text: data.content || '',
            title: data.title || 'Document',
            metadata: data.metadata || {}
          },
          position: position || { x: 100, y: 100 },
          size: size || { width: 800, height: 600 },
          style: { backgroundColor: 'white', padding: 20 }
        };
        break;
      case 'code':
        element = {
          id: `code_${Date.now()}`,
          type: 'code',
          content: {
            code: data.code || '// no code',
            language: data.language || 'javascript'
          },
          position: position || { x: 100, y: 100 },
          size: size || { width: 700, height: 500 },
          style: {}
        };
        break;
      default:
        return res.status(400).json({ success: false, error: `Unknown type ${type}` });
    }

    if (!canvasElements.has(chatId)) canvasElements.set(chatId, []);
    canvasElements.get(chatId).push(element);
    canvasEventBus.emit('canvas-render', { chatId, element });

    res.json({ success: true, elementId: element.id, element });
  } catch (err) {
    console.error('Canvas render error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== SERVER-SENT EVENTS =====
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 30000);
  const onRender = (payload) => {
    res.write(`event: canvas-render\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  canvasEventBus.on('canvas-render', onRender);

  req.on('close', () => {
    clearInterval(heartbeat);
    canvasEventBus.off('canvas-render', onRender);
  });
});

// ===== CANVAS DOCUMENT SEARCH (VECTOR-BASED) =====
router.post('/search', async (req, res) => {
  try {
    const { query, userId, limit = 10 } = req.body;
    
    if (!query || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query and userId are required' 
      });
    }
    
    console.log(`🔍 Canvas search: "${query}" for user ${userId}`);
    
    // Initialize database manager
    const databaseManager = require('../server-src/config/database.cjs');
    if (!databaseManager.initialized) {
      await databaseManager.initialize();
    }
    
    // Search for canvas documents in the vector database
    const db = databaseManager.postgres;
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database not available' 
      });
    }
    
    // Search hnsw_vector_metadata for canvas documents
    const result = await db.query(`
      SELECT 
        vector_id as id,
        content,
        metadata,
        created_at,
        content_type
      FROM hnsw_vector_metadata
      WHERE user_id = $1 
        AND (
          content_type = 'canvas_document' 
          OR vector_id LIKE 'canvas_document_%'
          OR (metadata::text LIKE '%canvas_document%')
        )
        AND content ILIKE $2
      ORDER BY created_at DESC
      LIMIT $3
    `, [userId, `%${query}%`, limit]);
    
    const documents = result.rows.map(row => ({
      id: row.id,
      title: row.metadata?.title || 'Untitled Canvas',
      content: row.content,
      type: row.metadata?.canvasType || 'document',
      elementId: row.metadata?.elementId,
      conversationId: row.metadata?.conversationId,
      createdAt: row.created_at,
      metadata: row.metadata
    }));
    
    console.log(`✅ Found ${documents.length} canvas documents matching "${query}"`);
    
    res.json({
      success: true,
      documents,
      total: documents.length,
      query
    });
    
  } catch (error) {
    console.error('❌ Canvas search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== LIST ALL CANVAS DOCUMENTS =====
router.get('/documents/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    console.log(`📄 Listing canvas documents for user: ${userId}`);
    
    const databaseManager = require('../server-src/config/database.cjs');
    if (!databaseManager.initialized) {
      await databaseManager.initialize();
    }
    
    const db = databaseManager.postgres;
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database not available' 
      });
    }
    
    const result = await db.query(`
      SELECT 
        vector_id as id,
        content,
        metadata,
        created_at,
        content_type
      FROM hnsw_vector_metadata
      WHERE user_id = $1 
        AND (
          content_type = 'canvas_document' 
          OR vector_id LIKE 'canvas_document_%'
          OR (metadata::text LIKE '%canvas_document%')
        )
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    
    const documents = result.rows.map(row => ({
      id: row.id,
      title: row.metadata?.title || 'Untitled Canvas',
      preview: row.content?.substring(0, 200) + '...',
      type: row.metadata?.canvasType || 'document',
      elementId: row.metadata?.elementId,
      conversationId: row.metadata?.conversationId,
      createdAt: row.created_at
    }));
    
    console.log(`✅ Found ${documents.length} canvas documents for user ${userId}`);
    
    res.json({
      success: true,
      documents,
      total: documents.length
    });
    
  } catch (error) {
    console.error('❌ Error listing canvas documents:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// attach bus for importers that require it
router.canvasEventBus = canvasEventBus;

module.exports = router;
