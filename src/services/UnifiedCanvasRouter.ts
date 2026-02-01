import { EventEmitter } from 'events';
import { canvasAssistantBridge } from './CanvasAssistantBridge';
import { documentCanvasBridge } from './DocumentCanvasBridge';
import { codeCanvasManager } from './CodeCanvasManager';
import { canvasRuntimeManager } from './CanvasRuntimeManager';
import { CanvasStateAdapter } from './CanvasStateAdapter';

/**
 * UnifiedCanvasRouter
 * -------------------
 * Centralised 7th-layer router that receives any canvas-compatible payload (documents, charts, code)
 * coming from the NPU / Tool layer and dispatches it to the actual React canvas board through
 * multiple redundant channels:
 *   1.  `window` CustomEvents          → works cross-iframe if needed
 *   2.  `canvasAssistantBridge`       → legacy bridge used by the Assistant right-pane
 *   3.  Node/EventEmitter             → unit-test-friendly programmatic access
 *
 * It is a singleton so that back-pressure / debouncing can be implemented easily later.
 */
export class UnifiedCanvasRouter extends EventEmitter {
  private static _instance: UnifiedCanvasRouter;
  private _initialised = false;

  public static getInstance(): UnifiedCanvasRouter {
    if (!this._instance) {
      this._instance = new UnifiedCanvasRouter();
    }
    return this._instance;
  }

  /**
   * Initialise and attach listeners only once.
   */
  public async initialise(): Promise<void> {
    if (this._initialised) return;

    // Make sure the runtime manager is ready before we try to create canvas elements.
    try {
      await canvasRuntimeManager.initialize?.();
    } catch (err) {
      /* istanbul ignore next */
      console.warn('🖌️  UnifiedCanvasRouter: canvasRuntimeManager initialisation failed', err);
    }

    this.setupWindowListeners();

    this._initialised = true;
    console.log('✅ UnifiedCanvasRouter: initialised');
  }

  // ---------------------------------------------------------------------------
  // Window → Router bridge
  // ---------------------------------------------------------------------------

  private setupWindowListeners() {
    window.addEventListener('canvasContentReady', (e: any) => this.handleCanvasContent(e));
    window.addEventListener('canvasElementReady', (e: any) => this.handleCanvasElement(e));
  }

  // ---------------------------------------------------------------------------
  // Event handlers (public so they can be unit-tested easily)
  // ---------------------------------------------------------------------------

  public handleCanvasContent(event: CustomEvent) {
    const { type, content } = event.detail || {};
    if (!type) return;

    switch (type) {
      case 'chart':
        return this.routeChartContent(content);
      case 'document':
        return this.routeDocumentContent(content);
      case 'code':
        return this.routeCodeContent(content);
      default:
        console.warn('UnifiedCanvasRouter: unknown content type', type);
    }
  }

  public handleCanvasElement(event: CustomEvent) {
    const { element } = event.detail || {};
    if (!element) return;
    this.dispatchToCanvasBoard(element);
  }

  // ---------------------------------------------------------------------------
  // Chart routing helpers
  // ---------------------------------------------------------------------------

  private routeChartContent(raw: any) {
    const normalisedSeries = this.normaliseSeries(raw?.series ?? raw?.data ?? []);

    const element = {
      id: `chart_${Date.now()}`,
      type: 'chart' as const,
      content: {
        type: 'chart',
        title: raw?.title ?? 'Chart',
        chartType: raw?.chartType ?? 'bar',
        series: normalisedSeries,
        config: raw?.config ?? {},
        library: 'echarts' as const
      },
      position: raw?.position ?? { x: 100, y: 100 },
      size: raw?.size ?? { width: 600, height: 400 },
      style: raw?.style ?? {},
      metadata: {
        created: Date.now(),
        modified: Date.now(),
        author: 'ai',
        version: 1
      }
    };

    this.dispatchToCanvasBoard(element);
  }

