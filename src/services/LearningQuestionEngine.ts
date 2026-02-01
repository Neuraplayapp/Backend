// Learning Question Engine - Adaptive Question Generation & Evaluation
import { serviceContainer } from './ServiceContainer';
import { getLanguageInstruction, getCurrentLanguageName, getFullLanguageContext } from '../utils/languageUtils';
import type {
  Question,
  QuestionType,
  DifficultyLevel,
  EvaluationResult,
  UserResponse
} from '../types/LearningModule.types';

export class LearningQuestionEngine {
  private toolRegistry: any = null;

  /**
   * Initialize the question engine
   */
  async initialize() {
    try {
      await serviceContainer.waitForReady();
      this.toolRegistry = await serviceContainer.getAsync('toolRegistry');
      console.log('✅ LearningQuestionEngine initialized');
    } catch (error) {
      console.error('❌ Failed to initialize LearningQuestionEngine:', error);
    }
  }

  /**
   * Generate assessment questions for a subject
   */
  async generateAssessmentQuestions(
    moduleId: string,
    subject: string,
    userLevel: DifficultyLevel = 'beginner',
    count: number = 5,
    userContext?: string
  ): Promise<Question[]> {
    if (!this.toolRegistry) {
      await this.initialize();
    }

    try {
      const prompt = this.buildQuestionGenerationPrompt(subject, userLevel, count, userContext);
      
      console.log('🎓 Generating assessment questions for:', subject, userContext ? '(with user context)' : '');
      
      const response = await this.toolRegistry.execute('llm-completion', {
        prompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.7,
        maxTokens: 2000
      }, {});

      // Handle different response structures
      let responseText: string;
      if (response && typeof response === 'object') {
        // Handle {success: true, data: {...}} structure
        if (response.success && response.data) {
          // 🎯 FIX: Check for array format FIRST (Fireworks returns [{generated_text: "..."}])
          if (Array.isArray(response.data) && response.data.length > 0) {
            const firstItem = response.data[0];
            responseText = firstItem.generated_text || firstItem.content || firstItem.text || firstItem.message || '';
            console.log('🔍 LearningQuestionEngine: Extracted from array format, generated_text length:', responseText?.length);
          }
          // Then check for standard CoreTools format
          else {
            responseText = response.data.completion || response.data.response || response.data.text || response.data.content || response.data.generated_text;
          }
          
          // Last resort: stringify the data object (but log warning)
          if (!responseText) {
            console.warn('⚠️ LearningQuestionEngine: Could not find response text, stringifying data');
            responseText = JSON.stringify(response.data);
          }
        }
        // Handle {response: "..."} structure
        else if (response.response) {
          responseText = response.response;
        }
        // Handle {completion: "..."} structure
        else if (response.completion) {
          responseText = response.completion;
        }
        // Handle direct text response
        else if (typeof response === 'string') {
          responseText = response;
        }
        else {
          console.error('Invalid response structure from LLM:', response);
          console.log('Response keys:', Object.keys(response));
          throw new Error('Invalid response from AI service');
        }
      } else if (typeof response === 'string') {
        responseText = response;
      } else {
        console.error('Invalid response from LLM:', response);
        throw new Error('Invalid response from AI service');
      }
      
      // CRITICAL FIX: Check if response is STILL double-wrapped (happens with some tool implementations)
      // If responseText looks like {"success":true,"data":{"completion":"..."}}
      if (responseText && responseText.trim().startsWith('{"success"')) {
        try {
          const parsed = JSON.parse(responseText);
          if (parsed.success && parsed.data && parsed.data.completion) {
            responseText = parsed.data.completion;
            console.log('🔧 Unwrapped double-nested response structure');
          }
        } catch (e) {
          // Not double-wrapped or invalid JSON, continue with original
        }
      }
      
      console.log('🔍 Extracted response text (first 200 chars):', responseText?.substring(0, 200));

      const questions = this.parseQuestionsFromResponse(responseText, moduleId, subject);
      
      console.log(`✅ Generated ${questions.length} questions for ${subject}`);
      return questions;
      
    } catch (error) {
      console.error('❌ Failed to generate questions:', error);
      // Return fallback questions
      return this.getFallbackQuestions(moduleId, subject, userLevel);
    }
  }

  /**
   * Evaluate user response to a question
   */
  async evaluateUserResponse(
    question: Question,
    userAnswer: string
  ): Promise<EvaluationResult> {
    // For multiple choice, check directly
    if (question.type === 'multiple_choice' && question.options) {
      const selectedOption = question.options.find(opt => opt.text === userAnswer);
      const isCorrect = selectedOption?.isCorrect === true;
      
      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        feedback: isCorrect 
          ? '✅ Correct! ' + (question.explanation || 'Great job!')
          : '❌ Not quite. ' + (question.explanation || 'Try again!'),
        conceptUnderstanding: isCorrect ? 100 : 30,
        needsReinforcement: !isCorrect
      };
    }

