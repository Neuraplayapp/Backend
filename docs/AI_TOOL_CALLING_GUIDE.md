# AI Tool Calling System Guide

## Overview

NeuraPlay's AI Assistant now has a sophisticated tool calling system that allows the AI to proactively help users by executing actions, not just providing text responses. The system works in both **conversation mode** and **text mode** with different behaviors optimized for each context.

## How It Works

### Architecture

1. **AIService.ts** - Enhanced with tool calling capabilities
2. **ToolExecutorService.ts** - Handles actual tool execution
3. **AIAssistant.tsx** - Orchestrates tool calling in different modes

### Two Modes of Operation

#### 1. Text Mode (Full Tool Calling)
- **When**: User is typing messages or using single voice recordings
- **Behavior**: AI can use all available tools proactively
- **Use Cases**: 
  - "Take me to the playground" → Navigates automatically
  - "I'm colorblind" → Tests colors, configures accessibility
  - "Make text bigger" → Updates font size settings

#### 2. Conversation Mode (Limited Tool Calling)
- **When**: User is in continuous voice conversation with AI
- **Behavior**: AI focuses on natural conversation but can still use tools for urgent needs
- **Tool Usage**: Only for accessibility, critical settings, and navigation when user seems lost
- **Use Cases**:
  - Accessibility needs are always handled immediately
  - Critical settings (mute, disable animations) for user comfort
  - Navigation when user expresses confusion

## Available Tools

### 1. navigate_to_page
**Purpose**: Navigate to specific pages in the application
```json
{
  "name": "navigate_to_page",
  "parameters": {
    "page": "playground|dashboard|forum|profile|home|about",
    "reason": "Why navigating to this page"
  }
}
```

**Triggers**:
- "Take me to the playground"
- "Show me the dashboard"
- "Go to my profile"

### 2. update_setting
**Purpose**: Update user preferences and settings
```json
{
  "name": "update_setting", 
  "parameters": {
    "setting": "theme|fontSize|accessibility|colorBlindMode|highContrast",
    "value": "Setting value",
    "reason": "Why updating this setting"
  }
}
```

**Triggers**:
- "Make text bigger"
- "Turn on dark mode"
- "Enable high contrast"
- "I'm colorblind"

### 3. recommend_games
**Purpose**: Recommend games based on learning goals
```json
{
  "name": "recommend_games",
  "parameters": {
    "skill": "math|reading|memory|coordination|problem_solving",
    "difficulty": "easy|medium|hard",
    "reason": "Why recommending these games"
  }
}
```

**Triggers**:
- "I want to improve my math"
- "Help me with reading"
- "I need memory practice"

### 4. create_content
**Purpose**: Create personalized content
```json
{
  "name": "create_content",
  "parameters": {
    "type": "diary_prompt|calendar_entry|forum_post",
    "content": "The content to create",
    "personalization": "How it's personalized"
  }
}
```

**Triggers**:
- "Create a diary prompt for me"
- "Schedule study time"
- "Help me write a forum post"

### 5. accessibility_support
**Purpose**: Provide accessibility accommodations
```json
{
  "name": "accessibility_support",
  "parameters": {
    "type": "color_blindness|dyslexia|motor_skills",
    "action": "test|configure|enable|disable",
    "details": "Additional details"
  }
}
```

**Triggers**:
- "I can't see colors well"
- "I have dyslexia"
- "Make it easier to click buttons"

### 6. read_user_data
**Purpose**: Read user data and activity
```json
{
  "name": "read_user_data",
  "parameters": {
    "data_type": "notifications|progress|forum_posts|diary_entries",
    "filter": "Optional filter"
  }
}
```

**Triggers**:
- "Show my notifications"
- "What's my progress?"
- "Read my diary entries"

## Implementation Details

### AI Response Parsing

The system supports two formats for tool calls:

#### 1. Enhanced Format (JSON)
```text
AI Response: "I'll help you with that! [TOOL_CALL]{"name": "navigate_to_page", "parameters": {"page": "playground", "reason": "User wants to practice"}}[/TOOL_CALL] Let's go explore the games!"
```

#### 2. Fallback Format (Text Parsing)
```text
AI Response: "🚀 Taking you to the playground! Let's find some great games for you."
```
*System detects "Taking you to" and creates navigation tool call*

### Context Integration

Tool calls receive rich context:
```javascript
const context = {
  currentPage: location.pathname,
  mode: 'text' | 'conversing',
  user: { id: 'user_id', name: 'User Name' },
  timestamp: new Date()
};
```

### Error Handling

- **Tool Execution Failures**: Gracefully handled with user-friendly messages
- **API Failures**: Falls back to direct API calls
- **Parse Errors**: Uses text-based parsing as fallback

## Usage Examples

### Example 1: Accessibility Support
```
User: "I have trouble seeing colors"
AI: "I'll help you with color vision! Let me set up some tests."
→ Tool: accessibility_support(type: "color_blindness", action: "test")
→ Result: Navigation to color test, UI adjustments
```

### Example 2: Learning Support  
```
User: "I want to get better at math"
AI: "Great! Let me recommend some perfect math games for you."
→ Tool: recommend_games(skill: "math", difficulty: "medium")
→ Tool: navigate_to_page(page: "playground")
→ Result: Game recommendations + automatic navigation
```

### Example 3: Settings Management
```
User: "The text is too small"
AI: "I'll make the text bigger for you right away!"
→ Tool: update_setting(setting: "fontSize", value: "large")
→ Result: Font size increased immediately
```

## Benefits

### For Users
- **Proactive Assistance**: AI takes action, not just gives advice
- **Seamless Experience**: No need to manually navigate or change settings
- **Accessibility First**: Immediate accommodations for special needs
- **Context Aware**: Actions are relevant to current situation

### For Developers
- **Extensible**: Easy to add new tools
- **Robust**: Multiple fallback mechanisms
- **Observable**: Comprehensive logging and error handling
- **Flexible**: Works with different AI backends

## Future Enhancements

1. **Advanced Tool Chaining**: Combine multiple tools in sequence
2. **User Permission System**: Ask before executing certain tools
3. **Tool Learning**: AI learns user preferences for tool usage
4. **Voice Tool Confirmation**: Audio feedback for tool execution
5. **Custom Tool Creation**: Users can define their own tools

## Troubleshooting

### Common Issues

1. **Tools Not Executing**
   - Check console for tool parsing errors
   - Verify ToolExecutorService is initialized
   - Ensure context is properly passed

2. **Wrong Tool Selected**
   - Review tool descriptions and triggers
   - Update AI system prompt for better tool selection
   - Add more specific keyword detection

3. **Tool Execution Errors**
   - Check individual tool implementations
   - Verify required services are available (NavigationService, etc.)
   - Review error logs for specific failures

### Debug Mode

Enable detailed logging:
```javascript
// In development mode
console.log('🔧 Tool Call:', toolCall);
console.log('📊 Context:', context);
console.log('✅ Result:', result);
```

## Conclusion

The AI Tool Calling system transforms NeuraPlay's AI from a passive chatbot into a proactive assistant that can actually help users accomplish their goals. By combining natural language understanding with structured tool execution, we create a more intuitive and powerful user experience.

The system is designed to be both powerful in text mode for task completion and respectful in conversation mode for natural interaction, ensuring the right level of AI agency for each context.