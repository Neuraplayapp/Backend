# Canvas System Usage Guide

## Quick Start

### Option 1: Use the Complete Integrated Layout (Recommended)

The `CanvasWithSidebar` component provides the complete clean UI with canvas, revision history, and topic cards:

```tsx
import CanvasWithSidebar from './components/CanvasWithSidebar';
import { useCanvasStore } from './stores/canvasStore';

function MyApp() {
  const currentElements = useCanvasStore(state => 
    state.canvasElementsByConversation[state.currentConversationId] || []
  );
  const conversationId = useCanvasStore(state => state.currentConversationId);

  if (currentElements.length === 0) {
    return <div>No canvas elements</div>;
  }

  return (
    <CanvasWithSidebar
      element={currentElements[0]}
      conversationId={conversationId}
      onClose={() => console.log('Canvas closed')}
    />
  );
}
```

**This gives you:**
- ✅ Main canvas area (70% width) - automatically routes to correct canvas type
- ✅ Right sidebar (30% width) with tabs for History and Suggestions
- ✅ Clean, uncluttered UI with progressive disclosure
- ✅ Collapsible sidebar
- ✅ Smooth animations

---

### Option 2: Use Individual Components

If you need more control, use components separately:

#### A. Render Any Canvas Type

```tsx
import CanvasElementRenderer from './components/CanvasElementRenderer';

<CanvasElementRenderer
  element={canvasElement}
  conversationId={conversationId}
  isFullscreen={false}
  onToggleFullscreen={() => setFullscreen(!isFullscreen)}
  onClose={() => handleClose()}
/>
```

The router automatically uses the correct canvas based on `element.type`:
- `type: 'document'` → NeuraPlayDocumentCanvas
- `type: 'code'` → NeuraPlayCodeCanvas
- `type: 'chart'` → NeuraPlayChartCanvas

#### B. Add Revision History

```tsx
import CanvasRevisionHistory from './components/CanvasRevisionHistory';

<CanvasRevisionHistory
  elementId={element.id}
  sessionId={conversationId}
  onRestore={(versionId) => {
    console.log('User restored version:', versionId);
    // Refresh canvas or show notification
  }}
/>
```

**Features:**
- Timeline view with version markers
- Search through versions
- Click to expand and see content
- Restore previous versions
- Export history as JSON

#### C. Add AI-Powered Suggestions

```tsx
import TopicCardsPanel from './components/TopicCardsPanel';

<TopicCardsPanel
  elementId={element.id}
  content={elementContent}
  contentType={element.type}
  sessionId={conversationId}
  onCardAdded={(cardId) => {
    console.log('User added suggested content:', cardId);
    // Refresh canvas or show notification
  }}
/>
```

**Features:**
- LLM-powered contextual suggestions
- Preview content before adding
- One-click "Add to Canvas"
- Pin/dismiss cards
- Relevance scoring

---

## Creating Canvas Elements

### Create a Document

```tsx
import { useCanvasStore } from './stores/canvasStore';

function MyComponent() {
  const addCanvasElement = useCanvasStore(state => state.addCanvasElement);

  const createDocument = () => {
    const elementId = addCanvasElement({
      type: 'document',
      content: {
        title: 'My Document',
      },
      position: { x: 100, y: 100 },
      size: { width: 800, height: 600 },
      layer: 1,
      state: 'creating',
      currentVersion: 1,
      versions: [{
        id: 'v1',
        version: 1,
        content: '# My Document\n\nStart writing here...',
        state: 'displayed',
        timestamp: Date.now()
      }]
    });

    console.log('Created document:', elementId);
  };

  return <button onClick={createDocument}>Create Document</button>;
}
```

### Create a Code Canvas

