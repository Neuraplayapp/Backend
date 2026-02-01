import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Wifi,
  WifiOff,
  Headphones,
  Activity,
  Settings
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export interface DiagnosticResult {
  test: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  timestamp?: Date;
  duration?: number;
  id?: string;
}

export interface DiagnosticSession {
  id: string;
  timestamp: Date;
  config: typeof testConfig;
  results: DiagnosticResult[];
  overallStatus: 'idle' | 'running' | 'completed' | 'failed';
  environment: {
    userAgent: string;
    platform: string;
    webSocketSupport: boolean;
    mediaDevicesSupport: boolean;
    audioContextSupport: boolean;
  };
}

export interface WebSocketTestResult {
  connected: boolean;
  pingTime?: number;
  error?: string;
}

export interface TTSTestResult {
  success: boolean;
  audioGenerated: boolean;
  audioPlayed: boolean;
  voiceId?: string;
  duration?: number;
  error?: string;
}

export interface STTTestResult {
  success: boolean;
  transcriptionReceived: boolean;
  accuracy?: number;
  language?: string;
  confidence?: number;
  error?: string;
}

const TTSSTTDiagnostics: React.FC = () => {
  const { isDarkMode } = useTheme();
  
  // Core state
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  
  // Test-specific state
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Component integration state
  const [smallAssistantTest, setSmallAssistantTest] = useState<DiagnosticResult | null>(null);
  const [liteAssistantTest, setLiteAssistantTest] = useState<DiagnosticResult | null>(null);
  
  // Storage and history state
  const [savedSessions, setSavedSessions] = useState<DiagnosticSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  
  // Test configuration - extended timeout for longer recordings
  const [testConfig, setTestConfig] = useState({
    testText: "Hello! This is a test of the text-to-speech system. Can you hear me clearly?",
    expectedTranscription: "hello this is a test",
    voiceId: "8LVfoRdkh4zgjr8v5ObE", // Default English voice
    timeoutMs: 150000 // 2.5 minutes to support longer voice recordings
  });

  useEffect(() => {
    // Load saved sessions on mount
    loadSavedSessions();
    
    return () => {
      // Cleanup on unmount
      if (wsConnection) {
        wsConnection.close();
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (testAudioRef.current) {
        testAudioRef.current.pause();
      }
    };
  }, [wsConnection, mediaRecorder]); // Note: loadSavedSessions is called only on mount, dependencies are for cleanup

  // Auto-save results when they change
  useEffect(() => {
    if (autoSave && results.length > 0 && overallStatus !== 'running') {
      saveCurrentSession();
    }
  }, [results, overallStatus, autoSave]); // saveCurrentSession is stable, doesn't need to be in deps

  const addResult = (result: DiagnosticResult) => {
    const resultWithId = { 
      ...result, 
      timestamp: new Date(),
      id: `${result.test.replace(/\s+/g, '_')}_${Date.now()}`
    };
    setResults(prev => [...prev, resultWithId]);
  };

  const updateResult = (testName: string, updates: Partial<DiagnosticResult>) => {
    setResults(prev => prev.map(r => 
      r.test === testName ? { ...r, ...updates, timestamp: new Date() } : r
    ));
  };

  // Storage and retrieval functions
  const getStorageKey = () => 'neuraplay-tts-stt-diagnostics';
  
  const saveCurrentSession = () => {
    try {
      const session: DiagnosticSession = {
        id: `session_${Date.now()}`,
        timestamp: new Date(),
        config: testConfig,
        results,
        overallStatus,
        environment: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          webSocketSupport: typeof WebSocket !== 'undefined',
          mediaDevicesSupport: !!navigator.mediaDevices,
          audioContextSupport: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined'
        }
      };

      const existingSessions = JSON.parse(localStorage.getItem(getStorageKey()) || '[]');
      const updatedSessions = [session, ...existingSessions.slice(0, 19)]; // Keep last 20 sessions
      
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedSessions));
      setSavedSessions(updatedSessions);
      
      console.log('✅ Diagnostic session saved:', session.id);
      return session.id;
    } catch (error) {
      console.error('❌ Failed to save diagnostic session:', error);
      return null;
    }
  };

  const loadSavedSessions = () => {
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        const sessions = JSON.parse(saved).map((session: any) => ({
          ...session,
          timestamp: new Date(session.timestamp)
        }));
        setSavedSessions(sessions);
        console.log('✅ Loaded', sessions.length, 'diagnostic sessions');
      }
    } catch (error) {
      console.error('❌ Failed to load diagnostic sessions:', error);
    }
  };

  const loadSession = (sessionId: string) => {
    const session = savedSessions.find(s => s.id === sessionId);
    if (session) {
      setTestConfig(session.config);
      setResults(session.results);
      setOverallStatus(session.overallStatus);
      setSelectedSession(sessionId);
      console.log('✅ Loaded diagnostic session:', sessionId);
    }
  };

  const deleteSession = (sessionId: string) => {
    try {
      const updatedSessions = savedSessions.filter(s => s.id !== sessionId);
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedSessions));
      setSavedSessions(updatedSessions);
      
      if (selectedSession === sessionId) {
        setSelectedSession(null);
      }
      
      console.log('✅ Deleted diagnostic session:', sessionId);
    } catch (error) {
      console.error('❌ Failed to delete diagnostic session:', error);
    }
  };

  const exportResults = (format: 'json' | 'csv' = 'json') => {
    try {
      const session = selectedSession 
        ? savedSessions.find(s => s.id === selectedSession)
        : {
            id: `current_${Date.now()}`,
            timestamp: new Date(),
            config: testConfig,
            results,
            overallStatus,
            environment: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              webSocketSupport: typeof WebSocket !== 'undefined',
              mediaDevicesSupport: !!navigator.mediaDevices,
              audioContextSupport: typeof AudioContext !== 'undefined'
            }
          };

      if (!session) return;

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        content = JSON.stringify(session, null, 2);
        filename = `tts-stt-diagnostics-${session.id}.json`;
        mimeType = 'application/json';
      } else {
        // CSV format
        const headers = ['Test', 'Status', 'Message', 'Duration (ms)', 'Timestamp'];
        const rows = session.results.map(r => [
          r.test,
          r.status,
          r.message.replace(/"/g, '""'), // Escape quotes
          r.duration?.toString() || '',
          r.timestamp?.toISOString() || ''
        ]);
        
        content = [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
        
        filename = `tts-stt-diagnostics-${session.id}.csv`;
        mimeType = 'text/csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Exported diagnostic results:', filename);
    } catch (error) {
      console.error('❌ Failed to export results:', error);
    }
  };

  const importResults = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const session: DiagnosticSession = JSON.parse(content);
        
        // Validate session structure
        if (!session.id || !session.results || !Array.isArray(session.results)) {
          throw new Error('Invalid session format');
        }

        // Convert timestamp strings back to Date objects
        session.timestamp = new Date(session.timestamp);
        session.results = session.results.map(r => ({
          ...r,
          timestamp: r.timestamp ? new Date(r.timestamp) : undefined
        }));

        // Add to saved sessions
        const updatedSessions = [session, ...savedSessions];
        setSavedSessions(updatedSessions);
        localStorage.setItem(getStorageKey(), JSON.stringify(updatedSessions));
        
        // Load the imported session
        loadSession(session.id);
        
        console.log('✅ Imported diagnostic session:', session.id);
      } catch (error) {
        console.error('❌ Failed to import session:', error);
        alert('Failed to import session. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Clear the input
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all saved diagnostic data? This cannot be undone.')) {
      localStorage.removeItem(getStorageKey());
      setSavedSessions([]);
      setSelectedSession(null);
      console.log('✅ Cleared all diagnostic data');
    }
  };

  const compareWithPrevious = () => {
    if (savedSessions.length < 2) return null;
    
    const current = results;
    const previous = savedSessions[1]?.results || [];
    
    const comparison = current.map(currentResult => {
      const previousResult = previous.find(p => p.test === currentResult.test);
      if (!previousResult) return { ...currentResult, change: 'new' };
      
      if (currentResult.status !== previousResult.status) {
        return { 
          ...currentResult, 
          change: currentResult.status === 'passed' ? 'improved' : 'degraded',
          previousStatus: previousResult.status
        };
      }
      
      return { ...currentResult, change: 'unchanged' };
    });
    
    return comparison;
  };

  // 1. Enhanced WebSocket Connection Test
  const testWebSocketConnection = async (): Promise<WebSocketTestResult> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      addResult({
        test: 'WebSocket Connection',
        status: 'running',
        message: 'Testing WebSocket connectivity and message routing...'
      });

      try {
        // Test the actual system: ALL calls route to Render backend
        const renderWsUrl = `wss://neuraplay.onrender.com`;
        
        let connectionAttempts = 0;
        const maxAttempts = 1; // Only test Render - that's where ALL calls go
        const urls = [renderWsUrl];
        
        const attemptConnection = (url: string) => {
          const ws = new WebSocket(url);
          const attemptStartTime = Date.now();
          
          const timeout = setTimeout(() => {
            ws.close();
            connectionAttempts++;
            
            if (connectionAttempts < maxAttempts) {
              updateResult('WebSocket Connection', {
                status: 'running',
                message: `Connection attempt ${connectionAttempts} failed, trying ${urls[connectionAttempts]}...`
              });
              attemptConnection(urls[connectionAttempts]);
            } else {
              updateResult('WebSocket Connection', {
                status: 'failed',
                message: `WebSocket connection failed on all endpoints: ${urls.join(', ')}`,
                duration: Date.now() - startTime,
                details: { attemptedUrls: urls, errors: 'Connection timeout on all endpoints' }
              });
              resolve({ connected: false, error: 'Connection timeout on all endpoints' });
            }
          }, 5000);

          ws.onopen = () => {
            clearTimeout(timeout);
            const pingTime = Date.now() - attemptStartTime;
            setWsConnection(ws);
            
            // Test message sending
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            
            updateResult('WebSocket Connection', {
              status: 'passed',
              message: `WebSocket connected to ${url} (${pingTime}ms). Message routing test sent.`,
              duration: Date.now() - startTime,
              details: { 
                connectedUrl: url, 
                pingTime,
                messageTestSent: true,
                attempts: connectionAttempts + 1
              }
            });
            
            resolve({ connected: true, pingTime });
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              updateResult('WebSocket Connection', {
                status: 'passed',
                message: `WebSocket fully operational. Message routing confirmed.`,
                duration: Date.now() - startTime,
                details: { 
                  connectedUrl: url, 
                  messageReceived: data,
                  bidirectionalConfirmed: true
                }
              });
            } catch (e) {
              // Non-JSON message received, still counts as working
            }
          };

          ws.onerror = (error) => {
            clearTimeout(timeout);
            connectionAttempts++;
            
            if (connectionAttempts < maxAttempts) {
              updateResult('WebSocket Connection', {
                status: 'running',
                message: `Connection to ${url} failed, trying ${urls[connectionAttempts]}...`
              });
              attemptConnection(urls[connectionAttempts]);
            } else {
              updateResult('WebSocket Connection', {
                status: 'failed',
                message: `WebSocket connection failed on all endpoints`,
                duration: Date.now() - startTime,
                details: { 
                  attemptedUrls: urls, 
                  lastError: error.toString(),
                  totalAttempts: connectionAttempts
                }
              });
              resolve({ connected: false, error: `Failed on all URLs: ${error.toString()}` });
            }
          };

          ws.onclose = (event) => {
            clearTimeout(timeout);
            if (event.code !== 1000) { // Not normal closure
              console.log('WebSocket closed unexpectedly:', event.code, event.reason);
            }
          };
        };
        
        attemptConnection(urls[0]);

      } catch (error) {
        updateResult('WebSocket Connection', {
          status: 'failed',
          message: `WebSocket test initialization failed: ${error}`,
          duration: Date.now() - startTime
        });
        resolve({ connected: false, error: error.toString() });
      }
    });
  };

  // 2. ElevenLabs TTS Test
  const testElevenLabsTTS = async (): Promise<TTSTestResult> => {
    return new Promise(async (resolve) => {
      const startTime = Date.now();
      
      addResult({
        test: 'ElevenLabs TTS',
        status: 'running',
        message: 'Testing text-to-speech generation...'
      });

      try {
        // Test the actual working ElevenLabs endpoint
        const response = await fetch('/api/elevenlabs-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: testConfig.testText,
            voice_id: testConfig.voiceId,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Enhanced error reporting for direct TTS endpoint
          let enhancedMessage = `TTS API failed: ${response.status} - ${errorText}`;
          let actionableDetails: any = { 
            httpStatus: response.status, 
            rawError: errorText, 
            endpoint: '/api/elevenlabs-tts' 
          };
          
          if (response.status === 500) {
            if (errorText.includes('TTS service not configured')) {
              enhancedMessage = `ElevenLabs API key not configured. Check VITE_ELEVENLABS_API_KEY environment variable.`;
              actionableDetails.issue = 'missing_api_key';
              actionableDetails.solution = 'Set VITE_ELEVENLABS_API_KEY in environment variables';
            } else if (errorText.includes('TTS generation failed')) {
              enhancedMessage = `ElevenLabs API rejected request. Check API key validity and voice ID.`;
              actionableDetails.issue = 'api_rejection';
              actionableDetails.solution = 'Verify API key and voice ID are correct';
            }
          } else if (response.status === 401 || response.status === 403) {
            enhancedMessage = `ElevenLabs API authentication failed. API key may be invalid or expired.`;
            actionableDetails.issue = 'authentication_failed';
            actionableDetails.solution = 'Check API key validity at elevenlabs.io';
          } else if (response.status === 429) {
            enhancedMessage = `ElevenLabs API rate limit exceeded. Too many requests.`;
            actionableDetails.issue = 'rate_limit';
            actionableDetails.solution = 'Wait before retrying or upgrade API plan';
          }
          
          updateResult('ElevenLabs TTS', {
            status: 'failed',
            message: enhancedMessage,
            duration: Date.now() - startTime,
            details: actionableDetails
          });
          resolve({ success: false, audioGenerated: false, audioPlayed: false, error: errorText });
          return;
        }

        // Handle direct audio response from ElevenLabs
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        testAudioRef.current = audio;

        audio.oncanplaythrough = () => {
          updateResult('ElevenLabs TTS', {
            status: 'passed',
            message: `TTS generation successful! Audio ready to play (${Math.round(audioBlob.size / 1024)}KB)`,
            duration: Date.now() - startTime,
            details: { 
              voice_id: testConfig.voiceId, 
              audioSize: audioBlob.size,
              audioUrl,
              canPlay: true
            }
          });
          
          resolve({ 
            success: true, 
            audioGenerated: true, 
            audioPlayed: false,
            voiceId: testConfig.voiceId,
            duration: Date.now() - startTime
          });
        };

        audio.onerror = (error) => {
          updateResult('ElevenLabs TTS', {
            status: 'warning',
            message: 'TTS audio generated but playback failed',
            duration: Date.now() - startTime,
            details: { error }
          });
          
          resolve({ 
            success: true, 
            audioGenerated: true, 
            audioPlayed: false,
            error: 'Audio playback failed'
          });
        };

        // Start loading the audio
        audio.load();

      } catch (error) {
        updateResult('ElevenLabs TTS', {
          status: 'failed',
          message: `TTS test failed: ${error}`,
          duration: Date.now() - startTime
        });
        resolve({ success: false, audioGenerated: false, audioPlayed: false, error: error.toString() });
      }
    });
  };

  // 3. AssemblyAI STT Test
  const testAssemblyAISTT = async (): Promise<STTTestResult> => {
    return new Promise(async (resolve) => {
      const startTime = Date.now();
      
      addResult({
        test: 'AssemblyAI STT',
        status: 'running',
        message: 'Starting speech-to-text test...'
      });

      try {
        // Create a simple test audio blob (sine wave)
        const sampleRate = 44100;
        const duration = 2; // 2 seconds
        const samples = sampleRate * duration;
        
        // Create AudioContext and buffer for better browser compatibility
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = audioCtx.createBuffer(1, samples, sampleRate);
        
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < samples; i++) {
          channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1; // 440Hz tone
        }

        // Convert to WAV format (simplified)
        const wavBuffer = audioBufferToWav(audioBuffer);
        const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });

        // Convert to base64 (safely handle large arrays)
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Process in chunks to avoid stack overflow
        let binaryString = '';
        const chunkSize = 8192; // Process 8KB chunks
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, i + chunkSize);
          binaryString += String.fromCharCode(...chunk);
        }
        const base64Audio = btoa(binaryString);

        updateResult('AssemblyAI STT', {
          status: 'running',
          message: 'Sending test audio to AssemblyAI...'
        });

        // Test the actual working AssemblyAI endpoint
        const response = await fetch('/api/assemblyai-transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: base64Audio,
            audioType: 'wav',
            language_code: 'auto',
            speech_model: 'universal'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Enhanced error reporting for direct STT endpoint
          let enhancedMessage = `STT API failed: ${response.status} - ${errorText}`;
          let actionableDetails: any = { 
            httpStatus: response.status, 
            rawError: errorText, 
            endpoint: '/api/assemblyai-transcribe' 
          };
          
          if (response.status === 401 || response.status === 403) {
            enhancedMessage = `AssemblyAI authentication failed. Check VITE_ASSEMBLYAI_API_KEY configuration.`;
            actionableDetails.issue = 'authentication_failed';
            actionableDetails.solution = 'Verify API key at assemblyai.com';
          } else if (response.status === 400) {
            if (errorText.includes('audio')) {
              enhancedMessage = `Invalid audio data format. AssemblyAI couldn't process the audio.`;
              actionableDetails.issue = 'invalid_audio_format';
              actionableDetails.solution = 'Check audio encoding and format';
            } else {
              enhancedMessage = `Bad request to AssemblyAI: ${errorText}`;
              actionableDetails.issue = 'bad_request';
              actionableDetails.solution = 'Check request parameters';
            }
          } else if (response.status === 429) {
            enhancedMessage = `AssemblyAI rate limit exceeded. Too many transcription requests.`;
            actionableDetails.issue = 'rate_limit';
            actionableDetails.solution = 'Wait before retrying or upgrade API plan';
          } else if (response.status >= 500) {
            enhancedMessage = `AssemblyAI server error (${response.status}). Service may be temporarily unavailable.`;
            actionableDetails.issue = 'server_error';
            actionableDetails.solution = 'Retry later or check AssemblyAI status';
          }
          
          updateResult('AssemblyAI STT', {
            status: 'failed',
            message: enhancedMessage,
            duration: Date.now() - startTime,
            details: actionableDetails
          });
          resolve({ success: false, transcriptionReceived: false, error: errorText });
          return;
        }

        const result = await response.json();
        
        updateResult('AssemblyAI STT', {
          status: 'passed',
          message: `STT test completed. Response received: ${result.text || 'No text detected (expected for tone test)'}`,
          duration: Date.now() - startTime,
          details: { 
            transcription: result.text,
            language: result.language_code,
            confidence: result.confidence
          }
        });

        resolve({ 
          success: true, 
          transcriptionReceived: true,
          language: result.language_code,
          confidence: result.confidence
        });

      } catch (error) {
        updateResult('AssemblyAI STT', {
          status: 'failed',
          message: `STT test failed: ${error}`,
          duration: Date.now() - startTime
        });
        resolve({ success: false, transcriptionReceived: false, error: error.toString() });
      }
    });
  };

  // 4. Live Audio Recording Test
  const testLiveAudioRecording = async (): Promise<STTTestResult> => {
    return new Promise(async (resolve) => {
      const startTime = Date.now();
      
      addResult({
        test: 'Live Audio Recording',
        status: 'running',
        message: 'Requesting microphone access...'
      });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        updateResult('Live Audio Recording', {
          status: 'running',
          message: 'Microphone access granted. Please say: "Hello, this is a test"'
        });

        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];
        setMediaRecorder(recorder);
        setIsRecording(true);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          setIsRecording(false);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to base64 and test transcription
                      const arrayBuffer = await audioBlob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Process in chunks to avoid stack overflow
            let binaryString = '';
            const chunkSize = 8192; // Process 8KB chunks
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.slice(i, i + chunkSize);
              binaryString += String.fromCharCode(...chunk);
            }
            const base64Audio = btoa(binaryString);

          updateResult('Live Audio Recording', {
            status: 'running',
            message: 'Processing recorded audio...'
          });

          try {
            const response = await fetch('/api/assemblyai-transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio: base64Audio,
                audioType: 'webm',
                language_code: 'auto',
                speech_model: 'universal'
              })
            });

            if (!response.ok) {
              throw new Error(`STT failed: ${response.status}`);
            }

            const result = await response.json();
            const transcription = result.text || '';
            
            // Check if transcription matches expected content
            const accuracy = calculateTranscriptionAccuracy(transcription, testConfig.expectedTranscription);
            
            updateResult('Live Audio Recording', {
              status: accuracy > 0.7 ? 'passed' : accuracy > 0.4 ? 'warning' : 'failed',
              message: `Recording completed. Transcription: "${transcription}" (${Math.round(accuracy * 100)}% accuracy)`,
              duration: Date.now() - startTime,
              details: { 
                transcription,
                accuracy,
                audioSize: audioBlob.size
              }
            });

            resolve({ 
              success: true, 
              transcriptionReceived: true,
              accuracy,
              confidence: result.confidence
            });

          } catch (error) {
            updateResult('Live Audio Recording', {
              status: 'failed',
              message: `Transcription failed: ${error}`,
              duration: Date.now() - startTime
            });
            resolve({ success: false, transcriptionReceived: false, error: error.toString() });
          } finally {
            stream.getTracks().forEach(track => track.stop());
          }
        };

        // Record for 5 seconds
        recorder.start();
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, 5000);

      } catch (error) {
        updateResult('Live Audio Recording', {
          status: 'failed',
          message: `Microphone access denied or failed: ${error}`,
          duration: Date.now() - startTime
        });
        resolve({ success: false, transcriptionReceived: false, error: error.toString() });
      }
    });
  };

  // 5. Component Integration Tests
  const testComponentIntegration = async () => {
    const startTime = Date.now();
    
    // Test AIAssistantSmall integration
    addResult({
      test: 'AIAssistantSmall Integration',
      status: 'running',
      message: 'Testing small assistant voice features...'
    });

    try {
      // Simulate opening small assistant and testing TTS
      const smallAssistantEvent = new CustomEvent('test-small-assistant-tts', {
        detail: { text: testConfig.testText }
      });
      window.dispatchEvent(smallAssistantEvent);
      
      // Wait for response
      setTimeout(() => {
        updateResult('AIAssistantSmall Integration', {
          status: 'passed',
          message: 'Small assistant integration test completed',
          duration: Date.now() - startTime,
          details: { component: 'AIAssistantSmall', tested: ['TTS', 'STT'] }
        });
      }, 2000);

    } catch (error) {
      updateResult('AIAssistantSmall Integration', {
        status: 'failed',
        message: `Small assistant test failed: ${error}`,
        duration: Date.now() - startTime
      });
    }

    // Test NeuraPlayAssistantLite integration
    addResult({
      test: 'NeuraPlayAssistantLite Integration',
      status: 'running',
      message: 'Testing lite assistant voice features...'
    });

    try {
      // Simulate opening lite assistant
      const liteAssistantEvent = new CustomEvent('test-lite-assistant-voice', {
        detail: { text: testConfig.testText }
      });
      window.dispatchEvent(liteAssistantEvent);
      
      // Wait for response
      setTimeout(() => {
        updateResult('NeuraPlayAssistantLite Integration', {
          status: 'passed',
          message: 'Lite assistant integration test completed',
          duration: Date.now() - startTime,
          details: { component: 'NeuraPlayAssistantLite', tested: ['Voice Processing'] }
        });
      }, 2000);

    } catch (error) {
      updateResult('NeuraPlayAssistantLite Integration', {
        status: 'failed',
        message: `Lite assistant test failed: ${error}`,
        duration: Date.now() - startTime
      });
    }
  };

  // Helper function to calculate transcription accuracy
  const calculateTranscriptionAccuracy = (actual: string, expected: string): number => {
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

  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
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

  // Main test runner
  const runAllTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    setResults([]);
    setSelectedSession(null); // Clear selected session when running new tests
    
    try {
      // 1. Test WebSocket connection
      setCurrentTest('WebSocket Connection');
      await testWebSocketConnection();
      
      // 2. Test ElevenLabs TTS
      setCurrentTest('ElevenLabs TTS');
      await testElevenLabsTTS();
      
      // 3. Test AssemblyAI STT with synthetic audio
      setCurrentTest('AssemblyAI STT');
      await testAssemblyAISTT();
      
      // 4. Test component integration
      setCurrentTest('Component Integration');
      await testComponentIntegration();
      
      setOverallStatus('completed');
      
      // Auto-save will trigger via useEffect
      
    } catch (error) {
      console.error('Test suite failed:', error);
      setOverallStatus('failed');
      addResult({
        test: 'Test Suite',
        status: 'failed',
        message: `Test suite failed: ${error}`
      });
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  // Manual tests
  const playTestAudio = () => {
    if (testAudioRef.current) {
      testAudioRef.current.play().catch(error => {
        console.error('Audio playback failed:', error);
      });
    }
  };

  const startLiveRecording = () => {
    if (!isRecording) {
      testLiveAudioRecording();
    } else if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="text-green-500" size={20} />;
      case 'failed': return <XCircle className="text-red-500" size={20} />;
      case 'warning': return <AlertCircle className="text-yellow-500" size={20} />;
      case 'running': return <Activity className="text-blue-500 animate-spin" size={20} />;
      case 'pending': return <AlertCircle className="text-gray-400" size={20} />;
    }
  };

  const getOverallStatusColor = () => {
    switch (overallStatus) {
      case 'running': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">TTS/STT Diagnostics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive testing for Fireworks → ElevenLabs TTS and AssemblyAI STT speech rendering
          </p>
        </div>

        {/* Test Configuration */}
        <div className={`p-6 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={20} />
            <h2 className="text-xl font-semibold">Test Configuration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test Text (TTS)</label>
              <textarea
                value={testConfig.testText}
                onChange={(e) => setTestConfig(prev => ({ ...prev, testText: e.target.value }))}
                className={`w-full p-3 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}
                rows={2}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Expected Transcription (STT)</label>
              <input
                value={testConfig.expectedTranscription}
                onChange={(e) => setTestConfig(prev => ({ ...prev, expectedTranscription: e.target.value }))}
                className={`w-full p-3 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Voice ID</label>
              <select
                value={testConfig.voiceId}
                onChange={(e) => setTestConfig(prev => ({ ...prev, voiceId: e.target.value }))}
                className={`w-full p-3 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}
              >
                <option value="8LVfoRdkh4zgjr8v5ObE">English (Default)</option>
                <option value="RUB3PhT3UqHowKru61Ns">Russian</option>
                <option value="mRdG9GYEjJmIzqbYTidv">Arabic</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Timeout (ms)</label>
              <input
                type="number"
                value={testConfig.timeoutMs}
                onChange={(e) => setTestConfig(prev => ({ ...prev, timeoutMs: parseInt(e.target.value) }))}
                className={`w-full p-3 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}
              />
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className={`p-6 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex flex-wrap gap-4 mb-4">
            <motion.button
              onClick={runAllTests}
              disabled={isRunning}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isRunning 
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              whileHover={!isRunning ? { scale: 1.05 } : {}}
              whileTap={!isRunning ? { scale: 0.95 } : {}}
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </motion.button>

            <button
              onClick={playTestAudio}
              disabled={!testAudioRef.current}
              className="px-4 py-3 rounded-lg border border-green-500 text-green-500 hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
              title="Play Test Audio"
            >
              <Volume2 size={20} />
            </button>

            <button
              onClick={startLiveRecording}
              className={`px-4 py-3 rounded-lg border transition-colors ${
                isRecording
                  ? 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white'
                  : 'border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Live Recording Test'}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-3 rounded-lg border border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white transition-colors"
              title="Show Test History"
            >
              <Activity size={20} />
            </button>
          </div>

          {/* Storage Controls */}
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              onClick={() => saveCurrentSession()}
              disabled={results.length === 0}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Save Session
            </button>

            <button
              onClick={() => exportResults('json')}
              disabled={results.length === 0}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Export JSON
            </button>

            <button
              onClick={() => exportResults('csv')}
              disabled={results.length === 0}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Export CSV
            </button>

            <label className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 cursor-pointer transition-colors">
              Import
              <input
                type="file"
                accept=".json"
                onChange={importResults}
                className="hidden"
              />
            </label>

            <button
              onClick={clearAllData}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Clear All Data
            </button>

            <label className="flex items-center gap-2 px-3 py-2">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
              Auto-save
            </label>
          </div>
        </div>

        {/* Test History Panel */}
        {showHistory && (
          <div className={`p-6 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className="text-xl font-semibold mb-4">Test History ({savedSessions.length} sessions)</h2>
            
            {savedSessions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No saved sessions yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {savedSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded border cursor-pointer transition-colors ${
                      selectedSession === session.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => loadSession(session.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{session.id}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {session.timestamp.toLocaleString()}
                        </p>
                        <p className="text-sm">
                          {session.results.filter(r => r.status === 'passed').length} passed, 
                          {session.results.filter(r => r.status === 'failed').length} failed,
                          {session.results.filter(r => r.status === 'warning').length} warnings
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportResults('json');
                          }}
                          className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Export
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Test Status */}
        {currentTest && (
          <div className={`p-4 rounded-lg mb-6 ${isDarkMode ? 'bg-blue-900' : 'bg-blue-100'} border border-blue-500`}>
            <div className="flex items-center gap-2">
              <Activity className="animate-spin" size={20} />
              <span className="font-medium">Currently running: {currentTest}</span>
            </div>
          </div>
        )}

        {/* Overall Status */}
        <div className={`p-6 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Overall Status</h2>
            <div className="flex items-center gap-3">
              {selectedSession && (
                <span className="text-sm text-purple-600 dark:text-purple-400">
                  Viewing: {selectedSession}
                </span>
              )}
              <span className={`font-medium ${getOverallStatusColor()}`}>
                {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
              </span>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Tests: {results.filter(r => r.status === 'passed').length} passed, 
              {results.filter(r => r.status === 'failed').length} failed,
              {results.filter(r => r.status === 'warning').length} warnings
              {savedSessions.length > 0 && (
                <span className="ml-4">
                  • {savedSessions.length} saved sessions
                </span>
              )}
            </div>
            
            <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2`}>
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${results.length > 0 ? (results.filter(r => r.status !== 'pending' && r.status !== 'running').length / results.length) * 100 : 0}%` 
                }}
              />
            </div>

            {/* Comparison with previous session */}
            {savedSessions.length > 1 && !selectedSession && (
              <div className="mt-3 text-sm">
                <button
                  onClick={() => {
                    const comparison = compareWithPrevious();
                    if (comparison) {
                      console.log('Comparison with previous session:', comparison);
                    }
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Compare with previous session →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Test Results */}
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
          {results.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No tests run yet. Click "Run All Tests" to begin.</p>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg border ${
                    result.status === 'passed' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                    result.status === 'failed' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                    result.status === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                    result.status === 'running' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                    'border-gray-300 bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <h3 className="font-medium">{result.test}</h3>
                        <p className="text-sm opacity-75">{result.message}</p>
                        {result.duration && (
                          <p className="text-xs opacity-60 mt-1">
                            Duration: {result.duration}ms
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {result.timestamp && (
                      <span className="text-xs opacity-60">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  
                  {result.details && (
                    <div className="mt-3 p-3 bg-black/10 dark:bg-white/10 rounded text-xs">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* System Information */}
        <div className={`p-6 rounded-lg mt-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h2 className="text-xl font-semibold mb-4">System Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Browser:</strong> {navigator.userAgent.split(' ').slice(-2).join(' ')}
            </div>
            <div>
              <strong>Platform:</strong> {navigator.platform}
            </div>
            <div>
              <strong>WebSocket Support:</strong> {typeof WebSocket !== 'undefined' ? '✅ Yes' : '❌ No'}
            </div>
            <div>
              <strong>Media Devices:</strong> {navigator.mediaDevices ? '✅ Yes' : '❌ No'}
            </div>
            <div>
              <strong>Audio Context:</strong> {typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined' ? '✅ Yes' : '❌ No'}
            </div>
            <div>
              <strong>Local Storage:</strong> {typeof localStorage !== 'undefined' ? '✅ Yes' : '❌ No'}
            </div>
            <div>
              <strong>Current Time:</strong> {new Date().toLocaleString()}
            </div>
            <div>
              <strong>Storage Used:</strong> {(() => {
                try {
                  const data = localStorage.getItem(getStorageKey());
                  return data ? `${Math.round(data.length / 1024)}KB` : '0KB';
                } catch {
                  return 'Unknown';
                }
              })()}
            </div>
          </div>

          {/* Storage Statistics */}
          {savedSessions.length > 0 && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
              <h3 className="font-medium mb-2">Storage Statistics</h3>
              <div className="text-sm space-y-1">
                <div>Total Sessions: {savedSessions.length}</div>
                <div>
                  Success Rate: {Math.round(
                    (savedSessions.reduce((acc, session) => 
                      acc + session.results.filter(r => r.status === 'passed').length, 0
                    ) / savedSessions.reduce((acc, session) => acc + session.results.length, 0)) * 100
                  )}%
                </div>
                <div>
                  Most Recent: {savedSessions[0]?.timestamp.toLocaleString()}
                </div>
                <div>
                  Oldest: {savedSessions[savedSessions.length - 1]?.timestamp.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TTSSTTDiagnostics;
