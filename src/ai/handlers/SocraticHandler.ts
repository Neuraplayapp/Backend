// Enhanced Socratic Handler with Memory Integration
// Handles educational dialogue, confusion resolution, and adaptive socratic questioning
// Integrates with memory system to track learning progress and adapt to user's cognitive patterns

import { IntentAnalysis } from '../intent/IntentAnalysisService';
import { AIRequest, AIResponse } from '../AIRouter';
import { toolRegistry } from '../../services/ToolRegistry';

import { serviceContainer } from '../../services/ServiceContainer';

interface LearningMemory {
  domain: string;
  confusionAreas: string[];
  masteredConcepts: string[];
  preferredLearningStyle: 'visual' | 'textual' | 'examples' | 'step-by-step' | 'exploratory';
  emotionalProgressions: Array<{
    timestamp: number;
    emotion: string;
    topic: string;
  }>;
  socraticHistory: Array<{
    question: string;
    response: string;
    effectiveness: number; // 0-1 scale
  }>;
}

export class SocraticHandler {

  private learningMemories: Map<string, LearningMemory> = new Map();
  
  async handle(request: AIRequest, intentAnalysis: IntentAnalysis): Promise<AIResponse> {

    const startTime = Date.now();
    
    try {
      console.log('🎯 SocraticHandler: Leveraging coherent NPU analysis for Socratic dialogue');

      const sessionId = request.sessionId || '';
      const userId = request.userId || 'anonymous';
      
      // 🎯 COHERENT APPROACH: Use Enhanced Analysis from NPU Level 2
      const enhancedAnalysis = intentAnalysis.layer2_intent || {};
      const confusionDetection = intentAnalysis.layer4_confusion || {};
      const npuSocraticQuestions = intentAnalysis.socraticQuestions || [];
      
      console.log('🧠 Enhanced Context:', {
        domain: enhancedAnalysis.primaryDomain,
        complexity: enhancedAnalysis.complexityLevel,
        interactionStyle: enhancedAnalysis.interactionStyle,
        emotionalState: confusionDetection.emotionalState,
        cognitiveInsights: confusionDetection.cognitiveInsights
      });

      // 🧠 RETRIEVE LEARNING HISTORY (enhanced with NPU context)
      const learningContext = await this.retrieveLearningContext(userId, sessionId, intentAnalysis);
      
      // 🎯 USE NPU-GENERATED SOCRATIC QUESTIONS (coherent architecture)
      let socraticQuestions: string[] = [];
      
      if (npuSocraticQuestions && npuSocraticQuestions.length > 0) {
        console.log('✅ Using NPU Level 5 coherent Socratic questions');
        socraticQuestions = await this.enhanceQuestionsWithMemory(
          npuSocraticQuestions,
          learningContext,
          intentAnalysis
        );
      } else {
        console.log('⚠️ No NPU questions found, generating contextual backup');
        socraticQuestions = await this.generateContextualBackupQuestions(
          request.message,
          enhancedAnalysis,
          confusionDetection,
          learningContext
        );
      }
      
      // 🔍 BUILD LEARNING RESPONSE USING ENHANCED ANALYSIS
      const canvasContext = intentAnalysis.canvasActivation || {};
      const formattedResponse = await this.buildCoherentSocraticResponse(
        request.message,
        socraticQuestions,
        enhancedAnalysis,
        confusionDetection,
        learningContext,
        canvasContext
      );
      
      // 💾 STORE LEARNING PROGRESS
      await this.storeLearningProgress(
        userId,
        sessionId,
        request.message,
        intentAnalysis,
        { 
          learningPhase: confusionDetection.emotionalState,
          progressIndicators: { engagement: confusionDetection.confusionLevel }
        },
        socraticQuestions
      );
      
      // 📊 TRACK EFFECTIVENESS
      this.trackSocraticEffectiveness(sessionId, socraticQuestions, intentAnalysis);
        
      return {
        success: true,
        response: formattedResponse,
        toolResults: [],
        metadata: {
          sessionId,
          executionTime: Date.now() - startTime,
          toolsExecuted: 0,
          mode: 'socratic_coherent',
          enhancedContext: {
            domain: enhancedAnalysis.primaryDomain,
            complexity: enhancedAnalysis.complexityLevel,
            emotionalState: confusionDetection.emotionalState,
            cognitiveInsights: confusionDetection.cognitiveInsights
          }
        }
      };
      
    } catch (error) {
      console.error('🧠 Coherent Socratic mode failed:', error);
      
      // Fallback to dynamic socratic response
      const fallbackResponse = await this.generateFallbackSocraticResponse(request.message);
      return {
        success: true,
        response: fallbackResponse,
        toolResults: [],
        metadata: {
          sessionId: request.sessionId,
          executionTime: Date.now() - startTime,
          toolsExecuted: 0,
          mode: 'socratic_dynamic_fallback'
        }
      };
    }
  }
  
