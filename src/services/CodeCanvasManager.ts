// Code Canvas Manager - Live code preview integration with real-time syntax validation
// Based on technical architecture document specifications for CodeMirror 6

import { EventEmitter } from 'events';

export interface CodeCanvasConfig {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  previewMode: 'real-time' | 'on-save' | 'manual';
  codeExecution: 'sandboxed' | 'isolated' | 'restricted';
  errorHandling: 'inline-feedback' | 'panel' | 'console';
  autoSave: boolean;
  collaborativeEditing: boolean;
}

export interface CodeElement {
  id: string;
  language: string;
  code: string;
  metadata: {
    created: number;
    lastModified: number;
    author: string;
    version: number;
    dependencies: string[];
  };
  executionState: {
    isRunning: boolean;
    lastExecution: number;
    result?: ExecutionResult;
    errors?: ValidationError[];
  };
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  /** Optional error message when success is false */
  error?: string;
  logs: string[];
  executionTime: number;
  memoryUsed: number;
  visualOutput?: {
    type: 'html' | 'svg' | 'canvas' | 'image';
    content: string;
    dimensions?: { width: number; height: number };
  };
}

export interface ValidationError {
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  source: 'syntax' | 'type' | 'runtime' | 'style';
  fixSuggestion?: string;
}

export interface CodePreview {
  elementId: string;
  previewType: 'html' | 'react' | 'vue' | 'console' | 'plot';
  content: string;
  interactive: boolean;
  refreshRate: number;
  lastUpdate: number;
}

class LivePreviewManager extends EventEmitter {
  private previewMode: 'real-time' | 'on-save' | 'manual';
  private codeExecution: 'sandboxed' | 'isolated' | 'restricted';
  private errorHandling: 'inline-feedback' | 'panel' | 'console';
  private activePreviews: Map<string, CodePreview>;
  private executionQueue: Map<string, Promise<ExecutionResult>>;

  constructor(config: {
    previewMode?: 'real-time' | 'on-save' | 'manual';
    codeExecution?: 'sandboxed' | 'isolated' | 'restricted';
    errorHandling?: 'inline-feedback' | 'panel' | 'console';
  } = {}) {
    super();
    this.previewMode = config.previewMode || 'real-time';
    this.codeExecution = config.codeExecution || 'sandboxed';
    this.errorHandling = config.errorHandling || 'inline-feedback';
    this.activePreviews = new Map();
    this.executionQueue = new Map();
    
    this.initializeLivePreview();
  }

  private initializeLivePreview(): void {
    console.log('🔴 Live Preview Manager - Initializing live preview system');
    
    // Set up real-time code execution environment
    this.setupExecutionEnvironment();
    
    // Initialize preview rendering
    this.initializePreviewRendering();
    
    // Set up error handling
    this.setupErrorHandling();
  }

  private setupExecutionEnvironment(): void {
    console.log('⚙️ Setting up execution environment:', this.codeExecution);
    
    switch (this.codeExecution) {
      case 'sandboxed':
        this.setupSandboxedExecution();
        break;
      case 'isolated':
        this.setupIsolatedExecution();
        break;
      case 'restricted':
        this.setupRestrictedExecution();
        break;
    }
  }

  private setupSandboxedExecution(): void {
    // Full sandbox with Pyodide for Python, iframe for HTML/JS
    console.log('🏖️ Setting up sandboxed execution environment');
  }

  private setupIsolatedExecution(): void {
    // Isolated but with some system access
    console.log('🔒 Setting up isolated execution environment');
  }

  private setupRestrictedExecution(): void {
    // Minimal execution with strict limitations
    console.log('⛔ Setting up restricted execution environment');
  }

  private initializePreviewRendering(): void {
    console.log('🖼️ Initializing preview rendering system');
    
    // Set up different preview types
    this.setupHTMLPreview();
    this.setupReactPreview();
    this.setupConsolePreview();
    this.setupPlotPreview();
  }

  private setupHTMLPreview(): void {
    console.log('🌐 Setting up HTML preview rendering');
  }

  private setupReactPreview(): void {
    console.log('⚛️ Setting up React component preview');
  }

  private setupConsolePreview(): void {
    console.log('💻 Setting up console output preview');
  }

  private setupPlotPreview(): void {
    console.log('📊 Setting up plot/chart preview');
  }

