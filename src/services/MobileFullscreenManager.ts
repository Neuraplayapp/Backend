// Mobile Fullscreen Manager - Touch optimization and gesture navigation
// Based on technical architecture document specifications

import { EventEmitter } from 'events';

export interface TouchGesture {
  id: string;
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch' | 'rotate' | 'pan';
  fingers: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  action: () => void;
  enabled: boolean;
  sensitivity: number;
}

export interface MobileLayout {
  type: 'stacked' | 'tabbed' | 'overlay' | 'slide-over';
  orientation: 'portrait' | 'landscape';
  adaptiveBreakpoints: {
    small: number;
    medium: number;
    large: number;
  };
  compactMode: boolean;
  hiddenElements: string[];
}

export interface TouchOptimization {
  fingerFriendlyTargets: boolean;
  minimumTouchSize: number;
  touchFeedback: boolean;
  hapticFeedback: boolean;
  preventAccidentalTouches: boolean;
  edgeSwipeDetection: boolean;
}

export interface MobilePreferences {
  gestures: TouchGesture[];
  layout: MobileLayout;
  optimization: TouchOptimization;
  animations: {
    enabled: boolean;
    duration: number;
    easing: string;
    reducedMotion: boolean;
  };
  accessibility: {
    voiceOver: boolean;
    largeText: boolean;
    highContrast: boolean;
    reduceTransparency: boolean;
  };
}

interface TouchState {
  touches: TouchPoint[];
  isMultiTouch: boolean;
  gestureInProgress: boolean;
  lastGesture: string | null;
  touchStartTime: number;
  touchStartPosition: { x: number; y: number };
}

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

class GestureRecognizer extends EventEmitter {
  private gestures: Map<string, TouchGesture>;
  private touchState: TouchState;
  private gestureTimers: Map<string, NodeJS.Timeout>;

  constructor() {
    super();
    this.gestures = new Map();
    this.touchState = {
      touches: [],
      isMultiTouch: false,
      gestureInProgress: false,
      lastGesture: null,
      touchStartTime: 0,
      touchStartPosition: { x: 0, y: 0 }
    };
    this.gestureTimers = new Map();
    
    this.initializeGestureRecognition();
  }

  private initializeGestureRecognition(): void {
    console.log('👆 Gesture Recognizer - Initializing');
    
    this.setupDefaultGestures();
    this.bindTouchEvents();
  }

  private setupDefaultGestures(): void {
    const defaultGestures: Omit<TouchGesture, 'action'>[] = [
      { id: 'tap', type: 'tap', fingers: 1, enabled: true, sensitivity: 1 },
      { id: 'double-tap', type: 'double-tap', fingers: 1, enabled: true, sensitivity: 1 },
      { id: 'long-press', type: 'long-press', fingers: 1, enabled: true, sensitivity: 1 },
      { id: 'swipe-left', type: 'swipe', fingers: 1, direction: 'left', enabled: true, sensitivity: 1 },
      { id: 'swipe-right', type: 'swipe', fingers: 1, direction: 'right', enabled: true, sensitivity: 1 },
      { id: 'swipe-up', type: 'swipe', fingers: 1, direction: 'up', enabled: true, sensitivity: 1 },
      { id: 'swipe-down', type: 'swipe', fingers: 1, direction: 'down', enabled: true, sensitivity: 1 },
      { id: 'pinch-zoom', type: 'pinch', fingers: 2, enabled: true, sensitivity: 1 },
      { id: 'two-finger-tap', type: 'tap', fingers: 2, enabled: true, sensitivity: 1 },
      { id: 'three-finger-swipe-up', type: 'swipe', fingers: 3, direction: 'up', enabled: true, sensitivity: 1 }
    ];

    defaultGestures.forEach(gesture => {
      this.registerGesture({
        ...gesture,
        action: () => this.handleDefaultGesture(gesture.id)
      });
    });
  }

