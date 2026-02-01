# Route Registration Audit - NeuraPlay Backend

## Current Route Registration Analysis

### 🚨 **CRITICAL CONFLICTS IDENTIFIED**

#### 1. **DUPLICATE ROUTE REGISTRATIONS** 
```
server.cjs:85  - app.use('/api', apiRoutes.router)
server.cjs:88  - app.use('/api', require('./routes/unified-route.cjs'))
```
**Problem**: Both register on `/api` prefix, causing route conflicts

#### 2. **DUPLICATE ENDPOINT DEFINITIONS**
```
routes/api.cjs:288     - router.post('/api', ...)      → Final: /api/api
server.cjs:91          - app.post('/api/database', ...)
server.cjs:94          - app.post('/api/tabs', ...)
routes/api.cjs:198     - router.post('/tabs', ...)     → Final: /api/tabs
```
**Problem**: Multiple definitions for same endpoints

### 📋 **COMPLETE ROUTE MAPPING**

#### **Auth Routes** (`/api/auth/*`)
- ✅ Registered: `app.use('/api/auth', authRoutes.router)`
- Routes:
  - POST `/api/auth/login`
  - POST `/api/auth/send-verification`  
  - POST `/api/auth/verify`
  - POST `/api/auth/register`

#### **API Routes** (`/api/*`) - CONFLICTED
- ⚠️ Registered: `app.use('/api', apiRoutes.router)`
- Routes:
  - POST `/api/assemblyai-webhook`
  - POST `/api/assemblyai-transcribe`
  - GET `/api/tabs/:userId`
  - POST `/api/tabs`
  - PUT `/api/tabs/:id`
  - DELETE `/api/tabs/:id`
  - POST `/api/api` ⚠️ **CREATES /api/api ENDPOINT**
  - GET `/api/health`
  - POST `/api/memory`
  - GET `/api/memory/test`
  - GET `/api/memory/init`
  - POST `/api/elevenlabs-tts`

#### **Tools Routes** (`/api/tools/*`)
- ✅ Registered: `app.use('/api/tools', toolRoutes)`
- Routes:
  - POST `/api/tools/execute`

#### **Canvas Routes** (`/api/canvas/*`)
- ✅ Registered: `app.use('/api/canvas', canvasApiRoutes)`
- Routes:
  - POST `/api/canvas/sessions`
  - GET `/api/canvas/sessions/:chatId`
  - POST `/api/canvas/iterations`
  - GET `/api/canvas/iterations/:chatId`
  - POST `/api/canvas/elements`
  - GET `/api/canvas/elements/:chatId`
  - GET `/api/canvas/health`
  - DELETE `/api/canvas/clear`
  - POST `/api/canvas/render`
  - GET `/api/canvas/events`

#### **Unified Routes** (`/api/*`) - CONFLICTED
- ⚠️ Registered: `app.use('/api', require('./routes/unified-route.cjs'))`
- Routes:
  - POST `/api/unified-route` ⚠️ **SHOULD BE ACCESSIBLE BUT GETTING 404**

#### **Direct Server Routes**
- POST `/api/database` (handleDatabaseRequest)
- POST `/api/tabs` ⚠️ **DUPLICATES apiRoutes.router**
- GET `/api/tabs/:userId` ⚠️ **DUPLICATES apiRoutes.router**
- DELETE `/api/tabs/:tabId`
- POST `/api/assemblyai-webhook` ⚠️ **DUPLICATES apiRoutes.router**
- POST `/api/assemblyai-transcribe` ⚠️ **DUPLICATES apiRoutes.router**
- POST `/api/elevenlabs-tts` ⚠️ **DUPLICATES apiRoutes.router**
- GET `/api/health` ⚠️ **DUPLICATES apiRoutes.router**

### 🔥 **ROOT CAUSE OF 404 ERROR**

The `/api/unified-route` endpoint should exist because:
1. `unified-route.cjs` defines `router.post('/unified-route', ...)`
2. `server.cjs:88` registers it as `app.use('/api', unifiedRouteRouter)`
3. This should create the endpoint `/api/unified-route`

**However**, the 404 suggests either:
1. Route registration order issue (apiRoutes.router interfering)
2. Server deployment doesn't include latest changes
3. Route conflict preventing registration

### 🛠️ **RECOMMENDED FIXES**

#### **1. Fix Route Registration Conflicts**
```javascript
// BEFORE (Conflicted)
app.use('/api', apiRoutes.router);              // Line 85
app.use('/api', require('./routes/unified-route.cjs')); // Line 88

// AFTER (Fixed)
app.use('/api', apiRoutes.router);              
app.use('/api/unified', require('./routes/unified-route.cjs')); // Change to /api/unified
```

#### **2. Remove Duplicate Route Definitions**
Remove duplicated routes from server.cjs that already exist in route modules

#### **3. Update Frontend to Match**
Update `UnifiedAPIRouter.ts` to call `/api/unified/unified-route` instead of `/api/unified-route`

