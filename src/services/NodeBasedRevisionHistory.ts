/**
 * NodeBasedRevisionHistory.ts
 * 
 * Provides collaborative editing capabilities with node-based revision tracking.
 * This service manages document changes, conflict resolution, and synchronization.
 */

import { DocumentNodeManager, DocumentNode } from './DocumentNodeManager';

export interface NodeRevisionEvent {
  id: string;
  timestamp: number;
  userId: string;
  action: 'insert' | 'delete' | 'update' | 'move';
  nodeId: string;
  content?: string;
  position?: number;
  metadata?: Record<string, any>;
  parentId?: string;
  oldContent?: string;
  newContent?: string;
}

export interface RevisionBranch {
  id: string;
  parentRevisionId?: string;
  events: NodeRevisionEvent[];
  createdAt: number;
  mergedAt?: number;
  isActive: boolean;
}

export class NodeBasedRevisionHistory {
  private documentManager: DocumentNodeManager;
  public events: NodeRevisionEvent[] = [];
  private branches: Map<string, RevisionBranch> = new Map();
  private currentBranchId: string = 'main';
  private nextEventId = 1;

  constructor(documentManager: DocumentNodeManager) {
    this.documentManager = documentManager;
    
    // Initialize main branch
    this.branches.set('main', {
      id: 'main',
      events: [],
      createdAt: Date.now(),
      isActive: true
    });
  }

  /**
   * Record a new revision event
   */
  recordEvent(event: Omit<NodeRevisionEvent, 'id' | 'timestamp'>): NodeRevisionEvent {
    const fullEvent: NodeRevisionEvent = {
      ...event,
      id: `event_${this.nextEventId++}`,
      timestamp: Date.now()
    };

    this.events.push(fullEvent);
    
    // Add to current branch
    const currentBranch = this.branches.get(this.currentBranchId);
    if (currentBranch) {
      currentBranch.events.push(fullEvent);
    }

    return fullEvent;
  }

  /**
   * Get events within a time range
   */
  getEventsInRange(startTime: number, endTime: number): NodeRevisionEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * Get events since a specific timestamp
   */
  getEventsSince(timestamp: number): NodeRevisionEvent[] {
    return this.events.filter(event => event.timestamp > timestamp);
  }

  /**
   * Create a new branch from current state
   */
  createBranch(branchId: string, fromRevisionId?: string): RevisionBranch {
    const parentRevision = fromRevisionId ? 
      this.events.find(e => e.id === fromRevisionId) : 
      this.events[this.events.length - 1];

    const branch: RevisionBranch = {
      id: branchId,
      parentRevisionId: parentRevision?.id,
      events: [],
      createdAt: Date.now(),
      isActive: true
    };

    this.branches.set(branchId, branch);
    return branch;
  }

  /**
   * Switch to a different branch
   */
  switchToBranch(branchId: string): boolean {
    const branch = this.branches.get(branchId);
    if (!branch || !branch.isActive) {
      return false;
    }

    this.currentBranchId = branchId;
    return true;
  }

  /**
   * Merge changes from another branch
   */
  mergeBranch(fromBranchId: string, toBranchId: string = this.currentBranchId): boolean {
    const fromBranch = this.branches.get(fromBranchId);
    const toBranch = this.branches.get(toBranchId);

    if (!fromBranch || !toBranch) {
      return false;
    }

    // Simple merge: append events from source branch
    // In a real implementation, this would handle conflicts
    toBranch.events.push(...fromBranch.events);
    this.events.push(...fromBranch.events);

    // Mark source branch as merged
    fromBranch.mergedAt = Date.now();
    fromBranch.isActive = false;

    return true;
  }

  /**
   * Apply a revision event to the document
   */
  applyEvent(event: NodeRevisionEvent): boolean {
    try {
      switch (event.action) {
        case 'insert':
          if (event.content && event.parentId) {
            return this.documentManager.insertNode(
              event.nodeId,
              event.content,
              event.parentId,
              event.position
            );
          }
          break;

        case 'update':
          if (event.newContent !== undefined) {
            return this.documentManager.updateNode(event.nodeId, event.newContent);
          }
          break;

        case 'delete':
          return this.documentManager.deleteNode(event.nodeId);

        case 'move':
          if (event.parentId !== undefined && event.position !== undefined) {
            return this.documentManager.moveNode(event.nodeId, event.parentId, event.position);
          }
          break;
      }
      return false;
    } catch (error) {
      console.error('Failed to apply revision event:', error);
      return false;
    }
  }

  /**
   * Replay events to reconstruct document state
   */
  replayToTimestamp(timestamp: number): DocumentNode | null {
    // Create a snapshot of current state
    const originalState = this.documentManager.exportDocument();
    
    try {
      // Reset document to empty state
      this.documentManager.clear();
      
      // Apply events in chronological order up to timestamp
      const eventsToReplay = this.events
        .filter(event => event.timestamp <= timestamp)
        .sort((a, b) => a.timestamp - b.timestamp);

      for (const event of eventsToReplay) {
        this.applyEvent(event);
      }

      return this.documentManager.getRootNode();
    } catch (error) {
      console.error('Failed to replay revision history:', error);
      
      // Restore original state on error
      if (originalState) {
        this.documentManager.importDocument(originalState);
      }
      
      return null;
    }
  }

  /**
   * Get current branch information
   */
  getCurrentBranch(): RevisionBranch | undefined {
    return this.branches.get(this.currentBranchId);
  }

  /**
   * Get all active branches
   */
  getActiveBranches(): RevisionBranch[] {
    return Array.from(this.branches.values()).filter(branch => branch.isActive);
  }

  /**
   * Export revision history for persistence
   */
  exportHistory(): {
    events: NodeRevisionEvent[];
    branches: RevisionBranch[];
    currentBranchId: string;
  } {
    return {
      events: [...this.events],
      branches: Array.from(this.branches.values()),
      currentBranchId: this.currentBranchId
    };
  }

  /**
   * Import revision history from persistence
   */
  importHistory(data: {
    events: NodeRevisionEvent[];
    branches: RevisionBranch[];
    currentBranchId: string;
  }): void {
    this.events = [...data.events];
    this.branches.clear();
    
    data.branches.forEach(branch => {
      this.branches.set(branch.id, { ...branch });
    });
    
    this.currentBranchId = data.currentBranchId;
    
    // Update next event ID
    const maxId = Math.max(
      ...this.events.map(e => {
        const match = e.id.match(/event_(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      }),
      0
    );
    this.nextEventId = maxId + 1;
  }

  /**
   * Clear all revision history
   */
  clear(): void {
    this.events = [];
    this.branches.clear();
    this.currentBranchId = 'main';
    this.nextEventId = 1;
    
    // Reinitialize main branch
    this.branches.set('main', {
      id: 'main',
      events: [],
      createdAt: Date.now(),
      isActive: true
    });
  }
}
