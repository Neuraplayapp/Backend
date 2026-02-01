# TTS/STT Diagnostics System

## Overview

The TTS/STT Diagnostics system provides comprehensive testing for all text-to-speech (ElevenLabs) and speech-to-text (AssemblyAI) functionality across the NeuraPlay AI platform. This includes websocket integration, voice rendering verification, and component integration testing.

## Features

### Core Testing Capabilities

1. **WebSocket Connection Testing**
   - Tests real-time WebSocket connectivity
   - Measures connection latency
   - Validates message routing

2. **ElevenLabs TTS Testing**
   - Tests text-to-speech API endpoints
   - Validates voice rendering and audio playback
   - Supports multiple voice IDs and models
   - Measures audio generation time

3. **AssemblyAI STT Testing**
   - Tests speech-to-text transcription
   - Supports both synthetic and live audio input
   - Validates transcription accuracy
   - Measures processing time

4. **Live Audio Recording**
   - Real microphone input testing
   - Transcription accuracy validation
   - Audio quality assessment

5. **Component Integration**
   - Tests AIAssistantSmall voice features
   - Tests NeuraPlayAssistantLite voice processing
   - Validates end-to-end workflows

### Storage & Persistence

- **Automatic Session Saving**: Auto-saves test results to localStorage
- **Session History**: Maintains up to 20 recent test sessions
- **Export/Import**: JSON and CSV export with import capability
- **Comparison Tools**: Compare current results with previous sessions
- **Data Management**: Clear data, manual saves, and bulk operations

## Usage

### Accessing the Diagnostics

Navigate to `/diagnostics` in your browser while logged in to access the diagnostic interface.

### Running Tests

1. **Configure Test Parameters**:
   - Test text for TTS
   - Expected transcription for STT accuracy testing
   - Voice ID selection
   - Timeout settings

2. **Run All Tests**: Click "Run All Tests" to execute the complete test suite

3. **Manual Tests**:
   - Play test audio to verify TTS output
   - Start live recording to test real microphone input
   - View test history for previous sessions

### Test Results

Each test provides:
- **Status**: passed, failed, warning, or running
- **Message**: Detailed description of results
- **Duration**: Time taken to complete
- **Details**: Technical information and error details

## API Endpoints Tested

### ElevenLabs TTS
- **Endpoint**: `/api/elevenlabs-tts`
- **Method**: POST
- **Tests**: Audio generation, voice rendering, playback capability

### AssemblyAI STT
- **Endpoint**: `/api/assemblyai-transcribe`
- **Method**: POST
- **Tests**: Speech transcription, accuracy, language detection

### WebSocket
- **Connection**: WebSocket server on same host
- **Tests**: Connection establishment, message routing, ElevenLabs forwarding

## Configuration Options

### Test Configuration
```typescript
{
  testText: "Hello! This is a test of the text-to-speech system. Can you hear me clearly?",
  expectedTranscription: "hello this is a test",
  voiceId: "8LVfoRdkh4zgjr8v5ObE", // English voice
  timeoutMs: 30000
}
```

### Voice IDs Available
- **English**: `8LVfoRdkh4zgjr8v5ObE`
- **Russian**: `RUB3PhT3UqHowKru61Ns`
- **Arabic**: `mRdG9GYEjJmIzqbYTidv`

## System Requirements

### Browser Support
- WebSocket support required
- MediaDevices API for microphone access
- AudioContext for audio processing
- Local storage for session persistence

### Permissions Required
- Microphone access for live recording tests
- Network access for API endpoint testing

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check server configuration
   - Verify port accessibility
   - Review firewall settings

2. **TTS Generation Failed**
   - Verify ElevenLabs API key
   - Check voice ID validity
   - Monitor rate limits

3. **STT Transcription Failed**
   - Verify AssemblyAI API key
   - Check audio format compatibility
   - Review webhook configuration

4. **Microphone Access Denied**
   - Grant browser microphone permissions
   - Check system audio settings
   - Test with different browsers

### Error Codes

- **403**: API key authentication failed
- **429**: Rate limit exceeded
- **500**: Server-side processing error
- **Timeout**: Request exceeded configured timeout

## Data Storage

### Local Storage Structure
```typescript
interface DiagnosticSession {
  id: string;
  timestamp: Date;
  config: TestConfiguration;
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
```

### Storage Limits
- Maximum 20 sessions stored locally
- Automatic cleanup of oldest sessions
- Export recommended for long-term storage

## Integration with Components

### AIAssistantSmall
- Tests TTS functionality
- Tests STT voice input
- Validates session continuity

### NeuraPlayAssistantLite
- Tests voice processing workflows
- Tests integration with canvas features
- Validates conversation continuity

### Shared Services
- VoiceManager integration
- ConversationService compatibility
- ServiceContainer dependency resolution

## Development Notes

### Adding New Tests
1. Create test function following existing patterns
2. Add result tracking with proper status updates
3. Include error handling and timeout protection
4. Update the main test runner sequence

### Extending Storage
- Storage functions are modular and extensible
- Export formats can be easily added
- Comparison algorithms can be enhanced

### Performance Considerations
- Tests run sequentially to avoid conflicts
- Cleanup functions prevent memory leaks
- Storage is optimized for browser limits

## Security Notes

- API keys are not stored in test results
- Audio data is processed locally only
- No sensitive information in exported data
- localStorage data is domain-specific

## Future Enhancements

1. **Advanced Analytics**
   - Trend analysis across sessions
   - Performance regression detection
   - Quality metrics tracking

2. **Remote Storage**
   - Cloud backup of test results
   - Team sharing capabilities
   - Historical analysis tools

3. **Automated Testing**
   - Scheduled test execution
   - CI/CD integration
   - Monitoring and alerting

4. **Enhanced Reporting**
   - PDF report generation
   - Detailed performance charts
   - Custom test suites


