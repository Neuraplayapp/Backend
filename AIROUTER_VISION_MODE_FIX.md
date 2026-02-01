# AIRouter Vision Mode Routing Fix

## Critical Bug Fixed
**Date:** October 12, 2025  
**Issue:** PDFs uploaded with attachments were routed to ToolCallingHandler (memory search) instead of VisionHandler  
**Root Cause:** AIRouter's mode selection logic prioritized canvas activation over explicit vision mode requests

## The Problem

### What Was Happening

1. User uploads PDF in `NeuraPlayAssistantLite`
2. Frontend sends request with `mode: 'vision'` and `attachments: { documents: [...] }`
3. **AIRouter receives the request**
4. Cognitive analyzer detects canvas should activate (for document display)
5. **AIRouter sets mode to 'tool-calling' due to canvas activation** ❌
6. Vision routing logic checks if message matches patterns like "analyze", "describe"
7. Message "📎 Shared 1 file: document.pdf" **doesn't match** patterns
8. **Mode stays as 'tool-calling'** ❌
9. Request goes to **ToolCallingHandler** which treats it as a memory search ❌
10. VisionHandler **never receives the PDF** ❌

### Error Logs
```
AIRouter: Canvas activation detected - switching to tool-calling mode
👁️ AIRouter: Visual content detected
👁️ AIRouter: Visual content will be processed in tool-calling mode  ← WRONG!
🎯 AIRouter - Processing in tool-calling mode
ToolCallingHandler: Processing tool calling mode request
MEMORY MAPPING: Memory request detected  ← WRONG! It's a PDF!
Selected tool: unified_memory_search  ← WRONG! Should be VisionHandler!
```

## The Root Cause

### AIRouter.ts Mode Selection Logic (Lines 237-310)

**Priority Order (OLD - BROKEN):**
1. Canvas activation → Force `'tool-calling'` mode
2. Tool requests → Force `'tool-calling'` mode  
3. Memory requests → Route to `'chat'` mode
4. **Vision content** → Only force `'vision'` mode if message matches keywords ❌

**The Bug:**
```typescript
// Line 242-244: Canvas activation always wins
if (intentAnalysis.canvasActivation?.shouldActivate) {
  mode = 'tool-calling';  // ← Overrides vision mode!
  console.log('🎯 AIRouter: Canvas activation detected - switching to tool-calling mode');
}

// Line 288-310: Vision routing (runs AFTER canvas check)
const hasVisualContent = !!(request.attachments?.images?.length || request.attachments?.documents?.length);
if (hasVisualContent) {
  // Only force vision mode if message matches patterns
  const needsVisionMode = /\b(analyze|describe|what.*see|what.*image|what.*picture|explain.*visual|look at)\b/i.test(request.message);
  if (needsVisionMode && mode !== 'vision') {  // ← Never true because mode already 'tool-calling'
    mode = 'vision';
  }
}
```

**Why It Failed:**
- Canvas activation set mode to `'tool-calling'` BEFORE vision routing
- Vision routing required message to match specific keywords
- User message "📎 Shared 1 file: document.pdf" didn't match patterns
- Even if it did, condition `&& mode !== 'vision'` would be false (mode was 'tool-calling')
- Mode stayed as `'tool-calling'`, never reached VisionHandler

## The Solution

### New Priority Order (FIXED):

**When visual content is detected:**
1. **Frontend explicitly requested vision mode** → Force `'vision'` mode ✅ **NEW!**
2. Message indicates vision analysis → Force `'vision'` mode
3. Otherwise → Keep current mode (tool-calling, chat, etc.)

### Code Changes (AIRouter.ts Lines 288-317)

