# AI Tool Calling Test Examples

## How to Test the Tool Calling System

### Setup
1. Start your development server
2. Open the AI Assistant (click the AI button)
3. Try the examples below in both Text Mode and Conversation Mode

## Test Examples

### 🧭 Navigation Tests

#### Text Mode (should work)
- "Take me to the playground"
- "Show me the dashboard"
- "Go to my profile"
- "Navigate to the forum"

#### Expected Result:
- AI responds with confirmation message
- Automatic navigation to requested page
- Tool execution logged in console

### ⚙️ Settings Tests

#### Text Mode (should work)
- "Make the text bigger"
- "Turn on dark mode"
- "Enable high contrast"
- "I need bigger fonts"

#### Expected Result:
- AI confirms the setting change
- Setting is actually updated
- UI reflects the change

### ♿ Accessibility Tests

#### Both Modes (urgent, always works)
- "I am colorblind"
- "I can't see the colors well"
- "Make text bigger, I have trouble reading"
- "Turn on high contrast mode"

#### Expected Result:
- Immediate accessibility support
- Color vision test or direct accommodation
- Settings updated automatically

### 🎮 Game Recommendation Tests

#### Text Mode (should work)
- "I want to improve my math skills"
- "Help me with reading"
- "I need memory practice"
- "What games are good for coordination?"

#### Expected Result:
- AI recommends specific games
- May navigate to playground automatically
- Games are relevant to the skill mentioned

### 📝 Content Creation Tests

#### Text Mode (should work)
- "Create a diary prompt for me"
- "Help me schedule study time"
- "Give me something to write about"

#### Expected Result:
- AI creates personalized content
- Content is relevant and engaging
- May offer to help implement it

### 📊 Data Reading Tests

#### Text Mode (should work)
- "Show me my notifications"
- "What's my progress?"
- "Read my recent activity"

#### Expected Result:
- AI retrieves and displays data
- Information is formatted nicely
- Current/relevant data shown

## Conversation Mode vs Text Mode

### Text Mode
- **Full tool calling enabled**
- AI can use any tool proactively
- Best for task completion
- Example: "Take me to playground" → Navigates immediately

### Conversation Mode
- **Limited tool calling**
- Only urgent needs (accessibility, critical settings, navigation when lost)
- Focuses on natural conversation
- Example: "I'm colorblind" → Still helps immediately (urgent)
- Example: "Take me to playground" → Might just talk about it (not urgent)

## Console Debugging

Open browser developer tools and watch for these logs:

```javascript
// Tool execution
🔧 Executing tool call: {name: "navigate_to_page", parameters: {...}}

// Tool results
✅ Tool executed successfully: Taking you to playground!

// Parsing
📝 Parsing AI response for tool calls

// Context
📊 Current context: {mode: "text", currentPage: "/dashboard"}
```

## Testing Different Scenarios

### 1. Accessibility Emergency (Should Always Work)
**Scenario**: User with color blindness needs immediate help
```
User: "I can't see the red and green buttons, they look the same"
Expected: Immediate accessibility support, color tests, UI adjustments
```

### 2. Navigation Request (Text Mode Only)
**Scenario**: User wants to go somewhere
```
Text Mode: "Take me to the forum" → Navigates immediately
Conversation Mode: "Take me to the forum" → Discusses the forum, might not navigate
```

### 3. Learning Goal (Text Mode)
**Scenario**: User wants to improve skills
```
User: "I'm struggling with math"
Expected: Game recommendations, navigation to playground, encouraging message
```

### 4. Settings Change (Text Mode)
**Scenario**: User interface adjustment
```
User: "The text is too small"
Expected: Font size increased, confirmation message
```

### 5. Multi-tool Scenario (Advanced)
**Scenario**: User needs multiple tools
```
User: "I have dyslexia and want to practice reading"
Expected: 
1. Accessibility support for dyslexia
2. Game recommendations for reading
3. Possibly navigation to games
```

## Troubleshooting Tests

### If Tools Don't Execute:
1. Check browser console for errors
2. Verify you're in Text Mode (not Conversation Mode)
3. Make sure request is clear and direct
4. Try simpler phrases first

### If Wrong Tool Selected:
1. Be more specific in your request
2. Use clear action words ("take me", "change", "show me")
3. Mention specific features by name

### If Tool Execution Fails:
1. Check network tab for API errors
2. Verify services are running
3. Try refreshing the page

## Success Indicators

✅ **Tool Calling Working**:
- Console shows tool execution logs
- Actions happen automatically (navigation, settings changes)
- AI confirms what it did
- Multiple messages in conversation (AI response + tool result)

❌ **Tool Calling Not Working**:
- Only text responses, no actions
- No console logs about tools
- Manual navigation/settings still required
- Single response messages only

## Advanced Testing

### Test Tool Parsing Formats

1. **JSON Format** (if your AI backend supports it):
```
AI Response: "I'll help! [TOOL_CALL]{"name": "navigate_to_page", "parameters": {"page": "playground"}}[/TOOL_CALL] Let's go!"
```

2. **Text Format** (fallback):
```
AI Response: "🚀 Taking you to the playground!"
```

Both should result in navigation happening.

### Test Error Handling

1. **Invalid Tool**: Ask for something impossible
2. **Network Error**: Disconnect internet during tool call
3. **Permission Error**: Try restricted actions

The system should handle these gracefully with user-friendly messages.

## Quick Test Script

Try this sequence to test the full system:

1. "I'm colorblind" (accessibility - should work in both modes)
2. "Take me to playground" (navigation - text mode only)
3. "Make text bigger" (settings - text mode only)  
4. "Help me with math" (recommendations - text mode only)
5. "Show my progress" (data reading - text mode only)

Expected: 5 successful tool executions with visible results.