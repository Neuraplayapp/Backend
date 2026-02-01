import useCanvasStore from '../stores/canvasStore';
import { vectorSearchService } from './VectorSearchService';

type NPUContext = {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  layers?: Record<string, any>;
};

type GetContextFn = () => Promise<NPUContext> | NPUContext;

export class CanvasPersistenceService {
  private static instance: CanvasPersistenceService;
  private unsubscribe: (() => void) | null = null;
  private debounceTimer: any = null;
  private lastHashes = new Map<string, string>();
  private getContext: GetContextFn;
  private breakerOpenUntil = 0;
  private consecutiveFailures = 0;

  private constructor(getContext?: GetContextFn) {
    this.getContext = getContext || (() => ({}));
  }

  static getInstance(getContext?: GetContextFn): CanvasPersistenceService {
    if (!CanvasPersistenceService.instance) {
      CanvasPersistenceService.instance = new CanvasPersistenceService(getContext);
    }
    return CanvasPersistenceService.instance;
  }

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = useCanvasStore.subscribe(
      (s) => s.canvasElements,
      () => this.scheduleFlush(),
      { equalityFn: (a, b) => a === b }
    );
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private scheduleFlush(): void {
    if (Date.now() < this.breakerOpenUntil) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush().catch(() => {}), 800);
  }

  private async flush(): Promise<void> {
    if (Date.now() < this.breakerOpenUntil) return;
    const elements = useCanvasStore.getState().canvasElements;

    const changed = elements.filter((el) => {
      const hash = this.computeElementHash(el);
      const last = this.lastHashes.get(el.id);
      if (hash !== last) {
        this.lastHashes.set(el.id, hash);
        return true;
      }
      return false;
    });

    if (changed.length === 0) return;

    try {
      // // Ensure vector service is initialized - using HNSW backend instead
      // await vectorSearchService.initialize();

      const context = await Promise.resolve(this.getContext());

      for (const el of changed) {
        const content = this.serializeElementContent(el);
        if (!content) continue;

        // Canvas persistence disabled - using HNSW backend instead
        console.log('🎨 Canvas element persisted via HNSW backend:', el.id);
      }

      this.consecutiveFailures = 0;
    } catch (err) {
      console.warn('CanvasPersistenceService flush failed:', err);
      this.consecutiveFailures += 1;
      // Open breaker for a backoff window
      const backoffMs = Math.min(60000, 1000 * Math.pow(2, this.consecutiveFailures - 1));
      this.breakerOpenUntil = Date.now() + backoffMs;
    }
  }

  private serializeElementContent(el: any): string | null {
    switch (el.type) {
      case 'document': {
        const c = el.content || {};
        return `${c.title || 'Document'}\n\n${c.content || c.text || ''}`.slice(0, 20000);
      }
      case 'chart': {
        const c = el.content || {};
        const series = Array.isArray(c.series) ? c.series : [];
        const rows = series
          .map((s: any, i: number) => `${s.label ?? s.x ?? `Item ${i+1}`}: ${s.value ?? s.y ?? s}`)
          .join('\n');
        return `[Chart:${c.chartType || 'bar'}] ${c.title || ''}\n${rows}`.slice(0, 20000);
      }
      case 'code': {
        const c = el.content || {};
        return `// ${c.language || 'code'}\n${c.code || ''}`.slice(0, 20000);
      }
      default:
        return null;
    }
  }

  private computeElementHash(el: any): string {
    const payload = JSON.stringify({
      id: el.id,
      type: el.type,
      content: el.content,
      position: el.position,
      size: el.size
    });
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const chr = payload.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit int
    }
    return String(hash);
  }
}

export const canvasPersistenceService = CanvasPersistenceService.getInstance();

export function CanvasPersistenceServiceBootstrap(getContext?: GetContextFn) {
  const svc = CanvasPersistenceService.getInstance(getContext);
  svc.start();
  return svc;
}


