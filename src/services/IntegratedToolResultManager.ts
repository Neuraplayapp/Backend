// Integrated Tool Result Manager - UNIFIED SYSTEM
// Following principle: "ALWAYS INTEGRATE SYSTEMS unless finding CLEVER solutions for LOGIC management"
// Combines debugging, validation, recovery, display preparation in ONE cohesive system

export enum DebugLevel {
  ERROR = 0, WARN = 1, INFO = 2, DEBUG = 3, TRACE = 4
}

export enum ProcessingStage {
  RECEIVED = 'received', PARSING = 'parsing', VALIDATION = 'validation',
  PROCESSING = 'processing', DISPLAY_PREP = 'display_prep', 
  COMPLETION = 'completion', ERROR = 'error'
}

export interface ProcessedToolResult {
  id: string;
  success: boolean;
  message: string;
  data: any;
  displayComponents: DisplayComponent[];
  aiContextSummary: string;
  debugInfo: {
    processingTime: number;
    stage: ProcessingStage;
    errors: string[];
    warnings: string[];
    validationResults: ValidationResult[];
  };
}

export interface DisplayComponent {
  type: 'image' | 'text' | 'success' | 'error' | 'chart' | 'table';
  content: any;
  metadata?: any;
  priority: number;
  validationPassed: boolean;
}

export interface ValidationResult {
  field: string;
  valid: boolean;
  message: string;
}

class IntegratedToolResultManager {
  private debugLevel: DebugLevel = DebugLevel.DEBUG;
  private processingStats = { total: 0, success: 0, errors: 0, avgTime: 0 };

  /**
   * MAIN PROCESSING METHOD - Handles everything in one integrated flow
   */
  processToolResult(toolResult: any): ProcessedToolResult {
    const startTime = performance.now();
    const resultId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const debugInfo = {
      processingTime: 0,
      stage: ProcessingStage.RECEIVED,
      errors: [] as string[],
      warnings: [] as string[],
      validationResults: [] as ValidationResult[]
    };

    this.log(DebugLevel.INFO, ProcessingStage.RECEIVED, 'Processing tool result', {
      toolName: toolResult?.name,
      hasContent: !!toolResult?.content,
      contentLength: toolResult?.content?.length || 0
    });

    try {
      // STAGE 1: VALIDATION (integrated)
      debugInfo.stage = ProcessingStage.VALIDATION;
      debugInfo.validationResults = this.validateInput(toolResult);
      
      if (debugInfo.validationResults.some(v => !v.valid)) {
        throw new Error(`Validation failed: ${debugInfo.validationResults.filter(v => !v.valid).map(v => v.message).join(', ')}`);
      }

      // STAGE 2: PARSING (with integrated recovery)
      debugInfo.stage = ProcessingStage.PARSING;
      const parsedData = this.parseWithRecovery(toolResult.content, debugInfo);

      // STAGE 3: PROCESSING (integrated data preparation)
      debugInfo.stage = ProcessingStage.PROCESSING;
      const processedResult: ProcessedToolResult = {
        id: resultId,
        success: parsedData.success || false,
        message: parsedData.message || 'Tool executed',
        data: parsedData.data || {},
        displayComponents: this.createDisplayComponents(parsedData, toolResult.name),
        aiContextSummary: this.createAIContextSummary(parsedData, toolResult.name),
        debugInfo
      };

      // STAGE 4: COMPLETION
      debugInfo.stage = ProcessingStage.COMPLETION;
      debugInfo.processingTime = performance.now() - startTime;
      
      this.updateStats(true, debugInfo.processingTime);
      
      this.log(DebugLevel.INFO, ProcessingStage.COMPLETION, 'Tool result processed successfully', {
        id: resultId,
        processingTime: debugInfo.processingTime,
        hasImage: !!parsedData.data?.image_url,
        displayComponents: processedResult.displayComponents.length
      });

      return processedResult;

    } catch (error) {
      debugInfo.stage = ProcessingStage.ERROR;
      debugInfo.processingTime = performance.now() - startTime;
      debugInfo.errors.push(error.message);
      
      this.log(DebugLevel.ERROR, ProcessingStage.ERROR, 'Tool result processing failed', {
        error: error.message,
        processingTime: debugInfo.processingTime
      });

      this.updateStats(false, debugInfo.processingTime);
      
      return this.createErrorResult(resultId, error.message, debugInfo);
    }
  }

  /**
   * INTEGRATED VALIDATION - All validation logic in one place
   */
  private validateInput(toolResult: any): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Basic existence check
    results.push({
      field: 'toolResult',
      valid: !!toolResult,
      message: toolResult ? 'Tool result exists' : 'Tool result is null/undefined'
    });

