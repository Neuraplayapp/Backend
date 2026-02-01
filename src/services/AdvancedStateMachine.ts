// State-of-the-Art Finite State Machine with XState-like patterns
// Implements hierarchical states, guards, actions, and time-travel debugging

// Simple EventEmitter implementation
class SimpleEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }
}

const EventEmitter = SimpleEventEmitter;
// Using simplified immutable state updates without immer
function produce<T>(state: T, updater: (draft: T) => void): T {
  const newState = JSON.parse(JSON.stringify(state));
  updater(newState);
  return newState;
}

// State Machine Types
export type StateValue = string | Record<string, StateValue>;

export interface StateMachineContext {
  [key: string]: any;
}

export interface StateMachineEvent {
  type: string;
  payload?: any;
  timestamp?: number;
  meta?: Record<string, any>;
}

export interface StateTransition {
  target: StateValue;
  actions?: ActionFunction[];
  guards?: GuardFunction[];
  meta?: Record<string, any>;
}

export interface StateNode {
  id: string;
  type: 'atomic' | 'compound' | 'parallel' | 'final';
  initial?: string;
  states?: Record<string, StateNode>;
  on?: Record<string, StateTransition | StateTransition[]>;
  entry?: ActionFunction[];
  exit?: ActionFunction[];
  meta?: Record<string, any>;
  
  // Advanced features
  after?: Record<number, StateTransition>; // Delayed transitions
  always?: StateTransition[]; // Eventless transitions
  invoke?: ServiceInvocation[];
  tags?: string[];
}

export interface StateMachineConfig {
  id: string;
  initial: StateValue;
  context?: StateMachineContext;
  states: Record<string, StateNode>;
  meta?: Record<string, any>;
  
  // Global handlers
  on?: Record<string, StateTransition | StateTransition[]>;
  entry?: ActionFunction[];
  exit?: ActionFunction[];
}

export interface ServiceInvocation {
  id: string;
  src: string | ServiceFunction;
  data?: any;
  onDone?: StateTransition;
  onError?: StateTransition;
}

export type ActionFunction = (context: StateMachineContext, event: StateMachineEvent) => StateMachineContext | void;
export type GuardFunction = (context: StateMachineContext, event: StateMachineEvent) => boolean;
export type ServiceFunction = (context: StateMachineContext, event: StateMachineEvent) => Promise<any>;

export interface StateMachineState {
  value: StateValue;
  context: StateMachineContext;
  meta: {
    timestamp: number;
    changed: boolean;
    tags: string[];
    actions: string[];
  };
  history: StateMachineHistoryEntry[];
}

export interface StateMachineHistoryEntry {
  state: StateValue;
  event: StateMachineEvent;
  timestamp: number;
  context: StateMachineContext;
  actions: string[];
  meta?: Record<string, any>;
}

export class AdvancedStateMachine extends EventEmitter {
  private config: StateMachineConfig;
  private currentState: StateMachineState;
  private services: Map<string, any> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private historyLimit: number = 100;
  
  // Built-in actions registry
  private actions: Map<string, ActionFunction> = new Map();
  private guards: Map<string, GuardFunction> = new Map();
  private serviceRegistry: Map<string, ServiceFunction> = new Map();

  constructor(config: StateMachineConfig) {
    super();
    this.config = config;
    this.currentState = this.createInitialState();
    this.registerBuiltInActions();
    this.registerBuiltInGuards();
  }

