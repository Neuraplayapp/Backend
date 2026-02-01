// Code Generator Service - Creates code through NPU with PyodideRuntime integration
// Integrates with NeuraPlayAssistant following NeuraPlay architecture patterns

import { serviceContainer } from './ServiceContainer';
import { pyodideRuntime } from './PyodideRuntime'; // For Python execution

export interface CodeGenerationRequest {
  language: 'python' | 'javascript' | 'html' | 'css' | 'sql' | 'typescript' | 'react';
  task: string;
  complexity: 'simple' | 'intermediate' | 'advanced';
  includeComments: boolean;
  includeTests: boolean;
  framework?: string; // React, Vue, Express, etc.
  requirements?: string[]; // Specific requirements
  executeImmediately?: boolean; // For Python - execute after generation
}

export interface CodeGenerationResult {
  success: boolean;
  code: string;
  language: string;
  title: string;
  description: string;
  executionResult?: {
    success: boolean;
    output: string;
    error?: string;
    executionTime: number;
  };
  metadata: {
    complexity: string;
    linesOfCode: number;
    hasComments: boolean;
    hasTests: boolean;
    generatedAt: number;
    framework?: string;
  };
  exportFormats: string[];
  error?: string;
}

class CodeGenerator {
  private static instance: CodeGenerator;

  static getInstance(): CodeGenerator {
    if (!CodeGenerator.instance) {
      CodeGenerator.instance = new CodeGenerator();
    }
    return CodeGenerator.instance;
  }

  /**
   * Generate code using NPU system
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    try {
      console.log('💻 CodeGenerator: Starting generation', request.language, request.task);

      // Build structured prompt for code generation
      const structuredPrompt = this.buildCodePrompt(request);

          // Use NPU through AIRouter (same pattern as NeuraPlayAssistant)
    const aiRouter = serviceContainer.get('aiRouter') as any;
    const response = await aiRouter.processRequest({
        message: structuredPrompt,
        sessionId: `code-gen-${Date.now()}`,
        userId: 'system',
        context: {
          mode: 'code-generation',
          language: request.language,
          requirements: request
        },
        mode: 'chat',
        constraints: {
          maxTokens: this.getTokensForComplexity(request.complexity),
          temperature: 0.3, // Lower temperature for more consistent code
          timeoutMs: 120000 // 2 minutes
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Code generation failed');
      }

      // Extract and validate generated code
      const processedCode = this.processGeneratedCode(response.response, request);
      
      let executionResult;
      
      // Execute Python code immediately if requested
      if (request.language === 'python' && request.executeImmediately) {
        executionResult = await this.executePythonCode(processedCode.code);
      }

      return {
        success: true,
        code: processedCode.code,
        language: request.language,
        title: processedCode.title,
        description: processedCode.description,
        executionResult,
        metadata: {
          complexity: request.complexity,
          linesOfCode: this.countLines(processedCode.code),
          hasComments: this.hasComments(processedCode.code),
          hasTests: this.hasTests(processedCode.code),
          generatedAt: Date.now(),
          framework: request.framework
        },
        exportFormats: this.getExportFormats(request.language)
      };

    } catch (error) {
      console.error('❌ CodeGenerator: Generation failed', error);
      return {
        success: false,
        code: '',
        language: request.language,
        title: 'Generation Failed',
        description: 'Code generation encountered an error',
        metadata: {
          complexity: request.complexity,
          linesOfCode: 0,
          hasComments: false,
          hasTests: false,
          generatedAt: Date.now(),
          framework: request.framework
        },
        exportFormats: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Build structured prompt for code generation
   */
  private buildCodePrompt(request: CodeGenerationRequest): string {
    const { language, task, complexity, includeComments, includeTests, framework, requirements } = request;

    let structuredPrompt = `Generate ${complexity} ${language} code for the following task:

TASK: ${task}

REQUIREMENTS:
- Language: ${language.toUpperCase()}
- Complexity Level: ${complexity}
- Include Comments: ${includeComments ? 'Yes' : 'No'}
- Include Tests: ${includeTests ? 'Yes' : 'No'}`;

    if (framework) {
      structuredPrompt += `\n- Framework: ${framework}`;
    }

    if (requirements && requirements.length > 0) {
      structuredPrompt += `\n- Additional Requirements:\n${requirements.map(req => `  • ${req}`).join('\n')}`;
    }

    structuredPrompt += `\n\nCODE QUALITY STANDARDS:
- Write clean, readable code
- Follow ${language} best practices and conventions
- Use meaningful variable and function names
- Include proper error handling where appropriate`;

    if (includeComments) {
      structuredPrompt += `\n- Include detailed comments explaining the code logic`;
    }

    if (includeTests) {
      structuredPrompt += `\n- Include unit tests to verify functionality`;
    }

    if (language === 'python') {
      structuredPrompt += `\n- Follow PEP 8 style guidelines
- Use type hints where appropriate
- Include docstrings for functions and classes`;
    } else if (language === 'javascript' || language === 'typescript') {
      structuredPrompt += `\n- Use modern ES6+ syntax
- Follow JSDoc conventions for documentation
- Use const/let appropriately`;
    } else if (language === 'react') {
      structuredPrompt += `\n- Use functional components with hooks
- Follow React best practices
- Include proper prop types or TypeScript interfaces`;
    }

    structuredPrompt += `\n\nPlease provide the complete, functional ${language} code:`;

    return structuredPrompt;
  }

