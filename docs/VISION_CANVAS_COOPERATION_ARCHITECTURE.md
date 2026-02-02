# Vision-Canvas Cooperation Architecture

## 🏗️ System Overview

**ROBUST & FLAWLESS PIPELINE**: Vision Models → GPT OSS 120B → Canvas Generation

This architecture enables seamless cooperation between:
1. **Vision Models** (Llama 4 Maverick Vision / Scout) - Multimodal analysis
2. **GPT OSS 120B** - Structured content generation  
3. **Canvas System** - Visual presentation layer

---

## 📋 Component Roles

### 1. Vision Models (Maverick & Scout)
**Purpose**: Multimodal input processing  
**Capabilities**:
- PDF document analysis (text + visual)
- Image analysis and OCR
- Chart/graph data extraction
- Screenshot code extraction
- Multi-page document understanding

**Models**:
- `Llama 4 Maverick Vision` - General vision tasks (8K context)
- `Llama 4 Scout` - Large documents up to 150MB (128K context)

### 2. GPT OSS Models
**Purpose**: Structured content generation from vision analysis  
**Capabilities**:
- Document generation with proper formatting
- Chart data structuring
- Code extraction and formatting
- Semantic understanding and synthesis

**Models**:
- `GPT OSS 120B` - Documents & charts (advanced reasoning)
- `GPT OSS 20B` - Code generation (specialized)

### 3. Canvas System
**Purpose**: Visual presentation and interaction  
**Components**:
- `CanvasStateAdapter` - State management
- `DocumentCanvasBridge` - Document rendering
- Chart/Code renderers

---

## 🔄 Processing Pipeline

```
┌─────────────┐
│   User      │
│  Uploads    │
│ PDF/Image   │
└─────┬───────┘
      │
      ▼
┌─────────────────────────────────┐
│  VisionCanvasBridge             │
│  (Orchestration Layer)          │
└─────┬───────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│  Step 1: Vision Analysis        │
│  -------------------------      │
│  Vision Models process:         │
│  • PDFs → Llama 4 Scout         │
│  • Images → Llama 4 Maverick    │
│                                 │
│  Output:                        │
│  • Extracted text               │
│  • Detected objects/data        │
│  • OCR content                  │
│  • Combined insights            │
└─────┬───────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│  Step 2: Canvas Type Detection  │
│  -------------------------      │
│  Analyze vision output to       │
│  determine canvas type:         │
│  • Document (text-heavy)        │
│  • Chart (data/numbers)         │
│  • Code (syntax detected)       │
└─────┬───────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│  Step 3: Content Generation     │
│  -------------------------      │
│  GPT OSS 120B/20B generates:    │
│  • Structured documents         │
│  • Formatted charts             │
│  • Clean code blocks            │
│                                 │
│  Input: Vision analysis context │
│  Output: Structured JSON        │
└─────┬───────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│  Step 4: Canvas Rendering       │
│  -------------------------      │
│  CanvasStateAdapter adds:       │
│  • Document elements            │
│  • Chart visualizations         │
│  • Code editors                 │
└─────┬───────────────────────────┘
      │
      ▼
┌─────────────┐
│   Canvas    │
│  Display    │
└─────────────┘
```

---

## 🎯 Use Cases

### 1. PDF Document Analysis → Structured Document
**Flow**:
1. User uploads PDF report
2. Llama 4 Scout (128K context) analyzes entire document
3. GPT OSS 120B synthesizes into well-formatted document
4. Canvas displays formatted markdown with sections

**Example**: Research paper → Executive summary with key findings

### 2. Chart/Graph Image → Interactive Chart
**Flow**:
1. User uploads chart screenshot
2. Llama 4 Maverick Vision extracts data points and labels
3. GPT OSS 120B structures data into chart format
4. Canvas renders interactive chart (ECharts/Plotly)

**Example**: Bar chart image → Interactive bar chart with hover tooltips

### 3. Code Screenshot → Editable Code
**Flow**:
1. User uploads code screenshot
2. Llama 4 Maverick Vision performs OCR and extracts code
3. GPT OSS 20B formats and validates code
4. Canvas displays in CodeMirror editor

**Example**: Python screenshot → Formatted Python with syntax highlighting

### 4. Multi-page PDF → Multiple Canvas Elements
**Flow**:
1. User uploads 50-page technical document
2. Llama 4 Scout processes all pages (128K context)
3. GPT OSS 120B generates:
   - Summary document
   - Charts from data sections
   - Code examples from technical sections
4. Canvas displays multiple coordinated elements

---

## 🔧 Implementation Details

### VisionCanvasBridge Service

**Main Method**: `processVisionToCanvas()`

**Parameters**:
```typescript
interface VisionCanvasRequest {
  files: File[];              // PDFs, images, documents
  prompt?: string;            // User's intent
  context?: string;           // Additional context
  canvasType: 'auto' | 'document' | 'chart' | 'code';
  sessionId: string;          // For conversation tracking
}
```

**Returns**:
```typescript
interface VisionCanvasResult {
  success: boolean;
  visionAnalysis?: VisionResponse;      // From Vision Model
  canvasElements?: Array<{              // Generated for canvas
    id: string;
    type: 'document' | 'chart' | 'code';
    content: any;
  }>;
  error?: string;
  processingSteps?: string[];           // For debugging
}
```

