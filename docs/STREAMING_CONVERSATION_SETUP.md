# Streaming Conversation System Setup

## Overview

This document explains how the ElevenLabs API is set up and how to use the new streaming conversation system that integrates:

**User Input → LLM API (Streaming) → Your Application Code → ElevenLabs API (Streaming) → Audio Output**

## Current ElevenLabs Setup

### Configuration (`src/config/elevenlabs.ts`)

```typescript
export const elevenLabsConfig: ElevenLabsConfig = {
    agentId: 'agent_2201k13zjq5nf9faywz14701hyhb',
    voices: {
        english: '8LVfoRdkh4zgjr8v5ObE',
        russian: 'RUB3PhT3UqHowKru61Ns',
        arabic: 'mRdG9GYEjJmIzqbYTidv'
    },
    apiKey: process.env.REACT_APP_ELVEN_LABS_API_KEY || ''
};
```

### Environment Variables

Add to your Netlify environment variables:
```env
# For backend functions
elven_labs_api_key=your_elevenlabs_api_key_here

# For frontend (Vite)
VITE_ELVEN_LABS_API_KEY=your_elevenlabs_api_key_here
```

For local development:
```env
VITE_ELVEN_LABS_API_KEY=your_elevenlabs_api_key_here
```

### Netlify Function (`netlify/functions/elevenlabs-websocket.cjs`)

This function handles:
- WebSocket communication with ElevenLabs
- Authentication with API key
- Message routing and response handling
- Error handling and timeouts

## New Streaming Conversation System

### Architecture

The new system implements the complete streaming flow:

1. **User Input**: Voice (via microphone) or text input
2. **AssemblyAI**: Converts speech to text (if voice input)
3. **LLM API**: Processes the message and generates response
4. **ElevenLabs**: Converts response to speech
5. **Audio Output**: Plays the response

### Components

#### 1. StreamingConversationService (`src/services/StreamingConversationService.ts`)

The core service that orchestrates the entire streaming flow:

```typescript
// Initialize the service
const service = StreamingConversationService.getInstance();

// Configure the service
service.configure({
    language: 'english',
    enableSTT: true,
    enableTTS: true,
    enableLLM: true
});

// Start conversation
await service.startConversation();

// Send text message
await service.sendTextMessage("Hello!");

// Handle events
service.addEventListener((event) => {
    switch (event.type) {
        case 'user_speech': // Speech transcribed
        case 'user_text':   // Text input
        case 'llm_response': // LLM response
        case 'tts_audio':   // Audio generated
        case 'error':       // Error occurred
    }
});
```

#### 2. StreamingConversationAssistant (`src/components/StreamingConversationAssistant.tsx`)

The UI component that provides:
- Voice recording controls
- Text input
- Message display with type indicators
- Audio playback controls
- Language selection
- Real-time status updates

#### 3. Demo Page (`src/pages/StreamingDemoPage.tsx`)

A demo page to test the complete system at `/streaming-demo`.

## How to Use

### 1. Access the Demo

Navigate to `/streaming-demo` in your application to test the complete streaming system.

### 2. Test Voice Input

1. Click the AI assistant button (bottom right)
2. Click "Start Voice Chat"
3. Speak your message
4. The system will:
   - Transcribe your speech (AssemblyAI)
   - Process with LLM
   - Generate speech response (ElevenLabs)
   - Play the audio

### 3. Test Text Input

1. Type a message in the text field
2. Press Enter or click Send
3. The system will:
   - Process with LLM
   - Generate speech response (ElevenLabs)
   - Play the audio

### 4. Message Types

The system shows different message types with color-coded badges:
- **SPEECH**: Voice input transcribed to text
- **TEXT**: Direct text input
- **LLM**: AI response from LLM
- **TTS**: Audio response from ElevenLabs

## API Integration Details

### AssemblyAI Integration

```typescript
// Audio processing through AssemblyAI
const formData = new FormData();
formData.append('audio', audioBlob);

const response = await fetch('/.netlify/functions/assemblyai-transcribe', {
    method: 'POST',
    body: formData
});

const result = await response.json();
const transcribedText = result.text;
```

### LLM Integration

```typescript
// Process through AIService
const llmResponse = await this.aiService.sendMessage(text);
```

### ElevenLabs Integration

```typescript
// Stream to ElevenLabs TTS
const response = await fetch('/.netlify/functions/elevenlabs-websocket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        agentId,
        voiceId,
        messageType: 'user_message',
        message: text
    })
});

const result = await response.json();
if (result.type === 'audio' && result.data?.audio_base_64) {
    // Play the audio
    const audioBlob = new Blob([Buffer.from(result.data.audio_base_64, 'base64')], { type: 'audio/wav' });
    const audio = new Audio(URL.createObjectURL(audioBlob));
    await audio.play();
}
```

## Configuration Options

### Language Support

Currently supports:
- **English**: Voice ID `8LVfoRdkh4zgjr8v5ObE`
- **Russian**: Voice ID `RUB3PhT3UqHowKru61Ns`
- **Arabic**: Voice ID `mRdG9GYEjJmIzqbYTidv`

### Service Configuration

```typescript
service.configure({
    language: 'english',        // Language for TTS
    voiceId: 'custom_voice_id', // Optional custom voice
    enableSTT: true,           // Enable speech-to-text
    enableTTS: true,           // Enable text-to-speech
    enableLLM: true            // Enable LLM processing
});
```

## Error Handling

The system includes comprehensive error handling:

- **Microphone access errors**: Fallback to text-only mode
- **AssemblyAI errors**: Display error message to user
- **LLM errors**: Show fallback responses
- **ElevenLabs errors**: Continue with text-only responses
- **Network errors**: Automatic retry with exponential backoff

## Performance Considerations

### Streaming Optimization

- Audio chunks processed every 100ms for real-time feel
- WebSocket connections managed efficiently
- Automatic cleanup of resources
- Memory management for audio blobs

### Fallback Mechanisms

- Text-only mode if voice features fail
- Local fallback responses if LLM unavailable
- Graceful degradation of features

## Troubleshooting

### Common Issues

1. **"Failed to access microphone"**
   - Check browser permissions
   - Ensure HTTPS (required for microphone access)

2. **"ElevenLabs API key not configured"**
   - Verify environment variables are set
   - Check Netlify function configuration

3. **"AssemblyAI transcription failed"**
   - Verify AssemblyAI API key
   - Check audio format compatibility

4. **"Failed to generate speech"**
   - Check ElevenLabs API quota
   - Verify voice ID configuration

### Debug Mode

Enable console logging to see detailed flow:
```typescript
// Add to your component
useEffect(() => {
    console.log('Conversation events:', event);
}, [event]);
```

## Future Enhancements

### Planned Features

1. **Real-time streaming**: Continuous audio streaming without chunks
2. **Voice activity detection**: Automatic start/stop recording
3. **Multiple language support**: More voice options
4. **Custom voice training**: User-specific voice models
5. **Conversation memory**: Context preservation across sessions

### Integration Opportunities

1. **Game integration**: Voice commands for games
2. **Accessibility features**: Screen reader integration
3. **Parent controls**: Voice monitoring and filtering
4. **Analytics**: Conversation insights and learning patterns

## Security Considerations

- API keys stored securely in environment variables
- No sensitive data logged to console
- Audio data processed locally when possible
- Secure WebSocket connections with authentication

## Cost Optimization

- Efficient audio chunking to minimize API calls
- Caching of common responses
- Fallback to text-only mode for cost savings
- Configurable quality settings for different use cases 