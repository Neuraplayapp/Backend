// Code Interpreter API - Server-side secure code execution
// Based on technical architecture document specifications

import { EventEmitter } from 'events';

export interface CodeInterpreterConfig {
  endpoint: string;
  apiKey: string;
  timeout: number;
  maxExecutionTime: number;
  memoryLimit: number;
  diskLimit: number;
  networkAccess: boolean;
  allowedLanguages: string[];
  securityLevel: 'sandbox' | 'container' | 'vm' | 'isolated';
  resourceLimits: {
    cpu: number; // CPU percentage limit
    memory: number; // Memory limit in MB
    disk: number; // Disk space limit in MB
    networkBandwidth: number; // Network bandwidth limit in KB/s
  };
}

export interface ExecutionRequest {
  id: string;
  code: string;
  language: string;
  files?: FileContent[];
  packages?: string[];
  environment?: Record<string, string>;
  timeout?: number;
  memoryLimit?: number;
  workingDirectory?: string;
  userId?: string;
  metadata: {
    source: 'canvas' | 'assistant' | 'notebook';
    timestamp: number;
    sessionId?: string;
    contextId?: string;
  };
}

export interface FileContent {
  name: string;
  content: string;
  encoding: 'utf-8' | 'base64' | 'binary';
  type: 'text' | 'image' | 'data' | 'executable';
}

export interface ExecutionResponse {
  id: string;
  success: boolean;
  output: string;
  error?: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  networkActivity: NetworkActivity[];
  generatedFiles: FileContent[];
  installedPackages: string[];
  warnings: string[];
  securityEvents: SecurityEvent[];
  metadata: {
    interpreterVersion: string;
    languageVersion: string;
    platform: string;
    timestamp: number;
    containerId?: string;
  };
}

export interface NetworkActivity {
  id: string;
  url: string;
  method: string;
  requestSize: number;
  responseSize: number;
  statusCode: number;
  duration: number;
  blocked: boolean;
  reason?: string;
}

export interface SecurityEvent {
  id: string;
  type: 'file_access' | 'network_request' | 'system_call' | 'resource_limit' | 'privilege_escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  blocked: boolean;
  timestamp: number;
  details: any;
}

export interface SessionInfo {
  id: string;
  userId?: string;
  language: string;
  startTime: number;
  endTime?: number;
  executionCount: number;
  totalExecutionTime: number;
  memoryPeak: number;
  diskUsage: number;
  networkRequests: number;
  securityViolations: number;
  status: 'active' | 'suspended' | 'terminated' | 'expired';
}

class SecurityMonitor extends EventEmitter {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000;

  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): SecurityEvent {
    const securityEvent: SecurityEvent = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...event
    };

    this.events.push(securityEvent);
    
    // Maintain event history size
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.emit('securityEvent', securityEvent);
    
    if (securityEvent.severity === 'critical' || securityEvent.severity === 'high') {
      this.emit('criticalSecurityEvent', securityEvent);
    }

    return securityEvent;
  }

  getEvents(filters?: {
    type?: SecurityEvent['type'];
    severity?: SecurityEvent['severity'];
    startTime?: number;
    endTime?: number;
    blocked?: boolean;
  }): SecurityEvent[] {
    let filtered = [...this.events];

    if (filters) {
      if (filters.type) {
        filtered = filtered.filter(e => e.type === filters.type);
      }
      if (filters.severity) {
        filtered = filtered.filter(e => e.severity === filters.severity);
      }
      if (filters.startTime) {
        filtered = filtered.filter(e => e.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        filtered = filtered.filter(e => e.timestamp <= filters.endTime!);
      }
      if (filters.blocked !== undefined) {
        filtered = filtered.filter(e => e.blocked === filters.blocked);
      }
    }

    return filtered;
  }

  clearEvents(): void {
    this.events = [];
    this.emit('eventsCleared');
  }
}

class SessionManager extends EventEmitter {
  private sessions = new Map<string, SessionInfo>();
  private activeExecutions = new Map<string, ExecutionRequest>();

  createSession(userId?: string, language: string = 'python'): SessionInfo {
    const session: SessionInfo = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      language,
      startTime: Date.now(),
      executionCount: 0,
      totalExecutionTime: 0,
      memoryPeak: 0,
      diskUsage: 0,
      networkRequests: 0,
      securityViolations: 0,
      status: 'active'
    };

