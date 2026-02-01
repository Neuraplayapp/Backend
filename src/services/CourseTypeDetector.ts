// Course Type Detection Service
// Uses LLM to intelligently classify course types based on subject matter
// Much more robust than regex pattern matching

import { serviceContainer } from './ServiceContainer';

export type CourseType = 'language' | 'soft_skills' | 'technical' | 'academic' | 'creative' | 'general';

export interface CourseTypeConfig {
  type: CourseType;
  confidence: number;
  reasoning: string;
  minSteps: number;
  maxSteps: number;
  chunkTypes: string[];
  requiresVocabulary: boolean;
  requiresScenarios: boolean;
  requiresCodeExamples: boolean;
  quizStyle: 'vocabulary' | 'scenario' | 'technical' | 'conceptual';
  contentStyle: 'structured_tables' | 'narrative_scenarios' | 'code_focused' | 'mixed';
  // For hybrid courses
  secondaryType?: CourseType;
  hybridElements?: string[];
}

export interface ClassificationResult {
  primaryType: CourseType;
  confidence: number;
  reasoning: string;
  secondaryType?: CourseType;
  secondaryConfidence?: number;
  isHybrid: boolean;
  suggestedApproach: string;
  keyElements: string[];
}

// Base configurations for each course type (used after LLM classification)
const COURSE_TYPE_CONFIGS: Record<CourseType, Omit<CourseTypeConfig, 'type' | 'confidence' | 'reasoning'>> = {
  language: {
    minSteps: 8,
    maxSteps: 12,
    chunkTypes: ['hook', 'alphabet', 'vocabulary', 'concept', 'example', 'practice', 'quiz', 'recap'],
    requiresVocabulary: true,
    requiresScenarios: false,
    requiresCodeExamples: false,
    quizStyle: 'vocabulary',
    contentStyle: 'structured_tables'
  },
  
  soft_skills: {
    minSteps: 6,
    maxSteps: 10,
    chunkTypes: ['hook', 'framework', 'concept', 'scenario', 'practice', 'reflection', 'quiz', 'action_plan'],
    requiresVocabulary: false,
    requiresScenarios: true,
    requiresCodeExamples: false,
    quizStyle: 'scenario',
    contentStyle: 'narrative_scenarios'
  },
  
  technical: {
    minSteps: 6,
    maxSteps: 10,
    chunkTypes: ['hook', 'concept', 'code_example', 'practice', 'exercise', 'quiz', 'recap'],
    requiresVocabulary: false,
    requiresScenarios: false,
    requiresCodeExamples: true,
    quizStyle: 'technical',
    contentStyle: 'code_focused'
  },
  
  academic: {
    minSteps: 5,
    maxSteps: 8,
    chunkTypes: ['hook', 'concept', 'example', 'visual', 'practice', 'quiz', 'recap'],
    requiresVocabulary: false,
    requiresScenarios: false,
    requiresCodeExamples: false,
    quizStyle: 'conceptual',
    contentStyle: 'mixed'
  },
  
  creative: {
    minSteps: 5,
    maxSteps: 8,
    chunkTypes: ['hook', 'concept', 'visual', 'example', 'practice', 'project', 'recap'],
    requiresVocabulary: false,
    requiresScenarios: false,
    requiresCodeExamples: false,
    quizStyle: 'conceptual',
    contentStyle: 'mixed'
  },
  
  general: {
    minSteps: 4,
    maxSteps: 6,
    chunkTypes: ['hook', 'concept', 'example', 'practice', 'quiz', 'recap'],
    requiresVocabulary: false,
    requiresScenarios: false,
    requiresCodeExamples: false,
    quizStyle: 'conceptual',
    contentStyle: 'mixed'
  }
};

export class CourseTypeDetector {
  private static toolRegistry: any = null;

