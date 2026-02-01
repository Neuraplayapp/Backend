// State-of-the-Art Event Sourcing Revision History
// Implements CQRS, Event Sourcing, and CRDT patterns for collaborative editing

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

// Event Types for Complete Audit Trail
export type RevisionEvent = 
  | ContentInsertedEvent
  | ContentDeletedEvent
  | ContentReplacedEvent
  | ElementMovedEvent
  | ElementResizedEvent
  | CollaboratorJoinedEvent
  | CollaboratorLeftEvent
  | SnapshotCreatedEvent;

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: number;
  userId: string;
  sessionId: string;
  vectorClock: VectorClock;
  causedBy?: string; // Reference to causing event
}

export interface ContentInsertedEvent extends BaseEvent {
  type: 'CONTENT_INSERTED';
  elementId: string;
  position: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface ContentDeletedEvent extends BaseEvent {
  type: 'CONTENT_DELETED';
  elementId: string;
  position: number;
  length: number;
  deletedContent: string;
}

export interface ContentReplacedEvent extends BaseEvent {
  type: 'CONTENT_REPLACED';
  elementId: string;
  startPosition: number;
  endPosition: number;
  oldContent: string;
  newContent: string;
}

export interface ElementMovedEvent extends BaseEvent {
  type: 'ELEMENT_MOVED';
  elementId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export interface ElementResizedEvent extends BaseEvent {
  type: 'ELEMENT_RESIZED';
  elementId: string;
  from: { width: number; height: number };
  to: { width: number; height: number };
}

export interface CollaboratorJoinedEvent extends BaseEvent {
  type: 'COLLABORATOR_JOINED';
  collaboratorId: string;
  collaboratorInfo: {
    name: string;
    avatar?: string;
    permissions: string[];
  };
}

export interface CollaboratorLeftEvent extends BaseEvent {
  type: 'COLLABORATOR_LEFT';
  collaboratorId: string;
}

export interface SnapshotCreatedEvent extends BaseEvent {
  type: 'SNAPSHOT_CREATED';
  snapshotId: string;
  elementStates: Record<string, any>;
  reason: 'PERIODIC' | 'MANUAL' | 'BEFORE_MAJOR_CHANGE';
}

// Vector Clock for Causal Ordering
export interface VectorClock {
  [userId: string]: number;
}

// Revision State Snapshot
export interface RevisionSnapshot {
  id: string;
  timestamp: number;
  elements: Record<string, any>;
  metadata: {
    eventCount: number;
    lastEventId: string;
    collaborators: string[];
    version: string;
  };
}

// Operation Types for CRDT
export interface Operation {
  id: string;
  type: 'INSERT' | 'DELETE' | 'RETAIN';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

export class EventSourcingRevisionHistory extends EventEmitter {
  private events: RevisionEvent[] = [];
  private snapshots: Map<string, RevisionSnapshot> = new Map();
  private vectorClock: VectorClock = {};
  
  // Configuration
  private readonly SNAPSHOT_INTERVAL = 100; // Create snapshot every 100 events
  private readonly MAX_EVENTS_IN_MEMORY = 1000;
  private readonly CONFLICT_RESOLUTION_STRATEGY = 'LAST_WRITER_WINS'; // or 'OPERATIONAL_TRANSFORM'

  constructor(
    sessionId: string,
    private persistenceAdapter?: EventPersistenceAdapter
  ) {
    super();
    this.initializeVectorClock();
  }

  /**
   * Add event to history with CRDT conflict resolution
   */
  async addEvent(event: Omit<RevisionEvent, 'id' | 'timestamp' | 'vectorClock'>): Promise<void> {
    // Generate event ID
    const eventId = crypto.randomUUID(); // ✅ FIX: Use proper UUID format
    
    // Update vector clock
    this.vectorClock[event.userId] = (this.vectorClock[event.userId] || 0) + 1;
    
    // Create complete event
    const completeEvent: RevisionEvent = {
      ...event,
      id: eventId,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock }
    } as RevisionEvent;
    
    // Check for conflicts with pending operations
    if (this.isContentEvent(completeEvent)) {
      await this.resolveConflicts(completeEvent);
    }
    
    // Add to event store
    this.events.push(completeEvent);
    
    // Persist if adapter available
    if (this.persistenceAdapter) {
      await this.persistenceAdapter.saveEvent(completeEvent);
    }
    
    // Create snapshot if needed
    if (this.events.length % this.SNAPSHOT_INTERVAL === 0) {
      await this.createSnapshot('PERIODIC');
    }
    
    // Emit event for real-time collaboration
    this.emit('event-added', completeEvent);
    
    // Clean up old events if memory limit exceeded
    if (this.events.length > this.MAX_EVENTS_IN_MEMORY) {
      await this.compactEvents();
    }
    
