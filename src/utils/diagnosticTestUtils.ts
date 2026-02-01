// Utility functions for diagnostic testing

/**
 * Generate test audio data for STT testing
 */
export const generateTestAudio = (frequency: number = 440, duration: number = 2, sampleRate: number = 44100): AudioBuffer => {
  const samples = sampleRate * duration;
  
  // Use AudioContext for better browser compatibility
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = audioCtx.createBuffer(1, samples, sampleRate);
  
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.1;
  }
  
  return audioBuffer;
};

/**
 * Convert AudioBuffer to WAV format
 */
export const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  
  // Convert float samples to 16-bit PCM
  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample * 0x7FFF, true);
    offset += 2;
  }
  
  return arrayBuffer;
};

/**
 * Calculate transcription accuracy between actual and expected text
 */
export const calculateTranscriptionAccuracy = (actual: string, expected: string): number => {
  const actualWords = actual.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const expectedWords = expected.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  if (expectedWords.length === 0) return 0;
  
  let matches = 0;
  expectedWords.forEach(word => {
    if (actualWords.some(actualWord => actualWord.includes(word) || word.includes(actualWord))) {
      matches++;
    }
  });
  
  return matches / expectedWords.length;
};

/**
 * Generate test text for TTS with various complexity levels
 */
export const generateTestText = (type: 'simple' | 'complex' | 'technical' = 'simple'): string => {
  const testTexts = {
    simple: "Hello! This is a test of the text-to-speech system. Can you hear me clearly?",
    complex: "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and tests pronunciation of various phonemes.",
    technical: "Initialize WebSocket connection with authentication headers, establish bidirectional communication channel, and implement error handling with exponential backoff retry logic."
  };
  
  return testTexts[type];
};

/**
 * Validate system requirements for diagnostics
 */
export const validateSystemRequirements = (): {
  webSocket: boolean;
  mediaDevices: boolean;
  audioContext: boolean;
  localStorage: boolean;
  issues: string[];
} => {
  const issues: string[] = [];
  
  const webSocket = typeof WebSocket !== 'undefined';
  if (!webSocket) issues.push('WebSocket not supported');
  
  const mediaDevices = !!navigator.mediaDevices;
  if (!mediaDevices) issues.push('MediaDevices API not supported');
  
  const audioContext = typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
  if (!audioContext) issues.push('AudioContext not supported');
  
  const localStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  if (!localStorage) issues.push('localStorage not available');
  
  return {
    webSocket,
    mediaDevices,
    audioContext,
    localStorage,
    issues
  };
};

/**
 * Format duration in milliseconds to human readable string
 */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

/**
 * Get browser information for diagnostic reports
 */
export const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Extract browser name and version
  let browser = 'Unknown';
  let version = 'Unknown';
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    if (match) version = match[1];
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/([0-9.]+)/);
    if (match) version = match[1];
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
    const match = userAgent.match(/Safari\/([0-9.]+)/);
    if (match) version = match[1];
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
    const match = userAgent.match(/Edg\/([0-9.]+)/);
    if (match) version = match[1];
  }
  
  return {
    browser,
    version,
    platform,
    userAgent: userAgent.substring(0, 100) + (userAgent.length > 100 ? '...' : '')
  };
};

/**
 * Test network connectivity with timeout
 */
export const testNetworkConnectivity = async (url: string = '/api/health', timeout: number = 5000): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> => {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    
    return {
      connected: response.ok,
      latency,
      error: response.ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
};
