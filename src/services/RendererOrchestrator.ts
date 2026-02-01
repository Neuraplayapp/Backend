/**
 * RENDERER ORCHESTRATOR - State-of-the-Art Content Rendering Pipeline
 * 
 * Intelligent content rendering system that automatically selects optimal
 * rendering strategies based on:
 * - Context (web, mobile, card, chat, fullscreen)
 * - Content type (text, rich media, structured data)
 * - Viewport constraints (small chat, big chat, full screen)
 * - Performance requirements (real-time vs detailed)
 * - Accessibility needs (screen readers, reading levels)
 * 
 * This follows modern web standards for responsive design and progressive enhancement.
 */

import { ContentAnalysis, ContentCategory, StructuredContent } from './agents/ContentAnalyzer';
import { RenderedContent, ContentRenderer } from './ContentRenderer';

export type RenderingContext = 
  | 'small-chat'        // Compact chat bubbles (mobile, sidebar)
  | 'standard-chat'     // Normal chat interface
  | 'large-chat'        // Expanded chat view
  | 'card-preview'      // Content cards in feed/grid
  | 'card-expanded'     // Expanded card view
  | 'fullscreen-web'    // Full web page experience
  | 'modal-overlay'     // Modal/popup content
  | 'mobile-optimized'  // Mobile-first rendering
  | 'print-friendly'    // Print/PDF export
  | 'accessibility';    // Screen reader optimized

export type RenderingStrategy = 
  | 'minimal'           // SimpleTextRenderer - basic formatting
  | 'enhanced'          // ContentRenderer - rich formatting
  | 'adaptive'          // Dynamic based on content
  | 'progressive'       // Start simple, enhance as needed
  | 'immersive';        // Full multimedia experience

export interface RenderingRequest {
  content: string | StructuredContent;
  context: RenderingContext;
  constraints?: {
    maxHeight?: number;
    maxWidth?: number;
    maxTokens?: number;
    performanceBudget?: 'low' | 'medium' | 'high';
    accessibility?: boolean;
    interactivity?: boolean;
  };
  userPreferences?: {
    textSize?: 'small' | 'medium' | 'large';
    animations?: boolean;
    darkMode?: boolean;
    readingLevel?: 'beginner' | 'intermediate' | 'advanced';
  };
  metadata?: {
    urgency?: 'low' | 'medium' | 'high';
    category?: ContentCategory;
    analysis?: ContentAnalysis;
  };
}

export interface RenderingResponse {
  strategy: RenderingStrategy;
  component: React.ComponentType<any>;
  props: any;
  fallback?: React.ComponentType<any>;
  metadata: {
    renderTime: number;
    strategy: RenderingStrategy;
    contextOptimized: boolean;
    accessibilityScore: number;
    performanceScore: number;
    reasoning: string;
  };
}

export interface ViewportInfo {
  width: number;
  height: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

export class RendererOrchestrator {
  private static instance: RendererOrchestrator;
  private contentRenderer: ContentRenderer;
  private performanceObserver?: PerformanceObserver;
  private renderingMetrics = new Map<string, number>();

  static getInstance(): RendererOrchestrator {
    if (!RendererOrchestrator.instance) {
      RendererOrchestrator.instance = new RendererOrchestrator();
    }
    return RendererOrchestrator.instance;
  }

  constructor() {
    this.contentRenderer = ContentRenderer.getInstance();
    this.initializePerformanceMonitoring();
  }

  /**
   * MAIN ORCHESTRATION METHOD
   * Intelligently routes content through optimal rendering pipeline
   */
  async orchestrateRendering(request: RenderingRequest): Promise<RenderingResponse> {
    const startTime = performance.now();
    
    console.log('🎨 RendererOrchestrator: Processing rendering request', {
      context: request.context,
      hasConstraints: !!request.constraints,
      contentType: typeof request.content
    });

    // 1. Analyze content complexity and requirements
    const contentAnalysis = await this.analyzeContentRequirements(request);
    
    // 2. Determine optimal rendering strategy
    const strategy = await this.selectRenderingStrategy(request, contentAnalysis);
    
    // 3. Get viewport and device information
    const viewport = this.getViewportInfo();
    
    // 4. Select appropriate renderer and configure props
    const renderingConfig = await this.configureRenderer(request, strategy, viewport);
    
    // 5. Apply context-specific optimizations
    const optimizedConfig = this.applyContextOptimizations(renderingConfig, request);
    
    const renderTime = performance.now() - startTime;
    
    // 6. Track performance metrics
    this.trackRenderingMetrics(request.context, strategy, renderTime);
    
    return {
      strategy,
      component: optimizedConfig.component,
      props: optimizedConfig.props,
      fallback: optimizedConfig.fallback,
      metadata: {
        renderTime,
        strategy,
        contextOptimized: optimizedConfig.isOptimized,
        accessibilityScore: this.calculateAccessibilityScore(optimizedConfig),
        performanceScore: this.calculatePerformanceScore(renderTime, strategy),
        reasoning: optimizedConfig.reasoning
      }
    };
  }