    console.log('📚 Event added to revision history:', {
      eventId,
      type: completeEvent.type,
      userId: event.userId,
      vectorClock: this.vectorClock
    });
  }

  /**
   * Get current state by replaying events from last snapshot
   */
  async getCurrentState(): Promise<Record<string, any>> {
    const latestSnapshot = this.getLatestSnapshot();
    let state = latestSnapshot ? { ...latestSnapshot.elements } : {};
    
    // Get events after snapshot
    const eventsToReplay = latestSnapshot 
      ? this.events.filter(e => e.timestamp > latestSnapshot.timestamp)
      : this.events;
    
    // Replay events to rebuild current state
    for (const event of eventsToReplay) {
      state = this.applyEvent(state, event);
    }
    
    return state;
  }

  /**
   * Time-travel: Get state at specific point in time
   */
  async getStateAtTime(timestamp: number): Promise<Record<string, any>> {
    // Find closest snapshot before timestamp
    const snapshot = Array.from(this.snapshots.values())
      .filter(s => s.timestamp <= timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    let state = snapshot ? { ...snapshot.elements } : {};
    
    // Replay events from snapshot to target time
    const eventsToReplay = this.events.filter(e => 
      (!snapshot || e.timestamp > snapshot.timestamp) && e.timestamp <= timestamp
    );
    
    for (const event of eventsToReplay) {
      state = this.applyEvent(state, event);
    }
    
    return state;
  }

  /**
   * Get revision history with metadata
   */
  getRevisionHistory(): Array<{
    version: number;
    timestamp: number;
    user: string;
    changes: string[];
    eventIds: string[];
  }> {
    const revisions: Array<any> = [];
    let version = 1;
    
    // Group events by logical revisions (based on time proximity)
    let currentRevision: RevisionEvent[] = [];
    let lastTimestamp = 0;
    const REVISION_GAP_MS = 5000; // 5 seconds
    
    for (const event of this.events) {
      if (event.timestamp - lastTimestamp > REVISION_GAP_MS && currentRevision.length > 0) {
        // Finalize current revision
        revisions.push(this.buildRevisionSummary(version++, currentRevision));
        currentRevision = [];
      }
      
      currentRevision.push(event);
      lastTimestamp = event.timestamp;
    }
    
    // Add final revision if exists
    if (currentRevision.length > 0) {
      revisions.push(this.buildRevisionSummary(version, currentRevision));
    }
    
    return revisions;
  }

  /**
   * Create manual snapshot
   */
  async createSnapshot(reason: 'PERIODIC' | 'MANUAL' | 'BEFORE_MAJOR_CHANGE'): Promise<string> {
    const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const currentState = await this.getCurrentState();
    
    const snapshot: RevisionSnapshot = {
      id: snapshotId,
      timestamp: Date.now(),
      elements: currentState,
      metadata: {
        eventCount: this.events.length,
        lastEventId: this.events[this.events.length - 1]?.id || '',
        collaborators: Object.keys(this.vectorClock),
        version: '1.0'
      }
    };
    
    this.snapshots.set(snapshotId, snapshot);
    
    if (this.persistenceAdapter) {
      await this.persistenceAdapter.saveSnapshot(snapshot);
    }
    
    console.log('📸 Snapshot created:', { snapshotId, reason, elementCount: Object.keys(currentState).length });
    return snapshotId;
  }

  /**
   * Merge events from another session (for collaboration)
   */
  async mergeExternalEvents(externalEvents: RevisionEvent[]): Promise<void> {
    console.log('🔄 Merging external events:', externalEvents.length);
    
    for (const event of externalEvents) {
      // Check if we already have this event
      if (this.events.some(e => e.id === event.id)) {
        continue;
      }
      
      // Update vector clock
      this.mergeVectorClock(event.vectorClock);
      
      // Insert event in correct causal order
      this.insertEventInOrder(event);
    }
    
    this.emit('events-merged', externalEvents);
  }

  // Private Methods

  private initializeVectorClock(): void {
    this.vectorClock = {};
  }

  private isContentEvent(event: RevisionEvent): boolean {
    return ['CONTENT_INSERTED', 'CONTENT_DELETED', 'CONTENT_REPLACED'].includes(event.type);
  }

  private async resolveConflicts(event: RevisionEvent): Promise<void> {
    if (this.CONFLICT_RESOLUTION_STRATEGY === 'LAST_WRITER_WINS') {
      // Simple conflict resolution - always accept the new event
      return;
    }
    
    // TODO: Implement operational transformation for more sophisticated conflict resolution
    console.log('🔧 Conflict resolution needed for event:', event.id);
  }

  private applyEvent(state: Record<string, any>, event: RevisionEvent): Record<string, any> {
    const newState = { ...state };
    
    switch (event.type) {
      case 'CONTENT_INSERTED':
        if (!newState[event.elementId]) newState[event.elementId] = { content: '' };
        const insertContent = newState[event.elementId].content || '';
        newState[event.elementId].content = 
          insertContent.slice(0, event.position) + 
          event.content + 
          insertContent.slice(event.position);
        break;
        
      case 'CONTENT_DELETED':
        if (newState[event.elementId]) {
          const deleteContent = newState[event.elementId].content || '';
          newState[event.elementId].content = 
            deleteContent.slice(0, event.position) + 
            deleteContent.slice(event.position + event.length);
        }
        break;
        
      case 'CONTENT_REPLACED':
        if (newState[event.elementId]) {
          const replaceContent = newState[event.elementId].content || '';
          newState[event.elementId].content = 
            replaceContent.slice(0, event.startPosition) + 
            event.newContent + 
            replaceContent.slice(event.endPosition);
        }
        break;
        
      case 'ELEMENT_MOVED':
        if (newState[event.elementId]) {
          newState[event.elementId].position = event.to;
        }
        break;
        
      case 'ELEMENT_RESIZED':
        if (newState[event.elementId]) {
          newState[event.elementId].size = event.to;
        }
        break;
    }
    
    return newState;
  }

  private getLatestSnapshot(): RevisionSnapshot | null {
    const snapshots = Array.from(this.snapshots.values());
    return snapshots.length > 0 
      ? snapshots.sort((a, b) => b.timestamp - a.timestamp)[0]
      : null;
  }

  private buildRevisionSummary(version: number, events: RevisionEvent[]) {
    const user = events[0]?.userId || 'unknown';
    const timestamp = events[0]?.timestamp || Date.now();
    const changes = events.map(e => this.getEventDescription(e));
    const eventIds = events.map(e => e.id);
    
    return { version, timestamp, user, changes, eventIds };
  }

  private getEventDescription(event: RevisionEvent): string {
    switch (event.type) {
      case 'CONTENT_INSERTED':
        return `Inserted "${event.content.substring(0, 20)}..." at position ${event.position}`;
      case 'CONTENT_DELETED':
        return `Deleted ${event.length} characters at position ${event.position}`;
      case 'CONTENT_REPLACED':
        return `Replaced content from ${event.startPosition} to ${event.endPosition}`;
      case 'ELEMENT_MOVED':
        return `Moved element from (${event.from.x}, ${event.from.y}) to (${event.to.x}, ${event.to.y})`;
      case 'ELEMENT_RESIZED':
        return `Resized element from ${event.from.width}x${event.from.height} to ${event.to.width}x${event.to.height}`;
      default:
        return `${event.type} operation`;
    }
  }

  private mergeVectorClock(externalClock: VectorClock): void {
    for (const [userId, clock] of Object.entries(externalClock)) {
      this.vectorClock[userId] = Math.max(this.vectorClock[userId] || 0, clock);
    }
  }

  private insertEventInOrder(event: RevisionEvent): void {
    // Insert event maintaining causal order based on vector clocks
    let insertIndex = this.events.length;
    
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.isEventCausedBy(this.events[i], event)) {
        insertIndex = i + 1;
        break;
      }
    }
    
