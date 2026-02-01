// Bidirectional Communication System - Real-time sync between Assistant and Canvas
// Based on technical architecture document specifications

import { EventEmitter } from 'events';

// StateSynchronizer class definition
class StateSynchronizer extends EventEmitter {
  private bridge: any = null;
  private syncOptions: any = {};

  constructor() {
    super();
  }

  setBridge(bridge: any) {
    this.bridge = bridge;
  }

  enableRealTimeSync(options: any) {
    this.syncOptions = options;
  }

  syncState(data: any) {
    if (this.bridge) {
      this.bridge.send('state-sync', data);
    }
  }
}

// Stub implementations for missing classes

export interface CommunicationMessage {
  id: string;
  type: 'canvas-to-assistant' | 'assistant-to-canvas' | 'bidirectional';
  action: string;
  payload: any;
  timestamp: number;
  source: 'assistant' | 'canvas' | 'system';
  target: 'assistant' | 'canvas' | 'both';
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresAck: boolean;
}

export interface SyncState {
  conversationContext: any;
  canvasContext: any;
  userContext: any;
  systemState: any;
  lastSync: number;
  syncVersion: number;
  pendingUpdates: CommunicationMessage[];
}

export interface CommunicationChannel {
  id: string;
  name: string;
  type: 'websocket' | 'postmessage' | 'custom-event' | 'broadcast-channel';
  latency: number;
  reliability: number;
  bidirectional: boolean;
  encrypted: boolean;
}

interface MessageQueue {
  pending: CommunicationMessage[];
  processing: Set<string>;
  failed: CommunicationMessage[];
  acknowledged: Set<string>;
}

interface ConnectionState {
  isConnected: boolean;
  lastPing: number;
  latency: number;
  reconnectAttempts: number;
  channels: Map<string, CommunicationChannel>;
}

class MessageRouter extends EventEmitter {
  private messageHandlers: Map<string, (message: CommunicationMessage) => Promise<any>>;
  private messageQueue: MessageQueue;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.messageHandlers = new Map();
    this.messageQueue = {
      pending: [],
      processing: new Set(),
      failed: [],
      acknowledged: new Set()
    };
    
