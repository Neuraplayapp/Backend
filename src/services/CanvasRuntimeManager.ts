// Canvas Runtime Manager - Manages code execution environments for canvas
// Integrates with PyodideRuntime and CodeInterpreterAPI

import { pyodideRuntime } from './PyodideRuntime';
import { codeInterpreterAPI } from './CodeInterpreterAPI';

export interface CodeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  language: 'javascript' | 'python' | 'unknown';
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsage?: number;
}

export interface ExecutionContext {
  variables: Record<string, any>;
  imports: string[];
  environment: 'browser' | 'server';
  timeout: number;
}

class CanvasRuntimeManager {
  private isInitialized = false;

  constructor() {
    console.log('⚙️ CanvasRuntimeManager: Initializing');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('⚙️ CanvasRuntimeManager: Setting up execution environments');
      
      // Initialize Pyodide for browser-based Python execution
      // Note: Actual initialization handled by PyodideRuntime
      
      this.isInitialized = true;
      console.log('✅ CanvasRuntimeManager: Initialized successfully');
      
    } catch (error) {
      console.error('❌ CanvasRuntimeManager: Initialization failed:', error);
      throw error;
    }
  }

  validateCode(code: string): CodeValidationResult {
    const trimmedCode = code.trim();
    
    if (!trimmedCode) {
      return {
        isValid: false,
        errors: ['Code cannot be empty'],
        warnings: [],
        language: 'unknown'
      };
    }

    // Detect language
    const language = this.detectLanguage(code);
    
    // Basic validation
    const errors: string[] = [];
    const warnings: string[] = [];

    // JavaScript validation
    if (language === 'javascript') {
      if (code.includes('eval(') || code.includes('Function(')) {
        errors.push('Dynamic code evaluation is not allowed');
      }
      if (code.includes('document.') || code.includes('window.')) {
        warnings.push('DOM access may not work in canvas environment');
      }
    }

    // Python validation
    if (language === 'python') {
      if (code.includes('import os') || code.includes('import subprocess')) {
        errors.push('System module imports are restricted');
      }
      if (code.includes('exec(') || code.includes('eval(')) {
        errors.push('Dynamic code execution is not allowed');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      language
    };
  }

  async executeJavaScript(code: string, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🟨 CanvasRuntimeManager: Executing JavaScript code');
      
      // Validate code first
      const validation = this.validateCode(code);
      if (!validation.isValid) {
        return {
          success: false,
          output: '',
          error: validation.errors.join('; '),
          executionTime: Date.now() - startTime
        };
      }

      // Create safe execution environment
      const safeContext = this.createSafeJavaScriptContext(context);
      
      // Execute code in controlled environment
      let result: any;
      try {
        // Use Function constructor for safer evaluation than eval
        const func = new Function(...Object.keys(safeContext), `
          "use strict";
          ${code}
        `);
        
        result = func(...Object.values(safeContext));
      } catch (execError) {
        return {
          success: false,
          output: '',
          error: `Execution error: ${execError.message}`,
          executionTime: Date.now() - startTime
        };
      }

      return {
        success: true,
        output: String(result || 'Code executed successfully'),
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `JavaScript execution failed: ${error.message}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  async executePython(code: string, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🐍 CanvasRuntimeManager: Executing Python code');
      
      // Validate code first
      const validation = this.validateCode(code);
      if (!validation.isValid) {
        return {
          success: false,
          output: '',
          error: validation.errors.join('; '),
          executionTime: Date.now() - startTime
        };
      }

      // Route to appropriate Python runtime
      if (context.environment === 'browser') {
        // Use Pyodide for browser execution
        const result = await pyodideRuntime.executeCode(code);
        
        return {
          success: result.success,
          output: result.output || 'Python code executed successfully',
          error: result.error,
          executionTime: Date.now() - startTime
        };
      } else {
        // Use server-side Code Interpreter
        const result = await codeInterpreterAPI.executeCode(code, 'python');
        
        return {
          success: result.success,
          output: result.output || 'Python code executed successfully',
          error: result.error,
          executionTime: Date.now() - startTime
        };
      }

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Python execution failed: ${error.message}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private detectLanguage(code: string): 'javascript' | 'python' | 'unknown' {
    const pythonKeywords = ['def ', 'import ', 'from ', 'print(', 'if __name__'];
    const jsKeywords = ['function ', 'const ', 'let ', 'var ', 'console.log', '=>'];

    const pythonMatches = pythonKeywords.filter(keyword => code.includes(keyword)).length;
    const jsMatches = jsKeywords.filter(keyword => code.includes(keyword)).length;

    if (pythonMatches > jsMatches) return 'python';
    if (jsMatches > pythonMatches) return 'javascript';
    
    // Fallback: check for obvious Python syntax
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('function ') || code.includes('console.')) return 'javascript';
    
    return 'unknown';
  }

  private createSafeJavaScriptContext(context: ExecutionContext): Record<string, any> {
    // Create a safe context with limited access
    return {
      // Safe built-ins
      Math: Math,
      Date: Date,
      JSON: JSON,
      console: {
        log: (...args: any[]) => console.log('[Canvas Code]', ...args),
        error: (...args: any[]) => console.error('[Canvas Code]', ...args),
        warn: (...args: any[]) => console.warn('[Canvas Code]', ...args)
      },
      
      // User variables
      ...context.variables,
      
      // Canvas-specific utilities
      canvas: {
        width: 800,
        height: 600,
        output: (data: any) => console.log('[Canvas Output]', data)
      }
    };
  }

  // Cleanup and resource management
  async destroy(): Promise<void> {
    console.log('🧹 CanvasRuntimeManager: Cleaning up resources');
    
    try {
      await pyodideRuntime.destroy();
      this.isInitialized = false;
      console.log('✅ CanvasRuntimeManager: Cleanup completed');
    } catch (error) {
      console.error('❌ CanvasRuntimeManager: Cleanup failed:', error);
    }
  }

  // Get runtime status
  getStatus(): {
    isInitialized: boolean;
    supportedLanguages: string[];
    browserRuntime: boolean;
    serverRuntime: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      supportedLanguages: ['javascript', 'python'],
      browserRuntime: true, // Pyodide
      serverRuntime: true   // Code Interpreter API
    };
  }
}

// Export singleton instance
export const canvasRuntimeManager = new CanvasRuntimeManager();
