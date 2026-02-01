// Response Generators - Extracted from ChatHandler.ts
// Handles all LLM response generation functions

import { greetingService } from '../../services/GreetingService';
import { toolRegistry } from '../../services/ToolRegistry';

// ========== RESPONSE GENERATORS CLASS ==========

export class ResponseGenerators {

  /**
   * 🧠 Generate NATURAL store response using LLM
   */
  async generateStoreResponse(value: string, category: string, originalMessage: string): Promise<string> {
    try {
      const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      const prompt = `You are NeuraPlay, an encouraging academic coach. The user shared personal information and you've saved it.

User said: "${originalMessage}"
Category: ${category}
Value stored: ${value}

Respond in 1-2 SHORT sentences acknowledging you've remembered this. Be warm but professional - like a supportive professor. Don't say "Noted" or sound robotic.`;

      const result = await unifiedAPIRouter.routeAPICall('fireworks', 'llm-completion', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
        temperature: 0.8,
        model: 'accounts/fireworks/models/gpt-oss-20b'  // Fast model fine for simple acks
      });

      let responseText = '';
      if (result?.data?.[0]?.generated_text) {
        responseText = result.data[0].generated_text.trim();
      } else if (result?.choices?.[0]?.message?.content) {
        responseText = result.choices[0].message.content.trim();
      }

      if (responseText && responseText.length <= 150) {
        return responseText;
      }
    } catch (error) {
      console.warn('⚠️ LLM store response failed, using fallback:', error);
    }
    
    // Fallback responses - academic coach tone
    const fallbacks: Record<string, string> = {
      goal: `That's an excellent goal! I'll keep that in mind as we work together.`,
      preference: `Good to know! I'll remember that preference.`,
      family: `I'll remember that about your family.`,
      pet: `I'll remember that.`,
      profession: `Great - I'll keep your professional background in mind.`,
      location: `I'll remember that about your location.`,
      name: `Wonderful! I'll remember that.`
    };
    
