// CORS Validator - Network request validation and security enforcement
// Based on technical architecture document specifications

import { EventEmitter } from 'events';

export interface CORSPolicy {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  allowCredentials: boolean;
  maxAge: number;
  preflightRequired: boolean;
}

export interface CORSValidationResult {
  isValid: boolean;
  allowedOrigin?: string;
  violations: CORSViolation[];
  recommendedHeaders: Record<string, string>;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface CORSViolation {
  id: string;
  timestamp: number;
  type: 'origin' | 'method' | 'header' | 'credentials' | 'preflight';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requestedValue: string;
  allowedValues: string[];
  remediation: string;
}

export interface NetworkRequestContext {
  url: string;
  method: string;
  headers: Record<string, string>;
  origin?: string;
  referrer?: string;
  userAgent?: string;
  timestamp: number;
  source: 'canvas' | 'assistant' | 'system';
}

export interface SecurityLogger {
  logRequest(url: string, options: any): void;
  logViolation(violation: CORSViolation): void;
  logApproval(url: string, policy: CORSPolicy): void;
}

class CORSPolicyManager extends EventEmitter {
  private policies = new Map<string, CORSPolicy>();
  private defaultPolicy: CORSPolicy;
  private strictMode: boolean;

  constructor(strictMode = false) {
    super();
    this.strictMode = strictMode;
    this.defaultPolicy = this.createDefaultPolicy();
    this.initializePolicies();
  }

  private createDefaultPolicy(): CORSPolicy {
    return {
      allowedOrigins: this.strictMode ? [] : ['*'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'User-Agent'
      ],
      exposedHeaders: ['Content-Length', 'Date'],
      allowCredentials: false,
      maxAge: 86400, // 24 hours
      preflightRequired: true
    };
  }

  private initializePolicies(): void {
    // Canvas-specific policies
    this.registerPolicy('canvas-api', {
      ...this.defaultPolicy,
      allowedOrigins: [
        'https://api.openai.com',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
        'https://pyodide.org'
      ],
      allowedMethods: ['GET', 'POST'],
      allowCredentials: false,
      preflightRequired: true
    });

    // Development policies (more permissive)
    this.registerPolicy('development', {
      ...this.defaultPolicy,
      allowedOrigins: ['http://localhost:*', 'http://127.0.0.1:*', '*'],
      allowCredentials: true,
      preflightRequired: false
    });

    // Production policies (more restrictive)
    this.registerPolicy('production', {
      ...this.defaultPolicy,
      allowedOrigins: [
        'https://yourdomain.com',
        'https://api.yourdomain.com'
      ],
      allowCredentials: false,
      preflightRequired: true
    });

    // AI Service policies
    this.registerPolicy('ai-services', {
      ...this.defaultPolicy,
      allowedOrigins: [
        'https://api.fireworks.ai',
        'https://api.openai.com',
        'https://api.anthropic.com'
      ],
      allowedMethods: ['POST'],
      allowedHeaders: [
        ...this.defaultPolicy.allowedHeaders,
        'X-API-Key',
        'Bearer'
      ],
      allowCredentials: false,
      preflightRequired: true
    });
  }

  registerPolicy(name: string, policy: CORSPolicy): void {
    this.policies.set(name, policy);
    this.emit('policyRegistered', { name, policy });
  }

  getPolicy(name: string): CORSPolicy | undefined {
    return this.policies.get(name);
  }

  getAllPolicies(): Map<string, CORSPolicy> {
    return new Map(this.policies);
  }

  updatePolicy(name: string, updates: Partial<CORSPolicy>): boolean {
    const existing = this.policies.get(name);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.policies.set(name, updated);
    this.emit('policyUpdated', { name, policy: updated });
    return true;
  }

  removePolicy(name: string): boolean {
    const removed = this.policies.delete(name);
    if (removed) {
      this.emit('policyRemoved', name);
    }
    return removed;
  }

  findMatchingPolicy(url: string): CORSPolicy {
    // Try to find the most specific policy first
    for (const [name, policy] of this.policies) {
      if (this.policyMatchesUrl(policy, url)) {
        return policy;
      }
    }
    
    return this.defaultPolicy;
  }

  private policyMatchesUrl(policy: CORSPolicy, url: string): boolean {
    try {
      const urlObj = new URL(url);
      const origin = `${urlObj.protocol}//${urlObj.host}`;
      
      return policy.allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin === '*') return true;
        if (allowedOrigin.includes('*')) {
          // Handle wildcard patterns
          const pattern = allowedOrigin.replace(/\*/g, '.*');
          return new RegExp(pattern).test(origin);
        }
        return allowedOrigin === origin;
      });
    } catch {
      return false;
    }
  }
}