  /**
   * CONTENT ANALYSIS PIPELINE
   * Determines content complexity and rendering requirements
   */
  private async analyzeContentRequirements(request: RenderingRequest): Promise<{
    complexity: 'simple' | 'moderate' | 'complex';
    hasMedia: boolean;
    hasInteractivity: boolean;
    estimatedTokens: number;
    primaryContentType: ContentCategory;
  }> {
    const content = typeof request.content === 'string' ? request.content : JSON.stringify(request.content);
    
    // Text complexity analysis
    const wordCount = content.split(/\s+/).length;
    const hasMarkdown = /[#*`_\[\]]/g.test(content);
    const hasStructuredData = typeof request.content === 'object';
    const hasMedia = /!\[.*\]|<img|<video|<audio|chart|graph/i.test(content);
    const hasInteractivity = /button|click|interactive|widget/i.test(content);
    
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (wordCount > 500 || hasStructuredData || hasMedia) complexity = 'moderate';
    if (wordCount > 1500 || hasInteractivity || (hasMedia && hasMarkdown)) complexity = 'complex';
    
    // Estimate token count for performance planning
    const estimatedTokens = Math.ceil(wordCount * 1.3); // Rough approximation
    
    // Determine primary content type
    const primaryContentType = request.metadata?.category || this.inferContentType(content);
    
    return {
      complexity,
      hasMedia,
      hasInteractivity,
      estimatedTokens,
      primaryContentType
    };
  }

  /**
   * STRATEGY SELECTION ENGINE
   * Chooses optimal rendering strategy based on context and content
   */
  private async selectRenderingStrategy(
    request: RenderingRequest, 
    analysis: any
  ): Promise<RenderingStrategy> {
    const { context, constraints } = request;
    const { complexity, hasMedia, hasInteractivity } = analysis;
    
    // Context-first strategy selection
    const strategyMatrix: Record<RenderingContext, RenderingStrategy> = {
      'small-chat': 'minimal',           // Always use SimpleTextRenderer for small chat
      'standard-chat': 'adaptive',       // Dynamic based on content
      'large-chat': 'enhanced',          // Rich formatting appropriate
      'card-preview': 'minimal',         // Keep cards lightweight
      'card-expanded': 'enhanced',       // Full formatting for expanded cards
      'fullscreen-web': 'immersive',     // Full multimedia experience
      'modal-overlay': 'progressive',    // Start simple, enhance if needed
      'mobile-optimized': 'adaptive',    // Responsive to device capabilities
      'print-friendly': 'minimal',       // Clean, printer-friendly
      'accessibility': 'enhanced'        // Rich semantic structure
    };
    
    let baseStrategy = strategyMatrix[context];
    
    // Content complexity overrides
    if (complexity === 'simple' && baseStrategy === 'immersive') {
      baseStrategy = 'enhanced'; // Don't over-engineer simple content
    }
    
    if (complexity === 'complex' && baseStrategy === 'minimal') {
      baseStrategy = 'adaptive'; // Complex content needs more than minimal rendering
    }
    
    // Performance constraints
    if (constraints?.performanceBudget === 'low') {
      baseStrategy = 'minimal';
    }
    
    // Accessibility requirements
    if (constraints?.accessibility) {
      baseStrategy = baseStrategy === 'minimal' ? 'enhanced' : baseStrategy;
    }
    
    console.log(`🎯 Strategy selected: ${baseStrategy} for ${context} context`);
    return baseStrategy;
  }

  /**
   * RENDERER CONFIGURATION
   * Configures the appropriate renderer with optimized props
   */
  private async configureRenderer(
    request: RenderingRequest,
    strategy: RenderingStrategy,
    viewport: ViewportInfo
  ): Promise<{
    component: any;
    props: any;
    fallback?: any;
    isOptimized: boolean;
    reasoning: string;
  }> {
    const { content, context, userPreferences } = request;
    
    switch (strategy) {
      case 'minimal': {
        // Use SimpleTextRenderer for lightweight, fast rendering
        const SimpleTextRenderer = (await import('../components/SimpleTextRenderer')).default;
        
        return {
          component: SimpleTextRenderer,
          props: {
            text: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
            isDarkMode: userPreferences?.darkMode || false,
            className: this.getContextClasses(context, viewport)
          },
          isOptimized: true,
          reasoning: 'SimpleTextRenderer selected for minimal strategy - fast, lightweight rendering'
        };
      }
      
      case 'enhanced': {
        // Use ContentRenderer for rich formatting
        if (typeof content === 'string') {
          // Convert string content to structured format for ContentRenderer
          const structuredContent = await this.contentRenderer.render({
            category: request.metadata?.category || 'general',
            structuredData: { text: content },
            analysis: request.metadata?.analysis
          });
          
          const ResponseMessage = (await import('../components/ResponseMessage')).default;
          
          return {
            component: ResponseMessage,
            props: {
              content: [{ type: 'text', value: structuredContent.formattedMessage }],
              isDarkMode: userPreferences?.darkMode || false,
              compact: context.includes('small') || context.includes('card')
            },
            isOptimized: true,
            reasoning: 'ContentRenderer selected for enhanced strategy - rich formatting with structured content'
          };
        } else {
          // Already structured content
          const rendered = await this.contentRenderer.render({
            category: request.metadata?.category || 'general',
            structuredData: content,
            analysis: request.metadata?.analysis
          });
          
          const ResponseMessage = (await import('../components/ResponseMessage')).default;
          
          return {
            component: ResponseMessage,
            props: {
              content: [{ type: 'text', value: rendered.formattedMessage }],
              isDarkMode: userPreferences?.darkMode || false,
              compact: context.includes('small') || context.includes('card')
            },
            isOptimized: true,
            reasoning: 'ContentRenderer used for structured content with enhanced formatting'
          };
        }
      }
      
      case 'adaptive': {
        // Dynamic selection based on content analysis
        const contentLength = typeof content === 'string' ? content.length : JSON.stringify(content).length;
        
        if (contentLength < 200 && !content.toString().includes('```')) {
          // Short, simple content - use SimpleTextRenderer
          return this.configureRenderer(request, 'minimal', viewport);
        } else {
          // Complex content - use ContentRenderer
          return this.configureRenderer(request, 'enhanced', viewport);
        }
      }
      
      case 'progressive': {
        // Start with SimpleTextRenderer, provide enhanced fallback
        const SimpleTextRenderer = (await import('../components/SimpleTextRenderer')).default;
        const ResponseMessage = (await import('../components/ResponseMessage')).default;
        
        return {
          component: SimpleTextRenderer,
          props: {
            text: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
            isDarkMode: userPreferences?.darkMode || false,
            className: this.getContextClasses(context, viewport)
          },
          fallback: ResponseMessage,
          isOptimized: true,
          reasoning: 'Progressive strategy - SimpleTextRenderer with enhanced fallback available'
        };
      }
      
      case 'immersive': {
        // Full multimedia experience with all features enabled
        const rendered = await this.contentRenderer.render({
          category: request.metadata?.category || 'general',
          structuredData: typeof content === 'object' ? content : { text: content },
          analysis: request.metadata?.analysis
        });
        
        const ResponseMessage = (await import('../components/ResponseMessage')).default;
        
        return {
          component: ResponseMessage,
          props: {
            content: [{ 
              type: 'text', 
              value: rendered.formattedMessage 
            }],
            isDarkMode: userPreferences?.darkMode || false,
            compact: false,
            // Enable all interactive features for immersive experience
            onSuggestionClick: (target: string, data: any) => {
              console.log('Suggestion clicked:', { target, data });
              // Emit custom event for canvas activation or other interactions
              window.dispatchEvent(new CustomEvent('canvas-suggestion-click', { 
                detail: { target, data } 
              }));
            }
          },
          isOptimized: true,
          reasoning: 'Immersive strategy - full ContentRenderer with all interactive features enabled'
        };
      }
      
      default: {
        // Fallback to minimal strategy
        return this.configureRenderer(request, 'minimal', viewport);
      }
    }
  }

  /**
   * CONTEXT-SPECIFIC OPTIMIZATIONS
   * Apply rendering optimizations based on context
   */
  private applyContextOptimizations(
    config: any,
    request: RenderingRequest
  ): any {
    const { context, constraints } = request;
    
    // Apply context-specific CSS classes and optimizations
    const contextOptimizations: Record<RenderingContext, any> = {
      'small-chat': {
        className: `${config.props.className || ''} small-chat-optimized max-w-xs text-sm`,
        compact: true
      },
      'standard-chat': {
        className: `${config.props.className || ''} standard-chat max-w-md`,
        compact: false
      },
      'large-chat': {
        className: `${config.props.className || ''} large-chat max-w-2xl`,
        compact: false
      },
      'card-preview': {
        className: `${config.props.className || ''} card-preview max-w-sm truncate`,
        compact: true
      },
      'card-expanded': {
        className: `${config.props.className || ''} card-expanded max-w-lg`,
        compact: false
      },
      'fullscreen-web': {
        className: `${config.props.className || ''} fullscreen-web max-w-4xl`,
        compact: false
      },
      'modal-overlay': {
        className: `${config.props.className || ''} modal-overlay max-w-2xl`,
        compact: false
      },
      'mobile-optimized': {
        className: `${config.props.className || ''} mobile-optimized max-w-full text-base leading-relaxed`,
        compact: true
      },
      'print-friendly': {
        className: `${config.props.className || ''} print-friendly print:max-w-none print:text-black`,
        compact: false
      },
      'accessibility': {
        className: `${config.props.className || ''} accessibility-optimized focus:outline-2 focus:outline-blue-500`,
        compact: false,
        'aria-live': 'polite',
        'role': 'article'
      }
    };
    
    const optimizations = contextOptimizations[context] || {};
    
    return {
      ...config,
      props: {
        ...config.props,
        ...optimizations
      }
    };
  }

  /**
   * HELPER METHODS
   */
  private getViewportInfo(): ViewportInfo {
    if (typeof window === 'undefined') {
      return {
        width: 1200,
        height: 800,
        deviceType: 'desktop',
        orientation: 'landscape',
        pixelRatio: 1
      };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (width < 768) deviceType = 'mobile';
    else if (width < 1024) deviceType = 'tablet';
    
    return {
      width,
      height,
      deviceType,
      orientation: width > height ? 'landscape' : 'portrait',
      pixelRatio: window.devicePixelRatio || 1
    };
  }

  private getContextClasses(context: RenderingContext, viewport: ViewportInfo): string {
    const baseClasses = 'renderer-orchestrated';
    const contextClass = `context-${context}`;
    const deviceClass = `device-${viewport.deviceType}`;
    const orientationClass = `orientation-${viewport.orientation}`;
    
    return `${baseClasses} ${contextClass} ${deviceClass} ${orientationClass}`;
  }

  private inferContentType(content: string): ContentCategory {
    if (content.includes('recipe') || content.includes('ingredients')) return 'recipe';
    if (content.includes('tutorial') || content.includes('step')) return 'tutorial';
    if (content.includes('research') || content.includes('study')) return 'academic';
    if (content.includes('breaking') || content.includes('news')) return 'news';
    return 'general';
  }

  private calculateAccessibilityScore(config: any): number {
    let score = 60; // Base score
    
    if (config.props['aria-live']) score += 15;
    if (config.props.role) score += 10;
    if (config.props.className?.includes('accessibility')) score += 15;
    
    return Math.min(100, score);
  }

  private calculatePerformanceScore(renderTime: number, strategy: RenderingStrategy): number {
    const strategyScores = {
      minimal: 90,
      enhanced: 75,
      adaptive: 80,
      progressive: 85,
      immersive: 65
    };
    
    let score = strategyScores[strategy];
    
    // Penalize slow render times
    if (renderTime > 100) score -= 10;
    if (renderTime > 200) score -= 20;
    
    return Math.max(0, score);
  }

  private trackRenderingMetrics(context: RenderingContext, strategy: RenderingStrategy, renderTime: number): void {
    const key = `${context}-${strategy}`;
    const existing = this.renderingMetrics.get(key) || 0;
    this.renderingMetrics.set(key, (existing + renderTime) / 2); // Moving average
    
    console.log(`📊 Rendering metrics: ${key} - ${renderTime.toFixed(2)}ms`);
  }

  private initializePerformanceMonitoring(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('renderer')) {
            console.log(`🔍 Performance: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
          }
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
  }

  /**
   * PUBLIC API METHODS
   */
  public async renderForContext(
    content: string | StructuredContent,
    context: RenderingContext,
    options?: Partial<RenderingRequest>
  ): Promise<RenderingResponse> {
    return this.orchestrateRendering({
      content,
      context,
      ...options
    });
  }

  public getOptimalStrategy(context: RenderingContext, contentLength: number): RenderingStrategy {
    if (context.includes('small') || context.includes('card-preview')) return 'minimal';
    if (contentLength < 100) return 'minimal';
    if (contentLength > 1000) return 'enhanced';
    return 'adaptive';
  }

  public getPerformanceMetrics(): Record<string, number> {
    return Object.fromEntries(this.renderingMetrics);
  }
}

// Export singleton instance
export const rendererOrchestrator = RendererOrchestrator.getInstance();
export default rendererOrchestrator;
