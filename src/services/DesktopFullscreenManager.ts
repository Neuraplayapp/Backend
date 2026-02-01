// Desktop Fullscreen Manager - Multi-panel layout and advanced desktop features
// Based on technical architecture document specifications

import { EventEmitter } from 'events';

export interface DesktopLayout {
  type: 'single-panel' | 'dual-panel' | 'triple-panel' | 'quad-panel' | 'custom';
  panels: DesktopPanel[];
  splitterPositions: number[];
  orientation: 'horizontal' | 'vertical' | 'mixed';
  canResize: boolean;
  canReorder: boolean;
}

export interface DesktopPanel {
  id: string;
  type: 'assistant' | 'canvas' | 'preview' | 'tools' | 'inspector' | 'console';
  title: string;
  content: any;
  size: { width: number | string; height: number | string };
  position: { x: number; y: number };
  isVisible: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  canClose: boolean;
  canMinimize: boolean;
  canMaximize: boolean;
  zIndex: number;
}

export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  action: () => void;
  enabled: boolean;
  context: 'global' | 'canvas' | 'assistant' | 'panel';
}

export interface MultiMonitorConfig {
  enabled: boolean;
  primaryMonitor: ScreenDetails;
  secondaryMonitors: ScreenDetails[];
  canvasOnSecondary: boolean;
  assistantOnPrimary: boolean;
  extendedWorkspace: boolean;
}

export interface DesktopPreferences {
  defaultLayout: string;
  autoSaveLayout: boolean;
  snapToGrid: boolean;
  gridSize: number;
  theme: 'light' | 'dark' | 'system';
  shortcuts: KeyboardShortcut[];
  multiMonitor: MultiMonitorConfig;
  animations: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
}

interface LayoutState {
  currentLayout: DesktopLayout;
  savedLayouts: Map<string, DesktopLayout>;
  panelHistory: DesktopPanel[];
  activePanel: string | null;
  isFullscreen: boolean;
  isDragging: boolean;
  isResizing: boolean;
}

class LayoutManager extends EventEmitter {
  private state: LayoutState;
  private preferences: DesktopPreferences;

  constructor(preferences: DesktopPreferences) {
    super();
    this.preferences = preferences;
    this.state = {
      currentLayout: this.createDefaultLayout(),
      savedLayouts: new Map(),
      panelHistory: [],
      activePanel: null,
      isFullscreen: false,
      isDragging: false,
      isResizing: false
    };

    this.initializeLayout();
  }

  private initializeLayout(): void {
    console.log('🖥️ Desktop Layout Manager - Initializing');
    
    this.loadSavedLayouts();
    this.setupDefaultLayouts();
    this.bindLayoutEvents();
  }

  private createDefaultLayout(): DesktopLayout {
    return {
      type: 'dual-panel',
      panels: [
        {
          id: 'assistant-panel',
          type: 'assistant',
          title: 'AI Assistant',
          content: null,
          size: { width: '40%', height: '100%' },
          position: { x: 0, y: 0 },
          isVisible: true,
          isMinimized: false,
          isMaximized: false,
          canClose: false,
          canMinimize: true,
          canMaximize: true,
          zIndex: 1
        },
        {
          id: 'canvas-panel',
          type: 'canvas',
          title: 'Canvas Workspace',
          content: null,
          size: { width: '60%', height: '100%' },
          position: { x: 0, y: 0 },
          isVisible: true,
          isMinimized: false,
          isMaximized: false,
          canClose: false,
          canMinimize: true,
          canMaximized: true,
          zIndex: 2
        }
      ],
      splitterPositions: [40],
      orientation: 'horizontal',
      canResize: true,
      canReorder: true
    };
  }

  private loadSavedLayouts(): void {
    const saved = localStorage.getItem('desktop-layouts');
    if (saved) {
      try {
        const layouts = JSON.parse(saved);
        Object.entries(layouts).forEach(([name, layout]) => {
          this.state.savedLayouts.set(name, layout as DesktopLayout);
        });
      } catch (error) {
        console.error('Failed to load saved layouts:', error);
      }
    }
  }

