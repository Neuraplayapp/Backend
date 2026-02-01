// Pyodide Runtime - Browser-based Python execution for canvas environment
// Based on technical architecture document specifications

// Simple EventEmitter implementation for browser compatibility
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

export interface PyodideConfig {
  indexURL: string;
  packages: string[];
  lockFileURL?: string;
  micropipIndexURLs?: string[];
  customPackages?: Record<string, string>;
  enableNetworkAccess: boolean;
  maxExecutionTime: number;
  memoryLimit: number;
  allowedPackages: string[];
  blockedPackages: string[];
}

export interface ExecutionContext {
  id: string;
  code: string;
  environment: 'canvas' | 'notebook' | 'repl';
  packages: string[];
  timeout: number;
  memoryLimit: number;
  networkAccess: boolean;
  userId?: string;
  metadata: {
    timestamp: number;
    source: string;
    language: 'python';
    version: string;
  };
}

export interface ExecutionResult {
  id: string;
  success: boolean;
  output: string;
  error?: string;
  stdout: string[];
  stderr: string[];
  returnValue: any;
  executionTime: number;
  memoryUsage: number;
  networkRequests: NetworkRequest[];
  installedPackages: string[];
  warnings: string[];
  metadata: {
    pyodideVersion: string;
    pythonVersion: string;
    timestamp: number;
  };
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  responseTime: number;
  blocked: boolean;
  reason?: string;
}

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  size: number;
  installTime: number;
  source: 'pypi' | 'micropip' | 'custom';
}

declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

class PyodideEnvironment extends EventEmitter {
  private pyodide: any = null;
  private isInitialized = false;
  private installedPackages = new Map<string, PackageInfo>();
  private executionQueue: ExecutionContext[] = [];
  private activeExecutions = new Map<string, Promise<ExecutionResult>>();
  private networkInterceptor: NetworkInterceptor;

  constructor(
    private config: PyodideConfig = {
      // Use the latest stable 0.26.2 which offers smaller stdlib and bug-fixes
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
      packages: [],
      lockFileURL: undefined,
      micropipIndexURLs: [],
      customPackages: {},
      enableNetworkAccess: false,
      maxExecutionTime: 30000, // 30 s default
      memoryLimit: 128,        // 128 MB sandbox
      allowedPackages: [],
      blockedPackages: []
    }
  ) {
    super();
    this.networkInterceptor = new NetworkInterceptor(config.enableNetworkAccess);
    this.initializePyodide();
  }

  private async initializePyodide(): Promise<void> {
    try {
      console.log('🐍 Pyodide: Initializing Python runtime environment');
      
      // Check if we're in development mode and network connectivity
      if (import.meta.env.DEV) {
        try {
          // Test CDN connectivity before loading
          const testResponse = await fetch(this.config.indexURL + 'pyodide.js', { method: 'HEAD' });
          if (!testResponse.ok) {
            throw new Error(`CDN not accessible: ${testResponse.status}`);
          }
        } catch (networkError) {
          console.log('🐍 Pyodide: Skipping initialization - CDN not accessible in dev mode');
          this.isInitialized = false;
          this.emit('initializationFailed', new Error('Pyodide CDN not accessible'));
          return;
        }
      }
      
      // Load Pyodide script if not already loaded
      if (!window.loadPyodide) {
        await this.loadPyodideScript();
      }

      // Initialize Pyodide with configuration
      this.pyodide = await window.loadPyodide({
        indexURL: this.config.indexURL,
        fullStdLib: false,
        packages: [],
      });

      // Force Pyodide to use local CDN path for any subsequent package fetches
      try {
        if (this.pyodide.setCdnUrl) {
          this.pyodide.setCdnUrl(this.config.indexURL);
        }
      } catch (_) { /* ignore */ }

      // Setup Python environment
      await this.setupPythonEnvironment();
      
      // Install initial packages
      if (this.config.packages.length > 0) {
        await this.installPackages(this.config.packages);
      }

      this.isInitialized = true;
      this.emit('initialized');
      console.log('🐍 Pyodide: Python runtime ready');
      
    } catch (error) {
      console.warn('🐍 Pyodide: Initialization failed (non-critical):', error);
      this.isInitialized = false;
      this.emit('initializationFailed', error);
      // Don't throw - make it non-blocking
    }
  }

  private async loadPyodideScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Prevent duplicate script injections
      if (document.querySelector('script[data-pyodide]')) {
        resolve();
        return;
      }

