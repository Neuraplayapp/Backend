// Enhanced Security Manager - Data exfiltration prevention and request validation
// Based on technical architecture document specifications

import { EventEmitter } from 'events';

export interface SecurityConfig {
  dataExfiltrationPrevention: {
    enabled: boolean;
    sensitiveDataPatterns: string[];
    allowedDomains: string[];
    blockSuspiciousPatterns: boolean;
    auditLevel: 'none' | 'basic' | 'detailed' | 'comprehensive';
  };
  requestValidation: {
    enabled: boolean;
    corsValidation: boolean;
    rateLimiting: boolean;
    sanitization: boolean;
    whitelistOnly: boolean;
  };
  canvasSecurityLevel: 'permissive' | 'moderate' | 'strict' | 'paranoid';
  networkSecurity: {
    httpsOnly: boolean;
    certificateValidation: boolean;
    customHeaders: Record<string, string>;
    blockedUserAgents: string[];
  };
}

export interface SecurityViolation {
  id: string;
  timestamp: number;
  type: 'data-exfiltration' | 'suspicious-request' | 'cors-violation' | 'rate-limit' | 'malicious-pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  description: string;
  blockedContent?: string;
  remediationAction: 'blocked' | 'sanitized' | 'logged' | 'quarantined';
  metadata: {
    userAgent?: string;
    ip?: string;
    requestUrl?: string;
    payload?: any;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  source: 'canvas' | 'assistant' | 'network' | 'system';
  target: string;
  result: 'success' | 'blocked' | 'error';
  details: any;
  securityLevel: string;
}

interface SecurityPatterns {
  dataExfiltration: RegExp[];
  maliciousCode: RegExp[];
  sensitiveData: RegExp[];
  suspiciousUrls: RegExp[];
}

interface RequestQuarantine {
  id: string;
  request: any;
  reason: string;
  timestamp: number;
  reviewed: boolean;
}

class DataExfiltrationDetector extends EventEmitter {
  private patterns: SecurityPatterns;
  private sensitiveDataCache = new Map<string, boolean>();

  constructor() {
    super();
    this.patterns = this.initializeSecurityPatterns();
  }