    this.sessions.set(session.id, session);
    this.emit('sessionCreated', session);
    return session;
  }

  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<SessionInfo>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    Object.assign(session, updates);
    this.emit('sessionUpdated', session);
    return true;
  }

  terminateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'terminated';
    session.endTime = Date.now();
    
    this.emit('sessionTerminated', session);
    return true;
  }

  getActiveSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  addExecution(sessionId: string, request: ExecutionRequest): void {
    this.activeExecutions.set(request.id, request);
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.executionCount++;
      this.emit('executionAdded', { sessionId, request });
    }
  }

  removeExecution(requestId: string): void {
    this.activeExecutions.delete(requestId);
  }

  getActiveExecutions(): ExecutionRequest[] {
    return Array.from(this.activeExecutions.values());
  }

  cleanupExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (now - session.startTime > maxAgeMs && session.status !== 'active') {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.emit('sessionsCleanedUp', cleaned);
    }

    return cleaned;
  }
}

class ResourceMonitor extends EventEmitter {
  private metrics: Array<{
    timestamp: number;
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    activeExecutions: number;
  }> = [];

  private maxMetrics = 1000;

  recordMetrics(cpu: number, memory: number, disk: number, network: number, activeExecutions: number): void {
    this.metrics.push({
      timestamp: Date.now(),
      cpu,
      memory,
      disk,
      network,
      activeExecutions
    });

    // Maintain metrics history size
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.emit('metricsRecorded', this.metrics[this.metrics.length - 1]);
  }

  getMetrics(timeRange?: { start: number; end: number }): typeof this.metrics {
    if (!timeRange) {
      return [...this.metrics];
    }

    return this.metrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  getCurrentResourceUsage(): {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (this.metrics.length === 0) {
      return { cpu: 0, memory: 0, disk: 0, network: 0, trend: 'stable' };
    }

    const latest = this.metrics[this.metrics.length - 1];
    
    // Calculate trend based on last 5 measurements
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (this.metrics.length >= 5) {
      const recent = this.metrics.slice(-5);
      const avgCpu = recent.reduce((sum, m) => sum + m.cpu, 0) / recent.length;
      const previousAvg = this.metrics.slice(-10, -5).reduce((sum, m) => sum + m.cpu, 0) / 5;
      
      if (avgCpu > previousAvg * 1.1) trend = 'increasing';
      else if (avgCpu < previousAvg * 0.9) trend = 'decreasing';
    }

    return {
      cpu: latest.cpu,
      memory: latest.memory,
      disk: latest.disk,
      network: latest.network,
      trend
    };
  }
}

export class CodeInterpreterAPI extends EventEmitter {
  private config: CodeInterpreterConfig;
  private securityMonitor: SecurityMonitor;
  private sessionManager: SessionManager;
  private resourceMonitor: ResourceMonitor;
  private isInitialized = false;

  constructor(config: Partial<CodeInterpreterConfig> = {}) {
    super();
    
    this.config = {
      endpoint: config.endpoint || 'http://localhost:8000/api/execute',
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      maxExecutionTime: config.maxExecutionTime || 60000,
      memoryLimit: config.memoryLimit || 512, // MB
      diskLimit: config.diskLimit || 1024, // MB
      networkAccess: config.networkAccess ?? false,
      allowedLanguages: config.allowedLanguages || ['python', 'javascript', 'bash'],
      securityLevel: config.securityLevel || 'container',
      resourceLimits: {
        cpu: config.resourceLimits?.cpu || 50, // 50% CPU limit
        memory: config.resourceLimits?.memory || 512, // 512MB memory limit
        disk: config.resourceLimits?.disk || 1024, // 1GB disk limit
        networkBandwidth: config.resourceLimits?.networkBandwidth || 1024 // 1MB/s bandwidth limit
      }
    };

    this.securityMonitor = new SecurityMonitor();
    this.sessionManager = new SessionManager();
    this.resourceMonitor = new ResourceMonitor();
    
    this.initializeCodeInterpreter();
  }

  private initializeCodeInterpreter(): void {
    console.log('🔒 Code Interpreter API - Initializing secure execution environment');
    
    this.setupEventHandlers();
    this.startResourceMonitoring();
    this.isInitialized = true;
    
    this.emit('initialized');
  }

  private setupEventHandlers(): void {
    this.securityMonitor.on('criticalSecurityEvent', (event) => {
      this.emit('criticalSecurityEvent', event);
      console.error('🚨 Critical security event:', event);
    });

    this.sessionManager.on('sessionCreated', (session) => {
      this.emit('sessionCreated', session);
    });

    this.sessionManager.on('sessionTerminated', (session) => {
      this.emit('sessionTerminated', session);
    });

    this.resourceMonitor.on('metricsRecorded', (metrics) => {
      // Check for resource limit violations
      if (metrics.cpu > this.config.resourceLimits.cpu * 0.9) {
        this.securityMonitor.logEvent({
          type: 'resource_limit',
          severity: 'medium',
          description: `High CPU usage: ${metrics.cpu}%`,
          blocked: false,
          details: { cpu: metrics.cpu, limit: this.config.resourceLimits.cpu }
        });
      }
    });
  }