  private setupDefaultLayouts(): void {
    // Code-focused layout
    const codeLayout: DesktopLayout = {
      type: 'triple-panel',
      panels: [
        { ...this.createPanel('editor-panel', 'canvas', 'Code Editor', { width: '50%', height: '70%' }) },
        { ...this.createPanel('preview-panel', 'preview', 'Live Preview', { width: '50%', height: '70%' }) },
        { ...this.createPanel('console-panel', 'console', 'Console', { width: '100%', height: '30%' }) }
      ],
      splitterPositions: [50, 70],
      orientation: 'mixed',
      canResize: true,
      canReorder: true
    };

    // Analysis layout
    const analysisLayout: DesktopLayout = {
      type: 'quad-panel',
      panels: [
        { ...this.createPanel('assistant-panel', 'assistant', 'AI Assistant', { width: '30%', height: '60%' }) },
        { ...this.createPanel('canvas-panel', 'canvas', 'Canvas', { width: '70%', height: '60%' }) },
        { ...this.createPanel('tools-panel', 'tools', 'Tools', { width: '30%', height: '40%' }) },
        { ...this.createPanel('inspector-panel', 'inspector', 'Inspector', { width: '70%', height: '40%' }) }
      ],
      splitterPositions: [30, 60],
      orientation: 'mixed',
      canResize: true,
      canReorder: true
    };

    this.state.savedLayouts.set('code-focused', codeLayout);
    this.state.savedLayouts.set('analysis', analysisLayout);
  }

  private createPanel(id: string, type: DesktopPanel['type'], title: string, size: { width: string; height: string }): DesktopPanel {
    return {
      id,
      type,
      title,
      content: null,
      size,
      position: { x: 0, y: 0 },
      isVisible: true,
      isMinimized: false,
      isMaximized: false,
      canClose: true,
      canMinimize: true,
      canMaximize: true,
      zIndex: 1
    };
  }

  private bindLayoutEvents(): void {
    this.on('panelResize', this.handlePanelResize.bind(this));
    this.on('panelMove', this.handlePanelMove.bind(this));
    this.on('panelClose', this.handlePanelClose.bind(this));
    this.on('layoutChange', this.handleLayoutChange.bind(this));
  }

  private handlePanelResize(panelId: string, newSize: { width: number; height: number }): void {
    const panel = this.findPanel(panelId);
    if (panel) {
      panel.size = { width: `${newSize.width}px`, height: `${newSize.height}px` };
      this.emit('panelUpdated', panel);
      this.autoSaveLayout();
    }
  }

  private handlePanelMove(panelId: string, newPosition: { x: number; y: number }): void {
    const panel = this.findPanel(panelId);
    if (panel) {
      panel.position = newPosition;
      this.emit('panelUpdated', panel);
      this.autoSaveLayout();
    }
  }

  private handlePanelClose(panelId: string): void {
    const panelIndex = this.state.currentLayout.panels.findIndex(p => p.id === panelId);
    if (panelIndex !== -1) {
      const panel = this.state.currentLayout.panels[panelIndex];
      this.state.panelHistory.push(panel);
      this.state.currentLayout.panels.splice(panelIndex, 1);
      this.emit('panelClosed', panel);
      this.autoSaveLayout();
    }
  }

  private handleLayoutChange(newLayout: DesktopLayout): void {
    this.state.currentLayout = newLayout;
    this.emit('layoutUpdated', newLayout);
    this.autoSaveLayout();
  }

  private findPanel(panelId: string): DesktopPanel | null {
    return this.state.currentLayout.panels.find(p => p.id === panelId) || null;
  }

  private autoSaveLayout(): void {
    if (this.preferences.autoSaveLayout) {
      this.saveLayout('auto-save');
    }
  }

  // Public API
  switchLayout(layoutName: string): boolean {
    const layout = this.state.savedLayouts.get(layoutName);
    if (layout) {
      this.state.currentLayout = JSON.parse(JSON.stringify(layout)); // Deep clone
      this.emit('layoutChanged', this.state.currentLayout);
      return true;
    }
    return false;
  }

