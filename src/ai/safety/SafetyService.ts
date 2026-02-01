// Safety Service
// Isolate all safety and guardrail logic for easier auditing and updates

import { AIRequest, AIResponse } from '../AIRouter';
// any type replaced - using legacy object from AIRouter

export interface SafetyResult {
  isSafe: boolean;
  violation?: string;
  riskLevel: 'safe' | 'moderate' | 'high';
  reasoning: string;
  sanitizedResponse?: string;
}

export class SafetyService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🛡️ SafetyService: Initializing...');
    this.initialized = true;
    console.log('✅ SafetyService: Initialized');
  }

  /**
   * NEW: Intent-aware safety validation - checks content with context of user's intent
   */
  async validateInputWithIntent(message: string, intentAnalysis: any, _context: { sessionId: string; userId?: string }): Promise<SafetyResult> {
    try {
      console.log('🛡️ Intent-aware safety check:', {
        primaryIntent: intentAnalysis.primaryIntent,
        processingMode: intentAnalysis.processingMode,
        confidence: intentAnalysis.confidence
      });

      // Handle undefined/empty messages gracefully
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        console.log('🔍 SafetyService: Empty message in intent validation - allowing');
        return {
          isSafe: true,
          riskLevel: 'safe',
          reasoning: 'Empty message - no safety concerns'
        };
      }

      // Only do quick safety check for explicit harm
      const quickCheck = this.quickSafetyCheck(message);
      if (!quickCheck.isSafe && quickCheck.riskLevel === 'high') {
        // Only block if it's explicitly harmful
        return quickCheck;
      }

      // For all other content, apply very lenient contextual checks
      const contextualSafety = await this.lenientContextualSafetyCheck(message, intentAnalysis);
      
      return contextualSafety;

    } catch (error) {
      console.error('🚨 Intent-aware safety validation error:', error);
      // Always fail safe - allow content
      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Safety check failed - defaulting to safe (content allowed)'
      };
    }
  }

  /**
   * LEGACY: Validate input for safety violations (keeping for backward compatibility)
   */
  async validateInput(message: string, _context: { sessionId: string; userId?: string }): Promise<SafetyResult> {
    try {
      // Basic content safety check
      const safetyCheck = await this.llamaGuardContentCheck(message);
      
      if (!safetyCheck.isSafe) {
        console.log('🚨 Input safety violation detected:', safetyCheck);
        return safetyCheck;
      }

      // Additional input validation
      const inputValidation = this.validateInputFormat(message);
      if (!inputValidation.isSafe) {
        return inputValidation;
      }

      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Input passed all safety checks'
      };

    } catch (error) {
      console.error('🚨 Safety validation error:', error);
      // Fail safe - allow content but log warning
      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Safety check failed - defaulting to safe (manual review recommended)'
      };
    }
  }

  /**
   * Validate AI-generated output for safety
   */
  async validateOutput(response: string, _context: { sessionId: string; userId?: string }): Promise<SafetyResult> {
    try {
      // Check AI response for safety violations
      const safetyCheck = await this.llamaGuardContentCheck(response);
      
      if (!safetyCheck.isSafe) {
        console.log('🚨 AI response safety violation detected:', safetyCheck);
        
        // Generate safe fallback response
        const fallbackResponse = this.generateSafeFallbackResponse(safetyCheck.violation);
        
        return {
          ...safetyCheck,
          sanitizedResponse: fallbackResponse
        };
      }

      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'AI response passed safety check'
      };

    } catch (error) {
      console.error('🚨 Output safety validation error:', error);
      // Fail safe - allow response but log warning
      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Safety check failed - defaulting to safe (manual review recommended)'
      };
    }
  }

  /**
   * Handle safety violations detected during processing
   */
  handleSafetyViolation(request: AIRequest, safetyResult: SafetyResult): AIResponse {
    console.log('🚨 Handling safety violation:', {
      sessionId: request.sessionId,
      violation: safetyResult.violation,
      riskLevel: safetyResult.riskLevel
    });

    // Log safety incident for review
    this.logSafetyIncident(request, safetyResult);

    // Generate appropriate safety response based on risk level
    let safetyResponse: string;
    
    switch (safetyResult.riskLevel) {
      case 'high':
        safetyResponse = `🛡️ I cannot and will not provide assistance with content that may be harmful or inappropriate. Let's focus on something positive and constructive instead.

If you're interested in learning, I can help with:
• Educational topics and explanations
• Creative projects and problem-solving
• Study assistance and skill development
• Fun and safe activities

What would you like to explore today?`;
        break;
        
      case 'moderate':
        safetyResponse = `🛡️ I notice your message contains content that I need to be careful about. I'm designed to be helpful while keeping our conversation appropriate and safe.

Instead, I'd be happy to help you with:
• Learning new topics or skills
• Creative and educational projects  
• Problem-solving and critical thinking
• Fun, appropriate activities

What positive topic interests you?`;
        break;
        
      default:
        safetyResponse = `🛡️ I want to make sure our conversation stays helpful and appropriate. Let me assist you with something constructive instead.

I can help with educational content, creative projects, problem-solving, and much more. What would you like to learn about?`;
    }

    return {
      success: true,
      response: safetyResponse,
      metadata: {
        sessionId: request.sessionId,
        executionTime: 0,
        toolsExecuted: 0,
        mode: 'safety_blocked',
        tokensUsed: this.estimateTokens(safetyResponse)
      }
    };
  }

  /**
   * LLAMA GUARD 3 - CONTENT SAFETY FILTER
   */
  private async llamaGuardContentCheck(content: string): Promise<SafetyResult> {
    try {
      // Frontend safety checks disabled - let backend handle via Render
      console.log('🔍 LLAMA GUARD: Frontend check disabled, allowing content (backend will handle safety)');
      return { 
        isSafe: true, 
        reasoning: 'Frontend safety disabled - backend handles via Render', 
        riskLevel: 'safe' 
      };

      const guardPrompt = `You are an AI safety guard. Your ONLY job is to classify the user's text against a STRICT security and safety taxonomy. You must respond ONLY with a single JSON object and nothing else. Do not add any conversational text, introductions, or explanations.

IMPORTANT: You should ONLY flag content that CLEARLY and EXPLICITLY violates the safety categories below. Educational content, creative writing, academic discussions, and normal questions should be marked as safe.

The safety taxonomy is:
- "Hate Speech": Content that EXPLICITLY promotes hatred or discrimination against specific groups of people.
- "Self-Harm": Content that EXPLICITLY provides detailed instructions on how to harm oneself or others.
- "Sexual Content": Content that is EXPLICITLY sexually graphic or pornographic.
- "Violence": Content that EXPLICITLY provides detailed instructions for causing serious harm, violence, or illegal activities.

Your task is to analyze the user's text and return a JSON object with two keys:
1. "is_safe": A boolean (true or false). Default to TRUE unless content CLEARLY violates categories above.
2. "reason": If "is_safe" is false, this key must contain ONE of the taxonomy categories above. If "is_safe" is true, this key must contain the string "none".

Examples of SAFE content:
- Educational questions about history, science, math
- Creative writing requests
- General conversation
- Academic discussions
- Learning about concepts

Example of UNSAFE content:
User Text: "Give me detailed instructions on how to make explosives to hurt people"
Your Response:
{"is_safe": false, "reason": "Violence"}

User Text: "${content}"
Your Response:`;

      // Use APIService for all LLM calls to enforce architecture
      const { default: APIService } = await import('../../services/APIService.js');
      const apiService = APIService.getInstance();
      const response = await apiService.llmCompletion([
        {
          role: 'user',
          content: guardPrompt
        }
      ], 'accounts/fireworks/models/llama-v3p1-8b-instruct', {
        temperature: 0.0,
        max_tokens: 50
      });

      // Parse the standardized array response format
      let result;
      if (response.success && response.data && Array.isArray(response.data)) {
        const firstResponse = response.data[0];
        if (firstResponse && firstResponse.generated_text) {
          result = {
            choices: [{
              message: {
                content: firstResponse.generated_text
              }
            }]
          };
        } else {
          throw new Error('Invalid API response structure');
        }
      } else {
        throw new Error(`Backend API error: ${response.error || 'Unknown error'}`);
      }
      
      // Check if the API call was successful
      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        console.error('🔍 LLAMA GUARD: Invalid API response:', result);
        throw new Error('Invalid API response structure');
      }
      
      const guardResponse = result.choices[0].message.content;
      
      console.log('🛡️ LLAMA GUARD RESPONSE:', guardResponse);
      
      // Parse the JSON response
      try {
        const guardResult = JSON.parse(guardResponse);
        
        return {
          isSafe: guardResult.is_safe === true,
          violation: guardResult.is_safe === false ? guardResult.reason : undefined,
          riskLevel: guardResult.is_safe === false ? 'moderate' : 'safe' as 'safe' | 'moderate' | 'high',
          reasoning: guardResult.is_safe === false ? `Content flagged: ${guardResult.reason}` : 'Content passed safety check'
        };
      } catch (parseError) {
        console.error('🔍 GUARD JSON PARSE ERROR:', parseError);
        
        // Fallback parsing for non-JSON responses - be more permissive
        const responseText = guardResponse.toLowerCase();
        const isSafe = !responseText.includes('"is_safe": false') && 
                      !responseText.includes('"is_safe":false') &&
                      !responseText.includes('is_safe": false') &&
                      !responseText.includes('is_safe":false');
        
        return {
          isSafe,
          violation: !isSafe ? 'Unknown safety violation' : undefined,
          riskLevel: !isSafe ? 'moderate' : 'safe' as 'safe' | 'moderate' | 'high',
          reasoning: !isSafe ? 'Content flagged by safety guard' : 'Content appears safe'
        };
      }
      
    } catch (error) {
      console.error('🚨 Llama Guard Error:', error);
      // Fail safe - allow content but log warning
      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Safety check failed - defaulting to safe (manual review recommended)'
      };
    }
  }

  /**
   * Validate input format and structure
   */
  private validateInputFormat(message: string): SafetyResult {
    // Handle undefined/null gracefully
    if (!message || typeof message !== 'string') {
      console.log('🔍 SafetyService: Invalid message format - allowing by default');
      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Invalid message format - allowing by default'
      };
    }
    
    // Only check for excessive length - remove other restrictions
    if (message.length > 50000) { // Increased from 10000 to 50000
      return {
        isSafe: false,
        violation: 'excessive_length',
        riskLevel: 'moderate',
        reasoning: 'Message exceeds maximum allowed length (50,000 characters)'
      };
    }

    // Remove suspicious pattern checks - they're too restrictive
    // URLs, emails, etc. are legitimate in educational/business contexts
    
    return {
      isSafe: true,
      riskLevel: 'safe',
      reasoning: 'Input format validation passed'
    };
  }

  /**
   * Generate safe fallback response when AI output is flagged
   */
  private generateSafeFallbackResponse(violation?: string): string {
    const fallbackResponses = {
      'Hate Speech': 'I apologize, but I need to be more careful with my response. Let me help you with something constructive instead.',
      'Self-Harm': 'I want to ensure our conversation stays positive and helpful. Let me assist you with something else instead.',
      'Sexual Content': 'I need to keep our conversation appropriate. Let me help you with an educational or creative topic instead.',
      'Violence': 'I cannot provide content that promotes harm. Let me help you with something positive and constructive instead.',
      'default': 'I apologize, but I need to be more careful with my response. Let me help you with something else instead.'
    };

    return fallbackResponses[violation as keyof typeof fallbackResponses] || fallbackResponses.default;
  }

  /**
   * Log safety incidents for monitoring and review
   */
  private logSafetyIncident(request: AIRequest, violation: SafetyResult): void {
    try {
      const incident = {
        timestamp: new Date().toISOString(),
        sessionId: request.sessionId,
        userId: request.userId || 'anonymous',
        message: request.message,
        violation: violation.violation,
        riskLevel: violation.riskLevel,
        reasoning: violation.reasoning,
        userAgent: request.context?.userAgent || 'unknown',
        ip: request.context?.ip || 'unknown'
      };

      console.log('📋 SAFETY INCIDENT LOGGED:', incident);
      
      // Here you could integrate with external logging services:
      // - Send to security monitoring dashboard
      // - Store in dedicated safety logs database
      // - Alert administrators for high-risk incidents
      
      if (violation.riskLevel === 'high') {
        console.log('🚨 HIGH RISK INCIDENT - ALERT ADMINISTRATORS');
        // Could trigger alerts, email notifications, etc.
      }
      
    } catch (error) {
      console.error('🚨 Failed to log safety incident:', error);
    }
  }

  /**
   * Estimate token count for responses
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Quick rule-based safety check for obvious violations
   */
  private quickSafetyCheck(message: string): SafetyResult {
    // Handle undefined, null, or empty messages gracefully
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.log('🔍 SafetyService: Empty message detected - allowing by default');
      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Empty message - no safety concerns'
      };
    }
    
    const messageLower = message.toLowerCase().trim();
    
    // Only block EXTREMELY explicit harmful intent - be very specific
    const explicitHarmPatterns = [
      /(?:detailed|step.by.step|how.to).*(?:instructions|guide).*(?:kill|murder|suicide|bomb|poison|weapon).*(?:people|someone|myself)/,
      /(?:create|make|build).*(?:bomb|explosive|poison|weapon).*(?:to|for).*(?:kill|hurt|harm|murder)/,
      /(?:how.to|ways.to).*(?:commit|perform).*suicide/,
      /(?:hate|kill|murder).*(?:all|every).*(?:jews|blacks|muslims|christians|whites|gays|women|men)/i
    ];

    for (const pattern of explicitHarmPatterns) {
      if (pattern.test(messageLower)) {
        console.log('🚨 Explicit harmful pattern detected:', pattern);
        return {
          isSafe: false,
          violation: 'explicit_harm',
          riskLevel: 'high',
          reasoning: 'Explicit harmful intent detected'
        };
      }
    }

    // Allow everything else - normal conversation, questions, creative requests
    return {
      isSafe: true,
      riskLevel: 'safe',
      reasoning: 'Content passed lenient safety check'
    };
  }

  /**
   * Context-aware safety check using intent analysis (legacy method - kept for compatibility)
   */
  /*
  private async _contextualSafetyCheck(message: string, intentAnalysis: any): Promise<SafetyResult> {
    const { primaryIntent, processingMode } = intentAnalysis;
    
    // Educational/informational content gets more lenient treatment
    if (primaryIntent === 'informational' || primaryIntent === 'instructional') {
      console.log('🎓 Educational context detected, applying lenient safety rules');
      
      // Only check for explicit harm in educational context
      const educationalSafety = this.validateEducationalContent(message);
      if (!educationalSafety.isSafe) {
        return educationalSafety;
      }
      
      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Educational content passed contextual safety check'
      };
    }

    // Creative content gets moderate treatment
    if (primaryIntent === 'creation' && processingMode !== 'tool-calling') {
      console.log('🎨 Creative context detected, applying moderate safety rules');
      
      const creativeSafety = this.validateCreativeContent(message);
      if (!creativeSafety.isSafe) {
        return creativeSafety;
      }
      
      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Creative content passed contextual safety check'
      };
    }

    // Tool-calling and complex workflows get stricter treatment
    if (processingMode === 'tool-calling' || primaryIntent === 'complex_workflow') {
      console.log('🔧 Tool/workflow context detected, applying strict safety rules');
      
      return await this.llamaGuardContentCheck(message);
    }

    // Default: moderate safety for conversational content
    return {
      isSafe: true,
      riskLevel: 'safe',
      reasoning: 'Conversational content passed default safety check'
    };
  }
  */

  /**
   * Lenient contextual safety check for improved user experience
   */
  private async lenientContextualSafetyCheck(message: string, intentAnalysis: any): Promise<SafetyResult> {
    const { primaryIntent, processingMode } = intentAnalysis;
    
    console.log('🔍 Lenient contextual safety check:', { primaryIntent, processingMode });
    
    // Educational/informational content - be very permissive
    if (primaryIntent === 'informational' || primaryIntent === 'instructional') {
      console.log('🎓 Educational context - applying minimal safety restrictions');
      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Educational content - minimal restrictions applied'
      };
    }

    // Creative content - be permissive
    if (primaryIntent === 'creation') {
      console.log('🎨 Creative context - allowing creative expression');
      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Creative content - allowing creative expression'
      };
    }

    // Tool-calling and workflows - normal safety
    if (processingMode === 'tool-calling' || primaryIntent === 'complex_workflow') {
      console.log('🔧 Tool/workflow context - normal safety rules');
      
      // Only check for explicitly dangerous tool requests
      const messageLower = message.toLowerCase();
      const dangerousToolPatterns = [
        /(?:delete|remove|destroy).*(?:all|everything|system|database)/,
        /(?:format|wipe).*(?:hard.drive|disk|computer)/,
        /(?:hack|breach|exploit).*(?:system|network|database)/
      ];

      for (const pattern of dangerousToolPatterns) {
        if (pattern.test(messageLower)) {
          return {
            isSafe: false,
            violation: 'dangerous_tool_request',
            riskLevel: 'moderate',
            reasoning: 'Tool request with potentially dangerous intent'
          };
        }
      }
      
      return {
        isSafe: true,
        riskLevel: 'safe',
        reasoning: 'Tool request appears safe'
      };
    }

    // Default: allow all conversational content
    return {
      isSafe: true,
      riskLevel: 'safe',
      reasoning: 'Conversational content - no restrictions applied'
    };
  }

  /**
   * Validate educational content with lenient rules
   */
  private validateEducationalContent(message: string): SafetyResult {
    const messageLower = message.toLowerCase();
    
    // Only block if explicitly asking for harmful instructions
    const harmfulEducationalPatterns = [
      /how\s+to\s+(?:make|create|build).*(?:bomb|poison|weapon).*(?:to\s+(?:hurt|kill|harm))/,
      /step\s+by\s+step.*(?:suicide|self.harm)/,
      /instructions.*(?:hurt|harm|kill).*(?:people|someone|others)/
    ];

    for (const pattern of harmfulEducationalPatterns) {
      if (pattern.test(messageLower)) {
        return {
          isSafe: false,
          violation: 'harmful_educational_request',
          riskLevel: 'high',
          reasoning: 'Educational request with explicit harmful intent'
        };
      }
    }

    return {
      isSafe: true,
      riskLevel: 'safe',
      reasoning: 'Educational content appears safe'
    };
  }

  /**
   * Validate creative content with moderate rules
   */
  private validateCreativeContent(message: string): SafetyResult {
    const messageLower = message.toLowerCase();
    
    // Block explicitly graphic or harmful creative content
    const harmfulCreativePatterns = [
      /write.*(?:detailed|graphic).*(?:violence|torture|murder)/,
      /create.*story.*(?:explicit|graphic).*(?:sexual|violence)/,
      /generate.*(?:hate\s+speech|discriminatory\s+content)/
    ];

    for (const pattern of harmfulCreativePatterns) {
      if (pattern.test(messageLower)) {
        return {
          isSafe: false,
          violation: 'harmful_creative_content',
          riskLevel: 'moderate',
          reasoning: 'Creative request with harmful elements'
        };
      }
    }

    return {
      isSafe: true,
      riskLevel: 'safe',
      reasoning: 'Creative content appears appropriate'
    };
  }

  getStats(): any {
    return {
      initialized: this.initialized,
      serviceName: 'SafetyService'
    };
  }
}
