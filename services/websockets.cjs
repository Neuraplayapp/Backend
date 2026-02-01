const WebSocket = require('ws');

// For Node.js versions without native fetch
let fetch;
try {
  fetch = require('node-fetch');
} catch (error) {
  console.warn('⚠️ node-fetch not available, using global fetch or disabling some features');
  fetch = global.fetch || (() => Promise.reject('Fetch not available'));
}

// Store ElevenLabs WebSocket connections per client
const elevenLabsConnections = new Map();

/**
 * Convert raw PCM audio to WAV format by adding headers
 * ElevenLabs Conversational AI returns PCM audio
 * 
 * IMPORTANT: ElevenLabs Convai uses:
 * - 16kHz sample rate for input
 * - Output format varies - may return MP3 or PCM depending on config
 * - PCM is signed 16-bit little-endian
 */
function pcmToWav(pcmBase64, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) {
  try {
    const pcmBuffer = Buffer.from(pcmBase64, 'base64');
    const dataLength = pcmBuffer.length;
    
    // Log raw data info for debugging
    console.log('🔧 PCM to WAV conversion:', {
      inputLength: dataLength,
      sampleRate,
      numChannels,
      bitsPerSample,
      firstBytes: pcmBuffer.slice(0, 10).toString('hex')
    });
    
    // Check if data already has WAV header (starts with RIFF)
    if (pcmBuffer.slice(0, 4).toString() === 'RIFF') {
      console.log('📦 Data already in WAV format, returning as-is');
      return pcmBase64;
    }
    
    // Check if data is MP3 (starts with ID3 or FF FB/FF FA)
    if (pcmBuffer.slice(0, 3).toString() === 'ID3' || 
        (pcmBuffer[0] === 0xFF && (pcmBuffer[1] & 0xE0) === 0xE0)) {
      console.log('📦 Data is MP3 format, sending as-is with mp3 format hint');
      // Return as MP3 - let client know the format
      return { audio: pcmBase64, format: 'mp3' };
    }
    
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    
    // Create WAV header (44 bytes)
    const header = Buffer.alloc(44);
    
    // RIFF chunk descriptor
    header.write('RIFF', 0);                          // ChunkID
    header.writeUInt32LE(36 + dataLength, 4);         // ChunkSize
    header.write('WAVE', 8);                          // Format
    
    // fmt sub-chunk
    header.write('fmt ', 12);                         // Subchunk1ID
    header.writeUInt32LE(16, 16);                     // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20);                      // AudioFormat (1 = PCM)
    header.writeUInt16LE(numChannels, 22);            // NumChannels
    header.writeUInt32LE(sampleRate, 24);             // SampleRate
    header.writeUInt32LE(byteRate, 28);               // ByteRate
    header.writeUInt16LE(blockAlign, 32);             // BlockAlign
    header.writeUInt16LE(bitsPerSample, 34);          // BitsPerSample
    
    // data sub-chunk
    header.write('data', 36);                         // Subchunk2ID
    header.writeUInt32LE(dataLength, 40);             // Subchunk2Size
    
    // Combine header and data
    const wavBuffer = Buffer.concat([header, pcmBuffer]);
    console.log('✅ WAV created, total size:', wavBuffer.length);
    return wavBuffer.toString('base64');
  } catch (error) {
    console.error('❌ PCM to WAV conversion failed:', error);
    return pcmBase64; // Return original on failure
  }
}

// Store connection state (pending audio chunks, ready status, keep-alive intervals)
const connectionStates = new Map();