  saveLayout(name: string): void {
    this.state.savedLayouts.set(name, JSON.parse(JSON.stringify(this.state.currentLayout)));
    this.persistLayouts();
    this.emit('layoutSaved', name);
  }

  private persistLayouts(): void {
    const layouts: Record<string, DesktopLayout> = {};
    this.state.savedLayouts.forEach((layout, name) => {
      layouts[name] = layout;
    });
    localStorage.setItem('desktop-layouts', JSON.stringify(layouts));
  }

  addPanel(panel: DesktopPanel): void {
    this.state.currentLayout.panels.push(panel);
    this.emit('panelAdded', panel);
    this.autoSaveLayout();
  }

  removePanel(panelId: string): boolean {
    const index = this.state.currentLayout.panels.findIndex(p => p.id === panelId);
    if (index !== -1) {
      const panel = this.state.currentLayout.panels.splice(index, 1)[0];
      this.state.panelHistory.push(panel);
      this.emit('panelRemoved', panel);
      this.autoSaveLayout();
      return true;
    }
    return false;
  }

  restorePanel(): DesktopPanel | null {
    const panel = this.state.panelHistory.pop();
    if (panel) {
      this.state.currentLayout.panels.push(panel);
      this.emit('panelRestored', panel);
      this.autoSaveLayout();
      return panel;
    }
    return null;
  }

  getCurrentLayout(): DesktopLayout {
    return this.state.currentLayout;
  }

  getSavedLayouts(): string[] {
    return Array.from(this.state.savedLayouts.keys());
  }

  enableMultiPanelView(): void {
    if (this.state.currentLayout.type === 'single-panel') {
      this.switchLayout('dual-panel');
    }
  }

  showAdvancedTools(): void {
    const toolsPanel = this.findPanel('tools-panel');
    if (!toolsPanel) {
      this.addPanel(this.createPanel('tools-panel', 'tools', 'Advanced Tools', { width: '300px', height: '400px' }));
    } else {
      toolsPanel.isVisible = true;
      this.emit('panelUpdated', toolsPanel);
    }
  }

  enableDetailedPreview(): void {
    const previewPanel = this.findPanel('preview-panel');
    if (!previewPanel) {
      this.addPanel(this.createPanel('preview-panel', 'preview', 'Detailed Preview', { width: '50%', height: '100%' }));
    } else {
      previewPanel.isVisible = true;
      previewPanel.isMaximized = true;
      this.emit('panelUpdated', previewPanel);
    }
  }

  supportMultipleViews(): void {
    // Create additional viewport for multi-view support
    const views = ['main-view', 'secondary-view', 'tertiary-view'];
    views.forEach((viewId, index) => {
      if (!this.findPanel(viewId)) {
        this.addPanel(this.createPanel(viewId, 'canvas', `View ${index + 1}`, { 
          width: '33%', 
          height: '100%' 
        }));
      }
    });
  }

  enableAdvancedCollaboration(): void {
    // Add collaboration panels
    const collabPanels = [
      { id: 'users-panel', type: 'tools' as const, title: 'Active Users' },
      { id: 'chat-panel', type: 'assistant' as const, title: 'Team Chat' },
      { id: 'activity-panel', type: 'inspector' as const, title: 'Activity Feed' }
    ];

    collabPanels.forEach(panelConfig => {
      if (!this.findPanel(panelConfig.id)) {
        this.addPanel(this.createPanel(
          panelConfig.id, 
          panelConfig.type, 
          panelConfig.title, 
          { width: '250px', height: '300px' }
        ));
      }
    });
  }
}

class KeyboardShortcutManager extends EventEmitter {
  private shortcuts: Map<string, KeyboardShortcut>;
  private pressedKeys: Set<string>;
  private isEnabled = true;

  constructor() {
    super();
    this.shortcuts = new Map();
    this.pressedKeys = new Set();
    this.initializeShortcuts();
  }