  private startResourceMonitoring(): void {
    // Simulate resource monitoring (in a real implementation, this would query actual system metrics)
    setInterval(() => {
      const cpu = Math.random() * 100;
      const memory = Math.random() * this.config.resourceLimits.memory;
      const disk = Math.random() * this.config.resourceLimits.disk;
      const network = Math.random() * this.config.resourceLimits.networkBandwidth;
      const activeExecutions = this.sessionManager.getActiveExecutions().length;

      this.resourceMonitor.recordMetrics(cpu, memory, disk, network, activeExecutions);
    }, 5000); // Record metrics every 5 seconds
  }

  // Main execution method from technical document
  async execute(request: ExecutionRequest): Promise<ExecutionResponse> {
    if (!this.isInitialized) {
      throw new Error('Code Interpreter API not initialized');
    }

    console.log(`🔒 Executing ${request.language} code (${request.id})`);
    
    const startTime = Date.now();
    let sessionId = request.metadata.sessionId;

    // Create session if not provided
    if (!sessionId) {
      const session = this.sessionManager.createSession(request.userId, request.language);
      sessionId = session.id;
    }

    this.sessionManager.addExecution(sessionId, request);

    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        throw new Error(`Request validation failed: ${validation.reason}`);
      }

      // Execute code securely
      const response = await this.executeSecurely(request);
      
      // Update session metrics
      this.updateSessionMetrics(sessionId, response);
      
      // Clean up
      this.sessionManager.removeExecution(request.id);
      
