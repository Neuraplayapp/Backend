# Database Setup and Troubleshooting

## Issue Analysis

The NPU (Neural Processing Unit) database logging was failing with "Database operation failed" errors. The root causes were:

1. **Missing Table**: The `npu_analyses` table likely doesn't exist in the production Render database
2. **Parameter Mismatch**: The INSERT query was trying to pass a timestamp value when the table uses `DEFAULT CURRENT_TIMESTAMP`
3. **Data Validation**: Large text fields or missing values could cause insertion failures
4. **Poor Error Reporting**: The backend was hiding the actual PostgreSQL error messages

## Fixes Applied

### 1. Database Handler Updates (`services/database.cjs`)
- Added support for `npu_analyses` collection in save/get/delete operations
- Fixed parameter count mismatch (removed explicit timestamp, using DEFAULT)
- Improved error reporting to include actual error details

### 2. NPU Integration Updates (`src/services/NPUDatabaseIntegration.ts`)
- Added text truncation for large fields (5000 char limit)
- Added fallback values for all fields to prevent NULL issues
- Removed timestamp from data object (let DB handle it)
- Made NPU logging non-blocking (failures don't break the flow)

### 3. Memory System Updates (`src/services/MemoryDatabaseBridge.ts`)
- Added local fallback storage when database is unavailable
- Both store and search operations gracefully degrade to local storage

### 4. Name Extraction Fix (`src/ai/handlers/ChatHandler.ts`)
- Fixed regex to properly capture names (e.g., "Sammy" instead of "my")
- Added validation to skip common false positives

## Required Actions on Render

### 1. Verify Database Schema

Run this command locally with your Render database URL:

```bash
DATABASE_URL="postgresql://neuraplay_database_user:QSCSrwhxH2rju0CxzZK9zLurnd1Pqlmr@dpg-d29kqv2li9vc73frta6g-a.oregon-postgres.render.com/neuraplay_database" node scripts/verify-database-schema.js
```

### 2. Update Database Schema (if needed)

If the `npu_analyses` table is missing, run:

```bash
DATABASE_URL="postgresql://neuraplay_database_user:QSCSrwhxH2rju0CxzZK9zLurnd1Pqlmr@dpg-d29kqv2li9vc73frta6g-a.oregon-postgres.render.com/neuraplay_database" node scripts/update-database-schema.js
```

### 3. Environment Variables on Render

Ensure these are set in your Render environment:
- `DATABASE_URL` or `RENDER_POSTGRES_URL`
- `NODE_ENV=production` (for security)
- All API keys (Serper, Weather, Fireworks, etc.)

## How the System Works

### NPU Analysis Flow
1. User sends a message
2. `IntentAnalysisService` performs 10-layer analysis
3. Results are logged to `npu_analyses` table via `NPUDatabaseIntegration`
4. If database fails, the error is logged but doesn't break the chat flow

### Memory System Flow
1. Names, preferences, events are auto-extracted from messages
2. Stored in `user_memories` table via API endpoint
3. If database fails, falls back to local Map storage
4. Search operations check both database and local storage

### Database Collections
- `users` - User accounts and profiles
- `user_memories` - User-specific memories (names, preferences, etc.)
- `npu_analyses` - 10-layer NPU analysis logs
- `cross_chat_knowledge` - Knowledge that persists across chats
- `user_behavior_patterns` - Learning and behavior analysis
- `conversations` - Chat history
- `chat_tabs` - Tab management

## Testing

1. **Test NPU Logging**: Send any message and check console for NPU errors
2. **Test Memory**: Say "my name is [name]" and then "what's my name?"
3. **Test Search**: Say "google search [topic]" to test tool routing
4. **Test Canvas**: Say "create a diary" to test canvas activation

## Common Issues

### "Database operation failed"
- Run the schema update script
- Check Render logs for actual PostgreSQL errors
- Verify connection string is correct

### Memory not persisting
- Check if `user_memories` table exists
- Verify user ID is being passed correctly
- Check browser console for API errors

### NPU errors don't show details
- The backend now includes error details when `NODE_ENV=development`
- Check Render logs for full error messages

## Architecture Notes

The system is designed to be resilient:
- NPU logging failures don't break chat functionality
- Memory system has local fallback
- All database operations have proper error handling
- Frontend gracefully handles API failures