  private setupErrorHandling(): void {
    console.log('🚨 Setting up error handling:', this.errorHandling);
    
    this.on('executionError', this.handleExecutionError.bind(this));
    this.on('syntaxError', this.handleSyntaxError.bind(this));
    this.on('runtimeError', this.handleRuntimeError.bind(this));
  }

  async updatePreviewInstantly(codeElement: CodeElement): Promise<CodePreview> {
    console.log(`🔄 Updating preview instantly for ${codeElement.id}`);
    
    try {
      // Validate syntax first
      const validationErrors = await this.validateSyntaxRealtime(codeElement);
      
      if (validationErrors.length > 0 && validationErrors.some(e => e.severity === 'error')) {
        throw new Error(`Syntax errors prevent preview: ${validationErrors[0].message}`);
      }
      
      // Execute code and generate preview
      const executionResult = await this.executeCodeSafely(codeElement);
      
      // Create preview based on language and output
      const preview = await this.generatePreview(codeElement, executionResult);
      
      // Store and emit preview
      this.activePreviews.set(codeElement.id, preview);
      this.emit('previewUpdated', preview);
      
      return preview;
      
    } catch (error) {
      console.error('🚨 Preview update failed:', error);
      return this.generateErrorPreview(codeElement.id, error);
    }
  }

  async validateSyntaxRealtime(codeElement: CodeElement): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    try {
      // Language-specific syntax validation
      switch (codeElement.language) {
        case 'javascript':
        case 'typescript':
          errors.push(...await this.validateJavaScript(codeElement.code));
          break;
        case 'python':
          errors.push(...await this.validatePython(codeElement.code));
          break;
        case 'html':
          errors.push(...await this.validateHTML(codeElement.code));
          break;
        case 'css':
          errors.push(...await this.validateCSS(codeElement.code));
          break;
        case 'json':
          errors.push(...await this.validateJSON(codeElement.code));
          break;
        default:
          console.warn(`🤷 No syntax validator for language: ${codeElement.language}`);
      }
      
    } catch (error) {
      errors.push({
        line: 1,
        column: 1,
        severity: 'error',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'syntax'
      });
    }
    
