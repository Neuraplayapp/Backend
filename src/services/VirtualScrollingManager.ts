// Virtual Scrolling Manager - Efficient rendering of large canvas content
// Based on technical architecture document specifications

import { EventEmitter } from 'events';

export interface VirtualScrollConfig {
  itemHeight: number | 'dynamic';
  itemWidth: number | 'dynamic';
  overscan: number; // Number of items to render outside viewport
  scrollDirection: 'vertical' | 'horizontal' | 'both';
  estimatedItemSize: number;
  bufferSize: number; // Buffer size for smoother scrolling
  useFixedItemSize: boolean;
  enableSmoothScrolling: boolean;
  scrollBehavior: 'auto' | 'smooth' | 'instant';
  threshold: {
    items: number; // Minimum items to enable virtualization
    totalHeight: number; // Minimum total height to enable virtualization
  };
}

export interface VirtualItem {
  index: number;
  key: string | number;
  size: number;
  offset: number;
  data: any;
  isVisible: boolean;
  isRendered: boolean;
  element?: HTMLElement;
  cached?: boolean;
}

export interface ViewportInfo {
  startIndex: number;
  endIndex: number;
  visibleItems: VirtualItem[];
  totalItems: number;
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  viewportWidth: number;
  totalHeight: number;
  totalWidth: number;
}

export interface ScrollState {
  scrollTop: number;
  scrollLeft: number;
  scrollDirection: 'up' | 'down' | 'left' | 'right' | 'none';
  velocity: number;
  isScrolling: boolean;
  lastScrollTime: number;
}

export interface ItemCache {
  measuredSizes: Map<number, { width: number; height: number }>;
  renderedElements: Map<number, HTMLElement>;
  offsetCache: Map<number, { top: number; left: number }>;
  maxCacheSize: number;
}

interface ScrollEvent {
  type: 'scroll' | 'scrollStart' | 'scrollEnd' | 'itemVisible' | 'itemHidden';
  viewport: ViewportInfo;
  scrollState: ScrollState;
  timestamp: number;
}

class ItemMeasurer extends EventEmitter {
  private measuredSizes = new Map<number, { width: number; height: number }>();
  private estimatedSize: number;
  private container: HTMLElement | null = null;

  constructor(estimatedSize: number) {
    super();
    this.estimatedSize = estimatedSize;
  }

  setContainer(container: HTMLElement): void {
    this.container = container;
  }

  measureItem(index: number, element: HTMLElement): { width: number; height: number } {
    const rect = element.getBoundingClientRect();
    const size = { width: rect.width, height: rect.height };
    
    this.measuredSizes.set(index, size);
    this.emit('itemMeasured', { index, size });
    
    return size;
  }

  getItemSize(index: number): { width: number; height: number } {
    const measured = this.measuredSizes.get(index);
    if (measured) return measured;

    // Return estimated size for unmeasured items
    return { width: this.estimatedSize, height: this.estimatedSize };
  }

  hasItemSize(index: number): boolean {
    return this.measuredSizes.has(index);
  }

  getAverageItemSize(): { width: number; height: number } {
    if (this.measuredSizes.size === 0) {
      return { width: this.estimatedSize, height: this.estimatedSize };
    }

    let totalWidth = 0;
    let totalHeight = 0;

    for (const size of this.measuredSizes.values()) {
      totalWidth += size.width;
      totalHeight += size.height;
    }

    return {
      width: totalWidth / this.measuredSizes.size,
      height: totalHeight / this.measuredSizes.size
    };
  }

  clearCache(): void {
    this.measuredSizes.clear();
    this.emit('cacheCleared');
  }

  getCacheSize(): number {
    return this.measuredSizes.size;
  }
}

class ViewportCalculator extends EventEmitter {
  private config: VirtualScrollConfig;
  private measurer: ItemMeasurer;

  constructor(config: VirtualScrollConfig, measurer: ItemMeasurer) {
    super();
    this.config = config;
    this.measurer = measurer;
  }