### Integration Points

#### 1. AIRouter Integration
```typescript
// In VisionHandler
if (hasDocuments || hasImages) {
  const result = await visionCanvasBridge.processVisionToCanvas({
    files: attachments,
    prompt: message,
    context: conversationContext,
    canvasType: 'auto',
    sessionId: sessionId
  });
  
  // Canvas elements automatically added to store
  return formatResponse(result);
}
```

#### 2. Tool Calling Integration
```typescript
// New tool: vision-canvas-generation
{
  name: 'vision-canvas-generation',
  execute: async (params) => {
    return await visionCanvasBridge.processVisionToCanvas({
      files: params.files,
      prompt: params.request,
      canvasType: params.type || 'auto',
      sessionId: params.sessionId
    });
  }
}
```

---

## 🎨 Canvas Type Detection Logic

**Document Detection**:
- Large text blocks
- Paragraphs and sections
- Minimal data/numbers
- No code syntax

**Chart Detection**:
- Numerical data series
- Keywords: "chart", "graph", "data", "series"
- Table structures
- Axis labels

**Code Detection**:
- Syntax patterns: `function`, `class`, `import`, `const`
- Code blocks with ```
- Programming language indicators

---

## 🚀 Performance Optimization

### Model Selection Strategy

| Document Type | Size | Model | Context | Reason |
|--------------|------|-------|---------|--------|
| Small PDF | <5MB | Maverick | 8K | Fast, efficient |
| Large PDF | 5-150MB | Scout | 128K | Large context needed |
| Images | Any | Maverick | 8K | Vision optimized |
| Code screenshots | Any | Maverick | 8K | OCR + syntax detection |

### Caching Strategy

```typescript
// Vision results cached for 30 minutes
cacheKey = hash(fileContent + prompt + context)

// GPT OSS generation cached for reuse
generationCacheKey = hash(visionResult + canvasType + prompt)
```

---

## 🛡️ Error Handling

### Graceful Degradation

1. **Vision Model Fails**:
   - Attempt text extraction fallback
   - Use basic OCR
   - Return error message to user

2. **GPT OSS Generation Fails**:
   - Use vision output directly
   - Create basic formatting
   - Notify user of limited formatting

3. **Canvas Rendering Fails**:
   - Display as text fallback
   - Log error for debugging
   - Provide download option

### Retry Logic

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Exponential backoff for API failures
```

---

## 📊 Success Metrics

- **Vision Accuracy**: >95% text extraction from PDFs
- **Generation Quality**: >90% user satisfaction with canvas output
- **Processing Time**: 
  - Small files (<5MB): <10s
  - Large files (>10MB): <30s
- **Error Rate**: <2% pipeline failures

---

## 🔮 Future Enhancements

1. **Multi-modal Fusion**: Combine text + audio + video analysis
2. **Incremental Processing**: Stream large documents page-by-page
3. **Collaborative Editing**: Real-time canvas updates
4. **Smart Suggestions**: AI-driven layout optimization
5. **Version Control**: Track document evolution
6. **Export Formats**: PDF, DOCX, PPT generation from canvas

---

## 📝 Usage Examples

### Example 1: Academic Paper Analysis
```typescript
const result = await visionCanvasBridge.processVisionToCanvas({
  files: [pdfFile],
  prompt: "Summarize this research paper and create charts for the results section",
  canvasType: 'auto',
  sessionId: 'session_123'
});

// Generates:
// 1. Summary document with methodology and findings
// 2. Charts from results data
// 3. Code examples from implementation section
```

### Example 2: Business Dashboard Screenshot
```typescript
const result = await visionCanvasBridge.processVisionToCanvas({
  files: [dashboardImage],
  prompt: "Extract all charts and metrics from this dashboard",
  canvasType: 'chart',
  sessionId: 'session_456'
});

// Generates:
// Multiple interactive charts matching the dashboard layout
```

### Example 3: Code Tutorial PDF
```typescript
const result = await visionCanvasBridge.processVisionToCanvas({
  files: [tutorialPDF],
  prompt: "Extract all code examples and create a reference document",
  canvasType: 'auto',
  sessionId: 'session_789'
});

// Generates:
// 1. Reference document with explanations
// 2. Multiple code blocks in appropriate languages
```

---

## ✅ Quality Assurance

### Testing Strategy

1. **Unit Tests**: Each component tested independently
2. **Integration Tests**: Full pipeline validation
3. **Visual Regression Tests**: Canvas rendering verification
4. **Performance Tests**: Latency and throughput benchmarks
5. **User Acceptance Tests**: Real-world usage scenarios

### Monitoring

- Vision model response times
- GPT OSS generation quality
- Canvas rendering success rate
- User feedback scores
- Error rates by component

---

## 🎓 Best Practices

1. **Always validate file types before processing**
2. **Use Scout (128K) for documents >10MB**
3. **Cache vision results to avoid re-processing**
4. **Provide clear user feedback during long operations**
5. **Implement proper error boundaries**
6. **Log all processing steps for debugging**
7. **Test with diverse document types**
8. **Optimize prompts for GPT OSS 120B**
9. **Validate generated JSON structures**
10. **Monitor token usage for cost optimization**

---

*Last Updated: October 21, 2025*
*Architecture Version: 1.0*