    return fallbacks[category] || `I'll remember that for you.`;
  }

  /**
   * 🧠 Generate NATURAL recall response using LLM
   */
  async generateNaturalRecallResponse(
    memories: any[], 
    category: string, 
    query: string, 
    originalMessage: string,
    conversationHistory?: Array<{role: string, content: string}>
  ): Promise<string> {
    try {
      // Extract relevant memory data - filter out garbage
      const memoryData = memories.map(m => ({
        key: m.memory_key || m.key || '',
        value: m.content || m.value || '',
        metadata: m.metadata || {}
      })).filter(m => {
        if (!m.value) return false;
        if (m.key.includes('cognitive_pattern')) return false;
        if (m.value.length < 3) return false;
        return true;
      });
      
      if (memoryData.length === 0) {
        return this.generateNoMemoryResponse(query, category);
      }
      
      const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      const conversationContext = conversationHistory && conversationHistory.length > 0
        ? `\n\nRecent conversation:\n${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')}`
        : '';

      // 🎯 DEBUG: Log what memories we have
      console.log(`📝 ResponseGenerators.generateNaturalRecallResponse: Processing ${memoryData.length} memories for query: "${originalMessage}"`);
      console.log(`📝 Memory keys: ${memoryData.map(m => m.key).join(', ')}`);
      
      // Find the user's name from memories for personalization
      const userNameMemory = memoryData.find(m => 
        m.key.includes('user_name') || 
        m.key.includes('my_name') || 
        (m.key.includes('name') && !m.key.includes('family') && !m.key.includes('friend'))
      );
      const userName = userNameMemory?.value || '';
      
      // Detect if this is a greeting/first message or a follow-up
      const isGreeting = /^(hey|hi|hello|do you remember|remember me)/i.test(originalMessage.trim());
      const isFollowUp = conversationHistory && conversationHistory.length > 0;
      
      // 🎯 GROUP MEMORIES BY CATEGORY - so LLM doesn't confuse family with colleagues
      const memoryByCategory: Record<string, string[]> = {};
      for (const m of memoryData.slice(0, 20)) {
        const keyLower = (m.key || '').toLowerCase();
        const valueLower = (m.value || '').toLowerCase();
        let cat = 'other';
        
        // 🎯 EMOTION/MOOD - Check both key and value for emotional content
        if (keyLower.includes('emotion') || keyLower.includes('mood') || keyLower.includes('feeling') ||
            keyLower.includes('stressed') || keyLower.includes('happy') || keyLower.includes('sad') ||
            valueLower.includes('feeling great') || valueLower.includes('feeling stressed') ||
            valueLower.includes('i am feeling') || valueLower.includes("i'm feeling")) {
          cat = 'RECENT EMOTIONAL STATE';
        }
        else if (keyLower.startsWith('family_') || keyLower.includes('_family')) cat = 'FAMILY';
        else if (keyLower.startsWith('friend_')) cat = 'FRIENDS';
        // 🎯 CRITICAL: assistant_xxx_location should be COLLEAGUES, not LOCATION
        else if (keyLower.startsWith('colleague_') || keyLower.startsWith('coworker_') || keyLower.startsWith('assistant_')) cat = 'COLLEAGUES/WORK';
        else if (keyLower.includes('name') || keyLower.includes('user_name')) cat = 'USER IDENTITY';
        // 🎯 FIXED: Only categorize as LOCATION if it's NOT someone else's location
        else if ((keyLower.includes('location') || keyLower.includes('city') || keyLower.includes('country')) && 
                 !keyLower.startsWith('assistant_') && !keyLower.startsWith('colleague_') && !keyLower.startsWith('friend_')) cat = 'LOCATION';
        else if (keyLower.includes('course_') || keyLower.includes('learning')) cat = 'COURSES';
        else if (keyLower.includes('goal') || keyLower.includes('plan')) cat = 'GOALS';
        else if (keyLower.includes('hobby') || keyLower.includes('interest')) cat = 'INTERESTS';
        else if (keyLower.includes('profession') || keyLower.includes('job')) cat = 'PROFESSION';
        else if (keyLower.includes('pet_') || keyLower.includes('dog') || keyLower.includes('cat')) cat = 'PETS';
        
        if (!memoryByCategory[cat]) memoryByCategory[cat] = [];
        memoryByCategory[cat].push(`${m.key}: ${m.value}`);
      }
      
      const formattedMemories = Object.entries(memoryByCategory)
        .map(([cat, items]) => `[${cat}]\n${items.map(i => `  - ${i}`).join('\n')}`)
        .join('\n\n');
      
      const prompt = `You are NeuraPlay, an emotionally intelligent academic coach. You're warm but professional - like a supportive professor who genuinely knows each student.

USER'S MESSAGE: "${originalMessage}"
${userName ? `USER'S NAME: ${userName}` : ''}
${isFollowUp ? 'THIS IS A FOLLOW-UP MESSAGE - continue the conversation naturally, do NOT re-introduce yourself.' : ''}

MEMORIES GROUPED BY CATEGORY (respect these categories - colleagues are NOT family!):
${formattedMemories}${conversationContext}

🔑 MEMORY KEY FORMAT (from MemoryCategoryRegistry - ALL 28 CATEGORIES):

═══ TIER 1 (0.5) - CORE IDENTITY ═══
- "name" / "user_name" / "my_name" = THE USER'S OWN NAME

═══ TIER 2 (0.4) - RELATIONSHIPS & DEMOGRAPHICS ═══
- "family_uncle_ahmed" = uncle named Ahmed
- "family_wife_xxx" / "family_husband_xxx" / "family_spouse_xxx" = spouse
- "family_mother_xxx" / "family_father_xxx" = parents
- "family_brother_xxx" / "family_sister_xxx" = siblings
- "family_son_xxx" / "family_daughter_xxx" = children
- "family_cousin_xxx" / "family_aunt_xxx" / "family_nephew_xxx" / "family_niece_xxx" = extended family
- "friend_xxx" = friend named xxx
- "colleague_xxx" / "coworker_xxx" = work colleague
- "location_xxx" / "lives_in_xxx" / "city_xxx" / "country_xxx" = where they or others live
- "profession_xxx" / "job_xxx" / "career_xxx" / "occupation_xxx" = their job or others job
- "age_xxx" / "born_xxx" = their age or others age
- "birthday_xxx" = their birthday date or others birthday date
- "pet_dog_xxx" / "pet_cat_xxx" = their pet or others pet
- "assistant_xxx" = their PERSONAL ASSISTANT (NOT family!)

═══ TIER 3 (0.3) - PREFERENCES & INTERESTS ═══
- "preference_xxx" / "prefer_xxx" = what they or others prefer
- "hobby_xxx" / "hobbies_xxx" = their hobbies and activities
- "interest_xxx" / "interests_xxx" = topics they're interested in
- "favorite_xxx" / "favourite_xxx" = favorite things

═══ TIER 4 (0.2) - GOALS & EMOTIONAL STATE ═══
- "goal_xxx" / "aspiration_xxx" / "dream_xxx" = their goals and dreams
- "plan_xxx" / "planning_xxx" = their plans and intentions
- "emotion_xxx" / "feeling_xxx" = their emotional state
- "mood_xxx" = their current mood

═══ TIER 5 (0.1) - EDUCATION & RESEARCH ═══
- "education_xxx" / "school_xxx" / "university_xxx" / "degree_xxx" = educational background
- "course_xxx" / "lesson_xxx" = their courses (check timestamps for most recent!)
- "learning_moment_xxx" = captured learning insights
- "research_insight_xxx" = research findings
- "news_discovery_xxx" = news topics explored

═══ TIER 6 (0.0) - SYSTEM ═══
- "cognitive_xxx" = cognitive patterns
- "behavior_xxx" = behavioral patterns
- "context_xxx" = contextual info

═══ TIER 7 (-0.2) - DOCUMENTS ═══
- "canvas_document_xxx" = canvas documents
- "document_xxx" = general documents
- "general_xxx" = uncategorized/legacy

CRITICAL RULES:
1. BE CONVERSATIONAL - respond naturally to what they ACTUALLY asked 
2. DON'T dump all memories - only mention what's relevant to their question
3. ${isGreeting ? `For greetings: Acknowledge you remember them, mention 1-2 personal details, ask what they'd like to work on today` : `For follow-ups: Continue naturally without re-greeting or re-listing everything`}
4. VARY your greeting style - avoid starting every message with "Hey ${userName}!"
   - Use: "${userName}, great to see you" or "Welcome back!" or just dive into the response
5. DON'T make false claims - only reference things the user actually said or asked
6. DON'T say "you asked for X" unless they literally asked for it
7. Keep responses concise (2-4 sentences for simple acknowledgments)
8. 🚨 RESPECT CATEGORIES: People in [COLLEAGUES/WORK] are NOT family - they are work colleagues/assistants
   - "assistant_Raghad" = Raghad is their WORK ASSISTANT, not a family member
   - NEVER group colleagues with family when sending wishes or greetings
9. 💙 EMOTIONAL AWARENESS: If you see [RECENT EMOTIONAL STATE], acknowledge their feelings naturally
   - If they mentioned being stressed: Show empathy, offer support
   - If they mentioned being happy/great: Share in their positivity
   - DON'T lecture or give unsolicited advice - just acknowledge and be supportive

Respond naturally:`;
      
      const llmResponse = await unifiedAPIRouter.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.6,
          model: 'accounts/fireworks/models/gpt-oss-120b'
        }
      );
      
      if (llmResponse?.success && llmResponse?.data?.[0]?.generated_text) {
        const llmText = llmResponse.data[0].generated_text.trim();
        if (llmText.length >= 15) {
          return llmText;
        }
      }
      
      // Intelligent fallback - academic coach tone
      const name = memoryData.find(m => m.key.includes('user_name'))?.value || '';
      return name 
        ? `Of course I remember you, ${name}. How can I help you today?`
        : `Yes, I remember you. How can I help you today?`;
      
    } catch (error) {
      console.error('❌ Natural recall response generation failed:', error);
      return `Yes, I remember you. How can I help you today?`;
    }
  }

  /**
   * Generate no memory response
   */
  generateNoMemoryResponse(query: string, category: string): string {
    const responses: Record<string, string> = {
      name: "I don't have your name stored yet. What would you like me to call you?",
      preference: `I don't have any preferences stored about "${query}". What would you like me to know?`,
      event: "I don't have any events or dates stored yet. Would you like to tell me about an important date?",
      location: "I don't have any location information stored. Where are you from?",
      relationship: "I don't have information about that relationship yet. Would you like to tell me?",
      general: `I don't have any stored memories about "${query}". Would you like to tell me something to remember?`
    };
    
    return responses[category] || responses.general;
  }

  /**
   * Generate contextual recall response from conversation history
   */
  async generateContextualRecallResponse(message: string, recentContext: any[]): Promise<string> {
    try {
      const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      const contextText = recentContext.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');
      
      const prompt = `The user asked: "${message}"

Recent conversation context:
${contextText}

Based ONLY on the conversation context above, answer the user's question naturally. If you can't answer from context, say you don't have that information stored yet.

Respond naturally:`;
      
      const result = await unifiedAPIRouter.routeAPICall('fireworks', 'llm-completion', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.6,
        model: 'accounts/fireworks/models/gpt-oss-120b'
      });
      
      if (result?.success && result?.data?.[0]?.generated_text) {
        return result.data[0].generated_text.trim();
      }
    } catch (error) {
      console.warn('⚠️ Contextual recall failed:', error);
    }
    
    return "I don't have that information stored in my memory yet. Would you like to tell me?";
  }

  /**
   * Generate learning context response
   */
  async generateLearningContextResponse(
    message: string,
    learningContext: any,
    memories: any[]
  ): Promise<string> {
    try {
      const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      // 🎯 UNIFIED: Now works with UnifiedLearningContext
      // 🎯 FIX: Focus on COURSES only - canvas documents are handled separately in normal chat
      const course = learningContext.currentCourse;
      const courseList = learningContext.courseList || [];
      
      let contextInfo = '';
      
      // Course info with ACTUAL progress
      if (course) {
        contextInfo += `📚 ACTIVE COURSE: "${course.name}"\n`;
        contextInfo += `Progress: Step ${course.currentStep + 1} of ${course.totalSteps} (${course.progressPercent}% complete)\n`;
        
        if (course.currentStepTitle) {
          contextInfo += `Current lesson: "${course.currentStepTitle}"\n`;
        }
        
        // Include actual lesson content!
        if (course.currentStepContent) {
          contextInfo += `\nLESSON CONTENT:\n${course.currentStepContent.substring(0, 1000)}\n`;
        }
      }
      
      // 🎯 NEW: List all available courses (most recent first)
      if (courseList.length > 0) {
        contextInfo += `\n📋 USER'S COURSES (${courseList.length} total, most recent first):\n`;
        courseList.forEach((c: any, i: number) => {
          const recency = i === 0 ? ' ← MOST RECENT' : i === 1 ? ' ← 2nd most recent' : '';
          contextInfo += `  ${i + 1}. "${c.title}"${recency}\n`;
        });
      }
      
      // Struggles
      if (learningContext.struggles?.knowledgeGaps?.length > 0) {
        contextInfo += `\n⚠️ User struggling with: ${learningContext.struggles.knowledgeGaps.join(', ')}\n`;
      }
      
      // Spaced repetition
      if (learningContext.retention?.itemsDueForReview > 0) {
        contextInfo += `\n🧠 ${learningContext.retention.itemsDueForReview} items due for review\n`;
      }
      
      // 🎯 FIX: Do NOT include canvas documents here - they are NOT courses
      // Canvas documents are workspace artifacts, handled in normal chat flow
      
      const prompt = `User asked: "${message}"

${contextInfo || 'No learning context available'}

Respond naturally about their learning. Be warm and helpful. If they ask about their course, reference the ACTUAL lesson content above. Don't just say "your course" - use the real name and details.`;
      
      const result = await unifiedAPIRouter.routeAPICall('fireworks', 'llm-completion', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.6,
        model: 'accounts/fireworks/models/gpt-oss-120b'
      });
      
      if (result?.success && result?.data?.[0]?.generated_text) {
        return result.data[0].generated_text.trim();
      }
    } catch (error) {
      console.warn('⚠️ Learning context response failed:', error);
    }
    
    // Fallback with ACTUAL course details
    const course = learningContext.currentCourse;
    if (course) {
      return `You're on step ${course.currentStep + 1} of ${course.totalSteps} in "${course.name}" (${course.progressPercent}% complete). What would you like to work on?`;
    }
    return "I can see your learning content! What would you like to work on?";
  }

  /**
   * Build tool-aware response
   */
  async buildToolAwareResponse(
    originalMessage: string,
    toolResult: any,
    memories: any[],
    sessionContext: string,
    reasoning: string
  ): Promise<string> {
    const personalInfo = greetingService.extractPersonalInfo(memories);
    const personalContext = greetingService.getPersonalContext(
      personalInfo.userPets, 
      personalInfo.userHobbies, 
      personalInfo.userLocation
    );
    const userName = personalInfo.userName ? `User: ${personalInfo.userName}` : '';
    
    const prompt = `You are NeuraPlay, responding to: "${originalMessage}"

TOOL EXECUTION RESULT:
Reasoning: ${reasoning}
Data: ${JSON.stringify(toolResult.data, null, 2)}

PERSONAL CONTEXT:
${userName}${userName && personalContext ? ' | ' : ''}${personalContext}

INSTRUCTIONS:
- Integrate the tool result naturally into your conversational response
- Keep response concise but personalized
- Output ONLY your natural conversational response

Respond naturally:`;

    try {
      const llmResult = await toolRegistry.execute('llm-completion', {
        prompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.6,
        maxTokens: 2000
      }, {
        sessionId: 'context-session',
        startTime: Date.now()
      });

      const responseText = llmResult.data?.completion || 
                           llmResult.data?.response || 
                           llmResult.data?.message;
      
      if (responseText) {
        return responseText;
      }
      
      return this.formatToolResultFallback(toolResult, reasoning);
    } catch (error) {
      console.error('Tool-aware response generation failed:', error);
      return this.formatToolResultFallback(toolResult, reasoning);
    }
  }

  /**
   * Format tool result fallback
   */
  formatToolResultFallback(toolResult: any, _reasoning: string): string {
    const data = toolResult.data;
    
    // Weather-specific formatting
    if (data?.temperature !== undefined && data?.location) {
      const feelsLike = data.feelslike !== undefined ? ` (feels like ${data.feelslike}°C)` : '';
      return `🌤️ The weather in ${data.location}${data.country ? `, ${data.country}` : ''} is currently **${data.description || 'clear'}** at **${data.temperature}°C**${feelsLike}.`;
    }
    
    // Search results formatting
    if (data?.results && Array.isArray(data.results)) {
      return `📍 I found ${data.results.length} results for you.`;
    }
    
    // Document formatting
    if (data?.title || data?.documentTitle) {
      return `📄 I've prepared "${data.title || data.documentTitle}" for you!`;
    }
    
    // Generic success
    if (toolResult.success) {
      return `✅ Done! I've completed that for you.`;
    }
    
    return `I've processed your request. Let me know if you need anything else!`;
  }

  /**
   * Extract location from message
   */
  extractLocation(message: string): string | null {
    const patterns = [
      /weather in (.+?)(?:\s|$)/i,
      /weather at (.+?)(?:\s|$)/i,
      /weather for (.+?)(?:\s|$)/i,
      /forecast for (.+?)(?:\s|$)/i,
      /temperature in (.+?)(?:\s|$)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Extract search query from message
   */
  extractSearchQuery(message: string): string | null {
    const patterns = [
      /search for (.+)/i,
      /search (.+)/i,
      /find (.+)/i,
      /look up (.+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Get learning journey context
   */
  async getLearningJourneyContext(userId: string, courseId?: string): Promise<string> {
    if (!courseId) return '';
    
    try {
      const { learningMomentCapture } = await import('../../services/LearningMomentCapture');
      const aiContext = await learningMomentCapture.getAIContext(userId, courseId);
      
      if (aiContext && aiContext.length > 50) {
        return `\n${aiContext}`;
      }
    } catch (error) {
      console.warn('⚠️ Failed to get learning journey context:', error);
    }
    
    return '';
  }

  /**
   * Extract keywords from message
   */
  extractKeywords(message: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const memoryKeywords = ['name', 'my', 'your', 'what', 'who', 'when', 'where', 'remember', 'recall', 'called'];
    
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && (!stopWords.has(word) || memoryKeywords.includes(word)));
    
    return words.slice(0, 5);
  }
}

// Export singleton instance
export const responseGenerators = new ResponseGenerators();

