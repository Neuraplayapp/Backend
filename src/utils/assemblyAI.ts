// Robust AssemblyAI integration with fallbacks
export interface AudioTranscriptionResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface StreamingTranscriptionResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

class AssemblyAIService {
  private static instance: AssemblyAIService;
  private apiKey: string = "70f0f98ec1ec4a49afe581069224eba1";
  private isAvailable: boolean = true;
  private fallbackMode: boolean = false;

  private constructor() {
    this.checkAvailability();
  }

  static getInstance(): AssemblyAIService {
    if (!AssemblyAIService.instance) {
      AssemblyAIService.instance = new AssemblyAIService();
    }
    return AssemblyAIService.instance;
  }

  private async checkAvailability(): Promise<void> {
    try {
      const response = await fetch('https://api.assemblyai.com/v2/health', {
        headers: { 'Authorization': this.apiKey }
      });
      this.isAvailable = response.ok;
    } catch (error) {
      this.isAvailable = false;
      this.fallbackMode = true;
      console.warn('AssemblyAI not available, using fallback mode');
    }
  }

  async transcribeAudioFile(audioFile: File): Promise<AudioTranscriptionResult> {
    if (!this.isAvailable || this.fallbackMode) {
      return this.fallbackTranscription(audioFile);
    }

    try {
      const response = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: { 'Authorization': this.apiKey },
        body: audioFile
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const uploadUrl = await response.json();
      
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: uploadUrl.upload_url,
          language_code: 'en_us',
          punctuate: true,
          format_text: true
        })
      });

      if (!transcriptResponse.ok) {
        throw new Error('Transcription failed');
      }

      const transcript = await transcriptResponse.json();
      
      return {
        text: transcript.text || '',
        confidence: transcript.confidence || 0,
        words: transcript.words || []
      };
    } catch (error) {
      console.error('AssemblyAI transcription error:', error);
      return this.fallbackTranscription(audioFile);
    }
  }

  private async fallbackTranscription(audioFile: File): Promise<AudioTranscriptionResult> {
    // Fallback to browser's Web Speech API
    return new Promise((resolve) => {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve({
          text: transcript,
          confidence: event.results[0][0].confidence,
          words: []
        });
      };

      recognition.onerror = () => {
        resolve({
          text: '',
          confidence: 0,
          words: []
        });
      };

      // Convert file to audio and start recognition
      const audio = new Audio(URL.createObjectURL(audioFile));
      audio.play();
      recognition.start();
    });
  }

  createStreamingTranscription(
    onTranscript: (result: StreamingTranscriptionResult) => void,
    onError: (error: Error) => void
  ) {
    if (!this.isAvailable || this.fallbackMode) {
      return this.createFallbackStreaming(onTranscript, onError);
    }

    const socket = new WebSocket('wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000');
    
    socket.onopen = () => {
      console.log('AssemblyAI WebSocket connected');
    };

    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      
      if (data.text) {
        onTranscript({
          text: data.text,
          isFinal: data.is_final || false,
          confidence: data.confidence || 0
        });
      }
    };

    socket.onerror = (error) => {
      onError(new Error('WebSocket error'));
    };

    socket.onclose = () => {
      console.log('AssemblyAI WebSocket closed');
    };

    return {
      sendAudio: (audioData: ArrayBuffer) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(audioData);
        }
      },
      close: () => {
        socket.close();
      }
    };
  }

  private createFallbackStreaming(
    onTranscript: (result: StreamingTranscriptionResult) => void,
    onError: (error: Error) => void
  ) {
    // Fallback to browser's Web Speech API for streaming
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const isFinal = event.results[event.results.length - 1].isFinal;
      
      onTranscript({
        text: transcript,
        isFinal,
        confidence: event.results[event.results.length - 1][0].confidence
      });
    };

    recognition.onerror = (event: any) => {
      onError(new Error(event.error));
    };

    recognition.start();

    return {
      sendAudio: () => {}, // Not needed for Web Speech API
      close: () => {
        recognition.stop();
      }
    };
  }
}

export const createStreamingTranscription = (
  onTranscript: (result: StreamingTranscriptionResult) => void,
  onError: (error: Error) => void
) => {
  return AssemblyAIService.getInstance().createStreamingTranscription(onTranscript, onError);
};

export const detectVoiceActivity = (audioData: Float32Array): boolean => {
  const threshold = 0.01;
  const rms = Math.sqrt(audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length);
  return rms > threshold;
}; 