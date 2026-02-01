# Render Platform Setup for NeuraPlay AI

## Environment Variables Required

Add these environment variables in your Render dashboard:

### API Keys
```bash
# ElevenLabs API Key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# AssemblyAI API Key
VITE_ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here

# Together AI API Key
together_token=your_together_ai_api_key_here

# ElevenLabs Agent ID (for conversational AI)
ELEVENLABS_AGENT_ID=agent_2201k13zjq5nf9faywz14701hyhb
```

### Platform Configuration
```bash
# Platform identifier
VITE_PLATFORM=render

# WebSocket enabled
VITE_WS_ENABLED=true

# API Base URL
VITE_API_BASE=/api
```

## Build & Deploy Commands

### Build Command:
```bash
npm run build:render
```

### Start Command:
```bash
npm run start
```

## Features Enabled on Render

✅ **WebSocket Conversation Mode**
- Real-time audio streaming to ElevenLabs
- AI conversation responses
- Live TTS audio playback

✅ **Record Mode** 
- Speech-to-text via AssemblyAI
- AI text generation via Together AI
- TTS response playback

✅ **REST API Endpoints**
- `/api/assemblyai-transcribe` - Speech transcription
- `/api/elevenlabs-tts` - Text-to-speech
- `/api/api` - AI chat completion

## WebSocket Implementation

The server now includes full WebSocket support with:
- Client WebSocket connections
- ElevenLabs Conversational AI forwarding
- Audio chunk streaming
- Real-time response handling
- Automatic connection cleanup

## Testing

1. Deploy to Render with the environment variables set
2. Test Record Mode: Click mic button, speak, get AI response
3. Test Conversation Mode: Click conversation button, speak continuously
4. Verify both modes work with proper audio feedback

## Troubleshooting

- Check that all environment variables are set correctly
- Verify API keys have proper permissions
- Check server logs for connection errors
- Ensure WebSocket connections are not blocked by firewalls