  /**
   * Process generated code to extract and validate
   */
  private processGeneratedCode(response: string, request: CodeGenerationRequest) {
    // Extract code from markdown code blocks
    const codeBlockMatch = response.match(/```(?:python|javascript|html|css|sql|typescript|jsx|tsx)?\n?([\s\S]*?)\n?```/);
    let code = codeBlockMatch ? codeBlockMatch[1] : response;

    // Clean up code
    code = code.trim();

    // Generate title and description
    const title = this.generateCodeTitle(request.task, request.language);
    const description = this.generateCodeDescription(request.task, request.language, request.complexity);

    return {
      code,
      title,
      description
    };
  }

  /**
   * Execute Python code using PyodideRuntime
   */
  private async executePythonCode(code: string) {
    try {
      console.log('🐍 CodeGenerator: Executing Python code');
      
      const executionStart = Date.now();
      
      // Use PyodideRuntime to execute code if available
      if (typeof (pyodideRuntime as any).executeCode !== 'function') {
        console.warn('⚠️ Pyodide runtime not ready – skipping execution');
        return {
          success: false,
          output: '',
          error: 'Pyodide runtime not available',
          executionTime: 0
        };
      }

      const result = await (pyodideRuntime as any).executeCode({
        id: `code-exec-${Date.now()}`,
        code,
        environment: 'canvas',
        packages: [], // Let PyodideRuntime handle package detection
        timeout: 30000, // 30 seconds
        memoryLimit: 100, // 100MB
        networkAccess: false,
        metadata: {
          timestamp: Date.now(),
          source: 'code-generator',
          language: 'python',
          version: '3.11'
        }
      });

      const executionTime = Date.now() - executionStart;

      return {
        success: result.success,
        output: result.stdout.join('\n') || result.output,
        error: result.error,
        executionTime
      };

    } catch (error) {
      console.error('❌ CodeGenerator: Python execution failed', error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Execution failed',
        executionTime: 0
      };
    }
  }

  /**
   * Validate code syntax (placeholder for future implementation)
   */
  private async validateCode(code: string, language: string): Promise<{ isValid: boolean; errors: string[] }> {
    // TODO: Implement syntax validation for different languages
    console.log(`🔍 Code validation for ${language} not yet implemented`);
    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Generate appropriate title for code
   */
  private generateCodeTitle(task: string, language: string): string {
    const shortTask = task.length > 40 ? task.substring(0, 40) + '...' : task;
    const languageCapitalized = language.charAt(0).toUpperCase() + language.slice(1);
    return `${languageCapitalized}: ${shortTask}`;
  }

  /**
   * Generate description for code
   */
  private generateCodeDescription(task: string, language: string, complexity: string): string {
    return `${complexity.charAt(0).toUpperCase() + complexity.slice(1)} ${language} implementation for: ${task}`;
  }

  /**
   * Get token count based on complexity
   */
  private getTokensForComplexity(complexity: string): number {
    switch (complexity) {
      case 'simple': return 800;      // ~300-500 lines
      case 'intermediate': return 1500; // ~500-1000 lines
      case 'advanced': return 3000;   // ~1000+ lines
      default: return 1500;
    }
  }

  /**
   * Count lines of code
   */
  private countLines(code: string): number {
    return code.split('\n').filter(line => line.trim()).length;
  }

  /**
   * Check if code has comments
   */
  private hasComments(code: string): boolean {
    return /\/\/|\/\*|\*\/|#|<!--|-->/.test(code);
  }

  /**
   * Check if code has tests
   */
  private hasTests(code: string): boolean {
    return /test|Test|describe|it\(|assert|expect/.test(code);
  }

  /**
   * Get export formats for language
   */
  private getExportFormats(language: string): string[] {
    const baseFormats = ['TXT'];
    
    switch (language) {
      case 'python': return [...baseFormats, 'PY'];
      case 'javascript': return [...baseFormats, 'JS'];
      case 'typescript': return [...baseFormats, 'TS'];
      case 'react': return [...baseFormats, 'JSX', 'TSX'];
      case 'html': return [...baseFormats, 'HTML'];
      case 'css': return [...baseFormats, 'CSS'];
      case 'sql': return [...baseFormats, 'SQL'];
      default: return baseFormats;
    }
  }

  /**
   * Format code with proper indentation and syntax highlighting
   */
  private formatCode(code: string, language: string): string {
    // TODO: Implement code formatting using Prettier or similar
    console.log(`✨ Code formatting for ${language} not yet implemented`);
    return code;
  }

  /**
   * Export code as file blob
   */
  async exportCode(code: string, language: string, filename: string): Promise<Blob> {
    const mimeTypes: Record<string, string> = {
      'python': 'text/x-python',
      'javascript': 'text/javascript',
      'typescript': 'text/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'sql': 'text/x-sql'
    };

    const mimeType = mimeTypes[language] || 'text/plain';
    return new Blob([code], { type: mimeType });
  }
}

// Export singleton instance
export const codeGenerator = CodeGenerator.getInstance();
export default CodeGenerator;
