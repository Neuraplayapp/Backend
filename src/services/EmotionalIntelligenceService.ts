/**
 * 🧠 Emotional Intelligence Service
 * 
 * Tracks user's emotional state over time and provides:
 * - Sentiment history and pattern analysis
 * - Emotional trend detection (user has been sad lately)
 * - Proactive emotional check-ins
 * - Empathetic response generation
 * - Time-based emotional aggregation
 */

export interface EmotionalState {
  emotion: string;
  valence: number; // -1 (negative) to +1 (positive)
  intensity: number; // 0 to 1
  timestamp: number;
  message?: string;
  category: 'positive' | 'negative' | 'neutral';
}

export interface EmotionalPattern {
  dominantEmotion: string;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  totalCount: number;
  averageValence: number;
  trend: 'improving' | 'declining' | 'stable';
  recentEmotions: string[];
  shouldCheckIn: boolean;
  checkInReason?: string;
}

class EmotionalIntelligenceService {
  private static instance: EmotionalIntelligenceService;
  
  // Emotion classification with valence scores
  private emotionValence: Record<string, number> = {
    // Positive emotions (0.3 to 1.0)
    'happy': 0.8, 'excited': 0.9, 'joyful': 0.9, 'grateful': 0.8, 'proud': 0.7,
    'content': 0.6, 'relaxed': 0.5, 'calm': 0.5, 'peaceful': 0.6, 'optimistic': 0.7,
    'enthusiastic': 0.8, 'motivated': 0.7, 'confident': 0.7, 'hopeful': 0.6,
    
    // Negative emotions (-1.0 to -0.3)
    'sad': -0.7, 'depressed': -0.9, 'anxious': -0.7, 'worried': -0.6, 'stressed': -0.7,
    'frustrated': -0.6, 'angry': -0.8, 'upset': -0.7, 'disappointed': -0.6,
    'overwhelmed': -0.8, 'tired': -0.5, 'exhausted': -0.7, 'lonely': -0.7,
    'confused': -0.5, 'scared': -0.7, 'nervous': -0.6, 'irritated': -0.5,
    
    // Neutral emotions (-0.2 to 0.2)
    'neutral': 0, 'okay': 0.1, 'fine': 0.1, 'normal': 0, 'meh': -0.1
  };

  static getInstance(): EmotionalIntelligenceService {
    if (!EmotionalIntelligenceService.instance) {
      EmotionalIntelligenceService.instance = new EmotionalIntelligenceService();
    }
    return EmotionalIntelligenceService.instance;
  }

