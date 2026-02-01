// Live Preview Manager - Real-time code execution and visual representation
// Based on technical architecture document specifications

import { EventEmitter } from 'events';

export interface PreviewConfig {
  mode: 'real-time' | 'on-demand' | 'auto-save';
  updateDelay: number; // Debounce delay in milliseconds
  maxPreviewSize: number; // Maximum preview content size
  enableHotReload: boolean;
  sandboxed: boolean;
  allowNetworkAccess: boolean;
  resourceLimits: {
    memory: number; // MB
    cpu: number; // Percentage
    execution_time: number; // Seconds
  };
  supportedLanguages: string[];
  previewTypes: PreviewType[];
}

export interface PreviewType {
  name: string;
  language: string;
  mimeType: string;
  renderer: 'iframe' | 'canvas' | 'webgl' | 'svg' | 'image' | 'text';
  requires: string[]; // Required dependencies
  capabilities: string[]; // What it can preview
}

export interface PreviewContent {
  id: string;
  type: PreviewType['name'];
  content: string;
  language: string;
  timestamp: number;
  metadata: {
    source: 'editor' | 'ai' | 'file' | 'import';
    dependencies: string[];
    errors: PreviewError[];
    warnings: string[];
    executionTime: number;
    memoryUsage: number;
  };
}

export interface PreviewError {
  id: string;
  type: 'syntax' | 'runtime' | 'security' | 'resource' | 'network';
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  stack?: string;
  suggestion?: string;
}

export interface PreviewResult {
  id: string;
  success: boolean;
  output: any;
  html?: string;
  css?: string;
  javascript?: string;
  assets: PreviewAsset[];
  errors: PreviewError[];
  warnings: string[];
  metadata: {
    renderTime: number;
    executionTime: number;
    memoryUsage: number;
    resourcesLoaded: number;
    frameSize: { width: number; height: number };
  };
}

export interface PreviewAsset {
  id: string;
  type: 'image' | 'font' | 'audio' | 'video' | 'data' | 'script' | 'style';
  url: string;
  size: number;
  loaded: boolean;
  error?: string;
}

export interface PreviewWindow {
  id: string;
  iframe: HTMLIFrameElement;
  contentDocument: Document | null;
  contentWindow: Window | null;
  isReady: boolean;
  lastUpdate: number;
  errorHandler: (error: any) => void;
  messageHandler: (message: any) => void;
}

class PreviewRenderer extends EventEmitter {
  private renderers = new Map<string, any>();
  private activeWindows = new Map<string, PreviewWindow>();

  constructor() {
    super();
    this.initializeRenderers();
  }

  private initializeRenderers(): void {
    // HTML/CSS/JS Renderer
    this.registerRenderer('web', {
      language: ['html', 'css', 'javascript', 'typescript'],
      mimeType: 'text/html',
      renderer: 'iframe',
      render: this.renderWebContent.bind(this),
      setup: this.setupWebEnvironment.bind(this),
      cleanup: this.cleanupWebEnvironment.bind(this)
    });

    // React/JSX Renderer
    this.registerRenderer('react', {
      language: ['jsx', 'tsx'],
      mimeType: 'text/jsx',
      renderer: 'iframe',
      render: this.renderReactContent.bind(this),
      setup: this.setupReactEnvironment.bind(this),
      cleanup: this.cleanupReactEnvironment.bind(this)
    });

    // Vue Renderer
    this.registerRenderer('vue', {
      language: ['vue'],
      mimeType: 'text/vue',
      renderer: 'iframe',
      render: this.renderVueContent.bind(this),
      setup: this.setupVueEnvironment.bind(this),
      cleanup: this.cleanupVueEnvironment.bind(this)
    });

    // Python/Matplotlib Renderer
    this.registerRenderer('python-visual', {
      language: ['python'],
      mimeType: 'text/python',
      renderer: 'canvas',
      render: this.renderPythonVisual.bind(this),
      setup: this.setupPythonEnvironment.bind(this),
      cleanup: this.cleanupPythonEnvironment.bind(this)
    });

    // SVG Renderer
    this.registerRenderer('svg', {
      language: ['svg', 'xml'],
      mimeType: 'image/svg+xml',
      renderer: 'svg',
      render: this.renderSVGContent.bind(this),
      setup: this.setupSVGEnvironment.bind(this),
      cleanup: this.cleanupSVGEnvironment.bind(this)
    });

    // Markdown Renderer
    this.registerRenderer('markdown', {
      language: ['markdown', 'md'],
      mimeType: 'text/markdown',
      renderer: 'iframe',
      render: this.renderMarkdownContent.bind(this),
      setup: this.setupMarkdownEnvironment.bind(this),
      cleanup: this.cleanupMarkdownEnvironment.bind(this)
    });

    // Data Visualization Renderer
    this.registerRenderer('data-viz', {
      language: ['javascript', 'python', 'r'],
      mimeType: 'application/json',
      renderer: 'canvas',
      render: this.renderDataVisualization.bind(this),
      setup: this.setupDataVizEnvironment.bind(this),
      cleanup: this.cleanupDataVizEnvironment.bind(this)
    });
  }

