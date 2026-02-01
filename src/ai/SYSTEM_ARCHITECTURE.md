# 🔒 NEURAPLAY AI SYSTEM ARCHITECTURE - IMMUTABLE FINAL VERSION

## ⚠️ CRITICAL: DO NOT MODIFY THIS ARCHITECTURE

This document defines the **FINAL** and **IMMUTABLE** architecture of the NeuraPlay AI system. Any changes to this structure require explicit user approval.

## 🏗️ CORE STRUCTURE

### **Entry Point**
- **`src/ai/AIRouter.ts`** - THE ONLY AI entry point
- All AI requests MUST go through `serviceContainer.get('aiRouter').processRequest()`

### **Processing Pipeline**
```
User Request → AIRouter → IntentAnalysisService → ModeHandlerFactory → Handler → Response
```

### **Component Locations**
- **Intent Analysis**: `src/ai/intent/IntentAnalysisService.ts`
- **Safety Validation**: `src/ai/safety/SafetyService.ts`  
- **Mode Handlers**: `src/ai/handlers/`
  - `ModeHandlerFactory.ts`
  - `ChatHandler.ts`
  - `ToolCallingHandler.ts`
  - `AgentHandler.ts`
  - `SocraticHandler.ts`

## 🔧 INTEGRATION RULES

### **Existing Infrastructure (PRESERVE & USE)**
- `SmartToolDispatcher.ts` - Tool routing
- `ToolExecutorService.ts` - Tool execution
- `ToolRegistry.ts` - Tool management
- `AgentOrchestrator.ts` - Complex workflows
- `AgentStateMachine.ts` - Agent state management
- `CoreTools.ts` - LLM completion & parameters

### **Service Container**
- `ServiceContainer.ts` uses **REAL** services (no stubs)
- All dependencies injected through DI container
- Access pattern: `serviceContainer.get('serviceName')`

## 🚫 STRICT PROHIBITIONS

1. **NEVER** recreate existing tool execution logic
2. **NEVER** bypass AIRouter for AI processing
3. **NEVER** create duplicate service functionality
4. **NEVER** modify core architecture without explicit approval

## ✅ EXTENSION PATTERNS

### **New AI Mode**
```typescript
// 1. Create handler in src/ai/handlers/
// 2. Register in ServiceContainer
// 3. Add to ModeHandlerFactory
// 4. Update intent detection in IntentAnalysisService
```

### **New Tool**
```typescript
// 1. Use existing ToolRegistry.register()
// 2. Add detection patterns to handlers
// 3. Tool becomes available system-wide
```

## 🔍 VERIFICATION

To verify system integrity:
```bash
# All AI processing should go through AIRouter
grep -r "serviceContainer.get('aiRouter')" src/

# No legacy router references
grep -r "RefactoredAIRouter\|legacyrouter" src/

# Proper import structure
find src/ai -name "*.ts" | xargs grep "import.*from"
```

---
**⚠️ This architecture is FINAL and IMMUTABLE. Changes require explicit user approval.**
