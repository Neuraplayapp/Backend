/**
 * 🎯 Canvas Access Tracker
 * 
 * Tracks which canvas documents were accessed and when.
 * Enables "last opened" priority for assistant awareness.
 * 
 * Storage: localStorage for persistence across sessions
 * Priority: Last opened > Most recently created
 * 
 * DOES NOT INTERFERE WITH:
 * - Canvas version system (canvasStore)
 * - Memory vectorization (MemoryDatabaseBridge)
 * - Existing canvas-document interaction
 */

import { useCanvasStore, type CanvasElement } from '../stores/canvasStore';

export interface CanvasAccessRecord {
  elementId: string;
  conversationId: string;
  type: 'document' | 'code' | 'chart' | 'image' | 'diagram';
  title: string;
  lastAccessedAt: number;  // Unix timestamp
  createdAt: number;       // Unix timestamp
  accessCount: number;
  preview?: string;        // First 100 chars of content
}

const STORAGE_KEY = 'neuraplay_canvas_access_tracker';
const MAX_TRACKED_CANVASES = 50; // Keep track of last 50 canvases

class CanvasAccessTrackerService {
  private static instance: CanvasAccessTrackerService;
  private accessRecords: Map<string, CanvasAccessRecord> = new Map();
  private initialized = false;

  private constructor() {
    this.load();
  }

  static getInstance(): CanvasAccessTrackerService {
    if (!CanvasAccessTrackerService.instance) {
      CanvasAccessTrackerService.instance = new CanvasAccessTrackerService();
    }
    return CanvasAccessTrackerService.instance;
  }