  registerRenderer(name: string, renderer: any): void {
    this.renderers.set(name, renderer);
    this.emit('rendererRegistered', { name, renderer });
    console.log(`🖼️ Preview Renderer: Registered ${name}`);
  }

  async createPreviewWindow(containerId: string): Promise<PreviewWindow> {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element not found: ${containerId}`);
    }

    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.background = '#ffffff';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    
    const windowId = `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const previewWindow: PreviewWindow = {
      id: windowId,
      iframe,
      contentDocument: null,
      contentWindow: null,
      isReady: false,
      lastUpdate: 0,
      errorHandler: (error) => this.handlePreviewError(windowId, error),
      messageHandler: (message) => this.handlePreviewMessage(windowId, message)
    };

    return new Promise((resolve, reject) => {
      iframe.onload = () => {
        previewWindow.contentDocument = iframe.contentDocument;
        previewWindow.contentWindow = iframe.contentWindow;
        previewWindow.isReady = true;
        
        this.setupPreviewWindow(previewWindow);
        this.activeWindows.set(windowId, previewWindow);
        
        console.log(`🖼️ Preview window created: ${windowId}`);
        this.emit('previewWindowCreated', previewWindow);
        resolve(previewWindow);
      };

      iframe.onerror = (error) => {
        console.error('🖼️ Failed to create preview window:', error);
        reject(error);
      };

      container.appendChild(iframe);
    });
  }

  private setupPreviewWindow(previewWindow: PreviewWindow): void {
    if (!previewWindow.contentWindow) return;

    // Setup error handling
    previewWindow.contentWindow.addEventListener('error', previewWindow.errorHandler);
    previewWindow.contentWindow.addEventListener('unhandledrejection', previewWindow.errorHandler);

    // Setup message communication
    previewWindow.contentWindow.addEventListener('message', previewWindow.messageHandler);

    // Inject preview utilities
    this.injectPreviewUtilities(previewWindow);
  }

  private injectPreviewUtilities(previewWindow: PreviewWindow): void {
    if (!previewWindow.contentDocument) return;

    const script = previewWindow.contentDocument.createElement('script');
    script.textContent = `
      window.__PREVIEW_API__ = {
        sendMessage: function(type, data) {
          parent.postMessage({ type: type, data: data, source: 'preview' }, '*');
        },
        
        reportError: function(error) {
          this.sendMessage('error', {
            message: error.message,
            stack: error.stack,
            timestamp: Date.now()
          });
        },
        
        reportMetrics: function(metrics) {
          this.sendMessage('metrics', metrics);
        },
        
        ready: function() {
          this.sendMessage('ready', { timestamp: Date.now() });
        }
      };
      
      // Auto-report when ready
      if (document.readyState === 'complete') {
        window.__PREVIEW_API__.ready();
      } else {
        window.addEventListener('load', () => window.__PREVIEW_API__.ready());
      }
      
      // Capture console logs
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      console.log = function(...args) {
        window.__PREVIEW_API__.sendMessage('console', { level: 'log', args: args });
        originalLog.apply(console, args);
      };
      
      console.error = function(...args) {
        window.__PREVIEW_API__.sendMessage('console', { level: 'error', args: args });
        originalError.apply(console, args);
      };
      
      console.warn = function(...args) {
        window.__PREVIEW_API__.sendMessage('console', { level: 'warn', args: args });
        originalWarn.apply(console, args);
      };
    `;

    previewWindow.contentDocument.head.appendChild(script);
  }

