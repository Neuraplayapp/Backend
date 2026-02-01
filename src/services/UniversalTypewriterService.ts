/**
 * 🎯 Universal Typewriter Service
 * 
 * Service-based typewriter without React dependencies.
 * Features:
 * - Adaptive batching (1-4 chars based on content length)
 * - Natural stopping points (punctuation boundaries)
 * - RequestAnimationFrame for smooth performance
 * - Revision-aware (handles multiple versions)
 * - Event-based (no React hooks)
 * - Cancellable and controllable
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

export interface TypewriterOptions {
  content: string;
  speed?: number; // milliseconds per character (default: 4ms)
  startImmediately?: boolean;
  onComplete?: () => void;
  onProgress?: (progress: number, displayedText: string) => void;
}

export interface RevisionTypewriterOptions {
  revisions: Array<{ version: number; content: string; request?: string }>;
  currentRevision: number;
  speed?: number;
  onRevisionComplete?: (version: number) => void;
  onAllComplete?: () => void;
}

class TypewriterInstance extends EventEmitter {
  private content: string = '';
  private displayedText: string = '';
  private currentIndex: number = 0;
  private speed: number = 4;
  private isTyping: boolean = false;
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private animationFrameId?: number;
  private timeoutId?: NodeJS.Timeout;
  private onComplete?: () => void;
  private onProgress?: (progress: number, displayedText: string) => void;

  constructor(options: TypewriterOptions) {
    super();
    this.content = options.content;
    this.speed = options.speed || 4;
    this.onComplete = options.onComplete;
    this.onProgress = options.onProgress;

    if (options.startImmediately) {
      this.start();
    }
  }

  private findNaturalStoppingPoint(position: number): number {
    if (position >= this.content.length) return this.content.length;
    
    const searchRange = Math.min(position + 20, this.content.length);
    const segment = this.content.slice(position, searchRange);
    
    const breaks = ['. ', '! ', '? ', '; ', ', ', ' - ', ': ', '\n\n', '\n', ' '];
    
    for (const breakChar of breaks) {
      const index = segment.indexOf(breakChar);
      if (index !== -1) {
        return position + index + breakChar.length;
      }
    }
    
    return position;
  }

  private typeNextBatch = () => {
    if (this.isCancelled || this.isPaused) {
      return;
    }
    
    if (this.currentIndex >= this.content.length) {
      this.isTyping = false;
      this.emit('complete');
      if (this.onComplete) this.onComplete();
      return;
    }
    
    // Adaptive batching
    const remainingLength = this.content.length - this.currentIndex;
    let batchSize = 1;
    if (remainingLength > 1000) batchSize = 4;
    else if (remainingLength > 500) batchSize = 3;
    else if (remainingLength > 100) batchSize = 2;
    
    const naturalStop = this.findNaturalStoppingPoint(this.currentIndex + batchSize);
    const nextPos = Math.min(this.currentIndex + batchSize, naturalStop, this.content.length);
    
    this.animationFrameId = requestAnimationFrame(() => {
      this.timeoutId = setTimeout(() => {
        if (!this.isCancelled && !this.isPaused) {
          this.displayedText = this.content.slice(0, nextPos);
          this.currentIndex = nextPos;
          
          const progress = Math.round((nextPos / this.content.length) * 100);
          this.emit('progress', progress, this.displayedText);
          if (this.onProgress) this.onProgress(progress, this.displayedText);
          
          this.typeNextBatch();
        }
      }, this.speed);
    });
  };

  start(): void {
    if (this.isCancelled) {
      this.currentIndex = 0;
      this.displayedText = '';
      this.isCancelled = false;
    }
    
    this.isTyping = true;
    this.isPaused = false;
    this.emit('start');
    this.typeNextBatch();
  }

  pause(): void {
    this.isPaused = true;
    this.isTyping = false;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.emit('pause');
  }

  resume(): void {
    if (this.currentIndex < this.content.length) {
      this.isPaused = false;
      this.isTyping = true;
      this.emit('resume');
      this.typeNextBatch();
    }
  }

  skip(): void {
    this.isCancelled = true;
    this.displayedText = this.content;
    this.currentIndex = this.content.length;
    this.isTyping = false;
    
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.timeoutId) clearTimeout(this.timeoutId);
    
    this.emit('skip', this.displayedText);
    this.emit('complete');
    if (this.onComplete) this.onComplete();
  }

  cancel(): void {
    this.isCancelled = true;
    this.isTyping = false;
    this.isPaused = false;
    this.displayedText = '';
    this.currentIndex = 0;
    
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.timeoutId) clearTimeout(this.timeoutId);
    
    this.emit('cancel');
  }

  getDisplayedText(): string {
    return this.displayedText;
  }

  getProgress(): number {
    return Math.round((this.currentIndex / this.content.length) * 100);
  }

  isCurrentlyTyping(): boolean {
    return this.isTyping;
  }

  destroy(): void {
    this.cancel();
    this.removeAllListeners();
  }
}

class RevisionTypewriterInstance extends EventEmitter {
  private revisions: Array<{ version: number; content: string; request?: string }>;
  private currentRevision: number;
  private speed: number;
  private currentTypingVersion: number | null = null;
  private completedVersions: Set<number> = new Set();
  private displayedContent: string = '';
  private currentTypewriter?: TypewriterInstance;
  private onRevisionComplete?: (version: number) => void;
  private onAllComplete?: () => void;

  constructor(options: RevisionTypewriterOptions) {
    super();
    this.revisions = options.revisions;
    this.currentRevision = options.currentRevision;
    this.speed = options.speed || 4;
    this.onRevisionComplete = options.onRevisionComplete;
    this.onAllComplete = options.onAllComplete;
    
    this.startNextVersion();
  }

  private startNextVersion(): void {
    // Find first incomplete version
    for (let v = 1; v <= this.currentRevision; v++) {
      if (!this.completedVersions.has(v)) {
        this.currentTypingVersion = v;
        this.typeVersion(v);
        return;
      }
    }
    
    // All complete
    this.currentTypingVersion = null;
    this.emit('all-complete');
    if (this.onAllComplete) this.onAllComplete();
  }

  private typeVersion(version: number): void {
    const revision = this.revisions.find(r => r.version === version);
    if (!revision) {
      this.markVersionComplete(version);
      return;
    }

    this.currentTypewriter = new TypewriterInstance({
      content: revision.content,
      speed: this.speed,
      startImmediately: true,
      onComplete: () => this.markVersionComplete(version),
      onProgress: (progress, text) => {
        this.updateDisplayedContent();
        this.emit('progress', progress, text, version);
      }
    });
  }

  private markVersionComplete(version: number): void {
    this.completedVersions.add(version);
    this.emit('revision-complete', version);
    if (this.onRevisionComplete) this.onRevisionComplete(version);
    
    this.currentTypewriter?.destroy();
    this.currentTypewriter = undefined;
    this.currentTypingVersion = null;
    
    this.updateDisplayedContent();
    this.startNextVersion();
  }

  private updateDisplayedContent(): void {
    let content = '';
    
    // Add all completed versions
    for (let v = 1; v <= this.currentRevision; v++) {
      if (this.completedVersions.has(v)) {
        const revision = this.revisions.find(r => r.version === v);
        if (revision) {
          if (content) content += '\n\n---\n\n';
          if (revision.request) content += `**${revision.request}**\n\n`;
          content += revision.content;
        }
      }
    }
    
    // Add currently typing version
    if (this.currentTypingVersion && this.currentTypewriter) {
      if (content) content += '\n\n---\n\n';
      const revision = this.revisions.find(r => r.version === this.currentTypingVersion);
      if (revision?.request) content += `**${revision.request}**\n\n`;
      content += this.currentTypewriter.getDisplayedText();
    }
    
    this.displayedContent = content;
    this.emit('content-update', this.displayedContent);
  }

  skip(): void {
    this.currentTypewriter?.skip();
  }

  skipAll(): void {
    // Complete all versions immediately
    this.currentTypewriter?.destroy();
    this.currentTypewriter = undefined;
    
    for (let v = 1; v <= this.currentRevision; v++) {
      this.completedVersions.add(v);
    }
    
    this.currentTypingVersion = null;
    
    // Build full content
    let content = '';
    for (let v = 1; v <= this.currentRevision; v++) {
      const revision = this.revisions.find(r => r.version === v);
      if (revision) {
        if (content) content += '\n\n---\n\n';
        if (revision.request) content += `**${revision.request}**\n\n`;
        content += revision.content;
      }
    }
    this.displayedContent = content;
    
    this.emit('content-update', this.displayedContent);
    this.emit('all-complete');
    if (this.onAllComplete) this.onAllComplete();
  }

  getDisplayedContent(): string {
    return this.displayedContent;
  }

  getCurrentTypingVersion(): number | null {
    return this.currentTypingVersion;
  }

  getCompletedVersions(): Set<number> {
    return new Set(this.completedVersions);
  }

  isTyping(): boolean {
    return this.currentTypewriter?.isCurrentlyTyping() || false;
  }

  destroy(): void {
    this.currentTypewriter?.destroy();
    this.removeAllListeners();
  }
}

export class UniversalTypewriterService extends EventEmitter {
  private instances: Map<string, TypewriterInstance | RevisionTypewriterInstance> = new Map();
  
  createTypewriter(id: string, options: TypewriterOptions): TypewriterInstance {
    // Clean up existing instance
    if (this.instances.has(id)) {
      this.destroyTypewriter(id);
    }
    
    const instance = new TypewriterInstance(options);
    this.instances.set(id, instance);
    
    console.log(`[np] typewriter:create ${id}`);
    return instance;
  }

  createRevisionTypewriter(id: string, options: RevisionTypewriterOptions): RevisionTypewriterInstance {
    // Clean up existing instance
    if (this.instances.has(id)) {
      this.destroyTypewriter(id);
    }
    
    const instance = new RevisionTypewriterInstance(options);
    this.instances.set(id, instance);
    
    console.log(`[np] typewriter:create-revision ${id}`);
    return instance;
  }

  getTypewriter(id: string): TypewriterInstance | RevisionTypewriterInstance | undefined {
    return this.instances.get(id);
  }

  destroyTypewriter(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.destroy();
      this.instances.delete(id);
      console.log(`[np] typewriter:destroy ${id}`);
    }
  }

  destroyAll(): void {
    this.instances.forEach((instance, id) => {
      instance.destroy();
    });
    this.instances.clear();
    console.log('[np] typewriter:destroy-all');
  }
}

// Singleton instance
export const universalTypewriterService = new UniversalTypewriterService();

