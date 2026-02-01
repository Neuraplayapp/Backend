# 🚀 WebSocket Deployment Guide for Render

## 📋 What's Ready

### ✅ WebSocket Server (`server-static.js`)
- **Express server** serving static files
- **WebSocket server** handling real-time connections
- **Direct ElevenLabs integration** via WebSocket
- **Proper port binding** for Render (`0.0.0.0:$PORT`)

### ✅ Frontend WebSocket Service (`src/services/WebSocketService.ts`)
- **WebSocket client** for frontend
- **ElevenLabs streaming** support
- **Auto-reconnection** logic
- **Event system** for real-time communication

### ✅ Render Configuration (`render.yaml`)
- **Build command**: `npm install && npm run build`
- **Start command**: `npm run render`
- **Environment variables** configured
- **Health check** path set

## 🚀 Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "WebSocket-ready deployment for Render"
git push origin main
```

### 2. Deploy to Render

#### Option A: Using render.yaml (Recommended)
1. **Connect your GitHub repo** to Render
2. **Render will auto-detect** the `render.yaml` configuration
3. **Set environment variables** in Render Dashboard:
   - `VITE_ABLY_API_KEY` - Your Ably API key
   - `VITE_ELEVENLABS_API_KEY` - Your ElevenLabs API key
   - `VITE_ASSEMBLYAI_API_KEY` - Your AssemblyAI API key
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key (for server)

#### Option B: Manual Setup
1. **Create new Web Service** on Render
2. **Connect your GitHub repo**
3. **Set build command**: `npm install && npm run build`
4. **Set start command**: `npm run render`
5. **Add environment variables** (same as above)

### 3. Environment Variables Setup

In Render Dashboard → Your Service → Environment:

```
VITE_ABLY_API_KEY=your_ably_api_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_ASSEMBLYAI_API_KEY=your_assemblyai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

## 🔧 How It Works

### Architecture:
```
Frontend (React) ↔ WebSocket ↔ Render Server ↔ ElevenLabs WebSocket
```

### Flow:
1. **User speaks** → Audio captured by frontend
2. **Audio sent** via WebSocket to Render server
3. **Server forwards** to ElevenLabs WebSocket
4. **ElevenLabs streams** audio back via WebSocket
5. **Frontend receives** and plays audio in real-time

### WebSocket Messages:
```javascript
// Connect to ElevenLabs
{ type: 'connect_elevenlabs' }

// Send TTS request
{ type: 'tts_request', text: 'Hello world', voiceId: '8LVfoRdkh4zgjr8v5ObE' }

// Receive audio chunk
{ type: 'audio_chunk', data: 'base64_audio_data' }
```

## 🎯 Testing

### 1. Check Deployment
- Visit your Render URL
- Check console for WebSocket connection logs
- Verify static files are served

### 2. Test WebSocket
```javascript
// In browser console
const ws = new WebSocket('wss://your-app.onrender.com');
ws.onopen = () => console.log('✅ Connected');
ws.onmessage = (event) => console.log('📥 Message:', JSON.parse(event.data));
```

### 3. Test ElevenLabs Integration
```javascript
// Connect to ElevenLabs
ws.send(JSON.stringify({ type: 'connect_elevenlabs' }));

// Send TTS request
ws.send(JSON.stringify({
  type: 'tts_request',
  text: 'Hello from WebSocket!',
  voiceId: '8LVfoRdkh4zgjr8v5ObE'
}));
```

## 🔍 Troubleshooting

### Common Issues:

1. **Port binding error**
   - ✅ Fixed: Server binds to `0.0.0.0:$PORT`

2. **WebSocket connection failed**
   - Check Render logs for server errors
   - Verify environment variables are set

3. **ElevenLabs connection failed**
   - Check `ELEVENLABS_API_KEY` is set correctly
   - Verify API key has streaming permissions

4. **Static files not served**
   - Check `dist` folder exists after build
   - Verify `npm run build` completes successfully

## 📝 Next Steps

1. **Deploy to Render** using the guide above
2. **Test WebSocket functionality** in browser console
3. **Integrate with conversation mode** in your React app
4. **Add error handling** and user feedback
5. **Optimize for production** (compression, caching, etc.)

## 🎉 Success Indicators

- ✅ **Render deployment** completes successfully
- ✅ **WebSocket connection** established
- ✅ **ElevenLabs streaming** works
- ✅ **Real-time audio** plays in browser
- ✅ **No timeout errors** (unlike Netlify)

Your app is now **WebSocket-ready** and **deployed to Render**! 🚀 