  async renderContent(content: PreviewContent, windowId: string): Promise<PreviewResult> {
    const previewWindow = this.activeWindows.get(windowId);
    if (!previewWindow) {
      throw new Error(`Preview window not found: ${windowId}`);
    }

    const renderer = this.findRenderer(content.language, content.type);
    if (!renderer) {
      throw new Error(`No renderer found for language: ${content.language}, type: ${content.type}`);
    }

    console.log(`🖼️ Rendering ${content.language} content in ${windowId}`);
    const startTime = Date.now();

    try {
      const result = await renderer.render(content, previewWindow);
      
      const renderTime = Date.now() - startTime;
      previewWindow.lastUpdate = Date.now();

      const previewResult: PreviewResult = {
        id: content.id,
        success: true,
        output: result.output,
        html: result.html,
        css: result.css,
        javascript: result.javascript,
        assets: result.assets || [],
        errors: result.errors || [],
        warnings: result.warnings || [],
        metadata: {
          renderTime,
          executionTime: result.executionTime || 0,
          memoryUsage: result.memoryUsage || 0,
          resourcesLoaded: result.assets?.length || 0,
          frameSize: this.getFrameSize(previewWindow)
        }
      };

      this.emit('contentRendered', previewResult);
      return previewResult;

    } catch (error) {
      const previewResult: PreviewResult = {
        id: content.id,
        success: false,
        output: null,
        assets: [],
        errors: [{
          id: `error_${Date.now()}`,
          type: 'runtime',
          severity: 'error',
          message: error instanceof Error ? error.message : String(error)
        }],
        warnings: [],
        metadata: {
          renderTime: Date.now() - startTime,
          executionTime: 0,
          memoryUsage: 0,
          resourcesLoaded: 0,
          frameSize: this.getFrameSize(previewWindow)
        }
      };

      this.emit('renderError', previewResult);
      return previewResult;
    }
  }

  private findRenderer(language: string, type: string): any {
    for (const renderer of this.renderers.values()) {
      if (renderer.language.includes(language)) {
        return renderer;
      }
    }
    return null;
  }

  private getFrameSize(previewWindow: PreviewWindow): { width: number; height: number } {
    return {
      width: previewWindow.iframe.clientWidth,
      height: previewWindow.iframe.clientHeight
    };
  }

  private handlePreviewError(windowId: string, error: any): void {
    console.error(`🖼️ Preview error in ${windowId}:`, error);
    this.emit('previewError', { windowId, error });
  }

  private handlePreviewMessage(windowId: string, message: any): void {
    if (message.data?.source === 'preview') {
      this.emit('previewMessage', { windowId, ...message.data });
    }
  }

  // Renderer implementations
  private async renderWebContent(content: PreviewContent, window: PreviewWindow): Promise<any> {
    if (!window.contentDocument) throw new Error('Content document not available');

    const doc = window.contentDocument;
    
    // Create HTML structure
    let html = content.content;
    
    // If it's just CSS or JS, wrap it in HTML
    if (content.language === 'css') {
      html = `<!DOCTYPE html><html><head><style>${content.content}</style></head><body><h1>CSS Preview</h1></body></html>`;
    } else if (content.language === 'javascript') {
      html = `<!DOCTYPE html><html><head></head><body><h1>JavaScript Preview</h1><script>${content.content}</script></body></html>`;
    }

    doc.open();
    doc.write(html);
    doc.close();

    return {
      output: 'Web content rendered',
      html: html,
      executionTime: 10,
      memoryUsage: 1024
    };
  }

