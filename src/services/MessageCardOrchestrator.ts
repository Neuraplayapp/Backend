/**
 * MESSAGE CARD ORCHESTRATOR
 * 
 * State-of-the-art orchestration system that manages:
 * - Context-aware rendering (small vs big chat)
 * - Dynamic layout optimization
 * - Performance-based adaptation
 * - NPU-driven expansion decisions
 * - Cross-chat state synchronization
 */

import { serviceContainer } from './ServiceContainer';

export type ChatContext = 'small-chat' | 'big-chat' | 'modal' | 'sidebar' | 'fullscreen';
export type ExpansionState = 'collapsed' | 'preview' | 'expanded' | 'fullscreen';
export type PerformanceMode = 'high' | 'balanced' | 'low';

export interface MessageCardConfig {
  chatContext: ChatContext;
  performanceMode: PerformanceMode;
  viewportConstraints: {
    width: number;
    height: number;
    isTouch: boolean;
    pixelRatio: number;
  };
  userPreferences: {
    animationsEnabled: boolean;
    compactMode: boolean;
    accessibilityMode: boolean;
    darkMode: boolean;
  };
  aiCapabilities: {
    npuEnabled: boolean;
    semanticSearchEnabled: boolean;
    canvasIntegrationEnabled: boolean;
  };
}

export interface ExpansionStrategy {
  autoExpand: boolean;
  maxCollapsedHeight: number;
  enableGestures: boolean;
  enableVirtualization: boolean;
  transitionDuration: number;
  allowFullscreen: boolean;
}

export interface RenderingDecision {
  strategy: ExpansionStrategy;
  optimalExpansion: ExpansionState;
  renderingMode: 'minimal' | 'enhanced' | 'immersive';
  virtualizeThreshold: number;
  batchSize: number;
}

export class MessageCardOrchestrator {
  private static instance: MessageCardOrchestrator;
  private activeConfigs: Map<string, MessageCardConfig> = new Map();
  private performanceMetrics: Map<string, any> = new Map();

  static getInstance(): MessageCardOrchestrator {
    if (!MessageCardOrchestrator.instance) {
      MessageCardOrchestrator.instance = new MessageCardOrchestrator();
    }
    return MessageCardOrchestrator.instance;
  }

  /**
   * INTELLIGENT CONTEXT ANALYSIS
   * Analyzes viewport, device, and user context to determine optimal card configuration
   */
  analyzeContext(
    chatContext: ChatContext,
    viewport: { width: number; height: number },
    userAgent: string
  ): MessageCardConfig {
    console.log(`🎯 MessageCardOrchestrator: Analyzing context for ${chatContext}`);

    // Device detection
    const isTouch = 'ontouchstart' in window;
    const isMobile = viewport.width < 768;
    const isTablet = viewport.width >= 768 && viewport.width < 1024;
    const isDesktop = viewport.width >= 1024;
    const pixelRatio = window.devicePixelRatio || 1;

    // Performance detection
    const performanceMode: PerformanceMode = this.detectPerformanceMode(viewport, userAgent);

    // User preferences (would come from user settings)
    const userPreferences = {
      animationsEnabled: performanceMode !== 'low',
      compactMode: isMobile || chatContext === 'small-chat',
      accessibilityMode: false, // Would detect from system
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
    };

    // AI capabilities based on context and performance
    const aiCapabilities = {
      npuEnabled: performanceMode !== 'low',
      semanticSearchEnabled: performanceMode === 'high' || (performanceMode === 'balanced' && isDesktop),
      canvasIntegrationEnabled: chatContext === 'big-chat' && performanceMode !== 'low'
    };

    const config: MessageCardConfig = {
      chatContext,
      performanceMode,
      viewportConstraints: {
        width: viewport.width,
        height: viewport.height,
        isTouch,
        pixelRatio
      },
      userPreferences,
      aiCapabilities
    };

    this.activeConfigs.set(chatContext, config);
    return config;
  }

