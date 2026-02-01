// Context Continuity Manager - Seamless transitions between chat and canvas modes
// Based on technical architecture document specifications

import { EventEmitter } from 'events';

export interface TransitionContext {
  fromMode: 'small' | 'fullscreen' | 'canvas' | 'integrated';
  toMode: 'small' | 'fullscreen' | 'canvas' | 'integrated';
  trigger: 'user' | 'ai' | 'system' | 'automatic';
  timestamp: number;
  preservedElements: string[];
  activeState: any;
  userIntent: string;
}

export interface ContinuityState {
  conversationFlow: {
    activeConversation: string;
    messageHistory: any[];
    contextWindow: any[];
    userPreferences: any;
    conversationMetadata: any;
  };
  taskProgression: {
    currentTask: string;
    taskStep: number;
    taskData: any;
    progressMarkers: string[];
    completionStatus: number;
  };
  collaborationState: {
    activeUsers: string[];
    sharedElements: string[];
    permissions: Record<string, string[]>;
    syncStatus: 'synced' | 'syncing' | 'conflict' | 'offline';
  };
  preferenceContext: {
    uiPreferences: any;
    accessibilitySettings: any;
    performanceSettings: any;
    customizations: any;
  };
}

export interface TransitionAnimation {
  type: 'fade' | 'slide' | 'scale' | 'morph' | 'custom';
  duration: number;
  easing: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  stagger?: number;
  parallax?: boolean;
}

export interface ContextBridge {
  id: string;
  sourceMode: string;
  targetMode: string;
  dataMapping: Record<string, string>;
  transformations: Array<(data: any) => any>;
  validationRules: Array<(data: any) => boolean>;
}

interface TransitionQueue {
  pending: TransitionContext[];
  active: TransitionContext | null;
  completed: TransitionContext[];
  failed: TransitionContext[];
}

class TransitionOrchestrator extends EventEmitter {
  private queue: TransitionQueue;
  private isProcessing = false;
  private maxConcurrentTransitions = 1;

  constructor() {
    super();
    this.queue = {
      pending: [],
      active: null,
      completed: [],
      failed: []
    };
    
    this.initializeOrchestrator();
  }

  private initializeOrchestrator(): void {
    console.log('🔄 Transition Orchestrator - Initializing');
    
    this.startProcessingQueue();
  }

  private startProcessingQueue(): void {
    setInterval(() => {
      if (!this.isProcessing && this.queue.pending.length > 0) {
        this.processNextTransition();
      }
    }, 50); // Check every 50ms for smooth transitions
  }

  private async processNextTransition(): Promise<void> {
    const transition = this.queue.pending.shift();
    if (!transition) return;

    this.isProcessing = true;
    this.queue.active = transition;

    try {
      await this.executeTransition(transition);
      
      this.queue.completed.push(transition);
      this.emit('transitionCompleted', transition);
      
    } catch (error) {
      console.error('Transition failed:', error);
      this.queue.failed.push(transition);
      this.emit('transitionFailed', { transition, error });
    } finally {
      this.queue.active = null;
      this.isProcessing = false;
    }
  }

  private async executeTransition(transition: TransitionContext): Promise<void> {
    console.log(`🔄 Executing transition: ${transition.fromMode} → ${transition.toMode}`);
    
    // Phase 1: Pre-transition preparation
    await this.prepareTransition(transition);
    
    // Phase 2: Context preservation
    await this.preserveContext(transition);
    
    // Phase 3: Execute transition
    await this.performTransition(transition);
    
    // Phase 4: Post-transition cleanup
    await this.finalizeTransition(transition);
  }

  private async prepareTransition(transition: TransitionContext): Promise<void> {
    this.emit('transitionPreparing', transition);
    
    // Validate transition is allowed
    if (!this.isValidTransition(transition)) {
      throw new Error(`Invalid transition: ${transition.fromMode} → ${transition.toMode}`);
    }
    
    // Save current state
    transition.activeState = await this.captureCurrentState();
    
    // Prepare target environment
    await this.prepareTargetEnvironment(transition.toMode);
  }

