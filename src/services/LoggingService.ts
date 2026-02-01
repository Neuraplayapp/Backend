/**
 * 🔇 LOGGING SERVICE
 * 
 * Centralized logging with log level control.
 * Reduces console noise in production while keeping debug info available when needed.
 * 
 * Log Levels:
 * - 0: ERROR only (production)
 * - 1: ERROR + WARN
 * - 2: ERROR + WARN + INFO (default)
 * - 3: ERROR + WARN + INFO + DEBUG (verbose)
 * 
 * Set via: localStorage.setItem('neuraplay_log_level', '3')
 */

type LogLevel = 0 | 1 | 2 | 3;

class LoggingService {
  private static instance: LoggingService;
  private logLevel: LogLevel = 2; // Default: INFO level
  private isProduction: boolean = false;
  
  constructor() {
    this.detectEnvironment();
    this.loadLogLevel();
  }
  
  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }
  
  private detectEnvironment(): void {
    try {
      const hostname = window?.location?.hostname || '';
      this.isProduction = hostname.includes('neuraplay.org') || 
                          hostname.includes('render.com') ||
                          hostname.includes('.onrender.com');
      
      // In production, default to less verbose
      if (this.isProduction) {
        this.logLevel = 1; // WARN and ERROR only
      }
    } catch {
      // Not in browser
    }
  }
  
  private loadLogLevel(): void {
    try {
      const stored = localStorage?.getItem('neuraplay_log_level');
      if (stored !== null) {
        const level = parseInt(stored, 10) as LogLevel;
        if (level >= 0 && level <= 3) {
          this.logLevel = level;
        }
      }
    } catch {
      // localStorage not available
    }
  }
  
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    try {
      localStorage?.setItem('neuraplay_log_level', String(level));
    } catch {
      // Ignore
    }
  }
  
  getLogLevel(): LogLevel {
    return this.logLevel;
  }
  
  /**
   * ERROR: Always logged (level 0+)
   */
  error(category: string, message: string, ...args: any[]): void {
    console.error(`❌ ${category}: ${message}`, ...args);
  }
  
  /**
   * WARN: Logged at level 1+
   */
  warn(category: string, message: string, ...args: any[]): void {
    if (this.logLevel >= 1) {
      console.warn(`⚠️ ${category}: ${message}`, ...args);
    }
  }
  
  /**
   * INFO: Logged at level 2+ (key milestones only)
   */
  info(category: string, message: string, ...args: any[]): void {
    if (this.logLevel >= 2) {
      console.log(`ℹ️ ${category}: ${message}`, ...args);
    }
  }
  
  /**
   * DEBUG: Logged at level 3 only (verbose)
   */
  debug(category: string, message: string, ...args: any[]): void {
    if (this.logLevel >= 3) {
      console.log(`🔍 ${category}: ${message}`, ...args);
    }
  }
  
  /**
   * SUCCESS: Logged at level 2+ (key milestones)
   */
  success(category: string, message: string, ...args: any[]): void {
    if (this.logLevel >= 2) {
      console.log(`✅ ${category}: ${message}`, ...args);
    }
  }
  
  /**
   * Quick check if debug logging is enabled
   */
  isDebugEnabled(): boolean {
    return this.logLevel >= 3;
  }
}

// Export singleton
export const logger = LoggingService.getInstance();
export { LoggingService };