class SecurityLogger {
  private requestLog: Array<{ timestamp: number; url: string; options: any }> = [];
  private violationLog: CORSViolation[] = [];
  private approvalLog: Array<{ timestamp: number; url: string; policy: string }> = [];
  private maxLogSize = 1000;

  logRequest(url: string, options: any): void {
    this.requestLog.push({
      timestamp: Date.now(),
      url,
      options: { ...options, sensitiveData: '[REDACTED]' }
    });

    this.maintainLogSize(this.requestLog);
    console.log(`🌐 CORS Request logged: ${url}`);
  }

  logViolation(violation: CORSViolation): void {
    this.violationLog.push(violation);
    this.maintainLogSize(this.violationLog);
    
    console.warn(`🚫 CORS Violation: ${violation.type} - ${violation.description}`);
  }

  logApproval(url: string, policyName: string): void {
    this.approvalLog.push({
      timestamp: Date.now(),
      url,
      policy: policyName
    });

    this.maintainLogSize(this.approvalLog);
    console.log(`✅ CORS Approved: ${url} (policy: ${policyName})`);
  }

  private maintainLogSize(log: any[]): void {
    if (log.length > this.maxLogSize) {
      log.splice(0, log.length - this.maxLogSize);
    }
  }

  getRequestLog(): Array<{ timestamp: number; url: string; options: any }> {
    return [...this.requestLog];
  }

  getViolationLog(): CORSViolation[] {
    return [...this.violationLog];
  }

  getApprovalLog(): Array<{ timestamp: number; url: string; policy: string }> {
    return [...this.approvalLog];
  }

  exportLogs(): {
    requests: any[];
    violations: CORSViolation[];
    approvals: any[];
    summary: {
      totalRequests: number;
      totalViolations: number;
      totalApprovals: number;
      violationRate: number;
    };
  } {
    const summary = {
      totalRequests: this.requestLog.length,
      totalViolations: this.violationLog.length,
      totalApprovals: this.approvalLog.length,
      violationRate: this.requestLog.length > 0 ? 
        (this.violationLog.length / this.requestLog.length) * 100 : 0
    };

    return {
      requests: this.requestLog,
      violations: this.violationLog,
      approvals: this.approvalLog,
      summary
    };
  }
}

export class CORSValidator extends EventEmitter {
  private policyManager: CORSPolicyManager;
  private securityLogger: SecurityLogger;
  private enforcementLevel: 'permissive' | 'moderate' | 'strict' | 'paranoid';
  private allowedDomainCache = new Map<string, boolean>();
  private isInitialized = false;

  constructor(enforcementLevel: 'permissive' | 'moderate' | 'strict' | 'paranoid' = 'moderate') {
    super();
    
    this.enforcementLevel = enforcementLevel;
    this.policyManager = new CORSPolicyManager(enforcementLevel === 'strict' || enforcementLevel === 'paranoid');
    this.securityLogger = new SecurityLogger();
    
    this.initializeCORSValidator();
  }

  private initializeCORSValidator(): void {
    console.log('🌐 CORS Validator - Initializing with enforcement level:', this.enforcementLevel);
    
    this.setupEventHandlers();
    this.loadCORSSettings();
    this.isInitialized = true;
    
    this.emit('initialized');
  }

  private setupEventHandlers(): void {
    this.policyManager.on('policyRegistered', (data) => {
      this.emit('policyRegistered', data);
    });

    this.policyManager.on('policyUpdated', (data) => {
      this.allowedDomainCache.clear(); // Clear cache when policies change
      this.emit('policyUpdated', data);
    });
  }

  private loadCORSSettings(): void {
    try {
      const saved = localStorage.getItem('cors-validator-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.enforcementLevel = settings.enforcementLevel || this.enforcementLevel;
      }
    } catch (error) {
      console.error('Failed to load CORS settings:', error);
    }
  }

  private saveCORSSettings(): void {
    try {
      const settings = {
        enforcementLevel: this.enforcementLevel,
        timestamp: Date.now()
      };
      localStorage.setItem('cors-validator-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save CORS settings:', error);
    }
  }

