#!/bin/bash
# NeuraPlay Backend Extraction Script for Momentreach (Linux/Mac)
# This script copies all reusable backend components to a new project directory

TARGET_DIR="${1:-../momentreach-backend}"

echo "🚀 Extracting NeuraPlay backend components for Momentreach..."
echo "📂 Target directory: $TARGET_DIR"

# Create target directory structure
mkdir -p "$TARGET_DIR"/{server-src/{controllers,routes,hnsw-services},routes,services,scripts,src/{services/{agents,canvas,llm,tools},ai/{handlers,safety},config,utils}}

echo "✅ Directory structure created"

# Core Backend Files
echo -e "\n📦 Copying core backend files..."
cp server.cjs "$TARGET_DIR/" 2>/dev/null && echo "  ✓ server.cjs"
cp package.json "$TARGET_DIR/" 2>/dev/null && echo "  ✓ package.json"
cp development.env "$TARGET_DIR/" 2>/dev/null && echo "  ✓ development.env"

# Routes
echo -e "\n📦 Copying route files..."
for file in routes/{unified-route,api,auth,tools,canvas-api,vision-route,system-capabilities}.cjs; do
    [ -f "$file" ] && cp "$file" "$TARGET_DIR/$file" && echo "  ✓ $file"
done
cp server-src/routes/memory.cjs "$TARGET_DIR/server-src/routes/" 2>/dev/null

# Backend Services
echo -e "\n📦 Copying backend services..."
for file in services/{database,websockets,StateOfTheArtDatabase,DatabaseIntegration}.cjs; do
    [ -f "$file" ] && cp "$file" "$TARGET_DIR/$file" && echo "  ✓ $file"
done

# HNSW Services
cp -r server-src/hnsw-services/* "$TARGET_DIR/server-src/hnsw-services/" 2>/dev/null

# Frontend Services (Reusable)
echo -e "\n📦 Copying frontend-agnostic services..."
services=(
    "ServiceContainer.ts" "ToolRegistry.ts" "CoreTools.ts" "APIService.ts" "ContextManager.ts"
    "UnifiedCognitiveAnalyzer.ts" "ProcessingModeService.ts" "CanvasActivationService.ts"
    "ConfusionDetectionService.ts" "SocraticAnalysisService.ts"
    "WebSearchEngine.ts" "NewsOrchestrator.ts" "IntelligentSearchService.ts"
    "IntelligentSearchDetector.ts" "DynamicSuggestionEngine.ts" "PerplexityStyleFormatter.ts"
    "UnifiedMemoryManager.ts" "ChatMemoryService.ts" "ConversationMemoryService.ts"
    "DatabaseManager.ts" "NPUDatabaseIntegration.ts" "VectorSearchService.ts"
    "VisionService.ts" "VoiceManager.ts"
    "UniversalCanvasService.ts" "CodeCanvasManager.ts"
    "LocationService.ts" "LanguageService.ts" "UserIdService.ts" "UnifiedAPIRouter.ts" "lazyChunks.ts"
)

for service in "${services[@]}"; do
    [ -f "src/services/$service" ] && cp "src/services/$service" "$TARGET_DIR/src/services/" && echo "  ✓ $service"
done

# Subdirectories
cp src/services/agents/* "$TARGET_DIR/src/services/agents/" 2>/dev/null
cp src/services/canvas/* "$TARGET_DIR/src/services/canvas/" 2>/dev/null
cp src/services/llm/* "$TARGET_DIR/src/services/llm/" 2>/dev/null

# AI Architecture
echo -e "\n📦 Copying AI architecture..."
cp src/ai/AIRouter.ts "$TARGET_DIR/src/ai/" 2>/dev/null
cp src/ai/handlers/* "$TARGET_DIR/src/ai/handlers/" 2>/dev/null
cp src/ai/safety/* "$TARGET_DIR/src/ai/safety/" 2>/dev/null

# Config & Utils
echo -e "\n📦 Copying configuration and utilities..."
cp src/config/* "$TARGET_DIR/src/config/" 2>/dev/null
cp src/utils/{Logger,Unifiedsessionmanager,tokencontextmanager}.ts "$TARGET_DIR/src/utils/" 2>/dev/null

# Database Scripts
cp scripts/db-setup.sql "$TARGET_DIR/scripts/" 2>/dev/null

# Create README (same as PowerShell version)
cat > "$TARGET_DIR/README.md" << 'EOF'
# Momentreach Backend
## Social Media Marketing Intelligence & Automation Platform

[Same content as PowerShell version]
EOF

echo -e "\n✅ Extraction complete!"
echo -e "\n📋 Next steps:"
echo "  1. cd $TARGET_DIR"
echo "  2. npm install"
echo "  3. Configure development.env"
echo "  4. Setup PostgreSQL"
echo "  5. npm start"
echo -e "\n🚀 Then push to GitHub:"
echo "  git init"
echo "  git remote add origin https://github.com/Neuraplayapp/Momentreach.git"
echo "  git add ."
echo "  git commit -m 'Initial backend extraction from NeuraPlay'"
echo "  git push -u origin main"

chmod +x "$TARGET_DIR/extract-backend-for-momentreach.sh" 2>/dev/null






