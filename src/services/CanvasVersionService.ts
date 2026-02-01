/**
 * 🔄 Canvas Version Service
 * 
 * Handles ALL version control logic for canvas elements:
 * - Version creation & freezing
 * - Revision history tracking
 * - Atomic version operations
 * - Rollback & restore
 * 
 * Extracted from canvasStore to follow separation of concerns.
 */

import { EventSourcingRevisionHistory, createRevisionHistory } from './EventSourcingRevisionHistory';

export interface CanvasVersion {
  id: string;
  version: number;
  content: string;
  state: 'draft' | 'typing' | 'frozen' | 'displayed';
  timestamp: number;
  request?: string;
  metadata?: Record<string, any>;
}

export interface VersionedElement {
  elementId: string;
  currentVersion: number;
  versions: CanvasVersion[];
  frozenVersions: Record<number, string>; // version number -> frozen content
  completedVersions: Set<string>; // version keys that are complete
}

export class CanvasVersionService {
  private elements: Map<string, VersionedElement> = new Map();
  private revisionHistory: EventSourcingRevisionHistory;
  private globalVersionCounter: number = 0;
  private versionLocks: Map<string, boolean> = new Map();

  constructor(sessionId: string = 'default') {
    this.revisionHistory = createRevisionHistory(sessionId);
  }

  /**
   * Initialize or get element versioning
   */
  private ensureElement(elementId: string): VersionedElement {
    if (!this.elements.has(elementId)) {
      this.elements.set(elementId, {
        elementId,
        currentVersion: 1,
        versions: [],
        frozenVersions: {},
        completedVersions: new Set()
      });
    }
    return this.elements.get(elementId)!;
  }

  /**
   * Create a new version atomically
   */
  async createVersion(
    elementId: string, 
    content: string, 
    request?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    // Check for version lock
    if (this.versionLocks.get(elementId)) {
      throw new Error(`Element ${elementId} is locked for version changes`);
    }

    const element = this.ensureElement(elementId);
    const newVersionNumber = element.currentVersion + 1;
    const versionId = `${elementId}-v${newVersionNumber}`;

    const newVersion: CanvasVersion = {
      id: versionId,
      version: newVersionNumber,
      content,
      state: 'draft',
      timestamp: Date.now(),
      request,
      metadata
    };

    element.versions.push(newVersion);
    element.currentVersion = newVersionNumber;
    this.globalVersionCounter++;

    // Record in event sourcing
    await this.revisionHistory.addEvent({
      type: 'content_modification',
      elementId,
      userId: metadata?.userId || 'system',
      data: {
        versionNumber: newVersionNumber,
        content,
        request
      }
    });

    console.log(`[np] version:create ${versionId}`, { content: content.substring(0, 50) });
    return versionId;
  }

  /**
   * Update version state (draft -> typing -> frozen -> displayed)
   */
  updateVersionState(
    elementId: string,
    versionId: string,
    state: CanvasVersion['state']
  ): void {
    const element = this.elements.get(elementId);
    if (!element) {
      console.warn(`[np] version:update-state FAILED - element not found: ${elementId}`);
      return;
    }

    const version = element.versions.find(v => v.id === versionId);
    if (!version) {
      console.warn(`[np] version:update-state FAILED - version not found: ${versionId}`);
      return;
    }

    version.state = state;
    console.log(`[np] version:update-state ${versionId} -> ${state}`);
  }

  /**
   * Freeze a version (make it immutable)
   */
  freezeVersion(elementId: string, version: number, content: string): void {
    const element = this.ensureElement(elementId);

    element.frozenVersions[version] = content;
    
    // Also update version state to frozen
    const versionObj = element.versions.find(v => v.version === version);
    if (versionObj) {
      versionObj.state = 'frozen';
    }

    console.log(`[np] version:freeze ${elementId} v${version}`);
  }

  /**
   * Mark version as completed
   */
  setCompletedVersion(elementId: string, versionKey: string): void {
    const element = this.ensureElement(elementId);
    element.completedVersions.add(versionKey);
    console.log(`[np] version:complete ${elementId} ${versionKey}`);
  }

  /**
   * Get all frozen versions for an element
   */
  getFrozenVersions(elementId: string): Record<number, string> {
    const element = this.ensureElement(elementId);
    return element.frozenVersions;
  }