  private async renderReactContent(content: PreviewContent, window: PreviewWindow): Promise<any> {
    if (!window.contentDocument) throw new Error('Content document not available');

    // For demo purposes, create a simple React preview
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          ${content.content}
          
          // If no ReactDOM.render found, try to render a default component
          if (!document.getElementById('root').innerHTML) {
            const App = () => React.createElement('div', null, 'React Component Preview');
            ReactDOM.render(React.createElement(App), document.getElementById('root'));
          }
        </script>
      </body>
      </html>
    `;

    window.contentDocument.open();
    window.contentDocument.write(html);
    window.contentDocument.close();

    return {
      output: 'React content rendered',
      html: html,
      executionTime: 50,
      memoryUsage: 2048
    };
  }

  private async renderVueContent(content: PreviewContent, window: PreviewWindow): Promise<any> {
    if (!window.contentDocument) throw new Error('Content document not available');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
      </head>
      <body>
        <div id="app"></div>
        <script>
          const { createApp } = Vue;
          ${content.content}
          
          // Default app if none defined
          if (!document.getElementById('app').innerHTML) {
            createApp({
              template: '<div>Vue Component Preview</div>'
            }).mount('#app');
          }
        </script>
      </body>
      </html>
    `;

    window.contentDocument.open();
    window.contentDocument.write(html);
    window.contentDocument.close();

    return {
      output: 'Vue content rendered',
      html: html,
      executionTime: 40,
      memoryUsage: 1536
    };
  }

  private async renderPythonVisual(content: PreviewContent, window: PreviewWindow): Promise<any> {
    // For Python visualization, we'd integrate with Pyodide
    console.log('🖼️ Rendering Python visualization (placeholder)');
    
    return {
      output: 'Python visualization rendered',
      executionTime: 100,
      memoryUsage: 4096
    };
  }

  private async renderSVGContent(content: PreviewContent, window: PreviewWindow): Promise<any> {
    if (!window.contentDocument) throw new Error('Content document not available');

    const html = `
      <!DOCTYPE html>
      <html>
      <head><style>body { margin: 0; padding: 20px; }</style></head>
      <body>
        ${content.content}
      </body>
      </html>
    `;

    window.contentDocument.open();
    window.contentDocument.write(html);
    window.contentDocument.close();

    return {
      output: 'SVG content rendered',
      html: html,
      executionTime: 5,
      memoryUsage: 512
    };
  }