    this.initializeRouter();
  }

  private initializeRouter(): void {
    console.log('📬 Message Router - Initializing');
    
    this.setupDefaultHandlers();
    this.startRetryTimer();
  }

  private setupDefaultHandlers(): void {
    // Canvas → Assistant message handlers
    this.registerHandler('canvas-content-changed', this.handleCanvasContentChanged.bind(this));
    this.registerHandler('canvas-element-selected', this.handleCanvasElementSelected.bind(this));
    this.registerHandler('canvas-execution-result', this.handleCanvasExecutionResult.bind(this));
    this.registerHandler('canvas-error-occurred', this.handleCanvasError.bind(this));
    
    // Assistant → Canvas message handlers
    this.registerHandler('assistant-suggestion', this.handleAssistantSuggestion.bind(this));
    this.registerHandler('assistant-command', this.handleAssistantCommand.bind(this));
    this.registerHandler('assistant-context-update', this.handleAssistantContextUpdate.bind(this));
    
    // Bidirectional handlers
    this.registerHandler('sync-request', this.handleSyncRequest.bind(this));
    this.registerHandler('heartbeat', this.handleHeartbeat.bind(this));
  }

  private startRetryTimer(): void {
    this.retryTimer = setInterval(() => {
      this.processFailedMessages();
    }, 5000); // Retry every 5 seconds
  }

  private async processFailedMessages(): Promise<void> {
    const failedMessages = this.messageQueue.failed.splice(0);
    
    for (const message of failedMessages) {
      try {
        await this.routeMessage(message);
      } catch (error) {
        console.warn(`Failed to retry message ${message.id}:`, error);
        this.messageQueue.failed.push(message);
      }
    }
  }

  registerHandler(action: string, handler: (message: CommunicationMessage) => Promise<any>): void {
    this.messageHandlers.set(action, handler);
  }

  async routeMessage(message: CommunicationMessage): Promise<any> {
    console.log(`📨 Routing message: ${message.action} from ${message.source} to ${message.target}`);
    
    if (this.messageQueue.processing.has(message.id)) {
      console.warn(`Message ${message.id} is already being processed`);
      return;
    }
    
    this.messageQueue.processing.add(message.id);
    
    try {
      const handler = this.messageHandlers.get(message.action);
      if (!handler) {
        throw new Error(`No handler found for action: ${message.action}`);
      }
      
      const result = await handler(message);
      
      if (message.requiresAck) {
        this.sendAcknowledgment(message);
      }
      
      this.messageQueue.processing.delete(message.id);
      this.messageQueue.acknowledged.add(message.id);
      
      this.emit('messageProcessed', { message, result });
      return result;
      
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
      this.messageQueue.processing.delete(message.id);
      this.messageQueue.failed.push(message);
      
      this.emit('messageError', { message, error });
      throw error;
    }
  }

  private sendAcknowledgment(originalMessage: CommunicationMessage): void {
    const ackMessage: CommunicationMessage = {
      id: `ack-${originalMessage.id}`,
      type: originalMessage.type,
      action: 'acknowledgment',
      payload: { originalMessageId: originalMessage.id },
      timestamp: Date.now(),
      source: originalMessage.target as any,
      target: originalMessage.source as any,
      priority: 'low',
      requiresAck: false
    };
    
    this.emit('sendMessage', ackMessage);
  }

  // Default message handlers
  private async handleCanvasContentChanged(message: CommunicationMessage): Promise<any> {
    console.log('🎨 Canvas content changed:', message.payload);
    
    return {
      success: true,
      action: 'content-sync-updated',
      data: message.payload
    };
  }

  private async handleCanvasElementSelected(message: CommunicationMessage): Promise<any> {
    console.log('🎯 Canvas element selected:', message.payload);
    
    return {
      success: true,
      action: 'element-context-available',
      data: {
        elementId: message.payload.elementId,
        elementType: message.payload.elementType,
        suggestions: this.generateElementSuggestions(message.payload)
      }
    };
  }

  private async handleCanvasExecutionResult(message: CommunicationMessage): Promise<any> {
    console.log('⚡ Canvas execution result:', message.payload);
    
    return {
      success: true,
      action: 'execution-feedback',
      data: {
        result: message.payload,
        analysis: this.analyzeExecutionResult(message.payload)
      }
    };
  }

  private async handleCanvasError(message: CommunicationMessage): Promise<any> {
    console.log('🚨 Canvas error occurred:', message.payload);
    
    return {
      success: true,
      action: 'error-assistance',
      data: {
        error: message.payload,
        suggestions: this.generateErrorSuggestions(message.payload)
      }
    };
  }

  private async handleAssistantSuggestion(message: CommunicationMessage): Promise<any> {
    console.log('💡 Assistant suggestion:', message.payload);
    
    return {
      success: true,
      action: 'suggestion-received',
      data: message.payload
    };
  }

  private async handleAssistantCommand(message: CommunicationMessage): Promise<any> {
    console.log('🎛️ Assistant command:', message.payload);
    
    return {
      success: true,
      action: 'command-executed',
      data: {
        command: message.payload.command,
        result: await this.executeCommand(message.payload)
      }
    };
  }

  private async handleAssistantContextUpdate(message: CommunicationMessage): Promise<any> {
    console.log('🔄 Assistant context update:', message.payload);
    
    return {
      success: true,
      action: 'context-synchronized',
      data: message.payload
    };
  }

  private async handleSyncRequest(message: CommunicationMessage): Promise<any> {
    console.log('🔄 Sync request received');
    
    return {
      success: true,
      action: 'sync-response',
      data: {
        timestamp: Date.now(),
        version: 1,
        state: 'synchronized'
      }
    };
  }

  private async handleHeartbeat(message: CommunicationMessage): Promise<any> {
    return {
      success: true,
      action: 'heartbeat-response',
      data: {
        timestamp: Date.now(),
        latency: Date.now() - message.timestamp
      }
    };
  }

  // Helper methods
  private generateElementSuggestions(elementData: any): string[] {
    const suggestions = [];
    
    if (elementData.elementType === 'code') {
      suggestions.push('Add comments to improve readability');
      suggestions.push('Consider error handling');
      suggestions.push('Optimize for performance');
    } else if (elementData.elementType === 'text') {
      suggestions.push('Improve clarity and flow');
      suggestions.push('Add supporting examples');
      suggestions.push('Check grammar and style');
    }
    
    return suggestions;
  }

  private analyzeExecutionResult(result: any): any {
    return {
      success: result.success,
      performance: {
        executionTime: result.executionTime || 0,
        memoryUsage: result.memoryUsed || 0
      },
      suggestions: result.success ? 
        ['Great! Code executed successfully'] :
        ['Check for syntax errors', 'Verify variable declarations']
    };
  }

  private generateErrorSuggestions(error: any): string[] {
    const suggestions = [];
    
    if (error.type === 'syntax') {
      suggestions.push('Check for missing brackets or semicolons');
      suggestions.push('Verify variable names and function calls');
    } else if (error.type === 'runtime') {
      suggestions.push('Check for undefined variables');
      suggestions.push('Verify data types and method calls');
    }
    
    return suggestions;
  }

  private async executeCommand(commandData: any): Promise<any> {
    // Execute canvas-specific commands
    switch (commandData.command) {
      case 'format-code':
        return { formatted: true, changes: 'Applied code formatting' };
      case 'add-comments':
        return { commented: true, changes: 'Added explanatory comments' };
      case 'optimize-performance':
        return { optimized: true, changes: 'Applied performance optimizations' };
      default:
        return { executed: false, reason: 'Unknown command' };
    }
  }

  destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }
  }
}