  private async preserveContext(transition: TransitionContext): Promise<void> {
    this.emit('contextPreserving', transition);
    
    // Identify elements to preserve
    transition.preservedElements = this.identifyPreservableElements(transition);
    
    // Create context snapshot
    await this.createContextSnapshot(transition);
  }

  private async performTransition(transition: TransitionContext): Promise<void> {
    this.emit('transitionExecuting', transition);
    
    // Execute the actual mode switch
    await this.switchModes(transition.fromMode, transition.toMode);
    
    // Apply preserved context
    await this.applyPreservedContext(transition);
  }

  private async finalizeTransition(transition: TransitionContext): Promise<void> {
    this.emit('transitionFinalizing', transition);
    
    // Cleanup old mode resources
    await this.cleanupOldMode(transition.fromMode);
    
    // Initialize new mode features
    await this.initializeNewMode(transition.toMode);
    
    // Verify transition success
    await this.verifyTransitionSuccess(transition);
  }

  private isValidTransition(transition: TransitionContext): boolean {
    const validTransitions: Record<string, string[]> = {
      'small': ['fullscreen', 'canvas'],
      'fullscreen': ['small', 'canvas', 'integrated'],
      'canvas': ['fullscreen', 'integrated'],
      'integrated': ['fullscreen', 'canvas']
    };
    
    return validTransitions[transition.fromMode]?.includes(transition.toMode) || false;
  }

  private async captureCurrentState(): Promise<any> {
    return {
      timestamp: Date.now(),
      activeElements: this.getActiveElements(),
      userInput: this.getCurrentUserInput(),
      scrollPosition: this.getScrollPositions(),
      selections: this.getCurrentSelections()
    };
  }

  private async prepareTargetEnvironment(targetMode: string): Promise<void> {
    switch (targetMode) {
      case 'fullscreen':
        await this.prepareFullscreenMode();
        break;
      case 'canvas':
        await this.prepareCanvasMode();
        break;
      case 'integrated':
        await this.prepareIntegratedMode();
        break;
    }
  }

  private identifyPreservableElements(transition: TransitionContext): string[] {
    const preservable = [];
    
    // Always preserve conversation context
    preservable.push('conversation-history', 'user-preferences', 'active-task');
    
    // Mode-specific preservation
    if (transition.fromMode === 'canvas' || transition.toMode === 'canvas') {
      preservable.push('canvas-elements', 'canvas-state', 'execution-results');
    }
    
    if (transition.fromMode === 'fullscreen' || transition.toMode === 'fullscreen') {
      preservable.push('layout-preferences', 'panel-states', 'focus-state');
    }
    
    return preservable;
  }

  private async createContextSnapshot(transition: TransitionContext): Promise<void> {
    // Create detailed snapshot for context preservation
    transition.activeState.contextSnapshot = {
      conversation: this.captureConversationContext(),
      ui: this.captureUIContext(),
      user: this.captureUserContext(),
      task: this.captureTaskContext()
    };
  }

  private async switchModes(fromMode: string, toMode: string): Promise<void> {
    // Emit mode switch events for UI components to handle
    this.emit('modeSwitch', { from: fromMode, to: toMode });
    
    // Wait for mode switch to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async applyPreservedContext(transition: TransitionContext): Promise<void> {
    const snapshot = transition.activeState.contextSnapshot;
    
    // Restore conversation context
    this.emit('restoreConversation', snapshot.conversation);
    
    // Restore UI state
    this.emit('restoreUI', snapshot.ui);
    
    // Restore user preferences
    this.emit('restoreUserContext', snapshot.user);
    
    // Restore task context
    this.emit('restoreTask', snapshot.task);
  }

  private async cleanupOldMode(oldMode: string): Promise<void> {
    this.emit('cleanupMode', oldMode);
  }

  private async initializeNewMode(newMode: string): Promise<void> {
    this.emit('initializeMode', newMode);
  }

  private async verifyTransitionSuccess(transition: TransitionContext): Promise<void> {
    // Basic verification that transition completed successfully
    if (!transition.activeState || !transition.preservedElements) {
      throw new Error('Transition verification failed');
    }
  }

