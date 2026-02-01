// Centralized Logging System for NeuraPlay
// Provides different log levels to reduce verbose startup logs

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

export interface LogConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamps: boolean;
  services?: {
    [serviceName: string]: LogLevel;
  };
}

class Logger {
  private static instance: Logger;
  private config: LogConfig = {
    level: LogLevel.INFO, // Default to INFO level (reduces verbose logs)
    enableColors: true,
    enableTimestamps: false,
    services: {
      // Service-specific log levels
      'ServiceContainer': LogLevel.ERROR, // Only show errors
      'ConversationService': LogLevel.WARN, // Only warnings and errors
      'DatabaseManager': LogLevel.ERROR, // Only errors
      'IntentAnalysisService': LogLevel.WARN, // Reduce NPU verbosity
      'ChatHandler': LogLevel.INFO,
      'ToolRegistry': LogLevel.ERROR, // Only show registration errors
      'VectorSearchService': LogLevel.WARN,
      'APIService': LogLevel.INFO
    }
  };

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Set global log level
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  // Set log level for specific service
  setServiceLevel(serviceName: string, level: LogLevel): void {
    if (!this.config.services) {
      this.config.services = {};
    }
    this.config.services[serviceName] = level;
  }

  // Enable verbose logging for development
  enableVerbose(): void {
    this.config.level = LogLevel.VERBOSE;
  }

  // Enable production mode (minimal logging)
  enableProduction(): void {
    this.config.level = LogLevel.WARN;
    // Set all services to minimal logging
    Object.keys(this.config.services || {}).forEach(service => {
      this.config.services![service] = LogLevel.ERROR;
    });
  }

  private shouldLog(level: LogLevel, serviceName?: string): boolean {
    if (serviceName && this.config.services?.[serviceName] !== undefined) {
      return level <= this.config.services[serviceName];
    }
    return level <= this.config.level;
  }

  private formatMessage(level: LogLevel, message: string, serviceName?: string, data?: any): string {
    const timestamp = this.config.enableTimestamps ? `[${new Date().toISOString()}] ` : '';
    const service = serviceName ? `[${serviceName}] ` : '';
    
    let levelIcon = '';
    switch (level) {
      case LogLevel.ERROR:
        levelIcon = '❌';
        break;
      case LogLevel.WARN:
        levelIcon = '⚠️';
        break;
      case LogLevel.INFO:
        levelIcon = 'ℹ️';
        break;
      case LogLevel.DEBUG:
        levelIcon = '🔍';
        break;
      case LogLevel.VERBOSE:
        levelIcon = '📋';
        break;
    }

    const formattedMessage = `${timestamp}${levelIcon} ${service}${message}`;
    
    if (data && level <= LogLevel.DEBUG) {
      return `${formattedMessage} ${JSON.stringify(data, null, 2)}`;
    }
    
    return formattedMessage;
  }

  error(message: string, serviceName?: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR, serviceName)) {
      console.error(this.formatMessage(LogLevel.ERROR, message, serviceName, data));
    }
  }

  warn(message: string, serviceName?: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN, serviceName)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, serviceName, data));
    }
  }

  info(message: string, serviceName?: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO, serviceName)) {
      console.log(this.formatMessage(LogLevel.INFO, message, serviceName, data));
    }
  }

  debug(message: string, serviceName?: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG, serviceName)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, serviceName, data));
    }
  }

  verbose(message: string, serviceName?: string, data?: any): void {
    if (this.shouldLog(LogLevel.VERBOSE, serviceName)) {
      console.log(this.formatMessage(LogLevel.VERBOSE, message, serviceName, data));
    }
  }

  // Legacy compatibility methods (with emoji icons)
  success(message: string, serviceName?: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO, serviceName)) {
      const timestamp = this.config.enableTimestamps ? `[${new Date().toISOString()}] ` : '';
      const service = serviceName ? `[${serviceName}] ` : '';
      console.log(`${timestamp}✅ ${service}${message}`, data || '');
    }
  }

  loading(message: string, serviceName?: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG, serviceName)) {
      const timestamp = this.config.enableTimestamps ? `[${new Date().toISOString()}] ` : '';
      const service = serviceName ? `[${serviceName}] ` : '';
      console.log(`${timestamp}🔄 ${service}${message}`, data || '');
    }
  }

  database(message: string, serviceName?: string, data?: any): void {
    if (this.shouldLog(LogLevel.VERBOSE, serviceName)) {
      const timestamp = this.config.enableTimestamps ? `[${new Date().toISOString()}] ` : '';
      const service = serviceName ? `[${serviceName}] ` : '';
      console.log(`${timestamp}🗄️ ${service}${message}`, data || '');
    }
  }

  tool(message: string, serviceName?: string, data?: any): void {
    if (this.shouldLog(LogLevel.VERBOSE, serviceName)) {
      const timestamp = this.config.enableTimestamps ? `[${new Date().toISOString()}] ` : '';
      const service = serviceName ? `[${serviceName}] ` : '';
      console.log(`${timestamp}🔧 ${service}${message}`, data || '');
    }
  }

  // Service initialization summary
  servicesSummary(services: string[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`✅ ServiceContainer: Initialized ${services.length} services successfully`);
      if (this.shouldLog(LogLevel.DEBUG)) {
        console.log(`🔍 Available services: ${services.join(', ')}`);
      }
    }
  }

  // Database operations summary 
  databaseSummary(operations: number, timeMs: number): void {
    if (this.shouldLog(LogLevel.INFO, 'DatabaseManager')) {
      console.log(`✅ DatabaseManager: Completed ${operations} operations in ${timeMs}ms`);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Auto-configure based on environment
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

if (isProduction) {
  logger.enableProduction();
} else if (isDevelopment) {
  // Allow verbose logging in development, but not by default
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verbose') === 'true') {
      logger.enableVerbose();
    }
  }
}

// Expose logger to window for debugging
if (typeof window !== 'undefined') {
  (window as any).npLogger = logger;
}