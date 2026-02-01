// Voice Manager - Integrates voice processing with 10-layer NPU
// State-of-the-art voice workflow for NeuraPlay AI Platform

// Lazy import to avoid circular dependency
let serviceContainer: any = null;
const getServiceContainer = async () => {
  if (!serviceContainer) {
    const module = await import('./ServiceContainer');
    serviceContainer = module.serviceContainer;
  }
  return serviceContainer;
};

export interface VoiceProcessingOptions {
  sessionId: string;
  userId: string;
  context?: any;
  language?: string;
  enableTTS?: boolean;
}

export interface VoiceProcessingResult {
  transcription: string;
  aiResponse?: string;
  audioUrl?: string;
  processingTime: number;
  npuAnalysis?: any;
}

export class VoiceManager {
  private static instance: VoiceManager;
  
  static getInstance(): VoiceManager {
    if (!VoiceManager.instance) {
      VoiceManager.instance = new VoiceManager();
    }
    return VoiceManager.instance;
  }

  /**
   * Complete voice processing workflow:
   * 1. Speech-to-Text (AssemblyAI)
   * 2. Text through 10-layer NPU 
   * 3. Text-to-Speech (ElevenLabs)
   */
  async processVoiceInput(
    audioBlob: Blob, 
    options: VoiceProcessingOptions
  ): Promise<VoiceProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log('🎙️ VoiceManager: Starting complete voice workflow');
      
      // STEP 1: Speech-to-Text
      console.log('📝 Step 1: Converting speech to text...');
      const transcription = await this.speechToText(audioBlob, options.language);
      
      if (!transcription || transcription.trim().length === 0) {
        throw new Error('No speech detected or transcription failed');
      }
      
      console.log('✅ Transcription:', transcription);
      
      // STEP 2: Process through 10-layer NPU system
      console.log('🧠 Step 2: Processing through 10-layer NPU...');
      const container = await getServiceContainer();
      const aiRouter = container.get('aiRouter') as any;
      const npuResponse = await aiRouter.processRequest({
        message: transcription,
        sessionId: options.sessionId,
        userId: options.userId,
        context: {
          ...options.context,
          inputMode: 'voice',
          requiresAudio: options.enableTTS || false
        },
        mode: 'chat',
        constraints: {
          maxTokens: 800,
          temperature: 0.7,
          timeoutMs: 60000 // Extended for longer voice recordings
        }
      });
      
      console.log('✅ NPU Response:', npuResponse.response?.substring(0, 100));
      
      let audioUrl: string | undefined;
      
      // STEP 3: Text-to-Speech (if enabled)
      if (options.enableTTS && npuResponse.response) {
        console.log('🔊 Step 3: Converting response to speech...');
        // Use detected language or specified language for TTS
        const ttsLanguage = options.language || 'auto';
        audioUrl = await this.textToSpeech(npuResponse.response, undefined, undefined, ttsLanguage);
        console.log('✅ Audio generated:', !!audioUrl);
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        transcription,
        aiResponse: npuResponse.response,
        audioUrl,
        processingTime,
        npuAnalysis: npuResponse.metadata
      };
      
    } catch (error) {
      console.error('❌ VoiceManager: Processing failed:', error);
      throw new Error(`Voice processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Speech-to-Text using AssemblyAI
   */
  private async speechToText(audioBlob: Blob, language = 'auto'): Promise<string> {
    try {
      // Convert audio to base64 (with chunking to avoid call stack overflow)
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Process in chunks to avoid "Maximum call stack size exceeded" error
      const chunkSize = 8192; // Process 8KB at a time
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binaryString += String.fromCharCode(...chunk);
      }
      const base64Audio = btoa(binaryString);
      
      // Use environment-configurable API base to point to Render backend
      const apiBase = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
      const url = `${apiBase}/api/assemblyai-transcribe`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          audioType: audioBlob.type,
          language_code: language,
          speech_model: 'universal'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AssemblyAI error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      return result.text || '';
      
    } catch (error) {
      console.error('STT Error:', error);
      throw new Error(`Speech recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Text-to-Speech using ElevenLabs with multilingual support
   */
  private async textToSpeech(text: string, voiceId?: string, modelId?: string, language: string = 'english'): Promise<string> {
    try {
      // Get optimal TTS configuration for the language
      const { getTTSConfig } = await import('../config/elevenlabs');
      const ttsConfig = getTTSConfig(language);
      
      // Use provided overrides or optimal config for language
      const finalVoiceId = voiceId || ttsConfig.voiceId;
      const finalModelId = modelId || ttsConfig.modelId;
      
      console.log('🔊 VoiceManager TTS - Multilingual config:', { 
        language,
        voiceId: finalVoiceId,
        modelId: finalModelId,
        isMultilingual: ttsConfig.isMultilingual
      });
      
      // Use environment-configurable API base to point to Render backend
      const apiBase = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
      const url = `${apiBase}/api/elevenlabs-tts`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.substring(0, 500), // Limit text length (500 chars = ~30 sec, ~500 credits)
          voiceId: finalVoiceId,
          modelId: finalModelId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs error: ${response.status} - ${errorText}`);
      }
      
      // Convert response to blob and create URL
      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
      
    } catch (error) {
      console.error('TTS Error:', error);
      throw new Error(`Text-to-speech failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Quick voice recording helper
   */
  async startRecording(): Promise<MediaRecorder> {
    try {
      // Enhanced audio constraints for better AssemblyAI compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,  // AssemblyAI recommended sample rate
          channelCount: 1,    // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Try multiple formats for better compatibility
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      
      console.log('🎙️ VoiceManager: Using audio format:', mimeType);
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      return mediaRecorder;
    } catch (error) {
      throw new Error('Microphone access denied or not available');
    }
  }

  /**
   * Check if voice features are available
   */
  isVoiceAvailable(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}

// Export singleton instance
export const voiceManager = VoiceManager.getInstance();
