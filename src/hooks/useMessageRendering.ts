/**
 * USE MESSAGE RENDERING HOOK
 * 
 * Intelligent hook that integrates MessageCard with:
 * - NPU Intent Analysis
 * - RendererOrchestrator  
 * - VectorSearchService
 * - ContentRenderer
 * - All agentic services
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { serviceContainer } from '../services/ServiceContainer';
import type { UnifiedMessageData, RenderingContext } from '../components/UnifiedMessageRenderer';

// Type aliases for backward compatibility
type MessageData = UnifiedMessageData;
type MessageCardContext = RenderingContext;

export interface MessageRenderingOptions {
  enableNPUAnalysis?: boolean;
  enableSemanticSearch?: boolean;
  enableAdaptiveRendering?: boolean;
  context: MessageCardContext;
  userId?: string;
}

export interface MessageRenderingResult {
  // Enhanced message data
  enhancedMessage: MessageData;
  
  // NPU Analysis results
  intentAnalysis?: any;
  confusionLevel?: number;
  shouldActivateCanvas?: boolean;
  
  // Rendering strategy
  renderingStrategy: string;
  renderingContext: MessageCardContext;
  
  // Semantic insights
  semanticSimilarity?: any[];
  relatedMessages?: any[];
  
  // Performance metrics
  analysisTime: number;
  renderingTime: number;
}

export const useMessageRendering = (
  message: MessageData, 
  options: MessageRenderingOptions
) => {
  const [result, setResult] = useState<MessageRenderingResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Main analysis and enhancement function
  // Cache and deduplication to prevent multiple parallel processes
  const messageKeyRef = useRef<string>('');
  const cacheRef = useRef<Map<string, MessageRenderingResult>>(new Map());

  const analyzeMessage = useCallback(async (msg: MessageData) => {
    // Create unique key for this message + options combination
    const messageKey = `${msg.text.slice(0, 50)}-${msg.timestamp.getTime()}-${options.context}-${options.enableSemanticSearch}`;
    
    // Check cache first to prevent duplicate processing
    if (cacheRef.current.has(messageKey)) {
      console.log('📋 Using cached analysis for message');
      return cacheRef.current.get(messageKey)!;
    }
    
    // Prevent multiple parallel analyses of the same message
    if (messageKeyRef.current === messageKey) {
      console.log('⏳ Analysis already in progress for this message');
      return result || {
        enhancedMessage: msg,
        renderingStrategy: 'minimal',
        renderingContext: options.context,
        analysisTime: 0,
        renderingTime: 0
      };
    }
    
    messageKeyRef.current = messageKey;

    if (msg.isUser) {
      // For user messages, return minimal analysis
      const minimalResult = {
        enhancedMessage: msg,
        renderingStrategy: 'minimal',
        renderingContext: options.context,
        analysisTime: 0,
        renderingTime: 0
      };
      cacheRef.current.set(messageKey, minimalResult);
      return minimalResult;
    }

    setIsAnalyzing(true);
    setError(null);
    const startTime = Date.now();

    try {
      let intentAnalysis = null;
      let confusionLevel = 0;
      let shouldActivateCanvas = false;
      let renderingStrategy = 'enhanced';

      // 🧠 NEW: Use UnifiedCognitiveAnalyzer instead of old monolith
      if (options.enableNPUAnalysis === true) {
        try {
          const cognitiveAnalyzer = serviceContainer.get('unifiedCognitiveAnalyzer') as any;
          if (cognitiveAnalyzer && cognitiveAnalyzer.analyzeMessage) {
            console.log('🎯 useMessageRendering: Using NEW UnifiedCognitiveAnalyzer');
            const cognitiveResult = await cognitiveAnalyzer.analyzeMessage({
              message: msg.text,
              sessionContext: {
                userId: options.userId,
                sessionId: 'message_rendering'
              }
            });

            // Convert to expected format for rendering
            intentAnalysis = {
              primaryIntent: cognitiveResult.intent.primaryIntent,
              processingMode: cognitiveResult.processingMode.mode,
              confusionDetection: cognitiveResult.confusion,
              canvasActivation: cognitiveResult.canvasActivation
            };

            confusionLevel = cognitiveResult.confusion?.confusionLevel || 0;
            shouldActivateCanvas = cognitiveResult.canvasActivation?.shouldActivate || false;

            // Determine rendering strategy based on intent
            if (cognitiveResult.intent.primaryIntent === 'creation') {
              renderingStrategy = 'immersive';
            } else if (cognitiveResult.confusion?.enableSocraticMode) {
              renderingStrategy = 'progressive';
            } else if (cognitiveResult.processingMode.mode === 'tool-calling') {
              renderingStrategy = 'enhanced';
            }
          } else {
            console.warn('⚠️ useMessageRendering: UnifiedCognitiveAnalyzer not available, skipping analysis');
          }
        } catch (error) {
          // Silent failure - don't break message rendering for NPU analysis errors
          console.warn('🔄 useMessageRendering: Cognitive analysis failed:', error);
        }
      }

      // Adaptive rendering based on context
      if (options.enableAdaptiveRendering) {
        // Simplified strategy selection based on context
        const contextMapping: Record<string, string> = {
          'small-chat': 'minimal',
          'standard-chat': 'adaptive', 
          'large-chat': 'enhanced',
          'big-chat': 'enhanced',
          'card-preview': 'minimal',
          'card-expanded': 'enhanced'
        };
        
        renderingStrategy = contextMapping[options.context] || 'adaptive';
        // Only log once per unique message to verify the fix worked
        if (Math.random() < 0.01) { // 1% chance - much less spam
          console.log(`🎯 Selected rendering strategy: ${renderingStrategy} for context: ${options.context}`);
        }
      }

      // Semantic search for related content with rate limiting
      let semanticSimilarity = [];
      let relatedMessages = [];

      if (options.enableSemanticSearch && msg.text && msg.text.length > 20 && !msg.text.includes('I apologize, but I encountered an issue')) {
        try {
          const vectorSearchService = serviceContainer.get('vectorSearchService') as any;
          if (vectorSearchService && vectorSearchService.semanticSearch) {
            console.log('🔍 Running semantic search for:', msg.text.substring(0, 100) + '...');
            semanticSimilarity = await vectorSearchService.semanticSearch(msg.text, undefined, options.userId, 3, 0.7); // Reduced limit and increased threshold

            // Also search chat history
            try {
              // SAFETY: Check if service exists before trying to get it
              if (serviceContainer.has('chatMemoryService')) {
              const chatMemoryService = serviceContainer.get('chatMemoryService') as any;
              if (chatMemoryService && chatMemoryService.searchAcrossChats && options.userId) {
                relatedMessages = await chatMemoryService.searchAcrossChats(msg.text);
                }
              } else {
                console.log('🔄 chatMemoryService not yet initialized, skipping related messages search');
              }
            } catch (chatError) {
              console.warn('Chat memory service not available:', chatError);
            }
          }
        } catch (vectorError) {
          console.warn('Vector search service not available:', vectorError);
        }
      }

      const analysisTime = Date.now() - startTime;

      // Enhanced message with all NPU insights
      const enhancedMessage: MessageData = {
        ...msg,
        metadata: {
          ...msg.metadata,
          intentAnalysis,
          contentCategory: intentAnalysis?.primaryIntent || 'conversational',
          renderingStrategy,
          semanticTags: semanticSimilarity.map((item: any) => item.metadata?.tags || []).flat(),
          canvasActivation: shouldActivateCanvas,
          canvasData: intentAnalysis?.canvasActivation
        }
      };

      return {
        enhancedMessage,
        intentAnalysis,
        confusionLevel,
        shouldActivateCanvas,
        renderingStrategy,
        renderingContext: options.context,
        semanticSimilarity,
        relatedMessages,
        analysisTime,
        renderingTime: 0 // Will be set by actual rendering
      };

    } catch (err) {
      console.error('❌ Message analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      
      // Return basic result on error
      return {
        enhancedMessage: msg,
        renderingStrategy: 'minimal',
        renderingContext: options.context,
        analysisTime: Date.now() - startTime,
        renderingTime: 0
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, [options]);

  // Run analysis when message or options change
  useEffect(() => {
    analyzeMessage(message).then(setResult);
  }, [message, analyzeMessage]);

  // Convenience functions
  const reanalyze = useCallback(() => {
    analyzeMessage(message).then(setResult);
  }, [message, analyzeMessage]);

  const updateContext = useCallback((newContext: MessageCardContext) => {
    analyzeMessage(message).then(setResult);
  }, [message, analyzeMessage]);

  return {
    result,
    isAnalyzing,
    error,
    reanalyze,
    updateContext,
    
    // Quick access to common properties
    enhancedMessage: result?.enhancedMessage || message,
    renderingStrategy: result?.renderingStrategy || 'minimal',
    shouldActivateCanvas: result?.shouldActivateCanvas || false,
    confusionLevel: result?.confusionLevel || 0,
    semanticSimilarity: result?.semanticSimilarity || [],
    
    // Performance metrics
    analysisTime: result?.analysisTime || 0,
    isNPUAnalyzed: !!result?.intentAnalysis
  };
};