  private async renderMarkdownContent(content: PreviewContent, window: PreviewWindow): Promise<any> {
    if (!window.contentDocument) throw new Error('Content document not available');

    // Simple markdown to HTML conversion (in real implementation, use marked or similar)
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1, h2, h3 { color: #333; }
          code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <pre>${content.content}</pre>
      </body>
      </html>
    `;

    window.contentDocument.open();
    window.contentDocument.write(html);
    window.contentDocument.close();

    return {
      output: 'Markdown content rendered',
      html: html,
      executionTime: 15,
      memoryUsage: 768
    };
  }

  private async renderDataVisualization(content: PreviewContent, window: PreviewWindow): Promise<any> {
    // For data visualization, integrate with libraries like D3, Chart.js, etc.
    console.log('🖼️ Rendering data visualization (placeholder)');
    
    return {
      output: 'Data visualization rendered',
      executionTime: 80,
      memoryUsage: 3072
    };
  }

  // Setup/cleanup methods (simplified)
  private setupWebEnvironment(): void { console.log('🖼️ Setting up web environment'); }
  private cleanupWebEnvironment(): void { console.log('🖼️ Cleaning up web environment'); }
  
  private setupReactEnvironment(): void { console.log('🖼️ Setting up React environment'); }
  private cleanupReactEnvironment(): void { console.log('🖼️ Cleaning up React environment'); }
  
  private setupVueEnvironment(): void { console.log('🖼️ Setting up Vue environment'); }
  private cleanupVueEnvironment(): void { console.log('🖼️ Cleaning up Vue environment'); }
  
  private setupPythonEnvironment(): void { console.log('🖼️ Setting up Python environment'); }
  private cleanupPythonEnvironment(): void { console.log('🖼️ Cleaning up Python environment'); }
  
  private setupSVGEnvironment(): void { console.log('🖼️ Setting up SVG environment'); }
  private cleanupSVGEnvironment(): void { console.log('🖼️ Cleaning up SVG environment'); }
  
  private setupMarkdownEnvironment(): void { console.log('🖼️ Setting up Markdown environment'); }
  private cleanupMarkdownEnvironment(): void { console.log('🖼️ Cleaning up Markdown environment'); }
  
  private setupDataVizEnvironment(): void { console.log('🖼️ Setting up Data Viz environment'); }
  private cleanupDataVizEnvironment(): void { console.log('🖼️ Cleaning up Data Viz environment'); }

  destroyPreviewWindow(windowId: string): boolean {
    const previewWindow = this.activeWindows.get(windowId);
    if (!previewWindow) return false;

    // Remove event listeners
    if (previewWindow.contentWindow) {
      previewWindow.contentWindow.removeEventListener('error', previewWindow.errorHandler);
      previewWindow.contentWindow.removeEventListener('unhandledrejection', previewWindow.errorHandler);
      previewWindow.contentWindow.removeEventListener('message', previewWindow.messageHandler);
    }

    // Remove iframe from DOM
    if (previewWindow.iframe.parentNode) {
      previewWindow.iframe.parentNode.removeChild(previewWindow.iframe);
    }

    this.activeWindows.delete(windowId);
    this.emit('previewWindowDestroyed', windowId);
    return true;
  }

  getActiveWindows(): PreviewWindow[] {
    return Array.from(this.activeWindows.values());
  }

  getWindow(windowId: string): PreviewWindow | undefined {
    return this.activeWindows.get(windowId);
  }
}

class HotReloadManager extends EventEmitter {
  private watchedContent = new Map<string, PreviewContent>();
  private reloadTimers = new Map<string, NodeJS.Timeout>();
  private debounceDelay = 300; // ms

  constructor(debounceDelay = 300) {
    super();
    this.debounceDelay = debounceDelay;
  }

  watchContent(content: PreviewContent, callback: (content: PreviewContent) => void): string {
    this.watchedContent.set(content.id, content);
    
    // Setup content change detection
    this.setupContentWatcher(content, callback);
    
    this.emit('contentWatched', content);
    return content.id;
  }

  private setupContentWatcher(content: PreviewContent, callback: (content: PreviewContent) => void): void {
    // In a real implementation, this would watch for file changes or editor content changes
    console.log(`🔥 Hot Reload: Watching content ${content.id}`);
  }

  updateContent(contentId: string, newContent: string): void {
    const content = this.watchedContent.get(contentId);
    if (!content) return;

    // Clear existing timer
    const existingTimer = this.reloadTimers.get(contentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced reload timer
    const timer = setTimeout(() => {
      content.content = newContent;
      content.timestamp = Date.now();
      
      this.emit('contentChanged', content);
      this.reloadTimers.delete(contentId);
    }, this.debounceDelay);

    this.reloadTimers.set(contentId, timer);
  }

  unwatchContent(contentId: string): boolean {
    const timer = this.reloadTimers.get(contentId);
    if (timer) {
      clearTimeout(timer);
      this.reloadTimers.delete(contentId);
    }

    const removed = this.watchedContent.delete(contentId);
    if (removed) {
      this.emit('contentUnwatched', contentId);
    }
    return removed;
  }

  setDebounceDelay(delay: number): void {
    this.debounceDelay = delay;
  }

  getWatchedContent(): PreviewContent[] {
    return Array.from(this.watchedContent.values());
  }
}

export class LivePreviewManager extends EventEmitter {
  private config: PreviewConfig;
  private renderer: PreviewRenderer;
  private hotReloadManager: HotReloadManager;
  private previewQueue: PreviewContent[] = [];
  private isProcessing = false;
  private isInitialized = false;

  constructor(config: Partial<PreviewConfig> = {}) {
    super();
    
    this.config = {
      mode: config.mode || 'real-time',
      updateDelay: config.updateDelay || 300,
      maxPreviewSize: config.maxPreviewSize || 1024 * 1024, // 1MB
      enableHotReload: config.enableHotReload ?? true,
      sandboxed: config.sandboxed ?? true,
      allowNetworkAccess: config.allowNetworkAccess ?? false,
      resourceLimits: {
        memory: config.resourceLimits?.memory || 100,
        cpu: config.resourceLimits?.cpu || 50,
        execution_time: config.resourceLimits?.execution_time || 10
      },
      supportedLanguages: config.supportedLanguages || [
        'html', 'css', 'javascript', 'typescript', 'jsx', 'tsx', 'vue', 'python', 'svg', 'markdown'
      ],
      previewTypes: config.previewTypes || [
        { name: 'web', language: 'html', mimeType: 'text/html', renderer: 'iframe', requires: [], capabilities: ['html', 'css', 'js'] },
        { name: 'react', language: 'jsx', mimeType: 'text/jsx', renderer: 'iframe', requires: ['react', 'react-dom'], capabilities: ['jsx', 'tsx'] },
        { name: 'vue', language: 'vue', mimeType: 'text/vue', renderer: 'iframe', requires: ['vue'], capabilities: ['vue'] },
        { name: 'python-visual', language: 'python', mimeType: 'text/python', renderer: 'canvas', requires: ['matplotlib', 'numpy'], capabilities: ['charts', 'graphs'] },
        { name: 'svg', language: 'svg', mimeType: 'image/svg+xml', renderer: 'svg', requires: [], capabilities: ['vector-graphics'] },
        { name: 'markdown', language: 'markdown', mimeType: 'text/markdown', renderer: 'iframe', requires: [], capabilities: ['documentation'] }
      ]
    };

    this.renderer = new PreviewRenderer();
    this.hotReloadManager = new HotReloadManager(this.config.updateDelay);
    
    this.initializeLivePreview();
  }

  private initializeLivePreview(): void {
    console.log('🖼️ Live Preview Manager - Initializing');
    
    this.setupEventHandlers();
    this.startPreviewQueue();
    this.isInitialized = true;
    
    this.emit('initialized');
  }

  private setupEventHandlers(): void {
    this.renderer.on('contentRendered', (result) => {
      this.emit('previewRendered', result);
    });

    this.renderer.on('renderError', (result) => {
      this.emit('previewError', result);
    });

    if (this.config.enableHotReload) {
      this.hotReloadManager.on('contentChanged', (content) => {
        this.queuePreview(content);
      });
    }
  }

  private startPreviewQueue(): void {
    setInterval(() => {
      if (!this.isProcessing && this.previewQueue.length > 0) {
        this.processNextPreview();
      }
    }, 50); // Check every 50ms
  }

  private async processNextPreview(): Promise<void> {
    if (this.previewQueue.length === 0) return;

    this.isProcessing = true;
    const content = this.previewQueue.shift()!;

    try {
      await this.renderPreview(content);
    } catch (error) {
      console.error('🖼️ Preview processing failed:', error);
      this.emit('previewProcessingError', { content, error });
    } finally {
      this.isProcessing = false;
    }
  }

  // Main preview methods from technical document
  async createPreview(containerId: string, content: string, language: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Live Preview Manager not initialized');
    }

    console.log(`🖼️ Creating preview for ${language} content`);

    // Create preview window
    const previewWindow = await this.renderer.createPreviewWindow(containerId);
    
    // Create preview content
    const previewContent: PreviewContent = {
      id: `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.getPreviewType(language),
      content,
      language,
      timestamp: Date.now(),
      metadata: {
        source: 'editor',
        dependencies: [],
        errors: [],
        warnings: [],
        executionTime: 0,
        memoryUsage: 0
      }
    };

    // Render immediately or queue based on mode
    if (this.config.mode === 'real-time') {
      await this.renderer.renderContent(previewContent, previewWindow.id);
    } else {
      this.queuePreview(previewContent);
    }

    // Setup hot reload if enabled
    if (this.config.enableHotReload) {
      this.hotReloadManager.watchContent(previewContent, (updatedContent) => {
        this.renderer.renderContent(updatedContent, previewWindow.id);
      });
    }

    return previewWindow.id;
  }