  calculateViewport(
    scrollState: ScrollState,
    containerSize: { width: number; height: number },
    totalItems: number
  ): ViewportInfo {
    
    const { scrollTop, scrollLeft } = scrollState;
    const { width: viewportWidth, height: viewportHeight } = containerSize;

    // Calculate item dimensions
    const averageItemSize = this.measurer.getAverageItemSize();
    const itemHeight = this.config.itemHeight === 'dynamic' ? averageItemSize.height : this.config.itemHeight;
    const itemWidth = this.config.itemWidth === 'dynamic' ? averageItemSize.width : this.config.itemWidth;

    // Calculate visible range with overscan
    let startIndex: number;
    let endIndex: number;
    let totalHeight: number;
    let totalWidth: number;

    if (this.config.scrollDirection === 'vertical' || this.config.scrollDirection === 'both') {
      startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - this.config.overscan);
      endIndex = Math.min(
        totalItems - 1,
        Math.ceil((scrollTop + viewportHeight) / itemHeight) + this.config.overscan
      );
      totalHeight = totalItems * itemHeight;
      totalWidth = itemWidth;
    } else {
      startIndex = Math.max(0, Math.floor(scrollLeft / itemWidth) - this.config.overscan);
      endIndex = Math.min(
        totalItems - 1,
        Math.ceil((scrollLeft + viewportWidth) / itemWidth) + this.config.overscan
      );
      totalHeight = itemHeight;
      totalWidth = totalItems * itemWidth;
    }

    // Create visible items
    const visibleItems: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const itemSize = this.measurer.getItemSize(i);
      const offset = this.calculateItemOffset(i, itemHeight, itemWidth);

      visibleItems.push({
        index: i,
        key: i,
        size: this.config.scrollDirection === 'vertical' ? itemSize.height : itemSize.width,
        offset: this.config.scrollDirection === 'vertical' ? offset.top : offset.left,
        data: null, // Will be populated by the consumer
        isVisible: true,
        isRendered: false
      });
    }

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalItems,
      scrollTop,
      scrollLeft,
      viewportHeight,
      viewportWidth,
      totalHeight,
      totalWidth
    };
  }

  private calculateItemOffset(index: number, itemHeight: number, itemWidth: number): { top: number; left: number } {
    if (this.config.useFixedItemSize) {
      // Fast calculation for fixed size items
      return {
        top: index * itemHeight,
        left: index * itemWidth
      };
    }

    // Calculate offset based on measured sizes
    let top = 0;
    let left = 0;

    for (let i = 0; i < index; i++) {
      const size = this.measurer.getItemSize(i);
      if (this.config.scrollDirection === 'vertical' || this.config.scrollDirection === 'both') {
        top += size.height;
      }
      if (this.config.scrollDirection === 'horizontal' || this.config.scrollDirection === 'both') {
        left += size.width;
      }
    }

    return { top, left };
  }

  updateConfig(updates: Partial<VirtualScrollConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }
}

class ScrollController extends EventEmitter {
  private container: HTMLElement;
  private config: VirtualScrollConfig;
  private scrollState: ScrollState;
  private isScrolling = false;
  private scrollEndTimer: NodeJS.Timeout | null = null;
  private lastScrollTime = 0;

  constructor(container: HTMLElement, config: VirtualScrollConfig) {
    super();
    this.container = container;
    this.config = config;
    this.scrollState = {
      scrollTop: 0,
      scrollLeft: 0,
      scrollDirection: 'none',
      velocity: 0,
      isScrolling: false,
      lastScrollTime: 0
    };

    this.setupScrollListeners();
  }

  private setupScrollListeners(): void {
    this.container.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    this.container.addEventListener('wheel', this.handleWheel.bind(this), { passive: true });
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
  }