  private bindTouchEvents(): void {
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this));
  }

  private handleTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    const touchPoint: TouchPoint = {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      pressure: touch.force || 0.5,
      timestamp: Date.now()
    };

    this.touchState.touches = Array.from(event.touches).map(t => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
      pressure: t.force || 0.5,
      timestamp: Date.now()
    }));

    this.touchState.isMultiTouch = event.touches.length > 1;
    this.touchState.touchStartTime = Date.now();
    this.touchState.touchStartPosition = { x: touch.clientX, y: touch.clientY };

    // Start long press detection
    if (event.touches.length === 1) {
      this.startLongPressDetection();
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    if (this.touchState.gestureInProgress) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.touchState.touchStartPosition.x;
    const deltaY = touch.clientY - this.touchState.touchStartPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Cancel long press if moved too much
    if (distance > 10) {
      this.cancelLongPress();
    }

    // Detect swipe gestures
    if (distance > 50 && event.touches.length === 1) {
      this.detectSwipeGesture(deltaX, deltaY);
    }

    // Detect pinch gestures
    if (event.touches.length === 2) {
      this.detectPinchGesture(event);
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    const touchDuration = Date.now() - this.touchState.touchStartTime;
    
    // Cancel all gesture timers
    this.cancelAllGestureTimers();

    // Detect tap gestures
    if (touchDuration < 200 && !this.touchState.gestureInProgress) {
      this.detectTapGesture(event.changedTouches.length);
    }

    // Reset touch state
    this.touchState.gestureInProgress = false;
    this.touchState.touches = [];
    this.touchState.isMultiTouch = false;
  }

  private handleTouchCancel(event: TouchEvent): void {
    this.cancelAllGestureTimers();
    this.touchState.gestureInProgress = false;
    this.touchState.touches = [];
  }

  private startLongPressDetection(): void {
    const timer = setTimeout(() => {
      this.triggerGesture('long-press');
    }, 500);
    
    this.gestureTimers.set('long-press', timer);
  }

  private cancelLongPress(): void {
    const timer = this.gestureTimers.get('long-press');
    if (timer) {
      clearTimeout(timer);
      this.gestureTimers.delete('long-press');
    }
  }

  private cancelAllGestureTimers(): void {
    this.gestureTimers.forEach(timer => clearTimeout(timer));
    this.gestureTimers.clear();
  }

  private detectSwipeGesture(deltaX: number, deltaY: number): void {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    let direction: 'left' | 'right' | 'up' | 'down';
    
    if (absX > absY) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    const gestureId = this.touchState.touches.length === 3 ? 
      `three-finger-swipe-${direction}` : 
      `swipe-${direction}`;
    
    this.triggerGesture(gestureId);
  }

  private detectTapGesture(fingerCount: number): void {
    const gestureId = fingerCount === 2 ? 'two-finger-tap' : 'tap';
    
    // Check for double tap
    if (this.touchState.lastGesture === 'tap' && fingerCount === 1) {
      const timeSinceLastTap = Date.now() - this.touchState.touchStartTime;
      if (timeSinceLastTap < 300) {
        this.triggerGesture('double-tap');
        return;
      }
    }
    
    this.triggerGesture(gestureId);
  }

  private detectPinchGesture(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.triggerGesture('pinch-zoom');
    }
  }

  private triggerGesture(gestureId: string): void {
    const gesture = this.gestures.get(gestureId);
    if (gesture && gesture.enabled) {
      this.touchState.gestureInProgress = true;
      this.touchState.lastGesture = gestureId;
      gesture.action();
      this.emit('gestureTriggered', gestureId);
    }
  }

  private handleDefaultGesture(gestureId: string): void {
    this.emit('defaultGesture', gestureId);
  }

  // Public API
  registerGesture(gesture: TouchGesture): void {
    this.gestures.set(gesture.id, gesture);
    this.emit('gestureRegistered', gesture.id);
  }

  unregisterGesture(gestureId: string): boolean {
    const removed = this.gestures.delete(gestureId);
    if (removed) {
      this.emit('gestureUnregistered', gestureId);
    }
    return removed;
  }

  enableGesture(gestureId: string): void {
    const gesture = this.gestures.get(gestureId);
    if (gesture) {
      gesture.enabled = true;
      this.emit('gestureEnabled', gestureId);
    }
  }

  disableGesture(gestureId: string): void {
    const gesture = this.gestures.get(gestureId);
    if (gesture) {
      gesture.enabled = false;
      this.emit('gestureDisabled', gestureId);
    }
  }

  getGestures(): TouchGesture[] {
    return Array.from(this.gestures.values());
  }
}