```typescript
// VISION ROUTING: Override to vision mode if explicitly needed
const hasVisualContent = !!(request.attachments?.images?.length || request.attachments?.documents?.length);
if (hasVisualContent) {
  console.log('👁️ AIRouter: Visual content detected');
  
  // Update vision context for all modes
  if (!request.visionContext) {
    request.visionContext = {
      hasVisualContent: true,
      requiresVisionAnalysis: true,
      cacheKey: `vision_${request.sessionId}_${Date.now()}`
    };
  }
  
  // ✅ PRIORITY 1: Frontend explicitly requested vision mode (e.g., file upload with attachments)
  if (request.mode === 'vision') {
    mode = 'vision';
    console.log('👁️ AIRouter: Explicit vision mode requested from frontend, routing to vision handler');
  }
  // PRIORITY 2: Message indicates vision analysis needed
  else {
    const needsVisionMode = /\b(analyze|describe|what.*see|what.*image|what.*picture|explain.*visual|look at|what.*document|what.*file|what.*pdf)\b/i.test(request.message);
    if (needsVisionMode) {
      console.log('👁️ AIRouter: Vision analysis keywords detected, routing to vision handler');
      mode = 'vision';
    } else {
      console.log('👁️ AIRouter: Visual content will be processed in', mode, 'mode');
    }
  }
}
```

### Key Improvements

✅ **Respects Frontend Intent:** When `NeuraPlayAssistantLite` sends `mode: 'vision'`, AIRouter **always** routes to VisionHandler

✅ **Canvas Compatible:** Vision mode can still activate canvas after processing the document

✅ **Better Keyword Detection:** Added `what.*document`, `what.*file`, `what.*pdf` to vision patterns

✅ **Explicit Priority:** Vision mode check now has clear priority levels with comments

## How It Works Now

### Flow (CORRECT):
1. User uploads PDF → `NeuraPlayAssistantLite.tsx` line 897
2. Frontend sends: `{ mode: 'vision', attachments: { documents: [...] } }`
3. AIRouter receives request
4. Canvas activation detected → mode set to `'tool-calling'`
5. **Vision routing checks `request.mode === 'vision'`** ✅
6. **Mode overridden back to `'vision'`** ✅
7. **Request routed to VisionHandler** ✅
8. VisionHandler calls VisionService
9. VisionService processes PDF with Scout/Maverick
10. Response returned to user

### Expected Logs (CORRECT):
```
AIRouter: Canvas activation detected - switching to tool-calling mode
👁️ AIRouter: Visual content detected
👁️ AIRouter: Explicit vision mode requested from frontend, routing to vision handler  ← FIXED!
🎯 AIRouter - Processing in vision mode  ← FIXED!
👁️ VisionHandler: Processing multimodal request
👁️ Attachments: {hasImages: false, hasDocuments: true, totalFiles: 1}
🔍 DEBUG: VisionService received request.documents: [...]
📄 Processing document.pdf (application/pdf, 6.41MB)
```

## Testing

### Test Case 1: File Upload Without Message
- **Action:** Upload PDF, press send (no text message)
- **Expected:** Routes to VisionHandler, processes with Scout
- **Message:** "📎 Shared 1 file: document.pdf"

### Test Case 2: File Upload With Generic Message  
- **Action:** Upload PDF, type "what is this"
- **Expected:** Routes to VisionHandler (frontend mode: 'vision')
- **Result:** Scout analyzes the PDF

### Test Case 3: File Upload With Vision Keywords
- **Action:** Upload PDF, type "analyze this document"
- **Expected:** Routes to VisionHandler (matches keywords)
- **Result:** Scout analyzes the PDF

### Test Case 4: File Upload With Canvas Request
- **Action:** Upload PDF, type "create a document from this"
- **Expected:** Routes to VisionHandler first, then activates canvas
- **Result:** Scout analyzes, canvas displays summary

## Related Fixes

This fix works together with:
1. **VISION_FILE_OBJECT_FIX.md** - Fixes FileReader Blob error in VisionService
2. **VisionService.ts Debug Logs** - Tracks document structure through processing

## Files Modified
- `src/ai/AIRouter.ts` (Lines 288-317)
  - Added explicit check for `request.mode === 'vision'`
  - Reordered priority: frontend mode > keywords > default
  - Enhanced vision keyword patterns
  - Added detailed logging for debugging

## Impact

✅ **Critical Fix:** Unblocks ALL document vision analysis  
✅ **Frontend Intent Respected:** Vision mode requests honored  
✅ **Canvas Still Works:** Canvas can activate after vision processing  
✅ **Backward Compatible:** Keyword-based detection still works as fallback  

---

**Status:** ✅ Fixed and ready for testing  
**Priority:** P0 - Critical user-facing bug  
**Risk:** Low - Only changes mode routing logic, doesn't affect handlers