  private handleScroll(event: Event): void {
    const now = Date.now();
    const target = event.target as HTMLElement;
    
    const previousScrollTop = this.scrollState.scrollTop;
    const previousScrollLeft = this.scrollState.scrollLeft;
    
    this.scrollState.scrollTop = target.scrollTop;
    this.scrollState.scrollLeft = target.scrollLeft;
    
    // Calculate scroll direction
    if (this.scrollState.scrollTop > previousScrollTop) {
      this.scrollState.scrollDirection = 'down';
    } else if (this.scrollState.scrollTop < previousScrollTop) {
      this.scrollState.scrollDirection = 'up';
    } else if (this.scrollState.scrollLeft > previousScrollLeft) {
      this.scrollState.scrollDirection = 'right';
    } else if (this.scrollState.scrollLeft < previousScrollLeft) {
      this.scrollState.scrollDirection = 'left';
    }

    // Calculate velocity
    const deltaTime = now - this.lastScrollTime;
    const deltaY = Math.abs(this.scrollState.scrollTop - previousScrollTop);
    const deltaX = Math.abs(this.scrollState.scrollLeft - previousScrollLeft);
    const delta = Math.max(deltaY, deltaX);
    
    this.scrollState.velocity = deltaTime > 0 ? delta / deltaTime : 0;
    this.scrollState.lastScrollTime = now;

    // Handle scroll start
    if (!this.isScrolling) {
      this.isScrolling = true;
      this.scrollState.isScrolling = true;
      this.emit('scrollStart', { scrollState: this.scrollState, timestamp: now });
    }

    // Emit scroll event
    this.emit('scroll', { scrollState: this.scrollState, timestamp: now });

    // Handle scroll end (debounced)
    if (this.scrollEndTimer) {
      clearTimeout(this.scrollEndTimer);
    }
    
    this.scrollEndTimer = setTimeout(() => {
      this.isScrolling = false;
      this.scrollState.isScrolling = false;
      this.scrollState.velocity = 0;
      this.emit('scrollEnd', { scrollState: this.scrollState, timestamp: Date.now() });
    }, 150);

    this.lastScrollTime = now;
  }

  private handleWheel(event: WheelEvent): void {
    // Handle wheel scrolling for smooth scrolling behavior
    if (this.config.enableSmoothScrolling) {
      this.applySmoothScrolling(event);
    }
  }

  private handleTouchStart(event: TouchEvent): void {
    // Handle touch start for mobile scrolling
    this.emit('touchScrollStart', { event, timestamp: Date.now() });
  }

  private handleTouchMove(event: TouchEvent): void {
    // Handle touch move for mobile scrolling
    this.emit('touchScrollMove', { event, timestamp: Date.now() });
  }

  private handleTouchEnd(event: TouchEvent): void {
    // Handle touch end for mobile scrolling
    this.emit('touchScrollEnd', { event, timestamp: Date.now() });
  }

  private applySmoothScrolling(event: WheelEvent): void {
    if (this.config.scrollBehavior === 'smooth') {
      event.preventDefault();
      
      const delta = event.deltaY;
      const targetScrollTop = this.scrollState.scrollTop + delta;
      
      this.container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  }

  scrollToIndex(index: number, behavior: ScrollBehavior = 'auto'): void {
    const itemHeight = this.config.itemHeight === 'dynamic' ? this.config.estimatedItemSize : this.config.itemHeight;
    const itemWidth = this.config.itemWidth === 'dynamic' ? this.config.estimatedItemSize : this.config.itemWidth;
    
    let scrollTop = 0;
    let scrollLeft = 0;

    if (this.config.scrollDirection === 'vertical' || this.config.scrollDirection === 'both') {
      scrollTop = index * itemHeight;
    }
    
    if (this.config.scrollDirection === 'horizontal' || this.config.scrollDirection === 'both') {
      scrollLeft = index * itemWidth;
    }

    this.container.scrollTo({
      top: scrollTop,
      left: scrollLeft,
      behavior
    });
  }

  scrollToOffset(offset: { top?: number; left?: number }, behavior: ScrollBehavior = 'auto'): void {
    this.container.scrollTo({
      top: offset.top || 0,
      left: offset.left || 0,
      behavior
    });
  }

  getScrollState(): ScrollState {
    return { ...this.scrollState };
  }

  destroy(): void {
    if (this.scrollEndTimer) {
      clearTimeout(this.scrollEndTimer);
    }
    
    this.container.removeEventListener('scroll', this.handleScroll.bind(this));
    this.container.removeEventListener('wheel', this.handleWheel.bind(this));
    this.container.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.container.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.container.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    
    this.removeAllListeners();
  }
}

class VirtualRenderer extends EventEmitter {
  private container: HTMLElement;
  private viewport: HTMLElement;
  private spacer: HTMLElement;
  private renderedItems = new Map<number, HTMLElement>();
  private itemRenderer: (item: VirtualItem) => HTMLElement;
  private config: VirtualScrollConfig;