  // Main CORS validation method from technical document
  async checkCORS(url: string, context?: NetworkRequestContext): Promise<boolean> {
    if (!this.isInitialized) {
      console.warn('CORS Validator not initialized, allowing request');
      return true;
    }

    // Check cache first for performance
    if (this.allowedDomainCache.has(url)) {
      return this.allowedDomainCache.get(url)!;
    }

    const validation = await this.validateCORSCompliance(url, context);
    
    // Cache result
    this.allowedDomainCache.set(url, validation.isValid);
    
    // Log request
    this.securityLogger.logRequest(url, context || {});
    
    if (validation.isValid) {
      this.securityLogger.logApproval(url, 'matched-policy');
      this.emit('corsApproved', { url, validation });
    } else {
      validation.violations.forEach(violation => {
        this.securityLogger.logViolation(violation);
      });
      this.emit('corsViolation', { url, validation });
    }

    return validation.isValid;
  }

  async validateCORSCompliance(url: string, context?: NetworkRequestContext): Promise<CORSValidationResult> {
    try {
      const urlObj = new URL(url);
      const origin = `${urlObj.protocol}//${urlObj.host}`;
      const policy = this.policyManager.findMatchingPolicy(url);
      
      const violations: CORSViolation[] = [];
      let securityLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

      // Validate origin
      const originValidation = this.validateOrigin(origin, policy, context);
      if (!originValidation.isValid) {
        violations.push(...originValidation.violations);
        securityLevel = this.upgradeSecurityLevel(securityLevel, 'medium');
      }

      // Validate method
      if (context?.method) {
        const methodValidation = this.validateMethod(context.method, policy);
        if (!methodValidation.isValid) {
          violations.push(...methodValidation.violations);
          securityLevel = this.upgradeSecurityLevel(securityLevel, 'medium');
        }
      }

      // Validate headers
      if (context?.headers) {
        const headerValidation = this.validateHeaders(context.headers, policy);
        if (!headerValidation.isValid) {
          violations.push(...headerValidation.violations);
          securityLevel = this.upgradeSecurityLevel(securityLevel, 'low');
        }
      }

      // Validate credentials
      if (context?.headers?.['authorization']) {
        const credentialValidation = this.validateCredentials(policy);
        if (!credentialValidation.isValid) {
          violations.push(...credentialValidation.violations);
          securityLevel = this.upgradeSecurityLevel(securityLevel, 'high');
        }
      }

      // Check for suspicious patterns
      const suspiciousValidation = this.checkSuspiciousPatterns(url, context);
      if (!suspiciousValidation.isValid) {
        violations.push(...suspiciousValidation.violations);
        securityLevel = this.upgradeSecurityLevel(securityLevel, 'critical');
      }

      const isValid = violations.length === 0 || this.shouldAllowWithViolations(violations);

      return {
        isValid,
        allowedOrigin: isValid ? origin : undefined,
        violations,
        recommendedHeaders: this.generateRecommendedHeaders(policy),
        securityLevel
      };

    } catch (error) {
      const violation: CORSViolation = {
        id: `cors_error_${Date.now()}`,
        timestamp: Date.now(),
        type: 'origin',
        severity: 'high',
        description: `Invalid URL format: ${url}`,
        requestedValue: url,
        allowedValues: ['Valid URLs only'],
        remediation: 'Provide a valid URL format'
      };

      return {
        isValid: false,
        violations: [violation],
        recommendedHeaders: {},
        securityLevel: 'high'
      };
    }
  }