class TouchOptimizer extends EventEmitter {
  private optimization: TouchOptimization;
  private touchTargets: Map<HTMLElement, { originalSize: number; optimized: boolean }>;

  constructor(optimization: TouchOptimization) {
    super();
    this.optimization = optimization;
    this.touchTargets = new Map();
    
    this.initializeTouchOptimization();
  }

  private initializeTouchOptimization(): void {
    console.log('📱 Touch Optimizer - Initializing');
    
    if (this.optimization.fingerFriendlyTargets) {
      this.optimizeTouchTargets();
    }
    
    if (this.optimization.touchFeedback) {
      this.enableTouchFeedback();
    }
    
    if (this.optimization.preventAccidentalTouches) {
      this.setupAccidentalTouchPrevention();
    }
  }

  private optimizeTouchTargets(): void {
    const elements = document.querySelectorAll('button, a, input, [role="button"]');
    
    elements.forEach(element => {
      const htmlElement = element as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      
      if (size < this.optimization.minimumTouchSize) {
        this.enlargeTouchTarget(htmlElement);
      }
    });
  }

  private enlargeTouchTarget(element: HTMLElement): void {
    const currentSize = Math.min(element.offsetWidth, element.offsetHeight);
    this.touchTargets.set(element, { originalSize: currentSize, optimized: true });
    
    const minSize = this.optimization.minimumTouchSize;
    element.style.minWidth = `${minSize}px`;
    element.style.minHeight = `${minSize}px`;
    element.style.padding = `${(minSize - currentSize) / 2}px`;
  }

  private enableTouchFeedback(): void {
    document.addEventListener('touchstart', (event) => {
      const target = event.target as HTMLElement;
      if (this.isTouchTarget(target)) {
        this.provideTouchFeedback(target);
      }
    });
  }

  private provideTouchFeedback(element: HTMLElement): void {
    // Visual feedback
    element.style.transform = 'scale(0.95)';
    element.style.opacity = '0.8';
    element.style.transition = 'all 0.1s ease';
    
    // Haptic feedback
    if (this.optimization.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    // Remove feedback after touch
    setTimeout(() => {
      element.style.transform = '';
      element.style.opacity = '';
    }, 150);
  }

  private setupAccidentalTouchPrevention(): void {
    let touchMoved = false;
    
    document.addEventListener('touchstart', () => {
      touchMoved = false;
    });
    
    document.addEventListener('touchmove', () => {
      touchMoved = true;
    });
    
    document.addEventListener('touchend', (event) => {
      if (touchMoved) {
        event.preventDefault();
      }
    });
  }

  private isTouchTarget(element: HTMLElement): boolean {
    const touchableElements = ['BUTTON', 'A', 'INPUT', 'TEXTAREA'];
    return touchableElements.includes(element.tagName) || 
           element.getAttribute('role') === 'button';
  }

  // Public API
  optimizeTouchInteractions(): void {
    console.log('📱 Optimizing touch interactions for mobile');
    this.optimizeTouchTargets();
  }

  compactUI(): string[] {
    console.log('📱 Enabling compact UI mode');
    return [
      'minimize-headers',
      'collapse-sidebars',
      'hide-decorative-elements',
      'stack-navigation'
    ];
  }

  enableContextualMenus(): void {
    console.log('📱 Enabling contextual menus');
    // Implementation for mobile-optimized context menus
  }
}

class MobileLayoutManager extends EventEmitter {
  private layout: MobileLayout;
  private currentOrientation: 'portrait' | 'landscape';