  /**
   * Load access records from localStorage
   */
  private load(): void {
    if (this.initialized) return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((record: CanvasAccessRecord) => {
            this.accessRecords.set(record.elementId, record);
          });
        }
      }
      this.initialized = true;
      console.log('📂 CanvasAccessTracker: Loaded', this.accessRecords.size, 'records');
    } catch (error) {
      console.warn('⚠️ CanvasAccessTracker: Failed to load:', error);
      this.accessRecords = new Map();
      this.initialized = true;
    }
  }

  /**
   * Save access records to localStorage
   */
  private save(): void {
    try {
      const records = Array.from(this.accessRecords.values());
      
      // Keep only the most recent records
      if (records.length > MAX_TRACKED_CANVASES) {
        records.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
        const toKeep = records.slice(0, MAX_TRACKED_CANVASES);
        this.accessRecords.clear();
        toKeep.forEach(r => this.accessRecords.set(r.elementId, r));
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.accessRecords.values())));
    } catch (error) {
      console.warn('⚠️ CanvasAccessTracker: Failed to save:', error);
    }
  }

  /**
   * Track that a canvas was accessed (opened/viewed)
   * Call this when user opens a canvas document
   */
  trackAccess(element: CanvasElement, conversationId: string): void {
    const title = element.content?.title || element.content?.filename || 'Untitled';
    const preview = this.extractPreview(element);
    
    const existingRecord = this.accessRecords.get(element.id);
    
    const record: CanvasAccessRecord = {
      elementId: element.id,
      conversationId: conversationId,
      type: element.type as any,
      title,
      lastAccessedAt: Date.now(),
      createdAt: existingRecord?.createdAt || new Date(element.timestamp).getTime(),
      accessCount: (existingRecord?.accessCount || 0) + 1,
      preview
    };
    
    this.accessRecords.set(element.id, record);
    this.save();
    
    console.log('👁️ CanvasAccessTracker: Tracked access to', title, '(', element.id, ')');
  }

  /**
   * Track canvas creation
   */
  trackCreation(element: CanvasElement, conversationId: string): void {
    const title = element.content?.title || element.content?.filename || 'Untitled';
    const preview = this.extractPreview(element);
    
    const record: CanvasAccessRecord = {
      elementId: element.id,
      conversationId: conversationId,
      type: element.type as any,
      title,
      lastAccessedAt: Date.now(),
      createdAt: Date.now(),
      accessCount: 1,
      preview
    };
    
    this.accessRecords.set(element.id, record);
    this.save();
    
    console.log('✨ CanvasAccessTracker: Tracked creation of', title, '(', element.id, ')');
  }

  /**
   * Extract preview text from canvas element
   */
  private extractPreview(element: CanvasElement): string {
    try {
      switch (element.type) {
        case 'document':
          const docContent = element.content?.content || element.versions?.[0]?.content || '';
          return docContent.replace(/[#*_\[\]]/g, '').substring(0, 100).trim();
        case 'code':
          return `${element.content?.language || 'code'}: ${(element.content?.code || '').substring(0, 80)}`;
        case 'chart':
          return `${element.content?.chartType || 'chart'} chart`;
        default:
          return '';
      }
    } catch {
      return '';
    }
  }

  /**
   * Get the last opened canvas (most recently accessed)
   */
  getLastOpened(): CanvasAccessRecord | null {
    if (this.accessRecords.size === 0) return null;
    
    const records = Array.from(this.accessRecords.values());
    records.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    return records[0] || null;
  }

  /**
   * Get the last opened canvas for a specific conversation
   */
  getLastOpenedForConversation(conversationId: string): CanvasAccessRecord | null {
    const records = Array.from(this.accessRecords.values())
      .filter(r => r.conversationId === conversationId);
    
    if (records.length === 0) return null;
    
    records.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    return records[0];
  }

  /**
   * Get all canvases sorted by priority:
   * 1. Last accessed (most recently opened first)
   * 2. Then by creation date (newest first)
   */
  getAllCanvasesSorted(): CanvasAccessRecord[] {
    const records = Array.from(this.accessRecords.values());
    
    // Sort by lastAccessedAt (desc), then createdAt (desc) as tiebreaker
    records.sort((a, b) => {
      const accessDiff = b.lastAccessedAt - a.lastAccessedAt;
      if (accessDiff !== 0) return accessDiff;
      return b.createdAt - a.createdAt;
    });
    
    return records;
  }

  /**
   * Get canvases filtered by type
   */
  getCanvasesByType(type: 'document' | 'code' | 'chart' | 'all'): CanvasAccessRecord[] {
    const all = this.getAllCanvasesSorted();
    if (type === 'all') return all;
    return all.filter(r => r.type === type);
  }

  /**
   * Delete a canvas from tracking
   */
  deleteRecord(elementId: string): void {
    if (this.accessRecords.has(elementId)) {
      this.accessRecords.delete(elementId);
      this.save();
      console.log('🗑️ CanvasAccessTracker: Deleted record', elementId);
    }
  }

  /**
   * Get canvas context for assistant awareness
   * Returns prioritized list of canvases with last-opened first
   */
  getCanvasContextForAssistant(limit: number = 5): { 
    lastOpened: CanvasAccessRecord | null;
    recentCanvases: CanvasAccessRecord[];
    hasActiveCanvas: boolean;
  } {
    const lastOpened = this.getLastOpened();
    const recentCanvases = this.getAllCanvasesSorted().slice(0, limit);
    
    // Consider "active" if last opened within 30 minutes
    const ACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes
    const hasActiveCanvas = lastOpened !== null && 
      (Date.now() - lastOpened.lastAccessedAt) < ACTIVE_THRESHOLD;
    
    return {
      lastOpened,
      recentCanvases,
      hasActiveCanvas
    };
  }

  /**
   * Sync with canvas store - ensure tracking is up to date
   * Call this periodically or when conversations change
   */
  syncWithCanvasStore(): void {
    try {
      const store = useCanvasStore.getState();
      const allConversations = Object.entries(store.canvasElementsByConversation);
      
      for (const [conversationId, elements] of allConversations) {
        if (!Array.isArray(elements)) continue;
        
        for (const element of elements) {
          // Skip archived elements
          if (element.state === 'archived') continue;
          
          // If not tracked, add as creation
          if (!this.accessRecords.has(element.id)) {
            this.trackCreation(element, conversationId);
          } else {
            // Update preview/title if changed
            const existing = this.accessRecords.get(element.id)!;
            const newTitle = element.content?.title || element.content?.filename || 'Untitled';
            const newPreview = this.extractPreview(element);
            
            if (existing.title !== newTitle || existing.preview !== newPreview) {
              existing.title = newTitle;
              existing.preview = newPreview;
              this.accessRecords.set(element.id, existing);
            }
          }
        }
      }
      
      this.save();
      console.log('🔄 CanvasAccessTracker: Synced with canvas store');
    } catch (error) {
      console.warn('⚠️ CanvasAccessTracker: Sync failed:', error);
    }
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.accessRecords.clear();
    localStorage.removeItem(STORAGE_KEY);
    console.log('🧹 CanvasAccessTracker: Cleared all records');
  }

  /**
   * Get stats for debugging
   */
  getStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    this.accessRecords.forEach(r => {
      byType[r.type] = (byType[r.type] || 0) + 1;
    });
    
    return {
      total: this.accessRecords.size,
      byType
    };
  }
}

// Export singleton instance
export const canvasAccessTracker = CanvasAccessTrackerService.getInstance();

// Export for direct imports
export default canvasAccessTracker;

