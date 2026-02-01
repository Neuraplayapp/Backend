// Canvas Board Store - Zustand-based state management for Gemini/Claude-like canvas
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { serviceContainer } from '../services/ServiceContainer';
import { EventSourcingRevisionHistory, createRevisionHistory } from '../services/EventSourcingRevisionHistory';
import { AdvancedStateMachine, createStateMachine, actions, guards } from '../services/AdvancedStateMachine';

// Canvas Board Types
export interface CanvasElement {
  id: string;
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
  // PERSISTENCE FIX: Store frozen version state at element level
  frozenVersions?: Record<number, string>; // version number -> frozen content
  completedVersions?: Set<string>; // version keys that are complete
  
  // STATE MACHINE INTEGRATION: Element lifecycle state
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
}

export interface Hypothesis {
  id: string;
  type: 'binary_choice' | 'multi_option' | 'user_preference';
  title: string;
  options: Array<{
    id: string;
    text: string;
    probability: number;
    userHistoryWeight: number;
  }>;
  detectedFrom: string; // Message that triggered detection
  timestamp: Date;
  resolved?: {
    chosenOption: string;
    confidence: number;
    timestamp: Date;
  };
}

export interface UserDecisionPattern {
  context: string;
  choices: Array<{
    option: string;
    frequency: number;
    lastChosen: Date;
    contexts: string[];
  }>;
  learningWeight: number; // How much this pattern influences future suggestions
}

export interface SuggestionCard {
  id: string;
  title: string;
  description: string;
  action: string; // Tool to execute
  parameters: any;
  confidence: number;
  sourceAnalysis: string;
  category: 'navigation' | 'learning' | 'creation' | 'analysis' | 'preference';
  priority: 'low' | 'medium' | 'high';
  executionTime?: Date;
}

export interface CanvasState {
  // Canvas Layout - Per Conversation
  isCanvasMode: boolean;
  splitRatio: number; // 0.6-0.8 for canvas, 0.2-0.4 for chat
  canvasElementsByConversation: Record<string, CanvasElement[]>;
  currentConversationId: string;
  
  // Chat Integration
  activeChatId: string;
  chatPosition: 'right' | 'left' | 'bottom';
  chatSize: { width: number; height: number };
  
  // Agentic Decision System
  activeHypotheses: Hypothesis[];
  userDecisionPatterns: { [context: string]: UserDecisionPattern };
  suggestionCards: SuggestionCard[];
  
  // Canvas View State
  viewportCenter: { x: number; y: number };
  zoomLevel: number;
  selectedElements: string[];
  canvasTheme: 'light' | 'dark' | 'auto';
  
  // Animation States
  isAnimating: boolean;
  animationQueue: Array<{
    type: string;
    targetId: string;
    properties: any;
    duration: number;
  }>;
  
  // 3D Visualization
  show3DGraphs: boolean;
  graphData: Array<{
    id: string;
    type: '3d_scatter' | '3d_network' | '3d_surface' | '3d_flow';
    data: any;
    position: { x: number; y: number; z: number };
  }>;

  // STATE MACHINE INTEGRATION: Advanced state management
  stateMachine?: AdvancedStateMachine;
  revisionHistory?: EventSourcingRevisionHistory;
  
  // VERSION CONTROL: Unified versioning system (CRITICAL FIX)
  globalVersionCounter: number;
  activeVersionTransitions: Map<string, { from: number; to: number; timestamp: number }>;
  versionLocks: Map<string, boolean>; // Prevent concurrent version changes
}

export interface CanvasActions {
  // Canvas Mode Control
  toggleCanvasMode: () => void;
  setSplitRatio: (ratio: number) => void;
  setCanvasTheme: (theme: 'light' | 'dark' | 'auto') => void;
  
  // Conversation Management
  setCurrentConversation: (conversationId: string) => void;
  getCurrentCanvasElements: () => CanvasElement[];

  // Element Management
  addCanvasElement: (element: Omit<CanvasElement, 'id' | 'timestamp'>) => string;
  updateCanvasElement: (id: string, updates: Partial<CanvasElement>) => void;
  removeCanvasElement: (id: string) => void;
  moveElement: (id: string, newPosition: { x: number; y: number }) => void;
  selectElements: (ids: string[]) => void;
  clearCanvas: () => void;
  
  // PERSISTENCE FIX: Version state management
  setFrozenVersion: (elementId: string, version: number, content: string) => void;
  getFrozenVersions: (elementId: string) => Record<number, string>;
  setCompletedVersion: (elementId: string, versionKey: string) => void;
  getCompletedVersions: (elementId: string) => Set<string>;
  
  // STATE MACHINE INTEGRATION: Element lifecycle and versioning
  updateElementState: (elementId: string, state: CanvasElement['state']) => void;
  addVersion: (elementId: string, content: string, request?: string, metadata?: any) => void;
  updateVersionState: (elementId: string, versionId: string, state: 'draft' | 'typing' | 'frozen' | 'displayed') => void;
  getElementVersions: (elementId: string) => CanvasElement['versions'];
  getDisplayContent: (elementId: string, viewMode?: 'single' | 'accumulated') => string;
  
  // Hypothesis Detection & Management
  detectHypothesis: (message: string, context: any) => Hypothesis | null;
  resolveHypothesis: (hypothesisId: string, chosenOption: string, confidence: number) => void;
  learnFromDecision: (context: string, choice: string) => void;
  
  // Suggestion System
  generateSuggestions: (context: any) => SuggestionCard[];
  executeSuggestion: (suggestionId: string) => Promise<void>;
  dismissSuggestion: (suggestionId: string) => void;
  
  // Viewport Control
  setViewportCenter: (center: { x: number; y: number }) => void;
  setZoomLevel: (zoom: number) => void;
  resetViewport: () => void;
  
  // Animation Control
  queueAnimation: (animation: any) => void;
  playAnimations: () => Promise<void>;
  
  // 3D Visualization
  toggle3DGraphs: () => void;
  add3DGraph: (graph: any) => void;
  update3DGraph: (id: string, updates: any) => void;
  
  // Chat Integration
  syncWithConversation: (conversationId: string, messages: any[]) => void;
  setChatPosition: (position: 'right' | 'left' | 'bottom') => void;
  
  // AI Content Generation
  generateFromMessage: (message: string, toolResults: any[]) => Promise<void>;
  summarizeContent: (elementIds: string[]) => Promise<CanvasElement>;
  
  // Pattern Recognition
  analyzeUserBehavior: () => void;
  predictUserPreference: (context: string) => string | null;
  