  constructor(layout: MobileLayout) {
    super();
    this.layout = layout;
    this.currentOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    
    this.initializeMobileLayout();
  }

  private initializeMobileLayout(): void {
    console.log('📱 Mobile Layout Manager - Initializing');
    
    this.setupOrientationHandling();
    this.setupResponsiveBreakpoints();
    this.applyMobileLayout();
  }

  private setupOrientationHandling(): void {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });
    
    window.addEventListener('resize', () => {
      this.handleViewportChange();
    });
  }

  private setupResponsiveBreakpoints(): void {
    const { small, medium, large } = this.layout.adaptiveBreakpoints;
    
    const mediaQueries = {
      small: window.matchMedia(`(max-width: ${small}px)`),
      medium: window.matchMedia(`(max-width: ${medium}px)`),
      large: window.matchMedia(`(max-width: ${large}px)`)
    };
    
    Object.entries(mediaQueries).forEach(([size, query]) => {
      query.addListener(() => {
        this.handleBreakpointChange(size as keyof typeof mediaQueries);
      });
    });
  }

  private applyMobileLayout(): void {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const newViewport = document.createElement('meta');
      newViewport.name = 'viewport';
      newViewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
      document.head.appendChild(newViewport);
    }
    
    document.body.classList.add(`layout-${this.layout.type}`);
    
    if (this.layout.compactMode) {
      document.body.classList.add('compact-mode');
    }
  }

  private handleOrientationChange(): void {
    const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    
    if (newOrientation !== this.currentOrientation) {
      this.currentOrientation = newOrientation;
      this.layout.orientation = newOrientation;
      
      this.emit('orientationChanged', newOrientation);
      this.adaptLayoutToOrientation();
    }
  }

  private handleViewportChange(): void {
    this.emit('viewportChanged', {
      width: window.innerWidth,
      height: window.innerHeight
    });
  }

  private handleBreakpointChange(size: string): void {
    this.emit('breakpointChanged', size);
    this.adaptLayoutToBreakpoint(size);
  }

  private adaptLayoutToOrientation(): void {
    if (this.currentOrientation === 'landscape') {
      this.enableLandscapeMode();
    } else {
      this.enablePortraitMode();
    }
  }

  private adaptLayoutToBreakpoint(size: string): void {
    document.body.className = document.body.className.replace(/breakpoint-\w+/g, '');
    document.body.classList.add(`breakpoint-${size}`);
  }

  private enableLandscapeMode(): void {
    console.log('📱 Switching to landscape mode');
    document.body.classList.add('landscape-mode');
    document.body.classList.remove('portrait-mode');
  }

  private enablePortraitMode(): void {
    console.log('📱 Switching to portrait mode');
    document.body.classList.add('portrait-mode');
    document.body.classList.remove('landscape-mode');
  }

  // Public API
  switchToTabbed(): void {
    this.layout.type = 'tabbed';
    this.applyMobileLayout();
  }

  switchToStacked(): void {
    this.layout.type = 'stacked';
    this.applyMobileLayout();
  }

  enableCompactMode(): void {
    this.layout.compactMode = true;
    document.body.classList.add('compact-mode');
  }

  disableCompactMode(): void {
    this.layout.compactMode = false;
    document.body.classList.remove('compact-mode');
  }

  getCurrentOrientation(): 'portrait' | 'landscape' {
    return this.currentOrientation;
  }

  getLayout(): MobileLayout {
    return { ...this.layout };
  }
}

export class MobileFullscreenManager extends EventEmitter {
  private gestureRecognizer: GestureRecognizer;
  private touchOptimizer: TouchOptimizer;
  private layoutManager: MobileLayoutManager;
  private preferences: MobilePreferences;
  private isInitialized = false;