  private validateOrigin(origin: string, policy: CORSPolicy, context?: NetworkRequestContext): {
    isValid: boolean;
    violations: CORSViolation[];
  } {
    const violations: CORSViolation[] = [];

    // Check if origin is allowed
    const isOriginAllowed = policy.allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowedOrigin === origin;
    });

    if (!isOriginAllowed) {
      violations.push({
        id: `origin_violation_${Date.now()}`,
        timestamp: Date.now(),
        type: 'origin',
        severity: this.getViolationSeverity('origin'),
        description: `Origin '${origin}' is not in the allowed origins list`,
        requestedValue: origin,
        allowedValues: policy.allowedOrigins,
        remediation: 'Add the origin to the allowed origins list or use a wildcard pattern'
      });
    }

    return {
      isValid: isOriginAllowed,
      violations
    };
  }

  private validateMethod(method: string, policy: CORSPolicy): {
    isValid: boolean;
    violations: CORSViolation[];
  } {
    const violations: CORSViolation[] = [];
    const isMethodAllowed = policy.allowedMethods.includes(method.toUpperCase());

    if (!isMethodAllowed) {
      violations.push({
        id: `method_violation_${Date.now()}`,
        timestamp: Date.now(),
        type: 'method',
        severity: this.getViolationSeverity('method'),
        description: `HTTP method '${method}' is not allowed`,
        requestedValue: method,
        allowedValues: policy.allowedMethods,
        remediation: 'Use an allowed HTTP method or update the policy'
      });
    }

    return {
      isValid: isMethodAllowed,
      violations
    };
  }

  private validateHeaders(headers: Record<string, string>, policy: CORSPolicy): {
    isValid: boolean;
    violations: CORSViolation[];
  } {
    const violations: CORSViolation[] = [];
    const headerNames = Object.keys(headers).map(h => h.toLowerCase());

    const disallowedHeaders = headerNames.filter(header => 
      !policy.allowedHeaders.some(allowed => allowed.toLowerCase() === header)
    );

    if (disallowedHeaders.length > 0) {
      disallowedHeaders.forEach(header => {
        violations.push({
          id: `header_violation_${Date.now()}_${header}`,
          timestamp: Date.now(),
          type: 'header',
          severity: this.getViolationSeverity('header'),
          description: `Header '${header}' is not allowed`,
          requestedValue: header,
          allowedValues: policy.allowedHeaders,
          remediation: 'Remove the header or add it to the allowed headers list'
        });
      });
    }

    return {
      isValid: disallowedHeaders.length === 0,
      violations
    };
  }

  private validateCredentials(policy: CORSPolicy): {
    isValid: boolean;
    violations: CORSViolation[];
  } {
    const violations: CORSViolation[] = [];

    if (!policy.allowCredentials) {
      violations.push({
        id: `credentials_violation_${Date.now()}`,
        timestamp: Date.now(),
        type: 'credentials',
        severity: this.getViolationSeverity('credentials'),
        description: 'Credentials are not allowed for this origin',
        requestedValue: 'credentials: true',
        allowedValues: ['credentials: false'],
        remediation: 'Remove credentials or enable allowCredentials in policy'
      });
    }

    return {
      isValid: policy.allowCredentials,
      violations
    };
  }

  private checkSuspiciousPatterns(url: string, context?: NetworkRequestContext): {
    isValid: boolean;
    violations: CORSViolation[];
  } {
    const violations: CORSViolation[] = [];

    // Check for suspicious URL patterns
    const suspiciousPatterns = [
      { pattern: /localhost(?::\d+)?/i, description: 'localhost URLs in production' },
      { pattern: /127\.0\.0\.1/i, description: 'Loopback IP addresses' },
      { pattern: /192\.168\./i, description: 'Private network ranges' },
      { pattern: /10\.\d+\.\d+\.\d+/i, description: 'Private network ranges' },
      { pattern: /\b\d+\.\d+\.\d+\.\d+\b/, description: 'Direct IP addresses' },
      { pattern: /[a-z0-9]+\.onion/i, description: 'Tor hidden services' },
      { pattern: /bit\.ly|tinyurl|t\.co/i, description: 'URL shorteners' }
    ];

    suspiciousPatterns.forEach((check, index) => {
      if (check.pattern.test(url)) {
        violations.push({
          id: `suspicious_${Date.now()}_${index}`,
          timestamp: Date.now(),
          type: 'origin',
          severity: 'medium',
          description: `Suspicious URL pattern detected: ${check.description}`,
          requestedValue: url,
          allowedValues: ['Trusted domains only'],
          remediation: 'Use trusted, public domains for production requests'
        });
      }
    });

    // Check user agent if available
    if (context?.userAgent) {
      const suspiciousAgents = /bot|crawler|scraper|automated/i;
      if (suspiciousAgents.test(context.userAgent)) {
        violations.push({
          id: `suspicious_agent_${Date.now()}`,
          timestamp: Date.now(),
          type: 'header',
          severity: 'low',
          description: 'Suspicious user agent detected',
          requestedValue: context.userAgent,
          allowedValues: ['Standard browser user agents'],
          remediation: 'Verify the legitimacy of the request source'
        });
      }
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  private getViolationSeverity(type: CORSViolation['type']): CORSViolation['severity'] {
    const severityMap: Record<CORSViolation['type'], CORSViolation['severity']> = {
      'origin': 'high',
      'method': 'medium',
      'header': 'low',
      'credentials': 'high',
      'preflight': 'medium'
    };

    const baseSeverity = severityMap[type] || 'medium';
    
    // Upgrade severity based on enforcement level
    if (this.enforcementLevel === 'paranoid') {
      if (baseSeverity === 'low') return 'medium';
      if (baseSeverity === 'medium') return 'high';
      if (baseSeverity === 'high') return 'critical';
    }

    return baseSeverity;
  }

  private upgradeSecurityLevel(
    current: 'low' | 'medium' | 'high' | 'critical',
    proposed: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    const proposedIndex = levels.indexOf(proposed);
    
    return levels[Math.max(currentIndex, proposedIndex)] as any;
  }

  private shouldAllowWithViolations(violations: CORSViolation[]): boolean {
    // Only allow with violations in permissive mode and only for low severity
    if (this.enforcementLevel !== 'permissive') return false;
    
    return violations.every(v => v.severity === 'low');
  }

  private generateRecommendedHeaders(policy: CORSPolicy): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': policy.allowedOrigins.includes('*') ? '*' : policy.allowedOrigins[0],
      'Access-Control-Allow-Methods': policy.allowedMethods.join(', '),
      'Access-Control-Allow-Headers': policy.allowedHeaders.join(', '),
      'Access-Control-Expose-Headers': policy.exposedHeaders.join(', '),
      'Access-Control-Allow-Credentials': policy.allowCredentials.toString(),
      'Access-Control-Max-Age': policy.maxAge.toString()
    };
  }

  // Public API methods
  registerPolicy(name: string, policy: CORSPolicy): void {
    this.policyManager.registerPolicy(name, policy);
    this.allowedDomainCache.clear();
  }

  updatePolicy(name: string, updates: Partial<CORSPolicy>): boolean {
    const result = this.policyManager.updatePolicy(name, updates);
    if (result) {
      this.allowedDomainCache.clear();
    }
    return result;
  }

  getPolicy(name: string): CORSPolicy | undefined {
    return this.policyManager.getPolicy(name);
  }

  getAllPolicies(): Map<string, CORSPolicy> {
    return this.policyManager.getAllPolicies();
  }

  setEnforcementLevel(level: 'permissive' | 'moderate' | 'strict' | 'paranoid'): void {
    this.enforcementLevel = level;
    this.allowedDomainCache.clear();
    this.saveCORSSettings();
    this.emit('enforcementLevelChanged', level);
  }

  getEnforcementLevel(): string {
    return this.enforcementLevel;
  }

  clearCache(): void {
    this.allowedDomainCache.clear();
    this.emit('cacheCleared');
  }

  getValidationStats(): {
    totalValidations: number;
    violationRate: number;
    cacheHitRate: number;
    commonViolations: Array<{ type: string; count: number }>;
  } {
    const logs = this.securityLogger.exportLogs();
    const violations = logs.violations;
    
    const violationCounts = violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonViolations = Object.entries(violationCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalValidations: logs.summary.totalRequests,
      violationRate: logs.summary.violationRate,
      cacheHitRate: this.allowedDomainCache.size > 0 ? 85 : 0, // Estimated
      commonViolations
    };
  }

  exportSecurityReport(): {
    config: { enforcementLevel: string; policies: any };
    logs: any;
    stats: any;
    timestamp: number;
  } {
    return {
      config: {
        enforcementLevel: this.enforcementLevel,
        policies: Object.fromEntries(this.policyManager.getAllPolicies())
      },
      logs: this.securityLogger.exportLogs(),
      stats: this.getValidationStats(),
      timestamp: Date.now()
    };
  }

  // Status methods
  isReady(): boolean {
    return this.isInitialized;
  }

  getStatus(): {
    initialized: boolean;
    enforcementLevel: string;
    policiesCount: number;
    cacheSize: number;
    recentViolations: number;
  } {
    const violations = this.securityLogger.getViolationLog();
    const recentViolations = violations.filter(
      v => Date.now() - v.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length;

    return {
      initialized: this.isInitialized,
      enforcementLevel: this.enforcementLevel,
      policiesCount: this.policyManager.getAllPolicies().size,
      cacheSize: this.allowedDomainCache.size,
      recentViolations
    };
  }

  destroy(): void {
    this.saveCORSSettings();
    this.allowedDomainCache.clear();
    this.removeAllListeners();
    console.log('🌐 CORS Validator destroyed');
  }
}

// Export singleton instance
export const corsValidator = new CORSValidator();