  // Helper methods for state capture
  private getActiveElements(): string[] {
    return Array.from(document.querySelectorAll('[data-active="true"]')).map(el => el.id);
  }

  private getCurrentUserInput(): string {
    const activeInput = document.querySelector('input:focus, textarea:focus') as HTMLInputElement;
    return activeInput?.value || '';
  }

  private getScrollPositions(): Record<string, number> {
    return {
      main: window.scrollY,
      sidebar: document.querySelector('.sidebar')?.scrollTop || 0
    };
  }

  private getCurrentSelections(): any {
    const selection = window.getSelection();
    return selection ? {
      text: selection.toString(),
      anchorOffset: selection.anchorOffset,
      focusOffset: selection.focusOffset
    } : null;
  }

  private async prepareFullscreenMode(): Promise<void> {
    console.log('🖥️ Preparing fullscreen mode');
  }

  private async prepareCanvasMode(): Promise<void> {
    console.log('🎨 Preparing canvas mode');
  }

  private async prepareIntegratedMode(): Promise<void> {
    console.log('🔗 Preparing integrated mode');
  }

  private captureConversationContext(): any {
    return {
      activeConversation: 'current',
      messageCount: 0,
      lastMessage: null,
      context: {}
    };
  }

  private captureUIContext(): any {
    return {
      theme: 'auto',
      layout: 'default',
      panels: [],
      focus: null
    };
  }

  private captureUserContext(): any {
    return {
      preferences: {},
      settings: {},
      customizations: {}
    };
  }

  private captureTaskContext(): any {
    return {
      currentTask: null,
      progress: 0,
      data: {}
    };
  }

  // Public API
  queueTransition(transition: TransitionContext): void {
    this.queue.pending.push(transition);
    this.emit('transitionQueued', transition);
  }

  getQueueStatus(): {
    pending: number;
    active: boolean;
    completed: number;
    failed: number;
  } {
    return {
      pending: this.queue.pending.length,
      active: this.queue.active !== null,
      completed: this.queue.completed.length,
      failed: this.queue.failed.length
    };
  }
}

class AnimationManager extends EventEmitter {
  private activeAnimations: Map<string, Animation> = new Map();
  private animationQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor() {
    super();
    this.startAnimationQueue();
  }

  private startAnimationQueue(): void {
    setInterval(() => {
      if (!this.isProcessingQueue && this.animationQueue.length > 0) {
        this.processNextAnimation();
      }
    }, 16); // ~60fps
  }

