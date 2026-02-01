/**
 * 🎯 Universal Canvas Service
 * 
 * Central coordination service for all canvas operations without React dependencies.
 * 
 * Features:
 * - Typewriter management (uses UniversalTypewriterService)
 * - State machine integration (uses CanvasStateService)
 * - Version management (uses CanvasVersionService)
 * - Content formatting coordination
 * - Export/import functionality
 * - Event-based updates for React components
 */

// Browser-compatible EventEmitter
class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  removeAllListeners(): void {
    this.events.clear();
  }
}

import { universalTypewriterService } from './UniversalTypewriterService';
import { getCanvasStateService } from './CanvasStateService';
import { getCanvasVersionService } from './CanvasVersionService';
import type { CanvasElement } from '../stores/canvasStore';

export interface CanvasContentUpdate {
  elementId: string;
  content: string;
  progress: number;
  isTyping: boolean;
}

export interface CanvasElementOptions {
  type: 'document' | 'code' | 'chart';
  content: any;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  metadata?: Record<string, any>;
}

export class UniversalCanvasService extends EventEmitter {
  private sessionId: string;

  constructor(sessionId: string = 'default') {
    super();
    this.sessionId = sessionId;
  }

  /**
   * Create a new canvas element with version and state tracking
   */
  async createElement(options: CanvasElementOptions): Promise<string> {
    const elementId = `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize state machine
    const stateService = getCanvasStateService(this.sessionId);
    stateService.initializeElement(elementId, 'creating');
    
    // Create initial version
    const versionService = getCanvasVersionService(this.sessionId);
    const contentString = typeof options.content === 'string' 
      ? options.content 
      : JSON.stringify(options.content);
    
    await versionService.createVersion(
      elementId,
      contentString,
      'Initial content',
      { ...options.metadata, elementType: options.type }
    );
    
    // Transition to active (fire-and-forget)
    stateService.transition(elementId, 'CREATION_COMPLETE').catch(err => {
      console.warn(`[np] canvas:create transition failed for ${elementId}:`, err);
    });
    
    this.emit('element-created', { elementId, options });
    console.log(`[np] canvas:create ${elementId} type=${options.type}`);
    
    return elementId;
  }

  /**
   * Start typewriter animation for an element
   */
  startTypewriter(
    elementId: string,
    content: string,
    options?: {
      speed?: number;
      onComplete?: () => void;
      onProgress?: (progress: number, text: string) => void;
    }
  ): void {
    // Emit start event for UI tracking
    this.emit('typewriter-start', elementId);
    
    const typewriter = universalTypewriterService.createTypewriter(elementId, {
      content,
      speed: options?.speed || 4,
      startImmediately: true,
      onComplete: () => {
        // 🎯 FIX: Find the element's actual conversationId from canvasStore
        // The element might have been created with a different sessionId than this service instance
        const baseElementId = elementId.replace(/-v\d+$/, '');
        let elementConversationId = this.sessionId;
        
        try {
          // Dynamically import to avoid circular dependency
          const { useCanvasStore } = require('../stores/canvasStore');
          const store = useCanvasStore.getState();
          
          // Search all conversations for this element
          for (const [convId, elements] of Object.entries(store.canvasElementsByConversation)) {
            const found = (elements as any[]).find(el => el.id === baseElementId || el.id === elementId);
            if (found) {
              elementConversationId = convId;
              break;
            }
          }
        } catch (e) {
          // Fall back to service's sessionId
        }
        
        // DEFENSIVE: Check if state machine exists before transitioning
        const stateService = getCanvasStateService(elementConversationId);
        
        // Only attempt transition if state machine is properly initialized
        const currentState = stateService.getState(baseElementId);
        if (currentState) {
          stateService.transition(elementId, 'COMPLETE').then(success => {
            if (!success) {
              console.warn(`[np] canvas:typewriter-complete transition failed for ${elementId}, but typewriter completed successfully`);
            }
          }).catch(err => {
            console.warn(`[np] canvas:typewriter-complete transition error for ${elementId}:`, err);
          });
        } else {
          // 🎯 FIX: If no state machine, try to initialize it now (late initialization)
          try {
            stateService.initializeElement(baseElementId, 'active');
            stateService.transition(baseElementId, 'COMPLETE').catch(() => {});
            console.log(`[np] canvas:typewriter-complete late-initialized state machine for ${baseElementId}`);
          } catch (initError) {
            // This is fine - typewriter still completed successfully
            console.log(`[np] canvas:typewriter-complete skipping state transition - element ${baseElementId} (typewriter success)`);
          }
        }
        
        this.emit('typewriter-complete', elementId);
        if (options?.onComplete) options.onComplete();
      },
      onProgress: (progress, displayedText) => {
        this.emit('content-update', {
          elementId,
          content: displayedText,
          progress,
          isTyping: true
        } as CanvasContentUpdate);
        
        if (options?.onProgress) options.onProgress(progress, displayedText);
      }
    });
    
    console.log(`[np] canvas:typewriter-start ${elementId}`);
  }

  /**
   * Start revision typewriter for document with version history
   */
  startRevisionTypewriter(
    elementId: string,
    revisions: Array<{ version: number; content: string; request?: string }>,
    currentRevision: number,
    options?: {
      speed?: number;
      onRevisionComplete?: (version: number) => void;
      onAllComplete?: () => void;
    }
  ): void {
    // Emit start event for UI tracking
    this.emit('typewriter-start', elementId);
    const typewriter = universalTypewriterService.createRevisionTypewriter(elementId, {
      revisions,
      currentRevision,
      speed: options?.speed || 4,
      onRevisionComplete: (version) => {
        // Freeze the version
        const versionService = getCanvasVersionService(this.sessionId);
        const revision = revisions.find(r => r.version === version);
        if (revision) {
          versionService.freezeVersion(elementId, version, revision.content);
        }
        
        this.emit('revision-complete', { elementId, version });
        if (options?.onRevisionComplete) options.onRevisionComplete(version);
      },
      onAllComplete: () => {
        // 🎯 FIX: Find the element's actual conversationId from canvasStore
        const baseElementId = elementId.replace(/-v\d+$/, '');
        let elementConversationId = this.sessionId;
        
        try {
          const { useCanvasStore } = require('../stores/canvasStore');
          const store = useCanvasStore.getState();
          
          for (const [convId, elements] of Object.entries(store.canvasElementsByConversation)) {
            const found = (elements as any[]).find(el => el.id === baseElementId || el.id === elementId);
            if (found) {
              elementConversationId = convId;
              break;
            }
          }
        } catch (e) { /* Fall back to service's sessionId */ }
        
        // Mark as completed in state machine (fire-and-forget)
        const stateService = getCanvasStateService(elementConversationId);
        const currentState = stateService.getState(baseElementId);
        if (currentState) {
          stateService.transition(elementId, 'COMPLETE').catch(() => {});
        } else {
          try {
            stateService.initializeElement(baseElementId, 'active');
            stateService.transition(baseElementId, 'COMPLETE').catch(() => {});
          } catch (e) { /* Typewriter still completed successfully */ }
        }
        
        this.emit('typewriter-complete', elementId);
        if (options?.onAllComplete) options.onAllComplete();
      }
    });
    
    // Listen to content updates
    typewriter.on('content-update', (content: string) => {
      this.emit('content-update', {
        elementId,
        content,
        progress: 0,
        isTyping: true
      } as CanvasContentUpdate);
    });
    
    console.log(`[np] canvas:revision-typewriter-start ${elementId}`);
  }

  /**
   * Skip typewriter animation
   */
  skipTypewriter(elementId: string): void {
    const typewriter = universalTypewriterService.getTypewriter(elementId);
    if (typewriter) {
      typewriter.skip();
      this.emit('typewriter-stopped', elementId);
      console.log(`[np] canvas:typewriter-skip ${elementId}`);
    }
  }

  /**
   * Add a new version to an element
   */
  async addVersion(
    elementId: string,
    content: string,
    request?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const versionService = getCanvasVersionService(this.sessionId);
    const versionId = await versionService.createVersion(elementId, content, request, metadata);
    
    this.emit('version-added', { elementId, versionId });
    console.log(`[np] canvas:version-add ${elementId} -> ${versionId}`);
    
    return versionId;
  }

  /**
   * Get all versions for an element
   */
  getVersions(elementId: string) {
    const versionService = getCanvasVersionService(this.sessionId);
    return versionService.getVersions(elementId);
  }

  /**
   * Get frozen versions
   */
  getFrozenVersions(elementId: string): Record<number, string> {
    const versionService = getCanvasVersionService(this.sessionId);
    return versionService.getFrozenVersions(elementId);
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(elementId: string, versionId: string): Promise<void> {
    const versionService = getCanvasVersionService(this.sessionId);
    await versionService.rollbackToVersion(elementId, versionId);
    
    this.emit('version-rollback', { elementId, versionId });
    console.log(`[np] canvas:rollback ${elementId} -> ${versionId}`);
  }

  /**
   * Get element state
   */
  getElementState(elementId: string) {
    const stateService = getCanvasStateService(this.sessionId);
    return stateService.getState(elementId);
  }

  /**
   * Transition element state
   */
  async transitionElementState(elementId: string, event: string, metadata?: Record<string, any>): Promise<boolean> {
    const stateService = getCanvasStateService(this.sessionId);
    const success = await stateService.transition(elementId, event, metadata);
    
    if (success) {
      this.emit('state-transition', { elementId, event, newState: stateService.getState(elementId) });
    }
    
    return success;
  }

  /**
   * Export element data
   */
  exportElement(elementId: string): {
    versions: any[];
    state: any;
    frozenVersions: Record<number, string>;
  } {
    const versionService = getCanvasVersionService(this.sessionId);
    const stateService = getCanvasStateService(this.sessionId);
    
    return {
      versions: versionService.getVersions(elementId),
      state: stateService.getState(elementId),
      frozenVersions: versionService.getFrozenVersions(elementId)
    };
  }

  /**
   * Export as file (markdown, code, json, etc.)
   */
  exportAsFile(
    elementId: string,
    type: 'document' | 'code' | 'chart',
    format: 'md' | 'txt' | 'json' | 'js' | 'py' | 'html' | 'csv'
  ): { filename: string; content: string; mimeType: string } {
    const versionService = getCanvasVersionService(this.sessionId);
    const versions = versionService.getVersions(elementId);
    
    let content = '';
    let filename = `canvas-${elementId}`;
    let mimeType = 'text/plain';
    
    switch (type) {
      case 'document':
        // Combine all versions
        content = versions.map(v => v.content).join('\n\n---\n\n');
        filename += format === 'md' ? '.md' : '.txt';
        mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
        break;
        
      case 'code':
        // Get latest version
        content = versions[versions.length - 1]?.content || '';
        const ext = format === 'js' ? '.js' : format === 'py' ? '.py' : format === 'html' ? '.html' : '.txt';
        filename += ext;
        mimeType = format === 'js' ? 'text/javascript' : format === 'py' ? 'text/x-python' : format === 'html' ? 'text/html' : 'text/plain';
        break;
        
      case 'chart':
        // Export chart data
        content = versions[versions.length - 1]?.content || '{}';
        if (format === 'csv') {
          try {
            const data = JSON.parse(content);
            content = this.jsonToCSV(data);
            filename += '.csv';
            mimeType = 'text/csv';
          } catch (e) {
            content = content;
            filename += '.json';
            mimeType = 'application/json';
          }
        } else {
          filename += '.json';
          mimeType = 'application/json';
        }
        break;
    }
    
    return { filename, content, mimeType };
  }

  private jsonToCSV(data: any): string {
    if (!data || !data.series || !Array.isArray(data.series)) {
      return '';
    }
    
    const headers = Object.keys(data.series[0] || {});
    const rows = data.series.map((item: any) => 
      headers.map(h => JSON.stringify(item[h] || '')).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Cleanup
   */
  cleanup(elementId: string): void {
    universalTypewriterService.destroyTypewriter(elementId);
    console.log(`[np] canvas:cleanup ${elementId}`);
  }

  /**
   * Cleanup all
   */
  cleanupAll(): void {
    universalTypewriterService.destroyAll();
    console.log('[np] canvas:cleanup-all');
  }
}

// Singleton instances per session
const canvasServiceInstances: Map<string, UniversalCanvasService> = new Map();

export function getUniversalCanvasService(sessionId?: string): UniversalCanvasService {
  const sid = sessionId || 'default';
  if (!canvasServiceInstances.has(sid)) {
    canvasServiceInstances.set(sid, new UniversalCanvasService(sid));
  }
  return canvasServiceInstances.get(sid)!;
}

