// Route Verification System - Startup checks to prevent conflicts
const express = require('express');

class RouteVerificationSystem {
  constructor() {
    this.registeredRoutes = new Map();
    this.conflicts = [];
    this.missingRoutes = [];
    this.expectedRoutes = [
      // Core routes that SHOULD exist
      { method: 'POST', path: '/api/unified-route', source: 'unified-route.cjs' },
      { method: 'POST', path: '/api/auth/login', source: 'auth.cjs' },
      { method: 'POST', path: '/api/auth/register', source: 'auth.cjs' },
      { method: 'POST', path: '/api/tools/execute', source: 'tools.cjs' },
      { method: 'POST', path: '/api/canvas/sessions', source: 'canvas-api.cjs' },
      { method: 'POST', path: '/api/vision/analyze', source: 'vision-route.cjs' },
      { method: 'POST', path: '/api/vision/process-documents', source: 'vision-route.cjs' },
      { method: 'GET', path: '/api/vision/health', source: 'vision-route.cjs' },
      { method: 'GET', path: '/api/vision/limits', source: 'vision-route.cjs' },
      { method: 'POST', path: '/api/assemblyai-transcribe', source: 'api.cjs' },
      { method: 'POST', path: '/api/elevenlabs-tts', source: 'api.cjs' },
      { method: 'GET', path: '/api/health', source: 'api.cjs' },
      { method: 'POST', path: '/api/database', source: 'server.cjs (direct)' },
      { method: 'POST', path: '/api/contact', source: 'api.cjs' },
      { method: 'POST', path: '/api/users/sync', source: 'api.cjs' },
      { method: 'POST', path: '/api/memory', source: 'api.cjs' }
    ];
  }

  // Scan Express app and extract all registered routes
  extractRoutes(app) {
    console.log('🔍 RouteVerifier: Scanning registered routes...');
    
    // Clear previous results
    this.registeredRoutes.clear();
    this.conflicts = [];
    this.missingRoutes = [];

    // Extract routes from Express router layers
    const routes = [];
    
    // Get routes from main app
    if (app._router && app._router.stack) {
      this._extractFromStack(app._router.stack, '', routes);
    }

    // Store routes in our map
    routes.forEach(route => {
      const key = `${route.method} ${route.path}`;
      if (this.registeredRoutes.has(key)) {
        this.conflicts.push({
          route: key,
          sources: [this.registeredRoutes.get(key).source, route.source]
        });
      }
      this.registeredRoutes.set(key, route);
    });

    return routes;
  }

  _extractFromStack(stack, basePath = '', routes = []) {
    stack.forEach(layer => {
      if (layer.route) {
        // Direct route
        let path = basePath + layer.route.path;
        if (path !== '/' && path.endsWith('/')) {
          path = path.slice(0, -1);
        }
        Object.keys(layer.route.methods).forEach(method => {
          if (method !== '_all') {
            routes.push({
              method: method.toUpperCase(),
              path: path,
              source: 'direct'
            });
          }
        });
      } else if (layer.name === 'router' && layer.handle.stack) {
        // Sub-router
        const mountPath = basePath + (layer.regexp.source
          // strip leading ^ and escaped slash
          .replace(/^\^?\\\/?/, '/')
          // strip look-ahead & trailing tokens
          .replace(/\(\?=.+$/, '')
          .replace(/\$.*$/, '')
          // unescape slashes
          .replace(/\\\//g, '/')
          // remove optional trailing slash regex
          .replace(/\/?\?$/, '')
          // collapse duplicate slashes
          .replace(/\/+/g, '/')
        ).replace(/\/$/, '');
        
        this._extractFromStack(layer.handle.stack, mountPath, routes);
      }
    });
  }

  // Verify expected routes exist
  verifyExpectedRoutes() {
    console.log('🔍 RouteVerifier: Checking expected routes...');
    
    this.missingRoutes = this.expectedRoutes.filter(expected => {
      const key = `${expected.method} ${expected.path}`;
      const normalizedKey = key.replace(/\/$/, '');
      return !this.registeredRoutes.has(normalizedKey);
    });

    return this.missingRoutes.length === 0;
  }

  // Generate verification report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalRoutes: this.registeredRoutes.size,
      conflicts: this.conflicts,
      missingRoutes: this.missingRoutes,
      registeredRoutes: Array.from(this.registeredRoutes.entries()).map(([key, route]) => ({
        endpoint: key,
        source: route.source
      }))
    };

    return report;
  }

  // Print verification summary
  printSummary() {
    console.log('📋 Route Verification Summary:');
    console.log(`   ✅ Total Routes: ${this.registeredRoutes.size}`);
    
    // DEBUG: Show what routes were actually found
    console.log('🔍 DEBUG: Actually registered routes:');
    this.registeredRoutes.forEach((route, key) => {
      console.log(`      ✅ ${key}`);
    });
    
    if (this.conflicts.length > 0) {
      console.log(`   ⚠️  Conflicts: ${this.conflicts.length}`);
      this.conflicts.forEach(conflict => {
        console.log(`      🔥 ${conflict.route} - Sources: ${conflict.sources.join(', ')}`);
      });
    }

    if (this.missingRoutes.length > 0) {
      console.log(`   ❌ Missing Routes: ${this.missingRoutes.length}`);
      this.missingRoutes.forEach(missing => {
        console.log(`      📍 ${missing.method} ${missing.path} (expected from ${missing.source})`);
      });
    }

    if (this.conflicts.length === 0 && this.missingRoutes.length === 0) {
      console.log('   🎉 All routes verified successfully!');
    }

    // Always show the critical unified route status
    const unifiedRouteKey = 'POST /api/unified-route';
    if (this.registeredRoutes.has(unifiedRouteKey)) {
      console.log('   ✅ Critical: Unified route is properly registered');
    } else {
      console.log('   ❌ Critical: Unified route is MISSING - this will cause 404 errors');
    }
  }

  // Main verification function
  verifyRoutes(app) {
    this.extractRoutes(app);
    this.verifyExpectedRoutes();
    this.printSummary();
    
    return {
      success: this.conflicts.length === 0 && this.missingRoutes.length === 0,
      report: this.generateReport()
    };
  }
}

// Export verification system
module.exports = {
  RouteVerificationSystem,
  
  // Helper function for server.cjs
  verifyServerRoutes: (app) => {
    const verifier = new RouteVerificationSystem();
    return verifier.verifyRoutes(app);
  }
};
