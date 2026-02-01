# NeuraPlay Logging System Guide

## Overview

The new logging system significantly reduces verbose startup logs while preserving essential error information. It uses log levels to control what gets displayed.

## Log Levels

- **ERROR (0)**: Critical errors only
- **WARN (1)**: Warnings and errors
- **INFO (2)**: Important information, warnings, and errors (default)
- **DEBUG (3)**: Development debugging information
- **VERBOSE (4)**: All logs including very detailed operations

## Before and After

### Before (Excessive Logs)
```
🔧 ServiceContainer: Initializing services...
⚙️ ConfigService: Configuration loaded
🔧 APIService registered
🧠 State-of-the-art NPU services registered
🗄️ DatabaseManager: Executing query custom undefined
🔧 ToolRegistry registered
🔧 Tool registered: llm-completion (server)
🔧 Tool registered: store_memory (server)
... (50+ more tool registration messages)
💾 ConversationService: Saved to localStorage
🔄 ConversationService: Syncing with database...
🗄️ DatabaseManager: Executing query get conversations
... (30+ more database operation messages)
```

### After (Clean Logs)
```
✅ ServiceContainer: Initialized 32 services successfully
⚠️ VoiceManager registration failed, using fallback
✅ AIRouter registered and initialized
❌ LLM API Error Details: {error: "Render backend error: 500", status: 500, model: "accounts/fireworks/models/gpt-oss-120b"}
```

## Service-Specific Configuration

The logging system is pre-configured with appropriate levels for each service:

- **ServiceContainer**: ERROR only (reduces startup noise)
- **ConversationService**: WARN (reduces database sync noise)
- **DatabaseManager**: ERROR only (reduces query spam)
- **IntentAnalysisService**: WARN (reduces NPU verbosity)
- **ToolRegistry**: ERROR only (reduces tool registration noise)
- **APIService**: INFO (keeps important API information)

## Development Controls

### Enable Verbose Logging for Development
Add `?verbose=true` to your URL:
```
http://localhost:3001/?verbose=true
```

### Programmatic Control
```typescript
import { logger } from '../utils/Logger';

// Enable verbose logging
logger.enableVerbose();

// Set production mode (minimal logging)
logger.enableProduction();

// Set service-specific levels
logger.setServiceLevel('MyService', LogLevel.DEBUG);
```

### Browser Console Control
The logger is exposed as `npLogger` in the browser console:
```javascript
// Enable verbose logging
npLogger.enableVerbose();

// Check current configuration
npLogger.config;

// Set service level
npLogger.setServiceLevel('ConversationService', 2); // INFO level
```

## Migration from Old Logging

### Replace emoji-heavy console.log statements:

**Before:**
```typescript
console.log('🔧 ServiceContainer: Initializing services...');
console.log('✅ ServiceContainer: All services initialized');
console.error('❌ ServiceContainer: Critical initialization error:', error);
```

**After:**
```typescript
logger.info('Initializing services', 'ServiceContainer');
logger.servicesSummary(services); // Special summary method
logger.error('Critical initialization error', 'ServiceContainer', error);
```

### Use appropriate log levels:

- **ERROR**: Critical failures that break functionality
- **WARN**: Issues that don't break functionality but need attention
- **INFO**: Important state changes and summaries
- **DEBUG**: Development debugging information
- **VERBOSE**: Detailed operation logs (database queries, etc.)

## Legacy Compatibility

The logger provides legacy methods for gradual migration:

```typescript
logger.success('Operation completed', 'ServiceName'); // ✅ prefix
logger.loading('Processing...', 'ServiceName');        // 🔄 prefix
logger.database('Query executed', 'ServiceName');      // 🗄️ prefix (VERBOSE level)
logger.tool('Tool registered', 'ServiceName');         // 🔧 prefix (VERBOSE level)
```

## Result

This logging system reduces startup log noise by **~80%** while preserving all critical error information. The only logs you'll see during normal startup are:

1. **Service initialization summaries** (instead of individual service logs)
2. **Actual errors** with full context and details
3. **Important warnings** about fallback services
4. **Critical system state changes**

All the verbose operational details are still available when needed by enabling debug/verbose modes.
