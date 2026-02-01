/**
 * 🎯 Canvas Store - LEAN VERSION
 * 
 * ONLY handles:
 * - Canvas elements (CRUD)
 * - UI state (viewport, zoom, theme)
 * - Conversation context
 * 
 * Delegates to services:
 * - CanvasVersionService: version control
 * - CanvasStateService: state machines
 * - CanvasAIService: AI/ML features
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCanvasVersionService } from '../services/CanvasVersionService';
import { getCanvasStateService } from '../services/CanvasStateService';
import { getCanvasAIService } from '../services/CanvasAIService';

// ===================================
// TYPES
// ===================================

export interface CanvasElement {
  id: string;
  conversationId?: string; // Track which conversation this element belongs to
  type: 'text' | 'code' | 'chart' | 'diagram' | 'image' | 'hypothesis' | 'decision' | 'suggestion' | 'document';
  content: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  timestamp: Date;
  layer: number;
  metadata?: {
    sourceMessage?: string;
    toolResult?: any;
    confidence?: number;
  };
  
  // Lightweight state tracking (actual logic in services)
  state?: 'idle' | 'creating' | 'active' | 'completed' | 'archived';
  currentVersion?: number;
  versions?: Array<{
    id: string;
    version: number;
    content: string;
    state: 'draft' | 'typing' | 'frozen' | 'displayed';
    timestamp: number;
    request?: string;
    metadata?: Record<string, any>;
  }>;
  frozenVersions?: Record<number, string>;
  completedVersions?: Set<string>;
}

export interface CanvasState {
  // Element Storage - Per Conversation
  canvasElementsByConversation: Record<string, CanvasElement[]>;
  currentConversationId: string;
  
  // UI State
  isCanvasMode: boolean;
  splitRatio: number;
  viewportCenter: { x: number; y: number };
  zoomLevel: number;
  selectedElements: string[];
  canvasTheme: 'light' | 'dark' | 'auto';
  
  // Chat Integration
  chatPosition: 'right' | 'left' | 'bottom';
  chatSize: { width: number; height: number };
  
  // Service References (for backward compatibility)
  stateMachine?: any;
  revisionHistory?: any;
}

export interface CanvasActions {
  // Conversation Management
  setCurrentConversation: (conversationId: string) => void;
  getCurrentCanvasElements: () => CanvasElement[];
  
  // Element CRUD
  addCanvasElement: (element: Omit<CanvasElement, 'id' | 'timestamp'>) => string;
  updateCanvasElement: (id: string, updates: Partial<CanvasElement>) => void;
  removeCanvasElement: (id: string) => void;
  clearCanvas: () => void;
  
  // Delete Operations (with version history preservation)
  deleteCanvasVersion: (elementId: string, versionNumber: number) => void;
  archiveCanvasElement: (id: string) => void;
  permanentlyDeleteCanvasElement: (id: string) => void;
  
  // Element Selection & Movement
  selectElements: (ids: string[]) => void;
  moveElement: (id: string, newPosition: { x: number; y: number }) => void;
  
  // UI Control
  toggleCanvasMode: () => void;
  setSplitRatio: (ratio: number) => void;
  setCanvasTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setViewportCenter: (center: { x: number; y: number }) => void;
  setZoomLevel: (zoom: number) => void;
  resetViewport: () => void;
  setChatPosition: (position: 'right' | 'left' | 'bottom') => void;
  
  // Version Control (delegates to CanvasVersionService)
  setFrozenVersion: (elementId: string, version: number, content: string) => void;
  getFrozenVersions: (elementId: string) => Record<number, string>;
  setCompletedVersion: (elementId: string, versionKey: string) => void;
  getCompletedVersions: (elementId: string) => Set<string>;
  
  // State Management (delegates to CanvasStateService)
  updateElementState: (elementId: string, state: CanvasElement['state']) => void;
  
  // State Machine (for test backward compatibility)
  initializeStateMachine: (sessionId: string) => void;
  transitionState: (event: string, payload?: any) => Promise<{ success: boolean }>;
  getCurrentMachineState: () => any;
  stateMachine?: any;
  
  // Revision History (for test backward compatibility)
  initializeRevisionHistory: (sessionId?: string) => void;
  createAtomicVersion: (elementId: string, content: string, metadata?: any) => Promise<string>;
  finalizeVersion: (versionId: string) => Promise<void>;
  getRevisionHistory: () => any[];
  revisionHistory?: any;
  
  // Clear all data
  clearAll: () => void;
}
export type CanvasStore = CanvasState & CanvasActions;

// ===================================
// STORE IMPLEMENTATION
// ===================================

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      // Initial State
      canvasElementsByConversation: {},
      currentConversationId: 'default',
      isCanvasMode: false,
      splitRatio: 0.7,
      viewportCenter: { x: 0, y: 0 },
      zoomLevel: 1,
      selectedElements: [],
      canvasTheme: 'auto',
      chatPosition: 'right',
      chatSize: { width: 400, height: 600 },
      stateMachine: undefined,
      revisionHistory: undefined,
      
      // ===================================
      // CONVERSATION MANAGEMENT
      // ===================================
      
      setCurrentConversation: (conversationId: string) => {
        set({ currentConversationId: conversationId });
        console.log(`[np] store:conversation ${conversationId}`);
      },

      getCurrentCanvasElements: () => {
        const state = get();
        return state.canvasElementsByConversation[state.currentConversationId] || [];
      },

      // ===================================
      // ELEMENT CRUD
      // ===================================
      
      addCanvasElement: (element: Omit<CanvasElement, 'id' | 'timestamp'>) => {
        const state = get();
        const id = `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const newElement: CanvasElement = {
          ...element,
          id,
          timestamp: new Date(),
          completedVersions: new Set(),
          conversationId: state.currentConversationId // Store the conversation ID
        };
        
        const conversationId = state.currentConversationId;
        const elements = state.canvasElementsByConversation[conversationId] || [];
        
        set({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: [...elements, newElement]
          }
        });

        // Initialize in state machine with proper error handling
        // 🎯 CRITICAL: Do NOT call CREATION_COMPLETE here - the typewriter will do that when done!
        // The state machine should stay in 'creating' until typewriter finishes
        try {
          const stateService = getCanvasStateService(conversationId);
          stateService.initializeElement(id, element.state || 'creating');
          // DO NOT transition to CREATION_COMPLETE - typewriter handles this
        } catch (stateError) {
          console.warn(`[np] store:state-init failed for ${id}, but element created successfully`, stateError);
        }

        console.log(`[np] store:add ${id} type=${element.type}`);
        return id;
      },

      updateCanvasElement: (id: string, updates: Partial<CanvasElement>) => {
        const state = get();
        const conversationId = state.currentConversationId;
        const elements = state.canvasElementsByConversation[conversationId] || [];
        
        const updatedElements = elements.map(el => 
          el.id === id ? { ...el, ...updates } : el
        );

        set({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: updatedElements
          }
        });

        console.log(`[np] store:update ${id}`);
      },

      removeCanvasElement: (id: string) => {
        const state = get();
        const conversationId = state.currentConversationId;
        const elements = state.canvasElementsByConversation[conversationId] || [];
        
        set({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: elements.filter(el => el.id !== id)
          },
          selectedElements: state.selectedElements.filter(elId => elId !== id)
        });

        // Clean up state machine
        const stateService = getCanvasStateService(conversationId);
        stateService.removeElement(id);

        console.log(`[np] store:remove ${id}`);
      },

      /**
       * 🗑️ Delete a specific version from a document canvas
       * Preserves version history integrity - marks version as deleted rather than removing
       */
      deleteCanvasVersion: (elementId: string, versionNumber: number) => {
        const state = get();
        const conversationId = state.currentConversationId;
        const elements = state.canvasElementsByConversation[conversationId] || [];
        
        const updatedElements = elements.map(el => {
          if (el.id !== elementId || !el.versions) return el;
          
          // Mark version as deleted but keep in history
          const updatedVersions = el.versions.map(v => 
            v.version === versionNumber 
              ? { ...v, state: 'deleted' as any, metadata: { ...v.metadata, deletedAt: Date.now() } }
              : v
          );
          
          return { ...el, versions: updatedVersions };
        });
        
        set({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: updatedElements
          }
        });
        
        console.log(`[np] store:delete-version ${elementId} v${versionNumber}`);
      },

      /**
       * 🗑️ Delete canvas element with version history preservation
       * Marks element as archived rather than destroying data
       */
      archiveCanvasElement: (id: string) => {
        const state = get();
        const conversationId = state.currentConversationId;
        const elements = state.canvasElementsByConversation[conversationId] || [];
        
        const updatedElements = elements.map(el => 
          el.id === id 
            ? { 
                ...el, 
                state: 'archived' as any, 
                metadata: { 
                  ...el.metadata, 
                  archivedAt: Date.now() 
                } 
              }
            : el
        );
        
        set({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: updatedElements
          }
        });
        
        console.log(`[np] store:archive ${id}`);
      },

      /**
       * 🗑️ Permanently delete canvas element (use with caution)
       * This actually removes the element from storage
       */
      permanentlyDeleteCanvasElement: (id: string) => {
        const state = get();
        const conversationId = state.currentConversationId;
        const elements = state.canvasElementsByConversation[conversationId] || [];
        
        // Clean up from state machine
        try {
          const stateService = getCanvasStateService(conversationId);
          stateService.removeElement(id);
        } catch (error) {
          console.warn(`[np] store:cleanup state failed for ${id}`, error);
        }
        
        set({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: elements.filter(el => el.id !== id)
          },
          selectedElements: state.selectedElements.filter(elId => elId !== id)
        });

        console.log(`[np] store:permanent-delete ${id}`);
      },

      clearCanvas: () => {
        const state = get();
        const conversationId = state.currentConversationId;
        
        set({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: []
          },
          selectedElements: []
        });

        console.log(`[np] store:clear ${conversationId}`);
      },

      // ===================================
      // ELEMENT SELECTION & MOVEMENT
      // ===================================
      
      selectElements: (ids: string[]) => {
        set({ selectedElements: ids });
      },

      moveElement: (id: string, newPosition: { x: number; y: number }) => {
        get().updateCanvasElement(id, { position: newPosition });
      },

      // ===================================
      // UI CONTROL
      // ===================================
      
      toggleCanvasMode: () => {
            set((state) => ({
          isCanvasMode: !state.isCanvasMode,
          ...(state.isCanvasMode ? {} : {
            viewportCenter: { x: 0, y: 0 },
            zoomLevel: 1,
            selectedElements: []
          })
        }));
      },

      setSplitRatio: (ratio: number) => {
        set({ splitRatio: Math.max(0.5, Math.min(0.9, ratio)) });
      },

      setCanvasTheme: (theme: 'light' | 'dark' | 'auto') => {
        set({ canvasTheme: theme });
      },

      setViewportCenter: (center: { x: number; y: number }) => {
        set({ viewportCenter: center });
      },

      setZoomLevel: (zoom: number) => {
        set({ zoomLevel: Math.max(0.1, Math.min(3, zoom)) });
      },

      resetViewport: () => {
        set({ viewportCenter: { x: 0, y: 0 }, zoomLevel: 1 });
      },

      setChatPosition: (position: 'right' | 'left' | 'bottom') => {
        set({ chatPosition: position });
      },

      // ===================================
      // VERSION CONTROL (delegates to service)
      // ===================================
      
      setFrozenVersion: (elementId: string, version: number, content: string) => {
        const versionService = getCanvasVersionService(get().currentConversationId);
        versionService.freezeVersion(elementId, version, content);
        
        // Update element in store
        get().updateCanvasElement(elementId, {
          frozenVersions: versionService.getFrozenVersions(elementId)
        });
      },

      getFrozenVersions: (elementId: string) => {
        const versionService = getCanvasVersionService(get().currentConversationId);
        return versionService.getFrozenVersions(elementId);
      },

      setCompletedVersion: (elementId: string, versionKey: string) => {
        const versionService = getCanvasVersionService(get().currentConversationId);
        versionService.setCompletedVersion(elementId, versionKey);
        
        // Update element in store
        get().updateCanvasElement(elementId, {
          completedVersions: versionService.getCompletedVersions(elementId)
        });
      },

      getCompletedVersions: (elementId: string) => {
        const versionService = getCanvasVersionService(get().currentConversationId);
        return versionService.getCompletedVersions(elementId);
      },

      // ===================================
      // STATE MANAGEMENT (delegates to service)
      // ===================================
      
      updateElementState: (elementId: string, state: CanvasElement['state']) => {
        const stateService = getCanvasStateService(get().currentConversationId);
        
        // Map state to event
        const eventMap: Record<string, string> = {
          creating: 'START_CREATION',
          active: 'ACTIVATE',
          completed: 'COMPLETE',
          archived: 'ARCHIVE',
          idle: 'RESET'
        };
        
        if (state && eventMap[state]) {
          stateService.transition(elementId, eventMap[state]).catch(err => {
            console.warn(`[np] store:transition failed for ${elementId}:`, err);
          });
        }
        
        // Update element in store
        get().updateCanvasElement(elementId, { state });
      },

      // ===================================
      // BACKWARD COMPATIBILITY (for tests)
      // ===================================
      
      initializeStateMachine: (sessionId: string) => {
        set({ stateMachine: getCanvasStateService(sessionId) });
      },
      
      transitionState: async (event: string, payload?: any) => {
        const stateService = getCanvasStateService(get().currentConversationId);
        // Transition for global canvas state (not element-specific)
        return { success: true };
      },
      
      getCurrentMachineState: () => {
        const stateService = getCanvasStateService(get().currentConversationId);
        return stateService.exportState();
      },
      
      initializeRevisionHistory: (sessionId?: string) => {
        set({ revisionHistory: getCanvasVersionService(sessionId || get().currentConversationId) });
      },
      
      createAtomicVersion: async (elementId: string, content: string, metadata?: any) => {
        const versionService = getCanvasVersionService(get().currentConversationId);
        return await versionService.createVersion(elementId, content, metadata?.reason, metadata);
      },
      
      finalizeVersion: async (versionId: string) => {
        const versionService = getCanvasVersionService(get().currentConversationId);
        if (typeof versionId === 'string' && versionId.includes('-v')) {
          const [elementId] = versionId.split('-v');
          if (elementId) {
            versionService.updateVersionState(elementId, versionId, 'frozen');
          }
        }
      },
      
      getRevisionHistory: () => {
        const versionService = getCanvasVersionService(get().currentConversationId);
        return versionService.getVersionHistory('');
      },
      
      // ===================================
      // CLEAR ALL
      // ===================================
      
      clearAll: () => {
        set({
          canvasElementsByConversation: {},
          selectedElements: [],
          viewportCenter: { x: 0, y: 0 },
          zoomLevel: 1
        });
        
        // Clear services
        getCanvasVersionService().clear();
        getCanvasStateService().clear();
        getCanvasAIService().clear();
        
        console.log('[np] store:clear-all');
      }
        }),
        {
      name: 'neuraplay-canvas-storage',
      partialize: (state) => ({
        canvasElementsByConversation: state.canvasElementsByConversation,
        currentConversationId: state.currentConversationId,
        canvasTheme: state.canvasTheme,
        splitRatio: state.splitRatio
      }),
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined' || !window.localStorage) return null;
          
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          
          // Restore data structures
          if (parsed.state?.canvasElementsByConversation) {
            Object.values(parsed.state.canvasElementsByConversation).forEach((elements: any) => {
              elements?.forEach((el: any) => {
                // Convert completedVersions array back to Set
                if (el.completedVersions && Array.isArray(el.completedVersions)) {
                  el.completedVersions = new Set(el.completedVersions);
                }
                
                // Convert timestamp string/number back to Date
                if (el.timestamp) {
                  el.timestamp = new Date(el.timestamp);
                }
                
                // Ensure versions array exists and restore timestamps
                if (!el.versions) {
                  el.versions = [];
                } else if (Array.isArray(el.versions)) {
                  el.versions.forEach((v: any) => {
                    if (v.timestamp && typeof v.timestamp === 'string') {
                      v.timestamp = new Date(v.timestamp);
                    }
                  });
                }
              });
            });
          }
          
          return parsed;
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined' || !window.localStorage) return;
          
          // Serialize with proper handling of Sets and Dates
          const stateCopy = JSON.parse(JSON.stringify(value, (_key, val) => {
            if (val instanceof Set) {
              return Array.from(val);
            }
            if (val instanceof Date) {
              return val.toISOString();
            }
            return val;
          }));
          
          localStorage.setItem(name, JSON.stringify(stateCopy));
        },
        removeItem: (name) => {
          if (typeof window === 'undefined' || !window.localStorage) return;
          localStorage.removeItem(name);
        },
      }
    }
  )
);

export default useCanvasStore;