  /**
   * Retrieve learning context from memory
   */
  private async retrieveLearningContext(userId: string, sessionId: string, intentAnalysis: IntentAnalysis): Promise<any> {
    try {
      await serviceContainer.waitForReady();
      
      // Get learning-related memories
      const memoryResult = await toolRegistry.execute('store_memory', {
        action: 'search',
        query: `learning ${intentAnalysis.confusionDetection?.domainContext || 'general'} confusion progress`,
        metadata: { category: 'learning' }
      }, { sessionId, userId, startTime: Date.now() });
      
      const memories = memoryResult.data?.memories || [];
      
      // Extract learning patterns
      const learningPatterns = {
        struggledTopics: [] as string[],
        masteredTopics: [] as string[],
        preferredStyle: 'step-by-step',
        emotionalJourney: [] as any[],
        previousQuestions: [] as any[]
      };
      
      for (const memory of memories) {
        const value = memory.value || memory.content || '';
        
        if (value.includes('struggles with') || value.includes('difficulty')) {
          learningPatterns.struggledTopics.push(value);
        }
        if (value.includes('achieved breakthrough') || value.includes('understands')) {
          learningPatterns.masteredTopics.push(value);
        }
        if (value.includes('prefers')) {
          if (value.includes('visual')) learningPatterns.preferredStyle = 'visual';
          if (value.includes('examples')) learningPatterns.preferredStyle = 'examples';
          if (value.includes('step-by-step')) learningPatterns.preferredStyle = 'step-by-step';
        }
      }
      
      // Get cognitive context from NPU if available
      let cognitiveContext = {};
      if (intentAnalysis.contextState?.cognitiveContext) {
        cognitiveContext = intentAnalysis.contextState.cognitiveContext;
      }
      
      return {
        ...learningPatterns,
        cognitiveContext,
        domain: intentAnalysis.confusionDetection?.domainContext || 'general'
      };
      
    } catch (error) {
      console.warn('⚠️ Failed to retrieve learning context:', error);
      return {
        struggledTopics: [],
        masteredTopics: [],
        preferredStyle: 'step-by-step',
        emotionalJourney: [],
        previousQuestions: []
      };
    }
  }
  
  /**
   * Generate contextual backup questions when NPU questions aren't available
   */
  private async generateContextualBackupQuestions(
    message: string,
    enhancedAnalysis: any,
    confusionDetection: any,
    learningContext: any
  ): Promise<string[]> {
    const domain = enhancedAnalysis.primaryDomain || 'general';
    const complexity = enhancedAnalysis.complexityLevel || 'moderate';
    const emotionalState = confusionDetection.emotionalState || 'neutral';
    
    const questions: string[] = [];
    
    // Domain-specific backup questions
    if (domain === 'cognitive') {
      questions.push(`What patterns do you notice in what you're trying to understand?`);
      questions.push(`How would you break this down into smaller pieces?`);
    } else if (domain === 'emotional') {
      questions.push(`What feelings come up when you think about this?`);
      questions.push(`How might understanding this help you?`);
    } else if (domain === 'technical') {
      questions.push(`What would be your first step to approach this?`);
      questions.push(`What tools or knowledge might help you explore this?`);
    } else {
      questions.push(`What aspects of this are you most curious about?`);
      questions.push(`What would help you feel more confident about this topic?`);
    }
    
    // Adapt to emotional state
    if (emotionalState === 'frustrated') {
      questions.unshift(`What would make this feel more manageable right now?`);
    } else if (emotionalState === 'curious') {
      questions.push(`What possibilities does this open up for you?`);
    }
    
    return questions.slice(0, 3);
  }