  private initializeShortcuts(): void {
    console.log('⌨️ Keyboard Shortcut Manager - Initializing');
    
    this.setupDefaultShortcuts();
    this.bindKeyboardEvents();
  }

  private setupDefaultShortcuts(): void {
    const defaultShortcuts: Omit<KeyboardShortcut, 'action'>[] = [
      { id: 'toggle-fullscreen', keys: ['F11'], description: 'Toggle fullscreen mode', enabled: true, context: 'global' },
      { id: 'new-panel', keys: ['Ctrl', 'Shift', 'N'], description: 'Create new panel', enabled: true, context: 'global' },
      { id: 'close-panel', keys: ['Ctrl', 'W'], description: 'Close active panel', enabled: true, context: 'panel' },
      { id: 'switch-layout', keys: ['Ctrl', 'Shift', 'L'], description: 'Switch layout', enabled: true, context: 'global' },
      { id: 'save-layout', keys: ['Ctrl', 'Shift', 'S'], description: 'Save current layout', enabled: true, context: 'global' },
      { id: 'restore-panel', keys: ['Ctrl', 'Shift', 'R'], description: 'Restore last closed panel', enabled: true, context: 'global' },
      { id: 'focus-assistant', keys: ['Ctrl', '1'], description: 'Focus assistant panel', enabled: true, context: 'global' },
      { id: 'focus-canvas', keys: ['Ctrl', '2'], description: 'Focus canvas panel', enabled: true, context: 'global' },
      { id: 'zoom-in', keys: ['Ctrl', '='], description: 'Zoom in', enabled: true, context: 'canvas' },
      { id: 'zoom-out', keys: ['Ctrl', '-'], description: 'Zoom out', enabled: true, context: 'canvas' },
      { id: 'reset-zoom', keys: ['Ctrl', '0'], description: 'Reset zoom', enabled: true, context: 'canvas' }
    ];

    defaultShortcuts.forEach(shortcut => {
      this.registerShortcut({
        ...shortcut,
        action: () => this.handleDefaultAction(shortcut.id)
      });
    });
  }

  private bindKeyboardEvents(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    document.addEventListener('blur', this.clearPressedKeys.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    const key = this.getKeyString(event);
    this.pressedKeys.add(key);

    // Check for matching shortcuts
    this.shortcuts.forEach(shortcut => {
      if (this.isShortcutPressed(shortcut)) {
        event.preventDefault();
        shortcut.action();
        this.emit('shortcutTriggered', shortcut.id);
      }
    });
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = this.getKeyString(event);
    this.pressedKeys.delete(key);
  }

  private clearPressedKeys(): void {
    this.pressedKeys.clear();
  }

  private getKeyString(event: KeyboardEvent): string {
    if (event.ctrlKey && event.key !== 'Control') return 'Ctrl';
    if (event.shiftKey && event.key !== 'Shift') return 'Shift';
    if (event.altKey && event.key !== 'Alt') return 'Alt';
    if (event.metaKey && event.key !== 'Meta') return 'Meta';
    
    return event.key;
  }

  private isShortcutPressed(shortcut: KeyboardShortcut): boolean {
    if (!shortcut.enabled) return false;
    if (shortcut.keys.length !== this.pressedKeys.size) return false;
    
    return shortcut.keys.every(key => this.pressedKeys.has(key));
  }

  private handleDefaultAction(actionId: string): void {
    this.emit('defaultAction', actionId);
  }

  // Public API
  registerShortcut(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
    this.emit('shortcutRegistered', shortcut.id);
  }

  unregisterShortcut(shortcutId: string): boolean {
    const removed = this.shortcuts.delete(shortcutId);
    if (removed) {
      this.emit('shortcutUnregistered', shortcutId);
    }
    return removed;
  }

  enableShortcut(shortcutId: string): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      shortcut.enabled = true;
      this.emit('shortcutEnabled', shortcutId);
    }
  }

  disableShortcut(shortcutId: string): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      shortcut.enabled = false;
      this.emit('shortcutDisabled', shortcutId);
    }
  }

  enable(): void {
    this.isEnabled = true;
    this.emit('shortcutsEnabled');
  }

  disable(): void {
    this.isEnabled = false;
    this.clearPressedKeys();
    this.emit('shortcutsDisabled');
  }

  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  activateAdvancedShortcuts(): void {
    console.log('⌨️ Activating advanced desktop shortcuts');
    
    const advancedShortcuts: Omit<KeyboardShortcut, 'action'>[] = [
      { id: 'multi-select', keys: ['Ctrl', 'Click'], description: 'Multi-select panels', enabled: true, context: 'global' },
      { id: 'snap-to-grid', keys: ['Ctrl', 'G'], description: 'Snap to grid', enabled: true, context: 'global' },
      { id: 'align-panels', keys: ['Ctrl', 'Shift', 'A'], description: 'Align selected panels', enabled: true, context: 'global' },
      { id: 'distribute-panels', keys: ['Ctrl', 'Shift', 'D'], description: 'Distribute panels evenly', enabled: true, context: 'global' }
    ];

    advancedShortcuts.forEach(shortcut => {
      this.registerShortcut({
        ...shortcut,
        action: () => this.emit('advancedAction', shortcut.id)
      });
    });
  }
}

