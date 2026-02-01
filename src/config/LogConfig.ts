/**
 * 🔇 LOG CONFIGURATION
 * 
 * Centralized logging control to reduce console noise in production.
 * Uses emoji detection to auto-categorize logs without changing existing code.
 * 
 * In production: Only essential logs (errors, warnings, key user actions)
 * In development: Full verbose logging
 * 
 * Runtime controls:
 *   window.enableDebugMode()  - Enable all logs
 *   window.disableAllLogs()   - Silence everything
 *   window.setLogLevel('warn') - Set minimum level
 */

// 🎯 EMOJI TO CATEGORY MAPPING
// Automatically categorizes logs based on their emoji prefix
const EMOJI_CATEGORIES: Record<string, string> = {
  '🔍': 'search',
  '🧠': 'memory',
  '🔧': 'init',
  '🔀': 'api',
  '✅': 'success',
  '❌': 'error',
  '⚠️': 'warn',
  '🔗': 'session',
  '📊': 'data',
  '🗄️': 'database',
  '💬': 'chat',
  '👋': 'greeting',
  '🎯': 'intent',
  '🔄': 'sync',
  '📄': 'canvas',
  '🌍': 'location',
  '🌐': 'api',
  '📋': 'data',
  '🚀': 'tool',
  '🛡️': 'safety',
  '🎨': 'canvas',
  '📚': 'learning',
  '🆕': 'init',
  '🧹': 'cleanup',
  '📡': 'event'
};

// 🎯 CATEGORIES ALLOWED IN PRODUCTION
const PRODUCTION_ALLOWED = new Set([
  'error',
  'warn',
  'greeting',  // Keep for debugging user experience
  'success'    // Only final success messages
]);

// Detect environment
const isProduction = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1' &&
  !window.location.search.includes('debug=true');

let loggingEnabled = true;
let forceVerbose = false;

/**
 * 🔇 PRODUCTION LOG FILTER
 * Wraps console.log to filter based on environment and category
 */
function createProductionLogger() {
  const originalLog = console.log.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  
  // Override console.log in production
  if (isProduction) {
    console.log = (...args: any[]) => {
      if (!loggingEnabled) return;
      if (forceVerbose) {
        originalLog(...args);
        return;
      }
      
      // Get first argument to check for emoji
      const firstArg = args[0];
      if (typeof firstArg !== 'string') {
        // Non-string first args - allow through (probably important)
        return;
      }
      
      // Extract emoji from start of message
      const emojiMatch = firstArg.match(/^[\p{Emoji}\u200d]+/u);
      if (!emojiMatch) {
        // No emoji prefix - likely important, allow through
        originalLog(...args);
        return;
      }
      
      const emoji = emojiMatch[0];
      const category = EMOJI_CATEGORIES[emoji] || 'unknown';
      
      // Only allow whitelisted categories in production
      if (PRODUCTION_ALLOWED.has(category)) {
        originalLog(...args);
      }
      // Silently drop other logs in production
    };
  }
  
  // Keep warn and error always
  console.warn = (...args: any[]) => {
    if (!loggingEnabled) return;
    originalWarn(...args);
  };
  
  console.error = (...args: any[]) => {
    originalError(...args);  // Always log errors
  };
  
  return { originalLog, originalWarn, originalError };
}

/**
 * Enable verbose logging (all categories)
 */
export function enableDebugMode(): void {
  forceVerbose = true;
  console.log('🔧 Debug mode enabled - all log categories active');
}

/**
 * Disable all logging
 */
export function disableAllLogs(): void {
  loggingEnabled = false;
  console.log('🔇 All logging disabled');
}

/**
 * Re-enable logging
 */
export function enableLogs(): void {
  loggingEnabled = true;
  console.log('🔊 Logging re-enabled');
}

/**
 * Check current environment
 */
export function getLogStatus(): { isProduction: boolean; loggingEnabled: boolean; forceVerbose: boolean } {
  return { isProduction, loggingEnabled, forceVerbose };
}

// Initialize the production logger
const loggerContext = createProductionLogger();

// Expose to window for runtime debugging
if (typeof window !== 'undefined') {
  (window as any).enableDebugMode = enableDebugMode;
  (window as any).disableAllLogs = disableAllLogs;
  (window as any).enableLogs = enableLogs;
  (window as any).getLogStatus = getLogStatus;
}

export { loggerContext, isProduction };