  /**
   * Build coherent Socratic response using Enhanced Analysis context
   */
  private async buildCoherentSocraticResponse(
    message: string,
    socraticQuestions: string[],
    enhancedAnalysis: any,
    confusionDetection: any,
    learningContext: any,
    canvasContext: any = {}
  ): Promise<string> {
    const domain = enhancedAnalysis.primaryDomain || 'general';
    const complexity = enhancedAnalysis.complexityLevel || 'moderate';
    const interactionStyle = enhancedAnalysis.interactionStyle || 'supportive';
    const emotionalState = confusionDetection.emotionalState || 'neutral';
    
    // Build contextual prompt for coherent response
    const hasCanvasContext = canvasContext.socraticGuidance || canvasContext.deferredActivation;
    const canvasType = canvasContext.contentType || 'document';
    
    const coherentPrompt = `You are a Socratic teacher engaging with a student. Respond naturally and coherently.

**Student's message:** "${message}"

**Context from AI Analysis:**
- Domain: ${domain}
- Complexity Level: ${complexity}
- Interaction Style: ${interactionStyle}
- Emotional State: ${emotionalState}
- Cognitive Insights: ${confusionDetection.cognitiveInsights?.join(', ') || 'general learning'}

${hasCanvasContext ? `**Canvas Context:**
- Canvas Integration: ${canvasContext.socraticGuidance ? 'Guided creation workspace' : 'Deferred until clarity'}
- Content Type: ${canvasType}
- Creation Intent: Help them organize thoughts and create structured content
- Workspace Goal: Guide them toward clear thinking that can be captured on canvas` : ''}

**Socratic Questions to Guide With:**
${socraticQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

**Your Response Should:**
1. Acknowledge their specific message empathetically
2. Reference their emotional state (${emotionalState})
3. Use ${interactionStyle} interaction style
4. Match ${complexity} complexity level
5. Naturally weave in the Socratic questions
${hasCanvasContext ? `6. Mention that you can help them organize their thoughts and create a ${canvasType} once they gain clarity
7. Guide them toward thinking that will translate well to a structured workspace` : '6. Feel like a real teacher conversation, not a template'}

Create a natural, flowing response that guides them toward discovery${hasCanvasContext ? ' and eventual structured creation' : ''}:`;

    try {
      await serviceContainer.waitForReady();
      
      const result = await toolRegistry.execute('llm-completion', {
        prompt: coherentPrompt,
        model: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
        temperature: 0.8,
        maxTokens: 600
      }, {
        sessionId: '',
        userId: '',
        startTime: Date.now()
      });

      if (result.success) {
        const coherentResponse = result.data?.completion ||
                               result.data?.response ||
                               result.data?.message || '';
        
        if (coherentResponse && coherentResponse.trim()) {
          console.log('✅ Generated coherent Socratic response');
          return coherentResponse;
        }
      }
    } catch (error) {
      console.error('❌ Coherent response generation failed:', error);
    }
    
    // Fallback with enhanced context
    return this.generateEnhancedFallbackResponse(message, socraticQuestions, enhancedAnalysis, emotionalState, canvasContext);
  }

  /**
   * Enhanced fallback response using analysis context
   */
  private generateEnhancedFallbackResponse(
    message: string,
    socraticQuestions: string[],
    enhancedAnalysis: any,
    emotionalState: string,
    canvasContext: any = {}
  ): string {
    const domain = enhancedAnalysis.primaryDomain || 'general';
    
    let response = '';
    
    // Emotional acknowledgment based on analysis
    if (emotionalState === 'frustrated') {
      response = `I can sense this is challenging, and that's completely natural when exploring ${domain} topics. `;
    } else if (emotionalState === 'curious') {
      response = `Your curiosity about ${domain} is wonderful - that's exactly the mindset that leads to deep understanding! `;
    } else if (emotionalState === 'needs_support') {
      response = `I'm here to guide you through this ${domain} exploration step by step. `;
    } else {
      response = `Let's explore this ${domain} question together. `;
    }
    
    response += `Looking at what you've shared: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"\n\n`;
    
    // Add guided questions
    response += `Let me ask you some questions that might help illuminate the path forward:\n\n`;
    socraticQuestions.forEach((question, index) => {
      response += `${index + 1}. ${question}\n`;
    });
    
    // Add canvas context when appropriate
    const hasCanvasContext = canvasContext.socraticGuidance || canvasContext.deferredActivation;
    if (hasCanvasContext) {
      const canvasType = canvasContext.contentType || 'document';
      if (canvasContext.socraticGuidance) {
        response += `\nAs we explore these questions together, I can help you organize your thoughts into a structured ${canvasType} that captures your insights and ideas clearly.`;
      } else if (canvasContext.deferredActivation) {
        response += `\nOnce we work through these questions and you feel clearer about your approach, I'll help you create a ${canvasType} to organize and develop your ideas further.`;
      }
    }
    
    response += `\nTake your time with these questions. Discovery happens through thoughtful reflection, and every insight builds toward deeper understanding.`;
    
    return response;
  }