  constructor(
    container: HTMLElement, 
    itemRenderer: (item: VirtualItem) => HTMLElement,
    config: VirtualScrollConfig
  ) {
    super();
    this.container = container;
    this.itemRenderer = itemRenderer;
    this.config = config;
    
    this.setupVirtualContainer();
  }

  private setupVirtualContainer(): void {
    // Create viewport container
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'relative';
    this.viewport.style.overflow = 'hidden';
    this.viewport.style.width = '100%';
    this.viewport.style.height = '100%';

    // Create spacer for total height/width
    this.spacer = document.createElement('div');
    this.spacer.style.position = 'absolute';
    this.spacer.style.top = '0';
    this.spacer.style.left = '0';
    this.spacer.style.width = '1px';
    this.spacer.style.height = '1px';
    this.spacer.style.pointerEvents = 'none';

    this.container.appendChild(this.viewport);
    this.viewport.appendChild(this.spacer);
  }

  renderItems(viewportInfo: ViewportInfo): void {
    // Remove items that are no longer visible
    this.cleanupHiddenItems(viewportInfo);

    // Render visible items
    viewportInfo.visibleItems.forEach(item => {
      if (!this.renderedItems.has(item.index)) {
        this.renderItem(item);
      } else {
        this.updateItemPosition(item);
      }
    });

    // Update spacer size
    this.updateSpacerSize(viewportInfo);

    this.emit('itemsRendered', {
      rendered: viewportInfo.visibleItems.length,
      total: viewportInfo.totalItems,
      viewport: viewportInfo
    });
  }

  private renderItem(item: VirtualItem): void {
    const element = this.itemRenderer(item);
    
    // Position the item
    element.style.position = 'absolute';
    element.style.top = `${item.offset}px`;
    element.style.left = '0px';
    element.style.width = '100%';
    
    // Add to DOM and cache
    this.viewport.appendChild(element);
    this.renderedItems.set(item.index, element);
    item.element = element;
    item.isRendered = true;

    this.emit('itemRendered', item);
  }

  private updateItemPosition(item: VirtualItem): void {
    const element = this.renderedItems.get(item.index);
    if (element) {
      element.style.top = `${item.offset}px`;
      item.element = element;
    }
  }

  private cleanupHiddenItems(viewportInfo: ViewportInfo): void {
    const visibleIndices = new Set(viewportInfo.visibleItems.map(item => item.index));
    const toRemove: number[] = [];

    this.renderedItems.forEach((element, index) => {
      if (!visibleIndices.has(index)) {
        element.remove();
        toRemove.push(index);
      }
    });

    toRemove.forEach(index => {
      this.renderedItems.delete(index);
      this.emit('itemRemoved', index);
    });
  }

  private updateSpacerSize(viewportInfo: ViewportInfo): void {
    if (this.config.scrollDirection === 'vertical' || this.config.scrollDirection === 'both') {
      this.spacer.style.height = `${viewportInfo.totalHeight}px`;
    }
    
    if (this.config.scrollDirection === 'horizontal' || this.config.scrollDirection === 'both') {
      this.spacer.style.width = `${viewportInfo.totalWidth}px`;
    }
  }

  getRenderedItems(): Map<number, HTMLElement> {
    return new Map(this.renderedItems);
  }

