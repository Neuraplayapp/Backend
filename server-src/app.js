// Production-Ready Agentic AI Server Architecture
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Database and core services
const dbManager = require('./config/database');

// Services
const logger = require('./utils/logger');
const cacheService = require('./services/cache.service');
const jobQueueService = require('./services/job-queue.service');
const { handleWebSocketConnections } = require('../services/websockets.cjs');

// Routes
const agentRoutes = require('./routes/agent.routes');

// Middleware
const authMiddleware = require('./middleware/auth.middleware');
const rateLimitMiddleware = require('./middleware/rate-limit.middleware');
const validationMiddleware = require('./middleware/validation.middleware');
const errorMiddleware = require('./middleware/error.middleware');

class NeuraPlayServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    logger.info('🚀 Initializing NeuraPlay Agentic AI Server...');

    // Initialize all services with error handling
    try {
      await dbManager.initialize();
    } catch (error) {
      logger.warn('Database initialization partial failure - continuing in development mode', { error });
    }
    
    try {
      await cacheService.initialize();
    } catch (error) {
      logger.warn('Cache service initialization failed - using basic fallback', { error });
    }
    
    try {
      // Only initialize if the method exists
      if (jobQueueService && typeof jobQueueService.initialize === 'function') {
        await jobQueueService.initialize();
      } else {
        logger.info('Job queue service not available - running without background jobs');
      }
    } catch (error) {
      logger.warn('Job queue initialization failed - background jobs disabled', { error });
    }

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for development
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: true, // allow all origins; Render frontend is served from same host
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
    }));
    // Respond quickly to CORS pre-flight requests
    this.app.options('*', cors());

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(logger.requestMiddleware);
    this.app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

    // Request context middleware
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      res.setHeader('X-Request-ID', req.requestId);
      res.setHeader('X-Powered-By', 'NeuraPlay-AI');
      
      next();
    });

    // Rate limiting middleware
    this.app.use(rateLimitMiddleware.agentOperations);

    // Health check endpoint (before authentication)
    this.app.get('/health', async (req, res) => {
      try {
        const health = await dbManager.healthCheck();
        const cacheHealth = cacheService.healthCheck();
        const jobHealth = await jobQueueService.getAllQueueStats();
        const uptime = process.uptime();
        
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: {
            seconds: uptime,
            human: this.formatUptime(uptime)
          },
          services: {
            database: health,
            cache: cacheHealth,
            jobQueue: Object.keys(jobHealth).length > 0,
            logging: 'available'
          },
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        });
      } catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // API Routes
    this.app.use('/api/agent', agentRoutes);

    // Legacy routes compatibility (integrate with existing server.cjs routes)
    if (process.env.LEGACY_ROUTES === 'true') {
      await this.setupLegacyRoutes();
    }

    // Static file serving (for frontend)
    this.app.use(express.static(path.join(__dirname, '../dist')));

    // SPA fallback
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });

    // Global error handler
    this.app.use(errorMiddleware.handleError);
    this.app.use(logger.errorMiddleware);

    // 404 handler
    this.app.use(errorMiddleware.notFoundHandler);

    this.isInitialized = true;
    logger.info('✅ NeuraPlay Agentic AI Server initialized');
  }

  async setupLegacyRoutes() {
    console.log('🔄 Setting up legacy route compatibility...');
    
    try {
      // Import existing routes from the monolithic server
      const { router: authRoutes } = require('../routes/auth.cjs');
      const { router: apiRoutes } = require('../routes/api.cjs');
      const toolRoutes = require('../routes/tools.cjs');
      const unifiedRoute = require('../routes/unified-route.cjs');
      
      // Mount legacy routes - specific before general to avoid shadowing
      this.app.use('/api/unified-route', unifiedRoute); // critical must come first
      this.app.use('/api/auth', authRoutes);
      this.app.use('/api/tools', toolRoutes);
      this.app.use('/api', apiRoutes);
      
      console.log('✅ Legacy routes integrated');
    } catch (error) {
      console.warn('⚠️ Legacy routes not available:', error.message);
    }
  }

  async start(port = process.env.PORT || 3000) {
    await this.initialize();
    
    // Create HTTP server so we can attach WebSocket server
    const httpServer = http.createServer(this.app);

    // Attach WebSocket server with all custom handlers (ElevenLabs bridge, etc.)
    const wss = new WebSocket.Server({ server: httpServer });
    handleWebSocketConnections(wss);

    return new Promise((resolve, reject) => {
      this.server = httpServer.listen(port, '0.0.0.0', (error) => {
        if (error) {
          console.error('❌ Server failed to start:', error);
          reject(error);
        } else {
          console.log(`🌟 NeuraPlay Agentic AI Server running on port ${port}`);
          console.log(`📊 Database layers: ${this.getDbStatus()}`);
          console.log(`🔗 Health check: http://localhost:${port}/health`);
          console.log(`🤖 Agent API: http://localhost:${port}/api/agent`);
          resolve(this.server);
        }
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(async () => {
          await dbManager.close();
          console.log('🛑 Server stopped gracefully');
          resolve();
        });
      });
    }
  }

  getDbStatus() {
    const layers = [];
    if (dbManager.postgres) layers.push('PostgreSQL');
    if (dbManager.redis) layers.push('Redis');
    if (dbManager.vectorDb && dbManager.vectorDb !== 'fallback') layers.push('Vector');
    return layers.join(', ') || 'None';
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);
    
    return parts.join(' ') || '0s';
  }

  // Graceful shutdown
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close();
        }
        
        // Close database connections
        await dbManager.close();
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }
}

// Export singleton instance
const server = new NeuraPlayServer();
server.setupGracefulShutdown();

module.exports = server;
