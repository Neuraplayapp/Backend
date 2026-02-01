# 🛠️ AI Tool Routing Guide

## Overview
NeuraPlay's agentic AI system uses **intelligent tool routing** to execute tools in the appropriate environment. 

**🎯 Key Architecture Point**: ALL API calls are routed through Render's server - there are no direct client-to-API calls.

```
Browser → Render Server → External APIs (Together AI, Serper, Weather, etc.)
```

## Tool Categories

### 🖥️ Server-Executed Tools
**Execute completely on Render server** - return results immediately

| Tool | Reason | Requirements |
|------|---------|-------------|
| `web_search` | Uses Serper API key | API keys, External APIs |
| `get_weather` | Uses Weather API key | API keys, External APIs |
| `generate_image` | Uses Together AI API key | API keys, External APIs |

**Characteristics:**
- ✅ Have secret API keys (security)
- ✅ Access external APIs (Render server → API)  
- ✅ Network-based operations
- ✅ No client CORS restrictions
- ❌ Cannot access browser/DOM
- ❌ Cannot modify React state

### 🌐 Client-Executed Tools  
**Execute in browser** - require UI/React/browser manipulation (may still call Render APIs)

| Tool | Reason | Requirements |
|------|---------|-------------|
| `navigate_to_page` | React Router navigation | React Router, Browser APIs |
| `update_settings` | Local state changes | Local storage, React state |
| `recommend_game` | UI interaction needed | User context, UI updates |
| `accessibility_support` | DOM/CSS changes | DOM manipulation, CSS |

**Characteristics:**
- ✅ Can access browser APIs
- ✅ Can modify React components
- ✅ Can update UI in real-time
- ✅ Have user context
- ❌ Cannot access server APIs
- ❌ Cannot use secret keys

## Flow Diagram

```
GPT-OSS Model Decision
         ↓
    Tool Call Generated
         ↓
    ┌─────────────────┐
    │  Server Router  │
    └─────────────────┘
         ↓
    Check tool type
         ↓
    ┌─────────┬─────────┐
    │ Server  │ Client  │
    │ Tools   │ Tools   │
    └─────────┴─────────┘
         ↓         ↓
    Execute on    Send to
    server        client
         ↓         ↓
    Return        Execute in
    result        browser
         ↓         ↓
    ┌─────────────────┐
    │   Combined      │
    │   Response      │
    └─────────────────┘
```

## Configuration

Tools are configured in `server.js`:

```javascript
const TOOL_ROUTING_CONFIG = {
  server: {
    'web_search': {
      reason: 'Requires Serper API key',
      requires: ['api_key', 'external_api']
    }
  },
  client: {
    'navigate_to_page': {
      reason: 'Requires React Router',
      requires: ['react_router', 'browser_api']
    }
  }
};
```

## Adding New Tools

### Server-Side Tool
1. Add to `TOOL_ROUTING_CONFIG.server`
2. Add case in `executeTool()` function
3. Implement the tool logic

### Client-Side Tool  
1. Add to `TOOL_ROUTING_CONFIG.client`
2. Add case in `ToolExecutorService.ts`
3. Implement the tool logic

## Debugging

Enable debug logs to see tool routing decisions:
```
🔧 Server executing tool: web_search
📋 Reason: Requires Serper API key and external API access
⚙️ Requirements: api_key, external_api

📤 Client-side tool navigate_to_page - delegating to client  
📋 Reason: Requires React Router and browser navigation
```

## Best Practices

1. **Security First**: Never expose API keys to client
2. **Performance**: Execute heavy processing on server
3. **User Experience**: Execute UI changes on client for immediate feedback
4. **Context Aware**: Client tools have access to current page/user state
5. **Error Handling**: Both environments should handle failures gracefully