  getRenderedItemsCount(): number {
    return this.renderedItems.size;
  }

  destroy(): void {
    // Remove all rendered items
    this.renderedItems.forEach(element => element.remove());
    this.renderedItems.clear();
    
    // Remove virtual container
    if (this.viewport.parentNode) {
      this.viewport.parentNode.removeChild(this.viewport);
    }
    
    this.removeAllListeners();
  }
}

export class VirtualScrollingManager extends EventEmitter {
  private config: VirtualScrollConfig;
  private container: HTMLElement | null = null;
  private itemMeasurer: ItemMeasurer;
  private viewportCalculator: ViewportCalculator;
  private scrollController: ScrollController | null = null;
  private virtualRenderer: VirtualRenderer | null = null;
  private totalItems = 0;
  private itemRenderer: ((item: VirtualItem) => HTMLElement) | null = null;
  private isInitialized = false;
  private currentViewport: ViewportInfo | null = null;

  constructor(config: Partial<VirtualScrollConfig> = {}) {
    super();
    
    this.config = {
      itemHeight: config.itemHeight || 50,
      itemWidth: config.itemWidth || 'dynamic',
      overscan: config.overscan || 5,
      scrollDirection: config.scrollDirection || 'vertical',
      estimatedItemSize: config.estimatedItemSize || 50,
      bufferSize: config.bufferSize || 10,
      useFixedItemSize: config.useFixedItemSize ?? true,
      enableSmoothScrolling: config.enableSmoothScrolling ?? true,
      scrollBehavior: config.scrollBehavior || 'auto',
      threshold: {
        items: config.threshold?.items || 100,
        totalHeight: config.threshold?.totalHeight || 5000
      }
    };

    this.itemMeasurer = new ItemMeasurer(this.config.estimatedItemSize);
    this.viewportCalculator = new ViewportCalculator(this.config, this.itemMeasurer);
    
    this.initializeVirtualScrolling();
  }

  private initializeVirtualScrolling(): void {
    console.log('📜 Virtual Scrolling Manager - Initializing');
    
    this.setupEventHandlers();
    this.isInitialized = true;
    
    this.emit('initialized');
  }

  private setupEventHandlers(): void {
    this.itemMeasurer.on('itemMeasured', (data) => {
      this.handleItemMeasured(data);
    });

    this.viewportCalculator.on('configUpdated', (config) => {
      this.emit('configUpdated', config);
    });
  }

  private handleItemMeasured(data: { index: number; size: { width: number; height: number } }): void {
    // Recalculate viewport when item sizes change
    if (this.scrollController && this.container) {
      this.updateViewport();
    }
    
    this.emit('itemMeasured', data);
  }

  // Main virtual scrolling methods
  initialize(
    container: HTMLElement,
    totalItems: number,
    itemRenderer: (item: VirtualItem) => HTMLElement
  ): void {
    
    if (!this.shouldVirtualize(totalItems, container)) {
      console.log('📜 Virtual scrolling not needed, using normal rendering');
      this.emit('virtualizationSkipped', { totalItems, reason: 'below_threshold' });
      return;
    }

    console.log(`📜 Initializing virtual scrolling for ${totalItems} items`);
    
    this.container = container;
    this.totalItems = totalItems;
    this.itemRenderer = itemRenderer;

    // Setup container styles
    this.setupContainer();

    // Initialize components
    this.itemMeasurer.setContainer(container);
    this.scrollController = new ScrollController(container, this.config);
    this.virtualRenderer = new VirtualRenderer(container, itemRenderer, this.config);

    // Setup scroll event handlers
    this.setupScrollHandlers();

    // Initial render
    this.updateViewport();

    this.emit('virtualizationEnabled', { totalItems, container: container.id });
  }

  private shouldVirtualize(totalItems: number, container: HTMLElement): boolean {
    if (totalItems < this.config.threshold.items) {
      return false;
    }

    const estimatedTotalHeight = totalItems * this.config.estimatedItemSize;
    if (estimatedTotalHeight < this.config.threshold.totalHeight) {
      return false;
    }

    return true;
  }

