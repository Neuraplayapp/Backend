# CRITICAL: Render Environment Variables Setup

## IMMEDIATE ACTION REQUIRED

Set these environment variables in your Render dashboard for the NeuraPlay service:

### 🔑 **Primary API Keys (REQUIRED)**
```
Neuraplay=your_fireworks_api_key_here
VITE_ASSEMBLYAI_API_KEY=your_assemblyai_key_here  
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_AGENT_ID=agent_2201k13zjq5nf9faywz14701hyhb
```

### 🔑 **Secondary API Keys (OPTIONAL)**
```
together_token=your_together_ai_key_here
hf_token=your_huggingface_key_here
Serper_api=your_serper_search_key_here
WEATHER_API=your_weather_key_here
READER_API=your_jina_reader_key_here
```

## How to Set Environment Variables on Render:

1. Go to https://dashboard.render.com
2. Select your NeuraPlay service  
3. Go to "Environment" tab
4. Add each variable using the EXACT names above
5. Click "Save Changes"
6. Render will automatically redeploy

## Key Sources:
- **Fireworks**: https://fireworks.ai/account/api-keys
- **AssemblyAI**: https://www.assemblyai.com/dashboard/
- **ElevenLabs**: https://elevenlabs.io/app/settings/api-keys
- **Together AI**: https://api.together.xyz/settings/api-keys

## Critical Notes:
- Use EXACT variable names listed above
- The "Neuraplay" key is specifically for Fireworks AI
- AssemblyAI key must have "VITE_" prefix
- ElevenLabs needs both API key and Agent ID
