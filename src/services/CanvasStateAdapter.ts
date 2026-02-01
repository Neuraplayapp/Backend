import { useCanvasStore } from '../stores/canvasStore';
import { canvasAccessTracker } from './CanvasAccessTracker';
import { getCanvasStateService } from './CanvasStateService';

type Position = { x: number; y: number };
type Size = { width: number; height: number };

/**
 * 🎯 IMMEDIATE CANVAS VECTORIZATION
 * Stores canvas content in vector DB right away so chat can access it
 * WITHOUT waiting for typewriter to complete or canvas to be viewed
 */
async function immediateCanvasVectorization(
  elementId: string,
  title: string,
  content: string,
  type: 'document' | 'code' | 'chart',
  conversationId: string
): Promise<void> {
  try {
    const { MemoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
    const memoryBridge = new MemoryDatabaseBridge();
    
    // Get userId from localStorage (same logic as NeuraPlayDocumentCanvas)
    let userId = 'anonymous';
    try {
      const storedUser = localStorage.getItem('neuraplay_user') || localStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userId = userData.id || userData.username || userData.email || 'anonymous';
      }
    } catch { /* ignore */ }
    
    console.log('⚡ IMMEDIATE VECTORIZATION:', { title, type, contentLength: content.length, userId });
    
    await memoryBridge.storeMemory({
      userId,
      key: `canvas_document_${elementId}`,
      value: content,
      metadata: {
        type: 'canvas_document',
        isPersonalMemory: false,
        isPersonalRecallable: false,
        supersessionBehavior: 'accumulate',
        title,
        elementId,
        conversationId,
        canvasType: type,
        vectorizedAt: new Date().toISOString(),
        immediate: true  // Mark as immediate vectorization
      }
    });
    
    console.log('✅ IMMEDIATE: Canvas content now available in vector DB for chat');
  } catch (error) {
    console.warn('⚠️ Immediate vectorization failed (non-critical):', error);
    // Non-critical - the component will vectorize later anyway
  }
}

export type DocumentInbound = {
  title: string;
  content: string;
  metadata?: any;
  exportFormats?: string[];
  position?: Position;
  size?: Size;
};

export type ChartInbound = {
  title: string;
  chartType: string;
  series: any[];
  config?: any;
  userRequest?: string;
  position?: Position;
  size?: Size;
};

export type CodeInbound = {
  language: string;
  code: string;
  live?: boolean;
  title?: string;
  description?: string;
  position?: Position;
  size?: Size;
};

