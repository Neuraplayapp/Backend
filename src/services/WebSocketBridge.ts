// WebSocket Bridge - Ultra-fast real-time communication (<100ms latency)
// Based on technical architecture document specifications

import { EventEmitter } from 'events';

export interface WebSocketMessage {
  id: string;
  type: 'canvas-update' | 'assistant-update' | 'system-command' | 'heartbeat' | 'sync-request' | 'ack';
  action: string;
  payload: any;
  timestamp: number;
  source: 'assistant' | 'canvas' | 'server' | 'system';
  target: 'assistant' | 'canvas' | 'server' | 'broadcast';
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresResponse: boolean;
  correlationId?: string;
}

export interface ConnectionMetrics {
  latency: number;
  throughput: number; // messages per second
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  reconnectCount: number;
  lastReconnect: number;
  messagesSent: number;
  messagesReceived: number;
  errorsCount: number;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  heartbeatInterval: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  connectionTimeout: number;
  messageTimeout: number;
  enableCompression: boolean;
  enableEncryption: boolean;
}

interface PendingMessage {
  message: WebSocketMessage;
  resolve: (response: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
  sentAt: number;
}

interface MessageBuffer {
  outgoing: WebSocketMessage[];
  incoming: WebSocketMessage[];
  processing: Map<string, PendingMessage>;
  failed: WebSocketMessage[];
}

class ConnectionManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private metrics: ConnectionMetrics;