    // For open-ended questions, use AI evaluation
    return await this.evaluateWithAI(question, userAnswer);
  }

  /**
   * Use AI to evaluate open-ended responses
   */
  private async evaluateWithAI(
    question: Question,
    userAnswer: string
  ): Promise<EvaluationResult> {
    if (!this.toolRegistry) {
      await this.initialize();
    }

    try {
      const prompt = `Evaluate this answer to a learning question with FLEXIBLE matching:

Question: ${question.text}
Expected Answer: ${question.correctAnswer || 'N/A'}
Student's Answer: "${userAnswer}"

CRITICAL EVALUATION RULES:
- Accept different spellings, transliterations, or phrasings if meaning is correct
- "assalamu alaykum" = "as-salamu alaykum" = "السلام عليكم" (all correct)
- Focus on SEMANTIC correctness, not exact character matching
- Accept abbreviations, casual forms, and variations
- Be lenient with whitespace, punctuation, and capitalization

Provide:
1. Is it semantically correct? (yes/no)
2. Score (0-100, be generous if close)
3. Brief encouraging feedback (2-3 sentences)
4. Does it show understanding? (yes/no)

Return ONLY valid JSON:
{
  "isCorrect": boolean,
  "score": number,
  "feedback": "string",
  "showsUnderstanding": boolean
}`;

      const response = await this.toolRegistry.execute('llm-completion', {
        prompt: `Return ONLY valid JSON with no explanations or reasoning.\n\n${prompt}`,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.0, // CRITICAL: temp 0.0 = no reasoning tokens
        maxTokens: 300
      }, {});

      // Handle different response structures
      let responseText: string;
      if (response && typeof response === 'object') {
        if (response.success && response.data) {
          // CRITICAL: Check for 'completion' field FIRST
          responseText = response.data.completion || response.data.response || response.data.text || response.data.content || JSON.stringify(response.data);
        } else if (response.response) {
          responseText = response.response;
        } else if (response.completion) {
          responseText = response.completion;
        } else if (typeof response === 'string') {
          responseText = response;
        } else {
          console.error('Invalid evaluation response structure from LLM:', response);
          throw new Error('Invalid response from AI service');
        }
      } else {
        console.error('Invalid evaluation response from LLM:', response);
        throw new Error('Invalid response from AI service');
      }

      // CRITICAL FIX: Check if response is STILL double-wrapped
      if (responseText && responseText.trim().startsWith('{"success"')) {
        try {
          const parsed = JSON.parse(responseText);
          if (parsed.success && parsed.data && parsed.data.completion) {
            responseText = parsed.data.completion;
            console.log('🔧 Unwrapped double-nested evaluation response');
          }
        } catch (e) {
          // Not double-wrapped or invalid JSON, continue with original
        }
      }

      const evaluation = this.parseEvaluationResponse(responseText);
      
      return {
        isCorrect: evaluation.isCorrect,
        score: evaluation.score,
        feedback: evaluation.feedback,
        conceptUnderstanding: evaluation.score,
        needsReinforcement: !evaluation.showsUnderstanding
      };
      
    } catch (error) {
      console.error('❌ AI evaluation failed, using flexible fallback:', error);
      
      // IMPROVED FALLBACK: Flexible string matching for ANY subject
      const userLower = userAnswer.toLowerCase().trim().replace(/[^\w\s]/g, '');
      const correctLower = (question.correctAnswer || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
      
      // Check if answers are semantically similar (contains key words)
      const userWords = userLower.split(/\s+/);
      const correctWords = correctLower.split(/\s+/);
      const matchingWords = userWords.filter(word => 
        correctWords.some(correctWord => 
          correctWord.includes(word) || word.includes(correctWord) || 
          this.areSimilar(word, correctWord)
        )
      );
      
      const similarity = matchingWords.length / Math.max(correctWords.length, 1);
      const isCorrect = similarity >= 0.5; // 50% word overlap = correct
      const score = Math.round(similarity * 100);
      
      console.warn(`⚠️ Using fallback evaluation: similarity=${similarity.toFixed(2)}, correct=${isCorrect}`);
      
      return {
        isCorrect,
        score: Math.max(score, 30), // Minimum 30 points for trying
        feedback: isCorrect 
          ? `✅ Good! Your answer shows understanding of the concept.`
          : `Keep practicing! The expected answer was: "${question.correctAnswer}"`,
        conceptUnderstanding: score,
        needsReinforcement: !isCorrect
      };
    }
  }
  
  /**
   * Check if two words are similar (for fallback evaluation)
   */
  private areSimilar(word1: string, word2: string): boolean {
    // Handle common transliteration variations
    const normalize = (w: string) => w
      .replace(/[áàâä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/['-]/g, ''); // Remove hyphens and apostrophes
    
    const n1 = normalize(word1);
    const n2 = normalize(word2);
    
    // Exact match after normalization
    if (n1 === n2) return true;
    
    // One contains the other (for abbreviations)
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Levenshtein distance < 2 (allows 1-2 char difference)
    return this.levenshteinDistance(n1, n2) <= 2;
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Adjust difficulty based on performance
   */
  adjustDifficultyLevel(responses: UserResponse[]): DifficultyLevel {
    if (responses.length < 3) return 'beginner';

    const recentResponses = responses.slice(-5);
    const accuracy = recentResponses.filter(r => r.isCorrect).length / recentResponses.length;

    if (accuracy >= 0.8) return 'advanced';
    if (accuracy >= 0.6) return 'intermediate';
    return 'beginner';
  }

  /**
   * Extract cognitive insights from responses
   */
  extractCognitiveInsights(responses: UserResponse[]) {
    const conceptScores: Record<string, number[]> = {};
    
    responses.forEach(response => {
      if (!conceptScores[response.concept]) {
        conceptScores[response.concept] = [];
      }
      conceptScores[response.concept].push(response.isCorrect ? 100 : 0);
    });

    const conceptUnderstanding: Record<string, number> = {};
    const knowledgeGaps: string[] = [];
    const strengthAreas: string[] = [];

    Object.entries(conceptScores).forEach(([concept, scores]) => {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      conceptUnderstanding[concept] = Math.round(avgScore);
      
      if (avgScore < 60) knowledgeGaps.push(concept);
      if (avgScore >= 80) strengthAreas.push(concept);
    });

    return {
      conceptUnderstanding,
      knowledgeGaps,
      strengthAreas
    };
  }

  /**
   * Build prompt for question generation
   * 🎯 CRITICAL: Questions MUST match the selected difficulty level exactly
   */
  private buildQuestionGenerationPrompt(
    subject: string,
    level: DifficultyLevel,
    count: number,
    userContext?: string
  ): string {
    // Get user's preferred language for content generation
    const languageContext = getFullLanguageContext();
    const languageName = languageContext.name;
    
    // Check if this is a language learning subject
    const isLanguageSubject = /arabic|russian|chinese|japanese|korean|spanish|french|german|italian|portuguese|hindi|hebrew|turkish|vietnamese|thai|greek|polish|dutch|swedish|norwegian|danish|finnish/i.test(subject);
    
    // 🎯 STRICT DIFFICULTY DEFINITIONS - Questions MUST match the selected level
    const difficultyRules: Record<DifficultyLevel, string> = {
      'beginner': `
BEGINNER LEVEL - STRICTLY ENFORCED:
- Test ONLY the absolute basics (alphabet, numbers 1-10, basic greetings)
- Questions must be answerable by someone with ZERO prior knowledge
- Multiple choice ONLY - no open-ended questions for beginners
- ${isLanguageSubject ? 'MANDATORY: Include romanized transliteration for EVERY non-Latin word. Example: مرحبا (marhaba)' : 'Use simple, everyday vocabulary'}
- Example beginner questions:
  * "What does مرحبا (marhaba) mean?" → Hello
  * "Which letter comes first in the alphabet?"
  * "Match the word to its meaning"
- DO NOT ask about grammar rules, verb conjugations, or sentence structure
- DO NOT use complex vocabulary or idioms`,

      'intermediate': `
INTERMEDIATE LEVEL - STRICTLY ENFORCED:
- Test vocabulary, basic grammar patterns, simple sentence construction
- Assume learner knows the alphabet and basic greetings
- Mix of multiple choice and simple short answer
- ${isLanguageSubject ? 'Include transliteration for complex words, but not for common ones already learned' : 'Use moderately complex vocabulary'}
- Example intermediate questions:
  * "How do you say 'I want to go to the store' in [language]?"
  * "What is the correct verb form for..."
  * "Complete this sentence: ..."
- CAN ask about basic grammar (present tense, simple past)
- DO NOT ask about advanced grammar or nuanced expressions`,

      'advanced': `
ADVANCED LEVEL - STRICTLY ENFORCED:
- Test complex grammar, idioms, nuanced expressions, cultural context
- Assume solid foundation in vocabulary and grammar
- Include open-ended questions requiring constructed responses
- ${isLanguageSubject ? 'Minimal transliteration - only for rare/technical terms' : 'Use sophisticated vocabulary and complex concepts'}
- Example advanced questions:
  * "Explain the difference between these two similar expressions..."
  * "How would you formally request... while showing respect?"
  * "What cultural context explains this idiom?"
- CAN ask about subjunctive, conditional, all tenses
- CAN ask about regional variations and formal/informal registers`
    };

    // Build context-aware learner description
    const learnerContext = userContext 
      ? `The learner says: "${userContext}". However, STRICTLY follow the ${level.toUpperCase()} difficulty rules below.`
      : '';

    // Language instruction for content generation
    const contentLanguageNote = languageContext.code !== 'en' 
      ? `\n\nLANGUAGE REQUIREMENT: Write ALL question text, options, explanations in ${languageName}.`
      : '';

    return `Generate ${count} ${level.toUpperCase()}-level assessment questions for ${subject}.

⚠️ CRITICAL: These are ${level.toUpperCase()} questions. Follow the rules EXACTLY:
${difficultyRules[level]}

${learnerContext}
${contentLanguageNote}

Return ONLY a valid JSON array. No markdown, no explanations.

FORMAT:
[{"type":"multiple_choice","text":"Question?","options":[{"text":"A","isCorrect":true},{"text":"B","isCorrect":false},{"text":"C","isCorrect":false},{"text":"D","isCorrect":false}],"concept":"Concept","explanation":"Why this is correct."}]

RULES:
- Straight quotes " only
- true/false as booleans
- No trailing commas
- Return ONLY the JSON array
${level === 'beginner' ? '- BEGINNER = multiple_choice ONLY, with transliteration for all non-Latin text' : ''}`;
  }

  /**
   * Parse questions from AI response with robust error handling
   */
  private parseQuestionsFromResponse(
    response: string,
    moduleId: string,
    subject: string
  ): Question[] {
    try {
      // Validate response is a string
      if (typeof response !== 'string' || !response) {
        console.warn('Invalid response type or empty response');
        return [];
      }

      // Step 1: Aggressive Unicode normalization
      let cleanedResponse = response.trim()
        // Normalize all Unicode dashes to ASCII hyphen
        .replace(/[\u2010-\u2015\u2212\u2013\u2014]/g, '-')
        // Normalize all quote types to ASCII
        .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
        .replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4]/g, "'")
        // Remove invisible characters
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
        // Normalize ellipsis and other punctuation
        .replace(/\u2026/g, '...')
        .replace(/[\u2022\u2023\u2043]/g, '-');

      // Step 2: Remove markdown code blocks
      cleanedResponse = cleanedResponse
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

      // Step 3: Handle double-stringified JSON
      if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
        try {
          cleanedResponse = JSON.parse(cleanedResponse);
        } catch (e) {
          // Not double-stringified, continue
        }
      }

      // Step 4: Extract JSON array
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in response');
        console.log('Response preview:', cleanedResponse.substring(0, 200));
        return [];
      }

      let jsonString = jsonMatch[0];

      // Step 5: Clean common JSON issues
      jsonString = jsonString
        // Fix truncated booleans (isCorrect: fal -> isCorrect: false)
        .replace(/:(\s*)(fal)([,\s\}])/gi, ':$1false$3')
        .replace(/:(\s*)(tru)([,\s\}])/gi, ':$1true$3')
        // Remove trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix unquoted property names
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3')
        // Ensure boolean values are not quoted
        .replace(/"(true|false)"/gi, (_, b) => b.toLowerCase());

      // Step 6: Try parsing with multiple strategies
      let questionsData: any[] = [];
      
      try {
        questionsData = JSON.parse(jsonString);
        console.log('✅ Direct JSON parse succeeded');
      } catch (parseError1) {
        console.warn('Direct parse failed, trying reconstruction...');
        
        // Strategy 2: Reconstruct by extracting question patterns
        questionsData = this.reconstructQuestionsFromText(jsonString, subject);
        
        if (questionsData.length === 0) {
          console.error('All parsing strategies failed');
          return [];
        }
      }

      // Validate and map to Question type
      if (!Array.isArray(questionsData)) {
        console.error('Parsed data is not an array');
        return [];
      }

      return questionsData
        .filter((q: any) => q && q.text && q.type)
        .map((q: any, index: number): Question => ({
          id: `${moduleId}_q${index + 1}`,
          type: (q.type === 'multiple_choice' ? 'multiple_choice' : 'short_answer') as QuestionType,
          text: String(q.text || ''),
          options: Array.isArray(q.options) ? q.options.map((opt: any, optIndex: number) => ({
            id: `${moduleId}_q${index + 1}_opt${optIndex}`,
            text: String(opt.text || opt || ''),
            isCorrect: Boolean(opt.isCorrect)
          })) : undefined,
          correctAnswer: q.correctAnswer ? String(q.correctAnswer) : undefined,
          concept: String(q.concept || subject),
          difficulty: 'intermediate' as DifficultyLevel,
          explanation: q.explanation ? String(q.explanation) : undefined
        }));

    } catch (error) {
      console.error('Failed to parse questions:', error);
      return [];
    }
  }

  /**
   * Reconstruct questions from malformed JSON text
   */
  private reconstructQuestionsFromText(text: string, subject: string): any[] {
    const questions: any[] = [];
    
    try {
      // Pattern 1: Find complete question objects
      const questionPattern = /"type"\s*:\s*"(multiple_choice|short_answer)"[\s\S]*?"text"\s*:\s*"([^"]+)"[\s\S]*?(?="type"|$)/g;
      let match;
      
      while ((match = questionPattern.exec(text)) !== null) {
        const type = match[1];
        const questionText = match[2];
        
        // Extract options for multiple choice
        const optionsMatch = match[0].match(/"options"\s*:\s*\[([\s\S]*?)\]/);
        let options: any[] = [];
        
        if (optionsMatch) {
          const optionPattern = /"text"\s*:\s*"([^"]+)"[\s\S]*?"isCorrect"\s*:\s*(true|false)/g;
          let optMatch;
          while ((optMatch = optionPattern.exec(optionsMatch[1])) !== null) {
            options.push({
              text: optMatch[1],
              isCorrect: optMatch[2] === 'true'
            });
          }
        }
        
        // Extract other fields
        const conceptMatch = match[0].match(/"concept"\s*:\s*"([^"]+)"/);
        const explanationMatch = match[0].match(/"explanation"\s*:\s*"([^"]+)"/);
        const correctAnswerMatch = match[0].match(/"correctAnswer"\s*:\s*"([^"]+)"/);
        
        questions.push({
          type,
          text: questionText,
          options: options.length > 0 ? options : undefined,
          concept: conceptMatch ? conceptMatch[1] : subject,
          explanation: explanationMatch ? explanationMatch[1] : undefined,
          correctAnswer: correctAnswerMatch ? correctAnswerMatch[1] : undefined
        });
      }
      
      console.log(`✅ Reconstructed ${questions.length} questions from malformed JSON`);
    } catch (e) {
      console.error('Reconstruction failed:', e);
    }
    
    return questions;
  }


  /**
   * Parse evaluation response from AI
   */
  private parseEvaluationResponse(response: string): any {
    try {
      // Validate response is a string
      if (typeof response !== 'string' || !response) {
        console.warn('Invalid evaluation response type or empty');
        throw new Error('Invalid response');
      }

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse evaluation:', error);
    }

    // Fallback parsing
    const fallbackResponse = typeof response === 'string' ? response : '';
    return {
      isCorrect: fallbackResponse.toLowerCase().includes('correct'),
      score: 50,
      feedback: fallbackResponse.substring(0, 200) || 'Unable to evaluate response.',
      showsUnderstanding: fallbackResponse.toLowerCase().includes('understand')
    };
  }

  /**
   * Fallback questions when AI generation fails
   */
  private getFallbackQuestions(
    moduleId: string,
    subject: string,
    level: DifficultyLevel
  ): Question[] {
    // Provide basic fallback questions
    return [
      {
        id: `${moduleId}_fallback_1`,
        type: 'multiple_choice',
        text: `What would you like to learn about ${subject}?`,
        options: [
          { id: '1', text: 'Basic concepts and fundamentals', isCorrect: true },
          { id: '2', text: 'Advanced techniques', isCorrect: false },
          { id: '3', text: 'Practical applications', isCorrect: false },
          { id: '4', text: 'All of the above', isCorrect: false }
        ],
        concept: 'Learning Preferences',
        difficulty: level,
        explanation: 'Understanding your learning goals helps us personalize the content.'
      },
      {
        id: `${moduleId}_fallback_2`,
        type: 'short_answer',
        text: `What do you already know about ${subject}?`,
        correctAnswer: 'Any answer is acceptable',
        concept: 'Prior Knowledge',
        difficulty: level,
        explanation: 'Assessing your current knowledge helps us start at the right level.'
      }
    ];
  }
}

// Export singleton instance
export const learningQuestionEngine = new LearningQuestionEngine();