    this.events.splice(insertIndex, 0, event);
  }

  private isEventCausedBy(eventA: RevisionEvent, eventB: RevisionEvent): boolean {
    // Check if eventA causally precedes eventB based on vector clocks
    for (const [userId, clockB] of Object.entries(eventB.vectorClock)) {
      const clockA = eventA.vectorClock[userId] || 0;
      if (clockA > clockB) {
        return false;
      }
    }
    return true;
  }

  private async compactEvents(): Promise<void> {
    // Create snapshot and remove old events
    await this.createSnapshot('PERIODIC');
    
    // Keep only recent events
    const keepCount = Math.floor(this.MAX_EVENTS_IN_MEMORY * 0.7);
    this.events = this.events.slice(-keepCount);
    
    console.log('🗜️ Compacted event history, kept', keepCount, 'recent events');
  }
}

// Persistence adapter interface
export interface EventPersistenceAdapter {
  saveEvent(event: RevisionEvent): Promise<void>;
  saveSnapshot(snapshot: RevisionSnapshot): Promise<void>;
  loadEvents(sessionId: string, fromTimestamp?: number): Promise<RevisionEvent[]>;
  loadSnapshot(snapshotId: string): Promise<RevisionSnapshot | null>;
}

// Factory function for creating revision history
export function createRevisionHistory(
  sessionId: string, 
  persistenceAdapter?: EventPersistenceAdapter
): EventSourcingRevisionHistory {
  return new EventSourcingRevisionHistory(sessionId, persistenceAdapter);
}