// WebSocket connection handling
function handleWebSocketConnections(wss) {
  wss.on('connection', (ws) => {
    console.log('🔗 WebSocket client connected');
    const clientId = Math.random().toString(36).substring(7);
    
    // Initialize connection state for this client
    connectionStates.set(clientId, {
      isReady: false,
      pendingAudioChunks: [],
      keepAliveInterval: null,
      conversationId: null
    });
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        console.log('📥 Received WebSocket message:', data.type);
        
        // Handle different message types
        switch (data.type) {
          case 'connect_elevenlabs':
            // Accept language and context parameters from client
            await handleElevenLabsConnection(ws, clientId, data.language || 'en', data.context || 'general');
            break;
            
          case 'audio_chunk':
            await handleAudioChunk(ws, clientId, data.audio);
            break;
            
          case 'tts_request':
            await handleTTSRequest(ws, data.text, data.voiceId, data.modelId);
            break;
            
          case 'end_conversation':
            await handleEndConversation(clientId);
            break;
            
          default:
            console.log('📥 Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected');
      cleanupClient(clientId);
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  });
}

// Clean up client resources
function cleanupClient(clientId) {
  // Clean up ElevenLabs connection
  const elevenLabsWs = elevenLabsConnections.get(clientId);
  if (elevenLabsWs) {
    elevenLabsWs.close();
    elevenLabsConnections.delete(clientId);
  }
  
  // Clean up connection state
  const state = connectionStates.get(clientId);
  if (state) {
    if (state.keepAliveInterval) {
      clearInterval(state.keepAliveInterval);
    }
    connectionStates.delete(clientId);
  }
}

// Handle ElevenLabs WebSocket connection
async function handleElevenLabsConnection(clientWs, clientId, language = 'en', context = 'general') {
  try {
    console.log('🎯 Connecting to ElevenLabs Conversational AI...');
    console.log('🌐 Client requested language:', language);
    console.log('🏫 Context:', context);
    
    const ElevenLabsWS = require('ws');
    const agentId = process.env.ELEVENLABS_AGENT_ID || 'agent_2201k13zjq5nf9faywz14701hyhb';
    const apiKey = process.env.VITE_ELEVENLABS_API_KEY;
    
    console.log('🔑 Using Agent ID:', agentId);
    console.log('🔑 API Key available:', !!apiKey);
    console.log('🔑 API Key length:', apiKey ? apiKey.length : 0);
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key not found in environment variables');
    }
    
    // Clean up any existing connection for this client
    const existingWs = elevenLabsConnections.get(clientId);
    if (existingWs) {
      console.log('🔄 Closing existing ElevenLabs connection...');
      existingWs.close();
      elevenLabsConnections.delete(clientId);
    }
    
    // Reset connection state
    const state = connectionStates.get(clientId) || {
      isReady: false,
      pendingAudioChunks: [],
      keepAliveInterval: null,
      conversationId: null
    };
    state.isReady = false;
    state.pendingAudioChunks = [];
    if (state.keepAliveInterval) {
      clearInterval(state.keepAliveInterval);
      state.keepAliveInterval = null;
    }
    connectionStates.set(clientId, state);
    
    // IMPORTANT: Add inactivity_timeout to extend the connection timeout to 180 seconds
    // This prevents the connection from closing after 20 seconds of inactivity
    // Also explicitly request PCM output format at 16kHz for consistent decoding
    const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}&inactivity_timeout=180&output_format=pcm_16000`;
    console.log('🌐 WebSocket URL constructed:', wsUrl);

    const elevenLabsWs = new ElevenLabsWS(wsUrl, {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    elevenLabsWs.on('open', () => {
      console.log('✅ Connected to ElevenLabs WebSocket');
      elevenLabsConnections.set(clientId, elevenLabsWs);
      
      // CRITICAL: Send conversation initiation message to start the conversation
      console.log('🎯 Sending conversation initiation to ElevenLabs...');
      console.log('🎤 Setting agent language to:', language);
      
      // Language-specific prompts for Teachers Room
      const prompts = {
        en: "You are an experienced, patient, and engaging AI teacher for NeuraPlay. Your role is to teach, guide, and inspire students of all ages in a conversational manner. Explain concepts clearly, ask Socratic questions to promote deeper thinking, provide examples, and adapt to the student's learning pace. Be encouraging, supportive, and make learning enjoyable. Always respond in English.",
        ru: "Вы опытный, терпеливый и увлекательный учитель ИИ для NeuraPlay. Ваша роль — обучать, направлять и вдохновлять учеников всех возрастов в разговорной манере. Объясняйте понятия четко, задавайте сократовские вопросы для глубокого мышления, приводите примеры и адаптируйтесь к темпу обучения ученика. Будьте ободряющими, поддерживающими и делайте обучение приятным. Всегда отвечайте на русском языке.",
        ar: "أنت معلم ذكاء اصطناعي ذو خبرة وصبور وجذاب لـ NeuraPlay. دورك هو التعليم والإرشاد وإلهام الطلاب من جميع الأعمار بطريقة محادثة. اشرح المفاهيم بوضوح، واطرح أسئلة سقراطية لتعزيز التفكير العميق، وقدم أمثلة، وتكيف مع وتيرة تعلم الطالب. كن مشجعًا وداعمًا واجعل التعلم ممتعًا. أجب دائمًا باللغة العربية.",
        kk: "Сіз NeuraPlay үшін тәжірибелі, шыдамды және тартымды AI мұғалімісіз. Сіздің рөліңіз - барлық жастағы студенттерге сөйлесу тәсілімен оқыту, бағыттау және шабыттандыру. Ұғымдарды анық түсіндіріңіз, терең ойлауды дамыту үшін сократтық сұрақтар қойыңыз, мысалдар келтіріңіз және студенттің оқу қарқынына бейімделіңіз. Ынталандырушы, қолдаушы болыңыз және оқуды қызықты етіңіз. Әрқашан қазақ тілінде жауап беріңіз.",
        sv: "Du är en erfaren, tålmodig och engagerande AI-lärare för NeuraPlay. Din roll är att undervisa, vägleda och inspirera elever i alla åldrar på ett samtalsbaserat sätt. Förklara begrepp tydligt, ställ sokratiska frågor för att främja djupare tänkande, ge exempel och anpassa dig till elevens inlärningstempo. Var uppmuntrande, stödjande och gör lärandet roligt. Svara alltid på svenska."
      };
      
      const firstMessages = {
        en: "Hello! I'm your AI teacher. What would you like to learn about today?",
        ru: "Привет! Я ваш AI-учитель. Чему бы вы хотели научиться сегодня?",
        ar: "مرحباً! أنا معلمك الذكي. ماذا تريد أن تتعلم اليوم؟",
        kk: "Сәлем! Мен сіздің AI мұғаліміңізбін. Бүгін не үйренгіңіз келеді?",
        sv: "Hej! Jag är din AI-lärare. Vad vill du lära dig om idag?"
      };
      
      // Default prompts for non-teachers_room context
      const defaultPrompt = "You are a helpful, friendly AI assistant for NeuraPlay, an educational platform for children. Keep responses concise and engaging.";
      const defaultFirstMessage = "Hi! I'm your AI assistant. How can I help you today!";
      
      const prompt = context === 'teachers_room' 
        ? (prompts[language] || prompts.en)
        : defaultPrompt;
      
      const firstMessage = context === 'teachers_room'
        ? (firstMessages[language] || firstMessages.en)
        : defaultFirstMessage;
      
      elevenLabsWs.send(JSON.stringify({
        type: 'conversation_initiation_client_data',
        conversation_config_override: {
          agent: {
            prompt: {
              prompt: prompt
            },
            first_message: firstMessage,
            language: language // Use client-specified language (defaults to 'en')
          }
        }
      }));
      
      // Set up keep-alive ping every 15 seconds to prevent timeout
      // ElevenLabs closes connection after 20 seconds of inactivity
      const keepAliveInterval = setInterval(() => {
        const currentWs = elevenLabsConnections.get(clientId);
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          console.log('🏓 Sending keep-alive ping to ElevenLabs');
          // Send a space character as keep-alive (as per ElevenLabs docs)
          // Note: For convai, we may need to use a different format
          try {
            // Try sending a ping-type message
            currentWs.send(JSON.stringify({
              type: 'ping'
            }));
          } catch (err) {
            console.log('⚠️ Keep-alive ping failed:', err.message);
          }
        } else {
          console.log('🔌 ElevenLabs connection closed, stopping keep-alive');
          clearInterval(keepAliveInterval);
        }
      }, 15000); // 15 seconds
      
      state.keepAliveInterval = keepAliveInterval;
      connectionStates.set(clientId, state);
      
      // Don't mark as ready yet - wait for conversation_initiation_metadata
      clientWs.send(JSON.stringify({
        type: 'elevenlabs_connecting',
        message: 'WebSocket connected, waiting for conversation initialization...'
      }));
    });
    
    elevenLabsWs.on('message', (data) => {
      try {
        const response = JSON.parse(data);
        console.log('📥 ElevenLabs response:', response.type || 'unknown', JSON.stringify(response).substring(0, 200));
        
        const currentState = connectionStates.get(clientId);
        
        // Handle different ElevenLabs message types
        if (response.type === 'conversation_initiation_metadata') {
          console.log('✅ ElevenLabs conversation initiated successfully');
          const conversationId = response.conversation_initiation_metadata_event?.conversation_id;
          console.log('🎯 Conversation ID:', conversationId);
          
          // NOW the connection is fully ready
          if (currentState) {
            currentState.isReady = true;
            currentState.conversationId = conversationId;
            connectionStates.set(clientId, currentState);
            
            // Send ready confirmation to client
            clientWs.send(JSON.stringify({
              type: 'elevenlabs_connected',
              message: 'Connected to ElevenLabs Conversational AI',
              conversationId: conversationId
            }));
            
            // Process any pending audio chunks
            if (currentState.pendingAudioChunks.length > 0) {
              console.log(`📤 Processing ${currentState.pendingAudioChunks.length} pending audio chunks`);
              const elevenLabsWsRef = elevenLabsConnections.get(clientId);
              for (const audioChunk of currentState.pendingAudioChunks) {
                if (elevenLabsWsRef && elevenLabsWsRef.readyState === WebSocket.OPEN) {
                  elevenLabsWsRef.send(JSON.stringify({
                    user_audio_chunk: audioChunk
                  }));
                  console.log('📤 Sent pending audio chunk to ElevenLabs');
                }
              }
              currentState.pendingAudioChunks = [];
              connectionStates.set(clientId, currentState);
            }
          }
          
        } else if (response.type === 'audio') {
          console.log('🔊 Received audio from ElevenLabs');
          const pcmAudio = response.audio_event?.audio_base_64;
          if (pcmAudio) {
            // Convert PCM to WAV format so browser can decode it
            const result = pcmToWav(pcmAudio);
            
            // Handle both string (wav base64) and object (mp3 format) returns
            if (typeof result === 'object' && result.format === 'mp3') {
              console.log('🔊 Sending MP3 audio, size:', result.audio.length);
              clientWs.send(JSON.stringify({
                type: 'audio_chunk',
                audio: result.audio,
                format: 'mp3'
              }));
            } else {
              console.log('🔊 Converted to WAV, size:', result.length);
            clientWs.send(JSON.stringify({
              type: 'audio_chunk',
                audio: result,
              format: 'wav'
            }));
            }
          }
          
        } else if (response.type === 'agent_response') {
          console.log('💬 Received text response from ElevenLabs:', response.agent_response_event?.agent_response?.substring(0, 100));
          clientWs.send(JSON.stringify({
            type: 'ai_response',
            text: response.agent_response_event?.agent_response
          }));
          
        } else if (response.type === 'user_transcript') {
          console.log('👤 User transcript:', response.user_transcription_event?.user_transcript);
          clientWs.send(JSON.stringify({
            type: 'user_transcript',
            text: response.user_transcription_event?.user_transcript
          }));
          
        } else if (response.type === 'ping') {
          // Respond to ping with pong
          console.log('🏓 Received ping, sending pong');
          const currentElevenLabsWs = elevenLabsConnections.get(clientId);
          if (currentElevenLabsWs && currentElevenLabsWs.readyState === WebSocket.OPEN) {
            currentElevenLabsWs.send(JSON.stringify({
              type: 'pong',
              event_id: response.ping_event?.event_id
            }));
          }
          
        } else if (response.type === 'interruption') {
          console.log('⚡ Agent interrupted');
          clientWs.send(JSON.stringify({
            type: 'interruption'
          }));
          
        } else if (response.type === 'error') {
          console.error('❌ ElevenLabs error:', response.error || response.message);
          clientWs.send(JSON.stringify({
            type: 'error',
            message: response.error || response.message || 'ElevenLabs error'
          }));
          
        } else {
          console.log('📥 Other ElevenLabs message:', response.type);
        }
      } catch (error) {
        console.error('❌ Error processing ElevenLabs response:', error);
      }
    });
    
    elevenLabsWs.on('error', (error) => {
      console.error('❌ ElevenLabs WebSocket error:', error);
      const isAuthError = /401|403|Unauthorized|Forbidden/i.test(String(error?.message || error));
      clientWs.send(JSON.stringify({
        type: 'error',
        message: isAuthError ? 'ElevenLabs authorization failed (check API key or agent permissions)' : 'ElevenLabs connection error: ' + (error?.message || 'Unknown error')
      }));
      
      // Mark connection as not ready
      const currentState = connectionStates.get(clientId);
      if (currentState) {
        currentState.isReady = false;
        connectionStates.set(clientId, currentState);
      }
    });
    
    elevenLabsWs.on('close', (code, reason) => {
      console.log('🔌 ElevenLabs WebSocket closed, code:', code, 'reason:', reason?.toString());
      elevenLabsConnections.delete(clientId);
      
      // Clean up keep-alive interval
      const currentState = connectionStates.get(clientId);
      if (currentState) {
        if (currentState.keepAliveInterval) {
          clearInterval(currentState.keepAliveInterval);
          currentState.keepAliveInterval = null;
        }
        currentState.isReady = false;
        connectionStates.set(clientId, currentState);
      }
      
      // Notify client
      clientWs.send(JSON.stringify({
        type: 'elevenlabs_disconnected',
        message: 'ElevenLabs connection closed',
        code: code
      }));
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to ElevenLabs:', error);
    clientWs.send(JSON.stringify({
      type: 'error',
      message: 'Failed to connect to ElevenLabs: ' + (error?.message || 'Unknown error')
    }));
  }
}

// Handle ending conversation
async function handleEndConversation(clientId) {
  console.log('📴 Ending conversation for client:', clientId);
  
  const elevenLabsWs = elevenLabsConnections.get(clientId);
  if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
    try {
      // Send end of conversation signal
      elevenLabsWs.send(JSON.stringify({
        type: 'end_of_audio'
      }));
      console.log('📤 Sent end_of_audio to ElevenLabs');
    } catch (error) {
      console.error('❌ Error sending end_of_audio:', error);
    }
  }
}

// Handle audio chunk forwarding to ElevenLabs
async function handleAudioChunk(clientWs, clientId, audioBase64) {
  try {
    const elevenLabsWs = elevenLabsConnections.get(clientId);
    const state = connectionStates.get(clientId);
    
    // 🎯 IMPROVED: If we have state (connection initiated) but WebSocket not ready yet, queue the audio
    // This handles the race condition where audio arrives before WebSocket 'open' event
    if (state && (!elevenLabsWs || elevenLabsWs.readyState !== WebSocket.OPEN || !state.isReady)) {
      console.log('⏳ ElevenLabs connection not ready yet, queuing audio chunk (state exists:', !!state, ', ws exists:', !!elevenLabsWs, ', isReady:', state?.isReady, ')');
      
      // Queue the audio chunk to be sent when ready
      state.pendingAudioChunks.push(audioBase64);
      connectionStates.set(clientId, state);
      
      // Only notify client occasionally to reduce noise
      if (state.pendingAudioChunks.length <= 3) {
        clientWs.send(JSON.stringify({
          type: 'audio_queued',
          message: `Audio queued (${state.pendingAudioChunks.length} chunks), waiting for ElevenLabs connection`
        }));
      }
      return;
    }
    
    // Check if connection exists and is open
    if (!elevenLabsWs || elevenLabsWs.readyState !== WebSocket.OPEN) {
      console.log('⚠️ ElevenLabs WebSocket not open and no state - connection not initiated');
      
      // No state means connect_elevenlabs was never called
      if (!state) {
        console.log('⚠️ No ElevenLabs connection state found - did you call connect_elevenlabs first?');
        clientWs.send(JSON.stringify({
          type: 'error',
          message: 'ElevenLabs not connected. Please connect first.'
        }));
        return;
      }
      
      // Fallback: Use AssemblyAI + Fireworks for conversation
      console.log('🔄 Using fallback conversation flow');
      await handleFallbackConversation(clientWs, audioBase64);
      return;
    }
    
    // Double-check state is ready (should be true if we got here)
    if (!state || !state.isReady) {
      console.log('⏳ ElevenLabs connection open but not ready yet, queuing audio chunk');
      
      // Queue the audio chunk to be sent when ready
      if (state) {
        state.pendingAudioChunks.push(audioBase64);
        connectionStates.set(clientId, state);
        
        clientWs.send(JSON.stringify({
          type: 'audio_queued',
          message: 'Audio queued, waiting for ElevenLabs initialization'
        }));
      }
      return;
    }
    
    console.log('🎤 Forwarding audio chunk to ElevenLabs');
    
    // Forward audio chunk to ElevenLabs in the correct format (no "type" field)
    elevenLabsWs.send(JSON.stringify({
      user_audio_chunk: audioBase64
    }));
    
    console.log('📤 Sent audio chunk to ElevenLabs, size:', audioBase64.length);
    
    // Send acknowledgment to client
    clientWs.send(JSON.stringify({
      type: 'audio_ack',
      message: 'Audio chunk forwarded to ElevenLabs'
    }));
    
  } catch (error) {
    console.error('❌ Error forwarding audio chunk:', error);
    // Use fallback instead of failing
    await handleFallbackConversation(clientWs, audioBase64);
  }
}

// Fallback conversation using AssemblyAI + Fireworks AI
async function handleFallbackConversation(clientWs, audioBase64) {
  try {
    console.log('🔄 Using fallback conversation flow');
    
    const assemblyAIKey = process.env.VITE_ASSEMBLYAI_API_KEY;
    if (!assemblyAIKey) {
      throw new Error('AssemblyAI API key not configured');
    }
    
    // Step 1: Upload audio for transcription
    // First, upload the audio data
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': assemblyAIKey,
        'Content-Type': 'application/octet-stream',
      },
      body: audioBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ AssemblyAI upload failed:', uploadResponse.status, errorText);
      throw new Error('Audio upload failed: ' + uploadResponse.status);
    }

    const uploadResult = await uploadResponse.json();
    const audioUrl = uploadResult.upload_url;
    console.log('📤 Audio uploaded to AssemblyAI:', audioUrl);
    
    // Step 2: Request transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyAIKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speech_model: 'universal'
      })
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error('❌ AssemblyAI transcription request failed:', transcriptResponse.status, errorText);
      throw new Error('Transcription request failed: ' + transcriptResponse.status);
    }

    const transcriptResult = await transcriptResponse.json();
    const transcriptId = transcriptResult.id;
    console.log('📝 Transcription started, ID:', transcriptId);
    
    // Poll for completion with extended timeout for longer recordings (up to 2 minutes)
    let finalResult;
    let pollAttempts = 0;
    const maxPollAttempts = 120; // 120 seconds max for longer recordings
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      pollAttempts++;
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { 'Authorization': assemblyAIKey }
      });
      finalResult = await pollResponse.json();
      
      if (pollAttempts >= maxPollAttempts) {
        console.log('⏰ WebSocket transcription timeout after', pollAttempts, 'seconds');
        clientWs.send(JSON.stringify({
          type: 'error',
          message: 'Transcription timeout - recording may be too long. Try shorter segments.'
        }));
        return;
      }
      
      if (finalResult.status === 'error') {
        console.error('❌ Transcription error:', finalResult.error);
        throw new Error('Transcription failed: ' + finalResult.error);
      }
    } while (finalResult.status === 'processing' || finalResult.status === 'queued');

    if (!finalResult.text) {
      console.log('⚠️ No text transcribed from audio');
      return;
    }
    
    console.log('✅ Transcription complete:', finalResult.text.substring(0, 100));

    // Step 3: Generate AI response with conversation-appropriate length using gpt-oss-120b
    // FIXED: Use absolute URL for backend fetch calls with proper Render fallback
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'neuraplay-ai-platform.onrender.com'}` 
      : 'http://localhost:3001';
    
    const aiResponse = await fetch(`${baseUrl}/api/unified-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service: 'fireworks',
        endpoint: 'llm-completion',
        data: {
          model: 'accounts/fireworks/models/gpt-oss-120b', // Use gpt-oss-120b for better teaching quality
          messages: [
            { 
              role: 'system', 
              content: 'You are an experienced, patient, and engaging AI teacher in the Teachers Room. Explain concepts clearly, use examples, ask thought-provoking questions, and adapt to the student\'s learning pace. Keep responses conversational and appropriately detailed (concise for simple questions, comprehensive for complex topics). Be encouraging and make learning enjoyable.'
            },
            { role: 'user', content: finalResult.text }
          ],
          max_tokens: getResponseLength(finalResult.text),
          temperature: 0.7,
          stream: false
        }
      })
    });

    const aiResult = await aiResponse.json();
    const responseText = aiResult.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response.';
    
    // Step 4: Send text response
    clientWs.send(JSON.stringify({
      type: 'ai_response',
      text: responseText
    }));

    // Step 5: Generate TTS using ElevenLabs
    const elevenLabsKey = process.env.VITE_ELEVENLABS_API_KEY;
    if (elevenLabsKey) {
      const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/8LVfoRdkh4zgjr8v5ObE`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsKey,
        },
        body: JSON.stringify({
          text: responseText,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      });
      
      if (ttsResponse.ok) {
        const audioBuffer = await ttsResponse.buffer();
        const base64Audio = audioBuffer.toString('base64');
        
        clientWs.send(JSON.stringify({
          type: 'audio_chunk',
          audio: base64Audio
        }));
      } else {
        console.error('❌ TTS failed:', ttsResponse.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Fallback conversation error:', error);
    clientWs.send(JSON.stringify({
      type: 'error',
      message: 'Fallback conversation failed: ' + (error?.message || 'Unknown error')
    }));
  }
}

// Determine appropriate response length based on input
function getResponseLength(inputText) {
  const wordCount = inputText.split(' ').length;
  
  if (wordCount <= 5) return 50;      // Short questions: brief answers
  if (wordCount <= 15) return 150;    // Medium questions: moderate answers  
  if (wordCount <= 30) return 300;    // Longer questions: detailed answers
  return 500;                         // Complex topics: comprehensive answers
}

// Handle direct TTS requests
async function handleTTSRequest(clientWs, text, voiceId = '8LVfoRdkh4zgjr8v5ObE', modelId = 'eleven_turbo_v2_5') {
  try {
    console.log('🎤 Processing TTS request:', text?.substring(0, 50));
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.VITE_ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }
    
    const audioBuffer = await response.buffer();
    const base64Audio = audioBuffer.toString('base64');
    
    clientWs.send(JSON.stringify({
      type: 'audio_chunk',
      audio: base64Audio
    }));
    
  } catch (error) {
    console.error('❌ TTS request error:', error);
    clientWs.send(JSON.stringify({
      type: 'error',
      message: 'TTS generation failed'
    }));
  }
}

module.exports = {
  handleWebSocketConnections,
  handleElevenLabsConnection,
  handleAudioChunk,
  handleFallbackConversation,
  handleTTSRequest,
  handleEndConversation
};
