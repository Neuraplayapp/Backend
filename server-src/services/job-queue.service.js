// Background Job Queue Service using Redis
const Bull = require('bull');
const logger = require('../utils/logger');

class JobQueueService {
  constructor() {
    this.queues = new Map();
    this.processors = new Map();
    this.redisConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
      }
    };
    
    this.initializeQueues();
  }

  async initialize() {
    // Alias for compatibility with app.js
    return this.initializeQueues();
  }

  initializeQueues() {
    // Define different queues for different types of jobs
    const queueConfigs = {
      'agent-execution': {
        concurrency: 5,
        attempts: 3,
        backoff: 'exponential',
        delay: 2000
      },
      'tool-execution': {
        concurrency: 10,
        attempts: 2,
        backoff: 'linear',
        delay: 1000
      },
      'context-processing': {
        concurrency: 3,
        attempts: 1,
        backoff: 'fixed',
        delay: 5000
      },
      'cleanup': {
        concurrency: 1,
        attempts: 1,
        backoff: 'fixed',
        delay: 0
      },
      'analytics': {
        concurrency: 2,
        attempts: 1,
        backoff: 'fixed',
        delay: 0
      }
    };

    Object.entries(queueConfigs).forEach(([name, config]) => {
      try {
        const queue = new Bull(name, this.redisConfig);
        
        // Set up default job options
        queue.defaultJobOptions = {
          removeOnComplete: 50, // Keep last 50 completed jobs
          removeOnFail: 20,     // Keep last 20 failed jobs
          attempts: config.attempts,
          backoff: {
            type: config.backoff,
            delay: config.delay
          }
        };

        // Set up event listeners
        this.setupQueueEventListeners(queue, name);
        
        this.queues.set(name, queue);
        
        logger.info(`Job queue initialized: ${name}`, { 
          concurrency: config.concurrency,
          attempts: config.attempts 
        });
        
      } catch (error) {
        logger.error(`Failed to initialize queue: ${name}`, { error });
      }
    });

    // Register job processors
    this.registerProcessors();
  }

  setupQueueEventListeners(queue, queueName) {
    queue.on('completed', (job, result) => {
      logger.info('Job completed', {
        queue: queueName,
        jobId: job.id,
        type: job.data.type,
        duration: Date.now() - job.timestamp
      });
    });

    queue.on('failed', (job, error) => {
      logger.error('Job failed', {
        queue: queueName,
        jobId: job.id,
        type: job.data.type,
        error,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts
      });
    });

    queue.on('stalled', (job) => {
      logger.warn('Job stalled', {
        queue: queueName,
        jobId: job.id,
        type: job.data.type
      });
    });

    queue.on('waiting', (jobId) => {
      logger.debug('Job waiting', {
        queue: queueName,
        jobId
      });
    });
  }

  registerProcessors() {
    // Agent execution processor
    this.registerProcessor('agent-execution', async (job) => {
      const { sessionId, goal, constraints } = job.data;
      
      logger.info('Processing agent execution job', { sessionId, goal });
      
      // This would call your agent service
      const agentService = require('./agent.service');
      const result = await agentService.executeGoal(sessionId, goal);
      
      return result;
    });

    // Tool execution processor
    this.registerProcessor('tool-execution', async (job) => {
      const { toolName, parameters, sessionId, userId } = job.data;
      
      logger.info('Processing tool execution job', { toolName, sessionId });
      
      const toolService = require('./tool.service');
      const result = await toolService.executeTool({
        toolName,
        parameters,
        sessionId,
        userId
      });
      
      return result;
    });

    // Context processing processor
    this.registerProcessor('context-processing', async (job) => {
      const { sessionId, contextData, operation } = job.data;
      
      logger.info('Processing context job', { sessionId, operation });
      
      switch (operation) {
        case 'generate_embeddings':
          return await this.generateEmbeddings(contextData);
        case 'semantic_index':
          return await this.updateSemanticIndex(sessionId, contextData);
        case 'context_cleanup':
          return await this.cleanupOldContext(sessionId);
        default:
          throw new Error(`Unknown context operation: ${operation}`);
      }
    });

    // Cleanup processor
    this.registerProcessor('cleanup', async (job) => {
      const { type, olderThan } = job.data;
      
      logger.info('Processing cleanup job', { type, olderThan });
      
      switch (type) {
        case 'expired_sessions':
          const sessionService = require('./session.service');
          return await sessionService.cleanupExpiredSessions();
        case 'old_executions':
          return await this.cleanupOldExecutions(olderThan);
        case 'cache_cleanup':
          return await this.cleanupCache();
        default:
          throw new Error(`Unknown cleanup type: ${type}`);
      }
    });

    // Analytics processor
    this.registerProcessor('analytics', async (job) => {
      const { type, timeRange, userId } = job.data;
      
      logger.info('Processing analytics job', { type, timeRange });
      
      switch (type) {
        case 'user_session_analytics':
          const sessionService = require('./session.service');
          return await sessionService.getUserSessionAnalytics(userId, timeRange);
        case 'tool_performance':
          const toolService = require('./tool.service');
          return await toolService.getToolAnalytics({ userId, timeRange });
        default:
          throw new Error(`Unknown analytics type: ${type}`);
      }
    });
  }

  registerProcessor(queueName, processor) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    queue.process(processor);
    this.processors.set(queueName, processor);
    
    logger.debug(`Processor registered for queue: ${queueName}`);
  }

  // Public methods to add jobs
  async executeAgentGoal(sessionId, goal, constraints = {}, options = {}) {
    const queue = this.queues.get('agent-execution');
    
    const job = await queue.add('agent-goal', {
      type: 'agent-goal',
      sessionId,
      goal,
      constraints,
      timestamp: Date.now()
    }, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      ...options
    });

    logger.info('Agent execution job queued', { 
      jobId: job.id, 
      sessionId, 
      goal: goal.substring(0, 100) 
    });

    return job;
  }

  async executeTool(toolName, parameters, sessionId, userId, options = {}) {
    const queue = this.queues.get('tool-execution');
    
    const job = await queue.add('tool-execution', {
      type: 'tool-execution',
      toolName,
      parameters,
      sessionId,
      userId,
      timestamp: Date.now()
    }, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      ...options
    });

    logger.info('Tool execution job queued', { 
      jobId: job.id, 
      toolName, 
      sessionId 
    });

    return job;
  }

  async processContext(sessionId, contextData, operation, options = {}) {
    const queue = this.queues.get('context-processing');
    
    const job = await queue.add('context-processing', {
      type: 'context-processing',
      sessionId,
      contextData,
      operation,
      timestamp: Date.now()
    }, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      ...options
    });

    logger.info('Context processing job queued', { 
      jobId: job.id, 
      sessionId, 
      operation 
    });

    return job;
  }

  async scheduleCleanup(type, olderThan = null, options = {}) {
    const queue = this.queues.get('cleanup');
    
    const job = await queue.add('cleanup', {
      type: 'cleanup',
      cleanupType: type,
      olderThan,
      timestamp: Date.now()
    }, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      ...options
    });

    logger.info('Cleanup job queued', { 
      jobId: job.id, 
      type 
    });

    return job;
  }

  async generateAnalytics(type, userId = null, timeRange = '24h', options = {}) {
    const queue = this.queues.get('analytics');
    
    const job = await queue.add('analytics', {
      type: 'analytics',
      analyticsType: type,
      userId,
      timeRange,
      timestamp: Date.now()
    }, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      ...options
    });

    logger.info('Analytics job queued', { 
      jobId: job.id, 
      type, 
      timeRange 
    });

    return job;
  }

  // Job monitoring and management
  async getJobStatus(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return {
      id: job.id,
      data: job.data,
      progress: job.progress(),
      state: await job.getState(),
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      attempts: job.attemptsMade,
      failedReason: job.failedReason
    };
  }

  async getQueueStats(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ]);

    return {
      queueName,
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length
      },
      processing: active.map(job => ({
        id: job.id,
        type: job.data.type,
        startedAt: new Date(job.processedOn)
      }))
    };
  }

  async getAllQueueStats() {
    const stats = {};
    
    for (const queueName of this.queues.keys()) {
      try {
        stats[queueName] = await this.getQueueStats(queueName);
      } catch (error) {
        logger.error(`Failed to get stats for queue: ${queueName}`, { error });
        stats[queueName] = { error: error.message };
      }
    }
    
    return stats;
  }

  // Helper methods for processors
  async generateEmbeddings(contextData) {
    // This would integrate with your embedding service
    logger.debug('Generating embeddings for context data');
    
    // Mock implementation
    return {
      embeddings: new Array(768).fill(0).map(() => Math.random()), // 768 dims for nomic model
      processed: true,
      timestamp: Date.now()
    };
  }

  async updateSemanticIndex(sessionId, contextData) {
    // This would update your vector database
    logger.debug('Updating semantic index', { sessionId });
    
    return {
      indexed: true,
      sessionId,
      timestamp: Date.now()
    };
  }

  async cleanupOldContext(sessionId) {
    // This would cleanup old context data
    logger.debug('Cleaning up old context', { sessionId });
    
    return {
      cleaned: true,
      sessionId,
      timestamp: Date.now()
    };
  }

  async cleanupOldExecutions(olderThan) {
    // This would cleanup old execution records
    logger.debug('Cleaning up old executions', { olderThan });
    
    return {
      cleaned: true,
      olderThan,
      timestamp: Date.now()
    };
  }

  async cleanupCache() {
    // This would cleanup cache data
    logger.debug('Cleaning up cache');
    
    return {
      cleaned: true,
      timestamp: Date.now()
    };
  }

  // Shutdown gracefully
  async shutdown() {
    logger.info('Shutting down job queues...');
    
    const shutdownPromises = Array.from(this.queues.values()).map(queue => 
      queue.close()
    );
    
    await Promise.all(shutdownPromises);
    logger.info('All job queues shut down');
  }
}

module.exports = new JobQueueService();