  private initializeSecurityPatterns(): SecurityPatterns {
    return {
      dataExfiltration: [
        /leak.*data/i,
        /exfiltrate/i,
        /send.*private/i,
        /steal.*info/i,
        /copy.*sensitive/i,
        /extract.*personal/i,
        /download.*confidential/i
      ],
      maliciousCode: [
        /eval\s*\(/i,
        /innerHTML\s*=/i,
        /document\.write/i,
        /window\.location\s*=/i,
        /setTimeout\s*\(\s*["']/i,
        /setInterval\s*\(\s*["']/i,
        /Function\s*\(/i,
        /new\s+Function/i
      ],
      sensitiveData: [
        /password\s*[:=]\s*["'][^"']+["']/i,
        /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
        /secret\s*[:=]\s*["'][^"']+["']/i,
        /token\s*[:=]\s*["'][^"']+["']/i,
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card pattern
        /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN pattern
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email pattern
      ],
      suspiciousUrls: [
        /bit\.ly/i,
        /tinyurl/i,
        /t\.co/i,
        /goo\.gl/i,
        /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/, // IP addresses
        /localhost(?::\d+)?/i,
        /127\.0\.0\.1/i,
        /192\.168\./i,
        /10\.\d+\.\d+\.\d+/i
      ]
    };
  }

  detectDataExfiltration(content: string, context: any): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const timestamp = Date.now();

    // Check for explicit exfiltration patterns
    this.patterns.dataExfiltration.forEach((pattern, index) => {
      if (pattern.test(content)) {
        violations.push({
          id: `exfil_${timestamp}_${index}`,
          timestamp,
          type: 'data-exfiltration',
          severity: 'high',
          source: context.source || 'unknown',
          description: `Potential data exfiltration detected: ${pattern.source}`,
          blockedContent: this.extractMatchingContent(content, pattern),
          remediationAction: 'blocked',
          metadata: context
        });
      }
    });

    // Check for sensitive data exposure
    this.patterns.sensitiveData.forEach((pattern, index) => {
      if (pattern.test(content)) {
        violations.push({
          id: `sensitive_${timestamp}_${index}`,
          timestamp,
          type: 'data-exfiltration',
          severity: 'critical',
          source: context.source || 'unknown',
          description: `Sensitive data pattern detected: ${pattern.source}`,
          blockedContent: '[REDACTED]',
          remediationAction: 'sanitized',
          metadata: context
        });
      }
    });

    // Check for malicious code patterns
    this.patterns.maliciousCode.forEach((pattern, index) => {
      if (pattern.test(content)) {
        violations.push({
          id: `malicious_${timestamp}_${index}`,
          timestamp,
          type: 'malicious-pattern',
          severity: 'high',
          source: context.source || 'unknown',
          description: `Potentially malicious code detected: ${pattern.source}`,
          blockedContent: this.extractMatchingContent(content, pattern),
          remediationAction: 'blocked',
          metadata: context
        });
      }
    });

    return violations;
  }

  private extractMatchingContent(content: string, pattern: RegExp): string {
    const match = content.match(pattern);
    return match ? match[0] : '';
  }

  sanitizeContent(content: string): { sanitized: string; modifications: string[] } {
    let sanitized = content;
    const modifications: string[] = [];

    // Remove potentially dangerous patterns
    this.patterns.maliciousCode.forEach(pattern => {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, '/* [SANITIZED] */');
        modifications.push(`Removed potentially dangerous code: ${pattern.source}`);
      }
    });

    // Redact sensitive data
    this.patterns.sensitiveData.forEach(pattern => {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
        modifications.push(`Redacted sensitive data: ${pattern.source}`);
      }
    });

    return { sanitized, modifications };
  }
}

class RequestValidator extends EventEmitter {
  private allowedDomains: Set<string>;
  private rateLimitMap = new Map<string, { count: number; lastReset: number }>();
  private quarantine: RequestQuarantine[] = [];

  constructor(allowedDomains: string[] = []) {
    super();
    this.allowedDomains = new Set(allowedDomains);
  }

  validateCanvasRequest(request: any, context: any): {
    isValid: boolean;
    violations: SecurityViolation[];
    sanitizedRequest?: any;
  } {
    const violations: SecurityViolation[] = [];
    let sanitizedRequest = { ...request };
    let isValid = true;

    // CORS validation
    if (request.url && !this.validateCORS(request.url)) {
      violations.push({
        id: `cors_${Date.now()}`,
        timestamp: Date.now(),
        type: 'cors-violation',
        severity: 'medium',
        source: context.source || 'unknown',
        description: `CORS policy violation for URL: ${request.url}`,
        remediationAction: 'blocked',
        metadata: { ...context, requestUrl: request.url }
      });
      isValid = false;
    }

    // Rate limiting validation
    const rateLimitViolation = this.checkRateLimit(context.source || 'unknown');
    if (rateLimitViolation) {
      violations.push(rateLimitViolation);
      isValid = false;
    }

    // Content validation
    if (request.data || request.body) {
      const contentToValidate = typeof request.data === 'string' ? 
        request.data : JSON.stringify(request.data || request.body);
      
      const contentViolations = this.validateContent(contentToValidate, context);
      violations.push(...contentViolations);
      
      if (contentViolations.length > 0) {
        // Sanitize if possible
        const sanitized = this.sanitizeRequestContent(contentToValidate);
        if (sanitized.canSanitize) {
          sanitizedRequest.data = sanitized.content;
          sanitizedRequest.body = sanitized.content;
        } else {
          isValid = false;
        }
      }
    }

    // Header validation
    if (request.headers) {
      const headerViolations = this.validateHeaders(request.headers, context);
      violations.push(...headerViolations);
      if (headerViolations.some(v => v.severity === 'high' || v.severity === 'critical')) {
        isValid = false;
      }
    }

    return { isValid, violations, sanitizedRequest: isValid ? sanitizedRequest : undefined };
  }

  private validateCORS(url: string): boolean {
    if (this.allowedDomains.size === 0) return true; // If no restrictions, allow all
    
    try {
      const urlObj = new URL(url);
      return this.allowedDomains.has(urlObj.hostname) || this.allowedDomains.has('*');
    } catch {
      return false; // Invalid URL
    }
  }

  private checkRateLimit(source: string): SecurityViolation | null {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 100; // Max requests per window

    const entry = this.rateLimitMap.get(source);
    
    if (!entry) {
      this.rateLimitMap.set(source, { count: 1, lastReset: now });
      return null;
    }

    if (now - entry.lastReset > windowMs) {
      // Reset window
      entry.count = 1;
      entry.lastReset = now;
      return null;
    }

    entry.count++;

    if (entry.count > maxRequests) {
      return {
        id: `rate_limit_${now}`,
        timestamp: now,
        type: 'rate-limit',
        severity: 'medium',
        source,
        description: `Rate limit exceeded: ${entry.count}/${maxRequests} requests in window`,
        remediationAction: 'blocked',
        metadata: { count: entry.count, limit: maxRequests, window: windowMs }
      };
    }

    return null;
  }

  private validateContent(content: string, context: any): SecurityViolation[] {
    const detector = new DataExfiltrationDetector();
    return detector.detectDataExfiltration(content, context);
  }

  private sanitizeRequestContent(content: string): { canSanitize: boolean; content: string; modifications: string[] } {
    const detector = new DataExfiltrationDetector();
    const violations = detector.detectDataExfiltration(content, { source: 'sanitizer' });
    
    // If there are critical violations, don't sanitize
    if (violations.some(v => v.severity === 'critical')) {
      return { canSanitize: false, content, modifications: [] };
    }

    const { sanitized, modifications } = detector.sanitizeContent(content);
    return { canSanitize: true, content: sanitized, modifications };
  }

  private validateHeaders(headers: Record<string, string>, context: any): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-original-ip'];
    
    suspiciousHeaders.forEach(header => {
      if (headers[header]) {
        violations.push({
          id: `header_${Date.now()}_${header}`,
          timestamp: Date.now(),
          type: 'suspicious-request',
          severity: 'low',
          source: context.source || 'unknown',
          description: `Suspicious header detected: ${header}`,
          remediationAction: 'logged',
          metadata: { ...context, header, value: headers[header] }
        });
      }
    });

    return violations;
  }

  quarantineRequest(request: any, reason: string): string {
    const quarantineId = `quarantine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.quarantine.push({
      id: quarantineId,
      request: { ...request },
      reason,
      timestamp: Date.now(),
      reviewed: false
    });

    // Keep only last 100 quarantined requests
    if (this.quarantine.length > 100) {
      this.quarantine = this.quarantine.slice(-100);
    }

    this.emit('requestQuarantined', { id: quarantineId, reason });
    return quarantineId;
  }

  getQuarantinedRequests(): RequestQuarantine[] {
    return [...this.quarantine];
  }

  reviewQuarantinedRequest(id: string, approved: boolean): boolean {
    const request = this.quarantine.find(r => r.id === id);
    if (request) {
      request.reviewed = true;
      this.emit('quarantineReviewed', { id, approved });
      return true;
    }
    return false;
  }
}

class AuditLogger extends EventEmitter {
  private auditLog: AuditLogEntry[] = [];
  private maxLogSize = 10000;

  logSecurityEvent(
    action: string,
    source: AuditLogEntry['source'],
    target: string,
    result: AuditLogEntry['result'],
    details: any,
    securityLevel: string = 'medium'
  ): void {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action,
      source,
      target,
      result,
      details,
      securityLevel
    };

    this.auditLog.push(entry);

    // Maintain log size
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxLogSize);
    }

    this.emit('auditEvent', entry);
    console.log(`🛡️ Security Audit: ${action} on ${target} from ${source} - ${result}`);
  }

  getAuditLog(filters?: {
    startTime?: number;
    endTime?: number;
    source?: AuditLogEntry['source'];
    result?: AuditLogEntry['result'];
    securityLevel?: string;
  }): AuditLogEntry[] {
    let filtered = [...this.auditLog];

    if (filters) {
      if (filters.startTime) {
        filtered = filtered.filter(entry => entry.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        filtered = filtered.filter(entry => entry.timestamp <= filters.endTime!);
      }
      if (filters.source) {
        filtered = filtered.filter(entry => entry.source === filters.source);
      }
      if (filters.result) {
        filtered = filtered.filter(entry => entry.result === filters.result);
      }
      if (filters.securityLevel) {
        filtered = filtered.filter(entry => entry.securityLevel === filters.securityLevel);
      }
    }

    return filtered;
  }

  exportAuditLog(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['ID', 'Timestamp', 'Action', 'Source', 'Target', 'Result', 'Security Level', 'Details'];
      const rows = this.auditLog.map(entry => [
        entry.id,
        new Date(entry.timestamp).toISOString(),
        entry.action,
        entry.source,
        entry.target,
        entry.result,
        entry.securityLevel,
        JSON.stringify(entry.details)
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.auditLog, null, 2);
  }
}

export class SecurityManager extends EventEmitter {
  private config: SecurityConfig;
  private dataExfiltrationDetector: DataExfiltrationDetector;
  private requestValidator: RequestValidator;
  private auditLogger: AuditLogger;
  private violations: SecurityViolation[] = [];
  private isInitialized = false;

  constructor(config: Partial<SecurityConfig> = {}) {
    super();
    
    this.config = {
      dataExfiltrationPrevention: {
        enabled: config.dataExfiltrationPrevention?.enabled ?? true,
        sensitiveDataPatterns: config.dataExfiltrationPrevention?.sensitiveDataPatterns || [],
        allowedDomains: config.dataExfiltrationPrevention?.allowedDomains || [],
        blockSuspiciousPatterns: config.dataExfiltrationPrevention?.blockSuspiciousPatterns ?? true,
        auditLevel: config.dataExfiltrationPrevention?.auditLevel || 'detailed'
      },
      requestValidation: {
        enabled: config.requestValidation?.enabled ?? true,
        corsValidation: config.requestValidation?.corsValidation ?? true,
        rateLimiting: config.requestValidation?.rateLimiting ?? true,
        sanitization: config.requestValidation?.sanitization ?? true,
        whitelistOnly: config.requestValidation?.whitelistOnly ?? false
      },
      canvasSecurityLevel: config.canvasSecurityLevel || 'moderate',
      networkSecurity: {
        httpsOnly: config.networkSecurity?.httpsOnly ?? true,
        certificateValidation: config.networkSecurity?.certificateValidation ?? true,
        customHeaders: config.networkSecurity?.customHeaders || {},
        blockedUserAgents: config.networkSecurity?.blockedUserAgents || []
      }
    };

    this.dataExfiltrationDetector = new DataExfiltrationDetector();
    this.requestValidator = new RequestValidator(this.config.dataExfiltrationPrevention.allowedDomains);
    this.auditLogger = new AuditLogger();
    
    this.initializeSecurityManager();
  }

  private initializeSecurityManager(): void {
    console.log('🛡️ Security Manager - Initializing with level:', this.config.canvasSecurityLevel);
    
    this.setupEventHandlers();
    this.loadSecuritySettings();
    this.isInitialized = true;
    
    this.emit('initialized');
  }

  private setupEventHandlers(): void {
    this.dataExfiltrationDetector.on('violation', (violation) => {
      this.handleSecurityViolation(violation);
    });

    this.requestValidator.on('requestQuarantined', (data) => {
      this.auditLogger.logSecurityEvent(
        'request-quarantined',
        'network',
        'quarantine',
        'blocked',
        data,
        'high'
      );
    });

    this.auditLogger.on('auditEvent', (entry) => {
      this.emit('auditEvent', entry);
    });
  }

  private loadSecuritySettings(): void {
    try {
      const saved = localStorage.getItem('security-manager-config');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        this.config = { ...this.config, ...parsedConfig };
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  }

  private saveSecuritySettings(): void {
    try {
      localStorage.setItem('security-manager-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save security settings:', error);
    }
  }

  private handleSecurityViolation(violation: SecurityViolation): void {
    this.violations.push(violation);
    
    // Keep only last 1000 violations
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-1000);
    }

    this.auditLogger.logSecurityEvent(
      'security-violation',
      'system',
      violation.type,
      violation.remediationAction === 'blocked' ? 'blocked' : 'success',
      violation,
      violation.severity
    );

    this.emit('securityViolation', violation);

    // Auto-response based on severity
    if (violation.severity === 'critical') {
      this.emit('criticalSecurityAlert', violation);
    }
  }

  // Main security validation methods from technical document
  validateCanvasRequest(request: any, context: any): {
    isValid: boolean;
    violations: SecurityViolation[];
    sanitizedRequest?: any;
  } {
    if (!this.config.requestValidation.enabled) {
      return { isValid: true, violations: [] };
    }

    console.log('🛡️ Validating canvas request:', request.url || 'data request');

    const validation = this.requestValidator.validateCanvasRequest(request, context);
    
    // Log validation result
    this.auditLogger.logSecurityEvent(
      'canvas-request-validation',
      'canvas',
      request.url || 'data-request',
      validation.isValid ? 'success' : 'blocked',
      { violations: validation.violations, context },
      validation.violations.length > 0 ? 'medium' : 'low'
    );

    return validation;
  }

  containsSuspiciousPatterns(request: string, suspiciousPatterns: RegExp[]): boolean {
    if (!this.config.dataExfiltrationPrevention.enabled) {
      return false;
    }

    return suspiciousPatterns.some(pattern => pattern.test(request));
  }

  contextualValidation(request: any, context: any): boolean {
    // Contextual validation based on conversation and user history
    const contextFactors = {
      userTrustLevel: context.userTrustLevel || 'medium',
      conversationLength: context.conversationLength || 0,
      previousViolations: this.getUserViolationCount(context.userId || 'anonymous'),
      requestComplexity: this.assessRequestComplexity(request)
    };

    const trustScore = this.calculateTrustScore(contextFactors);
    const isValid = trustScore >= this.getTrustThreshold();

    this.auditLogger.logSecurityEvent(
      'contextual-validation',
      'system',
      'trust-assessment',
      isValid ? 'success' : 'blocked',
      { trustScore, threshold: this.getTrustThreshold(), factors: contextFactors },
      'medium'
    );

    return isValid;
  }

  private getUserViolationCount(userId: string): number {
    return this.violations.filter(v => v.metadata.userId === userId).length;
  }

  private assessRequestComplexity(request: any): 'low' | 'medium' | 'high' {
    const requestString = JSON.stringify(request);
    const length = requestString.length;
    
    if (length < 100) return 'low';
    if (length < 1000) return 'medium';
    return 'high';
  }

  private calculateTrustScore(factors: any): number {
    let score = 0.5; // Base score
    
    // User trust level impact
    switch (factors.userTrustLevel) {
      case 'high': score += 0.3; break;
      case 'medium': score += 0.1; break;
      case 'low': score -= 0.2; break;
    }
    
    // Conversation length (longer conversations = more trust)
    if (factors.conversationLength > 20) score += 0.1;
    if (factors.conversationLength > 50) score += 0.1;
    
    // Previous violations (more violations = less trust)
    score -= Math.min(factors.previousViolations * 0.1, 0.4);
    
    // Request complexity (simpler = more trust)
    switch (factors.requestComplexity) {
      case 'low': score += 0.1; break;
      case 'high': score -= 0.1; break;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private getTrustThreshold(): number {
    switch (this.config.canvasSecurityLevel) {
      case 'permissive': return 0.2;
      case 'moderate': return 0.5;
      case 'strict': return 0.7;
      case 'paranoid': return 0.9;
      default: return 0.5;
    }
  }

  // Data exfiltration prevention methods
  preventDataExfiltration(content: string, context: any): {
    blocked: boolean;
    sanitized?: string;
    violations: SecurityViolation[];
  } {
    if (!this.config.dataExfiltrationPrevention.enabled) {
      return { blocked: false, violations: [] };
    }

    const violations = this.dataExfiltrationDetector.detectDataExfiltration(content, context);
    
    if (violations.length === 0) {
      return { blocked: false, violations: [] };
    }

    // Check if we should block or sanitize
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      this.handleSecurityViolation(criticalViolations[0]);
      return { blocked: true, violations };
    }

    // Try to sanitize
    const { sanitized } = this.dataExfiltrationDetector.sanitizeContent(content);
    violations.forEach(v => this.handleSecurityViolation(v));
    
    return { blocked: false, sanitized, violations };
  }

  blockAndLog(request: any): SecurityViolation {
    const violation: SecurityViolation = {
      id: `blocked_${Date.now()}`,
      timestamp: Date.now(),
      type: 'suspicious-request',
      severity: 'high',
      source: 'security-manager',
      description: 'Request blocked due to security policy',
      remediationAction: 'blocked',
      metadata: { request }
    };

    this.handleSecurityViolation(violation);
    return violation;
  }

  // Public API methods
  updateSecurityConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveSecuritySettings();
    this.emit('configUpdated', this.config);
  }

  getSecurityConfig(): SecurityConfig {
    return { ...this.config };
  }

  getSecurityViolations(filters?: {
    type?: SecurityViolation['type'];
    severity?: SecurityViolation['severity'];
    startTime?: number;
    endTime?: number;
  }): SecurityViolation[] {
    let filtered = [...this.violations];

    if (filters) {
      if (filters.type) {
        filtered = filtered.filter(v => v.type === filters.type);
      }
      if (filters.severity) {
        filtered = filtered.filter(v => v.severity === filters.severity);
      }
      if (filters.startTime) {
        filtered = filtered.filter(v => v.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        filtered = filtered.filter(v => v.timestamp <= filters.endTime!);
      }
    }

    return filtered;
  }

  getAuditLog(filters?: any): AuditLogEntry[] {
    return this.auditLogger.getAuditLog(filters);
  }

  exportSecurityReport(format: 'json' | 'csv' = 'json'): string {
    const report = {
      timestamp: Date.now(),
      config: this.config,
      violations: this.violations,
      auditLog: this.auditLogger.getAuditLog(),
      statistics: {
        totalViolations: this.violations.length,
        violationsBySeverity: this.getViolationStatistics(),
        violationsByType: this.getViolationTypeStatistics()
      }
    };

    if (format === 'csv') {
      return this.auditLogger.exportAuditLog('csv');
    }

    return JSON.stringify(report, null, 2);
  }

  private getViolationStatistics(): Record<string, number> {
    const stats: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    this.violations.forEach(v => stats[v.severity]++);
    return stats;
  }

  private getViolationTypeStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.violations.forEach(v => {
      stats[v.type] = (stats[v.type] || 0) + 1;
    });
    return stats;
  }

  quarantineRequest(request: any, reason: string): string {
    return this.requestValidator.quarantineRequest(request, reason);
  }

  getQuarantinedRequests(): RequestQuarantine[] {
    return this.requestValidator.getQuarantinedRequests();
  }

  reviewQuarantinedRequest(id: string, approved: boolean): boolean {
    const result = this.requestValidator.reviewQuarantinedRequest(id, approved);
    
    this.auditLogger.logSecurityEvent(
      'quarantine-review',
      'system',
      id,
      approved ? 'success' : 'blocked',
      { approved },
      'medium'
    );

    return result;
  }

  // Status methods
  isReady(): boolean {
    return this.isInitialized;
  }

  getSecurityStatus(): {
    enabled: boolean;
    level: string;
    recentViolations: number;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const recentViolations = this.violations.filter(
      v => Date.now() - v.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length;

    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (recentViolations > 10) threatLevel = 'medium';
    if (recentViolations > 50) threatLevel = 'high';
    if (recentViolations > 100) threatLevel = 'critical';

    return {
      enabled: this.config.dataExfiltrationPrevention.enabled && this.config.requestValidation.enabled,
      level: this.config.canvasSecurityLevel,
      recentViolations,
      threatLevel
    };
  }

  destroy(): void {
    this.saveSecuritySettings();
    this.removeAllListeners();
    console.log('🛡️ Security Manager destroyed');
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();