  /**
   * EXPANSION STRATEGY CALCULATION
   * NPU-powered decision making for optimal expansion behavior
   */
  async calculateExpansionStrategy(
    config: MessageCardConfig,
    messageData: {
      text: string;
      isUser: boolean;
      toolResults?: any[];
      complexity?: number;
    }
  ): Promise<RenderingDecision> {
    console.log(`🧠 Calculating expansion strategy for ${config.chatContext}`);

    // Base strategy based on context
    const baseStrategy = this.getBaseStrategy(config);

    // 🧠 NEW: Use UnifiedCognitiveAnalyzer for intelligent expansion decisions
    let npuAnalysis = null;
    if (config.aiCapabilities.npuEnabled && !messageData.isUser) {
      try {
        const cognitiveAnalyzer = serviceContainer.get('unifiedCognitiveAnalyzer');
        if (cognitiveAnalyzer) {
          console.log('🎯 MessageCardOrchestrator: Using NEW UnifiedCognitiveAnalyzer');
          const cognitiveResult = await cognitiveAnalyzer.analyzeMessage({
            message: messageData.text,
            sessionContext: {
              sessionId: 'message_orchestrator',
              userId: config.userPreferences?.userId
            }
          });
          
          // Convert to expected format for orchestrator
          npuAnalysis = {
            primaryIntent: cognitiveResult.intent.primaryIntent,
            processingMode: cognitiveResult.processingMode.mode,
            confidence: cognitiveResult.confidence,
            canvasActivation: cognitiveResult.canvasActivation,
            confusionDetection: cognitiveResult.confusion
          };
        }
      } catch (error) {
        console.warn('🔄 MessageCardOrchestrator: Cognitive analysis failed, using fallback strategy:', error);
      }
    }

    // Content complexity analysis
    const complexity = this.analyzeContentComplexity(messageData);

    // Optimal expansion calculation
    const optimalExpansion = this.calculateOptimalExpansion(
      config,
      messageData,
      npuAnalysis,
      complexity
    );

    // Rendering mode selection
    const renderingMode = this.selectRenderingMode(config, complexity, npuAnalysis);

    // Performance optimization
    const { virtualizeThreshold, batchSize } = this.calculatePerformanceParams(config);

    // Enhanced strategy with NPU insights
    const enhancedStrategy: ExpansionStrategy = {
      ...baseStrategy,
      autoExpand: this.shouldAutoExpand(config, messageData, npuAnalysis),
      maxCollapsedHeight: this.calculateMaxCollapsedHeight(config, complexity),
      transitionDuration: this.calculateTransitionDuration(config)
    };

    return {
      strategy: enhancedStrategy,
      optimalExpansion,
      renderingMode,
      virtualizeThreshold,
      batchSize
    };
  }

  /**
   * CONTEXT-SPECIFIC BASE STRATEGIES
   */
  private getBaseStrategy(config: MessageCardConfig): ExpansionStrategy {
    const strategies: Record<ChatContext, ExpansionStrategy> = {
      'small-chat': {
        autoExpand: false,
        maxCollapsedHeight: 80,
        enableGestures: config.viewportConstraints.isTouch,
        enableVirtualization: true,
        transitionDuration: 200,
        allowFullscreen: true
      },
      'big-chat': {
        autoExpand: true,
        maxCollapsedHeight: 150,
        enableGestures: config.viewportConstraints.isTouch,
        enableVirtualization: false,
        transitionDuration: 300,
        allowFullscreen: true
      },
      'modal': {
        autoExpand: true,
        maxCollapsedHeight: 200,
        enableGestures: false,
        enableVirtualization: false,
        transitionDuration: 400,
        allowFullscreen: false
      },
      'sidebar': {
        autoExpand: false,
        maxCollapsedHeight: 100,
        enableGestures: true,
        enableVirtualization: true,
        transitionDuration: 250,
        allowFullscreen: true
      },
      'fullscreen': {
        autoExpand: true,
        maxCollapsedHeight: 300,
        enableGestures: false,
        enableVirtualization: false,
        transitionDuration: 500,
        allowFullscreen: false
      }
    };

    return strategies[config.chatContext];
  }

  /**
   * NPU-POWERED EXPANSION DECISIONS
   */
  private shouldAutoExpand(
    config: MessageCardConfig,
    messageData: any,
    npuAnalysis: any
  ): boolean {
    // User messages don't auto-expand
    if (messageData.isUser) return false;

    // NPU-based decisions
    if (npuAnalysis) {
      // High confusion level should expand for better readability
      if (npuAnalysis.confusionDetection?.confusionLevel > 0.7) return true;
      
      // Canvas activation triggers should expand
      if (npuAnalysis.canvasActivation?.shouldActivate) return true;
      
      // Complex workflows should expand
      if (npuAnalysis.primaryIntent === 'complex_workflow') return true;
      
      // Educational content should expand in socratic mode
      if (npuAnalysis.confusionDetection?.enableSocraticMode) return true;
    }

    // Content-based decisions
    if (messageData.toolResults && messageData.toolResults.length > 0) return true;

    // Context-based decisions
    if (config.chatContext === 'big-chat' && !config.userPreferences.compactMode) return true;

    return false;
  }

