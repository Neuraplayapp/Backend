# Voice Language Selection - Diagnosis and Testing Guide

## Current Status

### What I've Done:
1. **Reverted VoiceManager.ts** - The changes I made were not used by the main voice interface and broke compatibility
2. **Added comprehensive logging** to `routes/api.cjs` to trace voice ID selection

### The Real Voice Flow:

**AIAssistantSmall.tsx** (the component users interact with):
```
Lines 276-343: processVoiceInput (STT - works correctly)
  ↓
Lines 303: Gets detected language from AssemblyAI
  ↓
Lines 315-320: Updates language setting if detected
  ↓
Lines 346-413: speakText (TTS)
  ↓
Lines 366-367: Maps language to voice ID
  ↓
Lines 375-389: Sends voiceId to /api/elevenlabs-tts
```

##Problem Analysis

### Issue 1: Transcription
You mentioned transcription broke - it was showing text in the original language (Arabic, Russian) but now doesn't.

**Possible causes:**
1. AssemblyAI is translating instead of transcribing
2. The text isn't being displayed
3. Language detection is failing

**Check:** Look at console logs for:
- `🎙️ Transcription result:` - what is the actual text?
- `detectedLanguage` - what language was detected?

### Issue 2: Voice Selection
All voices sound the same despite different language settings.

**Possible causes:**
1. Wrong voice IDs in configuration
2. Voice IDs not being sent to API
3. ElevenLabs API not returning different voices
4. All your voice IDs point to the same voice

## Current Voice ID Configuration

From `src/config/elevenlabs.ts`:
```typescript
english: '8LVfoRdkh4zgjr8v5ObE'
russian: 'RUB3PhT3UqHowKru61Ns'
arabic: 'mRdG9GYEjJmIzqbYTidv'
swedish: '8LVfoRdkh4zgjr8v5ObE' // Same as English
```

## Testing Steps

### Step 1: Test Voice ID Logging
1. Open browser console
2. Open AI Assistant Small
3. Enable voice settings
4. Speak in English, then Russian, then Arabic

**Check console for:**
```
🔊 TTS - Language mapping: { userLanguage: 'ru', voiceLanguage: 'russian', voiceId: 'RUB3PhT3UqHowKru61Ns' }
```

### Step 2: Test Server-Side Logging
Check server console (Render logs or local terminal) for:
```
🔊 TTS - Voice selection: { voiceId: 'RUB3PhT3UqHowKru61Ns', ... }
🔊 TTS - Full request body: { ... }
🎤 VOICE ID BEING USED: RUB3PhT3UqHowKru61Ns
🌐 ElevenLabs API URL: https://api.elevenlabs.io/v1/text-to-speech/RUB3PhT3UqHowKru61Ns
```

### Step 3: Verify Voice IDs in ElevenLabs Dashboard
1. Go to https://elevenlabs.io/app/voice-library
2. Check your voice IDs:
   - Are they all the same voice?
   - Do you have 4 different voices?
   - Are the IDs correct in the config?

### Step 4: Test with Manual Voice IDs
Temporarily hardcode different voice IDs in `AIAssistantSmall.tsx` line 367:
```typescript
// Test with known different voices
const testVoiceIds = {
  english: 'pNInz6obpgDQGcFmaJgB', // Adam
  russian: 'EXAVITQu4vr4xnSDxMaL', // Bella
  arabic: '21m00Tcm4TlvDq8ikWAM', // Rachel
};
const voiceId = testVoiceIds[voiceLanguage] || testVoiceIds.english;
```

## Possible Issues

### Issue A: AssemblyAI Configuration
**Problem:** AssemblyAI might not be configured to transcribe in original language

**Check in `routes/api.cjs` line 286-302:**
- `language_detection: language_code === 'auto'` ✅ Correct
- `language_code: language_code === 'auto' ? undefined : language_code` ✅ Correct

**This looks correct** - AssemblyAI should transcribe in the original language.

### Issue B: Voice IDs Are Incorrect
**Problem:** The voice IDs in your configuration might not exist or might be the same voice

**Solution:**
1. Log into ElevenLabs dashboard
2. Go to Voice Library
3. Copy the correct voice ID for each language
4. Update `src/config/elevenlabs.ts`

### Issue C: ElevenLabs Agent vs Direct TTS
**Problem:** You mentioned an "agent" with 4 voice variations. ElevenLabs has two different APIs:
- **Conversational AI Agent API** (WebSocket) - uses agent with built-in voices
- **Text-to-Speech API** (REST) - uses individual voice IDs

**Current implementation uses:** Direct TTS API (not the agent)

**If you want to use the agent:**
You need to use the WebSocket connection in `services/websockets.cjs` instead of the REST API.

## Next Steps

**IMMEDIATE:**
1. Test voice input in each language
2. Check console logs (both browser and server)
3. Verify what voice IDs are actually being sent
4. Check ElevenLabs dashboard to verify voice IDs

**IF VOICE IDS ARE WRONG:**
- Update the voice IDs in `src/config/elevenlabs.ts`

**IF YOU WANT TO USE THE AGENT:**
- Switch from `/api/elevenlabs-tts` to WebSocket agent connection
- This requires significant architectural changes

**IF TRANSCRIPTION IS BROKEN:**
- Check if AssemblyAI is returning text at all
- Check if it's translating instead of transcribing
- Verify the `language_code` parameter is being sent correctly

## Debug Commands

### Browser Console:
```javascript
// Check current language setting
localStorage.getItem('neuraplay_voice_language')

// Force language setting
localStorage.setItem('neuraplay_voice_language', 'ru')
```

### Check Server Logs:
```bash
# If running locally:
node server.cjs

# If on Render:
# Go to Render dashboard → Your service → Logs
```

## Expected vs Actual

### Expected Behavior:
1. User speaks in Russian
2. AssemblyAI transcribes in Cyrillic: "Привет"
3. Text appears in prompt box: "Привет"
4. AI responds in Russian
5. TTS uses Russian voice ID: `RUB3PhT3UqHowKru61Ns`
6. Audio plays with Russian voice

### What's Happening (based on your report):
1. User speaks in Russian  ✅
2. AssemblyAI transcribes: ❓ (check logs)
3. Text appears: ❌ (not working?)
4. AI responds: ✅
5. TTS uses voice ID: ❓ (same voice every time)
6. Audio plays: ❌ (wrong voice)

## Questions to Answer:
1. What voice IDs does ElevenLabs show in your dashboard?
2. Do you have 4 different voices or 4 languages for 1 voice?
3. Is the text showing up in the prompt box at all?
4. What language is the transcribed text in (check console)?
5. Are you testing in development or production?