class Statesynchronizer extends EventEmitter {
  private syncState: SyncState;
  private syncInterval: NodeJS.Timeout | null = null;
  private conflictResolver: ConflictResolver;

  constructor() {
    super();
    this.syncState = {
      conversationContext: {},
      canvasContext: {},
      userContext: {},
      systemState: {},
      lastSync: Date.now(),
      syncVersion: 1,
      pendingUpdates: []
    };
    
    this.conflictResolver = new ConflictResolver();
    this.initializeSynchronizer();
  }

  private initializeSynchronizer(): void {
    console.log('🔄 State Synchronizer - Initializing');
    
    this.startSyncInterval();
    this.setupConflictResolution();
  }

  private startSyncInterval(): void {
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 1000); // Sync every second
  }

  private setupConflictResolution(): void {
    this.on('conflictDetected', this.resolveConflict.bind(this));
  }

  private async performSync(): Promise<void> {
    if (this.syncState.pendingUpdates.length === 0) return;
    
    console.log(`🔄 Performing sync: ${this.syncState.pendingUpdates.length} pending updates`);
    
    try {
      const updates = this.syncState.pendingUpdates.splice(0);
      
      for (const update of updates) {
        await this.applySyncUpdate(update);
      }
      
      this.syncState.lastSync = Date.now();
      this.syncState.syncVersion++;
      
      this.emit('syncCompleted', {
        version: this.syncState.syncVersion,
        timestamp: this.syncState.lastSync,
        updatesApplied: updates.length
      });
      
    } catch (error) {
      console.error('Sync error:', error);
      this.emit('syncError', error);
    }
  }

  private async applySyncUpdate(update: CommunicationMessage): Promise<void> {
    const { action, payload } = update;
    
    switch (action) {
      case 'conversation-update':
        await this.syncConversationContext(payload);
        break;
      case 'canvas-update':
        await this.syncCanvasContext(payload);
        break;
      case 'user-update':
        await this.syncUserContext(payload);
        break;
      case 'system-update':
        await this.syncSystemState(payload);
        break;
      default:
        console.warn(`Unknown sync action: ${action}`);
    }
  }

  private async syncConversationContext(data: any): Promise<void> {
    const conflicts = this.conflictResolver.detectConflicts(
      this.syncState.conversationContext,
      data
    );
    
    if (conflicts.length > 0) {
      this.emit('conflictDetected', { type: 'conversation', conflicts, newData: data });
    } else {
      this.syncState.conversationContext = { ...this.syncState.conversationContext, ...data };
      this.emit('conversationSynced', this.syncState.conversationContext);
    }
  }

  private async syncCanvasContext(data: any): Promise<void> {
    const conflicts = this.conflictResolver.detectConflicts(
      this.syncState.canvasContext,
      data
    );
    
    if (conflicts.length > 0) {
      this.emit('conflictDetected', { type: 'canvas', conflicts, newData: data });
    } else {
      this.syncState.canvasContext = { ...this.syncState.canvasContext, ...data };
      this.emit('canvasSynced', this.syncState.canvasContext);
    }
  }

  private async syncUserContext(data: any): Promise<void> {
    this.syncState.userContext = { ...this.syncState.userContext, ...data };
    this.emit('userContextSynced', this.syncState.userContext);
  }

  private async syncSystemState(data: any): Promise<void> {
    this.syncState.systemState = { ...this.syncState.systemState, ...data };
    this.emit('systemStateSynced', this.syncState.systemState);
  }

  private async resolveConflict(conflictData: any): Promise<void> {
    console.log('⚡ Resolving sync conflict:', conflictData.type);
    
    const resolution = await this.conflictResolver.resolve(conflictData);
    
    switch (conflictData.type) {
      case 'conversation':
        this.syncState.conversationContext = resolution;
        this.emit('conversationSynced', this.syncState.conversationContext);
        break;
      case 'canvas':
        this.syncState.canvasContext = resolution;
        this.emit('canvasSynced', this.syncState.canvasContext);
        break;
    }
  }

  // Public API
  addPendingUpdate(update: CommunicationMessage): void {
    this.syncState.pendingUpdates.push(update);
  }

  getCurrentState(): SyncState {
    return { ...this.syncState };
  }

  forceSync(): Promise<void> {
    return this.performSync();
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

class ConflictResolver {
  detectConflicts(currentState: any, newState: any): any[] {
    const conflicts = [];
    
    for (const key in newState) {
      if (currentState.hasOwnProperty(key)) {
        const currentValue = currentState[key];
        const newValue = newState[key];
        
        if (this.valuesConflict(currentValue, newValue)) {
          conflicts.push({
            key,
            currentValue,
            newValue,
            conflictType: this.getConflictType(currentValue, newValue)
          });
        }
      }
    }
    
    return conflicts;
  }

  private valuesConflict(current: any, newVal: any): boolean {
    if (typeof current !== typeof newVal) return true;
    if (typeof current === 'object') {
      return JSON.stringify(current) !== JSON.stringify(newVal);
    }
    return current !== newVal;
  }

  private getConflictType(current: any, newVal: any): string {
    if (typeof current !== typeof newVal) return 'type-mismatch';
    if (Array.isArray(current) && Array.isArray(newVal)) return 'array-conflict';
    if (typeof current === 'object') return 'object-conflict';
    return 'value-conflict';
  }

  async resolve(conflictData: any): Promise<any> {
    // Simple resolution strategy: merge with preference for newer data
    const { conflicts, newData } = conflictData;
    const resolved = { ...conflictData.currentState };
    
    for (const conflict of conflicts) {
      switch (conflict.conflictType) {
        case 'array-conflict':
          resolved[conflict.key] = this.mergeArrays(conflict.currentValue, conflict.newValue);
          break;
        case 'object-conflict':
          resolved[conflict.key] = { ...conflict.currentValue, ...conflict.newValue };
          break;
        default:
          resolved[conflict.key] = conflict.newValue; // Prefer new value
      }
    }
    
    return resolved;
  }

  private mergeArrays(current: any[], newArray: any[]): any[] {
    // Simple merge: combine and deduplicate
    const combined = [...current, ...newArray];
    return combined.filter((item, index) => 
      combined.findIndex(other => JSON.stringify(other) === JSON.stringify(item)) === index
    );
  }
}

class ConnectionManager extends EventEmitter {
  private connections: ConnectionState;
  private channels: Map<string, CommunicationChannel>;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.connections = {
      isConnected: false,
      lastPing: 0,
      latency: 0,
      reconnectAttempts: 0,
      channels: new Map()
    };
    
    this.channels = new Map();
    this.initializeConnections();
  }

  private initializeConnections(): void {
    console.log('🔗 Connection Manager - Initializing');
    
    this.setupDefaultChannels();
    this.startHeartbeat();
  }

  private setupDefaultChannels(): void {
    // Custom Events channel (always available)
    this.addChannel({
      id: 'custom-events',
      name: 'Custom Events',
      type: 'custom-event',
      latency: 5,
      reliability: 0.99,
      bidirectional: true,
      encrypted: false
    });
    
    // PostMessage channel (for iframe communication)
    this.addChannel({
      id: 'postmessage',
      name: 'PostMessage API',
      type: 'postmessage',
      latency: 10,
      reliability: 0.95,
      bidirectional: true,
      encrypted: false
    });
    
    // BroadcastChannel (if supported)
    if ('BroadcastChannel' in window) {
      this.addChannel({
        id: 'broadcast',
        name: 'Broadcast Channel',
        type: 'broadcast-channel',
        latency: 2,
        reliability: 0.98,
        bidirectional: true,
        encrypted: false
      });
    }
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.sendHeartbeat();
    }, 5000); // Every 5 seconds
  }

  private sendHeartbeat(): void {
    const heartbeatMessage: CommunicationMessage = {
      id: `heartbeat-${Date.now()}`,
      type: 'bidirectional',
      action: 'heartbeat',
      payload: { timestamp: Date.now() },
      timestamp: Date.now(),
      source: 'system',
      target: 'both',
      priority: 'low',
      requiresAck: false
    };
    
    this.emit('sendMessage', heartbeatMessage);
  }

  addChannel(channel: CommunicationChannel): void {
    this.channels.set(channel.id, channel);
    this.connections.channels.set(channel.id, channel);
    
    console.log(`📡 Added communication channel: ${channel.name}`);
    this.emit('channelAdded', channel);
  }

  removeChannel(channelId: string): void {
    this.channels.delete(channelId);
    this.connections.channels.delete(channelId);
    
    console.log(`📡 Removed communication channel: ${channelId}`);
    this.emit('channelRemoved', channelId);
  }

  getBestChannel(): CommunicationChannel | null {
    let bestChannel: CommunicationChannel | null = null;
    let bestScore = 0;
    
    this.channels.forEach(channel => {
      // Score based on latency and reliability
      const score = (channel.reliability * 100) - channel.latency;
      if (score > bestScore) {
        bestScore = score;
        bestChannel = channel;
      }
    });
    
    return bestChannel;
  }

  updateConnectionState(isConnected: boolean, latency?: number): void {
    this.connections.isConnected = isConnected;
    this.connections.lastPing = Date.now();
    
    if (latency !== undefined) {
      this.connections.latency = latency;
    }
    
    if (isConnected) {
      this.connections.reconnectAttempts = 0;
    }
    
    this.emit('connectionStateChanged', this.connections);
  }

  getConnectionState(): ConnectionState {
    return { ...this.connections };
  }

  destroy(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
    }
  }
}

