# CoreTools Refactoring Summary

## Problem
CoreTools.ts was a 3,265-line monolith handling:
- Document/Code/Chart generation
- LLM prompts and parsing  
- Token management
- Memory/Database operations
- Canvas state management

## Solution: Service-Oriented Architecture

### New Service Files Created:

#### 1. **LLM Services** (`src/services/llm/`)

**LLMPromptBuilder.ts**
- Builds document creation prompts
- Builds document revision prompts
- Handles NPU analysis integration
- Complexity-aware guidance

**LLMResponseParser.ts**
- Parses multiple API formats (Fireworks, OpenAI, etc)
- Extracts content from incomplete/truncated JSON
- Handles fallback generation
- Validates response quality

**LLMTokenManager.ts**
- Calculates token limits based on complexity
- Adds buffer for tables/structured content
- Detects table requirements in requests
- Enforces maximum token caps

#### 2. **Canvas Services** (`src/services/canvas/`)

**CanvasDocumentService.ts**
- Orchestrates document generation
- Handles document revisions/additions
- Integrates LLM services
- Manages version content

### CoreTools Changes:

**Before**: 3,265 lines with embedded logic
**After**: Thin orchestrator that delegates to services

```typescript
// OLD: Inline LLM prompt building (200+ lines)
const prompt = `You are a professional...
${complexityGuidance}...
${examples}...`;

// NEW: Service-based (1 line)
const prompt = LLMPromptBuilder.buildDocumentCreationPrompt(params, npuAnalysis);
```

```typescript
// OLD: Manual JSON parsing with fallback (80+ lines)
try {
  deltaData = JSON.parse(delta.content || '{}');
  if (!deltaData.content || deltaData.content.length < 20) {
    // Fallback logic...
  }
} catch (e) {
  // Extraction logic...
}

// NEW: Service-based (1 line)
const parsed = LLMResponseParser.parseResponse(llmResponse, fallbackTitle);
```

```typescript
// OLD: Token calculation inline (10+ lines)
const hasTable = params.request?.toLowerCase().includes('table');
const baseTokens = complexity === 'expert' ? 4000 : complexity === 'moderate' ? 3000 : 2000;
const finalTokens = hasTable ? Math.min(baseTokens * 1.3, 4000) : baseTokens;

// NEW: Service-based (1 line)
const tokenConfig = LLMTokenManager.calculateTokenLimit(complexity, hasTable);
```

### Benefits:

1. **Single Responsibility**: Each service has one clear purpose
2. **Testability**: Services can be unit tested independently
3. **Reusability**: LLM services can be used by other canvas types (code, chart)
4. **Maintainability**: Changes to prompts/parsing don't affect tool registration
5. **Debugging**: Clear service boundaries make issues easier to trace

### Next Steps:

1. ✅ Extract LLM utilities
2. ✅ Extract Canvas document service
3. 🔄 Update Core Tools to use services (IN PROGRESS)
4. ⏳ Extract Code/Chart services
5. ⏳ Extract Memory/Search tools to separate files
6. ⏳ Reduce CoreTools to ~500 lines (tool registry only)

### File Structure:

```
src/services/
├── llm/
│   ├── LLMPromptBuilder.ts       ← Prompt construction
│   ├── LLMResponseParser.ts      ← Response parsing  
│   └── LLMTokenManager.ts        ← Token limits
│
├── canvas/
│   ├── CanvasDocumentService.ts  ← Document generation
│   ├── CanvasStateAdapter.ts     ← State management (existing)
│   ├── CanvasStateService.ts     ← State operations (existing)
│   └── CanvasVersionService.ts   ← Versioning (existing)
│
└── CoreTools.ts                  ← Thin orchestrator (refactored)
```

This refactoring establishes a scalable architecture for future canvas features.