      this.emit('executionCompleted', response);
      return response;

    } catch (error) {
      const errorResponse: ExecutionResponse = {
        id: request.id,
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        executionTime: Date.now() - startTime,
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        networkActivity: [],
        generatedFiles: [],
        installedPackages: [],
        warnings: [],
        securityEvents: [],
        metadata: {
          interpreterVersion: 'unknown',
          languageVersion: 'unknown',
          platform: 'server',
          timestamp: Date.now()
        }
      };

      this.sessionManager.removeExecution(request.id);
      this.emit('executionFailed', errorResponse);
      return errorResponse;
    }
  }

  private validateRequest(request: ExecutionRequest): { valid: boolean; reason?: string } {
    // Check language support
    if (!this.config.allowedLanguages.includes(request.language)) {
      return { valid: false, reason: `Language '${request.language}' not supported` };
    }

    // Check code length
    if (request.code.length > 100000) { // 100KB limit
      return { valid: false, reason: 'Code size exceeds limit' };
    }

    // Check timeout
    if (request.timeout && request.timeout > this.config.maxExecutionTime) {
      return { valid: false, reason: 'Timeout exceeds maximum allowed' };
    }

    // Security checks
    const securityCheck = this.performSecurityChecks(request);
    if (!securityCheck.safe) {
      this.securityMonitor.logEvent({
        type: 'privilege_escalation',
        severity: 'high',
        description: securityCheck.reason || 'Potentially malicious code detected',
        blocked: true,
        details: { code: request.code.substring(0, 200) }
      });
      return { valid: false, reason: securityCheck.reason };
    }

    return { valid: true };
  }

  private performSecurityChecks(request: ExecutionRequest): { safe: boolean; reason?: string } {
    const code = request.code;

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /import\s+os/i, reason: 'OS module access not allowed' },
      { pattern: /import\s+subprocess/i, reason: 'Subprocess access not allowed' },
      { pattern: /import\s+socket/i, reason: 'Socket access not allowed' },
      { pattern: /eval\s*\(/i, reason: 'eval() function not allowed' },
      { pattern: /exec\s*\(/i, reason: 'exec() function not allowed' },
      { pattern: /__import__/i, reason: 'Dynamic imports not allowed' },
      { pattern: /open\s*\(/i, reason: 'File operations may be restricted' },
      { pattern: /urllib|requests|http/i, reason: 'Network access may be restricted' }
    ];

    for (const check of dangerousPatterns) {
      if (check.pattern.test(code)) {
        if (check.reason.includes('Network') && this.config.networkAccess) {
          continue; // Allow if network access is enabled
        }
        return { safe: false, reason: check.reason };
      }
    }

    return { safe: true };
  }

  private async executeSecurely(request: ExecutionRequest): Promise<ExecutionResponse> {
    const startTime = Date.now();

    try {
      // Prepare execution environment
      const executionPayload = {
        id: request.id,
        code: request.code,
        language: request.language,
        files: request.files || [],
        packages: request.packages || [],
        environment: request.environment || {},
        timeout: request.timeout || this.config.timeout,
        memoryLimit: request.memoryLimit || this.config.memoryLimit,
        workingDirectory: request.workingDirectory || '/tmp',
        securityLevel: this.config.securityLevel,
        networkAccess: this.config.networkAccess,
        resourceLimits: this.config.resourceLimits
      };

      // Make API request to secure execution environment
      const response = await this.makeAPIRequest(this.config.endpoint, executionPayload);
      
      // Process and validate response
      const executionResult = this.processExecutionResponse(response, request.id, startTime);
      
      // Log security events
      if (executionResult.securityEvents.length > 0) {
        executionResult.securityEvents.forEach(event => {
          this.securityMonitor.logEvent(event);
        });
      }

      return executionResult;

    } catch (error) {
      throw new Error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async makeAPIRequest(endpoint: string, payload: any): Promise<any> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Security-Level': this.config.securityLevel,
        'X-Resource-Limits': JSON.stringify(this.config.resourceLimits)
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private processExecutionResponse(apiResponse: any, requestId: string, startTime: number): ExecutionResponse {
    return {
      id: requestId,
      success: apiResponse.success || false,
      output: apiResponse.output || '',
      error: apiResponse.error,
      stdout: apiResponse.stdout || '',
      stderr: apiResponse.stderr || '',
      exitCode: apiResponse.exitCode || (apiResponse.success ? 0 : 1),
      executionTime: apiResponse.executionTime || (Date.now() - startTime),
      memoryUsage: apiResponse.memoryUsage || 0,
      cpuUsage: apiResponse.cpuUsage || 0,
      diskUsage: apiResponse.diskUsage || 0,
      networkActivity: apiResponse.networkActivity || [],
      generatedFiles: apiResponse.generatedFiles || [],
      installedPackages: apiResponse.installedPackages || [],
      warnings: apiResponse.warnings || [],
      securityEvents: apiResponse.securityEvents || [],
      metadata: {
        interpreterVersion: apiResponse.metadata?.interpreterVersion || 'unknown',
        languageVersion: apiResponse.metadata?.languageVersion || 'unknown',
        platform: apiResponse.metadata?.platform || 'server',
        timestamp: Date.now(),
        containerId: apiResponse.metadata?.containerId
      }
    };
  }

  private updateSessionMetrics(sessionId: string, response: ExecutionResponse): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return;

    session.totalExecutionTime += response.executionTime;
    session.memoryPeak = Math.max(session.memoryPeak, response.memoryUsage);
    session.diskUsage = Math.max(session.diskUsage, response.diskUsage);
    session.networkRequests += response.networkActivity.length;
    session.securityViolations += response.securityEvents.filter(e => e.blocked).length;

    this.sessionManager.updateSession(sessionId, session);
  }

  // Compatibility methods from technical document
  getCodeInterpreterConfig(): {
    networkAccess: boolean;
    fileSystemAccess: boolean;
    packageManager: string;
  } {
    return {
      networkAccess: this.config.networkAccess,
      fileSystemAccess: true,
      packageManager: 'pip'
    };
  }

  routeExecution(code: string, context: { environment: string }): Promise<ExecutionResponse> {
    if (context.environment !== 'canvas') {
      throw new Error(`Environment '${context.environment}' not supported by CodeInterpreter`);
    }

    const request: ExecutionRequest = {
      id: `route_${Date.now()}`,
      code,
      language: 'python', // Default language
      metadata: {
        source: 'canvas',
        timestamp: Date.now()
      }
    };

    return this.execute(request);
  }

  // Public API methods
  createSession(userId?: string, language: string = 'python'): SessionInfo {
    return this.sessionManager.createSession(userId, language);
  }

  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessionManager.getSession(sessionId);
  }

  terminateSession(sessionId: string): boolean {
    return this.sessionManager.terminateSession(sessionId);
  }

  getActiveSessions(): SessionInfo[] {
    return this.sessionManager.getActiveSessions();
  }

  getSecurityEvents(filters?: any): SecurityEvent[] {
    return this.securityMonitor.getEvents(filters);
  }

  getResourceUsage(): any {
    return this.resourceMonitor.getCurrentResourceUsage();
  }

  updateConfig(updates: Partial<CodeInterpreterConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }

  getConfig(): CodeInterpreterConfig {
    return { ...this.config };
  }

  getStatus(): {
    initialized: boolean;
    activeSessions: number;
    activeExecutions: number;
    securityEvents: number;
    resourceUsage: any;
  } {
    return {
      initialized: this.isInitialized,
      activeSessions: this.sessionManager.getActiveSessions().length,
      activeExecutions: this.sessionManager.getActiveExecutions().length,
      securityEvents: this.securityMonitor.getEvents().length,
      resourceUsage: this.resourceMonitor.getCurrentResourceUsage()
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  destroy(): void {
    this.sessionManager.cleanupExpiredSessions(0); // Clean all sessions
    this.securityMonitor.clearEvents();
    this.removeAllListeners();
    console.log('🔒 Code Interpreter API destroyed');
  }
}

// Export singleton instance
export const codeInterpreterAPI = new CodeInterpreterAPI();