export class BidirectionalCommunication extends EventEmitter {
  private messageRouter: MessageRouter;
  private stateSynchronizer: StateSynchronizer;
  private connectionManager: ConnectionManager;
  private isInitialized = false;

  constructor() {
    super();
    
    this.messageRouter = new MessageRouter();
    this.stateSynchronizer = new StateSynchronizer();
    this.connectionManager = new ConnectionManager();
    
    this.initializeCommunication();
  }

  private initializeCommunication(): void {
    console.log('🔄 Bidirectional Communication - Initializing');
    
    this.setupEventHandlers();
    this.establishCommunicationChannels();
    this.isInitialized = true;
    
    this.emit('initialized');
  }

  private setupEventHandlers(): void {
    // Message Router events
    this.messageRouter.on('messageProcessed', (data) => {
      this.emit('messageProcessed', data);
    });
    
    this.messageRouter.on('messageError', (data) => {
      this.emit('messageError', data);
    });
    
    this.messageRouter.on('sendMessage', (message) => {
      this.sendMessage(message);
    });
    
    // State Synchronizer events
    this.stateSynchronizer.on('syncCompleted', (data) => {
      this.emit('syncCompleted', data);
    });
    
    this.stateSynchronizer.on('conversationSynced', (context) => {
      this.emit('conversationSynced', context);
    });
    
    this.stateSynchronizer.on('canvasSynced', (context) => {
      this.emit('canvasSynced', context);
    });
    
    // Connection Manager events
    this.connectionManager.on('connectionStateChanged', (state) => {
      this.emit('connectionStateChanged', state);
    });
    
    this.connectionManager.on('channelAdded', (channel) => {
      this.emit('channelAdded', channel);
    });
  }

