/**
 * REACT HOOK FOR RENDERER ORCHESTRATOR
 * 
 * Provides React integration for the RendererOrchestrator with:
 * - Automatic context detection
 * - Performance optimization
 * - Error boundaries
 * - State management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { rendererOrchestrator, RenderingContext, RenderingRequest, RenderingResponse } from '../services/RendererOrchestrator';
import { useTheme } from '../contexts/ThemeContext';

export interface UseRendererOrchestratorOptions {
  context?: RenderingContext;
  autoDetectContext?: boolean;
  performanceBudget?: 'low' | 'medium' | 'high';
  enableAccessibility?: boolean;
}

export interface RendererState {
  isLoading: boolean;
  error: string | null;
  response: RenderingResponse | null;
  metrics: {
    renderTime: number;
    strategy: string;
    performanceScore: number;
  } | null;
}

export function useRendererOrchestrator(options: UseRendererOrchestratorOptions = {}) {
  const { isDarkMode } = useTheme();
  const [state, setState] = useState<RendererState>({
    isLoading: false,
    error: null,
    response: null,
    metrics: null
  });

  // Auto-detect rendering context based on viewport and location
  const detectedContext = useMemo((): RenderingContext => {
    if (typeof window === 'undefined') return 'standard-chat';
    
    const width = window.innerWidth;
    const pathname = window.location.pathname;
    
    // Context detection logic
    if (pathname.includes('/playground')) return 'fullscreen-web';
    if (pathname.includes('/mobile') || width < 768) return 'mobile-optimized';
    if (width < 400) return 'small-chat';
    if (width > 1200) return 'large-chat';
    
    return 'standard-chat';
  }, []);

  const context = options.context || (options.autoDetectContext ? detectedContext : 'standard-chat');

  /**
   * MAIN RENDERING METHOD
   * Orchestrates content rendering with error handling and performance tracking
   */
  const renderContent = useCallback(async (
    content: string | any,
    customOptions?: Partial<RenderingRequest>
  ): Promise<RenderingResponse | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const request: RenderingRequest = {
        content,
        context,
        constraints: {
          performanceBudget: options.performanceBudget || 'medium',
          accessibility: options.enableAccessibility || false,
          ...customOptions?.constraints
        },
        userPreferences: {
          darkMode: isDarkMode,
          animations: true,
          textSize: 'medium',
          ...customOptions?.userPreferences
        },
        ...customOptions
      };

      const response = await rendererOrchestrator.orchestrateRendering(request);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        response,
        metrics: {
          renderTime: response.metadata.renderTime,
          strategy: response.metadata.strategy,
          performanceScore: response.metadata.performanceScore
        }
      }));
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Rendering failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      console.error('❌ Renderer Orchestrator Error:', error);
      return null;
    }
  }, [context, options.performanceBudget, options.enableAccessibility, isDarkMode]);

  /**
   * QUICK RENDERING METHODS FOR COMMON CONTEXTS
   */
  const renderForChat = useCallback((content: string, size: 'small' | 'standard' | 'large' = 'standard') => {
    const chatContext: RenderingContext = size === 'small' ? 'small-chat' : 
                                        size === 'large' ? 'large-chat' : 'standard-chat';
    return renderContent(content, { context: chatContext });
  }, [renderContent]);

  const renderForCard = useCallback((content: string, expanded: boolean = false) => {
    const cardContext: RenderingContext = expanded ? 'card-expanded' : 'card-preview';
    return renderContent(content, { context: cardContext });
  }, [renderContent]);

  const renderForWeb = useCallback((content: string, fullscreen: boolean = false) => {
    const webContext: RenderingContext = fullscreen ? 'fullscreen-web' : 'standard-chat';
    return renderContent(content, { context: webContext });
  }, [renderContent]);

  const renderForMobile = useCallback((content: string) => {
    return renderContent(content, { context: 'mobile-optimized' });
  }, [renderContent]);

  const renderAccessible = useCallback((content: string) => {
    return renderContent(content, { 
      context: 'accessibility',
      constraints: { accessibility: true }
    });
  }, [renderContent]);

  /**
   * OPTIMIZATION HELPERS
   */
  const getOptimalStrategy = useCallback((contentLength: number) => {
    return rendererOrchestrator.getOptimalStrategy(context, contentLength);
  }, [context]);

  const preloadRenderer = useCallback(async (strategy: string) => {
    // Preload the renderer component to improve performance
    try {
      if (strategy === 'minimal') {
        await import('../components/SimpleTextRenderer');
      } else {
        await import('../components/ResponseMessage');
      }
    } catch (error) {
      console.warn('Failed to preload renderer:', error);
    }
  }, []);

  /**
   * PERFORMANCE MONITORING
   */
  const getPerformanceMetrics = useCallback(() => {
    return rendererOrchestrator.getPerformanceMetrics();
  }, []);

  // Auto-preload likely renderers based on context
  useEffect(() => {
    const strategy = getOptimalStrategy(500); // Average content length
    preloadRenderer(strategy);
  }, [getOptimalStrategy, preloadRenderer]);

  return {
    // State
    ...state,
    
    // Main methods
    renderContent,
    
    // Context-specific methods
    renderForChat,
    renderForCard,
    renderForWeb,
    renderForMobile,
    renderAccessible,
    
    // Utilities
    getOptimalStrategy,
    getPerformanceMetrics,
    preloadRenderer,
    
    // Current context info
    currentContext: context,
    detectedContext,
    
    // Performance helpers
    clearError: () => setState(prev => ({ ...prev, error: null })),
    resetState: () => setState({
      isLoading: false,
      error: null,
      response: null,
      metrics: null
    })
  };
}

/**
 * SIMPLIFIED HOOK FOR BASIC USAGE
 * For components that just need simple text rendering
 */
export function useSimpleRenderer() {
  const orchestrator = useRendererOrchestrator({
    performanceBudget: 'low',
    autoDetectContext: true
  });

  const renderText = useCallback(async (text: string) => {
    return orchestrator.renderContent(text, {
      constraints: { maxTokens: 200 }
    });
  }, [orchestrator]);

  return {
    renderText,
    isLoading: orchestrator.isLoading,
    error: orchestrator.error
  };
}

export default useRendererOrchestrator;
