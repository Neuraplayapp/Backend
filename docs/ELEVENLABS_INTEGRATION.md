# ElevenLabs Integration for Neuraplay AI Platform

## Overview

This integration adds real-time voice conversation capabilities to the Neuraplay AI platform using ElevenLabs' Conversational AI API. The system supports multiple languages and provides both text and voice interaction with the AI assistant.

## Features

- **Real-time Voice Conversations**: Users can speak directly to the AI assistant
- **Multi-language Support**: English, Russian, and Arabic voice options
- **Text Input**: Traditional text-based chat interface
- **Voice Recording**: Microphone access for voice input
- **Audio Playback**: AI responses are played back as audio
- **WebSocket Communication**: Real-time bidirectional communication

## Setup

### 1. Install Dependencies

```bash
npm install @elevenlabs/elevenlabs-js ws
```

### 2. Environment Variables

Add the following environment variables to your Netlify dashboard:

```env
# For backend functions
elven_labs_api_key=your_elevenlabs_api_key_here

# For frontend (Vite)
VITE_ELVEN_LABS_API_KEY=your_elevenlabs_api_key_here
```

**Note**: For local development, you can also add:
```env
VITE_ELVEN_LABS_API_KEY=your_elevenlabs_api_key_here
```

### 3. Agent Configuration

The system uses the following agent ID:
- **Agent ID**: `agent_2201k13zjq5nf9faywz14701hyhb`

### 4. Voice IDs

Different voice IDs are used for different languages:

- **English**: `8LVfoRdkh4zgjr8v5ObE`
- **Russian**: `RUB3PhT3UqHowKru61Ns`
- **Arabic**: `mRdG9GYEjJmIzqbYTidv`

## Components

### ElevenLabsAIAssistant.tsx

The main component that handles:
- WebSocket communication with ElevenLabs
- Voice recording and playback
- Text message handling
- Language selection
- Connection management

### elevenlabs-websocket.js

Netlify function that:
- Proxies WebSocket communication
- Handles authentication with ElevenLabs API
- Manages message routing
- Provides error handling

### elevenlabs.ts

Configuration file containing:
- Agent and voice IDs
- API key management
- Language-specific settings

## Usage

### For Users

1. **Open the AI Assistant**: Click the ElevenLabs AI Teacher button
2. **Select Language**: Choose your preferred language (English, Russian, Arabic)
3. **Start Voice Chat**: Click "Start Voice Chat" to begin recording
4. **Speak**: Talk to the AI assistant naturally
5. **Text Input**: Alternatively, type messages in the text field
6. **Listen**: AI responses will be played back as audio

### For Developers

#### Adding New Languages

1. Update the `elevenlabs.ts` configuration file:
```typescript
voices: {
    english: '8LVfoRdkh4zgjr8v5ObE',
    russian: 'RUB3PhT3UqHowKru61Ns',
    arabic: 'mRdG9GYEjJmIzqbYTidv',
    // Add new language here
    spanish: 'your_spanish_voice_id'
}
```

2. Update the component's language selection:
```typescript
const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'russian' | 'arabic' | 'spanish'>('english');
```

#### Customizing the Agent

The agent uses the following prompt configuration:

```json
{
  "conversation_config": {
    "agent": {
      "prompt": {
        "prompt": "You are Synapse, a friendly AI learning assistant for children...",
        "tool_ids": [],
        "built_in_tools": {
          "end_call": {
            "name": "end_call",
            "description": "",
            "response_timeout_secs": 20,
            "type": "system",
            "params": {
              "system_tool_type": "end_call"
            }
          },
          "language_detection": null,
          "transfer_to_agent": null,
          "transfer_to_number": null,
          "skip_turn": null
        }
      }
    }
  }
}
```

## API Endpoints

### Netlify Function: `/.netlify/functions/elevenlabs-websocket`

**Method**: POST

**Request Body**:
```json
{
  "agentId": "agent_2201k13zjq5nf9faywz14701hyhb",
  "voiceId": "8LVfoRdkh4zgjr8v5ObE",
  "messageType": "conversation_initiation|user_message|user_audio_chunk|pong",
  "message": "text_or_base64_audio_data"
}
```

**Response**:
```json
{
  "type": "conversation_initiation_metadata|user_transcript|agent_response|audio|vad_score|ping",
  "data": {
    // Response data specific to type
  }
}
```

## Error Handling

The system includes comprehensive error handling for:
- Network connectivity issues
- Microphone access problems
- API authentication failures
- WebSocket connection errors
- Audio playback issues

## Security Considerations

1. **API Key Protection**: API keys are stored in environment variables
2. **HTTPS Only**: All communication uses secure protocols
3. **Input Validation**: All user inputs are validated before processing
4. **Error Sanitization**: Error messages are sanitized to prevent information leakage

## Troubleshooting

### Common Issues

1. **"ElevenLabs API key not configured"**
   - Ensure `elven_labs_api_key` is set in your Netlify environment variables
   - Check that the key is valid and has the necessary permissions

2. **"Could not access microphone"**
   - Ensure the user has granted microphone permissions
   - Check that the browser supports the required audio formats

3. **"Connection failed"**
   - Verify network connectivity
   - Check that the agent ID is correct
   - Ensure the ElevenLabs service is available

4. **Audio not playing**
   - Check browser audio settings
   - Verify that audio autoplay is enabled
   - Ensure the audio format is supported

### Debug Mode

Enable debug logging by setting:
```javascript
localStorage.setItem('elevenlabs-debug', 'true');
```

## Performance Optimization

1. **Audio Chunking**: Audio is sent in 100ms chunks for real-time processing
2. **Connection Pooling**: WebSocket connections are managed efficiently
3. **Error Recovery**: Automatic reconnection on connection loss
4. **Memory Management**: Audio blobs are properly cleaned up

## Future Enhancements

1. **Voice Activity Detection**: Automatic start/stop of recording
2. **Custom Voice Training**: User-specific voice models
3. **Advanced Language Support**: More languages and dialects
4. **Conversation History**: Persistent chat history
5. **Voice Commands**: Hands-free navigation

## Support

For technical support or questions about the ElevenLabs integration, please refer to:
- [ElevenLabs API Documentation](https://elevenlabs.io/docs/api-reference/authentication)
- [ElevenLabs WebSocket Documentation](https://elevenlabs.io/docs/conversational-ai/api-reference/conversational-ai/websocket)
- [Neuraplay Platform Documentation](README.md) 