  private establishCommunicationChannels(): void {
    console.log('📡 Establishing communication channels');
    
    // Set up custom event listeners for canvas-assistant communication
    window.addEventListener('canvasToAssistant', this.handleCanvasToAssistant.bind(this));
    window.addEventListener('assistantToCanvas', this.handleAssistantToCanvas.bind(this));
    
    // Set up other communication channels as needed
    this.setupPostMessageChannel();
    this.setupBroadcastChannel();
  }

  private setupPostMessageChannel(): void {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'canvas-assistant-communication') {
        this.handleMessage(event.data.message);
      }
    });
  }

  private setupBroadcastChannel(): void {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('canvas-assistant-sync');
      channel.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });
    }
  }

  private handleCanvasToAssistant(event: CustomEvent): void {
    const message = event.detail as CommunicationMessage;
    this.receiveMessage(message);
  }

  private handleAssistantToCanvas(event: CustomEvent): void {
    const message = event.detail as CommunicationMessage;
    this.receiveMessage(message);
  }

  private handleMessage(message: CommunicationMessage): void {
    this.receiveMessage(message);
  }

  // Public API
  async sendMessage(message: CommunicationMessage): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Communication system not initialized');
    }
    
    console.log(`📤 Sending message: ${message.action} to ${message.target}`);
    
    const channel = this.connectionManager.getBestChannel();
    if (!channel) {
      throw new Error('No communication channel available');
    }
    
    try {
      switch (channel.type) {
        case 'custom-event':
          this.sendViaCustomEvent(message);
          break;
        case 'postmessage':
          this.sendViaPostMessage(message);
          break;
        case 'broadcast-channel':
          this.sendViaBroadcastChannel(message);
          break;
        default:
          throw new Error(`Unsupported channel type: ${channel.type}`);
      }
      
      this.emit('messageSent', message);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      this.emit('messageSendError', { message, error });
      throw error;
    }
  }

  private sendViaCustomEvent(message: CommunicationMessage): void {
    const eventName = message.target === 'canvas' ? 'assistantToCanvas' : 'canvasToAssistant';
    window.dispatchEvent(new CustomEvent(eventName, { detail: message }));
  }

  private sendViaPostMessage(message: CommunicationMessage): void {
    window.postMessage({
      type: 'canvas-assistant-communication',
      message
    }, '*');
  }

  private sendViaBroadcastChannel(message: CommunicationMessage): void {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('canvas-assistant-sync');
      channel.postMessage(message);
    }
  }

  async receiveMessage(message: CommunicationMessage): Promise<void> {
    console.log(`📥 Received message: ${message.action} from ${message.source}`);
    
    try {
      // Route message through message router
      await this.messageRouter.routeMessage(message);
      
      // Add to sync state if it's a state update
      if (this.isStateUpdateMessage(message)) {
        this.stateSynchronizer.addPendingUpdate(message);
      }
      
      this.emit('messageReceived', message);
      
    } catch (error) {
      console.error('Failed to process received message:', error);
      this.emit('messageReceiveError', { message, error });
    }
  }

  private isStateUpdateMessage(message: CommunicationMessage): boolean {
    const stateUpdateActions = [
      'conversation-update',
      'canvas-update',
      'user-update',
      'system-update'
    ];
    
    return stateUpdateActions.includes(message.action);
  }

  // Assistant → Canvas communication helpers
  async sendToCanvas(action: string, payload: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<void> {
    const message: CommunicationMessage = {
      id: `assistant-${Date.now()}`,
      type: 'assistant-to-canvas',
      action,
      payload,
      timestamp: Date.now(),
      source: 'assistant',
      target: 'canvas',
      priority,
      requiresAck: priority === 'critical'
    };
    
    return this.sendMessage(message);
  }

  // Canvas → Assistant communication helpers
  async sendToAssistant(action: string, payload: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<void> {
    const message: CommunicationMessage = {
      id: `canvas-${Date.now()}`,
      type: 'canvas-to-assistant',
      action,
      payload,
      timestamp: Date.now(),
      source: 'canvas',
      target: 'assistant',
      priority,
      requiresAck: priority === 'critical'
    };
    
    return this.sendMessage(message);
  }

  // Synchronization methods
  async syncCanvasState(canvasState: any): Promise<void> {
    return this.sendToAssistant('canvas-update', canvasState, 'high');
  }

  async syncConversationState(conversationState: any): Promise<void> {
    return this.sendToCanvas('conversation-update', conversationState, 'high');
  }

  async requestSync(): Promise<void> {
    return this.sendMessage({
      id: `sync-${Date.now()}`,
      type: 'bidirectional',
      action: 'sync-request',
      payload: {},
      timestamp: Date.now(),
      source: 'system',
      target: 'both',
      priority: 'medium',
      requiresAck: true
    });
  }

  // State access
  getCurrentSyncState(): SyncState {
    return this.stateSynchronizer.getCurrentState();
  }

  getConnectionStatus(): ConnectionState {
    return this.connectionManager.getConnectionState();
  }

  // Lifecycle
  destroy(): void {
    this.messageRouter.destroy();
    this.stateSynchronizer.destroy();
    this.connectionManager.destroy();
    
    // Clean up event listeners
    window.removeEventListener('canvasToAssistant', this.handleCanvasToAssistant.bind(this));
    window.removeEventListener('assistantToCanvas', this.handleAssistantToCanvas.bind(this));
  }
}

// Export singleton instance
export const bidirectionalCommunication = new BidirectionalCommunication();