    if (!toolResult) return results;

    // Tool name validation
    results.push({
      field: 'name',
      valid: typeof toolResult.name === 'string' && toolResult.name.length > 0,
      message: typeof toolResult.name === 'string' ? 'Tool name valid' : 'Tool name missing or invalid'
    });

    // Content validation
    const hasContent = toolResult.content && typeof toolResult.content === 'string' && toolResult.content.trim().length > 0;
    results.push({
      field: 'content',
      valid: hasContent,
      message: hasContent ? 'Content valid' : 'Content missing, empty, or invalid'
    });

    this.log(DebugLevel.DEBUG, ProcessingStage.VALIDATION, 'Validation completed', {
      totalChecks: results.length,
      passed: results.filter(r => r.valid).length,
      failed: results.filter(r => !r.valid).length
    });

    return results;
  }

  /**
   * INTEGRATED PARSING WITH RECOVERY - All parsing strategies in one method
   */
  private parseWithRecovery(content: string, debugInfo: any): any {
    this.log(DebugLevel.TRACE, ProcessingStage.PARSING, 'Starting content parsing', {
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 50) + '...'
    });

    // Strategy 1: Standard JSON parsing
    try {
      const parsed = JSON.parse(content);
      this.log(DebugLevel.DEBUG, ProcessingStage.PARSING, 'Standard JSON parsing successful');
      return parsed;
    } catch (jsonError) {
      this.log(DebugLevel.WARN, ProcessingStage.PARSING, 'JSON parsing failed, attempting recovery', {
        error: jsonError.message
      });
      debugInfo.warnings.push(`JSON parsing failed: ${jsonError.message}`);
    }

    // Strategy 2: Image result recovery
    try {
      const imageRecovered = this.recoverImageResult(content);
      this.log(DebugLevel.INFO, ProcessingStage.PARSING, 'Image recovery successful');
      return imageRecovered;
    } catch (imageError) {
      this.log(DebugLevel.DEBUG, ProcessingStage.PARSING, 'Image recovery failed', { error: imageError.message });
    }

    // Strategy 3: Basic result recovery
    try {
      const basicRecovered = this.recoverBasicResult(content);
      this.log(DebugLevel.INFO, ProcessingStage.PARSING, 'Basic recovery successful');
      return basicRecovered;
    } catch (basicError) {
      this.log(DebugLevel.DEBUG, ProcessingStage.PARSING, 'Basic recovery failed', { error: basicError.message });
    }

    // Strategy 4: Content cleaning and retry
    try {
      const cleaned = this.cleanAndParseContent(content);
      this.log(DebugLevel.INFO, ProcessingStage.PARSING, 'Content cleaning recovery successful');
      return cleaned;
    } catch (cleanError) {
      this.log(DebugLevel.DEBUG, ProcessingStage.PARSING, 'Content cleaning failed', { error: cleanError.message });
    }

    // Final fallback
    this.log(DebugLevel.WARN, ProcessingStage.PARSING, 'All recovery strategies failed, using fallback');
    return {
      success: false,
      message: 'Tool execution completed but result format was corrupted',
      data: { raw_content: content.substring(0, 200), recovery_attempted: true }
    };
  }

  /**
   * INTEGRATED RECOVERY STRATEGIES - All in one place
   */
  private recoverImageResult(content: string): any {
    const imageUrlMatch = content.match(/"image_url":\s*"([^"]+)"/);
    const messageMatch = content.match(/"message":\s*"([^"]+)"/);
    const successMatch = content.match(/"success":\s*(true|false)/);

    if (imageUrlMatch) {
      return {
        success: successMatch ? successMatch[1] === 'true' : true,
        message: messageMatch ? messageMatch[1] : 'Image generated successfully',
        data: { image_url: imageUrlMatch[1] }
      };
    }

    // Try base64 detection
    const base64Match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
    if (base64Match) {
      return {
        success: true,
        message: 'Image generated (recovered from base64)',
        data: { image_url: base64Match[0] }
      };
    }

    throw new Error('No image data found');
  }

  private recoverBasicResult(content: string): any {
    const successMatch = content.match(/"success":\s*(true|false)/);
    const messageMatch = content.match(/"message":\s*"([^"]+)"/);

    return {
      success: successMatch ? successMatch[1] === 'true' : false,
      message: messageMatch ? messageMatch[1] : 'Tool execution completed',
      data: {}
    };
  }

  private cleanAndParseContent(content: string): any {
    let cleaned = content
      .replace(/,\s*}/g, '}')      // Remove trailing commas
      .replace(/,\s*]/g, ']')      // Remove trailing commas in arrays
      .replace(/\n/g, ' ')         // Replace newlines
      .replace(/\s+/g, ' ')        // Collapse spaces
      .trim();

    // Fix unclosed braces
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) {
      cleaned += '}';
    }

    return JSON.parse(cleaned);
  }

  /**
   * INTEGRATED DISPLAY COMPONENT CREATION
   */
  private createDisplayComponents(resultData: any, toolName: string): DisplayComponent[] {
    const components: DisplayComponent[] = [];

    if (!resultData.success) {
      components.push({
        type: 'error',
        content: resultData.message || 'Tool execution failed',
        priority: 1,
        validationPassed: true
      });
      return components;
    }

    // Success message
    components.push({
      type: 'success',
      content: resultData.message || 'Tool executed successfully',
      metadata: { toolName },
      priority: 3,
      validationPassed: true
    });

    // Image component (highest priority)
    if (resultData.data?.image_url) {
      const imageValid = this.validateImageUrl(resultData.data.image_url);
      components.push({
        type: 'image',
        content: resultData.data.image_url,
        metadata: {
          caption: resultData.data.caption || resultData.message,
          style: resultData.data.style || 'default',
          prompt: resultData.data.prompt
        },
        priority: 1,
        validationPassed: imageValid
      });
    }

    // Additional component types can be added here (charts, tables, etc.)

    return components.sort((a, b) => a.priority - b.priority);
  }

  /**
   * INTEGRATED AI CONTEXT SUMMARY CREATION
   */
  private createAIContextSummary(resultData: any, toolName: string): string {
    const summary = {
      success: resultData.success,
      tool: toolName,
      message: resultData.message || 'Tool executed'
    };

    if (resultData.data) {
      summary['metadata'] = {
        hasImage: !!resultData.data.image_url,
        hasData: !!resultData.data,
        contentType: this.identifyContentType(resultData.data)
      };
    }

    return JSON.stringify(summary);
  }

  /**
   * INTEGRATED UTILITY METHODS
   */
  private validateImageUrl(imageUrl: string): boolean {
    if (!imageUrl || typeof imageUrl !== 'string') return false;
    
    // Data URL validation
    if (imageUrl.startsWith('data:image/')) {
      return /^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/.test(imageUrl);
    }
    
    // HTTP URL validation
    if (imageUrl.startsWith('http')) {
      try {
        new URL(imageUrl);
        return true;
      } catch {
        return false;
      }
    }
    
    return false;
  }

  private identifyContentType(data: any): string {
    if (!data || typeof data !== 'object') return 'unknown';
    if (data.image_url) return 'image';
    if (data.chart_data) return 'chart';
    if (data.table_data) return 'table';
    return 'data';
  }

  private createErrorResult(id: string, errorMessage: string, debugInfo: any): ProcessedToolResult {
    return {
      id,
      success: false,
      message: 'Tool result processing failed',
      data: { error: errorMessage },
      displayComponents: [{
        type: 'error',
        content: 'There was an issue processing the tool result',
        metadata: { technicalError: errorMessage },
        priority: 1,
        validationPassed: true
      }],
      aiContextSummary: JSON.stringify({ success: false, error: errorMessage }),
      debugInfo
    };
  }

  private updateStats(success: boolean, processingTime: number): void {
    this.processingStats.total++;
    if (success) this.processingStats.success++;
    else this.processingStats.errors++;
    
    this.processingStats.avgTime = (this.processingStats.avgTime * (this.processingStats.total - 1) + processingTime) / this.processingStats.total;
  }

  private log(level: DebugLevel, stage: ProcessingStage, message: string, data?: any): void {
    if (level > this.debugLevel) return;

    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
    const prefix = `🔧 ToolResultManager [${levelNames[level]}] [${stage.toUpperCase()}]`;

    switch (level) {
      case DebugLevel.ERROR:
        console.error(`${prefix} ${message}`, data || '');
        break;
      case DebugLevel.WARN:
        console.warn(`${prefix} ${message}`, data || '');
        break;
      default:
        console.log(`${prefix} ${message}`, data || '');
        break;
    }
  }

  /**
   * PUBLIC API METHODS
   */
  getProcessingStats() {
    return {
      ...this.processingStats,
      successRate: this.processingStats.total > 0 ? this.processingStats.success / this.processingStats.total : 0
    };
  }

  setDebugLevel(level: DebugLevel): void {
    this.debugLevel = level;
    this.log(DebugLevel.INFO, ProcessingStage.RECEIVED, 'Debug level changed', { newLevel: level });
  }
}

// Export singleton instance
export const integratedToolResultManager = new IntegratedToolResultManager();
