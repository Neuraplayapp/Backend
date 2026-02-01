// Production Logging System for NeuraPlay AI Platform
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  http: 'magenta',
  verbose: 'white',
  debug: 'green',
  silly: 'grey'
};

winston.addColors(logColors);

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return log;
  })
);

// File rotation configuration
const dailyRotateConfig = {
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
};

// Create transports
const transports = [
  // Console logging (always enabled in development)
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    level: process.env.LOG_LEVEL || 'info'
  }),

  // Daily rotating file for all logs
  new DailyRotateFile({
    ...dailyRotateConfig,
    filename: path.join(logsDir, 'app-%DATE%.log'),
    level: 'info'
  }),

  // Daily rotating file for error logs only
  new DailyRotateFile({
    ...dailyRotateConfig,
    filename: path.join(logsDir, 'error-%DATE%.log'),
    level: 'error'
  }),

  // Daily rotating file for AI-specific logs
  new DailyRotateFile({
    ...dailyRotateConfig,
    filename: path.join(logsDir, 'ai-%DATE%.log'),
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format((info) => {
        // Only log AI-related messages
        if (info.service && info.service.includes('ai')) {
          return info;
        }
        return false; // Winston will ignore this log entry
      })()
    )
  })
];

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new DailyRotateFile({
    ...dailyRotateConfig,
    filename: path.join(logsDir, 'exceptions-%DATE%.log')
  })
);

logger.rejections.handle(
  new DailyRotateFile({
    ...dailyRotateConfig,
    filename: path.join(logsDir, 'rejections-%DATE%.log')
  })
);

// Custom logging methods for specific services
logger.ai = (message, metadata = {}) => {
  logger.info(message, { service: 'ai-router', ...metadata });
};

logger.canvas = (message, metadata = {}) => {
  logger.info(message, { service: 'canvas-workspace', ...metadata });
};

logger.safety = (message, metadata = {}) => {
  logger.warn(message, { service: 'safety-service', ...metadata });
};

logger.database = (message, metadata = {}) => {
  logger.info(message, { service: 'database', ...metadata });
};

logger.auth = (message, metadata = {}) => {
  logger.info(message, { service: 'auth', ...metadata });
};

logger.performance = (message, metadata = {}) => {
  logger.info(message, { service: 'performance', ...metadata });
};

logger.security = (message, metadata = {}) => {
  logger.warn(message, { service: 'security', ...metadata });
};

// Request logging middleware
logger.requestMiddleware = (req, res, next) => {
      const start = Date.now();
      
  // Log request
  logger.http(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
        userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    sessionId: req.sessionID
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'http';
    
    logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, {
      duration,
      status: res.statusCode,
      contentLength: res.get('Content-Length'),
      ip: req.ip,
      userId: req.user?.id,
      sessionId: req.sessionID
    });
  });
      
      next();
    };

// Error logging middleware
logger.errorMiddleware = (err, req, res, next) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    sessionId: req.sessionID
  });

  next(err);
};

// Clean up old log files periodically
const cleanupOldLogs = () => {
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  const now = Date.now();

  try {
    const files = fs.readdirSync(logsDir);
      files.forEach(file => {
      const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
      if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
        logger.info(`Cleaned up old log file: ${file}`);
        }
      });
    } catch (error) {
    logger.error('Error cleaning up old logs:', error);
  }
};

// Run cleanup on startup and then daily
cleanupOldLogs();
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000); // Daily

// Production startup log
logger.info('NeuraPlay AI Platform Logger initialized', {
  environment: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL || 'info',
  logsDirectory: logsDir,
  pid: process.pid
});

module.exports = logger;