  /**
   * Initialize the detector with tool registry
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.toolRegistry) {
      await serviceContainer.waitForReady();
      this.toolRegistry = await serviceContainer.getAsync('toolRegistry');
    }
  }

  /**
   * Classify course type using LLM
   * This is the MAIN entry point - uses AI to understand the course topic
   */
  static async classifyWithLLM(subject: string, additionalContext?: string): Promise<ClassificationResult> {
    await this.ensureInitialized();

    const prompt = `You are an expert course designer. Classify the following course topic into the most appropriate category.

COURSE TOPIC: "${subject}"
${additionalContext ? `ADDITIONAL CONTEXT: ${additionalContext}` : ''}

AVAILABLE CATEGORIES:
1. **language** - Learning a foreign language (Arabic, Spanish, French, etc.), including alphabet, vocabulary, grammar, pronunciation
2. **soft_skills** - Professional/interpersonal skills: leadership, coaching, communication, emotional intelligence, teamwork, conflict resolution, presentation skills, management, mentoring, negotiation
3. **technical** - Programming, software development, IT, data science, engineering, technical tools and systems
4. **academic** - Traditional academic subjects: mathematics, physics, chemistry, biology, history, economics, psychology
5. **creative** - Art, design, music, writing, photography, content creation, UX/UI
6. **general** - General knowledge or topics that don't fit other categories

IMPORTANT CONSIDERATIONS:
- "Coaching" as a topic = soft_skills (teaching people how to coach others)
- "Learning Python" = technical
- "Coaching in Python" = technical (coaching is the context, Python is the subject)
- "Learn Spanish" = language
- "Business Spanish" = language (still primarily language learning)
- "Communication for Engineers" = soft_skills (soft skill applied to technical context)

Respond with ONLY valid JSON:
{
  "primaryType": "the main category",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why this classification",
  "secondaryType": "optional secondary category if hybrid",
  "secondaryConfidence": 0.0-1.0,
  "isHybrid": true/false,
  "suggestedApproach": "how to structure this course",
  "keyElements": ["element1", "element2", "element3"]
}`;

    try {
      const result = await this.toolRegistry.execute('llm-completion', {
        prompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.3,
        maxTokens: 500,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'course_classification',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                primaryType: { 
                  type: 'string', 
                  enum: ['language', 'soft_skills', 'technical', 'academic', 'creative', 'general'] 
                },
                confidence: { type: 'number' },
                reasoning: { type: 'string' },
                secondaryType: { 
                  type: 'string', 
                  enum: ['language', 'soft_skills', 'technical', 'academic', 'creative', 'general', 'none']
                },
                secondaryConfidence: { type: 'number' },
                isHybrid: { type: 'boolean' },
                suggestedApproach: { type: 'string' },
                keyElements: { type: 'array', items: { type: 'string' } }
              },
              required: ['primaryType', 'confidence', 'reasoning', 'isHybrid', 'suggestedApproach', 'keyElements']
            }
          }
        }
      }, { sessionId: 'course-type-detection', startTime: Date.now() });

      if (result?.success && result?.data) {
        const classification = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        
        console.log(`🎯 CourseTypeDetector: LLM classified "${subject}" as ${classification.primaryType} (${(classification.confidence * 100).toFixed(0)}% confidence)`);
        console.log(`   Reasoning: ${classification.reasoning}`);
        
        return {
          primaryType: classification.primaryType as CourseType,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          secondaryType: classification.secondaryType !== 'none' ? classification.secondaryType as CourseType : undefined,
          secondaryConfidence: classification.secondaryConfidence,
          isHybrid: classification.isHybrid,
          suggestedApproach: classification.suggestedApproach,
          keyElements: classification.keyElements || []
        };
      }
    } catch (error) {
      console.error('❌ CourseTypeDetector: LLM classification failed, using fallback:', error);
    }

    // Fallback to simple heuristic if LLM fails
    return this.fallbackClassification(subject);
  }

  /**
   * Fallback classification using simple heuristics (only used if LLM fails)
   */
  private static fallbackClassification(subject: string): ClassificationResult {
    const subjectLower = subject.toLowerCase();
    
    // Simple keyword matching as last resort
    if (/arabic|spanish|french|german|japanese|chinese|korean|russian|italian|portuguese|hindi|alphabet|vocabulary|pronunciation|grammar|conjugation/i.test(subjectLower)) {
      return {
        primaryType: 'language',
        confidence: 0.7,
        reasoning: 'Fallback: Detected language learning keywords',
        isHybrid: false,
        suggestedApproach: 'Standard language learning with vocabulary and grammar',
        keyElements: ['vocabulary', 'grammar', 'pronunciation']
      };
    }
    
    if (/leadership|coaching|communication|teamwork|emotional intelligence|conflict|negotiation|presentation|management|mentoring|soft skill/i.test(subjectLower)) {
      return {
        primaryType: 'soft_skills',
        confidence: 0.7,
        reasoning: 'Fallback: Detected soft skills keywords',
        isHybrid: false,
        suggestedApproach: 'Focus on scenarios, frameworks, and practical application',
        keyElements: ['framework', 'scenarios', 'practice']
      };
    }
    
    if (/programming|coding|software|development|javascript|python|java|react|database|api|machine learning|data science/i.test(subjectLower)) {
      return {
        primaryType: 'technical',
        confidence: 0.7,
        reasoning: 'Fallback: Detected technical/programming keywords',
        isHybrid: false,
        suggestedApproach: 'Code examples with hands-on exercises',
        keyElements: ['code', 'examples', 'exercises']
      };
    }
    
    // Default to general
    return {
      primaryType: 'general',
      confidence: 0.5,
      reasoning: 'Fallback: No specific category detected',
      isHybrid: false,
      suggestedApproach: 'Mixed approach with concepts and examples',
      keyElements: ['concepts', 'examples', 'practice']
    };
  }

  /**
   * Get full configuration for a course type
   */
  static getConfig(classification: ClassificationResult): CourseTypeConfig {
    const baseConfig = COURSE_TYPE_CONFIGS[classification.primaryType];
    
    return {
      type: classification.primaryType,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      ...baseConfig,
      secondaryType: classification.secondaryType,
      hybridElements: classification.isHybrid && classification.secondaryType 
        ? COURSE_TYPE_CONFIGS[classification.secondaryType].chunkTypes.slice(0, 2)
        : undefined
    };
  }

  /**
   * Main entry point: Classify and get config in one call
   */
  static async detectAndGetConfig(subject: string, additionalContext?: string): Promise<CourseTypeConfig> {
    const classification = await this.classifyWithLLM(subject, additionalContext);
    return this.getConfig(classification);
  }

  /**
   * Quick sync check for course type (for UI hints before full classification)
   * Uses simple heuristics - NOT for final classification
   */
  static quickCheck(subject: string): { likelyType: CourseType; needsLLM: boolean } {
    const subjectLower = subject.toLowerCase();
    
    // Clear language indicators
    if (/^(learn|study|beginner|intermediate|advanced)\s+(arabic|spanish|french|german|japanese|chinese|korean|russian)/i.test(subject)) {
      return { likelyType: 'language', needsLLM: false };
    }
    
    // Ambiguous - needs LLM
    if (/coaching|communication|leadership/i.test(subjectLower)) {
      return { likelyType: 'soft_skills', needsLLM: true };
    }
    
    // Default: needs LLM classification
    return { likelyType: 'general', needsLLM: true };
  }
}

export default CourseTypeDetector;