export const CanvasStateAdapter = {
  addDocument(input: DocumentInbound) {
    try {
      const { addCanvasElement } = useCanvasStore.getState();
      
      // CRITICAL FIX: Validate that store exists and function is available
      if (!addCanvasElement || typeof addCanvasElement !== 'function') {
        console.error('[np] adapter:add document FAILED - store not initialized');
        throw new Error('Canvas store not properly initialized. Please refresh the page.');
      }
      
      // Unwrap nested shapes from various producers: {documentData:{...}} or raw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = (input as any).documentData ? (input as any).documentData : input;
      const position = raw.position ?? input.position ?? { x: 100, y: 100 };
      const size = raw.size ?? input.size ?? { width: 800, height: 600 };
      const metadata = raw.metadata ?? input.metadata ?? {};
      const sections = Array.isArray(metadata.sections) ? metadata.sections : [];
      
      // Single format: content stored in versions array only
      const documentContent = raw.content ?? input.content ?? '';
      const documentTitle = raw.title ?? input.title ?? 'Document';
      
      const content = {
        type: 'document' as const,
        title: documentTitle,
        metadata: {
          wordCount: Number(metadata.wordCount ?? 0),
          readingTime: Number(metadata.readingTime ?? 0),
          sections,
          type: metadata.type ?? 'document',
          style: metadata.style ?? ''
        },
        exportFormats: raw.exportFormats ?? input.exportFormats ?? ['pdf', 'docx', 'txt', 'html']
      };
      
      // Create versions array with initial content
      const versions = [{
        id: 'v1',
        version: 1,
        content: documentContent,
        state: 'typing' as const,
        timestamp: Date.now(),
        request: 'Initial version'
      }];
      
      const id = addCanvasElement({ 
        type: 'document', 
        content, 
        position, 
        size, 
        layer: 1,
        state: 'creating',
        currentVersion: 1,
        versions
      });
      
      // 🎯 TRACK CANVAS CREATION: Register this document for access tracking
      const store = useCanvasStore.getState();
      const conversationId = store.currentConversationId;
      
      // 🎯 INITIALIZE STATE MACHINE: Required for typewriter completion to work
      try {
        const stateService = getCanvasStateService(conversationId);
        stateService.initializeElement(id, 'creating');
        console.log(`[np] adapter:add document - state machine initialized for ${id}`);
      } catch (stateError) {
        console.warn('[np] adapter: state machine init failed (typewriter may not track state):', stateError);
      }
      try {
        const elements = store.canvasElementsByConversation[conversationId] || [];
        const createdElement = elements.find(el => el.id === id);
        if (createdElement) {
          canvasAccessTracker.trackCreation(createdElement, conversationId);
        }
      } catch (trackError) {
        console.warn('[np] adapter: canvas tracking failed (non-critical):', trackError);
      }
      
      // ⚡ IMMEDIATE VECTORIZATION: Make content available to chat RIGHT AWAY
      // Don't await - let it run in background so UI isn't blocked
      immediateCanvasVectorization(id, documentTitle, documentContent, 'document', conversationId)
        .catch(err => console.warn('[np] adapter: background vectorization failed:', err));
      
      try { window.dispatchEvent(new CustomEvent('np:adapter:add', { detail: { type: 'document', id, position, size } })); } catch {}
      console.info('[np] adapter:add document', { id, title: content.title, position, size, versions: versions.length });
      return id;
    } catch (error) {
      console.error('[np] adapter:add document FATAL ERROR:', error);
      // Don't throw - return a fallback ID to prevent cascading failures
      const fallbackId = `doc-error-${Date.now()}`;
      console.warn('[np] adapter:add document - returning fallback ID:', fallbackId);
      return fallbackId;
    }
  },

  addChart(input: ChartInbound) {
    const { addCanvasElement } = useCanvasStore.getState();
    // Normalize multiple inbound shapes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = input as any;
    const position = raw.position ?? { x: 120, y: 120 };
    const size = raw.size ?? { width: 600, height: 400 };
    const seriesSource = Array.isArray(raw.series) ? raw.series : (Array.isArray(raw.data) ? raw.data : []);
    const series = seriesSource.map((item: any, index: number) => {
      if (item && typeof item === 'object') {
        if ('x' in item || 'y' in item) return item;
        if ('label' in item || 'value' in item) return { x: item.label, y: item.value };
      }
      return { x: `Item ${index + 1}`, y: Number(item ?? 0) };
    });
    const content = {
      title: raw.title ?? 'Chart',
      chartType: (raw.chartType ?? raw.type ?? 'bar').toString(),
      series,
      config: raw.config ?? {},
      userRequest: raw.userRequest ?? input.userRequest ?? '' // Pass user request for manual parsing
    };
    
    // NEW: Create proper versions array for chart canvas
    const chartDataString = JSON.stringify({ chartType: content.chartType, title: content.title, series: content.series });
    const versions = [{
      id: 'v1',
      version: 1,
      content: chartDataString,
      state: 'displayed' as const, // Charts show immediately (no typewriter)
      timestamp: Date.now(),
      request: 'Initial chart data'
    }];
    
    const id = addCanvasElement({ 
      type: 'chart', 
      content, 
      position, 
      size, 
      layer: 1,
      state: 'active',
      currentVersion: 1,
      versions
    });
    
    // 🎯 TRACK CANVAS CREATION: Register this chart for access tracking
      const store = useCanvasStore.getState();
      const conversationId = store.currentConversationId;
    
    // 🎯 INITIALIZE STATE MACHINE: Charts start as 'active' since they display immediately
    try {
      const stateService = getCanvasStateService(conversationId);
      stateService.initializeElement(id, 'active');
      console.log(`[np] adapter:add chart - state machine initialized for ${id}`);
    } catch (stateError) {
      console.warn('[np] adapter: chart state machine init failed:', stateError);
    }
    
    try {
      const elements = store.canvasElementsByConversation[conversationId] || [];
      const createdElement = elements.find(el => el.id === id);
      if (createdElement) {
        canvasAccessTracker.trackCreation(createdElement, conversationId);
      }
    } catch (trackError) {
      console.warn('[np] adapter: chart tracking failed (non-critical):', trackError);
    }
    
    try { window.dispatchEvent(new CustomEvent('np:adapter:add', { detail: { type: 'chart', id, position, size } })); } catch {}
    console.info('[np] adapter:add chart', { id, title: content.title, chartType: content.chartType, position, size });
    return id;
  },

  addCode(input: CodeInbound) {
    const { addCanvasElement } = useCanvasStore.getState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = (input as any).data ? (input as any).data : input;
    const position = raw.position ?? input.position ?? { x: 120, y: 120 };
    const size = raw.size ?? input.size ?? { width: 800, height: 600 };
    const language = (raw.language ?? input.language ?? 'javascript').toString();
    const code = raw.code ?? input.code ?? '';
    const content = {
      language,
      code,
      live: Boolean(raw.live ?? input.live ?? true),
      title: raw.title ?? input.title ?? 'Generated Code',
      description: raw.description ?? input.description ?? ''
    };
    
    // NEW: Create proper versions array for code canvas
    const versions = [{
      id: 'v1',
      version: 1,
      content: code,
      state: 'typing' as const, // Trigger typewriter animation for code too
      timestamp: Date.now(),
      request: 'Initial code'
    }];
    
    const id = addCanvasElement({ 
      type: 'code', 
      content, 
      position, 
      size, 
      layer: 1,
      state: 'active',
      currentVersion: 1,
      versions
    });
    
    // 🎯 TRACK CANVAS CREATION: Register this code canvas for access tracking
    const store = useCanvasStore.getState();
    const conversationId = store.currentConversationId;
    
    // 🎯 INITIALIZE STATE MACHINE: Code starts as 'creating' for typewriter
    try {
      const stateService = getCanvasStateService(conversationId);
      stateService.initializeElement(id, 'creating');
      console.log(`[np] adapter:add code - state machine initialized for ${id}`);
    } catch (stateError) {
      console.warn('[np] adapter: code state machine init failed:', stateError);
    }
    
    try {
      const elements = store.canvasElementsByConversation[conversationId] || [];
      const createdElement = elements.find(el => el.id === id);
      if (createdElement) {
        canvasAccessTracker.trackCreation(createdElement, conversationId);
      }
    } catch (trackError) {
      console.warn('[np] adapter: code tracking failed (non-critical):', trackError);
    }
    
    // ⚡ IMMEDIATE VECTORIZATION: Make code content available to chat RIGHT AWAY
    const codeContent = `// ${content.language}\n// ${content.title || 'Code'}\n\n${code}`;
    immediateCanvasVectorization(id, content.title || 'Code', codeContent, 'code', conversationId)
      .catch(err => console.warn('[np] adapter: code vectorization failed:', err));
    
    try { window.dispatchEvent(new CustomEvent('np:adapter:add', { detail: { type: 'code', id, position, size } })); } catch {}
    console.info('[np] adapter:add code', { id, language: content.language, position, size });
    return id;
  },

  updateDocument(elementId: string, updates: Partial<DocumentInbound>) {
    try {
      const { updateCanvasElement, getCurrentCanvasElements } = useCanvasStore.getState();
      
      if (!updateCanvasElement || !getCurrentCanvasElements) {
        console.error('[np] adapter:update document FAILED - store not initialized');
        return elementId;
      }
    
    const currentElements = getCurrentCanvasElements();
    const currentElement = currentElements.find(el => el.id === elementId);
    
    if (!currentElement) {
      console.error('[np] adapter:update - Element not found:', elementId);
      return elementId;
    }
    
    // Update only metadata and title (content lives in versions)
    const existingContent = currentElement.content || {};
    
    const content = {
      ...existingContent,
      type: 'document' as const,
      title: updates.title !== undefined ? updates.title : existingContent.title,
      metadata: {
        ...(existingContent.metadata || {}),
        wordCount: updates.metadata?.wordCount || existingContent.metadata?.wordCount || 0,
        readingTime: updates.metadata?.readingTime || existingContent.metadata?.readingTime || 0,
        sections: updates.metadata?.sections || existingContent.metadata?.sections || []
      },
      exportFormats: updates.exportFormats || existingContent.exportFormats || ['pdf', 'docx', 'txt', 'html']
    };

    const updateData: any = { content };
    if (updates.position) updateData.position = updates.position;
    if (updates.size) updateData.size = updates.size;

    updateCanvasElement(elementId, updateData);
    
    try { 
      window.dispatchEvent(new CustomEvent('np:adapter:update', { 
        detail: { type: 'document', id: elementId } 
      })); 
    } catch {}
    
    console.info('[np] adapter:update document', { id: elementId, title: content.title });
      
    return elementId;
    } catch (error) {
      console.error('[np] adapter:update document FATAL ERROR:', error);
      return elementId;
    }
  },
  
  // Add new version to existing document
  addVersionToDocument(elementId: string, newContent: string, request: string, conversationId?: string) {
    try {
      const { updateCanvasElement, canvasElementsByConversation, currentConversationId } = useCanvasStore.getState();
      
      // Use explicit ID or fall back to current
      const targetConversationId = conversationId || currentConversationId;
      const elements = canvasElementsByConversation[targetConversationId] || [];
      
      console.log('[CanvasAdapter] addVersionToDocument called:', { 
        elementId, 
        targetConversationId, 
        currentConversationId,
        elementCount: elements.length,
        elementIds: elements.map(e => e.id)
      });
      
      const element = elements.find(el => el.id === elementId);
      
      if (!element) {
        const errorMsg = `Element ${elementId} not found in conversation ${targetConversationId}. Available: ${elements.map(e => e.id).join(', ')}`;
        console.error('[CanvasAdapter] CRITICAL ERROR:', errorMsg);
        throw new Error(errorMsg); // Don't fail silently!
      }
      
      // Calculate next version number from actual versions array (prevents duplicates)
      const existingVersions = element.versions || [];
      const maxExistingVersion = existingVersions.length > 0 
        ? Math.max(...existingVersions.map(v => v.version || 0))
        : 0;
      const currentVersion = Math.max(element.currentVersion || 1, maxExistingVersion);
      const newVersion = currentVersion + 1;
      
      // DEDUPLICATION: Remove any existing version with the same number
      const deduplicatedVersions = existingVersions.filter(v => v.version !== newVersion);
      
      const newVersionData = {
        id: `v${newVersion}`,
        version: newVersion,
        content: newContent,
        state: 'typing' as const,
        timestamp: Date.now(),
        request: request || `Version ${newVersion}`
      };
      
      const updatedVersions = [...deduplicatedVersions, newVersionData];
      
      // Sort versions to ensure proper order
      updatedVersions.sort((a, b) => a.version - b.version);
      
      try {
        updateCanvasElement(elementId, {
          currentVersion: newVersion,
          versions: updatedVersions
        });
      } catch (storageError: any) {
        // Handle QuotaExceededError - clean up old data and retry
        if (storageError?.name === 'QuotaExceededError' || 
            storageError?.message?.includes('quota') ||
            storageError?.message?.includes('QuotaExceeded')) {
          console.warn('[CanvasAdapter] Storage quota exceeded, cleaning up...');
          
          // Strategy: Keep only the latest version to save space
          const minimalVersions = [newVersionData];
          
          try {
            updateCanvasElement(elementId, {
              currentVersion: newVersion,
              versions: minimalVersions
            });
            console.info('[CanvasAdapter] Recovered from quota error - kept only latest version');
          } catch (retryError) {
            // Last resort: Clear old conversations to free space
            console.error('[CanvasAdapter] Retry failed, attempting storage cleanup...');
            this.cleanupOldConversations(targetConversationId);
            
            // Final attempt
            updateCanvasElement(elementId, {
              currentVersion: newVersion,
              versions: minimalVersions
            });
          }
        } else {
          throw storageError;
        }
      }
      
      console.info('[CanvasAdapter] Version added:', { elementId, version: newVersion, conversationId: targetConversationId });
      
      // ⚡ IMMEDIATE VECTORIZATION: Make new content available to chat RIGHT AWAY
      const title = element.content?.title || 'Document';
      immediateCanvasVectorization(elementId, title, newContent, 'document', targetConversationId)
        .catch(err => console.warn('[CanvasAdapter] revision vectorization failed:', err));
      
      return newVersion;
    } catch (error) {
      console.error('[CanvasAdapter] addVersionToDocument FATAL ERROR:', error);
      throw error; // Propagate error instead of returning 0
    }
  },
  
  // Clean up old conversations to free storage space
  cleanupOldConversations(keepConversationId: string) {
    try {
      const state = useCanvasStore.getState();
      const allConversations = Object.keys(state.canvasElementsByConversation);
      
      // Remove conversations older than 7 days or if we have more than 10
      const MAX_CONVERSATIONS = 10;
      
      if (allConversations.length > MAX_CONVERSATIONS) {
        console.warn(`[CanvasAdapter] Too many conversations (${allConversations.length}), cleaning up...`);
        
        // Keep current and remove oldest (simple cleanup)
        const toRemove = allConversations
          .filter(id => id !== keepConversationId)
          .slice(0, allConversations.length - MAX_CONVERSATIONS);
        
        const newElements = { ...state.canvasElementsByConversation };
        toRemove.forEach(id => delete newElements[id]);
        
        // Direct localStorage update to bypass zustand persistence
        const stored = localStorage.getItem('neuraplay-canvas-storage');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.state?.canvasElementsByConversation) {
            toRemove.forEach(id => delete parsed.state.canvasElementsByConversation[id]);
            localStorage.setItem('neuraplay-canvas-storage', JSON.stringify(parsed));
          }
        }
        
        console.info(`[CanvasAdapter] Cleaned up ${toRemove.length} old conversations`);
      }
    } catch (cleanupError) {
      console.error('[CanvasAdapter] Cleanup failed:', cleanupError);
    }
  },
  
  // Add new version to code
  addVersionToCode(elementId: string, newCode: string, request: string, conversationId?: string) {
    return this.addVersionToDocument(elementId, newCode, request, conversationId);
  },
  
  // Add new version to chart
  addVersionToChart(elementId: string, newChartData: any, request: string, conversationId?: string) {
    const chartDataString = JSON.stringify(newChartData);
    return this.addVersionToDocument(elementId, chartDataString, request, conversationId);
  }
};

export default CanvasStateAdapter;