  /**
   * 🔍 Extract emotional state from a message using LLM
   */
  async extractEmotionFromMessage(message: string): Promise<EmotionalState | null> {
    try {
      const { UnifiedAPIRouter } = await import('./UnifiedAPIRouter');
      const router = UnifiedAPIRouter.getInstance();

      const prompt = `Analyze the emotional state in this message. Extract ONLY if emotion is explicitly expressed.

Message: "${message}"

Rules:
1. Only extract if user EXPLICITLY expresses emotion ("I feel", "I'm", "I am")
2. Do NOT invent emotions - if unclear, return null
3. Rate intensity 0-1 (0.3=mild, 0.7=strong, 1.0=extreme)
4. Be specific with emotion names

ONLY return valid JSON like these examples:
{"emotion": "sad", "intensity": 0.8}
{"emotion": "excited", "intensity": 0.9}
{"emotion": "okay", "intensity": 0.4}
{"emotion": null, "intensity": 0}

For "I'm feeling really sad today" → {"emotion": "sad", "intensity": 0.8}
For "What time is it?" → {"emotion": null, "intensity": 0}

Analyze the message and return JSON:`;

      const response = await router.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [
            { role: 'system', content: 'You are a JSON extraction API. Return ONLY valid JSON with no additional text, explanations, or reasoning.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 150,
          temperature: 0.0, // CRITICAL: Deterministic = no reasoning tokens
          model: 'accounts/fireworks/models/gpt-oss-20b'
        }
      );

      if (response?.success) {
        let content = '';
        if (typeof response.data === 'string') content = response.data;
        else if (Array.isArray(response.data)) content = response.data[0]?.generated_text || '';
        else if (response.data?.choices?.[0]?.message?.content) content = response.data.choices[0].message.content;
        
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            // 🔧 VALIDATE: Reject template-like responses
            const jsonStr = jsonMatch[0];
            if (jsonStr.includes('specific_emotion') || 
                jsonStr.includes('0.0-1.0') || 
                jsonStr.includes('why you detected')) {
              console.warn('⚠️ LLM returned template instead of actual response, skipping');
              return null;
            }
            
            const parsed = JSON.parse(jsonStr);
            
            if (parsed.emotion && parsed.emotion !== 'null' && parsed.emotion !== null) {
              const valence = this.getEmotionalValence(parsed.emotion);
              return {
                emotion: parsed.emotion,
                valence,
                intensity: typeof parsed.intensity === 'number' ? parsed.intensity : 0.5,
                timestamp: Date.now(),
                message: message.substring(0, 200),
                category: valence > 0.2 ? 'positive' : valence < -0.2 ? 'negative' : 'neutral'
              };
            }
          } catch (parseError) {
            console.warn('⚠️ Failed to parse emotion JSON:', jsonMatch[0].substring(0, 50));
            // Silently fail - emotion extraction is not critical
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Emotion extraction failed:', error);
    }
    
    return null;
  }

  /**
   * 📊 Analyze emotional patterns over time period
   */
  async analyzeEmotionalPattern(
    userId: string,
    timeframeWeeks: number = 3
  ): Promise<EmotionalPattern> {
    const cutoffTime = Date.now() - (timeframeWeeks * 7 * 24 * 60 * 60 * 1000);
    
    try {
      // Retrieve emotional memories from database
      const { memoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
      const result = await memoryDatabaseBridge.searchMemories({
        userId,
        query: 'emotion feeling mood sentiment',
        limit: 200 // Get all recent emotional states
      });

      const emotions: EmotionalState[] = [];
      
      if (result.success && result.memories) {
        for (const memory of result.memories) {
          // Parse emotional state from memory
          const createdTime = new Date(memory.created_at || memory.timestamp).getTime();
          if (createdTime < cutoffTime) continue; // Skip old emotions
          
          const emotion = memory.memory_value || memory.content || '';
          const valence = this.getEmotionalValence(emotion);
          
          emotions.push({
            emotion,
            valence,
            intensity: 0.7, // Default
            timestamp: createdTime,
            category: valence > 0.2 ? 'positive' : valence < -0.2 ? 'negative' : 'neutral'
          });
        }
      }

      return this.computeEmotionalPattern(emotions, timeframeWeeks);
    } catch (error) {
      console.warn('⚠️ Failed to analyze emotional pattern:', error);
      return this.getDefaultPattern();
    }
  }

  /**
   * 📈 Compute emotional pattern from emotion history
   */
  private computeEmotionalPattern(
    emotions: EmotionalState[],
    timeframeWeeks: number
  ): EmotionalPattern {
    if (emotions.length === 0) {
      return this.getDefaultPattern();
    }

    // Count by category
    const positiveCount = emotions.filter(e => e.category === 'positive').length;
    const negativeCount = emotions.filter(e => e.category === 'negative').length;
    const neutralCount = emotions.filter(e => e.category === 'neutral').length;

    // Calculate average valence
    const averageValence = emotions.reduce((sum, e) => sum + e.valence, 0) / emotions.length;

    // Determine trend (compare first half vs second half)
    const midpoint = Math.floor(emotions.length / 2);
    const firstHalfValence = emotions.slice(0, midpoint).reduce((sum, e) => sum + e.valence, 0) / midpoint;
    const secondHalfValence = emotions.slice(midpoint).reduce((sum, e) => sum + e.valence, 0) / (emotions.length - midpoint);
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (secondHalfValence - firstHalfValence > 0.15) trend = 'improving';
    else if (firstHalfValence - secondHalfValence > 0.15) trend = 'declining';

    // Get most recent emotions
    const recentEmotions = emotions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(e => e.emotion);

    // Determine if check-in is needed
    let shouldCheckIn = false;
    let checkInReason = '';

    // Check-in criteria
    if (negativeCount > positiveCount * 1.5 && negativeCount > 5) {
      shouldCheckIn = true;
      checkInReason = `User has expressed negative emotions ${negativeCount} times vs ${positiveCount} positive in the last ${timeframeWeeks} weeks`;
    } else if (trend === 'declining' && averageValence < -0.3) {
      shouldCheckIn = true;
      checkInReason = `Emotional trend is declining with average valence of ${averageValence.toFixed(2)}`;
    } else if (negativeCount >= 10 && positiveCount < 3) {
      shouldCheckIn = true;
      checkInReason = `Predominantly negative emotions (${negativeCount} negative, ${positiveCount} positive) over ${timeframeWeeks} weeks`;
    }

    // Find dominant emotion
    const emotionCounts = new Map<string, number>();
    emotions.forEach(e => {
      emotionCounts.set(e.emotion, (emotionCounts.get(e.emotion) || 0) + 1);
    });
    
    const dominantEmotion = Array.from(emotionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    return {
      dominantEmotion,
      positiveCount,
      negativeCount,
      neutralCount,
      totalCount: emotions.length,
      averageValence,
      trend,
      recentEmotions,
      shouldCheckIn,
      checkInReason
    };
  }

  /**
   * 💬 Generate empathetic response based on emotional pattern
   */
  async generateEmpatheticResponse(
    pattern: EmotionalPattern,
    currentMessage: string
  ): Promise<string | null> {
    if (!pattern.shouldCheckIn) return null;

    try {
      const { UnifiedAPIRouter } = await import('./UnifiedAPIRouter');
      const router = UnifiedAPIRouter.getInstance();

      const prompt = `You are an empathetic AI tutor. Generate a warm, caring check-in message.

Current message: "${currentMessage}"

Emotional pattern observed:
- Positive emotions: ${pattern.positiveCount}
- Negative emotions: ${pattern.negativeCount}
- Trend: ${pattern.trend}
- Average mood: ${pattern.averageValence > 0 ? 'generally positive' : pattern.averageValence < -0.3 ? 'notably negative' : 'neutral'}
- Recent emotions: ${pattern.recentEmotions.slice(0, 5).join(', ')}

Generate a brief (1-2 sentences), natural check-in that:
1. Acknowledges their emotional state empathetically
2. Offers support WITHOUT being pushy or clinical
3. Sounds human and warm, NOT robotic
4. Is contextually appropriate to their current message

Examples:
- "I've noticed you've been feeling down lately. I'm here if you want to talk about it. 💙"
- "It seems like things have been tough for you recently. Remember, it's okay to take things one step at a time."
- "I see you've been going through some challenging emotions. Just want you to know I'm here to support you however I can."

Generate check-in:`;

      const response = await router.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
          temperature: 0.8,
          model: 'accounts/fireworks/models/gpt-oss-20b'
        }
      );

      if (response?.success) {
        let content = '';
        if (typeof response.data === 'string') content = response.data;
        else if (Array.isArray(response.data)) content = response.data[0]?.generated_text || '';
        else if (response.data?.choices?.[0]?.message?.content) content = response.data.choices[0].message.content;
        
        return content.trim();
      }
    } catch (error) {
      console.warn('⚠️ Failed to generate empathetic response:', error);
    }

    return null;
  }

  /**
   * 🎯 Store emotional state to memory
   */
  async storeEmotionalState(
    userId: string,
    sessionId: string,
    emotionalState: EmotionalState
  ): Promise<void> {
    try {
      const { memoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
      
      await memoryDatabaseBridge.storeMemory({
        userId,
        key: `emotion_${emotionalState.emotion}_${Date.now()}`,
        value: emotionalState.emotion,
        metadata: {
          category: 'emotion',
          valence: emotionalState.valence,
          intensity: emotionalState.intensity,
          emotionCategory: emotionalState.category,
          sessionId,
          timestamp: emotionalState.timestamp,
          message: emotionalState.message
        }
      });
      
      console.log(`💙 Stored emotional state: ${emotionalState.emotion} (valence: ${emotionalState.valence})`);
    } catch (error) {
      console.warn('⚠️ Failed to store emotional state:', error);
    }
  }

  /**
   * 🎨 Get emotional valence for an emotion word
   */
  getEmotionalValence(emotion: string): number {
    const emotionLower = emotion.toLowerCase().trim();
    return this.emotionValence[emotionLower] || 0;
  }

  /**
   * 📦 Get default pattern when no emotions found
   */
  private getDefaultPattern(): EmotionalPattern {
    return {
      dominantEmotion: 'neutral',
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      totalCount: 0,
      averageValence: 0,
      trend: 'stable',
      recentEmotions: [],
      shouldCheckIn: false
    };
  }
}

export const emotionalIntelligenceService = EmotionalIntelligenceService.getInstance();