  constructor(preferences: Partial<MobilePreferences> = {}) {
    super();
    
    this.preferences = {
      gestures: preferences.gestures || [],
      layout: preferences.layout || {
        type: 'stacked',
        orientation: 'portrait',
        adaptiveBreakpoints: { small: 576, medium: 768, large: 992 },
        compactMode: true,
        hiddenElements: []
      },
      optimization: preferences.optimization || {
        fingerFriendlyTargets: true,
        minimumTouchSize: 44,
        touchFeedback: true,
        hapticFeedback: true,
        preventAccidentalTouches: true,
        edgeSwipeDetection: true
      },
      animations: preferences.animations || {
        enabled: true,
        duration: 200,
        easing: 'ease-out',
        reducedMotion: false
      },
      accessibility: preferences.accessibility || {
        voiceOver: false,
        largeText: false,
        highContrast: false,
        reduceTransparency: false
      }
    };

    this.gestureRecognizer = new GestureRecognizer();
    this.touchOptimizer = new TouchOptimizer(this.preferences.optimization);
    this.layoutManager = new MobileLayoutManager(this.preferences.layout);
    
    this.initializeMobileManager();
  }

  private initializeMobileManager(): void {
    console.log('📱 Mobile Fullscreen Manager - Initializing');
    
    this.setupEventHandlers();
    this.loadMobilePreferences();
    this.isInitialized = true;
    
    this.emit('initialized');
  }

  private setupEventHandlers(): void {
    // Gesture Recognizer events
    this.gestureRecognizer.on('defaultGesture', (gestureId) => {
      this.handleDefaultGesture(gestureId);
    });

    // Layout Manager events
    this.layoutManager.on('orientationChanged', (orientation) => {
      this.emit('orientationChanged', orientation);
    });

    this.layoutManager.on('breakpointChanged', (size) => {
      this.emit('breakpointChanged', size);
    });
  }