  /**
   * Generate adaptive Socratic questions based on learning history
   */
  private async generateAdaptiveSocraticQuestions(
    message: string,
    intentAnalysis: IntentAnalysis,
    learningContext: any
  ): Promise<string[]> {
    const confusionLevel = intentAnalysis.confusionDetection?.confusionLevel || 0.5;
    const knowledgeGaps = intentAnalysis.confusionDetection?.knowledgeGaps || [];
    const domain = intentAnalysis.confusionDetection?.domainContext || 'general';
    const emotionalState = intentAnalysis.confusionDetection?.emotionalState || 'neutral';
    
    // Build adaptive prompt based on learning history
    const adaptivePrompt = this.buildAdaptiveSocraticPrompt(
      message,
      confusionLevel,
      knowledgeGaps,
      domain,
      emotionalState,
      learningContext
    );
    
    try {
      await serviceContainer.waitForReady();
      
      console.log('🧠 SocraticHandler: Attempting LLM-powered question generation...');
      
      const socraticResult = await toolRegistry.execute('llm-completion', {
        prompt: adaptivePrompt,
        model: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
        temperature: 0.8, // Higher for creative questioning
        maxTokens: 600
      }, {
        sessionId: '',
        userId: '',
        startTime: Date.now()
      });

      if (socraticResult.success) {
        const responseText = socraticResult.data?.completion ||
                           socraticResult.data?.response ||
                           socraticResult.data?.message || '';
        
        console.log('✅ SocraticHandler: LLM generated response:', responseText.substring(0, 100));
        
        // Parse questions from response
        const questions = this.parseQuestionsFromResponse(responseText);
        if (questions.length > 0) {
          console.log('✅ SocraticHandler: Parsed', questions.length, 'questions from LLM');
          return questions;
        }
      }
    } catch (error) {
      console.error('🔍 SocraticHandler: LLM generation failed:', error);
    }
    
    // 🎯 IMPROVED FALLBACK: Use LLM with simpler prompt instead of predefined patterns
    console.log('🔄 SocraticHandler: Using fallback LLM generation...');
    return this.generateLLMFallbackQuestions(message, domain, confusionLevel);
  }
  
  /**
   * Build adaptive Socratic prompt
   */
  private buildAdaptiveSocraticPrompt(
    message: string,
    confusionLevel: number,
    knowledgeGaps: string[],
    domain: string,
    emotionalState: string,
    learningContext: any
  ): string {
    const { struggledTopics, masteredTopics, preferredStyle } = learningContext;
    
    return `You are an adaptive Socratic teacher with deep understanding of the student's learning journey.

STUDENT'S CURRENT SITUATION:
- Message: "${message}"
- Domain: ${domain}
- Confusion Level: ${(confusionLevel * 100).toFixed(0)}%
- Emotional State: ${emotionalState}
- Knowledge Gaps: ${knowledgeGaps.join(', ') || 'general understanding'}

STUDENT'S LEARNING HISTORY:
- Previously Struggled With: ${struggledTopics.join(', ') || 'No recorded struggles'}
- Has Mastered: ${masteredTopics.join(', ') || 'Building foundations'}
- Preferred Learning Style: ${preferredStyle}

ADAPTIVE GUIDANCE REQUIREMENTS:
1. If emotional state is 'frustrated' or 'anxious': Start with confidence-building questions
2. If emotional state is 'curious' or 'confident': Challenge with deeper exploration
3. If preferred style is 'visual': Include questions about visualizing concepts
4. If preferred style is 'examples': Ask for real-world connections
5. If preferred style is 'step-by-step': Break down into sequential questions

Generate 2-3 Socratic questions that:
- Build on what the student has already mastered
- Gently address areas they've struggled with
- Match their emotional readiness
- Guide them to discover answers themselves
- Adapt to their preferred learning style

${emotionalState === 'frustrated' ? 'Start with: "You\'re doing great! Let\'s break this down together..."' : ''}
${emotionalState === 'confident' ? 'Start with: "Excellent progress! Ready to explore deeper?"' : ''}
${emotionalState === 'curious' ? 'Start with: "Great question! Let\'s explore this together..."' : ''}

Format: Return just the questions, one per line.`;
  }
  
  /**
   * Enhance pre-generated questions with memory context
   */
  private async enhanceQuestionsWithMemory(
    questions: string[],
    learningContext: any,
    intentAnalysis: IntentAnalysis
  ): Promise<string[]> {
    const enhancedQuestions = [...questions];
    const emotionalState = intentAnalysis.confusionDetection?.emotionalState || 'neutral';
    
    // Add personalization based on learning history
    if (learningContext.struggledTopics.length > 0) {
      // Reference past struggles supportively
      enhancedQuestions[0] = `Remember when you worked through ${learningContext.struggledTopics[0]}? This is similar. ${enhancedQuestions[0]}`;
    }
    
    if (learningContext.masteredTopics.length > 0) {
      // Build on mastered concepts
      const lastMastered = learningContext.masteredTopics[learningContext.masteredTopics.length - 1];
      enhancedQuestions.push(`How might this connect to what you learned about ${lastMastered}?`);
    }
    
    // Adapt to emotional state
    if (emotionalState === 'frustrated') {
      enhancedQuestions.unshift("Let's take this one step at a time. No rush!");
    } else if (emotionalState === 'confident') {
      enhancedQuestions.push("What patterns are you starting to notice?");
    }
    
    return enhancedQuestions.slice(0, 4); // Limit to 4 questions max
  }
  
