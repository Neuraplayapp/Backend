# ElevenLabs Agent Voice Language Selection - FIXED

## Problem Summary
The ElevenLabs Conversational AI Agent (`agent_2201k13zjq5nf9faywz14701hyhb`) supports 4 voice variations (English, Russian, Arabic, Swedish) but the WebSocket implementation was:
1. Hardcoded to English only
2. Using incorrect Swedish voice ID (was using English voice)
3. Not accepting language parameter from client

## Solution Implemented

### 1. ✅ Fixed Voice IDs in Configuration
**File:** `src/config/elevenlabs.ts`

Updated with correct voice IDs:
```typescript
voices: {
    english: '8LVfoRdkh4zgjr8v5ObE',    // ✅ Correct
    russian: 'RUB3PhT3UqHowKru61Ns',    // ✅ Correct
    arabic: 'mRdG9GYEjJmIzqbYTidv',     // ✅ Correct
    swedish: 'LcBivrWPNJfG7tkEwHPJ'     // ✅ FIXED - was using English voice
}
```

### 2. ✅ Updated WebSocket to Accept Language from Client
**File:** `services/websockets.cjs`

**Changes:**
- Line 30: Accept `language` parameter in `connect_elevenlabs` message
- Line 70: Function signature updated: `handleElevenLabsConnection(clientWs, clientId, language = 'en')`
- Line 73: Log client-requested language
- Line 113: Pass language to agent conversation initialization

### 3. ✅ Agent Now Uses Client-Specified Language
**File:** `services/websockets.cjs` Line 105-116

The agent conversation initiation now includes:
```javascript
{
  type: 'conversation_initiation_client_data',
  conversation_config_override: {
    agent: {
      prompt: { ... },
      first_message: "Hi! I'm your AI assistant. How can I help you today!",
      language: language // ✅ Uses client-specified language
    }
  }
}
```

## How to Use (For Frontend Developers)

### WebSocket Connection with Language Selection

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3001'); // or your server URL

// Send connection request with desired language
ws.send(JSON.stringify({
  type: 'connect_elevenlabs',
  language: 'ru' // Options: 'en', 'ru', 'ar', 'sv'
}));

// Listen for connection confirmation
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'elevenlabs_connected') {
    console.log('✅ Connected to ElevenLabs agent');
    
    // Now you can send audio chunks
    ws.send(JSON.stringify({
      type: 'audio_chunk',
      audio: base64AudioData
    }));
  }
};
```

### Language Codes

| Language | Code | Voice ID | Voice Name |
|----------|------|----------|------------|
| English  | `en` | `8LVfoRdkh4zgjr8v5ObE` | Default |
| Russian  | `ru` | `RUB3PhT3UqHowKru61Ns` | Russian Voice |
| Arabic   | `ar` | `mRdG9GYEjJmIzqbYTidv` | Arabic Voice |
| Swedish  | `sv` | `LcBivrWPNJfG7tkEwHPJ` | Swedish Voice |

## Expected Behavior

### Scenario 1: User Speaks in Russian
1. Frontend connects with `language: 'ru'`
2. WebSocket passes `'ru'` to agent initialization
3. Agent uses Russian voice (`RUB3PhT3UqHowKru61Ns`)
4. Agent responds in Russian with Russian voice
5. ✅ User hears Russian voice

### Scenario 2: User Speaks in Arabic
1. Frontend connects with `language: 'ar'`
2. WebSocket passes `'ar'` to agent initialization
3. Agent uses Arabic voice (`mRdG9GYEjJmIzqbYTidv`)
4. Agent responds in Arabic with Arabic voice
5. ✅ User hears Arabic voice

### Scenario 3: User Speaks in Swedish
1. Frontend connects with `language: 'sv'`
2. WebSocket passes `'sv'` to agent initialization
3. Agent uses Swedish voice (`LcBivrWPNJfG7tkEwHPJ`)
4. Agent responds in Swedish with Swedish voice
5. ✅ User hears Swedish voice

### Scenario 4: Default (No Language Specified)
1. Frontend connects without language parameter
2. WebSocket defaults to `'en'`
3. Agent uses English voice (`8LVfoRdkh4zgjr8v5ObE`)
4. Agent responds in English with English voice
5. ✅ User hears English voice

## Testing

### Server Logs to Check
When a client connects, you should see:
```
🎯 Connecting to ElevenLabs Conversational AI...
🌐 Client requested language: ru
🔑 Using Agent ID: agent_2201k13zjq5nf9faywz14701hyhb
🔑 API Key available: true
🌐 WebSocket URL constructed: wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_2201k13zjq5nf9faywz14701hyhb
✅ Connected to ElevenLabs
🎯 Sending conversation initiation to ElevenLabs...
🎤 Setting agent language to: ru
✅ ElevenLabs conversation initiated successfully
```

### Test Each Language
1. **Test Russian:**
   ```javascript
   ws.send(JSON.stringify({ type: 'connect_elevenlabs', language: 'ru' }));
   ```
   - ✅ Should hear Russian voice
   
2. **Test Arabic:**
   ```javascript
   ws.send(JSON.stringify({ type: 'connect_elevenlabs', language: 'ar' }));
   ```
   - ✅ Should hear Arabic voice
   
3. **Test Swedish:**
   ```javascript
   ws.send(JSON.stringify({ type: 'connect_elevenlabs', language: 'sv' }));
   ```
   - ✅ Should hear Swedish voice (NEW - previously used English voice)

4. **Test English (Default):**
   ```javascript
   ws.send(JSON.stringify({ type: 'connect_elevenlabs' }));
   ```
   - ✅ Should hear English voice

## Important Notes

### ⚠️ Current UI Implementation
Your main chat UI (`AIAssistantSmall.tsx`) is **NOT using the WebSocket agent** yet. It's using the direct TTS API at `/api/elevenlabs-tts`.

**To use the agent with voice variations:**
You need to update `AIAssistantSmall.tsx` to:
1. Establish WebSocket connection
2. Send language with connection request
3. Stream audio through WebSocket (not REST API)
4. Receive agent audio responses

### ✅ Direct TTS API Also Updated
The voice IDs in the config are now correct, so if you're using the direct TTS API (`/api/elevenlabs-tts`), it should also work with the correct voices - but you won't get the agent's conversational AI features.

## Files Modified

1. `src/config/elevenlabs.ts` - Updated Swedish voice ID
2. `services/websockets.cjs` - Accept language parameter and pass to agent

## Agent URL
Your agent dashboard: https://elevenlabs.io/app/talk-to?agent_id=agent_2201k13zjq5nf9faywz14701hyhb

## Next Steps

### For Testing
1. Start your server: `node server.cjs`
2. Use a WebSocket client to test different languages
3. Check server logs for language confirmation
4. Verify different voices are used

### For Production Use
1. Update `AIAssistantSmall.tsx` to use WebSocket instead of REST API
2. Add language selection UI for users
3. Detect user's language and pass to WebSocket connection
4. Handle WebSocket audio streaming

## Status
✅ **Backend is ready** - WebSocket agent supports all 4 languages  
⚠️ **Frontend needs update** - UI still uses REST API instead of WebSocket agent