class MultiMonitorManager extends EventEmitter {
  private config: MultiMonitorConfig;
  private screens: ScreenDetails[] = [];

  constructor(config: MultiMonitorConfig) {
    super();
    this.config = config;
    this.initializeMultiMonitor();
  }

  private async initializeMultiMonitor(): Promise<void> {
    console.log('🖥️ Multi-Monitor Manager - Initializing');
    
    if (!this.config.enabled) {
      console.log('🖥️ Multi-monitor support disabled');
      return;
    }

    try {
      await this.detectScreens();
      this.setupMonitorConfiguration();
    } catch (error) {
      console.error('Multi-monitor initialization failed:', error);
    }
  }

  private async detectScreens(): Promise<void> {
    if ('getScreenDetails' in window) {
      try {
        const screenDetails = await (window as any).getScreenDetails();
        this.screens = screenDetails.screens;
        this.emit('screensDetected', this.screens);
      } catch (error) {
        console.warn('Screen detection API not available:', error);
      }
    }
  }

  private setupMonitorConfiguration(): void {
    if (this.screens.length > 1) {
      console.log(`🖥️ Detected ${this.screens.length} monitors`);
      
      // Configure canvas on secondary monitor if enabled
      if (this.config.canvasOnSecondary && this.screens[1]) {
        this.moveCanvasToSecondaryMonitor();
      }
      
      this.emit('multiMonitorReady', this.screens.length);
    }
  }

  private moveCanvasToSecondaryMonitor(): void {
    console.log('🖥️ Moving canvas to secondary monitor');
    // Implementation would move canvas workspace to secondary screen
    this.emit('canvasMovedToSecondary');
  }

  // Public API
  getAvailableScreens(): ScreenDetails[] {
    return [...this.screens];
  }

  optimizeForMultiMonitor(): void {
    console.log('🖥️ Optimizing for multi-monitor setup');
    
    if (this.screens.length > 1) {
      // Enable extended workspace
      this.config.extendedWorkspace = true;
      
      // Configure dual monitor layout
      this.emit('layoutOptimized', {
        screens: this.screens.length,
        extendedWorkspace: this.config.extendedWorkspace
      });
    }
  }

  moveWindowToMonitor(windowId: string, monitorIndex: number): boolean {
    if (monitorIndex < this.screens.length) {
      console.log(`🖥️ Moving window ${windowId} to monitor ${monitorIndex}`);
      // Implementation would move window to specified monitor
      this.emit('windowMoved', { windowId, monitorIndex });
      return true;
    }
    return false;
  }
}

export class DesktopFullscreenManager extends EventEmitter {
  private layoutManager: LayoutManager;
  private keyboardManager: KeyboardShortcutManager;
  private multiMonitorManager: MultiMonitorManager;
  private preferences: DesktopPreferences;
  private isInitialized = false;