  private loadMobilePreferences(): void {
    const saved = localStorage.getItem('mobile-preferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        this.preferences = { ...this.preferences, ...prefs };
      } catch (error) {
        console.error('Failed to load mobile preferences:', error);
      }
    }
  }

  private handleDefaultGesture(gestureId: string): void {
    switch (gestureId) {
      case 'swipe-left':
        this.handleSwipeLeft();
        break;
      case 'swipe-right':
        this.handleSwipeRight();
        break;
      case 'swipe-up':
        this.handleSwipeUp();
        break;
      case 'swipe-down':
        this.handleSwipeDown();
        break;
      case 'pinch-zoom':
        this.handlePinchZoom();
        break;
      case 'two-finger-tap':
        this.handleTwoFingerTap();
        break;
      case 'three-finger-swipe-up':
        this.handleThreeFingerSwipeUp();
        break;
      case 'long-press':
        this.handleLongPress();
        break;
      default:
        console.warn(`Unhandled gesture: ${gestureId}`);
    }
  }

  private handleSwipeLeft(): void {
    this.emit('swipeLeft');
  }

  private handleSwipeRight(): void {
    this.emit('swipeRight');
  }

  private handleSwipeUp(): void {
    this.emit('swipeUp');
  }

  private handleSwipeDown(): void {
    this.emit('swipeDown');
  }

  private handlePinchZoom(): void {
    this.emit('pinchZoom');
  }

  private handleTwoFingerTap(): void {
    this.emit('twoFingerTap');
  }

  private handleThreeFingerSwipeUp(): void {
    this.emit('fullscreenToggle');
  }

  private handleLongPress(): void {
    this.emit('contextMenu');
  }

  // Mobile-specific optimization methods
  optimizeForMobile(): {
    gestureNavigation: () => void;
    touchOptimization: () => void;
    compactUI: () => void;
    contextualMenus: () => void;
  } {
    return {
      gestureNavigation: () => this.enableFullscreenGestures(),
      touchOptimization: () => this.touchOptimizer.optimizeTouchInteractions(),
      compactUI: () => this.touchOptimizer.compactUI(),
      contextualMenus: () => this.touchOptimizer.enableContextualMenus()
    };
  }

  handleMobileReformation(): {
    swipeGestures: () => void;
    voiceIntegration: () => void;
    adaptiveKeyboard: () => void;
    quickActions: () => void;
  } {
    return {
      swipeGestures: () => this.enableSwipeEditing(),
      voiceIntegration: () => this.enableVoiceCommands(),
      adaptiveKeyboard: () => this.optimizeVirtualKeyboard(),
      quickActions: () => this.enableQuickActionGestures()
    };
  }

  private enableFullscreenGestures(): void {
    console.log('📱 Enabling fullscreen gesture navigation');
    
    const fullscreenGestures: Omit<TouchGesture, 'action'>[] = [
      { id: 'edge-swipe-left', type: 'swipe', fingers: 1, direction: 'left', enabled: true, sensitivity: 0.8 },
      { id: 'edge-swipe-right', type: 'swipe', fingers: 1, direction: 'right', enabled: true, sensitivity: 0.8 },
      { id: 'four-finger-tap', type: 'tap', fingers: 4, enabled: true, sensitivity: 1 }
    ];

    fullscreenGestures.forEach(gesture => {
      this.gestureRecognizer.registerGesture({
        ...gesture,
        action: () => this.emit('fullscreenGesture', gesture.id)
      });
    });
  }

  private enableSwipeEditing(): void {
    console.log('📱 Enabling swipe-based editing');
    // Implementation for swipe-based content editing
  }

  private enableVoiceCommands(): void {
    console.log('📱 Enabling voice command integration');
    // Implementation for voice command support
  }

  private optimizeVirtualKeyboard(): void {
    console.log('📱 Optimizing virtual keyboard experience');
    
    // Handle keyboard appearance/disappearance
    const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (viewport) {
      viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover';
    }
  }

  private enableQuickActionGestures(): void {
    console.log('📱 Enabling quick action gestures');
    
    const quickActions: Omit<TouchGesture, 'action'>[] = [
      { id: 'force-touch', type: 'long-press', fingers: 1, enabled: true, sensitivity: 1.5 },
      { id: 'corner-tap', type: 'tap', fingers: 1, enabled: true, sensitivity: 1 }
    ];

    quickActions.forEach(gesture => {
      this.gestureRecognizer.registerGesture({
        ...gesture,
        action: () => this.emit('quickAction', gesture.id)
      });
    });
  }

  // Public API methods
  registerGesture(gesture: TouchGesture): void {
    this.gestureRecognizer.registerGesture(gesture);
  }

  enableGesture(gestureId: string): void {
    this.gestureRecognizer.enableGesture(gestureId);
  }

  disableGesture(gestureId: string): void {
    this.gestureRecognizer.disableGesture(gestureId);
  }

  switchToPortrait(): void {
    this.layoutManager.enablePortraitMode();
  }

  switchToLandscape(): void {
    this.layoutManager.enableLandscapeMode();
  }

  enableCompactMode(): void {
    this.layoutManager.enableCompactMode();
  }

  disableCompactMode(): void {
    this.layoutManager.disableCompactMode();
  }

  getCurrentOrientation(): 'portrait' | 'landscape' {
    return this.layoutManager.getCurrentOrientation();
  }

  getGestures(): TouchGesture[] {
    return this.gestureRecognizer.getGestures();
  }

  updatePreferences(newPreferences: Partial<MobilePreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    localStorage.setItem('mobile-preferences', JSON.stringify(this.preferences));
    this.emit('preferencesUpdated', this.preferences);
  }

  getPreferences(): MobilePreferences {
    return { ...this.preferences };
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  destroy(): void {
    this.removeAllListeners();
    console.log('📱 Mobile Fullscreen Manager destroyed');
  }
}

// Export singleton instance
export const mobileFullscreenManager = new MobileFullscreenManager();