  private async processNextAnimation(): Promise<void> {
    const animation = this.animationQueue.shift();
    if (!animation) return;

    this.isProcessingQueue = true;
    try {
      await animation();
    } catch (error) {
      console.error('Animation failed:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  createFluidAnimations(transition: TransitionContext): Promise<void> {
    return new Promise((resolve) => {
      const animation = this.getTransitionAnimation(transition);
      this.queueAnimation(() => this.executeAnimation(animation, resolve));
    });
  }

  private getTransitionAnimation(transition: TransitionContext): TransitionAnimation {
    const animationMap: Record<string, TransitionAnimation> = {
      'small-fullscreen': {
        type: 'scale',
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        direction: 'up'
      },
      'fullscreen-canvas': {
        type: 'slide',
        duration: 500,
        easing: 'ease-out',
        direction: 'left'
      },
      'canvas-fullscreen': {
        type: 'slide',
        duration: 500,
        easing: 'ease-out',
        direction: 'right'
      },
      'small-canvas': {
        type: 'morph',
        duration: 600,
        easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)'
      }
    };

    const key = `${transition.fromMode}-${transition.toMode}`;
    return animationMap[key] || {
      type: 'fade',
      duration: 300,
      easing: 'ease-in-out'
    };
  }

  private queueAnimation(animationFn: () => Promise<void>): void {
    this.animationQueue.push(animationFn);
  }

  private async executeAnimation(animation: TransitionAnimation, resolve: () => void): Promise<void> {
    const element = document.body;
    
    switch (animation.type) {
      case 'fade':
        await this.fadeAnimation(element, animation);
        break;
      case 'slide':
        await this.slideAnimation(element, animation);
        break;
      case 'scale':
        await this.scaleAnimation(element, animation);
        break;
      case 'morph':
        await this.morphAnimation(element, animation);
        break;
    }
    
    resolve();
  }

  private async fadeAnimation(element: HTMLElement, config: TransitionAnimation): Promise<void> {
    element.style.transition = `opacity ${config.duration}ms ${config.easing}`;
    element.style.opacity = '0';
    
    await new Promise(resolve => setTimeout(resolve, config.duration / 2));
    
    element.style.opacity = '1';
    
    await new Promise(resolve => setTimeout(resolve, config.duration / 2));
    
    element.style.transition = '';
  }

  private async slideAnimation(element: HTMLElement, config: TransitionAnimation): Promise<void> {
    const direction = config.direction || 'left';
    const transform = this.getSlideTransform(direction);
    
    element.style.transition = `transform ${config.duration}ms ${config.easing}`;
    element.style.transform = transform;
    
    await new Promise(resolve => setTimeout(resolve, config.duration));
    
    element.style.transform = '';
    element.style.transition = '';
  }

  private async scaleAnimation(element: HTMLElement, config: TransitionAnimation): Promise<void> {
    element.style.transition = `transform ${config.duration}ms ${config.easing}`;
    element.style.transform = 'scale(0.95)';
    
    await new Promise(resolve => setTimeout(resolve, config.duration / 2));
    
    element.style.transform = 'scale(1.05)';
    
    await new Promise(resolve => setTimeout(resolve, config.duration / 4));
    
    element.style.transform = 'scale(1)';
    
    await new Promise(resolve => setTimeout(resolve, config.duration / 4));
    
    element.style.transition = '';
  }

  private async morphAnimation(element: HTMLElement, config: TransitionAnimation): Promise<void> {
    element.style.transition = `all ${config.duration}ms ${config.easing}`;
    element.style.borderRadius = '50%';
    element.style.transform = 'scale(0.8) rotate(180deg)';
    
    await new Promise(resolve => setTimeout(resolve, config.duration / 2));
    
    element.style.borderRadius = '0%';
    element.style.transform = 'scale(1) rotate(0deg)';
    
    await new Promise(resolve => setTimeout(resolve, config.duration / 2));
    
    element.style.transition = '';
  }

  private getSlideTransform(direction: string): string {
    switch (direction) {
      case 'left': return 'translateX(-100%)';
      case 'right': return 'translateX(100%)';
      case 'up': return 'translateY(-100%)';
      case 'down': return 'translateY(100%)';
      default: return 'translateX(-100%)';
    }
  }
}

class ContextualBridge extends EventEmitter {
  private bridges: Map<string, ContextBridge> = new Map();

  constructor() {
    super();
    this.setupDefaultBridges();
  }

  private setupDefaultBridges(): void {
    // Small to Fullscreen bridge
    this.registerBridge({
      id: 'small-fullscreen',
      sourceMode: 'small',
      targetMode: 'fullscreen',
      dataMapping: {
        'conversation': 'conversationHistory',
        'userInput': 'inputValue',
        'preferences': 'userPreferences'
      },
      transformations: [
        (data) => ({ ...data, isFullscreen: true }),
        (data) => ({ ...data, timestamp: Date.now() })
      ],
      validationRules: [
        (data) => data.conversation !== undefined,
        (data) => Array.isArray(data.conversation.messages)
      ]
    });

    // Fullscreen to Canvas bridge
    this.registerBridge({
      id: 'fullscreen-canvas',
      sourceMode: 'fullscreen',
      targetMode: 'canvas',
      dataMapping: {
        'conversationHistory': 'context',
        'activeTask': 'canvasTask',
        'userPreferences': 'canvasPreferences'
      },
      transformations: [
        (data) => ({ ...data, canvasMode: true }),
        (data) => ({ ...data, executionEnvironment: 'canvas' })
      ],
      validationRules: [
        (data) => data.context !== undefined
      ]
    });
  }