  private setupContainer(): void {
    if (!this.container) return;

    // Ensure container is scrollable
    const computedStyle = window.getComputedStyle(this.container);
    
    if (computedStyle.overflow === 'visible') {
      this.container.style.overflow = 'auto';
    }

    if (computedStyle.position === 'static') {
      this.container.style.position = 'relative';
    }

    // Set scroll direction specific styles
    if (this.config.scrollDirection === 'horizontal') {
      this.container.style.overflowY = 'hidden';
      this.container.style.overflowX = 'auto';
    } else if (this.config.scrollDirection === 'vertical') {
      this.container.style.overflowY = 'auto';
      this.container.style.overflowX = 'hidden';
    }
  }

  private setupScrollHandlers(): void {
    if (!this.scrollController) return;

    this.scrollController.on('scroll', () => {
      this.updateViewport();
    });

    this.scrollController.on('scrollStart', (event) => {
      this.emit('scrollStart', event);
    });

    this.scrollController.on('scrollEnd', (event) => {
      this.emit('scrollEnd', event);
    });
  }

  private updateViewport(): void {
    if (!this.container || !this.scrollController || !this.virtualRenderer) return;

    const scrollState = this.scrollController.getScrollState();
    const containerSize = {
      width: this.container.clientWidth,
      height: this.container.clientHeight
    };

    // Calculate new viewport
    const newViewport = this.viewportCalculator.calculateViewport(
      scrollState,
      containerSize,
      this.totalItems
    );

    // Check if viewport changed significantly
    if (this.hasViewportChanged(newViewport)) {
      this.currentViewport = newViewport;
      
      // Render visible items
      this.virtualRenderer.renderItems(newViewport);
      
      // Emit viewport update
      this.emit('viewportUpdated', newViewport);
      
      // Handle item visibility changes
      this.handleItemVisibilityChanges(newViewport);
    }
  }

  private hasViewportChanged(newViewport: ViewportInfo): boolean {
    if (!this.currentViewport) return true;

    return (
      this.currentViewport.startIndex !== newViewport.startIndex ||
      this.currentViewport.endIndex !== newViewport.endIndex ||
      Math.abs(this.currentViewport.scrollTop - newViewport.scrollTop) > 1 ||
      Math.abs(this.currentViewport.scrollLeft - newViewport.scrollLeft) > 1
    );
  }

  private handleItemVisibilityChanges(viewport: ViewportInfo): void {
    // Emit events for newly visible items
    viewport.visibleItems.forEach(item => {
      if (!item.isVisible) {
        item.isVisible = true;
        this.emit('itemVisible', item);
      }
    });

    // Handle previously visible items that are now hidden
    if (this.currentViewport) {
      this.currentViewport.visibleItems.forEach(prevItem => {
        const stillVisible = viewport.visibleItems.some(item => item.index === prevItem.index);
        if (!stillVisible) {
          this.emit('itemHidden', prevItem);
        }
      });
    }
  }

  // Public API methods
  scrollToIndex(index: number, behavior: ScrollBehavior = 'auto'): void {
    if (!this.scrollController) {
      console.warn('📜 Virtual scrolling not initialized');
      return;
    }

    if (index < 0 || index >= this.totalItems) {
      console.warn(`📜 Index out of bounds: ${index} (total: ${this.totalItems})`);
      return;
    }

    this.scrollController.scrollToIndex(index, behavior);
  }

  scrollToOffset(offset: { top?: number; left?: number }, behavior: ScrollBehavior = 'auto'): void {
    if (!this.scrollController) {
      console.warn('📜 Virtual scrolling not initialized');
      return;
    }

    this.scrollController.scrollToOffset(offset, behavior);
  }