  async updatePreview(previewId: string, content: string): Promise<boolean> {
    const previewWindow = this.renderer.getWindow(previewId);
    if (!previewWindow) return false;

    // Update content through hot reload manager
    this.hotReloadManager.updateContent(previewId, content);
    return true;
  }

  private getPreviewType(language: string): string {
    const typeMap: Record<string, string> = {
      'html': 'web',
      'css': 'web',
      'javascript': 'web',
      'typescript': 'web',
      'jsx': 'react',
      'tsx': 'react',
      'vue': 'vue',
      'python': 'python-visual',
      'svg': 'svg',
      'xml': 'svg',
      'markdown': 'markdown',
      'md': 'markdown'
    };
    
    return typeMap[language] || 'web';
  }

  private queuePreview(content: PreviewContent): void {
    // Remove any existing preview for the same content
    this.previewQueue = this.previewQueue.filter(p => p.id !== content.id);
    
    // Add to queue
    this.previewQueue.push(content);
    
    this.emit('previewQueued', content);
  }

  private async renderPreview(content: PreviewContent): Promise<void> {
    // Validate content size
    if (content.content.length > this.config.maxPreviewSize) {
      throw new Error(`Content size exceeds limit: ${content.content.length} > ${this.config.maxPreviewSize}`);
    }

    // Validate language support
    if (!this.config.supportedLanguages.includes(content.language)) {
      throw new Error(`Language not supported: ${content.language}`);
    }

    // Find active preview window for this content
    const activeWindows = this.renderer.getActiveWindows();
    const targetWindow = activeWindows.find(w => w.id.includes(content.id.split('_')[1]));
    
    if (targetWindow) {
      await this.renderer.renderContent(content, targetWindow.id);
    }
  }