  bridgeContextualInformation(fromContext: any, toContext: any, fromMode: string, toMode: string): any {
    const bridgeId = `${fromMode}-${toMode}`;
    const bridge = this.bridges.get(bridgeId);
    
    if (!bridge) {
      console.warn(`No bridge found for ${bridgeId}, using direct mapping`);
      return { ...fromContext, ...toContext };
    }
    
    try {
      // Apply data mapping
      let mappedData = this.applyDataMapping(fromContext, bridge.dataMapping);
      
      // Apply transformations
      for (const transform of bridge.transformations) {
        mappedData = transform(mappedData);
      }
      
      // Validate result
      const isValid = bridge.validationRules.every(rule => rule(mappedData));
      if (!isValid) {
        throw new Error('Bridge validation failed');
      }
      
      return {
        sharedData: mappedData,
        continuityMarkers: {
          bridgeUsed: bridgeId,
          timestamp: Date.now(),
          validated: true
        }
      };
      
    } catch (error) {
      console.error('Context bridging failed:', error);
      return this.createFallbackBridge(fromContext, toContext);
    }
  }

  private applyDataMapping(data: any, mapping: Record<string, string>): any {
    const mapped: any = {};
    
    Object.entries(mapping).forEach(([sourceKey, targetKey]) => {
      if (data[sourceKey] !== undefined) {
        mapped[targetKey] = data[sourceKey];
      }
    });
    
    return { ...data, ...mapped };
  }

  private createFallbackBridge(fromContext: any, toContext: any): any {
    return {
      sharedData: {
        ...fromContext,
        ...toContext,
        fallbackUsed: true
      },
      continuityMarkers: {
        bridgeUsed: 'fallback',
        timestamp: Date.now(),
        validated: false
      }
    };
  }

  registerBridge(bridge: ContextBridge): void {
    this.bridges.set(bridge.id, bridge);
    this.emit('bridgeRegistered', bridge.id);
  }

  getBridge(bridgeId: string): ContextBridge | undefined {
    return this.bridges.get(bridgeId);
  }
}

export class ContextContinuityManager extends EventEmitter {
  private orchestrator: TransitionOrchestrator;
  private animationManager: AnimationManager;
  private contextualBridge: ContextualBridge;
  private continuityState: ContinuityState;
  private isInitialized = false;

  constructor() {
    super();
    
    this.orchestrator = new TransitionOrchestrator();
    this.animationManager = new AnimationManager();
    this.contextualBridge = new ContextualBridge();
    
    this.continuityState = {
      conversationFlow: {
        activeConversation: '',
        messageHistory: [],
        contextWindow: [],
        userPreferences: {},
        conversationMetadata: {}
      },
      taskProgression: {
        currentTask: '',
        taskStep: 0,
        taskData: {},
        progressMarkers: [],
        completionStatus: 0
      },
      collaborationState: {
        activeUsers: [],
        sharedElements: [],
        permissions: {},
        syncStatus: 'synced'
      },
      preferenceContext: {
        uiPreferences: {},
        accessibilitySettings: {},
        performanceSettings: {},
        customizations: {}
      }
    };
    
    this.initializeContinuityManager();
  }

  private initializeContinuityManager(): void {
    console.log('🔄 Context Continuity Manager - Initializing');
    
    this.setupEventHandlers();
    this.loadContinuityState();
    this.isInitialized = true;
    
    this.emit('initialized');
  }

  private setupEventHandlers(): void {
    // Orchestrator events
    this.orchestrator.on('transitionCompleted', (transition) => {
      this.emit('transitionCompleted', transition);
    });

    this.orchestrator.on('transitionFailed', (data) => {
      this.emit('transitionFailed', data);
    });

    // Animation events
    this.animationManager.on('animationCompleted', (animation) => {
      this.emit('animationCompleted', animation);
    });

    // Context bridge events
    this.contextualBridge.on('bridgeRegistered', (bridgeId) => {
      this.emit('bridgeRegistered', bridgeId);
    });
  }

  private loadContinuityState(): void {
    try {
      const saved = localStorage.getItem('context-continuity-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.continuityState = { ...this.continuityState, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load continuity state:', error);
    }
  }