      // Tell the loader where to grab its resources – use the same CDN base so
      // we don’t rely on self-hosting large .wasm / stdlib files in production.
      (window as any).languagePluginUrl = this.config.indexURL;

      const cleanBaseURL = this.config.indexURL.replace(/\/+$/, ''); // trim trailing slashes
      const primarySrc = `${cleanBaseURL}/pyodide.js`;

      const script = document.createElement('script');
      script.dataset.pyodide = 'true';
      script.src = primarySrc;
      script.crossOrigin = 'anonymous';

      script.onload = () => resolve();

      script.onerror = async () => {
        console.warn('🐍 Pyodide: Primary CDN failed, attempting local fallback');
        // Try fallback path served from our public assets
        const fallbackSrc = '/pyodide/pyodide.js';
        script.onerror = () => reject(new Error('Failed to load Pyodide script from both CDN and local fallback'));
        script.src = fallbackSrc;
      };

      document.head.appendChild(script);
    });
  }

  private async setupPythonEnvironment(): Promise<void> {
    // Setup execution environment
    await this.pyodide.runPython(`
import sys
import io
import traceback
import time
import gc
from contextlib import redirect_stdout, redirect_stderr

# Global variables for capturing output
_stdout_buffer = io.StringIO()
_stderr_buffer = io.StringIO()
_execution_start_time = 0
_memory_usage = 0

def _capture_output():
    """Setup output capture"""
    global _stdout_buffer, _stderr_buffer
    _stdout_buffer = io.StringIO()
    _stderr_buffer = io.StringIO()
    return redirect_stdout(_stdout_buffer), redirect_stderr(_stderr_buffer)

def _get_output():
    """Get captured output"""
    return _stdout_buffer.getvalue(), _stderr_buffer.getvalue()

def _start_execution():
    """Mark execution start time"""
    global _execution_start_time
    _execution_start_time = time.time()

def _end_execution():
    """Get execution time"""
    return time.time() - _execution_start_time

def _get_memory_usage():
    """Get approximate memory usage"""
    gc.collect()
    return sys.getsizeof(globals()) + sys.getsizeof(locals())

def _safe_eval(code, timeout=30):
    """Safely evaluate Python code with timeout"""
    import signal
    import threading
    
    result = {'value': None, 'error': None, 'timed_out': False}
    
    def target():
        try:
            # Compile and execute the code
            compiled = compile(code, '<canvas>', 'eval' if '\\n' not in code.strip() else 'exec')
            result['value'] = eval(compiled) if '\\n' not in code.strip() else exec(compiled)
        except Exception as e:
            result['error'] = str(e)
    
    thread = threading.Thread(target=target)
    thread.daemon = True
    thread.start()
    thread.join(timeout)
    
    if thread.is_alive():
        result['timed_out'] = True
        result['error'] = f'Execution timed out after {timeout} seconds'
    
    return result
    `);

    // Setup network interception if enabled
    if (this.config.enableNetworkAccess) {
      await this.setupNetworkCapabilities();
    }
  }

  private async setupNetworkCapabilities(): Promise<void> {
    // Setup requests library with monitoring
    await this.pyodide.runPython(`
import json
import urllib.request
import urllib.parse
import urllib.error

# Global network request log
_network_requests = []

class NetworkMonitor:
    def __init__(self):
        self.requests = []
    
    def log_request(self, url, method='GET', status=200, response_time=0, blocked=False, reason=None):
        request = {
            'id': f'req_{len(self.requests)}',
            'url': url,
            'method': method,
            'status': status,
            'responseTime': response_time,
            'blocked': blocked,
            'reason': reason
        }
        self.requests.append(request)
        return request
    
    def get_requests(self):
        return self.requests

_network_monitor = NetworkMonitor()

# Override urllib to monitor requests
original_urlopen = urllib.request.urlopen

def monitored_urlopen(url, data=None, timeout=None):
    import time
    start_time = time.time()
    
    try:
        response = original_urlopen(url, data, timeout)
        response_time = (time.time() - start_time) * 1000
        _network_monitor.log_request(str(url), 'POST' if data else 'GET', 200, response_time)
        return response
    except urllib.error.HTTPError as e:
        response_time = (time.time() - start_time) * 1000
        _network_monitor.log_request(str(url), 'POST' if data else 'GET', e.code, response_time)
        raise
    except Exception as e:
        response_time = (time.time() - start_time) * 1000
        _network_monitor.log_request(str(url), 'POST' if data else 'GET', 0, response_time, True, str(e))
        raise

urllib.request.urlopen = monitored_urlopen
    `);
  }

  async executeCode(context: ExecutionContext): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      throw new Error('Pyodide runtime not initialized');
    }

    const startTime = Date.now();
    
    try {
      console.log(`🐍 Pyodide: Executing Python code (${context.id})`);
      
      // Install required packages
      if (context.packages.length > 0) {
        await this.installPackages(context.packages);
      }

      // Setup execution environment
      await this.pyodide.runPython('_capture_output(); _start_execution()');
      
      let result: any;
      let error: string | undefined;
      
      try {
        // Execute the code with timeout
        const executionPromise = this.executeWithTimeout(context.code, context.timeout);
        result = await executionPromise;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }

      // Get execution results
      const [stdout, stderr] = this.pyodide.runPython('_get_output()');
      const executionTime = this.pyodide.runPython('_end_execution()');
      const memoryUsage = this.pyodide.runPython('_get_memory_usage()');
      const networkRequests = this.pyodide.runPython('_network_monitor.get_requests()');

      const executionResult: ExecutionResult = {
        id: context.id,
        success: !error,
        output: result ? String(result) : '',
        error,
        stdout: stdout ? stdout.split('\n').filter(Boolean) : [],
        stderr: stderr ? stderr.split('\n').filter(Boolean) : [],
        returnValue: result,
        executionTime: executionTime * 1000, // Convert to milliseconds
        memoryUsage,
        networkRequests: networkRequests || [],
        installedPackages: Array.from(this.installedPackages.keys()),
        warnings: [],
        metadata: {
          pyodideVersion: this.pyodide.version,
          pythonVersion: this.pyodide.runPython('sys.version'),
          timestamp: Date.now()
        }
      };

      this.emit('executionCompleted', executionResult);
      return executionResult;

    } catch (error) {
      const executionResult: ExecutionResult = {
        id: context.id,
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        stdout: [],
        stderr: [error instanceof Error ? error.message : String(error)],
        returnValue: null,
        executionTime: Date.now() - startTime,
        memoryUsage: 0,
        networkRequests: [],
        installedPackages: Array.from(this.installedPackages.keys()),
        warnings: [],
        metadata: {
          pyodideVersion: this.pyodide?.version || 'unknown',
          pythonVersion: 'unknown',
          timestamp: Date.now()
        }
      };

      this.emit('executionFailed', executionResult);
      return executionResult;
    }
  }

  private async executeWithTimeout(code: string, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Code execution timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = this.pyodide.runPython(code);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  async installPackages(packages: string[]): Promise<void> {
    const filteredPackages = packages.filter(pkg => 
      !this.installedPackages.has(pkg) && 
      this.isPackageAllowed(pkg)
    );

    if (filteredPackages.length === 0) {
      return;
    }

    try {
      console.log(`🐍 Pyodide: Installing packages: ${filteredPackages.join(', ')}`);
      
      const startTime = Date.now();
      await this.pyodide.loadPackage(filteredPackages);
      const installTime = Date.now() - startTime;

      // Record installed packages
      for (const pkg of filteredPackages) {
        this.installedPackages.set(pkg, {
          name: pkg,
          version: 'unknown', // Pyodide doesn't easily expose version info
          description: '',
          dependencies: [],
          size: 0,
          installTime,
          source: 'pypi'
        });
      }

      this.emit('packagesInstalled', filteredPackages);
      console.log(`🐍 Pyodide: Packages installed in ${installTime}ms`);

    } catch (error) {
      console.error('🐍 Pyodide: Package installation failed:', error);
      this.emit('packageInstallationFailed', { packages: filteredPackages, error });
      throw error;
    }
  }

  private isPackageAllowed(packageName: string): boolean {
    // Check against blocked packages
    if (this.config.blockedPackages.includes(packageName)) {
      return false;
    }

    // Check against allowed packages (if specified)
    if (this.config.allowedPackages.length > 0) {
      return this.config.allowedPackages.includes(packageName);
    }

    return true;
  }

  getInstalledPackages(): PackageInfo[] {
    return Array.from(this.installedPackages.values());
  }

  async uninstallPackage(packageName: string): Promise<boolean> {
    if (!this.installedPackages.has(packageName)) {
      return false;
    }

    try {
      // Pyodide doesn't support uninstalling packages directly
      // We'd need to reload the entire environment
      console.warn(`🐍 Pyodide: Package uninstallation not supported: ${packageName}`);
      return false;
    } catch (error) {
      console.error('🐍 Pyodide: Package uninstallation failed:', error);
      return false;
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async restart(): Promise<void> {
    console.log('🐍 Pyodide: Restarting Python runtime');
    
    this.isInitialized = false;
    this.installedPackages.clear();
    this.executionQueue = [];
    this.activeExecutions.clear();

    // Reinitialize
    await this.initializePyodide();
  }

  getStatus(): {
    initialized: boolean;
    packagesCount: number;
    memoryUsage: number;
    activeExecutions: number;
    queuedExecutions: number;
  } {
    let memoryUsage = 0;
    if (this.isInitialized) {
      try {
        memoryUsage = this.pyodide.runPython('_get_memory_usage()');
      } catch {
        // Ignore errors
      }
    }

    return {
      initialized: this.isInitialized,
      packagesCount: this.installedPackages.size,
      memoryUsage,
      activeExecutions: this.activeExecutions.size,
      queuedExecutions: this.executionQueue.length
    };
  }

  destroy(): void {
    this.isInitialized = false;
    this.installedPackages.clear();
    this.executionQueue = [];
    this.activeExecutions.clear();
    this.removeAllListeners();
    
    // Note: Pyodide doesn't provide a clean destruction method
    // The runtime will be garbage collected when the page unloads
    console.log('🐍 Pyodide: Runtime destroyed');
  }
}

class NetworkInterceptor {
  private isEnabled: boolean;
  private blockedDomains: Set<string>;
  private allowedDomains: Set<string>;

  constructor(enabled: boolean) {
    this.isEnabled = enabled;
    this.blockedDomains = new Set([
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '192.168.',
      '10.',
      '172.16.'
    ]);
    this.allowedDomains = new Set([
      'pypi.org',
      'files.pythonhosted.org',
      'api.github.com',
      'raw.githubusercontent.com'
    ]);
  }

  shouldBlockRequest(url: string): { blocked: boolean; reason?: string } {
    if (!this.isEnabled) {
      return { blocked: true, reason: 'Network access disabled' };
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Check blocked domains
      for (const blocked of this.blockedDomains) {
        if (hostname.includes(blocked)) {
          return { blocked: true, reason: `Blocked domain: ${blocked}` };
        }
      }

      // Check allowed domains (if any specified)
      if (this.allowedDomains.size > 0) {
        const isAllowed = Array.from(this.allowedDomains).some(allowed => 
          hostname.includes(allowed)
        );
        if (!isAllowed) {
          return { blocked: true, reason: 'Domain not in allowed list' };
        }
      }

      return { blocked: false };

    } catch (error) {
      return { blocked: true, reason: 'Invalid URL format' };
    }
  }

  addAllowedDomain(domain: string): void {
    this.allowedDomains.add(domain);
  }

  addBlockedDomain(domain: string): void {
    this.blockedDomains.add(domain);
  }

  removeAllowedDomain(domain: string): boolean {
    return this.allowedDomains.delete(domain);
  }

  removeBlockedDomain(domain: string): boolean {
    return this.blockedDomains.delete(domain);
  }
}

// PyodideEnvironment stub - will use existing implementation

export class PyodideRuntime extends EventEmitter {
  private environment: PyodideEnvironment;
  private _readyPromise: Promise<void>;
  private config: PyodideConfig;
  private isInitialized = false;

  constructor(config: Partial<PyodideConfig> = {}) {
    super();
    
    this.config = {
      indexURL: config.indexURL || 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
      packages: config.packages || [],
      lockFileURL: config.lockFileURL,
      micropipIndexURLs: config.micropipIndexURLs || ['https://pypi.org/pypi/{package_name}/json'],
      customPackages: config.customPackages || {},
      enableNetworkAccess: config.enableNetworkAccess ?? true,
      maxExecutionTime: config.maxExecutionTime || 30000, // 30 seconds
      memoryLimit: config.memoryLimit || 100 * 1024 * 1024, // 100MB
      allowedPackages: config.allowedPackages || [],
      blockedPackages: config.blockedPackages || ['os', 'subprocess', 'shutil', 'socket']
    };

    this.environment = new PyodideEnvironment(this.config);
    this._readyPromise = new Promise((resolve) => {
      this.environment.on('initialized', () => resolve());
    });
    this.initializeRuntime();
  }

  private async initializeRuntime(): Promise<void> {
    try {
      console.log('🐍 PyodideRuntime: Initializing');
      
      // Use a Promise-based approach instead of once()
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Pyodide initialization timeout'));
        }, 30000); // 30 second timeout

        this.environment.on('initialized', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.environment.on('initializationFailed', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      this.isInitialized = true;
      this.setupEventHandlers();
      this.emit('initialized');
      
      console.log('🐍 PyodideRuntime: Ready for code execution');

    } catch (error) {
      console.error('🐍 PyodideRuntime: Initialization failed:', error);
      this.emit('initializationFailed', error);
    }
  }

  private setupEventHandlers(): void {
    this.environment.on('executionCompleted', (result) => {
      this.emit('executionCompleted', result);
    });

    this.environment.on('executionFailed', (result) => {
      this.emit('executionFailed', result);
    });

    this.environment.on('packagesInstalled', (packages) => {
      this.emit('packagesInstalled', packages);
    });

    this.environment.on('packageInstallationFailed', (data) => {
      this.emit('packageInstallationFailed', data);
    });
  }

  /**
   * Wait until the runtime is fully initialised
   */
  public async ready(): Promise<void> {
    return this._readyPromise;
  }

  /**
   * Public helper: wait until the runtime is fully ready or timeout.
   */
  async waitForReady(maxMs = 30000): Promise<boolean> {
    if (this.isReady()) return true;
    return new Promise(resolve => {
      const start = performance.now();
      const check = () => {
        if (this.isReady()) return resolve(true);
        if (performance.now() - start > maxMs) return resolve(false);
        setTimeout(check, 200);
      };
      check();
    });
  }

  // Main execution method from technical document
  async executeInCanvasEnvironment(
    code: string,
    options: {
      packages?: string[];
      timeout?: number;
      memoryLimit?: number;
      networkAccess?: boolean;
      userId?: string;
    } = {}
  ): Promise<ExecutionResult> {
    
    if (!this.isInitialized) {
      throw new Error('Pyodide runtime not initialized');
    }

    const context: ExecutionContext = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code,
      environment: 'canvas',
      packages: options.packages || [],
      timeout: options.timeout || this.config.maxExecutionTime,
      memoryLimit: options.memoryLimit || this.config.memoryLimit,
      networkAccess: options.networkAccess ?? this.config.enableNetworkAccess,
      userId: options.userId,
      metadata: {
        timestamp: Date.now(),
        source: 'canvas',
        language: 'python',
        version: '3.11' // Pyodide Python version
      }
    };

    return this.environment.executeCode(context);
  }

  async installPackage(packageName: string): Promise<boolean> {
    try {
      await this.environment.installPackages([packageName]);
      return true;
    } catch (error) {
      console.error(`🐍 Failed to install package ${packageName}:`, error);
      return false;
    }
  }

  async installPackages(packages: string[]): Promise<string[]> {
    const successful: string[] = [];
    
    for (const pkg of packages) {
      try {
        await this.environment.installPackages([pkg]);
        successful.push(pkg);
      } catch (error) {
        console.error(`🐍 Failed to install package ${pkg}:`, error);
      }
    }
    
    return successful;
  }

  getInstalledPackages(): PackageInfo[] {
    return this.environment.getInstalledPackages();
  }

  async uninstallPackage(packageName: string): Promise<boolean> {
    return this.environment.uninstallPackage(packageName);
  }

  async restart(): Promise<void> {
    await this.environment.restart();
  }

  updateConfig(updates: Partial<PyodideConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }

  getConfig(): PyodideConfig {
    return { ...this.config };
  }

  getStatus(): {
    initialized: boolean;
    ready: boolean;
    environment: any;
    config: PyodideConfig;
  } {
    return {
      initialized: this.isInitialized,
      ready: this.environment.isReady(),
      environment: this.environment.getStatus(),
      config: this.config
    };
  }

  // Compatibility with technical document interface
  initializePyodideRuntime(): {
    networkAccess: boolean;
    corsPolicy: string;
    packageManager: string;
  } {
    return {
      networkAccess: this.config.enableNetworkAccess,
      corsPolicy: 'permissive',
      packageManager: 'micropip'
    };
  }

  routeExecution(code: string, context: { environment: string }): Promise<ExecutionResult> {
    if (context.environment === 'canvas') {
      return this.executeInCanvasEnvironment(code);
    } else {
      throw new Error(`Unsupported execution environment: ${context.environment}`);
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.environment.isReady();
  }

  destroy(): void {
    this.environment.destroy();
    this.removeAllListeners();
    console.log('🐍 PyodideRuntime: Destroyed');
  }
}

// Export singleton instance
export const pyodideRuntime = new PyodideRuntime();