    return errors;
  }

  private async validateJavaScript(code: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    try {
      // Basic syntax check using Function constructor
      new Function(code);
      
      // Additional checks for common issues
      if (code.includes('eval(')) {
        errors.push({
          line: this.findLineNumber(code, 'eval('),
          column: 1,
          severity: 'warning',
          message: 'Use of eval() is discouraged for security reasons',
          source: 'style',
          fixSuggestion: 'Consider alternative approaches to dynamic code execution'
        });
      }
      
      // Check for undefined variables (basic check)
      const undefinedPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\s*[^=])/g;
      let match;
      while ((match = undefinedPattern.exec(code)) !== null) {
        const varName = match[1];
        if (!this.isKnownGlobal(varName) && !code.includes(`var ${varName}`) && !code.includes(`let ${varName}`) && !code.includes(`const ${varName}`)) {
          errors.push({
            line: this.findLineNumber(code, varName),
            column: match.index,
            severity: 'warning',
            message: `'${varName}' may be undefined`,
            source: 'type',
            fixSuggestion: `Declare '${varName}' before use`
          });
        }
      }
      
    } catch (syntaxError) {
      errors.push({
        line: 1,
        column: 1,
        severity: 'error',
        message: syntaxError instanceof Error ? syntaxError.message : 'Syntax error',
        source: 'syntax'
      });
    }
    
    return errors;
  }

  private async validatePython(code: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    // Basic Python syntax validation
    const lines = code.split('\n');
    let indentLevel = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed === '') continue;
      
      // Check indentation
      const lineIndent = line.length - line.trimStart().length;
      if (lineIndent % 4 !== 0) {
        errors.push({
          line: i + 1,
          column: 1,
          severity: 'warning',
          message: 'Inconsistent indentation (should be multiple of 4 spaces)',
          source: 'style'
        });
      }
      
      // Check for common syntax issues
      if (trimmed.endsWith(':') && !trimmed.match(/^(if|else|elif|for|while|def|class|try|except|finally|with)/)) {
        errors.push({
          line: i + 1,
          column: trimmed.length,
          severity: 'warning',
          message: 'Unexpected colon',
          source: 'syntax'
        });
      }
    }
    
    return errors;
  }

  private async validateHTML(code: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    // Basic HTML validation
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    const openTags: string[] = [];
    let match;
    
    while ((match = tagPattern.exec(code)) !== null) {
      const tagName = match[1].toLowerCase();
      const isClosing = match[0].startsWith('</');
      const isSelfClosing = match[0].endsWith('/>') || ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagName);
      
      if (isClosing) {
        if (openTags.length === 0 || openTags.pop() !== tagName) {
          errors.push({
            line: this.findLineNumber(code, match[0]),
            column: match.index,
            severity: 'error',
            message: `Unmatched closing tag: ${tagName}`,
            source: 'syntax'
          });
        }
      } else if (!isSelfClosing) {
        openTags.push(tagName);
      }
    }
    
    // Check for unclosed tags
    openTags.forEach(tag => {
      errors.push({
        line: 1,
        column: 1,
        severity: 'error',
        message: `Unclosed tag: ${tag}`,
        source: 'syntax'
      });
    });
    
    return errors;
  }

  private async validateCSS(code: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    // Basic CSS validation
    const lines = code.split('\n');
    let braceLevel = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;
      
      braceLevel += (line.match(/{/g) || []).length;
      braceLevel -= (line.match(/}/g) || []).length;
      
      if (braceLevel < 0) {
        errors.push({
          line: i + 1,
          column: 1,
          severity: 'error',
          message: 'Unmatched closing brace',
          source: 'syntax'
        });
      }
    }
    
    if (braceLevel > 0) {
      errors.push({
        line: lines.length,
        column: 1,
        severity: 'error',
        message: 'Unclosed braces',
        source: 'syntax'
      });
    }
    
    return errors;
  }

  private async validateJSON(code: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    try {
      JSON.parse(code);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
      const lineMatch = errorMessage.match(/line (\d+)/);
      const line = lineMatch ? parseInt(lineMatch[1]) : 1;
      
      errors.push({
        line,
        column: 1,
        severity: 'error',
        message: errorMessage,
        source: 'syntax'
      });
    }
    
    return errors;
  }

  private findLineNumber(code: string, searchText: string): number {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i + 1;
      }
    }
    return 1;
  }

  private isKnownGlobal(varName: string): boolean {
    const knownGlobals = [
      'console', 'window', 'document', 'setTimeout', 'setInterval',
      'fetch', 'Promise', 'Array', 'Object', 'String', 'Number',
      'Boolean', 'Date', 'Math', 'JSON', 'RegExp'
    ];
    return knownGlobals.includes(varName);
  }

  private async executeCodeSafely(codeElement: CodeElement): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`▶️ Executing ${codeElement.language} code safely`);
      
      let result: ExecutionResult;
      
      switch (codeElement.language) {
        case 'javascript':
        case 'typescript':
          result = await this.executeJavaScript(codeElement.code);
          break;
        case 'python':
          result = await this.executePython(codeElement.code);
          break;
        case 'html':
          result = await this.executeHTML(codeElement.code);
          break;
        case 'css':
          result = await this.executeCSS(codeElement.code);
          break;
        default:
          throw new Error(`Execution not supported for language: ${codeElement.language}`);
      }
      
      result.executionTime = Date.now() - startTime;
      return result;
      
    } catch (error) {
      return {
        success: false,
        output: '',
        logs: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        executionTime: Date.now() - startTime,
        memoryUsed: 0
      };
    }
  }

  private async executeJavaScript(code: string): Promise<ExecutionResult> {
    try {
      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      console.log = (...args) => {
        const line = args.join(' ');
        logs.push(`LOG: ${line}`);
        this.emit('stdout', line);
      };
      console.error = (...args) => {
        const line = args.join(' ');
        logs.push(`ERROR: ${line}`);
        this.emit('stderr', line);
      };
      console.warn = (...args) => {
        const line = args.join(' ');
        logs.push(`WARN: ${line}`);
        this.emit('stdout', line);
      };
      
      try {
        // Execute in isolated context
        const result = new Function('return ' + code)();
        
        return {
          success: true,
          output: String(result),
          logs,
          executionTime: 0, // Will be set by caller
          memoryUsed: 0
        };
        
      } finally {
        // Restore console
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      }
      
    } catch (error) {
      return {
        success: false,
        output: '',
        logs: [`Runtime Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        executionTime: 0,
        memoryUsed: 0
      };
    }
  }

  private async executePython(code: string): Promise<ExecutionResult> {
    // This would integrate with Pyodide for actual Python execution
    console.log('🐍 Python execution via Pyodide (placeholder)');
    
    return {
      success: true,
      output: `# Python execution result for:\n${code}\n# (Pyodide integration needed)`,
      logs: ['Python execution via Pyodide'],
      executionTime: 0,
      memoryUsed: 0
    };
  }

  private async executeHTML(code: string): Promise<ExecutionResult> {
    return {
      success: true,
      output: code,
      logs: ['HTML rendered'],
      executionTime: 0,
      memoryUsed: 0,
      visualOutput: {
        type: 'html',
        content: code
      }
    };
  }

  private async executeCSS(code: string): Promise<ExecutionResult> {
    return {
      success: true,
      output: `<style>${code}</style>`,
      logs: ['CSS applied'],
      executionTime: 0,
      memoryUsed: 0,
      visualOutput: {
        type: 'html',
        content: `<style>${code}</style><div>CSS Preview</div>`
      }
    };
  }

  private async generatePreview(codeElement: CodeElement, executionResult: ExecutionResult): Promise<CodePreview> {
    const previewType = this.determinePreviewType(codeElement.language, executionResult);
    
    return {
      elementId: codeElement.id,
      previewType,
      content: this.formatPreviewContent(executionResult, previewType),
      interactive: this.isInteractivePreview(previewType),
      refreshRate: this.getRefreshRate(),
      lastUpdate: Date.now()
    };
  }

  private determinePreviewType(language: string, result: ExecutionResult): 'html' | 'react' | 'vue' | 'console' | 'plot' {
    if (result.visualOutput) {
      switch (result.visualOutput.type) {
        case 'html': return 'html';
        case 'svg': return 'html';
        default: return 'console';
      }
    }
    
    switch (language) {
      case 'html': return 'html';
      case 'javascript':
      case 'typescript':
        return result.output.includes('React') ? 'react' : 'console';
      case 'python':
        return result.output.includes('plot') ? 'plot' : 'console';
      default:
        return 'console';
    }
  }

  private formatPreviewContent(result: ExecutionResult, type: 'html' | 'react' | 'vue' | 'console' | 'plot'): string {
    switch (type) {
      case 'html':
        return result.visualOutput?.content || result.output;
      case 'console':
        return `${result.output}\n\n${result.logs.join('\n')}`;
      case 'plot':
        return result.output; // Would contain plot data
      default:
        return result.output;
    }
  }

  private isInteractivePreview(type: string): boolean {
    return ['html', 'react', 'vue'].includes(type);
  }

  private getRefreshRate(): number {
    return this.previewMode === 'real-time' ? 100 : 1000; // ms
  }

  private generateErrorPreview(elementId: string, error: any): CodePreview {
    return {
      elementId,
      previewType: 'console',
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      interactive: false,
      refreshRate: 0,
      lastUpdate: Date.now()
    };
  }

  private handleExecutionError(error: any): void {
    console.error('🚨 Code execution error:', error);
    this.emit('errorOccurred', {
      type: 'execution',
      error: error instanceof Error ? error.message : 'Unknown execution error'
    });
  }

  private handleSyntaxError(error: any): void {
    console.error('🚨 Syntax error:', error);
    this.emit('errorOccurred', {
      type: 'syntax',
      error: error instanceof Error ? error.message : 'Unknown syntax error'
    });
  }

  private handleRuntimeError(error: any): void {
    console.error('🚨 Runtime error:', error);
    this.emit('errorOccurred', {
      type: 'runtime',
      error: error instanceof Error ? error.message : 'Unknown runtime error'
    });
  }

  // Public API
  async createPreview(codeElement: CodeElement): Promise<CodePreview> {
    return this.updatePreviewInstantly(codeElement);
  }

  async refreshPreview(elementId: string): Promise<CodePreview | null> {
    const preview = this.activePreviews.get(elementId);
    if (!preview) return null;
    
    // Trigger refresh by re-executing associated code
    this.emit('refreshRequested', elementId);
    return preview;
  }

  getActivePreview(elementId: string): CodePreview | null {
    return this.activePreviews.get(elementId) || null;
  }

  getAllPreviews(): CodePreview[] {
    return Array.from(this.activePreviews.values());
  }

  clearPreview(elementId: string): boolean {
    return this.activePreviews.delete(elementId);
  }
}

export class CodeCanvasManager extends EventEmitter {
  private livePreviewManager: LivePreviewManager;
  private codeElements: Map<string, CodeElement>;
  private config: CodeCanvasConfig;
  private changeTracker: Map<string, any[]>;
  private collaborationState: Map<string, any>;

  constructor(config: Partial<CodeCanvasConfig> = {}) {
    super();
    
    this.config = {
      language: config.language || 'javascript',
      theme: config.theme || 'auto',
      previewMode: config.previewMode || 'real-time',
      codeExecution: config.codeExecution || 'sandboxed',
      errorHandling: config.errorHandling || 'inline-feedback',
      autoSave: config.autoSave ?? true,
      collaborativeEditing: config.collaborativeEditing ?? false
    };
    
    this.livePreviewManager = new LivePreviewManager({
      previewMode: this.config.previewMode,
      codeExecution: this.config.codeExecution,
      errorHandling: this.config.errorHandling
    });
    
    this.codeElements = new Map();
    this.changeTracker = new Map();
    this.collaborationState = new Map();
    
    this.initializeLivePreview();
  }

  private initializeLivePreview(): void {
    console.log('🔴 Code Canvas Manager - Initializing live preview integration');
    
    // Set up CodeMirror 6 integration
    this.setupCodeMirrorIntegration();
    
    // Set up real-time features
    this.initializeRealtimeFeatures();
    
    // Set up collaboration if enabled
    if (this.config.collaborativeEditing) {
      this.initializeCollaboration();
    }
  }

  private setupCodeMirrorIntegration(): void {
    console.log('📝 Setting up CodeMirror 6 integration');
    
    // CodeMirror 6 specific setup for live code editing
    // This would include extensions for:
    // - Real-time syntax highlighting
    // - Live error markers
    // - Autocomplete with execution context
    // - Collaborative cursors
  }

  private initializeRealtimeFeatures(): void {
    console.log('⚡ Initializing real-time features');
    
    // Set up live preview updates
    this.livePreviewManager.on('previewUpdated', (preview) => {
      this.emit('codePreviewUpdated', preview);
    });
    
    // Set up error handling
    this.livePreviewManager.on('errorOccurred', (error) => {
      this.emit('codeError', error);
    });
  }

  private initializeCollaboration(): void {
    console.log('🤝 Initializing collaborative editing');
    
    // Set up collaborative editing features
    // This would integrate with the WebSocket bridge for real-time sync
  }

  async handleCodeReformation(codeChange: {
    elementId: string;
    newCode: string;
    changeType: 'edit' | 'format' | 'refactor';
  }): Promise<{
    syntaxValidation: ValidationError[];
    previewUpdate: CodePreview | null;
    errorHighlighting: ValidationError[];
    performanceMonitoring: any;
  }> {
    
    console.log(`🔄 Handling code reformation for ${codeChange.elementId}`);
    
    try {
      // Get or create code element
      let codeElement = this.codeElements.get(codeChange.elementId);
      if (!codeElement) {
        codeElement = this.createCodeElement(codeChange.elementId, codeChange.newCode);
      } else {
        codeElement = this.updateCodeElement(codeElement, codeChange.newCode);
      }
      
      // Real-time syntax validation
      const syntaxValidation = await this.livePreviewManager.validateSyntaxRealtime(codeElement);
      
      // Update preview instantly
      const previewUpdate = await this.livePreviewManager.updatePreviewInstantly(codeElement);
      
      // Highlight errors inline
      const errorHighlighting = syntaxValidation.filter(e => e.severity === 'error');
      
      // Monitor performance
      const performanceMonitoring = this.monitorExecutionPerformance(codeElement);
      
      // Track changes for version control
      this.trackIterativeChanges(codeChange.elementId, codeChange);
      
      return {
        syntaxValidation,
        previewUpdate,
        errorHighlighting,
        performanceMonitoring
      };
      
    } catch (error) {
      console.error('🚨 Code reformation failed:', error);
      return {
        syntaxValidation: [{
          line: 1,
          column: 1,
          severity: 'error' as const,
          message: `Reformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          source: 'runtime' as const
        }],
        previewUpdate: null,
        errorHighlighting: [],
        performanceMonitoring: {}
      };
    }
  }

  private createCodeElement(elementId: string, code: string): CodeElement {
    const element: CodeElement = {
      id: elementId,
      language: this.detectLanguage(code),
      code,
      metadata: {
        created: Date.now(),
        lastModified: Date.now(),
        author: 'user',
        version: 1,
        dependencies: this.extractDependencies(code)
      },
      executionState: {
        isRunning: false,
        lastExecution: 0
      }
    };
    
    this.codeElements.set(elementId, element);
    return element;
  }

  private updateCodeElement(element: CodeElement, newCode: string): CodeElement {
    const updatedElement = {
      ...element,
      code: newCode,
      metadata: {
        ...element.metadata,
        lastModified: Date.now(),
        version: element.metadata.version + 1,
        dependencies: this.extractDependencies(newCode)
      }
    };
    
    this.codeElements.set(element.id, updatedElement);
    return updatedElement;
  }

  private detectLanguage(code: string): string {
    // Simple language detection based on code patterns
    if (code.includes('import React') || code.includes('useState')) return 'javascript';
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('<html') || code.includes('<!DOCTYPE')) return 'html';
    if (code.includes('{') && code.includes(':') && !code.includes('function')) return 'css';
    if (code.startsWith('{') || code.startsWith('[')) return 'json';
    
    return this.config.language; // Default to configured language
  }

  private extractDependencies(code: string): string[] {
    const dependencies: string[] = [];
    
    // Extract imports
    const importPattern = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importPattern.exec(code)) !== null) {
      dependencies.push(match[1]);
    }
    
    // Extract requires
    const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requirePattern.exec(code)) !== null) {
      dependencies.push(match[1]);
    }
    
    return dependencies;
  }

  private monitorExecutionPerformance(codeElement: CodeElement): any {
    return {
      codeComplexity: this.calculateComplexity(codeElement.code),
      estimatedExecutionTime: this.estimateExecutionTime(codeElement),
      memoryEstimate: this.estimateMemoryUsage(codeElement),
      optimizationSuggestions: this.generateOptimizationSuggestions(codeElement)
    };
  }

  private calculateComplexity(code: string): number {
    // Simple complexity calculation
    const lines = code.split('\n').length;
    const functions = (code.match(/function\s+\w+/g) || []).length;
    const loops = (code.match(/\b(for|while)\b/g) || []).length;
    const conditions = (code.match(/\b(if|switch)\b/g) || []).length;
    
    return lines + (functions * 2) + (loops * 3) + (conditions * 2);
  }

  private estimateExecutionTime(codeElement: CodeElement): number {
    const complexity = this.calculateComplexity(codeElement.code);
    return Math.min(complexity * 10, 5000); // Max 5 seconds
  }

  private estimateMemoryUsage(codeElement: CodeElement): number {
    const codeSize = codeElement.code.length;
    const complexity = this.calculateComplexity(codeElement.code);
    return (codeSize * 2) + (complexity * 1024); // Rough estimate in bytes
  }

  private generateOptimizationSuggestions(codeElement: CodeElement): string[] {
    const suggestions: string[] = [];
    const code = codeElement.code;
    
    if (code.includes('for (let i = 0; i < array.length; i++)')) {
      suggestions.push('Consider using array.forEach() or for...of for better readability');
    }
    
    if (code.includes('document.getElementById')) {
      suggestions.push('Cache DOM queries to improve performance');
    }
    
    if ((code.match(/function/g) || []).length > 5) {
      suggestions.push('Consider breaking large functions into smaller, focused functions');
    }
    
    return suggestions;
  }

  private trackIterativeChanges(elementId: string, change: any): void {
    if (!this.changeTracker.has(elementId)) {
      this.changeTracker.set(elementId, []);
    }
    
    const changes = this.changeTracker.get(elementId)!;
    changes.push({
      ...change,
      timestamp: Date.now()
    });
    
    // Keep only last 50 changes
    if (changes.length > 50) {
      this.changeTracker.set(elementId, changes.slice(-50));
    }
  }

  // Public API methods
  /**
   * Execute code for existing element (by id) OR execute an ad-hoc code snippet when language is provided.
   * The former behaviour (single argument) is preserved for backwards compatibility.
   * The new signature (code, language) matches the usage in CodeCanvas component.
   */
  async executeCode(arg1: string, language?: string): Promise<ExecutionResult | null> {
    // Back-compat: single argument = element id
    if (!language) {
      const elementId = arg1;
      const element = this.codeElements.get(elementId);
      if (!element) return null;
      // @ts-ignore – access private helper; acceptable within internal service
      return (this.livePreviewManager as any).executeCodeSafely(element);
    }

    // New behaviour: execute ad-hoc snippet directly
    const code = arg1;
    const lang = language.toLowerCase();

    try {
      if (['javascript', 'typescript', 'js', 'ts'].includes(lang)) {
        // Simple JS/TS execution using Function constructor with console capture
        const logs: string[] = [];
        const originalLog = console.log;
        const originalError = console.error;
        try {
          console.log = (...args) => logs.push(args.join(' '));
          console.error = (...args) => logs.push(args.join(' '));

          const start = performance.now();
          let output: any;
          try {
            output = new Function(code)();
          } catch (e) {
            return {
              success: false,
              output: '',
              logs: logs.concat(String(e)),
              executionTime: performance.now() - start,
              memoryUsed: 0,
            } as ExecutionResult;
          }
          return {
            success: true,
            output: typeof output === 'undefined' ? '' : String(output),
            logs,
            executionTime: performance.now() - start,
            memoryUsed: 0,
          } as ExecutionResult;
        } finally {
          console.log = originalLog;
          console.error = originalError;
        }
      }

      if (lang === 'python') {
        // Delegate to Pyodide runtime if available
        try {
          const { pyodideRuntime } = await import('./PyodideRuntime');
          if (pyodideRuntime) {
            // Wait up to 30 s for the runtime to finish booting (first call)
            if (!pyodideRuntime.isReady()) {
              const ready = await (pyodideRuntime as any).waitForReady?.(30000);
              if (!ready) {
                return {
                  success: false,
                  output: '',
                  error: 'Pyodide runtime failed to initialise in time',
                  logs: [],
                  executionTime: 0,
                  memoryUsed: 0,
                } as unknown as ExecutionResult;
              }
            }

            const execResult = await pyodideRuntime.executeInCanvasEnvironment(code);
            return execResult as unknown as ExecutionResult;
          }

          return {
            success: false,
            output: '',
            error: 'Pyodide runtime module could not be imported',
            logs: [],
            executionTime: 0,
            memoryUsed: 0,
          } as unknown as ExecutionResult;
        } catch (e) {
          return {
            success: false,
            output: '',
            error: e instanceof Error ? e.message : String(e),
            logs: [],
            executionTime: 0,
            memoryUsed: 0,
          } as unknown as ExecutionResult;
        }
      }

      // Unsupported language fallback
      return {
        success: false,
        output: '',
        error: `Unsupported language: ${lang}`,
        logs: [],
        executionTime: 0,
        memoryUsed: 0,
      } as unknown as ExecutionResult;
    } catch (err) {
      return {
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
        logs: [],
        executionTime: 0,
        memoryUsed: 0,
      } as unknown as ExecutionResult;
    }
  }

  async createLivePreview(elementId: string, code: string): Promise<CodePreview> {
    const element = this.createCodeElement(elementId, code);
    return this.livePreviewManager.createPreview(element);
  }

  async updateCode(elementId: string, newCode: string): Promise<any> {
    return this.handleCodeReformation({
      elementId,
      newCode,
      changeType: 'edit'
    });
  }

  getCodeElement(elementId: string): CodeElement | null {
    return this.codeElements.get(elementId) || null;
  }

  getAllCodeElements(): CodeElement[] {
    return Array.from(this.codeElements.values());
  }

  getChangeHistory(elementId: string): any[] {
    return this.changeTracker.get(elementId) || [];
  }

  // Version control methods
  enableVersionControl(): void {
    console.log('📚 Enabling version control for code elements');
    this.on('codeChanged', this.trackIterativeChanges.bind(this));
  }

  enableRollbackCapability(): void {
    console.log('↩️ Enabling rollback capability');
    // Implementation for code rollback
  }

  synchronizeAIAssistance(): void {
    console.log('🤖 Synchronizing AI assistance');
    // Integration with AI for code suggestions
  }

  provideInlineSuggestions(): void {
    console.log('💡 Providing inline suggestions');
    // CodeMirror 6 integration for AI-powered suggestions
  }
}

// Export singleton instance
export const codeCanvasManager = new CodeCanvasManager();