  updateTotalItems(newTotal: number): void {
    console.log(`📜 Updating total items: ${this.totalItems} → ${newTotal}`);
    
    this.totalItems = newTotal;
    
    // Check if we still need virtualization
    if (this.container && !this.shouldVirtualize(newTotal, this.container)) {
      this.destroy();
      this.emit('virtualizationDisabled', { reason: 'below_threshold' });
      return;
    }

    // Update viewport with new total
    this.updateViewport();
    
    this.emit('totalItemsUpdated', newTotal);
  }

  measureItem(index: number, element: HTMLElement): void {
    this.itemMeasurer.measureItem(index, element);
  }

  invalidateItemSize(index: number): void {
    // Force re-measurement of item
    if (this.itemMeasurer.hasItemSize(index)) {
      console.log(`📜 Invalidating size cache for item ${index}`);
      // Remove from cache (would need to implement in ItemMeasurer)
      this.updateViewport();
    }
  }

  // Virtual scrolling interface methods from technical document
  implementVirtualScrolling(): boolean {
    if (!this.isInitialized || !this.container) {
      return false;
    }

    console.log('📜 Virtual scrolling implementation active');
    return true;
  }

  // Configuration methods
  updateConfig(updates: Partial<VirtualScrollConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (this.viewportCalculator) {
      this.viewportCalculator.updateConfig(this.config);
    }
    
    // Re-initialize if container exists
    if (this.container && this.itemRenderer) {
      this.updateViewport();
    }
    
    this.emit('configUpdated', this.config);
  }

  getConfig(): VirtualScrollConfig {
    return { ...this.config };
  }

  // Status methods
  getCurrentViewport(): ViewportInfo | null {
    return this.currentViewport ? { ...this.currentViewport } : null;
  }

  getScrollState(): ScrollState | null {
    return this.scrollController ? this.scrollController.getScrollState() : null;
  }

  getRenderedItemsCount(): number {
    return this.virtualRenderer ? this.virtualRenderer.getRenderedItemsCount() : 0;
  }

  getStatus(): {
    initialized: boolean;
    virtualizationEnabled: boolean;
    totalItems: number;
    renderedItems: number;
    viewport: ViewportInfo | null;
    cacheSize: number;
  } {
    return {
      initialized: this.isInitialized,
      virtualizationEnabled: this.container !== null,
      totalItems: this.totalItems,
      renderedItems: this.getRenderedItemsCount(),
      viewport: this.currentViewport,
      cacheSize: this.itemMeasurer.getCacheSize()
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  isVirtualizationEnabled(): boolean {
    return this.container !== null && this.virtualRenderer !== null;
  }

  // Performance methods
  clearCache(): void {
    console.log('📜 Clearing virtual scrolling cache');
    this.itemMeasurer.clearCache();
    this.updateViewport();
    this.emit('cacheCleared');
  }

  getPerformanceMetrics(): {
    totalItems: number;
    renderedItems: number;
    renderRatio: number;
    cacheHitRate: number;
    averageItemSize: { width: number; height: number };
  } {
    const renderedItems = this.getRenderedItemsCount();
    const averageItemSize = this.itemMeasurer.getAverageItemSize();
    
    return {
      totalItems: this.totalItems,
      renderedItems,
      renderRatio: this.totalItems > 0 ? renderedItems / this.totalItems : 0,
      cacheHitRate: this.itemMeasurer.getCacheSize() / Math.max(this.totalItems, 1),
      averageItemSize
    };
  }

  destroy(): void {
    console.log('📜 Destroying virtual scrolling manager');
    
    // Destroy components
    if (this.scrollController) {
      this.scrollController.destroy();
      this.scrollController = null;
    }
    
    if (this.virtualRenderer) {
      this.virtualRenderer.destroy();
      this.virtualRenderer = null;
    }
    
    // Clear caches
    this.itemMeasurer.clearCache();
    
    // Reset state
    this.container = null;
    this.totalItems = 0;
    this.itemRenderer = null;
    this.currentViewport = null;
    
    this.removeAllListeners();
    this.emit('destroyed');
  }
}

// Export singleton instance
export const virtualScrollingManager = new VirtualScrollingManager();