  /**
   * Analyze cognitive state for adaptive response
   */
  private analyzeCognitiveState(
    message: string,
    intentAnalysis: IntentAnalysis,
    learningContext: any
  ): any {
    const confusionLevel = intentAnalysis.confusionDetection?.confusionLevel || 0;
    const emotionalState = intentAnalysis.confusionDetection?.emotionalState || 'neutral';
    const domain = intentAnalysis.confusionDetection?.domainContext || 'general';
    
    // Determine learning phase
    let learningPhase = 'exploration';
    if (confusionLevel > 0.7) {
      learningPhase = 'struggling';
    } else if (confusionLevel < 0.3 && emotionalState === 'confident') {
      learningPhase = 'mastering';
    } else if (emotionalState === 'curious') {
      learningPhase = 'discovering';
    }
    
    // Calculate progress indicators
    const progressIndicators = {
      understanding: 1 - confusionLevel,
      engagement: this.calculateEngagement(emotionalState, message),
      retention: this.estimateRetention(learningContext),
      readiness: this.assessReadiness(emotionalState, confusionLevel)
    };

        return {

      learningPhase,
      emotionalState,
      domain,
      confusionLevel,
      progressIndicators,
      recommendedApproach: this.determineApproach(learningPhase, emotionalState, learningContext.preferredStyle)
    };
  }
  