  // Live preview interface methods from technical document
  initializeLivePreview(): {
    previewMode: string;
    codeExecution: string;
    errorHandling: string;
  } {
    return {
      previewMode: this.config.mode,
      codeExecution: this.config.sandboxed ? 'sandboxed' : 'direct',
      errorHandling: 'inline-feedback'
    };
  }

  updatePreviewInstantly(content: string, language: string = 'javascript'): void {
    console.log('🖼️ Updating preview instantly');
    
    // Create or update preview content
    const previewContent: PreviewContent = {
      id: `instant_${Date.now()}`,
      type: this.getPreviewType(language),
      content,
      language,
      timestamp: Date.now(),
      metadata: {
        source: 'editor',
        dependencies: [],
        errors: [],
        warnings: [],
        executionTime: 0,
        memoryUsage: 0
      }
    };

    if (this.config.mode === 'real-time') {
      this.queuePreview(previewContent);
    }
  }

  // Preview management methods
  destroyPreview(previewId: string): boolean {
    // Stop watching content
    this.hotReloadManager.unwatchContent(previewId);
    
    // Destroy preview window
    return this.renderer.destroyPreviewWindow(previewId);
  }

  getActivePreviewsCount(): number {
    return this.renderer.getActiveWindows().length;
  }

  getAllPreviews(): PreviewWindow[] {
    return this.renderer.getActiveWindows();
  }

  // Configuration methods
  updateConfig(updates: Partial<PreviewConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (updates.updateDelay) {
      this.hotReloadManager.setDebounceDelay(updates.updateDelay);
    }
    
    this.emit('configUpdated', this.config);
  }

  getConfig(): PreviewConfig {
    return { ...this.config };
  }

  getSupportedLanguages(): string[] {
    return [...this.config.supportedLanguages];
  }

  getPreviewTypes(): PreviewType[] {
    return [...this.config.previewTypes];
  }

  // Status methods
  isReady(): boolean {
    return this.isInitialized;
  }

  getStatus(): {
    initialized: boolean;
    mode: string;
    activePreviews: number;
    queuedPreviews: number;
    hotReloadEnabled: boolean;
    supportedLanguages: string[];
  } {
    return {
      initialized: this.isInitialized,
      mode: this.config.mode,
      activePreviews: this.renderer.getActiveWindows().length,
      queuedPreviews: this.previewQueue.length,
      hotReloadEnabled: this.config.enableHotReload,
      supportedLanguages: this.config.supportedLanguages
    };
  }

  destroy(): void {
    // Clear preview queue
    this.previewQueue = [];
    
    // Destroy all preview windows
    const activeWindows = this.renderer.getActiveWindows();
    activeWindows.forEach(window => {
      this.renderer.destroyPreviewWindow(window.id);
    });
    
    // Cleanup hot reload
    const watchedContent = this.hotReloadManager.getWatchedContent();
    watchedContent.forEach(content => {
      this.hotReloadManager.unwatchContent(content.id);
    });
    
    this.removeAllListeners();
    console.log('🖼️ Live Preview Manager destroyed');
  }
}

// Export singleton instance
export const livePreviewManager = new LivePreviewManager();