  constructor(preferences: Partial<DesktopPreferences> = {}) {
    super();
    
    this.preferences = {
      defaultLayout: preferences.defaultLayout || 'dual-panel',
      autoSaveLayout: preferences.autoSaveLayout ?? true,
      snapToGrid: preferences.snapToGrid ?? false,
      gridSize: preferences.gridSize || 20,
      theme: preferences.theme || 'system',
      shortcuts: preferences.shortcuts || [],
      multiMonitor: preferences.multiMonitor || {
        enabled: false,
        primaryMonitor: {} as ScreenDetails,
        secondaryMonitors: [],
        canvasOnSecondary: false,
        assistantOnPrimary: true,
        extendedWorkspace: false
      },
      animations: preferences.animations || {
        enabled: true,
        duration: 300,
        easing: 'ease-out'
      }
    };

    this.layoutManager = new LayoutManager(this.preferences);
    this.keyboardManager = new KeyboardShortcutManager();
    this.multiMonitorManager = new MultiMonitorManager(this.preferences.multiMonitor);
    
    this.initializeDesktopManager();
  }

  private initializeDesktopManager(): void {
    console.log('🖥️ Desktop Fullscreen Manager - Initializing');
    
    this.setupEventHandlers();
    this.loadUserPreferences();
    this.isInitialized = true;
    
    this.emit('initialized');
  }

  private setupEventHandlers(): void {
    // Layout Manager events
    this.layoutManager.on('layoutChanged', (layout) => {
      this.emit('layoutChanged', layout);
    });

    this.layoutManager.on('panelAdded', (panel) => {
      this.emit('panelAdded', panel);
    });

    // Keyboard Manager events
    this.keyboardManager.on('defaultAction', (actionId) => {
      this.handleKeyboardAction(actionId);
    });

    this.keyboardManager.on('advancedAction', (actionId) => {
      this.handleAdvancedKeyboardAction(actionId);
    });

    // Multi-Monitor Manager events
    this.multiMonitorManager.on('multiMonitorReady', (screenCount) => {
      this.emit('multiMonitorReady', screenCount);
    });
  }

  private loadUserPreferences(): void {
    const saved = localStorage.getItem('desktop-preferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        this.preferences = { ...this.preferences, ...prefs };
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    }
  }

  private handleKeyboardAction(actionId: string): void {
    switch (actionId) {
      case 'toggle-fullscreen':
        this.toggleFullscreen();
        break;
      case 'new-panel':
        this.createNewPanel();
        break;
      case 'switch-layout':
        this.cycleThroughLayouts();
        break;
      case 'save-layout':
        this.saveCurrentLayout();
        break;
      case 'restore-panel':
        this.restoreLastPanel();
        break;
      case 'focus-assistant':
        this.focusPanel('assistant-panel');
        break;
      case 'focus-canvas':
        this.focusPanel('canvas-panel');
        break;
      default:
        console.warn(`Unknown keyboard action: ${actionId}`);
    }
  }

  private handleAdvancedKeyboardAction(actionId: string): void {
    switch (actionId) {
      case 'snap-to-grid':
        this.snapToGrid();
        break;
      case 'align-panels':
        this.alignSelectedPanels();
        break;
      case 'distribute-panels':
        this.distributeSelectedPanels();
        break;
      default:
        console.warn(`Unknown advanced keyboard action: ${actionId}`);
    }
  }

  // Desktop-specific optimization methods
  optimizeForDesktop(): {
    multiPanelLayout: () => void;
    keyboardShortcuts: () => void;
    precisionEditing: () => void;
    dualMonitorSupport: () => void;
  } {
    return {
      multiPanelLayout: () => this.layoutManager.enableMultiPanelView(),
      keyboardShortcuts: () => this.keyboardManager.activateAdvancedShortcuts(),
      precisionEditing: () => this.enablePrecisionTools(),
      dualMonitorSupport: () => this.multiMonitorManager.optimizeForMultiMonitor()
    };
  }