```tsx
const createCodeCanvas = () => {
  const elementId = addCanvasElement({
    type: 'code',
    content: {
      title: 'My Script',
      code: 'console.log("Hello World");'
    },
    position: { x: 100, y: 100 },
    size: { width: 800, height: 600 },
    layer: 1,
    metadata: {
      language: 'javascript',
      filename: 'script.js'
    },
    state: 'creating',
    currentVersion: 1,
    versions: [{
      id: 'v1',
      version: 1,
      content: 'console.log("Hello World");',
      state: 'displayed',
      timestamp: Date.now()
    }]
  });
};
```

### Create a Chart Canvas

```tsx
const createChartCanvas = () => {
  const elementId = addCanvasElement({
    type: 'chart',
    content: {
      chartType: 'bar',
      title: 'Sales Data',
      series: [
        { label: 'Q1', value: 100 },
        { label: 'Q2', value: 150 },
        { label: 'Q3', value: 120 },
        { label: 'Q4', value: 180 }
      ]
    },
    position: { x: 100, y: 100 },
    size: { width: 800, height: 600 },
    layer: 1,
    state: 'creating',
    currentVersion: 1,
    versions: [{
      id: 'v1',
      version: 1,
      content: JSON.stringify({
        chartType: 'bar',
        title: 'Sales Data',
        series: [
          { label: 'Q1', value: 100 },
          { label: 'Q2', value: 150 },
          { label: 'Q3', value: 120 },
          { label: 'Q4', value: 180 }
        ]
      }),
      state: 'displayed',
      timestamp: Date.now()
    }]
  });
};
```

---

## Using Services Directly

### Use Universal Canvas Service

```tsx
import { getUniversalCanvasService } from './services/UniversalCanvasService';

const canvasService = getUniversalCanvasService('my-session-id');

// Create element
const elementId = await canvasService.createElement({
  type: 'document',
  content: 'Initial content',
  metadata: { author: 'User' }
});

// Start typewriter
canvasService.startTypewriter(
  elementId,
  'This text will be typed out...',
  {
    speed: 4,
    onComplete: () => console.log('Typing complete!'),
    onProgress: (progress, text) => console.log(`${progress}%: ${text}`)
  }
);

// Add version
await canvasService.addVersion(elementId, 'Updated content', 'User edit');

// Export element
const exportData = canvasService.exportAsFile(elementId, 'document', 'md');
console.log('Filename:', exportData.filename);
console.log('Content:', exportData.content);
```

### Use Code Formatter

```tsx
import { codeFormatterService } from './services/CodeFormatterService';

const unformattedCode = `function test(){console.log('hello');return true;}`;

const formatted = codeFormatterService.format(unformattedCode, 'javascript', {
  tabSize: 2,
  trimTrailingWhitespace: true
});

console.log(formatted);
// Output:
// function test() {
//   console.log('hello');
//   return true;
// }
```

### Use Chart Data Service

```tsx
import { chartDataService } from './services/ChartDataService';

// Parse CSV data
const csvData = `label,value
Q1,100
Q2,150
Q3,120`;

const chartData = chartDataService.parseData(csvData, 'csv');

// Transform for ECharts
const echartOptions = chartDataService.transformForECharts(chartData, 'bar');

// Validate data
const validation = chartDataService.validate(chartData, 'bar');
if (!validation.valid) {
  console.error('Invalid data:', validation.errors);
}

// Export as CSV
const csv = chartDataService.exportAsCSV(chartData);
```

---

## Customization

### Custom Layout

```tsx
// Create your own layout combining components
function CustomCanvasLayout() {
  return (
    <div className="flex h-screen">
      {/* Your custom sidebar */}
      <div className="w-64 bg-gray-800">
        {/* Custom navigation */}
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <CanvasElementRenderer {...props} />
      </div>

      {/* Right panel with your custom content */}
      <div className="w-96 bg-gray-900">
        <CanvasRevisionHistory {...props} />
        <TopicCardsPanel {...props} />
      </div>
    </div>
  );
}
```

### Listen to Service Events