  /**
   * Store learning progress in memory
   */
  private async storeLearningProgress(
    userId: string,
    sessionId: string,
    message: string,
    intentAnalysis: IntentAnalysis,
    cognitiveAnalysis: any,
    socraticQuestions: string[]
  ): Promise<void> {
    try {
      await serviceContainer.waitForReady();
      
      const domain = intentAnalysis.confusionDetection?.domainContext || 'general';
      const insights = intentAnalysis.confusionDetection?.cognitiveInsights || [];
      
      // Store cognitive state
      if (cognitiveAnalysis.learningPhase === 'mastering') {
        await toolRegistry.execute('store_memory', {
          action: 'store',
          key: `mastered_${domain}_${Date.now()}`,
          value: `User achieved breakthrough in ${domain}: understands ${message.substring(0, 50)}`,
          metadata: {
            category: 'learning',
            domain,
            phase: 'mastered',
            confidence: cognitiveAnalysis.progressIndicators.understanding
          }
        }, { sessionId, userId, startTime: Date.now() });
      }
      
      // Store emotional progression
      if (cognitiveAnalysis.emotionalState !== 'neutral') {
        await toolRegistry.execute('store_memory', {
          action: 'store',
          key: `emotion_${domain}_${Date.now()}`,
          value: `Emotional state during ${domain} learning: ${cognitiveAnalysis.emotionalState}`,
          metadata: {
            category: 'emotional',
            domain,
            emotion: cognitiveAnalysis.emotionalState
          }
        }, { sessionId, userId, startTime: Date.now() });
      }
      
      // Store Socratic interaction
      await toolRegistry.execute('store_memory', {
        action: 'store',
        key: `socratic_${sessionId}_${Date.now()}`,
        value: `Socratic session: ${socraticQuestions.length} questions for ${domain}`,
        metadata: {
          category: 'socratic',
          questions: socraticQuestions,
          effectiveness: cognitiveAnalysis.progressIndicators.engagement
        }
      }, { sessionId, userId, startTime: Date.now() });
      
      // Store cognitive insights
      for (const insight of insights) {
        await toolRegistry.execute('store_memory', {
          action: 'store',
          key: `insight_${Date.now()}`,
          value: insight,
        metadata: {

            category: 'cognitive_insight',
            domain,
            sessionId
          }
        }, { sessionId, userId, startTime: Date.now() });
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to store learning progress:', error);
    }
  }
  
  /**
   * Format adaptive response based on learning style
   */
  private async formatAdaptiveResponse(
    questions: string[],
    originalMessage: string,
    cognitiveAnalysis: any,
    learningContext: any,
    intentAnalysis: IntentAnalysis
  ): Promise<string> {
    const { learningPhase, emotionalState, progressIndicators } = cognitiveAnalysis;
    const preferredStyle = learningContext.preferredStyle;
    
    console.log('🎓 Generating dynamic Socratic response for:', { originalMessage, emotionalState, learningPhase });
    
    try {
      // Build a dynamic prompt for the LLM based on context
      const dynamicPrompt = `You are an expert Socratic teacher having a real conversation with a student. 

**Student's Message:** "${originalMessage}"

**Context:**
- Emotional State: ${emotionalState}
- Learning Phase: ${learningPhase}
- Understanding Level: ${Math.round(progressIndicators.understanding * 100)}%
- Preferred Learning Style: ${preferredStyle}
- Domain: ${intentAnalysis.primaryDomain}
- Confusion Areas: ${intentAnalysis.confusionDetection?.knowledgeGaps?.join(', ') || 'none identified'}

**Your Task:**
Generate a NATURAL, CONVERSATIONAL response that:
1. Acknowledges their specific question/statement appropriately
2. Shows you understand what they're asking about
3. Guides them to discover the answer through 2-3 thoughtful questions
4. Adapts to their emotional state and learning style
5. References specific details from their message
6. Feels like a real teacher helping them understand

**Important:**
- Be conversational and natural, not robotic
- Address their EXACT question, don't give generic responses
- If they seem frustrated, be encouraging
- If they're confused, break things down
- Use their preferred learning style (${preferredStyle})

**Socratic Questions to Incorporate:**
${questions.map((q, i) => `- ${q}`).join('\n')}

Respond as the teacher would in a real conversation:`;

      // Use LLM to generate dynamic response
      await serviceContainer.waitForReady();
      
      const result = await toolRegistry.execute('llm-completion', {
        prompt: dynamicPrompt,
        model: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
        temperature: 0.8,
        maxTokens: 800
      }, {
        sessionId: '',
        userId: '',
        startTime: Date.now()
      });

      if (result.success) {
        const dynamicResponse = result.data?.completion ||
                               result.data?.response ||
                               result.data?.message || '';
        
        if (dynamicResponse && dynamicResponse.trim()) {
          console.log('✅ Generated dynamic Socratic response');
          return dynamicResponse;
        }
      }
    } catch (error) {
      console.error('❌ Failed to generate dynamic response:', error);
    }
    
    // Fallback to basic formatting if LLM fails
    console.log('⚠️ Using fallback Socratic formatting');
    let response = '';
    
    // Emotional acknowledgment
    if (emotionalState === 'frustrated') {
      response = `I can see this is challenging, and that's completely okay! Learning happens through these moments. `;
    } else if (emotionalState === 'confident') {
      response = `You're making excellent progress! `;
    } else if (emotionalState === 'curious') {
      response = `Great curiosity! That's the perfect mindset for learning. `;
    }
    
    // Reference the topic
    response += `Let's explore: "${originalMessage.substring(0, 100)}${originalMessage.length > 100 ? '...' : ''}"\n\n`;
    
    // Add questions
    response += `🤔 **Guiding questions:**\n`;
    questions.forEach((q, i) => {
      response += `${i + 1}. ${q}\n`;
    });
    
    return response;
  }
  
  /**
   * Track Socratic effectiveness for future improvement
   */
  private trackSocraticEffectiveness(sessionId: string, questions: string[], intentAnalysis: IntentAnalysis): void {
    const memory = this.learningMemories.get(sessionId) || {
      domain: intentAnalysis.confusionDetection?.domainContext || 'general',
      confusionAreas: [] as string[],
      masteredConcepts: [] as string[],
      preferredLearningStyle: 'step-by-step' as const,
      emotionalProgressions: [] as Array<{timestamp: number; emotion: string; topic: string}>,
      socraticHistory: [] as Array<{question: string; response: string; effectiveness: number}>
    };
    
    // Add to Socratic history
    questions.forEach(q => {
      memory.socraticHistory.push({
        question: q,
        response: '', // Will be filled when user responds
        effectiveness: 0 // Will be calculated based on response
      });
    });
    
    // Track emotional progression
    const emotionalState = intentAnalysis.confusionDetection?.emotionalState || 'neutral';
    memory.emotionalProgressions.push({
      timestamp: Date.now(),
      emotion: emotionalState,
      topic: intentAnalysis.confusionDetection?.domainContext || 'general'
    });
    
    this.learningMemories.set(sessionId, memory);
  }
  
  /**
   * Generate contextual questions based on domain and confusion
   */
  /**
   * Generate questions using LLM with simpler prompt as fallback
   */
  private async generateLLMFallbackQuestions(message: string, domain: string, confusionLevel: number): Promise<string[]> {
    try {
      const simplePrompt = `You are a skilled Socratic teacher. The student said: "${message}"

Generate 2-3 thoughtful Socratic questions that help them think deeper about their request. 

Domain: ${domain}
Student confusion level: ${Math.round(confusionLevel * 100)}%

Questions should:
- Guide them to discover answers themselves
- Be specific to their message
- Build understanding step by step
- Use natural, conversational language

Format: One question per line, no numbering.`;

      const result = await toolRegistry.execute('llm-completion', {
        prompt: simplePrompt,
        model: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
        temperature: 0.7,
        maxTokens: 300
      }, {
        sessionId: '',
        userId: '',
        startTime: Date.now()
      });

      if (result.success) {
        const responseText = result.data?.completion ||
                           result.data?.response ||
                           result.data?.message || '';
        
        const questions = this.parseQuestionsFromResponse(responseText);
        if (questions.length > 0) {
          console.log('✅ SocraticHandler: Fallback LLM generated', questions.length, 'questions');
          return questions;
        }
      }
    } catch (error) {
      console.error('🔍 SocraticHandler: Fallback LLM also failed:', error);
    }
    
    // Last resort: Use minimal predefined questions
    return this.generateMinimalQuestions(message);
  }

  /**
   * Minimal predefined questions as absolute last resort
   */
  private generateMinimalQuestions(message: string): string[] {
    return [
      "What specifically are you trying to understand about this?",
      "Can you tell me more about what's confusing you?",
      "What would help you feel more confident about this topic?"
    ];
  }

  private generateContextualQuestions(message: string, domain: string, confusionLevel: number): string[] {
    const questions: string[] = [];
    const messageLower = message.toLowerCase();
    
    // Domain-specific question generation
    switch (domain) {
      case 'math':
        if (confusionLevel > 0.6) {
          questions.push("What do the numbers or symbols in this problem represent?");
          questions.push("Can you identify what operation we need to perform?");
          questions.push("What would be the first step to solve this?");
        } else {
          questions.push("What pattern do you notice in this problem?");
          questions.push("How would you check if your answer is correct?");
          questions.push("Can you think of a similar problem you've solved before?");
        }
        break;
        
      case 'science':
        questions.push("What do you already know about this concept?");
        questions.push("What would happen if we changed one variable?");
        questions.push("How does this relate to what we observe in everyday life?");
        break;
        
      case 'programming':
        questions.push("What should this code accomplish?");
        questions.push("Can you trace through what happens step by step?");
        questions.push("What input would test if this works correctly?");
        break;
        
      case 'language':
        questions.push("What is the main idea you're trying to express?");
        questions.push("How would you explain this to someone else?");
        questions.push("What makes this different from similar concepts?");
        break;
        
      default:
        // General cognitive questions
        if (messageLower.includes('how')) {
          questions.push("What would be the first step in figuring this out?");
          questions.push("What information do we need to answer this?");
        } else if (messageLower.includes('what')) {
          questions.push("What do you think this might be?");
          questions.push("What clues can help us figure this out?");
        } else if (messageLower.includes('why')) {
          questions.push("What might be the reason for this?");
          questions.push("What evidence supports your thinking?");
        } else {
          questions.push("What do you already understand about this?");
          questions.push("What specific part would you like to explore first?");
          questions.push("How might you approach learning about this?");
        }
    }
    
    return questions.slice(0, 3);
  }
  
  /**
   * Parse questions from LLM response
   */
  private parseQuestionsFromResponse(response: string): string[] {
    const lines = response.split('\n').filter(line => line.trim());
    const questions: string[] = [];
    
    for (const line of lines) {
      // Look for question marks or question patterns
      if (line.includes('?') || /^(what|how|why|when|where|who|which|can|could|would|should)/i.test(line.trim())) {
        // Clean up the question
        const cleaned = line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();
        if (cleaned.length > 10) { // Ensure it's a substantial question
          questions.push(cleaned);
        }
      }
    }
    
    return questions;
  }
  
  /**
   * Calculate engagement level from emotional state and message
   */
  private calculateEngagement(emotionalState: string, message: string): number {
    let engagement = 0.5;
    
    // Emotional state factors
    const emotionalEngagement: Record<string, number> = {
      'curious': 0.9,
      'confident': 0.8,
      'exploring': 0.7,
      'neutral': 0.5,
      'confused': 0.6,
      'frustrated': 0.4,
      'scared': 0.3
    };
    
    engagement = emotionalEngagement[emotionalState] || 0.5;
    
    // Message length as engagement indicator
    if (message.length > 100) engagement += 0.1;
    if (message.length > 200) engagement += 0.1;
    
    // Question asking as engagement
    if (message.includes('?')) engagement += 0.1;
    
    return Math.min(1, engagement);
  }
  
  /**
   * Estimate retention based on learning context
   */
  private estimateRetention(learningContext: any): number {
    let retention = 0.5;
    
    // More mastered topics = better retention
    retention += learningContext.masteredTopics.length * 0.1;
    
    // Fewer struggled topics = better retention
    retention -= learningContext.struggledTopics.length * 0.05;
    
    // Consistent learning style = better retention
    if (learningContext.preferredStyle !== 'step-by-step') {
      retention += 0.1; // Has found their preferred style
    }
    
    return Math.max(0, Math.min(1, retention));
  }
  
  /**
   * Assess readiness for new concepts
   */
  private assessReadiness(emotionalState: string, confusionLevel: number): number {
    let readiness = 0.5;
    
    // Emotional readiness
    if (emotionalState === 'curious' || emotionalState === 'confident') {
      readiness += 0.3;
    } else if (emotionalState === 'frustrated' || emotionalState === 'scared') {
      readiness -= 0.3;
    }
    
    // Cognitive readiness (inverse of confusion)
    readiness += (1 - confusionLevel) * 0.4;
    
    return Math.max(0, Math.min(1, readiness));
  }
  
  /**
   * Determine recommended approach based on learning phase
   */
  private determineApproach(learningPhase: string, emotionalState: string, preferredStyle: string): string {
    if (learningPhase === 'struggling') {
      if (emotionalState === 'frustrated') {
        return 'confidence_building';
      }
      return 'break_down_basics';
    } else if (learningPhase === 'mastering') {
      return 'challenge_synthesis';
    } else if (learningPhase === 'discovering') {
      if (preferredStyle === 'visual') {
        return 'visual_exploration';
      } else if (preferredStyle === 'examples') {
        return 'example_based_discovery';
      }
      return 'guided_exploration';
    }
    
    return 'adaptive_guidance';
  }
  
  /**
   * Generate dynamic fallback Socratic response using LLM with uncertainty detection
   */
  private async generateFallbackSocraticResponse(message: string): Promise<string> {
    try {
      // Detect uncertainty signals more comprehensively
      const uncertaintySignals = this.detectUncertaintySignals(message);
      
      // Use LLM for dynamic response based on uncertainty
      const dynamicPrompt = `You are a master Socratic teacher responding to a student who shows uncertainty.

**Student's message:** "${message}"

**Uncertainty signals detected:** ${uncertaintySignals.join(', ') || 'general confusion'}

**Your task:** Create a natural, empathetic response that:
1. Acknowledges their specific uncertainty with empathy
2. Asks 2-3 Socratic questions that guide them to discover the answer
3. References their exact words/concerns
4. Feels like a real conversation, not a template
5. Builds their confidence while challenging their thinking

Be conversational and specific to their message. Start with acknowledgment, then guide with questions.`;

      await serviceContainer.waitForReady();
      
      const result = await toolRegistry.execute('llm-completion', {
        prompt: dynamicPrompt,
        model: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
        temperature: 0.9, // High creativity for natural responses
        maxTokens: 600
      }, {
        sessionId: '',
        userId: '',
        startTime: Date.now()
      });

      if (result.success) {
        const dynamicResponse = result.data?.completion ||
                               result.data?.response ||
                               result.data?.message || '';
        
        if (dynamicResponse && dynamicResponse.trim()) {
          console.log('✅ Generated dynamic fallback Socratic response');
          return dynamicResponse;
        }
      }
    } catch (error) {
      console.error('❌ Dynamic fallback generation failed:', error);
    }
    
    // If even LLM fallback fails, use minimal but still dynamic template
    return this.generateMinimalDynamicResponse(message);
  }

  /**
   * Detect uncertainty signals in user messages
   */
  private detectUncertaintySignals(message: string): string[] {
    const uncertaintyPatterns = [
      { pattern: /\b(not sure|unsure|uncertain|confused|unclear)\b/i, signal: 'explicit uncertainty' },
      { pattern: /\b(don't understand|don't get|can't figure|struggling)\b/i, signal: 'comprehension difficulty' },
      { pattern: /\b(maybe|perhaps|might be|could be|possibly)\b/i, signal: 'tentative language' },
      { pattern: /\?.*\?/g, signal: 'multiple questions' },
      { pattern: /\b(help|stuck|lost|overwhelmed)\b/i, signal: 'request for assistance' },
      { pattern: /\b(I think|I guess|I suppose|I assume)\b/i, signal: 'uncertain assumptions' },
      { pattern: /\b(sort of|kind of|somewhat|a bit)\b/i, signal: 'hedging language' }
    ];

    const signals: string[] = [];
    for (const { pattern, signal } of uncertaintyPatterns) {
      if (pattern.test(message)) {
        signals.push(signal);
      }
    }
    
    return signals;
  }

  /**
   * Generate minimal but personalized response when all else fails
   */
  private generateMinimalDynamicResponse(message: string): string {
    const uncertaintySignals = this.detectUncertaintySignals(message);
    const isExplicitlyUncertain = uncertaintySignals.length > 0;
    
    if (isExplicitlyUncertain) {
      return `I hear that you're feeling ${uncertaintySignals[0]}. That's completely natural - learning happens through these moments of uncertainty.

Looking at what you shared: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

Let's explore this together:
• What part of this feels most unclear to you right now?
• What do you already understand that we can build on?
• What would help you feel more confident about taking the next step?

Remember, confusion is often the doorway to deeper understanding.`;
    }
    
    // For non-explicit uncertainty, still be dynamic
    return `I can see you're working through: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

This is exactly the kind of thinking that leads to breakthrough understanding. Let me ask you a few questions that might help illuminate the path forward:

• What aspects of this are you most curious about?
• What connections are you starting to see?
• What would you try first if you knew you couldn't fail?

Take your time with these - the best insights often come when we give our minds space to explore.`;
  }
}