  private normaliseSeries(series: any): any[] {
    if (!Array.isArray(series)) series = [series];

    return series.map((s, idx) => {
      if (s?.x && s?.y) return s; // Plotly-style already

      if (Array.isArray(s)) {
        return {
          x: s.map((_: any, i: number) => `Item ${i + 1}`),
          y: s,
          type: 'bar',
          name: `Series ${idx + 1}`
        };
      }

      if (s?.data) {
        return {
          x: s.labels ?? s.data.map((_: any, i: number) => `Item ${i + 1}`),
          y: s.data,
          type: 'bar',
          name: s.label ?? `Series ${idx + 1}`
        };
      }

      return s; // fallback – might still be valid for Plotly
    });
  }

  // ---------------------------------------------------------------------------
  // Document routing helpers
  // ---------------------------------------------------------------------------

  private async routeDocumentContent(doc: any) {
    await documentCanvasBridge.placeDocumentOnCanvas(
      {
        success: true,
        content: doc?.content ?? '',
        title: doc?.title ?? 'Document',
        metadata: doc?.metadata ?? {},
        exportFormats: doc?.exportFormats ?? ['PDF', 'MD']
      },
      { autoActivateCanvas: false, startPosition: doc?.position ?? { x: 100, y: 100 } }
    );
  }

  // ---------------------------------------------------------------------------
  // Code routing helpers
  // ---------------------------------------------------------------------------

  private async routeCodeContent(codeBundle: any) {
    const elementId = `code_${Date.now()}`;

    await codeCanvasManager.createLivePreview(elementId, codeBundle?.code ?? '// empty');

    const element = {
      id: elementId,
      type: 'code' as const,
      content: {
        code: codeBundle?.code ?? '// empty',
        language: codeBundle?.language ?? 'javascript'
      },
      position: codeBundle?.position ?? { x: 100, y: 100 },
      size: codeBundle?.size ?? { width: 700, height: 500 },
      style: {
        fontFamily: 'Monaco, monospace',
        fontSize: 12,
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4'
      },
      metadata: {
        created: Date.now(),
        modified: Date.now(),
        author: 'ai',
        version: 1
      }
    };

    this.dispatchToCanvasBoard(element);
  }

  // ---------------------------------------------------------------------------
  // Final dispatch helper (fan-out)
  // ---------------------------------------------------------------------------

  private dispatchToCanvasBoard(element: any) {
    // Route to state for right-pane canvases
    try {
      if (element?.type === 'document') {
        const c = element.content || {};
        CanvasStateAdapter.addDocument({
          title: c.title || 'Document',
          content: c.content || c.text || '',
          metadata: c.metadata,
          position: element.position,
          size: element.size
        });
      } else if (element?.type === 'chart') {
        const c = element.content || {};
        CanvasStateAdapter.addChart({
          title: c.title || 'Chart',
          chartType: c.chartType || c.type || 'bar',
          series: c.series || c.data || [],
          position: element.position,
          size: element.size
        });
      } else if (element?.type === 'code') {
        const c = element.content || {};
        CanvasStateAdapter.addCode({
          language: c.language || 'javascript',
          code: c.code || '',
          title: c.title,
          description: c.description,
          position: element.position,
          size: element.size
        });
      } else {
        // For unknown types, fall back to window event to avoid breaking other consumers
        window.dispatchEvent(
          new CustomEvent('addCanvasElements', {
            detail: { elements: [element], source: 'unified-canvas-router' }
          })
        );
      }
    } catch (e) {
      console.error('UnifiedCanvasRouter dispatch failed, falling back to event:', e);
      window.dispatchEvent(
        new CustomEvent('addCanvasElements', {
          detail: { elements: [element], source: 'unified-canvas-router' }
        })
      );
    }
  }
}

export const unifiedCanvasRouter = UnifiedCanvasRouter.getInstance();