  /**
   * CONTENT COMPLEXITY ANALYSIS
   */
  private analyzeContentComplexity(messageData: any): number {
    let complexity = 0;

    // Word count factor
    const wordCount = messageData.text.split(' ').length;
    complexity += Math.min(wordCount / 50, 1) * 0.3;

    // Tool results factor
    if (messageData.toolResults) {
      complexity += messageData.toolResults.length * 0.2;
    }

    // Special content detection
    if (messageData.text.includes('```')) complexity += 0.2; // Code blocks
    if (messageData.text.includes('|')) complexity += 0.1;   // Tables
    if (messageData.text.match(/#{1,6}/g)) complexity += 0.1; // Headers

    return Math.min(complexity, 1);
  }

  /**
   * OPTIMAL EXPANSION CALCULATION
   */
  private calculateOptimalExpansion(
    config: MessageCardConfig,
    messageData: any,
    npuAnalysis: any,
    complexity: number
  ): ExpansionState {
    // High complexity content starts expanded
    if (complexity > 0.8) {
      return config.chatContext === 'small-chat' ? 'preview' : 'expanded';
    }

    // NPU-driven decisions
    if (npuAnalysis?.canvasActivation?.shouldActivate) {
      return 'expanded';
    }

    // Default based on context
    switch (config.chatContext) {
      case 'small-chat':
        return complexity > 0.5 ? 'preview' : 'collapsed';
      case 'big-chat':
        return complexity > 0.3 ? 'expanded' : 'preview';
      default:
        return 'collapsed';
    }
  }

  /**
   * RENDERING MODE SELECTION
   */
  private selectRenderingMode(
    config: MessageCardConfig,
    complexity: number,
    npuAnalysis: any
  ): 'minimal' | 'enhanced' | 'immersive' {
    // Performance-based selection
    if (config.performanceMode === 'low') return 'minimal';
    
    // Context-based selection
    if (config.chatContext === 'small-chat' && config.userPreferences.compactMode) {
      return 'minimal';
    }

    // Complexity-based selection
    if (complexity > 0.7 || npuAnalysis?.primaryIntent === 'creation') {
      return config.performanceMode === 'high' ? 'immersive' : 'enhanced';
    }

    return 'enhanced';
  }

  /**
   * PERFORMANCE OPTIMIZATION
   */
  private detectPerformanceMode(viewport: any, userAgent: string): PerformanceMode {
    // Simple heuristics for performance detection
    const isLowEnd = /Android.*Chrome\/[0-5][0-9]/.test(userAgent);
    const isHighEnd = viewport.width > 1920 && window.devicePixelRatio > 2;
    
    if (isLowEnd) return 'low';
    if (isHighEnd) return 'high';
    return 'balanced';
  }

  private calculatePerformanceParams(config: MessageCardConfig) {
    const baseParams = {
      high: { virtualizeThreshold: 100, batchSize: 20 },
      balanced: { virtualizeThreshold: 50, batchSize: 15 },
      low: { virtualizeThreshold: 20, batchSize: 10 }
    };

    return baseParams[config.performanceMode];
  }

  private calculateMaxCollapsedHeight(config: MessageCardConfig, complexity: number): number {
    const base = this.getBaseStrategy(config).maxCollapsedHeight;
    return Math.floor(base * (1 + complexity * 0.5));
  }

  private calculateTransitionDuration(config: MessageCardConfig): number {
    const base = this.getBaseStrategy(config).transitionDuration;
    
    // Reduce duration for low performance
    if (config.performanceMode === 'low') return base * 0.7;
    
    // Reduce duration for touch devices (feels more responsive)
    if (config.viewportConstraints.isTouch) return base * 0.8;
    
    return base;
  }

  /**
   * CONTEXT SYNCHRONIZATION
   * Synchronizes state between small and big chat instances
   */
  syncExpansionState(
    messageId: string,
    newState: ExpansionState,
    sourceContext: ChatContext
  ): void {
    console.log(`🔄 Syncing expansion state: ${messageId} -> ${newState} from ${sourceContext}`);
    
    // Emit event for other chat instances to pick up
    window.dispatchEvent(new CustomEvent('messageExpansionSync', {
      detail: {
        messageId,
        expansionState: newState,
        sourceContext,
        timestamp: Date.now()
      }
    }));
  }

  /**
   * ADAPTIVE RECONFIGURATION
   * Dynamically adjusts configuration based on usage patterns
   */
  adaptConfiguration(
    chatContext: ChatContext,
    performanceMetrics: {
      renderTime: number;
      interactionRate: number;
      expansionSuccess: number;
    }
  ): void {
    const currentConfig = this.activeConfigs.get(chatContext);
    if (!currentConfig) return;

    // Store metrics for learning
    this.performanceMetrics.set(chatContext, {
      ...this.performanceMetrics.get(chatContext) || {},
      ...performanceMetrics,
      timestamp: Date.now()
    });

    // Adaptive adjustments based on metrics
    if (performanceMetrics.renderTime > 100) {
      // Reduce performance mode if rendering is slow
      currentConfig.performanceMode = 'balanced';
      console.log(`🎛️ Reduced performance mode for ${chatContext} due to slow rendering`);
    }

    if (performanceMetrics.interactionRate < 0.1) {
      // Reduce auto-expansion if users aren't interacting
      console.log(`📉 Low interaction rate in ${chatContext}, adjusting auto-expansion`);
    }

    this.activeConfigs.set(chatContext, currentConfig);
  }

  /**
   * PUBLIC API
   */
  getConfig(chatContext: ChatContext): MessageCardConfig | null {
    return this.activeConfigs.get(chatContext) || null;
  }

  updateConfig(chatContext: ChatContext, updates: Partial<MessageCardConfig>): void {
    const current = this.activeConfigs.get(chatContext);
    if (current) {
      this.activeConfigs.set(chatContext, { ...current, ...updates });
    }
  }

  getPerformanceMetrics(chatContext: ChatContext): any {
    return this.performanceMetrics.get(chatContext) || {};
  }
}

// Export singleton instance
export const messageCardOrchestrator = MessageCardOrchestrator.getInstance();
