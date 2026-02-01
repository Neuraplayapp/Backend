# Complete Route Mismatch Audit - Frontend vs Backend

## 🚨 **CRITICAL MISMATCHES IDENTIFIED**

### **1. PRIMARY MISMATCH - UnifiedAPIRouter**
- **Frontend calls**: `/api/unified/unified-route` (UnifiedAPIRouter.ts line 16)
- **Backend registers**: `/api/unified-route` (unified-route.cjs via `/api` prefix)
- **Status**: ❌ **MAJOR MISMATCH** - This is the 404 source

### **2. API Tool Calls - Multiple Mismatches**
- **Frontend calls**: `/api/api` (53+ occurrences across components)
- **Backend registers**: `/api/api` (routes/api.cjs line 288 via `/api` prefix)
- **Final endpoint**: `/api/api` → Actually creates `/api/api` 
- **Status**: ⚠️ **DOUBLE PREFIX** - Should be just `/api` or different route

### **3. Authentication Routes**
- **Frontend calls**: `/api/auth/login`, `/api/auth/register`, etc.
- **Backend registers**: `/login`, `/register` etc. (routes/auth.cjs) 
- **Server mounts**: `app.use('/api/auth', authRoutes.router)`
- **Final endpoints**: `/api/auth/login`, `/api/auth/register`
- **Status**: ✅ **CORRECT MATCH**

### **4. Tools Execution**
- **Frontend calls**: `/api/tools/execute` (SmartToolDispatcher.ts)
- **Backend registers**: `/execute` (routes/tools.cjs)
- **Server mounts**: `app.use('/api/tools', toolRoutes)`
- **Final endpoint**: `/api/tools/execute`
- **Status**: ✅ **CORRECT MATCH**

### **5. Canvas API Routes**
- **Frontend calls**: No direct frontend calls found
- **Backend registers**: Various canvas routes (routes/canvas-api.cjs)
- **Server mounts**: `app.use('/api/canvas', canvasApiRoutes)`
- **Status**: ✅ **NO CONFLICTS** (backend-only)

### **6. AssemblyAI Transcription**
- **Frontend calls**: `/api/assemblyai-transcribe` (AIAssistantSmall.tsx, VoiceManager.ts, etc.)
- **Backend registers**: `/assemblyai-transcribe` (routes/api.cjs line 68)
- **Server mounts**: `app.use('/api', apiRoutes.router)`
- **Final endpoint**: `/api/assemblyai-transcribe`
- **Status**: ✅ **CORRECT MATCH**

### **7. ElevenLabs TTS**
- **Frontend calls**: `/api/elevenlabs-tts` (Multiple components)
- **Backend registers**: TWO PLACES:
  - `routes/api.cjs` line 779: `/elevenlabs-tts` → `/api/elevenlabs-tts`
  - `server.cjs` line 144: `app.post('/api/elevenlabs-tts', ...)`
- **Status**: ⚠️ **DUPLICATE REGISTRATION** - Potential conflict

### **8. Database Queries**
- **Frontend calls**: `/api/database` (CoreTools.ts, DatabaseService.ts)
- **Backend registers**: `app.post('/api/database', ...)` (server.cjs line 91)
- **Status**: ✅ **CORRECT MATCH**

### **9. Health Checks**
- **Frontend calls**: `/api/health` (DatabaseService.ts)
- **Backend registers**: TWO PLACES:
  - `routes/api.cjs` line 602: `/health` → `/api/health`
  - `server.cjs` line 383: `app.get('/api/health', ...)`
- **Status**: ⚠️ **DUPLICATE REGISTRATION** - Potential conflict

### **10. Tab Management**
- **Frontend calls**: `/api/tabs`, `/api/tabs/:userId`, `/api/tabs/:id`
- **Backend registers**: Multiple places:
  - `routes/api.cjs`: `/tabs`, `/tabs/:userId`, etc. → `/api/tabs/*`
  - `server.cjs`: Direct `/api/tabs/:tabId` registration
- **Status**: ⚠️ **MIXED REGISTRATION** - Some through router, some direct

### **11. Memory Management**
- **Frontend calls**: `/api/agent/memory` (CoreTools.ts line 960)
- **Backend registers**: `/memory` (routes/api.cjs line 611) → `/api/memory`
- **Status**: ❌ **MISMATCH** - Frontend expects `/api/agent/memory`, backend has `/api/memory`

### **12. Missing Frontend Calls**
- **Frontend calls**: `/api/contact` (ContactForm.tsx)
- **Backend registers**: ❌ **NOT FOUND**
- **Status**: ❌ **MISSING BACKEND ROUTE**

- **Frontend calls**: `/api/users/sync` (UserContext.tsx)
- **Backend registers**: ❌ **NOT FOUND**  
- **Status**: ❌ **MISSING BACKEND ROUTE**

## 📊 **SUMMARY OF CRITICAL ISSUES**

### **🔥 IMMEDIATE FIXES NEEDED:**
1. **UnifiedAPIRouter mismatch** - Root cause of 404 errors
2. **Memory endpoint mismatch** - `/api/agent/memory` vs `/api/memory`
3. **Missing contact route** - Frontend calls non-existent endpoint
4. **Missing users/sync route** - Frontend calls non-existent endpoint

### **⚠️ POTENTIAL CONFLICTS:**
1. **Duplicate ElevenLabs registrations** - Could cause routing issues
2. **Duplicate health check registrations** - Could cause routing issues  
3. **Mixed tab registration** - Inconsistent routing patterns
4. **Double API prefix** - `/api/api` endpoint is confusing

### **✅ WORKING CORRECTLY:**
- Authentication routes
- Tools execution
- AssemblyAI transcription
- Database queries
- Canvas API (backend-only)

## 🛠️ **RECOMMENDED FIX PRIORITY:**

1. **HIGH**: Fix UnifiedAPIRouter route mismatch
2. **HIGH**: Fix memory endpoint mismatch  
3. **MEDIUM**: Add missing contact and users/sync routes
4. **MEDIUM**: Remove duplicate route registrations
5. **LOW**: Clean up `/api/api` double prefix
