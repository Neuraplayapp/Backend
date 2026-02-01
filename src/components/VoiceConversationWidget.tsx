import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Loader2, Volume2 } from 'lucide-react';
import { WebSocketService } from '../services/WebSocketService';
import { useTheme } from '../contexts/ThemeContext';

interface VoiceConversationWidgetProps {
  onConversationStart?: () => void;
  onConversationEnd?: () => void;
  onMessage?: (message: { text: string; isUser: boolean; timestamp: Date }) => void;
  onError?: (error: string) => void;
  className?: string;
  language?: string; // Language code for the AI teacher (en, ru, ar, sv, kk)
}

const VoiceConversationWidget: React.FC<VoiceConversationWidgetProps> = ({
  onConversationStart,
  onConversationEnd,
  onMessage,
  onError,
  className = '',
  language = 'en'
}) => {
  const { isDarkMode } = useTheme();
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isElevenLabsReady, setIsElevenLabsReady] = useState(false); // Track ElevenLabs connection state
  
  const wsService = useRef<WebSocketService>(WebSocketService.getInstance());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCallActiveRef = useRef(false); // Mutable ref for callbacks
  const isElevenLabsReadyRef = useRef(false); // Mutable ref for ElevenLabs readiness
  const audioQueueRef = useRef<string[]>([]); // Queue for audio chunks
  const isPlayingRef = useRef(false); // Track if currently playing
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null); // For raw PCM capture
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null); // Audio source node

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        setConnectionStatus('connecting');
        await wsService.current.connect();
        setConnectionStatus('connected');
        setIsConnected(true);
      } catch (error) {
        console.error('❌ Failed to connect to WebSocket:', error);
        setConnectionStatus('error');
        onError?.('Failed to connect to voice service');
      }
    };

    initializeConnection();

    // Set up WebSocket event listeners
    const handleMessage = (data: any) => {
      console.log('📥 Voice widget received:', data.type);
      
      // Handle ElevenLabs connection states
      if (data.type === 'elevenlabs_connecting') {
        console.log('🔄 ElevenLabs connecting...');
        setIsElevenLabsReady(false);
        isElevenLabsReadyRef.current = false;
      }
      
      if (data.type === 'elevenlabs_connected') {
        console.log('✅ ElevenLabs fully connected, conversation ID:', data.conversationId);
        setIsElevenLabsReady(true);
        isElevenLabsReadyRef.current = true;
      }
      
      if (data.type === 'elevenlabs_disconnected') {
        console.log('🔌 ElevenLabs disconnected');
        setIsElevenLabsReady(false);
        isElevenLabsReadyRef.current = false;
      }
      
      if (data.type === 'audio_queued') {
        console.log('⏳ Audio queued, waiting for ElevenLabs...');
      }
      
      if (data.type === 'user_transcript' && data.text) {
        console.log('👤 User transcript:', data.text);
        onMessage?.({
          text: data.text,
          isUser: true,
          timestamp: new Date()
        });
      }
      
      if (data.type === 'ai_response' && data.text) {
        onMessage?.({
          text: data.text,
          isUser: false,
          timestamp: new Date()
        });
      }
      
      if (data.type === 'audio_chunk' && data.audio) {
        console.log('🔊 Received audio chunk, format:', data.format || 'unknown', 'length:', data.audio.length);
        playAudioChunk(data.audio, data.format || 'wav');
      }
      
      if (data.type === 'error') {
        console.error('❌ Server error:', data.message);
        onError?.(data.message || 'Server error');
      }
    };

    const handleError = (error: any) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus('error');
      onError?.('Voice connection error');
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      stopCall();
    };

    wsService.current.on('message', handleMessage);
    wsService.current.on('error', handleError);
    wsService.current.on('disconnected', handleDisconnected);

    return () => {
      wsService.current.off('message', handleMessage);
      wsService.current.off('error', handleError);
      wsService.current.off('disconnected', handleDisconnected);
      stopCall();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Initialize AudioContext on user interaction
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('✅ AudioContext initialized');
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setHasUserInteracted(true);
  }, []);

  // Play next audio from queue
  const playNextFromQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    
    // Handle both old format (string) and new format (object)
    const queueItem = audioQueueRef.current.shift()!;
    const base64Audio = typeof queueItem === 'string' ? queueItem : queueItem.audio;
    const knownFormat = typeof queueItem === 'object' ? queueItem.format : null;

    try {
      // Log the raw data for debugging
      console.log('🔧 Audio playback attempt:', {
        format: knownFormat,
        audioLength: base64Audio?.length,
        audioPreview: base64Audio?.substring(0, 50)
      });
      
      // STRATEGY: For WebSocket streaming from ElevenLabs, use Web Audio API directly
      // This handles raw PCM data properly instead of relying on browser format detection
      if (knownFormat === 'wav' || knownFormat === 'pcm') {
        console.log('🔊 Using Web Audio API for direct PCM/WAV playback');
        await playWithWebAudio(base64Audio);
        return; // playWithWebAudio handles queue progression
      }
      
      // For other formats (MP3), try the data URL approach
      let formats: string[];
      if (knownFormat === 'mp3') {
        formats = ['audio/mpeg', 'audio/mp3'];
      } else {
        formats = ['audio/mpeg', 'audio/mp3', 'audio/wav'];
      }
      let audioPlayed = false;

      for (const format of formats) {
        if (audioPlayed) break;
        
        try {
          const dataUrl = `data:${format};base64,${base64Audio}`;
          const audio = new Audio();
          
          await new Promise<void>((resolve, reject) => {
            audio.oncanplaythrough = () => {
              audio.play()
                .then(() => {
                  audioPlayed = true;
                  console.log(`✅ Audio playing with format: ${format}`);
                  resolve();
                })
                .catch(reject);
            };
            
            audio.onerror = () => reject(new Error(`Format ${format} failed`));
            audio.onended = () => {
              console.log('✅ Audio chunk complete');
              isPlayingRef.current = false;
              setIsSpeaking(false);
              // Play next in queue
              playNextFromQueue();
            };
            
            audio.src = dataUrl;
            audio.load();
            
            // Timeout fallback
            setTimeout(() => reject(new Error('Timeout')), 2000);
          });
          
          break; // Success, exit format loop
        } catch (formatError) {
          console.warn(`⚠️ Format ${format} failed, trying next...`);
        }
      }

      if (!audioPlayed) {
        // Fallback: Use Web Audio API for decoding
        console.log('🔧 Trying Web Audio API fallback...');
        await playWithWebAudio(base64Audio);
      }

    } catch (error) {
      console.error('❌ Error playing audio:', error);
      isPlayingRef.current = false;
      setIsSpeaking(false);
      // Continue with next chunk
      playNextFromQueue();
    }
  }, []);

  // Fallback: Web Audio API for raw PCM audio (ElevenLabs sends 16-bit PCM at 16kHz)
  const playWithWebAudio = useCallback(async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Check if this is a valid WAV file (has RIFF header)
      const hasWavHeader = binaryString.substring(0, 4) === 'RIFF';
      
      let audioBuffer: AudioBuffer;
      
      if (hasWavHeader) {
        // Standard decode for WAV files
        console.log('🔊 Decoding as WAV file');
        audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));
      } else {
        // Raw PCM data - manually create AudioBuffer
        // ElevenLabs sends 16-bit signed PCM at 16kHz
        console.log('🔊 Decoding as raw PCM (16-bit, 16kHz)');
        const sampleRate = 16000;
        const numSamples = bytes.length / 2; // 16-bit = 2 bytes per sample
        
        audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Convert 16-bit signed PCM to float32 (-1 to 1)
        const view = new DataView(bytes.buffer);
        for (let i = 0; i < numSamples; i++) {
          const sample = view.getInt16(i * 2, true); // Little-endian
          channelData[i] = sample / 32768.0; // Normalize to -1 to 1
        }
        console.log('🔊 Created AudioBuffer from raw PCM:', { samples: numSamples, duration: audioBuffer.duration });
      }
      
      // Play the buffer
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        console.log('✅ Web Audio playback complete');
        isPlayingRef.current = false;
        setIsSpeaking(false);
        playNextFromQueue();
      };
      
      source.start(0);
      console.log('✅ Playing with Web Audio API');
      
    } catch (error) {
      console.error('❌ Web Audio fallback failed:', error);
      isPlayingRef.current = false;
      setIsSpeaking(false);
      playNextFromQueue();
    }
  }, []);

  // Queue audio chunk for playback
  const playAudioChunk = useCallback((base64Audio: string, format: string = 'wav') => {
    console.log('🎵 Queuing audio chunk, format:', format, 'length:', base64Audio?.length);
    if (!base64Audio || base64Audio.length < 100) {
      console.warn('⚠️ Skipping empty or too-small audio chunk');
      return;
    }
    // Store with format info for proper decoding
    audioQueueRef.current.push({ audio: base64Audio, format });
    playNextFromQueue();
  }, [playNextFromQueue]);

  // Start continuous recording with streaming
  const startCall = async () => {
    if (!isConnected) {
      onError?.('Not connected to voice service');
      return;
    }

    try {
      console.log('📞 Starting voice call...');
      
      // Initialize AudioContext on user interaction (required for autoplay)
      initAudioContext();
      
      // Clear any pending audio
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      
      // Update mutable ref BEFORE setting state
      isCallActiveRef.current = true;

      // Connect to Teachers Room AI with selected language
      console.log('🌐 Connecting with language:', language);
      wsService.current.send({
        type: 'connect_elevenlabs',
        context: 'teachers_room',
        language: language
      });

      // 🎯 CRITICAL FIX: Wait for ElevenLabs to be fully connected BEFORE starting recording
      // This prevents the race condition where audio is sent before the connection is ready
      console.log('⏳ Waiting for ElevenLabs connection...');
      
      const waitForElevenLabsConnection = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('ElevenLabs connection timeout (10s)'));
          }, 10000); // 10 second timeout
          
          const checkReady = (data: any) => {
            if (data.type === 'elevenlabs_connected') {
              cleanup();
              resolve();
            } else if (data.type === 'error' && data.message?.includes('ElevenLabs')) {
              cleanup();
              reject(new Error(data.message));
            }
          };
          
          const cleanup = () => {
            clearTimeout(timeout);
            wsService.current.off('message', checkReady);
          };
          
          wsService.current.on('message', checkReady);
        });
      };
      
      try {
        await waitForElevenLabsConnection();
        console.log('✅ ElevenLabs connected, starting recording...');
      } catch (connectionError: any) {
        console.error('❌ ElevenLabs connection failed:', connectionError.message);
        isCallActiveRef.current = false;
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        onError?.(connectionError.message || 'Failed to connect to ElevenLabs');
        return;
      }

      // 🎯 CRITICAL FIX: Use AudioContext to capture RAW PCM (16-bit, 16kHz, mono)
      // ElevenLabs Conversational AI REQUIRES this format - webm/opus will NOT work!
      console.log('🎙️ Setting up raw PCM capture for ElevenLabs (16kHz, 16-bit, mono)');
      
      // Create AudioContext at 16kHz sample rate (what ElevenLabs expects)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: 16000 
      });
      
      const source = audioContext.createMediaStreamSource(stream);
      
      // Use ScriptProcessorNode for raw PCM capture (deprecated but widely supported)
      // Buffer size of 4096 samples gives ~256ms chunks at 16kHz
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (!isCallActiveRef.current || !isElevenLabsReadyRef.current) {
          return;
        }
        
        try {
          // Get raw PCM samples (float32, range -1 to 1)
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Convert float32 to 16-bit signed PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            // Clamp and scale to 16-bit range
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          }
          
          // Convert Int16Array to base64
          const uint8Array = new Uint8Array(pcmData.buffer);
          let binaryString = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
              binaryString += String.fromCharCode(...chunk);
            }
            const base64Audio = btoa(binaryString);
            
          // Send raw PCM chunk to server
            wsService.current.send({
              type: 'audio_chunk',
            audio: base64Audio,
            format: 'pcm16'  // Tell server this is already raw PCM
            });
            
          // Log occasionally to avoid flooding console
          if (Math.random() < 0.1) {
            console.log('📤 Sent PCM audio chunk, size:', base64Audio.length);
          }
          } catch (error) {
          console.error('❌ Error processing PCM audio:', error);
          }
      };
      
      // Connect the audio graph
      source.connect(processor);
      processor.connect(audioContext.destination); // Required for ScriptProcessorNode to work
      
      // Store refs for cleanup
      // Note: We create a separate audioContext for recording at 16kHz
      // The playback audioContext (audioContextRef) remains at the default sample rate
      processorRef.current = processor;
      sourceRef.current = source;
      
      // Now it's safe to start recording - ElevenLabs is connected
      isElevenLabsReadyRef.current = true;
      setIsElevenLabsReady(true);
      
      console.log('✅ Raw PCM audio capture started (16kHz, 16-bit, mono)');
      setIsCallActive(true);
      
      onConversationStart?.();
      console.log('✅ Voice call started - ElevenLabs ready, recording active');
      
    } catch (error: any) {
      console.error('❌ Error starting call:', error);
      if (error.name === 'NotAllowedError') {
        onError?.('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        onError?.('No microphone found. Please connect a microphone and try again.');
      } else {
        onError?.('Failed to access microphone: ' + error.message);
      }
    }
  };

  // Stop call
  const stopCall = () => {
    console.log('📴 Stopping voice call...');
    
    // Update mutable refs immediately
    isCallActiveRef.current = false;
    isElevenLabsReadyRef.current = false;
    
    // Send end conversation signal
    try {
      wsService.current.send({
        type: 'end_conversation'
      });
    } catch (e) {
      console.log('⚠️ Could not send end_conversation:', e);
    }
    
    // Clean up old MediaRecorder if still exists
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    // Clean up audio processing nodes (raw PCM capture)
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    // Note: Don't close the recording audioContext - it might be shared with playback
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    setIsElevenLabsReady(false);
    
    setIsCallActive(false);
    onConversationEnd?.();
  };

  // Toggle call
  const toggleCall = () => {
    if (isCallActive) {
      stopCall();
    } else {
      startCall();
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return isDarkMode ? 'text-green-400' : 'text-green-600';
      case 'connecting': return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
      case 'error': return isDarkMode ? 'text-red-400' : 'text-red-600';
      default: return isDarkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  return (
    <div className={`voice-conversation-widget ${className}`}>
      <div className="flex flex-col items-center space-y-8">
        
        {/* Connection Status */}
        <div className={`flex items-center space-x-2 text-sm ${getStatusColor()}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            connectionStatus === 'error' ? 'bg-red-500' :
            'bg-gray-500'
          }`} />
          <span className="font-medium">
            {connectionStatus === 'connected' ? 'Ready' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             connectionStatus === 'error' ? 'Connection Error' :
             'Disconnected'}
          </span>
        </div>

        {/* Call Button */}
        <div className="relative">
          {/* Glow effect when active */}
          {isCallActive && (
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
          )}
          
          <button
            onClick={toggleCall}
            disabled={connectionStatus !== 'connected'}
            className={`relative w-40 h-40 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl ${
              isCallActive
                ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                : connectionStatus === 'connected'
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                : 'bg-gradient-to-br from-gray-400 to-gray-500'
            }`}
          >
            <div className="flex flex-col items-center justify-center">
              {isCallActive ? (
                <>
                  <PhoneOff className="w-12 h-12 text-white mb-2" />
                  <span className="text-white text-sm font-semibold">End Call</span>
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <Loader2 className="w-12 h-12 text-white mb-2 animate-spin" />
                  <span className="text-white text-sm font-semibold">Connecting</span>
                </>
              ) : (
                <>
                  <Phone className="w-12 h-12 text-white mb-2" />
                  <span className="text-white text-sm font-semibold">Start Call</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Status Text */}
        <div className="text-center max-w-md">
          <p className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {isCallActive 
              ? !isElevenLabsReady
                ? '🔄 Connecting to AI teacher...'
                : isSpeaking 
                  ? '🔊 Teacher is speaking...'
                  : '🎤 Listening...'
              : connectionStatus === 'connected' 
              ? 'Ready to start your lesson'
              : connectionStatus === 'connecting'
              ? 'Connecting to your teacher...'
              : 'Service unavailable'}
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {isCallActive 
              ? !isElevenLabsReady
                ? 'Please wait while we connect you to your AI teacher...'
                : isSpeaking
                  ? 'Your teacher is responding, please wait...'
                  : 'Speak naturally and your AI teacher will respond'
              : 'Click the button above to start a live voice conversation'}
          </p>
        </div>
        
        {/* Teacher Speaking Indicator */}
        {isCallActive && isSpeaking && (
          <div className="flex items-center space-x-3 px-6 py-3 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm">
            <Volume2 className={`w-5 h-5 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'} animate-pulse`} />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              Teacher responding...
            </span>
          </div>
        )}

        {/* Connection Progress Indicator */}
        {isCallActive && !isElevenLabsReady && (
          <div className="flex items-center space-x-3 px-6 py-3 rounded-full bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-sm">
            <Loader2 className={`w-5 h-5 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'} animate-spin`} />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
              Establishing AI connection...
            </span>
          </div>
        )}

        {/* Live Indicator */}
        {isCallActive && isElevenLabsReady && (
          <div className="flex items-center space-x-3 px-6 py-3 rounded-full bg-green-500/20 border border-green-500/30 backdrop-blur-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
              Live conversation in progress
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceConversationWidget;