  // NPU Integration
  syncWithNPU: (sessionId: string, userId?: string) => Promise<void>;
  persistToLTM: (elements: CanvasElement[], userId?: string) => Promise<void>;
  loadFromLTM: (userId: string, sessionId?: string) => Promise<CanvasElement[]>;
  analyzeCanvasWithAI: (elements: CanvasElement[], context?: any) => Promise<any>;
  
  // Advanced Canvas Operations
  createSmartLayout: (elements: CanvasElement[]) => Promise<void>;
  detectCanvasPatterns: (elements: CanvasElement[]) => any[];
  suggestOptimizations: (elements: CanvasElement[]) => any[];
  enableCollaborativeMode: (sessionId: string) => Promise<void>;

  // STATE MACHINE INTEGRATION: Actions
  initializeStateMachine: (sessionId: string) => void;
  transitionState: (event: string, payload?: any) => void;
  getCurrentMachineState: () => any;
  
  // EVENT SOURCING: Actions  
  initializeRevisionHistory: (sessionId: string) => void;
  recordElementChange: (elementId: string, changeType: string, oldValue?: any, newValue?: any) => Promise<void>;
  getRevisionHistory: () => any[];
  restoreFromTime: (timestamp: number) => Promise<void>;

  // VERSION CONTROL: Unified actions (CRITICAL FIX)
  createAtomicVersion: (elementId: string, content: string, request?: string) => Promise<string>;
  finalizeVersion: (elementId: string, versionId: string) => Promise<void>;
  rollbackToVersion: (elementId: string, versionId: string) => Promise<void>;
  getVersionHistory: (elementId: string) => any[];
  lockVersioning: (elementId: string) => void;
  unlockVersioning: (elementId: string) => void;
}

export type CanvasStore = CanvasState & CanvasActions;

// AI-powered hypothesis detection patterns
const HYPOTHESIS_PATTERNS = [
  {
    pattern: /(?:should I|shall I|do I|would you recommend|better to|prefer to) (.+?) or (.+?)[\?\!]?/i,
    type: 'binary_choice' as const,
    weight: 0.9
  },
  {
    pattern: /(?:go to|visit|navigate to|check out) (.+?)[\?\!]?/i,
    type: 'navigation_preference' as const,
    weight: 0.7
  },
  {
    pattern: /(?:I (?:want|need|like) to|let me|can you help me) (.+?)[\?\!]?/i,
    type: 'user_preference' as const,
    weight: 0.8
  }
];

