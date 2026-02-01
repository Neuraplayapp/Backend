export interface WebSocketMessage {
  type: 'connect_elevenlabs' | 'tts_request' | 'audio_chunk' | 'elevenlabs_connecting' | 'elevenlabs_connected' | 'elevenlabs_disconnected' | 'audio_queued' | 'audio_ack' | 'ai_response' | 'user_transcript' | 'interruption' | 'end_conversation' | 'error';
  text?: string;
  audio?: string;
  modelId?: string;
  voiceId?: string;
  data?: string;
  message?: string;
  conversationId?: string;
  code?: number;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // Generic send helper for JSON messages
  send(payload: Record<string, any>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    this.ws.send(JSON.stringify(payload));
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Prevent multiple connections
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
          console.log('🔗 WebSocket already connected or connecting');
          if (this.ws.readyState === WebSocket.OPEN) {
            resolve();
          }
          return;
        }

        // Clean up any existing connection
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }

        // Determine the correct WebSocket URL based on environment
        let wsUrl: string;
        
        if (window.location.hostname === 'neuraplay.org') {
          // Production: Use wss for the main server
          wsUrl = 'wss://neuraplay.org';
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          // Development: Backend server is typically on port 3001
          wsUrl = 'ws://localhost:3001';
        } else {
          // Fallback: Try same host as current page
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.hostname;
          const port = window.location.port;
          const isDefaultHttps = protocol === 'wss:' && (port === '' || port === '443');
          const isDefaultHttp = protocol === 'ws:' && (port === '' || port === '80');
          wsUrl = isDefaultHttps || isDefaultHttp ? `${protocol}//${host}` : `${protocol}//${host}:${port}`;
        }
        
        console.log('🔗 Connecting to WebSocket server:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected', { status: 'connected' });
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📥 WebSocket message received:', data.type);
            this.emit('message', data);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.emit('disconnected', { status: 'disconnected' });
          
          // Only auto-reconnect if it wasn't a manual disconnect (code 1000)
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Auto-reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect().catch(() => {}), 1000 * this.reconnectAttempts);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.emit('error', { error: 'WebSocket connection failed' });
          reject(new Error('WebSocket connection failed'));
        };
        
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  async connectToElevenLabs(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    this.ws.send(JSON.stringify({
      type: 'connect_elevenlabs'
    }));
    
    console.log('🎤 Connecting to ElevenLabs via WebSocket...');
  }

  async sendTTSRequest(text: string, voiceId: string = '8LVfoRdkh4zgjr8v5ObE', modelId: string = 'eleven_turbo_v2_5'): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    this.ws.send(JSON.stringify({
      type: 'tts_request',
      text,
      voiceId,
      modelId
    }));
    
    console.log('🎤 TTS request sent via WebSocket');
  }

  async sendAudioChunk(audioData: ArrayBuffer): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    // Process in chunks to avoid "Maximum call stack size exceeded"
    const uint8Array = new Uint8Array(audioData);
    const chunkSize = 8192;
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binaryString += String.fromCharCode(...chunk);
    }
    const base64Audio = btoa(binaryString);
    
    this.ws.send(JSON.stringify({
      type: 'audio_chunk',
      audio: base64Audio
    }));
    
    console.log('🎤 Audio chunk sent via WebSocket');
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect'); // Use normal closure code
      this.ws = null;
    }
    this.isConnected = false;
    console.log('🔌 WebSocket manually disconnected');
  }

  reset(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.eventListeners.clear();
    console.log('🔄 WebSocket service reset');
  }

  // Event system
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Getters
  get connected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
} 