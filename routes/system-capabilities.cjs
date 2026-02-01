/**
 * 🔧 SYSTEM CAPABILITIES API
 * 
 * Provides information about available services and performance characteristics
 * Used by tests and monitoring to check system status
 */

const express = require('express');
const router = express.Router();

// System capabilities endpoint
router.get('/capabilities', async (req, res) => {
  try {
    console.log('🔧 System capabilities request');
    
    const capabilities = {
      platform: 'NeuraPlay AI Platform',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      
      // Vector Search Capabilities
      vectorSearch: {
        hnsw: false,
        vector: true,
        text: true,
        fallback: true,
        performance: 'Standard PostgreSQL vector search'
      },
      
      // Canvas Capabilities
      canvas: {
        codeCanvas: true,
        chartCanvas: true,
        documentCanvas: true,
        interactiveElements: true
      },
      
      // Memory Capabilities
      memory: {
        userMemories: true,
        crossChatKnowledge: true,
        assistantMemory: true,
        semanticSearch: true,
        persistentStorage: true
      },
      
      // Assistant Capabilities
      assistants: {
        smallAssistant: true,
        fullAssistant: true,
        contextAware: true,
        memoryIntegration: true
      }
    };

    // Try to check HNSW availability
    try {
      // Import using proper path resolution
      const path = require('path');
      const hnswPath = path.join(__dirname, '..', 'server-src', 'hnsw-services', 'HNSWVectorSearchService.cjs');
      const coreIntegrationPath = path.join(__dirname, '..', 'server-src', 'hnsw-services', 'HNSWCoreIntegration.cjs');
      
      const { hnswVectorSearchService } = require(hnswPath);
      const { hnswCoreIntegration } = require(coreIntegrationPath);
      
      if (hnswVectorSearchService && hnswVectorSearchService.isAvailable()) {
        capabilities.vectorSearch.hnsw = true;
        capabilities.vectorSearch.performance = '🚀 HNSW (50-100x faster)';
        
        // Get HNSW performance stats if available
        if (hnswCoreIntegration) {
          const stats = hnswCoreIntegration.getPerformanceStats();
          capabilities.vectorSearch.hnswStats = stats;
        }
      }
    } catch (hnswError) {
      console.warn('⚠️ HNSW service not available:', hnswError.message);
      capabilities.vectorSearch.hnswError = hnswError.message;
    }

    // Try to check vector search service
    try {
      const path = require('path');
      const vectorSearchPath = path.join(__dirname, '..', 'src', 'services', 'VectorSearchService.ts');
      const { vectorSearchService } = require(vectorSearchPath);
      
      if (vectorSearchService) {
        const searchCapabilities = vectorSearchService.getSearchCapabilities();
        capabilities.vectorSearch = {
          ...capabilities.vectorSearch,
          ...searchCapabilities
        };
      }
    } catch (vectorError) {
      console.warn('⚠️ Vector search service not available:', vectorError.message);
      capabilities.vectorSearch.vectorError = vectorError.message;
    }

    // Check database status
    try {
      const { getDatabaseStatus } = require('../services/database.cjs');
      const dbStatus = getDatabaseStatus();
      capabilities.database = {
        available: dbStatus.available,
        status: dbStatus.status,
        postgresConnected: dbStatus.postgresConnected
      };
    } catch (dbError) {
      console.warn('⚠️ Database status check failed:', dbError.message);
      capabilities.database = {
        available: false,
        error: dbError.message
      };
    }

    // Check service container status
    try {
      const { serviceContainer } = require('../src/services/ServiceContainer');
      
      if (serviceContainer) {
        const services = serviceContainer.getRegisteredServices();
        capabilities.services = {
          registered: services.length,
          available: services
        };
      }
    } catch (serviceError) {
      console.warn('⚠️ Service container check failed:', serviceError.message);
      capabilities.services = {
        error: serviceError.message
      };
    }

    res.json(capabilities);
    
  } catch (error) {
    console.error('❌ System capabilities error:', error);
    res.status(500).json({
      error: 'Failed to get system capabilities',
      message: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0'
  });
});

// Performance metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    // Add HNSW metrics if available
    try {
      const { hnswCoreIntegration } = require('../server-src/hnsw-services/HNSWCoreIntegration.cjs');
      if (hnswCoreIntegration) {
        metrics.hnsw = hnswCoreIntegration.getPerformanceStats();
      }
    } catch (hnswError) {
      // HNSW not available - that's okay
    }

    res.json(metrics);
    
  } catch (error) {
    console.error('❌ Performance metrics error:', error);
    res.status(500).json({
      error: 'Failed to get performance metrics',
      message: error.message
    });
  }
});

module.exports = router;