// Store implementation with enhanced NPU integration
export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      // Initial State
      isCanvasMode: false,
      splitRatio: 0.7, // 70% canvas, 30% chat
      canvasElementsByConversation: {},
      currentConversationId: 'default',
      activeChatId: 'current',
      chatPosition: 'right',
      chatSize: { width: 400, height: 600 },
      activeHypotheses: [],
      userDecisionPatterns: {},
      suggestionCards: [],
      viewportCenter: { x: 0, y: 0 },
      zoomLevel: 1,
      selectedElements: [],
      canvasTheme: 'auto',
      isAnimating: false,
      animationQueue: [],
      show3DGraphs: false,
      graphData: [],
      
      // STATE MACHINE & EVENT SOURCING: Initialize to undefined (will be set by init methods)
      stateMachine: undefined,
      revisionHistory: undefined,
      
      // VERSION CONTROL: Initialize unified versioning system
      globalVersionCounter: 0,
      activeVersionTransitions: new Map(),
      versionLocks: new Map(),

      // Actions Implementation
      toggleCanvasMode: () => set((state) => ({
        isCanvasMode: !state.isCanvasMode,
        // Reset viewport when entering canvas mode
        ...(state.isCanvasMode ? {} : {
          viewportCenter: { x: 0, y: 0 },
          zoomLevel: 1,
          selectedElements: []
        })
      })),

      setSplitRatio: (ratio: number) => set({
        splitRatio: Math.max(0.5, Math.min(0.9, ratio)) // Constrain between 50-90%
      }),

      setCanvasTheme: (theme) => set({ canvasTheme: theme }),

      // STATE-OF-THE-ART: Conversation Management with Canvas Isolation
      setCurrentConversation: (conversationId: string) => {
        const state = get();
        
        // Ensure isolated canvas workspace per conversation
        if (!state.canvasElementsByConversation[conversationId]) {
          console.log('✅ Canvas Store: Creating new isolated workspace for', conversationId);
          state.canvasElementsByConversation[conversationId] = [];
        }
        
        console.log('🔄 Canvas Store: Switched to conversation', conversationId, 
          'with', state.canvasElementsByConversation[conversationId]?.length || 0, 'elements');
        
        set({ 
          currentConversationId: conversationId,
          // Reset view state for new conversation to prevent visual artifacts
          selectedElements: [],
          viewportCenter: { x: 0, y: 0 },
          zoomLevel: 1
        });
      },

      getCurrentCanvasElements: () => {
        const state = get();
        return state.canvasElementsByConversation[state.currentConversationId] || [];
      },

      addCanvasElement: (element) => {
        const id = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newElement: CanvasElement = {
          ...element,
          id,
          timestamp: new Date()
        };
        
        const state = get();
        const conversationId = state.currentConversationId;
        const currentElements = state.canvasElementsByConversation[conversationId] || [];
        
        set((state) => ({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: [...currentElements, newElement]
          }
        }));
        
        try { window.dispatchEvent(new CustomEvent('np:store:add', { detail: { id, type: element.type, conversationId, count: currentElements.length + 1 } })); } catch {}
        console.info('[np] store:add', { id, type: element.type, conversationId, position: element.position, size: element.size, total: currentElements.length + 1 });
        return id;
      },

      updateCanvasElement: (id, updates) => set((state) => {
        const conversationId = state.currentConversationId;
        const currentElements = state.canvasElementsByConversation[conversationId] || [];
        const before = currentElements.find(el => el.id === id);
        const next = currentElements.map(el => el.id === id ? { ...el, ...updates } : el);
        
        try { window.dispatchEvent(new CustomEvent('np:store:update', { detail: { id, type: before?.type, updates, conversationId } })); } catch {}
        console.info('[np] store:update', { id, type: before?.type, updates, conversationId });
        
        return { 
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: next
          }
        };
      }),

      removeCanvasElement: (id) => set((state) => {
        const conversationId = state.currentConversationId;
        const currentElements = state.canvasElementsByConversation[conversationId] || [];
        const removed = currentElements.find(el => el.id === id);
        const next = currentElements.filter(el => el.id !== id);
        const sel = state.selectedElements.filter(selId => selId !== id);
        
        try { window.dispatchEvent(new CustomEvent('np:store:remove', { detail: { id, type: removed?.type, remaining: next.length, conversationId } })); } catch {}
        console.info('[np] store:remove', { id, type: removed?.type, remaining: next.length, conversationId });
        
        return { 
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: next
          },
          selectedElements: sel 
        };
      }),

      moveElement: (id, newPosition) => set((state) => {
        const conversationId = state.currentConversationId;
        const currentElements = state.canvasElementsByConversation[conversationId] || [];
        const updatedElements = currentElements.map(el =>
          el.id === id ? { ...el, position: newPosition } : el
        );
        
        return {
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: updatedElements
          }
        };
      }),

      selectElements: (ids) => {
        try { window.dispatchEvent(new CustomEvent('np:store:select', { detail: { ids } })); } catch {}
        console.info('[np] store:select', { ids });
        set({ selectedElements: ids });
      },

      clearCanvas: () => {
        const state = get();
        const conversationId = state.currentConversationId;
        const currentElements = state.canvasElementsByConversation[conversationId] || [];
        const count = currentElements.length;
        
        try { window.dispatchEvent(new CustomEvent('np:store:clear', { detail: { count, conversationId } })); } catch {}
        console.info('[np] store:clear', { removed: count, conversationId });
        
        set((state) => ({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: []
          },
          selectedElements: [],
          activeHypotheses: [],
          suggestionCards: []
        }));
      },

      // PERSISTENCE FIX: Version state management implementation
      setFrozenVersion: (elementId: string, version: number, content: string) => {
        const state = get();
        const conversationId = state.currentConversationId;
        const currentElements = state.canvasElementsByConversation[conversationId] || [];
        
        const updatedElements = currentElements.map(el => {
          if (el.id === elementId) {
            const frozenVersions = { ...(el.frozenVersions || {}) };
            frozenVersions[version] = content;
            return { ...el, frozenVersions };
          }
          return el;
        });
        
        set((state) => ({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: updatedElements
          }
        }));
        
        console.log(`❄️ STORE: Frozen version ${version} for element ${elementId}`);
      },

      getFrozenVersions: (elementId: string) => {
        const state = get();
        const conversationId = state.currentConversationId;
        const currentElements = state.canvasElementsByConversation[conversationId] || [];
        const element = currentElements.find(el => el.id === elementId);
        return element?.frozenVersions || {};
      },

      setCompletedVersion: (elementId: string, versionKey: string) => {
        const state = get();
        const conversationId = state.currentConversationId;
        const currentElements = state.canvasElementsByConversation[conversationId] || [];
        
        const updatedElements = currentElements.map(el => {
          if (el.id === elementId) {
            const completedVersions = new Set(el.completedVersions || []);
            completedVersions.add(versionKey);
            return { ...el, completedVersions };
          }
          return el;
        });
        
        set((state) => ({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: updatedElements
          }
        }));
      },

      getCompletedVersions: (elementId: string) => {
        const state = get();
        const conversationId = state.currentConversationId;
        const currentElements = state.canvasElementsByConversation[conversationId] || [];
        const element = currentElements.find(el => el.id === elementId);
        return element?.completedVersions || new Set<string>();
      },

      // STATE MACHINE INTEGRATION: Element lifecycle and versioning
      updateElementState: (elementId: string, state: CanvasElement['state']) => {
        const currentState = get();
        const conversationId = currentState.currentConversationId;
        const currentElements = currentState.canvasElementsByConversation[conversationId] || [];
        
        const updatedElements = currentElements.map(el => {
          if (el.id === elementId) {
            return { ...el, state };
          }
          return el;
        });
        
        set((state) => ({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: updatedElements
          }
        }));
      },

      addVersion: (elementId: string, content: string, request?: string, metadata?: any) => {
        const currentState = get();
        const conversationId = currentState.currentConversationId;
        const currentElements = currentState.canvasElementsByConversation[conversationId] || [];
        
        const updatedElements = currentElements.map(el => {
          if (el.id === elementId) {
            const currentVersion = el.currentVersion || 1;
            const newVersion = currentVersion + 1;
            const versionId = `${elementId}-v${newVersion}-${Date.now()}`;
            
            const newVersionObj = {
              id: versionId,
              version: newVersion,
              content,
              state: 'draft' as const,
              timestamp: Date.now(),
              request,
              metadata
            };
            
            return {
              ...el,
              currentVersion: newVersion,
              versions: [...(el.versions || []), newVersionObj],
              state: 'creating' as const
            };
          }
          return el;
        });
        
        set((state) => ({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: updatedElements
          }
        }));
      },

      updateVersionState: (elementId: string, versionId: string, versionState: 'draft' | 'typing' | 'frozen' | 'displayed') => {
        const currentState = get();
        const conversationId = currentState.currentConversationId;
        const currentElements = currentState.canvasElementsByConversation[conversationId] || [];
        
        const updatedElements = currentElements.map(el => {
          if (el.id === elementId && el.versions) {
            const updatedVersions = el.versions.map(v => 
              v.id === versionId ? { ...v, state: versionState } : v
            );
            
            // If version is frozen, also update element state to active
            const elementState = versionState === 'frozen' ? 'active' as const : el.state;
            
            return { ...el, versions: updatedVersions, state: elementState };
          }
          return el;
        });
        
        set((state) => ({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: updatedElements
          }
        }));
      },

      getElementVersions: (elementId: string) => {
        const state = get();
        const conversationId = state.currentConversationId;
        const currentElements = state.canvasElementsByConversation[conversationId] || [];
        const element = currentElements.find(el => el.id === elementId);
        return element?.versions;
      },

      getDisplayContent: (elementId: string, viewMode: 'single' | 'accumulated' = 'accumulated') => {
        const state = get();
        const conversationId = state.currentConversationId;
        const currentElements = state.canvasElementsByConversation[conversationId] || [];
        const element = currentElements.find(el => el.id === elementId);
        
        if (!element) return '';
        
        // Use frozenVersions for display if available (existing logic)
        const frozenVersions = element.frozenVersions || {};
        const frozenKeys = Object.keys(frozenVersions).map(k => parseInt(k)).sort((a, b) => a - b);
        
        if (frozenKeys.length > 0) {
          if (viewMode === 'single') {
            const latestVersion = frozenKeys[frozenKeys.length - 1];
            return frozenVersions[latestVersion] || '';
          } else {
            // Accumulated view
            return frozenKeys.map((version, index) => {
              let content = frozenVersions[version];
              if (index > 0) {
                // STATE-OF-THE-ART: Natural document flow without crude separators
                content = `\n\n${content}`;
              }
              return content;
            }).join('');
          }
        }
        
        // Fallback to versions array if no frozen versions
        if (element.versions) {
          const displayableVersions = element.versions.filter(v => 
            v.state === 'frozen' || v.state === 'typing' || v.state === 'displayed'
          );
          
          if (viewMode === 'single') {
            const latestVersion = displayableVersions[displayableVersions.length - 1];
            return latestVersion?.content || '';
          } else {
            return displayableVersions.map((version, index) => {
              let content = version.content;
              if (index > 0) {
                // STATE-OF-THE-ART: Natural continuation with context if available
                let transition = '\n\n';
                if (version.request) {
                  transition += `<!-- Continuation: ${version.request} -->\n\n`;
                }
                content = `${transition}${version.content}`;
              }
              return content;
            }).join('');
          }
        }
        
        // Final fallback to element content
        return element.content?.content || element.content || '';
      },

      // AI-powered hypothesis detection
      detectHypothesis: (message: string, _context: any) => {
        const patterns = HYPOTHESIS_PATTERNS;
        
        for (const { pattern, type, weight: _ } of patterns) {
          const match = message.match(pattern);
          if (match) {
            const hypothesis: Hypothesis = {
              id: `hyp_${Date.now()}`,
              type: type as any,
              title: `Decision: ${match[1]} vs ${match[2] || 'alternative'}`,
              options: [
                {
                  id: 'opt1',
                  text: match[1],
                  probability: 0.5,
                  userHistoryWeight: get().predictUserPreference(match[1]) ? 0.3 : 0
                },
                {
                  id: 'opt2', 
                  text: match[2] || 'alternative',
                  probability: 0.5,
                  userHistoryWeight: get().predictUserPreference(match[2] || 'alternative') ? 0.3 : 0
                }
              ],
              detectedFrom: message,
              timestamp: new Date()
            };
            
            set((state) => ({
              activeHypotheses: [...state.activeHypotheses, hypothesis]
            }));
            
            return hypothesis;
          }
        }
        
        return null;
      },

      resolveHypothesis: (hypothesisId, chosenOption, confidence) => {
        set((state) => ({
          activeHypotheses: state.activeHypotheses.map(h =>
            h.id === hypothesisId 
              ? { 
                  ...h, 
                  resolved: { 
                    chosenOption, 
                    confidence, 
                    timestamp: new Date() 
                  } 
                } 
              : h
          )
        }));
        
        // Learn from the decision
        const hypothesis = get().activeHypotheses.find(h => h.id === hypothesisId);
        if (hypothesis) {
          get().learnFromDecision(hypothesis.title, chosenOption);
        }
      },

      learnFromDecision: (context, choice) => {
        set((state) => {
          const patterns = { ...state.userDecisionPatterns };
          
          if (!patterns[context]) {
            patterns[context] = {
              context,
              choices: [],
              learningWeight: 1.0
            };
          }
          
          const existingChoice = patterns[context].choices.find(c => c.option === choice);
          if (existingChoice) {
            existingChoice.frequency += 1;
            existingChoice.lastChosen = new Date();
          } else {
            patterns[context].choices.push({
              option: choice,
              frequency: 1,
              lastChosen: new Date(),
              contexts: [context]
            });
          }
          
          return { userDecisionPatterns: patterns };
        });
      },

      generateSuggestions: (_context: any) => {
        const state = get();
        const suggestions: SuggestionCard[] = [];
        
        // Generate suggestions based on user patterns
        Object.values(state.userDecisionPatterns).forEach(pattern => {
          const topChoice = pattern.choices.sort((a, b) => b.frequency - a.frequency)[0];
          if (topChoice && topChoice.frequency > 1) {
            suggestions.push({
              id: `sug_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              title: `You usually choose "${topChoice.option}"`,
              description: `Based on your history, you've chosen this ${topChoice.frequency} times`,
              action: 'auto_select',
              parameters: { choice: topChoice.option },
              confidence: Math.min(0.9, topChoice.frequency / 10),
              sourceAnalysis: `Pattern: ${pattern.context}`,
              category: 'preference',
              priority: topChoice.frequency > 3 ? 'high' : 'medium'
            });
          }
        });
        
        set({ suggestionCards: suggestions });
        return suggestions;
      },

      executeSuggestion: async (suggestionId) => {
        const suggestion = get().suggestionCards.find(s => s.id === suggestionId);
        if (!suggestion) return;
        
        // Mark as executed
        set((state) => ({
          suggestionCards: state.suggestionCards.map(s =>
            s.id === suggestionId 
              ? { ...s, executionTime: new Date() }
              : s
          )
        }));
        
        // Execute the suggestion (integrate with existing tool system)
        console.log('Executing suggestion:', suggestion);
      },

      dismissSuggestion: (suggestionId) => set((state) => ({
        suggestionCards: state.suggestionCards.filter(s => s.id !== suggestionId)
      })),

      setViewportCenter: (center) => set({ viewportCenter: center }),
      setZoomLevel: (zoom) => set({ zoomLevel: Math.max(0.1, Math.min(5, zoom)) }),
      resetViewport: () => set({ viewportCenter: { x: 0, y: 0 }, zoomLevel: 1 }),

      queueAnimation: (animation) => set((state) => ({
        animationQueue: [...state.animationQueue, animation]
      })),

      playAnimations: async () => {
        const { animationQueue } = get();
        set({ isAnimating: true });
        
        // Process animations sequentially
        for (const animation of animationQueue) {
          await new Promise(resolve => setTimeout(resolve, animation.duration));
        }
        
        set({ isAnimating: false, animationQueue: [] });
      },

      toggle3DGraphs: () => set((state) => ({ show3DGraphs: !state.show3DGraphs })),

      add3DGraph: (graph) => set((state) => ({
        graphData: [...state.graphData, { ...graph, id: `graph_${Date.now()}` }]
      })),

      update3DGraph: (id, updates) => set((state) => ({
        graphData: state.graphData.map(g => g.id === id ? { ...g, ...updates } : g)
      })),

      syncWithConversation: (conversationId, messages) => {
        // Auto-generate canvas elements from AI tool results
        messages.forEach(message => {
          if (message.toolResults) {
            get().generateFromMessage(message.text, message.toolResults);
          }
        });
        
        set({ activeChatId: conversationId });
      },

      setChatPosition: (position) => set({ chatPosition: position }),

      generateFromMessage: async (message, toolResults) => {
        const addElement = get().addCanvasElement;
        
        toolResults.forEach(result => {
          if (result.data?.image_url) {
            addElement({
              type: 'image',
              content: { src: result.data.image_url, alt: result.message },
              position: { x: Math.random() * 400, y: Math.random() * 300 },
              size: { width: 300, height: 200 },
              layer: 1,
              metadata: { sourceMessage: message, toolResult: result }
            });
          }
          
          if (result.data?.type === 'web_results') {
            addElement({
              type: 'text',
              content: { 
                title: 'Web Search Results',
                data: result.data.results 
              },
              position: { x: Math.random() * 400, y: Math.random() * 300 },
              size: { width: 350, height: 250 },
              layer: 1,
              metadata: { sourceMessage: message, toolResult: result }
            });
          }
          
          if (result.data?.type === 'math_diagram') {
            addElement({
              type: 'diagram',
              content: result.data,
              position: { x: Math.random() * 400, y: Math.random() * 300 },
              size: { width: 400, height: 300 },
              layer: 1,
              metadata: { sourceMessage: message, toolResult: result }
            });
          }
        });
      },

      summarizeContent: async (elementIds: string[]) => {
        const elements = get().getCurrentCanvasElements().filter((el: CanvasElement) => elementIds.includes(el.id));
        // Create a summary element
        const summaryId = get().addCanvasElement({
          type: 'text',
          content: {
            title: 'Summary',
            text: `Summary of ${elements.length} elements`,
            elements: elements.map((el: CanvasElement) => ({ id: el.id, type: el.type }))
          },
          position: { x: 50, y: 50 },
          size: { width: 300, height: 150 },
          layer: 2
        });
        
        return get().getCurrentCanvasElements().find((el: CanvasElement) => el.id === summaryId)!;
      },

      analyzeUserBehavior: () => {
        // Analyze patterns and update learning weights
        const patterns = get().userDecisionPatterns;
        Object.values(patterns).forEach(pattern => {
          const totalChoices = pattern.choices.reduce((sum, choice) => sum + choice.frequency, 0);
          pattern.learningWeight = Math.min(2.0, totalChoices / 10); // Cap at 2.0
        });
      },

      predictUserPreference: (context) => {
        const patterns = get().userDecisionPatterns;
        const relevantPattern = patterns[context] || Object.values(patterns).find(p => 
          p.choices.some(c => c.contexts.includes(context))
        );
        
        if (relevantPattern) {
          const topChoice = relevantPattern.choices.sort((a, b) => b.frequency - a.frequency)[0];
          return topChoice?.frequency > 2 ? topChoice.option : null;
        }
        
        return null;
      },

      // NPU Integration Methods
      syncWithNPU: async (sessionId: string, userId?: string) => {
        try {
          await serviceContainer.waitForReady();
          const unifiedSessionManager = serviceContainer.get('unifiedSessionManager') as any;
          
          if (unifiedSessionManager) {
            const state = get();
            const elements = state.canvasElementsByConversation[sessionId] || [];
            
            // Save canvas state to unified memory system
            await unifiedSessionManager.addMessage(sessionId, {
              role: 'system',
              content: `Canvas sync: ${elements.length} elements`,
              metadata: {
                canvasElements: elements,
                canvasState: {
                  viewportCenter: state.viewportCenter,
                  zoomLevel: state.zoomLevel,
                  selectedElements: state.selectedElements
                },
                timestamp: new Date()
              }
            }, userId);
            
            console.log('✅ Canvas state synced with NPU');
          }
        } catch (error) {
          console.warn('⚠️ Canvas NPU sync failed:', error);
        }
      },

      persistToLTM: async (elements: CanvasElement[], userId?: string) => {
        if (!userId || userId === 'anonymous') return;
        
        try {
          await serviceContainer.waitForReady();
          const { toolRegistry } = await import('../services/ToolRegistry');
          
          // Categorize and store canvas patterns
          const patterns = get().detectCanvasPatterns(elements);
          
          for (const pattern of patterns) {
            await toolRegistry.execute('store_memory', {
              action: 'store',
              userId,
              key: `canvas_pattern_${Date.now()}`,
              value: pattern.description,
              metadata: {
                category: 'canvas_behavior',
                pattern_type: pattern.type,
                confidence: pattern.confidence,
                elements_count: pattern.elements.length,
                timestamp: new Date().toISOString()
              }
            }, { sessionId: 'canvas-ltm', userId, startTime: Date.now() });
          }
          
          console.log('✅ Canvas patterns persisted to LTM:', patterns.length);
        } catch (error) {
          console.warn('⚠️ Canvas LTM persistence failed:', error);
        }
      },

      loadFromLTM: async (userId: string, sessionId?: string) => {
        try {
          await serviceContainer.waitForReady();
          const { toolRegistry } = await import('../services/ToolRegistry');
          
          const memoryResult = await toolRegistry.execute('store_memory', {
            action: 'search',
            userId,
            query: 'canvas patterns behavior layout preferences'
          }, { sessionId: sessionId || 'canvas-ltm', userId, startTime: Date.now() });
          
          const memories = memoryResult.data?.memories || [];
          const relevantElements: CanvasElement[] = [];
          
          // Reconstruct canvas preferences from LTM
          memories.forEach((memory: any) => {
            if (memory.metadata?.category === 'canvas_behavior') {
              // Create suggestion elements based on learned patterns
              const suggestionElement: CanvasElement = {
                id: `ltm-suggestion-${Date.now()}`,
                type: 'suggestion',
                content: {
                  title: 'AI Suggestion',
                  description: memory.value,
                  confidence: memory.metadata?.confidence || 0.5,
                  source: 'ltm'
                },
                position: { x: 20, y: 20 },
                size: { width: 250, height: 100 },
                timestamp: new Date(),
                layer: 1,
                metadata: { sourceMessage: memory.description || 'AI suggestion' }
              };
              relevantElements.push(suggestionElement);
            }
          });
          
          console.log('📚 Loaded canvas patterns from LTM:', relevantElements.length);
          return relevantElements;
        } catch (error) {
          console.warn('⚠️ Canvas LTM loading failed:', error);
          return [];
        }
      },

      analyzeCanvasWithAI: async (elements: CanvasElement[], context?: any) => {
        try {
          await serviceContainer.waitForReady();
          const intentAnalysisService = serviceContainer.get('intentAnalysisService') as any;
          
          if (intentAnalysisService) {
            const canvasDescription = `Canvas with ${elements.length} elements: ${
              elements.map(e => `${e.type}(${e.size.width}x${e.size.height})`).join(', ')
            }`;
            
            const analysis = await intentAnalysisService.analyzeIntentHierarchy(
              canvasDescription,
              {
                canvasElements: elements,
                canvasContext: context,
                elementTypes: elements.map(e => e.type),
                totalElements: elements.length
              }
            );
            
            return {
              primaryDomain: analysis.primaryDomain,
              layoutOptimization: analysis.characteristics?.isAnalytical ? 'grid' : 'organic',
              collaborationSuggested: analysis.characteristics?.isCollaborative,
              creativityLevel: analysis.characteristics?.isCreative ? 'high' : 'medium',
              suggestions: get().suggestOptimizations(elements)
            };
          }
        } catch (error) {
          console.warn('⚠️ Canvas AI analysis failed:', error);
        }
        return null;
      },

      createSmartLayout: async (elements: CanvasElement[]) => {
        const state = get();
        const conversationId = state.currentConversationId;
        
        // AI-powered layout algorithm
        const analysis = await get().analyzeCanvasWithAI(elements);
        const layoutType = analysis?.layoutOptimization || 'grid';
        
        const updatedElements = elements.map((element, index) => {
          let newPosition;
          
          if (layoutType === 'grid') {
            // Grid layout
            const cols = Math.ceil(Math.sqrt(elements.length));
            const col = index % cols;
            const row = Math.floor(index / cols);
            newPosition = {
              x: col * 250 + 50,
              y: row * 200 + 50
            };
          } else {
            // Organic layout based on content relationships
            const angle = (index / elements.length) * 2 * Math.PI;
            const radius = 150 + (elements.length * 10);
            newPosition = {
              x: 300 + Math.cos(angle) * radius,
              y: 300 + Math.sin(angle) * radius
            };
          }
          
          return { ...element, position: newPosition };
        });
        
        set((state) => ({
          canvasElementsByConversation: {
            ...state.canvasElementsByConversation,
            [conversationId]: updatedElements
          }
        }));
        
        console.log(`🎯 Applied ${layoutType} layout to ${elements.length} elements`);
      },

      detectCanvasPatterns: (elements: CanvasElement[]) => {
        const patterns = [];
        
        // Spatial clustering pattern
        const clusters = detectSpatialClusters(elements);
        if (clusters.length > 1) {
          patterns.push({
            type: 'spatial_clustering',
            description: `User organizes content in ${clusters.length} distinct groups`,
            confidence: 0.8,
            elements: clusters.flat()
          });
        }
        
        // Element type preferences
        const typeDistribution = elements.reduce((acc, el) => {
          acc[el.type] = (acc[el.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const dominantType = Object.entries(typeDistribution)
          .sort(([,a], [,b]) => b - a)[0];
        
        if (dominantType && dominantType[1] > elements.length * 0.6) {
          patterns.push({
            type: 'content_preference',
            description: `User primarily works with ${dominantType[0]} content`,
            confidence: 0.9,
            elements: elements.filter(e => e.type === dominantType[0])
          });
        }
        
        return patterns;
      },

      suggestOptimizations: (elements: CanvasElement[]) => {
        const suggestions = [];
        
        // Overcrowding detection
        const density = calculateCanvasDensity(elements);
        if (density > 0.7) {
          suggestions.push({
            type: 'layout',
            title: 'Reduce Clutter',
            description: 'Canvas appears crowded. Consider grouping related elements.',
            action: 'group_elements',
            priority: 'high'
          });
        }
        
        // Alignment opportunities
        const misalignedElements = detectMisalignedElements(elements);
        if (misalignedElements.length > 2) {
          suggestions.push({
            type: 'alignment',
            title: 'Improve Alignment',
            description: `${misalignedElements.length} elements could benefit from alignment.`,
            action: 'auto_align',
            priority: 'medium'
          });
        }
        
        return suggestions;
      },

      enableCollaborativeMode: async (sessionId: string) => {
        try {
          await serviceContainer.waitForReady();
          // TODO: Integrate with WebSocket collaboration system
          
          set((state) => ({
            canvasElementsByConversation: {
              ...state.canvasElementsByConversation,
              [sessionId]: state.canvasElementsByConversation[sessionId]?.map(el => ({
                ...el,
                metadata: {
                  ...el.metadata,
                  collaborative: true,
                  lastCollaborativeSync: new Date()
                }
              })) || []
            }
          }));
          
          console.log('🤝 Collaborative mode enabled for session:', sessionId);
        } catch (error) {
          console.warn('⚠️ Collaborative mode setup failed:', error);
        }
      },

      // STATE-OF-THE-ART SYSTEMS IMPLEMENTATION

      // Initialize Event Sourcing revision history
      initializeRevisionHistory: (sessionId: string) => {
        const revisionHistory = createRevisionHistory(sessionId);
        set({ revisionHistory });
        console.log('📚 Event Sourcing revision history initialized for session:', sessionId);
      },

      // Initialize Advanced State Machine
      initializeStateMachine: (sessionId: string) => {
        const stateMachine = createStateMachine({
          id: `canvas-${sessionId}`,
          initial: 'idle',
          context: { sessionId, elements: [], collaborators: [] },
          states: {
            idle: {
              id: 'idle',
              type: 'atomic',
              on: {
                ELEMENT_CREATED: {
                  target: 'active',
                  actions: [actions.assign({ lastAction: 'create' })]
                },
                COLLABORATION_STARTED: {
                  target: 'collaborative',
                  guards: [guards.exists('sessionId')]
                },
                TIMER: {
                  target: 'idle',
                  actions: [actions.assign({ lastAction: 'timeout' })]
                }
              },
              tags: ['ready']
            },
            active: {
              id: 'active',
              type: 'atomic',
              on: {
                ELEMENT_CREATED: {
                  target: 'active',
                  actions: [actions.assign({ lastAction: 'create' })]
                },
                ELEMENT_UPDATED: {
                  target: 'active',
                  actions: [actions.assign({ lastAction: 'update' })]
                },
                ELEMENT_DELETED: {
                  target: 'active',
                  actions: [actions.assign({ lastAction: 'delete' })]
                },
                IDLE_TIMEOUT: {
                  target: 'idle'
                },
                TIMER: {
                  target: 'idle',
                  actions: [actions.assign({ lastAction: 'timeout' })]
                }
              },
              after: {
                30000: { target: 'idle' } // Auto-idle after 30 seconds
              },
              tags: ['editing']
            },
            collaborative: {
              id: 'collaborative',
              type: 'compound',
              initial: 'syncing',
              states: {
                syncing: {
                  id: 'syncing',
                  type: 'atomic',
                  on: {
                    SYNC_COMPLETE: { target: 'connected' }
                  }
                },
                connected: {
                  id: 'connected',
                  type: 'atomic',
                  on: {
                    COLLABORATOR_JOINED: {
                      target: 'connected',
                      actions: [actions.log('Collaborator joined')]
                    }
                  }
                }
              },
              on: {
                COLLABORATION_ENDED: { target: 'active' }
              },
              tags: ['collaborative']
            }
          }
        });

        set({ stateMachine });
        console.log('🤖 Advanced State Machine initialized for session:', sessionId);
      },

      // Transition state machine events
      transitionState: (event: string, payload?: any) => {
        const stateMachine = get().stateMachine;
        if (!stateMachine) {
          console.warn('⚠️ State machine not initialized');
          return;
        }
        
        try {
          stateMachine.send(event);
          console.log('🔄 State transitioned:', event, payload);
        } catch (error) {
          console.error('❌ State transition failed:', error);
        }
      },

      // Get current state machine state
      getCurrentMachineState: () => {
        const stateMachine = get().stateMachine;
        return stateMachine ? stateMachine.getState() : null;
      },

      // Record element changes in event sourcing system
      recordElementChange: async (elementId: string, changeType: string, oldValue?: any, newValue?: any) => {
        const revisionHistory = get().revisionHistory;
        if (!revisionHistory) return;

        try {
          // Create appropriate event based on change type
          if (changeType === 'VERSION_CREATED') {
            await revisionHistory.addEvent({
              type: 'CONTENT_INSERTED',
              elementId,
              userId: 'canvas-user',
              sessionId: get().currentConversationId,
              position: 0,
              content: newValue?.content || '',
              metadata: { versionId: newValue?.versionId, globalVersion: newValue?.globalVersion }
            } as any);
          } else if (changeType === 'VERSION_FINALIZED') {
            await revisionHistory.addEvent({
              type: 'SNAPSHOT_CREATED',
              userId: 'canvas-user',
              sessionId: get().currentConversationId,
              reason: 'version_finalized',
              elements: [],
              metadata: { versionId: newValue?.versionId, elementId }
            } as any);
          } else if (changeType === 'VERSION_ROLLBACK') {
            await revisionHistory.addEvent({
              type: 'CONTENT_REPLACED',
              elementId,
              userId: 'canvas-user',
              sessionId: get().currentConversationId,
              startPosition: 0,
              endPosition: -1,
              oldContent: oldValue || '',
              newContent: newValue?.content || ''
            } as any);
          } else {
            // Fallback for unknown change types - use a generic content replaced event
            await revisionHistory.addEvent({
              type: 'CONTENT_REPLACED',
              elementId: elementId || 'unknown',
              userId: 'canvas-user',
              sessionId: get().currentConversationId,
              startPosition: 0,
              endPosition: -1,
              oldContent: oldValue?.toString() || '',
              newContent: newValue?.toString() || ''
            } as any);
          }
        } catch (error) {
          console.warn('⚠️ Failed to record element change:', error);
        }
      },

      // Get revision history for UI display
      getRevisionHistory: () => {
        const revisionHistory = get().revisionHistory;
        return revisionHistory ? revisionHistory.getRevisionHistory() : [];
      },

      // Time travel functionality
      timeTravel: async (timestamp: number) => {
        const revisionHistory = get().revisionHistory;
        if (!revisionHistory) return;

        try {
          const historicalState = await revisionHistory.getStateAtTime(timestamp);
          
          // Convert historical state back to canvas elements
          const elements = Object.values(historicalState).filter(item => 
            item && typeof item === 'object' && 'id' in item
          ) as CanvasElement[];

          const conversationId = get().currentConversationId;
          set(state => ({
            canvasElementsByConversation: {
              ...state.canvasElementsByConversation,
              [conversationId]: elements
            }
          }));

          console.log('⏰ Time traveled to:', new Date(timestamp));
        } catch (error) {
          console.warn('⚠️ Time travel failed:', error);
        }
      },

      // Get current state machine state
      getCurrentStateMachineState: () => {
        const stateMachine = get().stateMachine;
        return stateMachine ? stateMachine.getState() : null;
      },

      // CRITICAL FIX: Unified Version Control System
      createAtomicVersion: async (elementId: string, content: string, request?: string): Promise<string> => {
        const state = get();
        
        // Check if versioning is locked
        if (state.versionLocks.get(elementId)) {
          throw new Error(`Versioning locked for element ${elementId}`);
        }
        
        // Lock versioning during creation
        set(state => ({
          versionLocks: new Map(state.versionLocks).set(elementId, true)
        }));
        
        try {
          const newVersionNumber = state.globalVersionCounter + 1;
          const versionId = `${elementId}-v${newVersionNumber}-${Date.now()}`;
          
          // Record the transition
          const transition = {
            from: state.globalVersionCounter,
            to: newVersionNumber,
            timestamp: Date.now()
          };
          
          set(state => ({
            globalVersionCounter: newVersionNumber,
            activeVersionTransitions: new Map(state.activeVersionTransitions).set(elementId, transition)
          }));
          
          // Add version to element using existing system but with atomic guarantees
          get().addVersion(elementId, content, request, {
            atomicVersionId: versionId,
            globalVersion: newVersionNumber,
            transactionId: `tx-${Date.now()}`
          });
          
          // Update state machine
          get().transitionState?.('ELEMENT_CREATED', { elementId, versionId });
          
          // Record in event sourcing
          await get().recordElementChange?.(elementId, 'VERSION_CREATED', null, {
            versionId,
            content,
            globalVersion: newVersionNumber
          });
          
          console.log(`✅ Created atomic version ${versionId} (global: ${newVersionNumber})`);
          return versionId;
          
        } finally {
          // Always unlock versioning
          set(state => ({
            versionLocks: new Map(state.versionLocks).set(elementId, false)
          }));
        }
      },

      finalizeVersion: async (elementId: string, versionId: string): Promise<void> => {
        try {
          // Mark version as frozen/finalized
          get().updateVersionState(elementId, versionId, 'frozen');
          
          // Update state machine
          get().transitionState?.('ELEMENT_UPDATED', { elementId, versionId, action: 'finalized' });
          
          // Clear active transition
          set(state => {
            const newTransitions = new Map(state.activeVersionTransitions);
            newTransitions.delete(elementId);
            return { activeVersionTransitions: newTransitions };
          });
          
          // Record in event sourcing
          await get().recordElementChange?.(elementId, 'VERSION_FINALIZED', null, { versionId });
          
          console.log(`🔒 Finalized version ${versionId} for element ${elementId}`);
          
        } catch (error) {
          console.error('❌ Failed to finalize version:', error);
          throw error;
        }
      },

      rollbackToVersion: async (elementId: string, versionId: string): Promise<void> => {
        const element = get().getCurrentCanvasElements().find(el => el.id === elementId);
        
        if (!element || !element.versions) {
          throw new Error(`Element or versions not found for ${elementId}`);
        }
        
        const targetVersion = element.versions.find(v => v.id === versionId);
        if (!targetVersion) {
          throw new Error(`Version ${versionId} not found`);
        }
        
        try {
          // Lock versioning during rollback
          get().lockVersioning(elementId);
          
          // Update element content to target version
          get().updateCanvasElement(elementId, {
            content: targetVersion.content,
            currentVersion: targetVersion.version,
            state: 'active'
          });
          
          // Mark all later versions as archived
          const updatedVersions = element.versions.map(v => 
            v.version > targetVersion.version 
              ? { ...v, state: 'draft' as const } 
              : v
          );
          
          get().updateCanvasElement(elementId, { versions: updatedVersions });
          
          // Update state machine
          get().transitionState?.('ELEMENT_UPDATED', { elementId, versionId, action: 'rollback' });
          
          // Record in event sourcing
          await get().recordElementChange?.(elementId, 'VERSION_ROLLBACK', null, { 
            targetVersionId: versionId,
            targetVersion: targetVersion.version
          });
          
          console.log(`⏮️ Rolled back element ${elementId} to version ${versionId}`);
          
        } finally {
          get().unlockVersioning(elementId);
        }
      },

      getVersionHistory: (elementId: string) => {
        const element = get().getCurrentCanvasElements().find(el => el.id === elementId);
        return element?.versions || [];
      },

      lockVersioning: (elementId: string) => {
        set(state => ({
          versionLocks: new Map(state.versionLocks).set(elementId, true)
        }));
        console.log(`🔒 Locked versioning for element ${elementId}`);
      },

      unlockVersioning: (elementId: string) => {
        set(state => ({
          versionLocks: new Map(state.versionLocks).set(elementId, false)
        }));
        console.log(`🔓 Unlocked versioning for element ${elementId}`);
      },

      // Missing restoreFromTime implementation
      restoreFromTime: async (timestamp: number) => {
        const revisionHistory = get().revisionHistory;
        if (!revisionHistory) {
          console.warn('⚠️ No revision history available for time restoration');
          return;
        }

        try {
          const historicalState = await revisionHistory.getStateAtTime(timestamp);
          if (!historicalState) {
            console.warn('⚠️ No state found at timestamp:', timestamp);
            return;
          }

          const elements = historicalState.elements || [];
          const conversationId = get().currentConversationId;

          set(state => ({
            canvasElementsByConversation: {
              ...state.canvasElementsByConversation,
              [conversationId]: elements
            }
          }));

          console.log('⏰ Time traveled to:', new Date(timestamp));
        } catch (error) {
          console.warn('⚠️ Time travel failed:', error);
        }
      }
        }),
        {
          name: 'neuraplay-canvas-store',
      partialize: (state) => ({
        // Persist essential state AND canvas elements with frozen versions
        userDecisionPatterns: state.userDecisionPatterns,
        canvasTheme: state.canvasTheme,
        splitRatio: state.splitRatio,
        chatPosition: state.chatPosition,
        show3DGraphs: state.show3DGraphs,
        // CRITICAL: Persist canvas elements including frozenVersions
        canvasElementsByConversation: state.canvasElementsByConversation,
        currentConversationId: state.currentConversationId
      }),
      // Handle Set serialization for completedVersions
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined' || !window.localStorage) return null;
          
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          
          // Convert arrays back to Sets for completedVersions
          if (parsed.state?.canvasElementsByConversation) {
            Object.values(parsed.state.canvasElementsByConversation).forEach((elements: any) => {
              elements?.forEach((el: any) => {
                if (el.completedVersions && Array.isArray(el.completedVersions)) {
                  el.completedVersions = new Set(el.completedVersions);
                }
              });
            });
          }
          
          return parsed;
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined' || !window.localStorage) return;
          
          // Convert Sets to arrays for completedVersions before saving
          const stateCopy = JSON.parse(JSON.stringify(value, (_key, val) => {
            if (val instanceof Set) {
              return Array.from(val);
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

// Helper functions for canvas analysis
function detectSpatialClusters(elements: CanvasElement[]): CanvasElement[][] {
  if (elements.length < 2) return [elements];
  
  const clusters: CanvasElement[][] = [];
  const visited = new Set<string>();
  const clusterDistance = 150; // pixels
  
  for (const element of elements) {
    if (visited.has(element.id)) continue;
    
    const cluster = [element];
    visited.add(element.id);
    
    // Find nearby elements
    for (const other of elements) {
      if (visited.has(other.id)) continue;
      
      const distance = Math.sqrt(
        Math.pow(element.position.x - other.position.x, 2) +
        Math.pow(element.position.y - other.position.y, 2)
      );
      
      if (distance < clusterDistance) {
        cluster.push(other);
        visited.add(other.id);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters;
}

function calculateCanvasDensity(elements: CanvasElement[]): number {
  if (elements.length === 0) return 0;
  
  const totalArea = elements.reduce((sum, el) => 
    sum + (el.size.width * el.size.height), 0
  );
  
  // Estimate canvas area from element positions
  const positions = elements.map(e => e.position);
  const minX = Math.min(...positions.map(p => p.x));
  const maxX = Math.max(...positions.map(p => p.x));
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y));
  
  const canvasArea = (maxX - minX + 200) * (maxY - minY + 200);
  return totalArea / canvasArea;
}

function detectMisalignedElements(elements: CanvasElement[]): CanvasElement[] {
  const misaligned = [];
  const tolerance = 5; // pixels
  
  // Check for potential horizontal alignment
  const yPositions = elements.map(e => e.position.y);
  const commonYs = yPositions.filter((y) => 
    yPositions.filter(otherY => Math.abs(y - otherY) < tolerance).length > 1
  );
  
  if (commonYs.length > 0) {
    const targetY = commonYs[0];
    misaligned.push(...elements.filter(e => 
      Math.abs(e.position.y - targetY) > tolerance &&
      Math.abs(e.position.y - targetY) < tolerance * 3
    ));
  }
  
  return misaligned;
}

export default useCanvasStore;
