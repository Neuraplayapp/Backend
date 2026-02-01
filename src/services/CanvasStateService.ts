/**
 * 🎯 Canvas State Service
 * 
 * Integrates state machines with canvas operations:
 * - Element lifecycle (idle -> creating -> active -> completed -> archived)
 * - State transitions with guards
 * - Event handling
 * - State persistence
 * 
 * Uses the existing AdvancedStateMachine architecture properly.
 */

import { AdvancedStateMachine, createStateMachine, actions, guards } from './AdvancedStateMachine';
import type { CanvasElement } from '../stores/canvasStore';

export type ElementLifecycleState = 'idle' | 'creating' | 'active' | 'completed' | 'archived';

export interface CanvasStateTransition {
  elementId: string;
  from: ElementLifecycleState;
  to: ElementLifecycleState;
  event: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class CanvasStateService {
  private stateMachines: Map<string, AdvancedStateMachine> = new Map();
  private transitionHistory: CanvasStateTransition[] = [];
  private sessionId: string;

  constructor(sessionId: string = 'default') {
    this.sessionId = sessionId;
  }

  /**
   * Initialize state machine for an element
   */
  initializeElement(elementId: string, initialState: ElementLifecycleState = 'idle'): void {
    // Check if machine exists AND is valid
    if (this.stateMachines.has(elementId)) {
      const existingMachine = this.stateMachines.get(elementId);
      const existingState = existingMachine?.getState()?.value;
      
      // If existing machine has valid state, skip
      if (existingState !== undefined && existingState !== null) {
        console.log(`[np] state:init SKIP - already initialized: ${elementId} (state: ${existingState})`);
      return;
      }
      
      // Existing machine is corrupted (undefined state) - DELETE and reinitialize
      console.warn(`[np] state:init REPLACING corrupted machine: ${elementId} (had undefined state)`);
      this.stateMachines.delete(elementId);
    }

    try {
    const stateMachine = createStateMachine({
      id: `canvas-element-${elementId}`,
      initial: initialState,
      context: {
        elementId,
        createdAt: Date.now()
      },
      states: {
        idle: {
          on: {
            START_CREATION: 'creating',
            ACTIVATE: 'active'
          }
        },
        creating: {
          on: {
            CREATION_COMPLETE: 'active',
            CANCEL: 'idle',
            ERROR: 'idle'
          },
          entry: () => console.log(`[np] state:creating ${elementId}`)
        },
        active: {
          on: {
            COMPLETE: 'completed',
            ARCHIVE: 'archived',
            RESET: 'idle'
          },
          entry: () => console.log(`[np] state:active ${elementId}`)
        },
        completed: {
          on: {
            ARCHIVE: 'archived',
            REACTIVATE: 'active'
          },
          entry: () => console.log(`[np] state:completed ${elementId}`)
        },
        archived: {
          on: {
            RESTORE: 'idle'
          },
          entry: () => console.log(`[np] state:archived ${elementId}`)
        }
      }
    });

    this.stateMachines.set(elementId, stateMachine);
    
    // DEFENSIVE: Verify initialization was successful
    const verifyState = stateMachine.getState();
    if (!verifyState || verifyState.value === undefined) {
      console.error(`[np] state:init VERIFICATION FAILED for ${elementId} - state is undefined after creation`);
      this.stateMachines.delete(elementId); // Remove broken machine
      throw new Error(`State machine initialization failed for ${elementId}`);
    }
    
    console.log(`[np] state:init ${elementId} -> ${initialState} (verified: ${verifyState.value})`);
    } catch (error) {
      console.error(`[np] state:init FAILED for ${elementId}:`, error);
      // Don't throw - allow element creation to proceed even if state machine fails
      // This prevents the entire canvas operation from failing
    }
  }

  /**
   * Transition element to a new state
   * CRITICAL FIX: Handle version IDs (canvas-123-v1) by extracting base element ID
   */
  async transition(elementId: string, event: string, metadata?: Record<string, any>): Promise<boolean> {
    // CRITICAL FIX: Strip version suffix (-v1, -v2) if present
    // Version IDs like "canvas-1765635375290-fmh6amgh0-v1" should use base "canvas-1765635375290-fmh6amgh0"
    const baseElementId = elementId.replace(/-v\d+$/, '');
    
    const machine = this.stateMachines.get(baseElementId);
    if (!machine) {
      console.warn(`[np] state:transition FAILED - no machine for ${baseElementId} (extracted from ${elementId}, may not be initialized yet)`);
      // GRACEFUL: Don't fail the entire operation, just log and continue
      return false;
    }

    try {
    // DEFENSIVE: Check if state is properly initialized
    const state = machine.getState();
    if (!state || state.value === undefined || state.value === null) {
      console.error(`[np] state:transition CRITICAL ERROR - state is undefined for ${baseElementId}`, {
        hasState: !!state,
        stateValue: state?.value,
        event
      });
      
      // RECOVERY: Try to reinitialize the state machine
      console.warn(`[np] state:transition attempting recovery by reinitializing ${baseElementId}`);
      this.stateMachines.delete(baseElementId);
      this.initializeElement(baseElementId, 'creating');
      
      // Try again after recovery
      const recoveredMachine = this.stateMachines.get(baseElementId);
      if (!recoveredMachine || !recoveredMachine.getState()?.value) {
        console.error(`[np] state:transition RECOVERY FAILED for ${baseElementId}`);
        return false;
      }
      
      // Continue with recovered machine
        return await this.transition(elementId, event, { ...metadata, recovered: true });
    }
    
    const currentState = state.value as ElementLifecycleState;
      
      // Check if transition is valid using the state transition map
      const availableEvents = this.getAvailableEvents(baseElementId);
      const canTransition = availableEvents.includes(event);

    if (!canTransition) {
      console.warn(`[np] state:transition REJECTED - ${baseElementId} cannot ${event} from ${currentState}`, {
        currentState,
        event,
          availableEvents
      });
      return false;
    }

      // Perform transition - MUST await to get correct new state
      const newStateResult = await machine.send(event);
      const newState = newStateResult.value as ElementLifecycleState;

    // Record transition (use base element ID for consistency)
    const transition: CanvasStateTransition = {
      elementId: baseElementId,
      from: currentState,
      to: newState,
      event,
      timestamp: Date.now(),
      metadata: { ...metadata, originalId: elementId } // Preserve original version ID in metadata
    };
    this.transitionHistory.push(transition);

    console.log(`[np] state:transition ${baseElementId} ${currentState} --${event}--> ${newState}${elementId !== baseElementId ? ` (version: ${elementId})` : ''}`);
    return true;
    } catch (error) {
      console.error(`[np] state:transition ERROR for ${baseElementId}:`, error);
      // Graceful failure - don't throw, just return false
      return false;
    }
  }

  /**
   * Get current state of an element
   * Handles version IDs by extracting base element ID
   */
  getState(elementId: string): ElementLifecycleState | null {
    const baseElementId = elementId.replace(/-v\d+$/, '');
    const machine = this.stateMachines.get(baseElementId);
    if (!machine) return null;
    return machine.getState().value as ElementLifecycleState;
  }

  /**
   * Check if element can perform a transition
   * Handles version IDs by extracting base element ID
   */
  canTransition(elementId: string, event: string): boolean {
    const baseElementId = elementId.replace(/-v\d+$/, '');
    const machine = this.stateMachines.get(baseElementId);
    if (!machine) return false;
    return machine.getState().can(event); // FIXED: use getState().can()
  }

  /**
   * Get all possible events for current state
   * Handles version IDs by extracting base element ID
   */
  getAvailableEvents(elementId: string): string[] {
    const baseElementId = elementId.replace(/-v\d+$/, '');
    const machine = this.stateMachines.get(baseElementId);
    if (!machine) return [];
    
    const currentState = machine.getState().value as string;
    
    // Use the state transition map to determine available events
    // This is based on the state machine config defined in initializeElement
    const stateTransitions: Record<string, string[]> = {
      'idle': ['START_CREATION', 'ACTIVATE'],
      'creating': ['CREATION_COMPLETE', 'CANCEL', 'ERROR'],
      'active': ['COMPLETE', 'ARCHIVE', 'RESET'],
      'completed': ['ARCHIVE', 'REACTIVATE'],
      'archived': ['RESTORE']
    };
    
    return stateTransitions[currentState] || [];
  }

  /**
   * Get transition history for an element
   * Handles version IDs by extracting base element ID
   */
  getHistory(elementId: string): CanvasStateTransition[] {
    const baseElementId = elementId.replace(/-v\d+$/, '');
    return this.transitionHistory.filter(t => t.elementId === baseElementId);
  }

  /**
   * Get full transition history
   */
  getAllHistory(): CanvasStateTransition[] {
    return [...this.transitionHistory];
  }

  /**
   * Remove element state machine
   */
  removeElement(elementId: string): void {
    this.stateMachines.delete(elementId);
    console.log(`[np] state:remove ${elementId}`);
  }

  /**
   * Clear all state machines
   */
  clear(): void {
    this.stateMachines.clear();
    this.transitionHistory = [];
    console.log('[np] state:clear all state machines');
  }

  /**
   * Export state for persistence
   */
  exportState(): Record<string, any> {
    const exported: Record<string, any> = {
      sessionId: this.sessionId,
      elements: {},
      history: this.transitionHistory
    };

    this.stateMachines.forEach((machine, elementId) => {
      exported.elements[elementId] = {
        currentState: machine.getState().value,
        context: machine.getState().context
      };
    });

    return exported;
  }

  /**
   * Import state from persistence
   */
  importState(data: Record<string, any>): void {
    if (data.sessionId) this.sessionId = data.sessionId;
    if (data.history) this.transitionHistory = data.history;

    if (data.elements) {
      Object.entries(data.elements).forEach(([elementId, elementData]: [string, any]) => {
        this.initializeElement(elementId, elementData.currentState);
      });
    }
  }

  /**
   * Sync element state with canvas element object
   */
  syncElementState(element: Partial<CanvasElement>): ElementLifecycleState {
    if (!element.id) return 'idle';

    const currentState = this.getState(element.id);
    if (!currentState) {
      // Initialize if not exists
      this.initializeElement(element.id, element.state || 'idle');
      return element.state || 'idle';
    }

    return currentState;
  }

  /**
   * Auto-transition based on element changes
   */
  autoTransition(elementId: string, change: 'created' | 'updated' | 'completed' | 'archived'): void {
    const eventMap: Record<string, string> = {
      created: 'START_CREATION',
      updated: 'ACTIVATE',
      completed: 'COMPLETE',
      archived: 'ARCHIVE'
    };

    const event = eventMap[change];
    if (event) {
      // Fire and forget for auto-transitions - don't block
      this.transition(elementId, event, { autoTransition: true, change }).catch(err => {
        console.warn(`[np] state:auto-transition failed for ${elementId}:`, err);
      });
    }
  }
}

// Singleton instance
// Per-session singleton instances
const stateServiceInstances: Map<string, CanvasStateService> = new Map();

export function getCanvasStateService(sessionId?: string): CanvasStateService {
  const sid = sessionId || 'default';
  if (!stateServiceInstances.has(sid)) {
    stateServiceInstances.set(sid, new CanvasStateService(sid));
  }
  return stateServiceInstances.get(sid)!;
}