  constructor(config: WebSocketConfig) {
    super();
    this.config = config;
    this.metrics = {
      latency: 0,
      throughput: 0,
      connectionQuality: 'poor',
      reconnectCount: 0,
      lastReconnect: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errorsCount: 0
    };
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    
    try {
      console.log(`🔗 WebSocket: Connecting to ${this.config.url}`);
      
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.ws?.close();
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, this.config.connectionTimeout);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('🔗 WebSocket: Connected successfully');
        this.emit('connected');
        this.updateConnectionQuality();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.handleDisconnection(event);
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        this.handleConnectionError(error as any);
      };

    } catch (error) {
      this.isConnecting = false;
      this.handleConnectionError(error);
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data as any);
      this.metrics.messagesReceived++;
      
      // Calculate latency for heartbeat messages
      if (message.type === 'heartbeat' && message.action === 'pong') {
        this.metrics.latency = Date.now() - message.timestamp;
        this.updateConnectionQuality();
      }
      
      this.emit('message', message);
      
    } catch (error) {
      console.error('🔗 WebSocket: Failed to parse message', error);
      this.metrics.errorsCount++;
    }
  }

  private handleDisconnection(event: CloseEvent): void {
    this.isConnecting = false;
    console.log(`🔗 WebSocket: Disconnected (${event.code}: ${event.reason})`);
    
    this.emit('disconnected', { code: event.code, reason: event.reason });
    
    // Auto-reconnect if not manually closed
    if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private handleConnectionError(error: any): void {
    this.isConnecting = false;
    this.metrics.errorsCount++;
    console.error('🔗 WebSocket: Connection error', error);
    
    this.emit('error', error);
    
    // Schedule reconnect
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectAttempts++;
    this.metrics.reconnectCount++;
    this.metrics.lastReconnect = Date.now();
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    console.log(`🔗 WebSocket: Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null as any;
      this.connect();
    }, delay);
  }

  private updateConnectionQuality(): void {
    const { latency, errorsCount } = this.metrics;
    
    if (latency < 50 && errorsCount < 5) {
      this.metrics.connectionQuality = 'excellent';
    } else if (latency < 100 && errorsCount < 10) {
      this.metrics.connectionQuality = 'good';
    } else if (latency < 200 && errorsCount < 20) {
      this.metrics.connectionQuality = 'fair';
    } else {
      this.metrics.connectionQuality = 'poor';
    }
    
    this.emit('qualityChanged', this.metrics.connectionQuality);
  }

  send(message: WebSocketMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      try {
        const messageString = JSON.stringify(message);
        this.ws.send(messageString);
        this.metrics.messagesSent++;
        resolve();
      } catch (error) {
        this.metrics.errorsCount++;
        reject(error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }
}

class MessageProcessor extends EventEmitter {
  private messageBuffer: MessageBuffer;
  private processingTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.messageBuffer = {
      outgoing: [],
      incoming: [],
      processing: new Map(),
      failed: []
    };
    
    this.startProcessing();
  }

  private startProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processOutgoingBuffer();
      this.processIncomingBuffer();
      this.cleanupExpiredMessages();
    }, 10); // Process every 10ms for ultra-low latency
  }

  private processOutgoingBuffer(): void {
    while (this.messageBuffer.outgoing.length > 0) {
      const message = this.messageBuffer.outgoing.shift()!;
      this.emit('sendMessage', message);
    }
  }

  private processIncomingBuffer(): void {
    while (this.messageBuffer.incoming.length > 0) {
      const message = this.messageBuffer.incoming.shift()!;
      this.processIncomingMessage(message);
    }
  }

  private processIncomingMessage(message: WebSocketMessage): void {
    // Handle acknowledgments
    if (message.type === 'ack' && message.correlationId) {
      const pending = this.messageBuffer.processing.get(message.correlationId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.messageBuffer.processing.delete(message.correlationId);
        pending.resolve(message.payload);
        return;
      }
    }

    // Emit message for handling
    this.emit('messageReceived', message);

    // Send acknowledgment if required
    if (message.requiresResponse) {
      this.sendAcknowledgment(message);
    }
  }

  private sendAcknowledgment(originalMessage: WebSocketMessage): void {
    const ackMessage: WebSocketMessage = {
      id: `ack-${Date.now()}`,
      type: 'ack',
      action: 'acknowledged',
      payload: { success: true },
      timestamp: Date.now(),
      source: originalMessage.target as any,
      target: originalMessage.source as any,
      priority: 'high',
      requiresResponse: false,
      correlationId: originalMessage.id
    };

    this.queueOutgoing(ackMessage);
  }

  private cleanupExpiredMessages(): void {
    const now = Date.now();
    
    this.messageBuffer.processing.forEach((pending) => {
      if (now - pending.sentAt > 30000) { // 30 second timeout
        clearTimeout(pending.timeout);
        this.messageBuffer.processing.delete(pending.message.id);
        pending.reject(new Error('Message timeout'));
      }
    });
  }

  queueOutgoing(message: WebSocketMessage): void {
    this.messageBuffer.outgoing.push(message);
  }

  queueIncoming(message: WebSocketMessage): void {
    this.messageBuffer.incoming.push(message);
  }

  sendWithResponse(message: WebSocketMessage, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.messageBuffer.processing.delete(message.id);
        reject(new Error('Response timeout'));
      }, timeout);

      this.messageBuffer.processing.set(message.id, {
        message,
        resolve,
        reject,
        timeout: timeoutHandle,
        sentAt: Date.now()
      });

      message.requiresResponse = true;
      this.queueOutgoing(message);
    });
  }

  getBufferStats(): any {
    return {
      outgoing: this.messageBuffer.outgoing.length,
      incoming: this.messageBuffer.incoming.length,
      processing: this.messageBuffer.processing.size,
      failed: this.messageBuffer.failed.length
    };
  }

  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    
    // Clear all pending timeouts
    this.messageBuffer.processing.forEach(pending => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Bridge destroyed'));
    });
    
    this.messageBuffer.processing.clear();
  }
}

class HeartbeatManager extends EventEmitter {
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;
  private missedHeartbeats = 0;
  private maxMissedHeartbeats = 3;

  constructor(private interval: number) {
    super();
  }

  start(): void {
    this.stop(); // Ensure no duplicate timers
    
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.interval);
  }

  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendHeartbeat(): void {
    const heartbeatMessage: WebSocketMessage = {
      id: `heartbeat-${Date.now()}`,
      type: 'heartbeat',
      action: 'ping',
      payload: {},
      timestamp: Date.now(),
      source: 'system',
      target: 'server',
      priority: 'low',
      requiresResponse: false
    };

    this.lastHeartbeat = Date.now();
    this.emit('heartbeat', heartbeatMessage);
  }

  handleHeartbeatResponse(message: WebSocketMessage): void {
    if (message.type === 'heartbeat' && message.action === 'pong') {
      this.missedHeartbeats = 0;
      const latency = Date.now() - message.timestamp;
      this.emit('latencyUpdate', latency);
    }
  }

  checkHeartbeatTimeout(): boolean {
    const now = Date.now();
    if (now - this.lastHeartbeat > this.interval * 2) {
      this.missedHeartbeats++;
      
      if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
        this.emit('heartbeatTimeout');
        return true;
      }
    }
    
    return false;
  }
}

export class WebSocketBridge extends EventEmitter {
  private connectionManager: ConnectionManager;
  private messageProcessor: MessageProcessor;
  private heartbeatManager: HeartbeatManager;
  private config: WebSocketConfig;
  private isInitialized = false;

  constructor(config: Partial<WebSocketConfig> = {}) {
    super();
    
    this.config = {
      url: config.url || this.getDefaultWebSocketUrl(),
      protocols: config.protocols || ['canvas-assistant-protocol'],
      heartbeatInterval: config.heartbeatInterval || 5000,
      reconnectInterval: config.reconnectInterval || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      connectionTimeout: config.connectionTimeout || 10000,
      messageTimeout: config.messageTimeout || 5000,
      enableCompression: config.enableCompression ?? true,
      enableEncryption: config.enableEncryption ?? false
    } as WebSocketConfig;

    this.connectionManager = new ConnectionManager(this.config);
    this.messageProcessor = new MessageProcessor();
    this.heartbeatManager = new HeartbeatManager(this.config.heartbeatInterval);
    
    this.initializeBridge();
  }

  private getDefaultWebSocketUrl(): string {
    // Use backend WS: in dev target the server on :3001; in prod use current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';
    if (isDev) {
      return `${protocol}//${host}:3001`;
    }
    return `${protocol}//${host}`;
  }

  private initializeBridge(): void {
    console.log('🌉 WebSocket Bridge - Initializing ultra-fast communication');
    
    this.setupEventHandlers();
    this.isInitialized = true;
    
    // Auto-connect
    this.connect();
  }

  private setupEventHandlers(): void {
    // Connection Manager events
    this.connectionManager.on('connected', () => {
      console.log('🌉 WebSocket Bridge: Connected successfully');
      this.heartbeatManager.start();
      this.emit('connected');
    });

    this.connectionManager.on('disconnected', (data) => {
      console.log('🌉 WebSocket Bridge: Disconnected', data);
      this.heartbeatManager.stop();
      this.emit('disconnected', data);
    });

    this.connectionManager.on('message', (message) => {
      this.messageProcessor.queueIncoming(message);
    });

    this.connectionManager.on('error', (error) => {
      this.emit('error', error);
    });

    this.connectionManager.on('qualityChanged', (quality) => {
      this.emit('qualityChanged', quality);
    });

    // Message Processor events
    this.messageProcessor.on('sendMessage', (message) => {
      this.connectionManager.send(message).catch(error => {
        console.error('Failed to send message:', error);
      });
    });

    this.messageProcessor.on('messageReceived', (message) => {
      this.handleReceivedMessage(message);
    });

    // Heartbeat Manager events
    this.heartbeatManager.on('heartbeat', (message) => {
      this.messageProcessor.queueOutgoing(message);
    });

    this.heartbeatManager.on('latencyUpdate', (latency) => {
      this.emit('latencyUpdate', latency);
    });

    this.heartbeatManager.on('heartbeatTimeout', () => {
      console.warn('🌉 WebSocket Bridge: Heartbeat timeout detected');
      this.connectionManager.disconnect();
    });
  }

  private handleReceivedMessage(message: WebSocketMessage): void {
    console.log(`🌉 WebSocket: Received ${message.type}:${message.action} from ${message.source}`);
    
    // Handle heartbeat responses
    if (message.type === 'heartbeat') {
      this.heartbeatManager.handleHeartbeatResponse(message);
      return;
    }

    // Emit message for application handling
    this.emit('message', message);
  }

  // Public API
  async connect(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('WebSocket Bridge not initialized');
    }
    
    return this.connectionManager.connect();
  }

  disconnect(): void {
    this.heartbeatManager.stop();
    this.connectionManager.disconnect();
  }

  async sendMessage(message: Omit<WebSocketMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: WebSocketMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    } as WebSocketMessage;

    this.messageProcessor.queueOutgoing(fullMessage);
  }

  async sendWithResponse(message: Omit<WebSocketMessage, 'id' | 'timestamp'>, timeout?: number): Promise<any> {
    const fullMessage: WebSocketMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    } as WebSocketMessage;

    return this.messageProcessor.sendWithResponse(fullMessage, timeout);
  }

  // High-level communication methods
  async syncCanvasToAssistant(canvasData: any): Promise<void> {
    return this.sendMessage({
      type: 'canvas-update',
      action: 'sync-canvas-state',
      payload: canvasData,
      source: 'canvas',
      target: 'assistant',
      priority: 'high',
      requiresResponse: false
    });
  }

  async syncAssistantToCanvas(assistantData: any): Promise<void> {
    return this.sendMessage({
      type: 'assistant-update',
      action: 'sync-assistant-state',
      payload: assistantData,
      source: 'assistant',
      target: 'canvas',
      priority: 'high',
      requiresResponse: false
    });
  }

  async sendCanvasCommand(command: string, params: any): Promise<any> {
    return this.sendWithResponse({
      type: 'system-command',
      action: 'canvas-command',
      payload: { command, params },
      source: 'assistant',
      target: 'canvas',
      priority: 'medium',
      requiresResponse: true
    });
  }

  async sendAssistantCommand(command: string, params: any): Promise<any> {
    return this.sendWithResponse({
      type: 'system-command',
      action: 'assistant-command',
      payload: { command, params },
      source: 'canvas',
      target: 'assistant',
      priority: 'medium',
      requiresResponse: true
    });
  }

  async requestFullSync(): Promise<any> {
    return this.sendWithResponse({
      type: 'sync-request',
      action: 'full-sync',
      payload: {},
      source: 'system',
      target: 'broadcast',
      priority: 'high',
      requiresResponse: true
    });
  }

  // Status and metrics
  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  getConnectionMetrics(): ConnectionMetrics {
    return this.connectionManager.getMetrics();
  }

  getBufferStats(): any {
    return this.messageProcessor.getBufferStats();
  }

  getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    return this.connectionManager.getMetrics().connectionQuality;
  }

  // WebSocket Bridge specific methods for <100ms latency
  enableLowLatencyMode(): void {
    console.log('⚡ Enabling ultra-low latency mode (<100ms)');
    
    // Reduce heartbeat interval for faster detection
    this.heartbeatManager.stop();
    this.heartbeatManager = new HeartbeatManager(1000); // 1 second heartbeats
    this.heartbeatManager.start();
    
    // Prioritize critical messages
    this.on('message', (message) => {
      if ((message as any).priority === 'critical') {
        // Process immediately
        setTimeout(() => {
          this.emit('criticalMessage', message);
        }, 0);
      }
    });
  }

  establishPersistentBridge(): void {
    console.log('🌉 Establishing persistent WebSocket bridge');
    
    let connectionAttemptStart = Date.now();
    let hasEverConnected = false;
    let reconnectAttempts = 0;
    const maxReconnectTime = 10000; // 10 seconds
    
    // Enhanced connection monitoring with graceful timeout
    const reconnectInterval = setInterval(() => {
      if (this.isConnected()) {
        hasEverConnected = true;
        reconnectAttempts = 0;
        connectionAttemptStart = Date.now(); // Reset timer on successful connection
        return;
      }
      
      const timeSinceStart = Date.now() - connectionAttemptStart;
      
      // If we've never connected and it's been 10 seconds, give up
      if (!hasEverConnected && timeSinceStart > maxReconnectTime) {
        console.log('🔌 WebSocket: Giving up after 10 seconds - backend server likely not running');
        clearInterval(reconnectInterval);
        return;
      }
      
      // If we have connected before, allow more attempts but with backoff
      if (hasEverConnected && reconnectAttempts > 5) {
        console.log('🔌 WebSocket: Too many reconnection attempts, stopping');
        clearInterval(reconnectInterval);
        return;
      }
      
      console.log('🌉 Bridge disconnected, attempting reconnection');
      reconnectAttempts++;
      this.connect();
    }, 1000);
  }

  configureBidirectionalSync(): void {
    console.log('🔄 Configuring bidirectional sync over WebSocket');
    
    // Set up automatic state synchronization
    this.on('message', (message) => {
      if ((message as any).action === 'sync-request') {
        this.handleSyncRequest(message as any);
      }
    });
  }

  private async handleSyncRequest(message: WebSocketMessage): Promise<void> {
    // Respond with current state
    const response = {
      type: 'sync-request' as const,
      action: 'sync-response',
      payload: {
        timestamp: Date.now(),
        state: 'synchronized',
        version: '1.0.0'
      },
      source: message.target as any,
      target: message.source as any,
      priority: 'high' as const,
      requiresResponse: false,
      correlationId: message.id
    };

    await this.sendMessage(response);
  }

  initializeContextPreservation(): void {
    console.log('💾 Initializing context preservation over WebSocket');
    
    // Enhanced context synchronization
    this.on('message', (message) => {
      if ((message as any).action === 'preserve-context') {
        this.emit('contextPreservationRequest', (message as any).payload);
      }
    });
  }

  // Cleanup
  destroy(): void {
    this.heartbeatManager.stop();
    this.messageProcessor.destroy();
    this.connectionManager.disconnect();
    
    this.removeAllListeners();
    console.log('🌉 WebSocket Bridge destroyed');
  }
}

// Export singleton instance for global use
export const webSocketBridge = new WebSocketBridge();