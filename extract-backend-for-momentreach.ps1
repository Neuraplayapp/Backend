# NeuraPlay Backend Extraction Script for Momentreach
# This script copies all reusable backend components to a new project directory

param(
    [string]$TargetDir = "..\momentreach-backend"
)

Write-Host "🚀 Extracting NeuraPlay backend components for Momentreach..." -ForegroundColor Green
Write-Host "📂 Target directory: $TargetDir" -ForegroundColor Cyan

# Create target directory structure
$directories = @(
    "$TargetDir\server-src",
    "$TargetDir\server-src\controllers",
    "$TargetDir\server-src\routes",
    "$TargetDir\server-src\hnsw-services",
    "$TargetDir\routes",
    "$TargetDir\services",
    "$TargetDir\scripts",
    "$TargetDir\src\services",
    "$TargetDir\src\services\agents",
    "$TargetDir\src\services\canvas",
    "$TargetDir\src\services\llm",
    "$TargetDir\src\services\tools",
    "$TargetDir\src\ai",
    "$TargetDir\src\ai\handlers",
    "$TargetDir\src\ai\safety",
    "$TargetDir\src\config",
    "$TargetDir\src\utils"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Host "✅ Directory structure created" -ForegroundColor Green

# Core Backend Files
Write-Host "`n📦 Copying core backend files..." -ForegroundColor Yellow
$coreFiles = @(
    "server.cjs",
    "package.json",
    "development.env",
    ".env.example"
)

foreach ($file in $coreFiles) {
    if (Test-Path $file) {
        Copy-Item $file "$TargetDir\" -Force
        Write-Host "  ✓ $file" -ForegroundColor Gray
    }
}

# Routes (Express API endpoints)
Write-Host "`n📦 Copying route files..." -ForegroundColor Yellow
$routeFiles = @(
    "routes\unified-route.cjs",
    "routes\api.cjs",
    "routes\auth.cjs",
    "routes\tools.cjs",
    "routes\canvas-api.cjs",
    "routes\vision-route.cjs",
    "routes\system-capabilities.cjs"
)

foreach ($file in $routeFiles) {
    if (Test-Path $file) {
        Copy-Item $file "$TargetDir\$file" -Force
        Write-Host "  ✓ $file" -ForegroundColor Gray
    }
}

# Memory routes
Copy-Item "server-src\routes\memory.cjs" "$TargetDir\server-src\routes\" -Force -ErrorAction SilentlyContinue

# Backend Services
Write-Host "`n📦 Copying backend services..." -ForegroundColor Yellow
$serviceFiles = @(
    "services\database.cjs",
    "services\websockets.cjs",
    "services\StateOfTheArtDatabase.cjs",
    "services\DatabaseIntegration.cjs"
)

foreach ($file in $serviceFiles) {
    if (Test-Path $file) {
        Copy-Item $file "$TargetDir\$file" -Force
        Write-Host "  ✓ $file" -ForegroundColor Gray
    }
}

# HNSW Vector Services (Advanced)
Copy-Item "server-src\hnsw-services\*" "$TargetDir\server-src\hnsw-services\" -Recurse -Force -ErrorAction SilentlyContinue

# Frontend Services (Reusable in ANY frontend)
Write-Host "`n📦 Copying frontend-agnostic services..." -ForegroundColor Yellow
$frontendServices = @(
    # Core AI Services
    "src\services\ServiceContainer.ts",
    "src\services\ToolRegistry.ts",
    "src\services\CoreTools.ts",
    "src\services\APIService.ts",
    "src\services\ContextManager.ts",
    
    # AI Analysis Services
    "src\services\UnifiedCognitiveAnalyzer.ts",
    "src\services\ProcessingModeService.ts",
    "src\services\CanvasActivationService.ts",
    "src\services\ConfusionDetectionService.ts",
    "src\services\SocraticAnalysisService.ts",
    
    # Search & Intelligence
    "src\services\WebSearchEngine.ts",
    "src\services\NewsOrchestrator.ts",
    "src\services\IntelligentSearchService.ts",
    "src\services\IntelligentSearchDetector.ts",
    "src\services\DynamicSuggestionEngine.ts",
    "src\services\PerplexityStyleFormatter.ts",
    
    # Search Agents
    "src\services\agents\SearchOrchestrator.ts",
    "src\services\agents\ContentAnalyzer.ts",
    
    # Memory & Database
    "src\services\UnifiedMemoryManager.ts",
    "src\services\ChatMemoryService.ts",
    "src\services\ConversationMemoryService.ts",
    "src\services\DatabaseManager.ts",
    "src\services\NPUDatabaseIntegration.ts",
    "src\services\VectorSearchService.ts",
    
    # Vision & Multimodal
    "src\services\VisionService.ts",
    "src\services\VoiceManager.ts",
    
    # Canvas Services (Document Generation)
    "src\services\canvas\CanvasDocumentService.ts",
    "src\services\UniversalCanvasService.ts",
    "src\services\CodeCanvasManager.ts",
    
    # LLM Services
    "src\services\llm\LLMPromptBuilder.ts",
    "src\services\llm\LLMResponseParser.ts",
    "src\services\llm\LLMTokenManager.ts",
    
    # Utilities
    "src\services\LocationService.ts",
    "src\services\LanguageService.ts",
    "src\services\UserIdService.ts",
    "src\services\UnifiedAPIRouter.ts",
    "src\services\lazyChunks.ts"
)

foreach ($file in $frontendServices) {
    if (Test-Path $file) {
        Copy-Item $file "$TargetDir\$file" -Force
        Write-Host "  ✓ $file" -ForegroundColor Gray
    }
}

# AI Router & Handlers
Write-Host "`n📦 Copying AI architecture..." -ForegroundColor Yellow
$aiFiles = @(
    "src\ai\AIRouter.ts",
    "src\ai\handlers\ChatHandler.ts",
    "src\ai\handlers\ToolCallingHandler.ts",
    "src\ai\handlers\AgentHandler.ts",
    "src\ai\handlers\SocraticHandler.ts",
    "src\ai\handlers\ModeHandlerFactory.ts",
    "src\ai\safety\SafetyService.ts"
)

foreach ($file in $aiFiles) {
    if (Test-Path $file) {
        Copy-Item $file "$TargetDir\$file" -Force
        Write-Host "  ✓ $file" -ForegroundColor Gray
    }
}

# Configuration
Write-Host "`n📦 Copying configuration files..." -ForegroundColor Yellow
Copy-Item "src\config\ModelConfig.ts" "$TargetDir\src\config\" -Force -ErrorAction SilentlyContinue
Copy-Item "src\config\elevenlabs.ts" "$TargetDir\src\config\" -Force -ErrorAction SilentlyContinue

# Utilities
Write-Host "`n📦 Copying utilities..." -ForegroundColor Yellow
$utilFiles = @(
    "src\utils\Logger.ts",
    "src\utils\Unifiedsessionmanager.ts",
    "src\utils\tokencontextmanager.ts"
)

foreach ($file in $utilFiles) {
    if (Test-Path $file) {
        Copy-Item $file "$TargetDir\$file" -Force
        Write-Host "  ✓ $file" -ForegroundColor Gray
    }
}

# Database Scripts
Write-Host "`n📦 Copying database setup scripts..." -ForegroundColor Yellow
Copy-Item "scripts\db-setup.sql" "$TargetDir\scripts\" -Force -ErrorAction SilentlyContinue

# Create a minimal package.json for the backend
Write-Host "`n📦 Creating backend-specific package.json..." -ForegroundColor Yellow
$backendPackageJson = @"
{
  "name": "momentreach-backend",
  "version": "1.0.0",
  "description": "Social Media Marketing Intelligence & Automation Backend (extracted from NeuraPlay)",
  "type": "module",
  "main": "server.cjs",
  "scripts": {
    "start": "node server.cjs",
    "dev": "NODE_ENV=development node server.cjs"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "pg": "^8.11.3",
    "ws": "^8.18.3",
    "axios": "^1.5.0",
    "bcrypt": "^5.1.0",
    "compression": "^1.7.4",
    "helmet": "^7.0.0",
    "hnswlib-node": "^3.0.0",
    "multer": "^1.4.4",
    "node-fetch": "^2.7.0",
    "pdf-parse": "^2.2.16",
    "uuid": "^9.0.0"
  }
}
"@

$backendPackageJson | Out-File "$TargetDir\package.json" -Encoding UTF8 -Force

# Create README
Write-Host "`n📦 Creating setup documentation..." -ForegroundColor Yellow
$readme = @"
# Momentreach Backend
## Social Media Marketing Intelligence & Automation Platform

### Extracted from NeuraPlay AI Platform

This backend provides:
- 🧠 AI-powered analysis (intent detection, cognitive processing)
- 🔍 Intelligent search & web scraping capabilities
- 📄 Document canvas generation (marketing strategies)
- 💾 Persistent memory (PostgreSQL + pgvector)
- 🎯 Tool registry for extensible functionality
- 🌐 Multi-provider API routing (Fireworks, ElevenLabs, etc.)
- 🤖 Agentic orchestration system

---

## Quick Start

### 1. Install Dependencies
``````bash
npm install
``````

### 2. Configure Environment
Copy ``development.env`` and add your API keys:
``````bash
# AI Provider
FIREWORKS_API_KEY=your_key_here
Neuraplay=your_key_here

# Database (PostgreSQL with pgvector)
DATABASE_URL=postgresql://user:pass@localhost:5432/momentreach

# Search Provider
SERPER_API_KEY=your_key_here

# Voice (Optional)
VITE_ELEVENLABS_API_KEY=your_key_here
``````

### 3. Setup Database
``````bash
# Create PostgreSQL database
createdb momentreach

# Enable pgvector extension
psql momentreach -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run schema setup
psql momentreach < scripts/db-setup.sql
``````

### 4. Start Server
``````bash
npm start
``````

Server runs on http://localhost:3001

---

## Architecture Overview

### Core Components

#### 1. **AIRouter** (``src/ai/AIRouter.ts``)
- Main orchestration layer
- Routes requests to appropriate handlers
- Integrates cognitive analysis

#### 2. **Handlers** (``src/ai/handlers/``)
- ``ChatHandler``: Conversational AI
- ``ToolCallingHandler``: Tool execution (search, scraping, canvas)
- ``AgentHandler``: Multi-step agentic workflows
- ``SocraticHandler``: Guided questioning

#### 3. **Services** (``src/services/``)
- ``WebSearchEngine``: Intelligent web search
- ``UnifiedMemoryManager``: Long-term memory
- ``CanvasDocumentService``: Document generation
- ``VisionService``: Image analysis
- ``CoreTools``: 20+ registered tools

#### 4. **Database** (``services/database.cjs``)
- PostgreSQL with pgvector
- 20+ tables for conversations, memories, analytics
- HNSW vector indexing for semantic search

---

## API Endpoints

### Unified Route (Main Entry Point)
``````
POST /api/unified-route
Body: {
  service: 'fireworks' | 'elevenlabs',
  endpoint: 'llm-completion' | 'image-generation' | 'vision',
  data: { ... }
}
``````

### Tool Execution
``````
POST /api/tools
Body: {
  toolName: 'web-search' | 'document-canvas' | 'semantic-search',
  params: { ... },
  context: { sessionId, userId }
}
``````

### Canvas API
``````
POST /api/canvas/elements
Body: {
  chatId: string,
  element: { type, content }
}
``````

### Vision Analysis
``````
POST /api/vision/analyze
Body: FormData with images/documents
``````

---

## Extending for Social Media

### Add New Services:

``````typescript
// src/services/SocialMediaScraperService.ts
export class SocialMediaScraperService {
  async scrapeFacebook(query: string): Promise<Post[]> {
    // Use WebSearchEngine + custom logic
    const results = await webSearchEngine.executeSearch({
      query: \`site:facebook.com \${query}\`,
      userId, sessionId
    });
    return this.parseResults(results);
  }
}
``````

### Register New Tools:

``````typescript
// Add to src/services/CoreTools.ts
const socialMediaScrapeTool: ToolDefinition = {
  name: 'social-media-scrape',
  category: 'server',
  schema: { ... },
  async execute(params, context) {
    // Implementation
  }
};

toolRegistry.register(socialMediaScrapeTool);
``````

---

## Frontend Integration

This backend is **frontend-agnostic**. Use with:
- React
- Vue
- Angular
- Plain JavaScript
- Mobile apps

### Example API Call:
``````javascript
// Search for competitor posts
const response = await fetch('http://localhost:3001/api/tools', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    toolName: 'web-search',
    params: {
      query: 'Nike social media marketing strategy',
      numResults: 10
    },
    context: {
      sessionId: 'session-123',
      userId: 'user-456'
    }
  })
});

const data = await response.json();
``````

---

## Key Files Reference

| File | Purpose |
|------|---------|
| ``server.cjs`` | Main Express server |
| ``routes/unified-route.cjs`` | API routing & LLM calls |
| ``routes/api.cjs`` | Legacy endpoints |
| ``routes/tools.cjs`` | Tool execution endpoint |
| ``src/ai/AIRouter.ts`` | AI orchestration |
| ``src/services/CoreTools.ts`` | Tool definitions |
| ``src/services/WebSearchEngine.ts`` | Search intelligence |
| ``src/services/UnifiedMemoryManager.ts`` | Memory management |
| ``services/database.cjs`` | Database initialization |

---

## Environment Variables

Required:
- ``FIREWORKS_API_KEY`` or ``Neuraplay``: AI model provider
- ``DATABASE_URL``: PostgreSQL connection string

Optional:
- ``SERPER_API_KEY``: Web search provider
- ``VITE_ELEVENLABS_API_KEY``: Text-to-speech
- ``PORT``: Server port (default: 3001)

---

## License
Extracted from NeuraPlay AI Platform

---

## Support
For issues, contact the NeuraPlay team or file an issue on GitHub.
"@

$readme | Out-File "$TargetDir\README.md" -Encoding UTF8 -Force

Write-Host "`n✅ Extraction complete!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. cd $TargetDir" -ForegroundColor White
Write-Host "  2. npm install" -ForegroundColor White
Write-Host "  3. Configure development.env with your API keys" -ForegroundColor White
Write-Host "  4. Setup PostgreSQL database" -ForegroundColor White
Write-Host "  5. npm start" -ForegroundColor White
Write-Host "`n🚀 Then push to GitHub:" -ForegroundColor Cyan
Write-Host "  cd $TargetDir" -ForegroundColor White
Write-Host "  git init" -ForegroundColor White
Write-Host "  git remote add origin https://github.com/Neuraplayapp/Momentreach.git" -ForegroundColor White
Write-Host "  git add ." -ForegroundColor White
Write-Host "  git commit -m 'Initial backend extraction from NeuraPlay'" -ForegroundColor White
Write-Host "  git push -u origin main" -ForegroundColor White