```tsx
import { topicCardService } from './services/TopicCardService';
import { getUniversalCanvasService } from './services/UniversalCanvasService';

useEffect(() => {
  const canvasService = getUniversalCanvasService(conversationId);

  // Listen to content updates
  const handleContentUpdate = (update) => {
    console.log('Content updated:', update);
  };

  // Listen to card generation
  const handleCardsGenerated = (data) => {
    console.log('New suggestions:', data.cards);
  };

  canvasService.on('content-update', handleContentUpdate);
  topicCardService.on('cards-generated', handleCardsGenerated);

  return () => {
    canvasService.off('content-update', handleContentUpdate);
    topicCardService.off('cards-generated', handleCardsGenerated);
  };
}, [conversationId]);
```

---

## Example: Complete Integration

```tsx
import React, { useState } from 'react';
import { useCanvasStore } from './stores/canvasStore';
import CanvasWithSidebar from './components/CanvasWithSidebar';

function CanvasPage() {
  const [showCanvas, setShowCanvas] = useState(false);
  const addCanvasElement = useCanvasStore(state => state.addCanvasElement);
  const currentElements = useCanvasStore(state => 
    state.canvasElementsByConversation[state.currentConversationId] || []
  );
  const conversationId = useCanvasStore(state => state.currentConversationId);

  const createNewDocument = () => {
    addCanvasElement({
      type: 'document',
      content: { title: 'New Document' },
      position: { x: 100, y: 100 },
      size: { width: 800, height: 600 },
      layer: 1,
      state: 'creating',
      currentVersion: 1,
      versions: [{
        id: 'v1',
        version: 1,
        content: '# New Document\n\nStart writing...',
        state: 'displayed',
        timestamp: Date.now()
      }]
    });
    setShowCanvas(true);
  };

  if (!showCanvas || currentElements.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <button
          onClick={createNewDocument}
          className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
        >
          Create New Document
        </button>
      </div>
    );
  }

  return (
    <CanvasWithSidebar
      element={currentElements[0]}
      conversationId={conversationId}
      onClose={() => setShowCanvas(false)}
    />
  );
}

export default CanvasPage;
```

---

## Tips & Best Practices

1. **Always use CanvasElementRenderer** instead of directly importing specific canvas components
2. **Session IDs matter**: Use conversation IDs as session IDs for proper isolation
3. **Content format**:
   - Document: string with markdown
   - Code: string with code or `{ code: string }`
   - Chart: object with `{ chartType, title, series }`
4. **Version tracking**: Services automatically track versions, you don't need to manually manage them
5. **Event-based updates**: Subscribe to service events for real-time updates
6. **Export features**: All canvas types support export functionality
7. **Mobile support**: Use MobileCanvasRenderer for mobile devices (already updated)

---

## Troubleshooting

### Canvas not rendering
- Check that element.type is one of: 'document', 'code', or 'chart'
- Verify element has versions array with at least one version
- Check console for errors

### Typewriter not working
- Ensure element has versions with content
- Check that content is a string (not object) for document/code
- Verify UniversalCanvasService is initialized with correct session ID

### Topic cards not appearing
- Cards appear after ~1 second of analysis
- Need at least 50 characters of content
- Check console for TopicCardService logs

### Code editor not showing
- Verify CodeMirror dependencies are installed
- Check that element.type is 'code'
- Look for CodeMirrorCanvasService logs in console

---

## Advanced: LLM Integration

To connect TopicCardService to a real LLM API:

```tsx
// In src/services/TopicCardService.ts
// Replace the analyzeContent method with actual LLM call:

private async analyzeContent(content: string, contentType: string): Promise<CanvasAnalysis> {
  const response = await fetch('/api/analyze-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, contentType })
  });
  
  const analysis = await response.json();
  return analysis;
}
```

---

**For more information, see:**
- `CANVAS_IMPLEMENTATION_COMPLETE.md` - Full implementation details
- `canvas-integration-fix.plan.md` - Original implementation plan