  /**
   * Get completed versions for an element
   */
  getCompletedVersions(elementId: string): Set<string> {
    const element = this.ensureElement(elementId);
    return element.completedVersions;
  }

  /**
   * Get all versions for an element
   */
  getVersions(elementId: string): CanvasVersion[] {
    const element = this.elements.get(elementId);
    return element?.versions || [];
  }

  /**
   * Get displayed content (either single version or accumulated)
   */
  getDisplayContent(elementId: string, viewMode: 'single' | 'accumulated' = 'single'): string {
    const element = this.elements.get(elementId);
    if (!element) return '';

    if (viewMode === 'single') {
      // Return only the current version
      const currentVersion = element.versions.find(v => v.version === element.currentVersion);
      return currentVersion?.content || '';
    } else {
      // Accumulated: all frozen/displayed versions
      return element.versions
        .filter(v => v.state === 'frozen' || v.state === 'displayed')
        .sort((a, b) => a.version - b.version)
        .map(v => v.content)
        .join('\n\n---\n\n');
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(elementId: string, versionId: string): Promise<void> {
    const element = this.elements.get(elementId);
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    const version = element.versions.find(v => v.id === versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    const oldVersion = element.currentVersion;
    element.currentVersion = version.version;

    await this.revisionHistory.recordChange({
      elementId,
      changeType: 'version_rollback',
      oldValue: oldVersion,
      newValue: version.version,
      timestamp: Date.now(),
      metadata: { versionId }
    });

    console.log(`[np] version:rollback ${elementId} ${oldVersion} -> ${version.version}`);
  }

  /**
   * Lock versioning for an element (prevent concurrent changes)
   */
  lockVersioning(elementId: string): void {
    this.versionLocks.set(elementId, true);
    console.log(`[np] version:lock ${elementId}`);
  }

  /**
   * Unlock versioning for an element
   */
  unlockVersioning(elementId: string): void {
    this.versionLocks.delete(elementId);
    console.log(`[np] version:unlock ${elementId}`);
  }

  /**
   * Get version history
   */
  getVersionHistory(elementId: string): any[] {
    return this.revisionHistory.getHistory().filter(h => h.elementId === elementId);
  }

  /**
   * Restore from a specific point in time
   */
  async restoreFromTime(timestamp: number): Promise<Map<string, VersionedElement>> {
    const history = this.revisionHistory.getHistory();
    const targetChanges = history.filter(h => h.timestamp <= timestamp);

    // Rebuild state from changes
    const restoredElements = new Map<string, VersionedElement>();
    for (const change of targetChanges) {
      if (change.changeType === 'version_created') {
        const elementId = change.elementId;
        if (!restoredElements.has(elementId)) {
          restoredElements.set(elementId, {
            elementId,
            currentVersion: 1,
            versions: [],
            frozenVersions: {},
            completedVersions: new Set()
          });
        }
      }
    }

    return restoredElements;
  }

  /**
   * Export version data for persistence
   */
  exportState(): Record<string, any> {
    const exported: Record<string, any> = {};
    
    this.elements.forEach((element, elementId) => {
      exported[elementId] = {
        elementId: element.elementId,
        currentVersion: element.currentVersion,
        versions: element.versions,
        frozenVersions: element.frozenVersions,
        completedVersions: Array.from(element.completedVersions) // Convert Set to Array
      };
    });

    return exported;
  }

  /**
   * Import version data from persistence
   */
  importState(data: Record<string, any>): void {
    Object.entries(data).forEach(([elementId, elementData]: [string, any]) => {
      this.elements.set(elementId, {
        ...elementData,
        completedVersions: new Set(elementData.completedVersions || []) // Convert Array back to Set
      });
    });
  }

  /**
   * Clear all version data
   */
  clear(): void {
    this.elements.clear();
    this.versionLocks.clear();
    this.globalVersionCounter = 0;
    console.log('[np] version:clear all version data');
  }
}

// Per-session singleton instances
const versionServiceInstances: Map<string, CanvasVersionService> = new Map();

export function getCanvasVersionService(sessionId?: string): CanvasVersionService {
  const sid = sessionId || 'default';
  if (!versionServiceInstances.has(sid)) {
    versionServiceInstances.set(sid, new CanvasVersionService(sid));
  }
  return versionServiceInstances.get(sid)!;
}