  private saveContinuityState(): void {
    try {
      localStorage.setItem('context-continuity-state', JSON.stringify(this.continuityState));
    } catch (error) {
      console.error('Failed to save continuity state:', error);
    }
  }

  // Main continuity management methods
  maintainSeamlessExperience(): {
    conversationContinuity: () => void;
    taskContinuity: () => void;
    collaborationContinuity: () => void;
    preferenceContinuity: () => void;
  } {
    return {
      conversationContinuity: () => this.preserveConversationFlow(),
      taskContinuity: () => this.maintainTaskProgress(),
      collaborationContinuity: () => this.preserveCollaborationState(),
      preferenceContinuity: () => this.maintainUserPreferences()
    };
  }

  handleModeTransitions(): {
    animatedTransitions: () => void;
    contextBridging: () => void;
    statePreservation: () => void;
    userOrientationMaintenance: () => void;
  } {
    return {
      animatedTransitions: () => this.createFluidAnimations(),
      contextBridging: () => this.bridgeContextualInformation(),
      statePreservation: () => this.preserveCriticalState(),
      userOrientationMaintenance: () => this.maintainUserOrientation()
    };
  }

  // Implementation methods
  private preserveConversationFlow(): void {
    console.log('💬 Preserving conversation flow continuity');
    // Implementation for conversation preservation
  }

  private maintainTaskProgress(): void {
    console.log('📋 Maintaining task progression continuity');
    // Implementation for task continuity
  }

  private preserveCollaborationState(): void {
    console.log('🤝 Preserving collaboration state');
    // Implementation for collaboration continuity
  }

  private maintainUserPreferences(): void {
    console.log('⚙️ Maintaining user preference continuity');
    // Implementation for preference preservation
  }

  private createFluidAnimations(): void {
    console.log('✨ Creating fluid transition animations');
    // Animations are handled by AnimationManager
  }

  private bridgeContextualInformation(): void {
    console.log('🌉 Bridging contextual information');
    // Bridging is handled by ContextualBridge
  }

  private preserveCriticalState(): void {
    console.log('💾 Preserving critical state during transitions');
    this.saveContinuityState();
  }

  private maintainUserOrientation(): void {
    console.log('🧭 Maintaining user orientation');
    // Implementation for user guidance during transitions
  }

  // Public API methods
  async requestTransition(
    fromMode: 'small' | 'fullscreen' | 'canvas' | 'integrated',
    toMode: 'small' | 'fullscreen' | 'canvas' | 'integrated',
    trigger: 'user' | 'ai' | 'system' | 'automatic' = 'user',
    userIntent: string = ''
  ): Promise<void> {
    
    const transition: TransitionContext = {
      fromMode,
      toMode,
      trigger,
      timestamp: Date.now(),
      preservedElements: [],
      activeState: {},
      userIntent
    };

    this.orchestrator.queueTransition(transition);
    
    // Create transition animation
    await this.animationManager.createFluidAnimations(transition);
  }

  bridgeContext(fromContext: any, toContext: any, fromMode: string, toMode: string): any {
    return this.contextualBridge.bridgeContextualInformation(fromContext, toContext, fromMode, toMode);
  }

  updateContinuityState(updates: Partial<ContinuityState>): void {
    this.continuityState = { ...this.continuityState, ...updates };
    this.saveContinuityState();
    this.emit('continuityStateUpdated', this.continuityState);
  }

  getContinuityState(): ContinuityState {
    return { ...this.continuityState };
  }

  getTransitionStatus(): any {
    return this.orchestrator.getQueueStatus();
  }

  registerContextBridge(bridge: ContextBridge): void {
    this.contextualBridge.registerBridge(bridge);
  }

  // Status
  isReady(): boolean {
    return this.isInitialized;
  }

  destroy(): void {
    this.saveContinuityState();
    this.removeAllListeners();
    console.log('🔄 Context Continuity Manager destroyed');
  }
}

// Export singleton instance
export const contextContinuityManager = new ContextContinuityManager();