  /**
   * Send event to state machine with immutable state updates
   */
  async send(event: string | StateMachineEvent): Promise<StateMachineState> {
    const normalizedEvent: StateMachineEvent = typeof event === 'string' 
      ? { type: event, timestamp: Date.now() }
      : { ...event, timestamp: event.timestamp || Date.now() };

    // Only log in development mode and for important events
    if (process.env.NODE_ENV === 'development' && normalizedEvent.type !== 'heartbeat' && normalizedEvent.type !== 'tick') {
      console.log('🎯 State machine event:', {
        current: this.currentState.value,
        event: normalizedEvent.type,
        payload: normalizedEvent.payload
      });
    }

    const previousState = this.currentState;
    
    try {
      // Find matching transition
      const transition = this.findTransition(this.currentState.value, normalizedEvent);
      
      if (!transition) {
        console.log('⚠️ No transition found for event:', normalizedEvent.type);
        return this.currentState;
      }

      // Check guards
      if (transition.guards && !this.evaluateGuards(transition.guards, normalizedEvent)) {
        console.log('🚫 Transition blocked by guards');
        return this.currentState;
      }

      // Create new state with Immer for immutability
      const newState = produce(this.currentState, draft => {
        // Update state value
        draft.value = transition.target;
        draft.meta.timestamp = Date.now();
        draft.meta.changed = true;
        draft.meta.actions = [];

        // Execute exit actions for current state
        const currentStateNode = this.getStateNode(previousState.value);
        if (currentStateNode?.exit) {
          this.executeActions(currentStateNode.exit, draft.context, normalizedEvent);
        }

        // Execute transition actions
        if (transition.actions) {
          this.executeActions(transition.actions, draft.context, normalizedEvent);
        }

        // Execute entry actions for new state
        const newStateNode = this.getStateNode(transition.target);
        if (newStateNode?.entry) {
          this.executeActions(newStateNode.entry, draft.context, normalizedEvent);
        }

        // Update tags
        draft.meta.tags = this.getStateTags(transition.target);

        // Add to history
        draft.history.push({
          state: previousState.value,
          event: normalizedEvent,
          timestamp: Date.now(),
          context: { ...previousState.context },
          actions: draft.meta.actions,
          meta: transition.meta
        });

        // Limit history size
        if (draft.history.length > this.historyLimit) {
          draft.history.splice(0, draft.history.length - this.historyLimit);
        }
      });

      this.currentState = newState;

      // Handle services/invocations
      await this.handleStateServices(transition.target);

      // Handle delayed transitions
      this.handleDelayedTransitions(transition.target);

      // Handle eventless transitions
      await this.handleEventlessTransitions();

      // Emit state change
      this.emit('state-change', {
        previous: previousState,
        current: this.currentState,
        event: normalizedEvent
      });

      return this.currentState;

    } catch (error) {
      console.error('❌ State machine error:', error);
      
      // Revert to previous state on error
      this.currentState = produce(previousState, draft => {
        draft.meta.timestamp = Date.now();
        draft.history.push({
          state: previousState.value,
          event: { ...normalizedEvent, type: 'ERROR' },
          timestamp: Date.now(),
          context: { ...previousState.context },
          actions: ['error'],
          meta: { error: error instanceof Error ? error.message : String(error) }
        });
      });

      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get current state with computed properties
   */
  getState(): StateMachineState & {
    matches: (state: StateValue) => boolean;
    can: (event: string) => boolean;
    hasTag: (tag: string) => boolean;
  } {
    return {
      ...this.currentState,
      matches: (state: StateValue) => this.matches(state),
      can: (event: string) => this.canTransition(event),
      hasTag: (tag: string) => this.currentState.meta.tags.includes(tag)
    };
  }

  /**
   * Check if current state matches pattern
   */
  matches(state: StateValue): boolean {
    if (typeof state === 'string') {
      return this.currentState.value === state || 
             (typeof this.currentState.value === 'object' && 
              Object.keys(this.currentState.value).includes(state));
    }
    
    // Handle nested state matching
    if (typeof this.currentState.value === 'object' && typeof state === 'object') {
      return Object.entries(state).every(([key, value]) => 
        this.currentState.value[key] === value
      );
    }
    
    return false;
  }

  /**
   * Check if event can trigger a transition
   */
  canTransition(eventType: string): boolean {
    const transition = this.findTransition(this.currentState.value, { type: eventType });
    return !!transition;
  }

  /**
   * Time travel: restore state from history
   */
  timeTravel(historyIndex: number): void {
    if (historyIndex < 0 || historyIndex >= this.currentState.history.length) {
      throw new Error('Invalid history index');
    }

    const historyEntry = this.currentState.history[historyIndex];
    
    this.currentState = produce(this.currentState, draft => {
      draft.value = historyEntry.state;
      draft.context = { ...historyEntry.context };
      draft.meta.timestamp = Date.now();
      draft.meta.changed = true;
      draft.meta.tags = this.getStateTags(historyEntry.state);
      
      // Truncate history after this point
      draft.history = draft.history.slice(0, historyIndex + 1);
    });

    this.emit('time-travel', { index: historyIndex, state: this.currentState });
    console.log('⏰ Time travel to history index:', historyIndex);
  }

  /**
   * Get state history for debugging
   */
  getHistory(): StateMachineHistoryEntry[] {
    return [...this.currentState.history];
  }

  /**
   * Register custom action
   */
  registerAction(name: string, action: ActionFunction): void {
    this.actions.set(name, action);
  }

  /**
   * Register custom guard
   */
  registerGuard(name: string, guard: GuardFunction): void {
    this.guards.set(name, guard);
  }

  /**
   * Register custom service
   */
  registerService(name: string, service: ServiceFunction): void {
    this.serviceRegistry.set(name, service);
  }

  // Private Methods

  private createInitialState(): StateMachineState {
    return {
      value: this.config.initial,
      context: { ...this.config.context } || {},
      meta: {
        timestamp: Date.now(),
        changed: false,
        tags: this.getStateTags(this.config.initial),
        actions: []
      },
      history: []
    };
  }

  private findTransition(currentState: StateValue, event: StateMachineEvent): StateTransition | null {
    const stateNode = this.getStateNode(currentState);
    if (!stateNode?.on) return null;

    const transitions = stateNode.on[event.type];
    if (!transitions) return null;

    // Handle single transition or array of transitions
    const transitionArray = Array.isArray(transitions) ? transitions : [transitions];
    
    // Find first transition where all guards pass
    return transitionArray.find(t => 
      !t.guards || this.evaluateGuards(t.guards, event)
    ) || null;
  }

  private getStateNode(state: StateValue): StateNode | null {
    if (typeof state === 'string') {
      return this.config.states[state] || null;
    }
    
    // Handle nested states
    if (typeof state === 'object') {
      const parentKey = Object.keys(state)[0];
      return this.config.states[parentKey] || null;
    }
    
    return null;
  }

  private evaluateGuards(guards: GuardFunction[], event: StateMachineEvent): boolean {
    return guards.every(guard => {
      if (typeof guard === 'string') {
        const guardFunction = this.guards.get(guard);
        return guardFunction ? guardFunction(this.currentState.context, event) : false;
      }
      return guard(this.currentState.context, event);
    });
  }

  private executeActions(actions: ActionFunction[], context: StateMachineContext, event: StateMachineEvent): void {
    for (const action of actions) {
      try {
        if (typeof action === 'string') {
          const actionFunction = this.actions.get(action);
          if (actionFunction) {
            const result = actionFunction(context, event);
            if (result) Object.assign(context, result);
          }
        } else {
          const result = action(context, event);
          if (result) Object.assign(context, result);
        }
      } catch (error) {
        console.error('❌ Action execution error:', error);
      }
    }
  }

  private getStateTags(state: StateValue): string[] {
    const stateNode = this.getStateNode(state);
    return stateNode?.tags || [];
  }

  private async handleStateServices(state: StateValue): Promise<void> {
    const stateNode = this.getStateNode(state);
    if (!stateNode?.invoke) return;

    for (const invocation of stateNode.invoke) {
      try {
        const service = typeof invocation.src === 'string' 
          ? this.serviceRegistry.get(invocation.src)
          : invocation.src;

        if (service) {
          const result = await service(this.currentState.context, { type: 'INVOKE' });
          this.services.set(invocation.id, result);
          
          if (invocation.onDone) {
            await this.send({ type: 'DONE', payload: result });
          }
        }
      } catch (error) {
        if (invocation.onError) {
          await this.send({ type: 'ERROR', payload: error });
        }
      }
    }
  }

  private handleDelayedTransitions(state: StateValue): void {
    const stateNode = this.getStateNode(state);
    if (!stateNode?.after) return;

    for (const [delay, transition] of Object.entries(stateNode.after)) {
      const timerId = setTimeout(() => {
        this.send({ type: 'TIMER', meta: { delay } });
      }, parseInt(delay));
      
      this.timers.set(`${state}-${delay}`, timerId);
    }
  }

  private async handleEventlessTransitions(): Promise<void> {
    const stateNode = this.getStateNode(this.currentState.value);
    if (!stateNode?.always) return;

    for (const transition of stateNode.always) {
      if (!transition.guards || this.evaluateGuards(transition.guards, { type: 'ALWAYS' })) {
        await this.send({ type: 'ALWAYS' });
        break; // Only take first matching eventless transition
      }
    }
  }

  private registerBuiltInActions(): void {
    this.actions.set('log', (context, event) => {
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 State machine log:', { context, event });
      }
    });

    this.actions.set('assign', (context, event) => {
      return event.payload || {};
    });

    this.actions.set('reset', () => {
      return { ...this.config.context };
    });
  }

  private registerBuiltInGuards(): void {
    this.guards.set('always', () => true);
    this.guards.set('never', () => false);
    
    this.guards.set('hasPayload', (context, event) => {
      return !!event.payload;
    });
  }
}

// Factory function for creating state machines
export function createStateMachine(config: StateMachineConfig): AdvancedStateMachine {
  return new AdvancedStateMachine(config);
}

// Utility functions for state machine configuration
export const actions = {
  assign: (assignment: Partial<StateMachineContext> | ((context: StateMachineContext, event: StateMachineEvent) => Partial<StateMachineContext>)): ActionFunction => {
    return (context, event) => {
      if (typeof assignment === 'function') {
        return assignment(context, event);
      }
      return assignment;
    };
  },
  
  log: (message?: string): ActionFunction => {
    return (context, event) => {
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(message || 'State machine action', { context, event });
      }
    };
  }
};

export const guards = {
  equals: (key: string, value: any): GuardFunction => {
    return (context) => context[key] === value;
  },
  
  exists: (key: string): GuardFunction => {
    return (context) => key in context && context[key] != null;
  }
};
