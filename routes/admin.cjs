/**
 * 🔐 ADMIN API ROUTES
 * Protected routes for memory management and debugging
 * 
 * Requires X-Admin-Key header matching ADMIN_API_KEY env var
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Create dedicated pool for admin routes
let adminPool = null;
const getDatabase = () => {
  if (!adminPool) {
    const dbUrl = process.env.RENDER_POSTGRES_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('❌ No database URL found for admin routes');
      return null;
    }
    adminPool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 5
    });
    console.log('✅ Admin routes: Database pool created');
  }
  return adminPool;
};

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = req.headers['x-admin-key'];
  
  if (!adminKey) {
    console.warn('⚠️ ADMIN_API_KEY not set in environment');
    return res.status(500).json({ error: 'Admin API not configured' });
  }
  
  if (providedKey !== adminKey) {
    console.warn('🚫 Unauthorized admin access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

router.use(adminAuth);

/**
 * GET /api/admin/memories
 * List memories with optional filtering
 */
router.get('/memories', async (req, res) => {
  try {
    const { userId, search, limit = 100 } = req.query;
    const pool = getDatabase();
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    let query = 'SELECT id, user_id, memory_key, content, context, created_at FROM user_memories WHERE 1=1';
    const params = [];
    
    if (userId) {
      params.push(userId);
      query += ` AND user_id = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (memory_key ILIKE $${params.length} OR content ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      count: result.rows.length,
      memories: result.rows
    });
  } catch (error) {
    console.error('❌ Admin memories list error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/memories/:id
 * Delete a single memory by ID
 */
router.delete('/memories/:id', async (req, res) => {
  try {
    const pool = getDatabase();
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    const result = await pool.query(
      'DELETE FROM user_memories WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    res.json({
      success: true,
      deleted: result.rowCount > 0
    });
  } catch (error) {
    console.error('❌ Admin memory delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/memories/bulk-delete
 * Delete memories matching a pattern
 */
router.post('/memories/bulk-delete', async (req, res) => {
  try {
    const { pattern, userId, deleteAll } = req.body;
    const pool = getDatabase();
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    let result;
    
    if (deleteAll === true) {
      // ⚠️ DELETE ALL MEMORIES
      console.log('🗑️ ADMIN: Deleting ALL memories');
      result = await pool.query('DELETE FROM user_memories RETURNING id');
    } else if (userId && pattern) {
      // Delete by pattern for specific user
      console.log(`🗑️ ADMIN: Deleting memories matching "${pattern}" for user ${userId}`);
      result = await pool.query(
        'DELETE FROM user_memories WHERE user_id = $1 AND (content ILIKE $2 OR memory_key ILIKE $2) RETURNING id',
        [userId, `%${pattern}%`]
      );
    } else if (pattern) {
      // Delete by pattern for all users
      console.log(`🗑️ ADMIN: Deleting memories matching "${pattern}" for ALL users`);
      result = await pool.query(
        'DELETE FROM user_memories WHERE content ILIKE $1 OR memory_key ILIKE $1 RETURNING id',
        [`%${pattern}%`]
      );
    } else {
      return res.status(400).json({ error: 'Provide pattern, userId+pattern, or deleteAll:true' });
    }
    
    console.log(`✅ ADMIN: Deleted ${result.rowCount} memories`);
    
    res.json({
      success: true,
      deleted: result.rowCount
    });
  } catch (error) {
    console.error('❌ Admin bulk delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/memories/nuke-all
 * ⚠️ DANGER: Delete ALL memories from ALL tables
 */
router.post('/memories/nuke-all', async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'YES_DELETE_EVERYTHING') {
      return res.status(400).json({ 
        error: 'Must confirm with {"confirm": "YES_DELETE_EVERYTHING"}' 
      });
    }
    
    const pool = getDatabase();
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    console.log('🔥 ADMIN: NUKING ALL MEMORIES');
    
    const tables = [
      // Core memory tables
      'user_memories',
      
      // Vector/embedding tables - CRITICAL for semantic search
      'vector_embeddings',
      'semantic_embeddings',
      'hnsw_vector_metadata',
      
      // Knowledge and context tables
      'cross_chat_knowledge',
      'episodic_memories',
      'semantic_memories',
      
      // Canvas and document tables
      'canvas_documents',
      'canvas_preferences',
      
      // Behavioral and analytics tables
      'user_behavior_patterns',
      'npu_analyses'
    ];
    
    const results = {};
    
    for (const table of tables) {
      try {
        const result = await pool.query(`DELETE FROM ${table} RETURNING id`);
        results[table] = result.rowCount;
        console.log(`✅ Deleted ${result.rowCount} from ${table}`);
      } catch (tableError) {
        results[table] = `Error: ${tableError.message}`;
      }
    }
    
    res.json({
      success: true,
      message: 'All memories nuked',
      results
    });
  } catch (error) {
    console.error('❌ Admin nuke error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/courses/clear
 * ⚠️ Clear all courses from database
 */
router.post('/courses/clear', async (req, res) => {
  try {
    const { userId, confirm } = req.body;
    const pool = getDatabase();
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    if (confirm !== 'YES_CLEAR_COURSES') {
      return res.status(400).json({ 
        error: 'Must confirm with {"confirm": "YES_CLEAR_COURSES"}' 
      });
    }
    
    let result;
    
    if (userId) {
      console.log(`🗑️ ADMIN: Clearing courses for user ${userId}`);
      result = await pool.query(
        'DELETE FROM user_courses WHERE user_id = $1 RETURNING id',
        [userId]
      );
    } else {
      console.log('🗑️ ADMIN: Clearing ALL courses for ALL users');
      result = await pool.query('DELETE FROM user_courses RETURNING id');
    }
    
    console.log(`✅ ADMIN: Deleted ${result.rowCount} courses`);
    
    res.json({
      success: true,
      deleted: result.rowCount,
      message: userId 
        ? `Cleared ${result.rowCount} courses for user ${userId}`
        : `Cleared ${result.rowCount} courses for all users`
    });
  } catch (error) {
    console.error('❌ Admin courses clear error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/nuke-all-user-data
 * ⚠️ DANGER: Delete ALL user data - memories, courses, canvas, everything
 */
router.post('/nuke-all-user-data', async (req, res) => {
  try {
    const { confirm, userId } = req.body;
    
    if (confirm !== 'YES_DELETE_ALL_USER_DATA') {
      return res.status(400).json({ 
        error: 'Must confirm with {"confirm": "YES_DELETE_ALL_USER_DATA"}',
        optional: 'Add "userId": "xxx" to delete for specific user only'
      });
    }
    
    const pool = getDatabase();
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    console.log(userId 
      ? `🔥 ADMIN: NUKING ALL DATA for user ${userId}` 
      : '🔥 ADMIN: NUKING ALL DATA for ALL users');
    
    const tables = [
      // Core memory tables
      'user_memories',
      'user_courses',
      
      // Vector/embedding tables - CRITICAL for semantic search
      'vector_embeddings',
      'semantic_embeddings',
      'hnsw_vector_metadata',
      
      // Knowledge and context tables
      'cross_chat_knowledge',
      'episodic_memories',
      'semantic_memories',
      
      // Canvas and document tables
      'canvas_documents',
      'canvas_preferences',
      
      // Behavioral and analytics tables
      'user_behavior_patterns',
      'npu_analyses',
      'learning_moments',
      'emotional_states',
      'quiz_results',
      
      // Conversation data (optional - has canvas elements too)
      'conversations',
      'chat_tabs'
    ];
    
    const results = {};
    
    for (const table of tables) {
      try {
        let result;
        if (userId) {
          result = await pool.query(`DELETE FROM ${table} WHERE user_id = $1 RETURNING id`, [userId]);
        } else {
          result = await pool.query(`DELETE FROM ${table} RETURNING id`);
        }
        results[table] = result.rowCount;
        console.log(`✅ Deleted ${result.rowCount} from ${table}`);
      } catch (tableError) {
        // Table might not exist or have different schema
        results[table] = `Skipped: ${tableError.message.split('\n')[0]}`;
      }
    }
    
    res.json({
      success: true,
      message: userId 
        ? `All data nuked for user ${userId}`
        : 'All user data nuked for all users',
      results,
      note: 'User must also clear browser localStorage for complete cleanup'
    });
  } catch (error) {
    console.error('❌ Admin nuke all error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/stats
 * Get memory statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const pool = getDatabase();
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    const stats = {};
    
    const tables = ['user_memories', 'user_courses', 'hnsw_vector_metadata'];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = parseInt(result.rows[0].count);
      } catch (e) {
        stats[table] = 'N/A';
      }
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