  handleDesktopReformation(): {
    expandedToolset: () => void;
    detailedPreview: () => void;
    simultaneousViews: () => void;
    advancedCollaboration: () => void;
  } {
    return {
      expandedToolset: () => this.layoutManager.showAdvancedTools(),
      detailedPreview: () => this.layoutManager.enableDetailedPreview(),
      simultaneousViews: () => this.layoutManager.supportMultipleViews(),
      advancedCollaboration: () => this.layoutManager.enableAdvancedCollaboration()
    };
  }

  // Public API methods
  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  private createNewPanel(): void {
    const newPanel: DesktopPanel = {
      id: `panel-${Date.now()}`,
      type: 'tools',
      title: 'New Panel',
      content: null,
      size: { width: '300px', height: '400px' },
      position: { x: 100, y: 100 },
      isVisible: true,
      isMinimized: false,
      isMaximized: false,
      canClose: true,
      canMinimize: true,
      canMaximize: true,
      zIndex: 999
    };
    
    this.layoutManager.addPanel(newPanel);
  }

  private cycleThroughLayouts(): void {
    const layouts = this.layoutManager.getSavedLayouts();
    const currentIndex = layouts.indexOf(this.preferences.defaultLayout);
    const nextIndex = (currentIndex + 1) % layouts.length;
    this.layoutManager.switchLayout(layouts[nextIndex]);
  }

  private saveCurrentLayout(): void {
    const name = `layout-${Date.now()}`;
    this.layoutManager.saveLayout(name);
    this.emit('layoutSaved', name);
  }

  private restoreLastPanel(): void {
    const panel = this.layoutManager.restorePanel();
    if (panel) {
      this.emit('panelRestored', panel);
    }
  }

  private focusPanel(panelId: string): void {
    this.emit('focusPanel', panelId);
  }

  private snapToGrid(): void {
    if (this.preferences.snapToGrid) {
      this.emit('snapToGrid', this.preferences.gridSize);
    }
  }

  private alignSelectedPanels(): void {
    this.emit('alignSelectedPanels');
  }

  private distributeSelectedPanels(): void {
    this.emit('distributeSelectedPanels');
  }

  private enablePrecisionTools(): void {
    console.log('🎯 Enabling precision editing tools');
    this.emit('precisionToolsEnabled');
  }

  // Layout management
  switchToLayout(layoutName: string): boolean {
    return this.layoutManager.switchLayout(layoutName);
  }

  getCurrentLayout(): DesktopLayout {
    return this.layoutManager.getCurrentLayout();
  }

  addPanel(panel: DesktopPanel): void {
    this.layoutManager.addPanel(panel);
  }

  removePanel(panelId: string): boolean {
    return this.layoutManager.removePanel(panelId);
  }

  // Keyboard shortcuts
  registerShortcut(shortcut: KeyboardShortcut): void {
    this.keyboardManager.registerShortcut(shortcut);
  }

  enableKeyboardShortcuts(): void {
    this.keyboardManager.enable();
  }

  disableKeyboardShortcuts(): void {
    this.keyboardManager.disable();
  }

  // Multi-monitor support
  getAvailableMonitors(): ScreenDetails[] {
    return this.multiMonitorManager.getAvailableScreens();
  }

  moveToMonitor(windowId: string, monitorIndex: number): boolean {
    return this.multiMonitorManager.moveWindowToMonitor(windowId, monitorIndex);
  }

  // Preferences
  updatePreferences(newPreferences: Partial<DesktopPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    localStorage.setItem('desktop-preferences', JSON.stringify(this.preferences));
    this.emit('preferencesUpdated', this.preferences);
  }

  getPreferences(): DesktopPreferences {
    return { ...this.preferences };
  }

  // Status
  isReady(): boolean {
    return this.isInitialized;
  }

  destroy(): void {
    this.keyboardManager.disable();
    this.removeAllListeners();
    console.log('🖥️ Desktop Fullscreen Manager destroyed');
  }
}

// Export singleton instance
export const desktopFullscreenManager = new DesktopFullscreenManager();
