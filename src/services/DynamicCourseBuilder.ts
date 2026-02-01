// Dynamic Course Builder - AI-Powered Fully Generative Course System
// Generates complete courses with grid-based steps and AI-generated images
// NOW WITH: Modular course type detection and type-specific generation pipelines
import { serviceContainer } from './ServiceContainer';
import { getLanguageInstruction, getCurrentLanguageName, getFullLanguageContext } from '../utils/languageUtils';
import { MEMORY_CATEGORIES } from './MemoryCategoryRegistry';
import { CourseTypeDetector, type CourseTypeConfig } from './CourseTypeDetector';
import type {
  GeneratedCourse,
  CourseSection,
  CourseChunk,
  DifficultyLevel,
  ContentType,
  UserResponse,
  CognitiveMarkers,
  GenerativeLearningModuleData,
  CourseProgressDetail
} from '../types/LearningModule.types';

// System context type for LLM guidance
interface SystemContext {
  focusAreas?: string[];
  teachingApproach?: string;
  culturalContext?: string;
  specialInstructions?: string;
}

interface CourseStep {
  stepNumber: number;
  title: string;
  description: string;
  content: string;
  keyPoints: string[];
  type: CourseSection['type'];
  estimatedMinutes: number;
  imagePrompt?: string;
  needsImage: boolean;
}

interface GeneratedCourseStructure {
  courseTitle: string;
  courseDescription: string;
  steps: CourseStep[];
  targetedConcepts: string[];
  competencies?: Array<{
    id: string;
    name: string;
    indicators: string[];
    masteryThreshold: number;
  }>;
}

// 🔤 ALPHABET DEFINITIONS - For validation of complete alphabet generation
const ALPHABET_SIZES: Record<string, { minLetters: number; maxLetters: number; name: string }> = {
  'arabic': { minLetters: 28, maxLetters: 32, name: 'Arabic' },
  'hebrew': { minLetters: 22, maxLetters: 27, name: 'Hebrew' },
  'russian': { minLetters: 33, maxLetters: 33, name: 'Russian Cyrillic' },
  'greek': { minLetters: 24, maxLetters: 24, name: 'Greek' },
  'japanese': { minLetters: 46, maxLetters: 51, name: 'Japanese Hiragana' },
  'korean': { minLetters: 40, maxLetters: 51, name: 'Korean Hangul' },
  'thai': { minLetters: 44, maxLetters: 77, name: 'Thai' },
  'hindi': { minLetters: 46, maxLetters: 52, name: 'Hindi Devanagari' },
  'chinese': { minLetters: 100, maxLetters: 500, name: 'Chinese (basic characters)' },
  'latin': { minLetters: 23, maxLetters: 26, name: 'Latin' },
  'spanish': { minLetters: 27, maxLetters: 30, name: 'Spanish' },
  'french': { minLetters: 26, maxLetters: 42, name: 'French (with accents)' },
  'german': { minLetters: 26, maxLetters: 30, name: 'German' },
  'italian': { minLetters: 21, maxLetters: 26, name: 'Italian' },
  'portuguese': { minLetters: 26, maxLetters: 39, name: 'Portuguese' },
  'kazakh': { minLetters: 42, maxLetters: 42, name: 'Kazakh Cyrillic' },
  'turkish': { minLetters: 29, maxLetters: 29, name: 'Turkish' },
  'vietnamese': { minLetters: 29, maxLetters: 89, name: 'Vietnamese' },
  'default': { minLetters: 20, maxLetters: 50, name: 'Standard' }
};

export class DynamicCourseBuilder {
  private toolRegistry: any = null;

  /**
   * Initialize the course builder
   */
  async initialize() {
    try {
      await serviceContainer.waitForReady();
      this.toolRegistry = await serviceContainer.getAsync('toolRegistry');
      console.log('✅ DynamicCourseBuilder initialized');
    } catch (error) {
      console.error('❌ Failed to initialize DynamicCourseBuilder:', error);
    }
  }

  // 🚀 PROGRESSIVE GENERATION: Callbacks for real-time UI updates
  private progressCallbacks: Map<string, (course: GeneratedCourse, sectionIndex: number) => void> = new Map();

  /**
   * Register a callback to receive section-by-section updates during progressive generation
   */
  onSectionReady(moduleId: string, callback: (course: GeneratedCourse, sectionIndex: number) => void): void {
    this.progressCallbacks.set(moduleId, callback);
  }

  /**
   * Remove progress callback
   */
  removeProgressCallback(moduleId: string): void {
    this.progressCallbacks.delete(moduleId);
  }

  /**
   * 🚀 PROGRESSIVE COURSE GENERATION - 80% faster perceived load time
   * 
   * Flow:
   * 1. Generate structure → Return IMMEDIATELY with locked skeleton
   * 2. Generate Section 1 → Unlock, user starts learning
   * 3. Background: Generate sections 2-N → Unlock each as ready
   * 
   * @param onProgress Optional callback for real-time section updates
   */
  async generateCourse(
    moduleId: string,
    subject: string,
    userResponses: UserResponse[],
    cognitiveMarkers: CognitiveMarkers,
    preferredContentType: ContentType = 'textual',
    userContext?: string,
    systemContext?: SystemContext,
    onProgress?: (course: GeneratedCourse, readySectionIndex: number) => void,
    selectedLevel: DifficultyLevel = 'beginner' // 🎯 User's selected difficulty
  ): Promise<GeneratedCourse> {
    if (!this.toolRegistry) {
      await this.initialize();
    }

    // Determine user level based on assessment performance AND selected level
    // 🎯 RESTRICTIVE: Can only upgrade +1 level from selection, requires near-perfect score
    const userLevel = this.determineUserLevel(userResponses, selectedLevel);
    console.log(`🎯 Selected: ${selectedLevel} → Final: ${userLevel} (based on ${userResponses.length} responses)`);

    try {
      console.log('🚀 PROGRESSIVE GENERATION: Starting fast course generation for:', subject);
      console.log('📊 User level determined:', userLevel);
      if (systemContext) {
        console.log('📋 Using system context guidance:', systemContext.focusAreas?.join(', ') || 'general');
      }
      
      // 🎯 PHASE 0: Classify course type using LLM (intelligent detection)
      console.log('🔍 Phase 0: Classifying course type with LLM...');
      const classificationStartTime = Date.now();
      const courseTypeConfig = await CourseTypeDetector.detectAndGetConfig(subject, userContext);
      console.log(`✅ Phase 0 complete in ${Date.now() - classificationStartTime}ms`);
      console.log(`   Course type: ${courseTypeConfig.type} (${(courseTypeConfig.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`   Reasoning: ${courseTypeConfig.reasoning}`);
      console.log(`   Content style: ${courseTypeConfig.contentStyle}, Quiz style: ${courseTypeConfig.quizStyle}`);
      
      // Store config for use in subsequent phases
      (this as any).currentCourseTypeConfig = courseTypeConfig;
      
      // ⚡ PHASE 1: Generate course structure ONLY (fast - ~3-5 seconds)
      console.log('📝 Phase 1: Generating course structure (skeleton)...');
      const structureStartTime = Date.now();
      const courseStructure = await this.generateCourseStructure(
        subject,
        userLevel,
        cognitiveMarkers,
        preferredContentType,
        userContext,
        systemContext
      );
      console.log(`✅ Phase 1 complete in ${Date.now() - structureStartTime}ms - Structure ready with ${courseStructure.steps.length} sections`);

      // ⚡ PHASE 2: Validate ONLY Section 1 content (fast - ~2-3 seconds)
      // Other sections validated in background while user learns Section 1
      console.log('🔍 Phase 2: Validating Section 1 content ONLY...');
      const section1Validated = await this.validateAndExpandContent(
        [courseStructure.steps[0]], // ONLY Section 1!
        subject,
        userLevel,
        userContext
      );
      
      // Keep remaining steps unvalidated for now - they'll be validated in background
      const remainingStepsRaw = courseStructure.steps.slice(1);

      // ⚡ PHASE 3: Generate Section 1 chunks AND section images IN PARALLEL
      // User sees skeleton with images immediately, Section 1 unlocks first
      console.log('🧩 Phase 3: Generating Section 1 chunks + section images (parallel)...');
      const section1StartTime = Date.now();
      
      // 🖼️ Generate section thumbnail images for ALL sections in parallel (non-blocking)
      // These appear on locked sections so user sees visual skeleton while waiting
      const sectionImagesPromise = this.generateSectionThumbnails(courseStructure.steps, subject);
      
      // Generate Section 1 chunks (this is the critical path)
      const section1WithChunks = await this.generateChunksForSingleSection(
        section1Validated[0],
        subject,
        userLevel,
        0 // section index
      );
      
      // Await section images (should complete around same time as chunks)
      const sectionImages = await sectionImagesPromise;
      console.log(`✅ Phase 3 complete in ${Date.now() - section1StartTime}ms - Section 1 ready, ${Object.keys(sectionImages).length} images generated`);

      // Build combined steps array: Section 1 validated, others raw (for display skeleton)
      const allSteps = [section1Validated[0], ...remainingStepsRaw];
      
      // Build initial course with Section 1 ready, others as skeletons WITH IMAGES
      // 🎯 CRITICAL: NO visible loading states - all sections appear ready
      const sectionsWithChunks = allSteps.map((step, index) => {
        if (index === 0) {
          return {
            ...section1WithChunks,
            imageUrl: sectionImages[index] // Add image to Section 1 too
          };
        }
        // Other sections: skeleton with images - NO loading indicators!
        // Chunks will be generated in background, UI handles "not ready" gracefully
        return {
          ...step,
          chunks: [], // Empty - will be generated in background
          isGenerating: false, // 🎯 NO loading spinner - appears ready
          isLocked: false,     // 🎯 NO lock - appears accessible
          imageUrl: sectionImages[index] // 🖼️ Skeleton has image!
        };
      });

      // Convert steps to sections - ALL sections appear ready (no loading/locked states)
      const sectionsWithChunkImages = sectionsWithChunks.map((step, index) => {
        const wordCount = step.content?.split(/\s+/).length || 0;
        const dynamicMinutes = Math.max(2, Math.ceil(wordCount / 180));
        
        const section: CourseSection = {
          id: `step_${step.stepNumber}`,
          stepNumber: step.stepNumber,
          title: step.title,
          description: step.description || '', // Required field
          content: step.content,
          type: step.type as CourseSection['type'],
          estimatedMinutes: dynamicMinutes,
          keyPoints: step.keyPoints,
          imageUrl: (step as any).imageUrl, // 🖼️ Now has image from parallel generation
          imagePrompt: step.imagePrompt,
          needsImage: step.needsImage,
          isCompleted: false,
          isLocked: false, // 🎯 ALL sections appear unlocked
          chunks: (step as any).chunks || [],
          isGenerating: false // 🎯 NO loading spinners
        };
        
        return section;
      });

      // Calculate initial totals (Section 1 chunks + estimated for others)
      const section1Chunks = sectionsWithChunkImages[0]?.chunks?.length || 0;
      const estimatedTotalChunks = section1Chunks + (sectionsWithChunkImages.length - 1) * 5; // Estimate 5 chunks per section
      const totalMinutes = sectionsWithChunkImages.reduce((sum, s) => sum + s.estimatedMinutes, 0);

      // Initialize progress tracking
      const progressDetail: CourseProgressDetail = {
        courseId: moduleId,
        courseTitle: courseStructure.courseTitle,
        totalSections: sectionsWithChunkImages.length,
        completedSections: 0,
        totalChunks: estimatedTotalChunks,
        completedChunks: 0,
        currentSection: 0,
        currentChunk: 0,
        sectionProgress: sectionsWithChunkImages.map(s => ({
          sectionId: s.id,
          sectionTitle: s.title,
          sectionType: s.type,
          totalChunks: s.chunks?.length || 5, // Estimate if not generated
          completedChunks: 0,
          chunkProgress: []
        })),
        lastAccessedAt: new Date(),
        totalTimeSpent: 0,
        overallProgress: 0
      };

      const course: GeneratedCourse = {
        moduleId,
        courseTitle: courseStructure.courseTitle,
        courseDescription: courseStructure.courseDescription,
        sections: sectionsWithChunkImages,
        totalEstimatedMinutes: totalMinutes,
        targetedConcepts: courseStructure.targetedConcepts,
        adaptedForLevel: userLevel,
        generatedAt: new Date(),
        progressDetail,
        competencies: courseStructure.competencies || []
      };

      const imageCount = sectionsWithChunkImages.filter(s => s.imageUrl).length;
      console.log(`🚀 PROGRESSIVE: Course skeleton ready with Section 1 (${section1Chunks} chunks), ${imageCount} images. Remaining ${sectionsWithChunkImages.length - 1} sections generating in background...`);
      console.log(`✅ Generated course with ${sectionsWithChunkImages.length} sections, ${section1Chunks} chunks (Section 1), and ${imageCount} images`);
      
      // ⚡ PHASE 4: BACKGROUND GENERATION - Generate remaining sections while user learns
      // This runs AFTER we return the course, so user sees it immediately
      // Pass RAW steps - background will validate + generate chunks for each
      this.generateRemainingSectionsInBackground(
        course,
        remainingStepsRaw, // Sections 2+ (unvalidated - will be validated in background)
        subject,
        userLevel,
        userContext,
        onProgress
      );
      
      return course;

    } catch (error) {
      console.error('❌ Failed to generate course structure:', error);
      
      // Try async fallback with real content generation
      try {
        console.log('🔄 Attempting fallback course generation with real content...');
        return await this.getFallbackCourseWithContent(moduleId, subject, 'beginner');
      } catch (fallbackError) {
        console.error('❌ Fallback generation also failed:', fallbackError);
        // Last resort: return static educational content
        return this.getEmergencyFallbackCourse(moduleId, subject, 'beginner');
      }
    }
  }

  /**
   * Generate the complete course structure using LLM
   */
  private async generateCourseStructure(
    subject: string,
    level: DifficultyLevel,
    cognitiveMarkers: CognitiveMarkers,
    contentType: ContentType,
    userContext?: string,
    systemContext?: SystemContext
  ): Promise<GeneratedCourseStructure> {
    const prompt = this.buildCourseStructurePrompt(subject, level, cognitiveMarkers, contentType, userContext, systemContext);

    const response = await this.toolRegistry.execute('llm-completion', {
      prompt,
      model: 'accounts/fireworks/models/gpt-oss-120b',
      temperature: 0.65,
      maxTokens: 4000
    }, {});

    // Extract response text
    let responseText = this.extractResponseText(response);
    
    // Parse the course structure
    return this.parseCourseStructure(responseText, subject, level);
  }

  /**
   * Build the course structure generation prompt
   * Includes optional systemContext to guide LLM while keeping generation fully dynamic
   */
  private buildCourseStructurePrompt(
    subject: string,
    level: DifficultyLevel,
    cognitiveMarkers: CognitiveMarkers,
    contentType: ContentType,
    userContext?: string,
    systemContext?: SystemContext
  ): string {
    const strengthsText = cognitiveMarkers.strengthAreas.length > 0
      ? `Strengths: ${cognitiveMarkers.strengthAreas.join(', ')}`
      : '';
    
    const gapsText = cognitiveMarkers.knowledgeGaps.length > 0
      ? `Areas needing focus: ${cognitiveMarkers.knowledgeGaps.join(', ')}`
      : '';

    const learnerProfile = userContext 
      ? `The learner describes themselves: "${userContext}"`
      : `Learner level: ${level}`;

    // Build optional system context guidance section
    let systemGuidance = '';
    if (systemContext) {
      const guidanceParts: string[] = [];
      
      if (systemContext.focusAreas && systemContext.focusAreas.length > 0) {
        guidanceParts.push(`KEY FOCUS AREAS: ${systemContext.focusAreas.join(', ')}`);
      }
      
      if (systemContext.teachingApproach) {
        guidanceParts.push(`TEACHING APPROACH: ${systemContext.teachingApproach}`);
      }
      
      if (systemContext.culturalContext) {
        guidanceParts.push(`CULTURAL CONTEXT: ${systemContext.culturalContext}`);
      }
      
      if (systemContext.specialInstructions) {
        guidanceParts.push(`SPECIAL INSTRUCTIONS: ${systemContext.specialInstructions}`);
      }
      
      if (guidanceParts.length > 0) {
        systemGuidance = `\nCOURSE GUIDANCE (use to enhance content while maintaining dynamic generation):\n${guidanceParts.join('\n')}\n`;
      }
    }

    // Get language context for internationalized content generation
    const languageContext = getFullLanguageContext();
    const languageName = languageContext.name;
    const languageInstruction = languageContext.instruction;

    // 🎯 USE LLM-CLASSIFIED COURSE TYPE (from Phase 0)
    // This is set during generateCourse() before this method is called
    const courseTypeConfig: CourseTypeConfig | undefined = (this as any).currentCourseTypeConfig;
    
    // Determine course type from LLM classification (not regex!)
    const isLanguageCourse = courseTypeConfig?.type === 'language';
    const isSoftSkillsCourse = courseTypeConfig?.type === 'soft_skills';
    const isTechnicalCourse = courseTypeConfig?.type === 'technical';
    
    // Use config-based step counts (from LLM classification)
    const minSteps = courseTypeConfig?.minSteps || 4;
    const maxSteps = courseTypeConfig?.maxSteps || 6;
    
    console.log(`📝 Building prompt for ${courseTypeConfig?.type || 'general'} course (${minSteps}-${maxSteps} steps)`);

    // Build language-specific requirements - STRUCTURED CONTENT
    const languageCourseRequirements = isLanguageCourse ? `
LANGUAGE COURSE STRUCTURE (CRITICAL - FOLLOW EXACTLY):

Step 1: INTRODUCTION
- Brief history and why learn this language
- Where it's spoken, number of speakers

Step 2: THE COMPLETE ALPHABET (type: alphabet)
⚠️ MUST include THE ENTIRE ALPHABET as a markdown table:
| Letter | Name | Sound | Example Word |
| أ | Alif | /a/ | أب (ab) = father |
| ب | Ba | /b/ | باب (bab) = door |
... (INCLUDE ALL LETTERS - this is MANDATORY)

Step 3: PRONUNCIATION GUIDE
- Consonant sounds unique to this language
- Vowel system explained
- Common pronunciation mistakes to avoid

Step 4: ESSENTIAL NOUNS (type: vocabulary)
⚠️ MUST be a LIST of 20-30 actual nouns, NOT prose:
### People
| Word | Romanized | Pronunciation | Meaning |
| رجل | rajul | ra-JUL | man |
| امرأة | imra'a | im-RA-a | woman |
### Objects
| كتاب | kitab | ki-TAB | book |
| قلم | qalam | QA-lam | pen |

Step 5: BASIC VERBS (type: vocabulary)
⚠️ MUST be a LIST of 15-20 verbs:
| Verb | Romanized | Pronunciation | Meaning |
| يكتب | yaktub | YAK-tub | to write |
| يقرأ | yaqra' | YAQ-ra | to read |

Step 6-7: GRAMMAR RULES (type: core_concept)
⚠️ MUST be structured rules, NOT flowing text:
### Rule 1: Word Order
- Arabic uses VSO (Verb-Subject-Object) order
- Example: يأكل الولد التفاحة = Eats the-boy the-apple

### Rule 2: Gender Agreement
- All nouns are masculine or feminine
- Adjectives must match the noun gender

Step 8-9: COMMON PHRASES
⚠️ MUST be a LIST of practical phrases:
| Phrase | Romanized | Meaning |
| كيف حالك؟ | kayf halak? | How are you? |
| أنا بخير | ana bikhayr | I am fine |

CRITICAL: NO FLOWING PROSE! USE TABLES AND LISTS ONLY!
` : '';

    // 🎯 NEW: Soft skills course structure
    const softSkillsCourseRequirements = isSoftSkillsCourse ? `
SOFT SKILLS COURSE STRUCTURE (CRITICAL - FOLLOW EXACTLY):

Step 1: HOOK - Why This Matters (type: hook)
- Start with a relatable scenario or challenge
- Connect to real workplace/life situations
- Make it personal and engaging
- End with a thought-provoking question

Step 2: CORE FRAMEWORK (type: concept)
- Present the main model/framework with clear structure
- Use numbered lists for principles (1. First principle, 2. Second principle)
- Define key terms clearly with "**Term** - Definition" format
- Include visual description of the framework

Step 3: KEY SKILLS BREAKDOWN (type: concept)
- List 5-10 specific skills or behaviors
- Each skill should have: Name, Description, Example behavior
- Use bullet points and clear formatting
- No vocabulary tables - use skill cards format instead

Step 4: REAL-WORLD SCENARIOS (type: example)
- Provide 2-3 complete scenarios (NOT cut off!)
- Each scenario must have:
  * **Scenario**: Full situation description (50+ words)
  * **Challenge**: What's the problem?
  * **Solution**: Step-by-step approach
  * **Outcome**: What happens when done right
- NEVER truncate mid-sentence!

Step 5: PRACTICE APPLICATION (type: practice)
- Interactive exercises or reflection questions
- Self-assessment checklist
- Action planning template

Step 6: COMPREHENSION CHECK (type: quiz)
- 5+ scenario-based questions
- Each question must have EXACTLY 4 complete answer options
- Options must be full sentences, not empty or single words
- Focus on application, not memorization

CRITICAL FOR SOFT SKILLS:
- NO vocabulary cards with native/romanized/pronunciation (that's for languages!)
- NO visual gallery placeholders - describe actual concepts
- COMPLETE all scenarios - never cut off mid-sentence
- ALL quiz options must be meaningful (no empty options)
- Use **bold** for key terms, not # headings in flowing text
` : '';

    // SIMPLIFIED PROMPT FOR RELIABLE JSON
    return `Create a course on "${subject}" for ${level} level learners.
${languageInstruction}

${isLanguageCourse ? 'This is a LANGUAGE course. Include: alphabet, vocabulary, pronunciation, grammar, phrases.' : ''}
${isSoftSkillsCourse ? 'This is a SOFT SKILLS / PROFESSIONAL DEVELOPMENT course. Focus on: frameworks, scenarios, behaviors, self-reflection, practical application.' : ''}

Create ${minSteps}-${maxSteps} steps. Return ONLY JSON, no markdown.

CRITICAL: 
- NO newlines inside string values
- NO special quotes - use only regular " quotes
- Keep content SHORT (100 words max per step initially)

JSON FORMAT:
{
  "courseTitle": "Course title here",
  "courseDescription": "Short description",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "description": "Short description",
      "content": "Brief teaching content. Will be expanded later.",
      "keyPoints": ["Point 1", "Point 2"],
      "type": "introduction",
      "estimatedMinutes": 5,
      "imagePrompt": "Image description"
    }
  ],
  "targetedConcepts": ["concept1", "concept2"]
}

STEP TYPES: introduction, core_concept, example, practice, summary${isLanguageCourse ? ', alphabet, vocabulary' : ''}${isSoftSkillsCourse ? ', scenario, framework, assessment, reflection' : ''}

${isLanguageCourse ? `For language courses include these steps:
1. Introduction (type: introduction) - imagePrompt: "Cultural map and landmarks of [language] speaking regions, educational infographic"
2. Alphabet basics (type: alphabet) - imagePrompt: "Beautiful artistic display of [language] alphabet with all characters, calligraphy style"
3. Pronunciation (type: core_concept) - imagePrompt: "Mouth and tongue position diagram for [language] sounds, speech therapy style"
4-5. Vocabulary (type: vocabulary) - imagePrompt: "Illustrated vocabulary flashcards with [language] words and pictures"
6-7. Grammar (type: core_concept) - imagePrompt: "Grammar structure diagram for [language] sentence patterns"
8-9. Phrases (type: example) - imagePrompt: "Conversation scene between native speakers with speech bubbles"
10+. Practice (type: practice) - imagePrompt: "Interactive practice interface with fill-in-the-blank exercises"

For ALPHABET steps specifically:
- Show each letter with native script, romanization, and pronunciation
- Use markdown tables: | Letter | Name | Sound | Example |
- Include example words starting with each letter` : ''}

Output exactly ${minSteps}-${maxSteps} steps as clean JSON.`;
  }

  /**
   * Parse course structure from LLM response
   */
  private parseCourseStructure(
    response: string,
    subject: string,
    level: DifficultyLevel
  ): GeneratedCourseStructure {
    try {
      // Clean the response - comprehensive character normalization
      let cleaned = response.trim()
        // Remove markdown code blocks
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        // Normalize quotes
        .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"') // Smart quotes → straight
        .replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4]/g, "'") // Smart apostrophes → straight
        // Normalize dashes
        .replace(/[\u2010-\u2015\u2212\u2043]/g, '-')
        // Remove control characters that break JSON
        .replace(/[\x00-\x1F\x7F]/g, ' ')
        // Fix escaped newlines in content
        .replace(/\\n/g, ' ')
        // Remove problematic unicode
        .replace(/[\u2028\u2029]/g, ' '); // Line/paragraph separators

      // Extract JSON object - try to find balanced braces
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found');
      }

      let jsonStr = jsonMatch[0];
      
      // Try to fix common JSON issues
      jsonStr = this.fixMalformedJson(jsonStr);

      const parsed = JSON.parse(jsonStr);
      
      // Validate structure
      if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
        throw new Error('Invalid course structure - no steps');
      }

      // Ensure all required fields exist
      const steps: CourseStep[] = parsed.steps.map((step: any, index: number) => ({
        stepNumber: step.stepNumber || index + 1,
        title: step.title || `Step ${index + 1}`,
        description: step.description || '',
        content: step.content || 'Content is being prepared...',
        keyPoints: Array.isArray(step.keyPoints) ? step.keyPoints : [],
        type: step.type || 'core_concept',
        estimatedMinutes: step.estimatedMinutes || 5,
        imagePrompt: step.imagePrompt || null,
        needsImage: step.needsImage !== false && step.imagePrompt
      }));

      return {
        courseTitle: parsed.courseTitle || `Learning ${subject}`,
        courseDescription: parsed.courseDescription || `A personalized course on ${subject}`,
        steps,
        targetedConcepts: parsed.targetedConcepts || [subject]
      };

    } catch (error) {
      console.error('Failed to parse course structure:', error);
      // Return minimal generated structure
      return this.createMinimalCourseStructure(subject, level);
    }
  }

  /**
   * Attempt to fix common JSON malformation issues
   * Uses aggressive cleaning for LLM-generated JSON
   */
  private fixMalformedJson(jsonStr: string): string {
    let fixed = jsonStr;
    
    // First pass: try as-is
    try {
      JSON.parse(fixed);
      return fixed;
    } catch (e) {
      console.log('First parse failed, attempting fixes...');
    }

    // AGGRESSIVE FIX: Extract and rebuild JSON manually
    // This handles the most common issues with LLM-generated JSON
    
    // Step 1: Fix all string values by properly escaping internal quotes
    // Match "key": "value" patterns and fix the value
    fixed = fixed.replace(/"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g, (match, key, value) => {
      // Clean the value
      let cleanValue = value
        .replace(/[\n\r]/g, ' ')  // Replace newlines with spaces
        .replace(/\t/g, ' ')      // Replace tabs
        .replace(/"/g, '\\"')     // Escape any unescaped quotes (will double-escape some, fix below)
        .replace(/\\\\"/g, '\\"') // Fix double escapes
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();
      return `"${key}": "${cleanValue}"`;
    });

    // Step 2: Fix bracket/brace balance
    let openBraces = (fixed.match(/\{/g) || []).length;
    let closeBraces = (fixed.match(/\}/g) || []).length;
    let openBrackets = (fixed.match(/\[/g) || []).length;
    let closeBrackets = (fixed.match(/\]/g) || []).length;

    // Remove trailing commas
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    
    // Add missing closing brackets
    while (closeBrackets < openBrackets) {
      fixed += ']';
      closeBrackets++;
    }
    while (closeBraces < openBraces) {
      fixed += '}';
      closeBraces++;
    }

    // Step 3: Try to parse again
    try {
      JSON.parse(fixed);
      return fixed;
    } catch (e) {
      console.log('Second parse failed, trying fallback extraction...');
    }

    // FALLBACK: Try to extract just the essential structure
    try {
      // Extract course title
      const titleMatch = fixed.match(/"courseTitle"\s*:\s*"([^"]+)"/);
      const descMatch = fixed.match(/"courseDescription"\s*:\s*"([^"]+)"/);
      
      // Extract steps array - find the steps section
      const stepsStart = fixed.indexOf('"steps"');
      if (stepsStart === -1) throw new Error('No steps found');
      
      // Try to extract individual step objects
      const stepMatches = fixed.matchAll(/"stepNumber"\s*:\s*(\d+)[^}]*"title"\s*:\s*"([^"]+)"[^}]*"type"\s*:\s*"([^"]+)"/g);
      const steps = Array.from(stepMatches).map((match, idx) => ({
        stepNumber: parseInt(match[1]) || idx + 1,
        title: match[2],
        type: match[3]
      }));

      if (steps.length === 0) throw new Error('No steps extracted');

      // Rebuild clean JSON
      const cleanJson = {
        courseTitle: titleMatch?.[1] || 'Course',
        courseDescription: descMatch?.[1] || 'Learning course',
        steps: steps.map(s => ({
          stepNumber: s.stepNumber,
          title: s.title,
          description: `Learn about ${s.title}`,
          content: 'PLACEHOLDER_NEEDS_EXPANSION',
          keyPoints: [`Key concepts of ${s.title}`],
          type: s.type,
          estimatedMinutes: 5,
          imagePrompt: `Educational illustration for ${s.title}`,
          needsImage: true
        })),
        targetedConcepts: steps.map(s => s.title)
      };

      return JSON.stringify(cleanJson);
    } catch (fallbackError) {
      console.error('Fallback extraction also failed:', fallbackError);
      return fixed; // Return original, will fail and trigger minimal structure
    }
  }

  /**
   * Create minimal course structure when parsing fails
   * This creates the structure with placeholder content that will be expanded
   */
  private createMinimalCourseStructure(subject: string, level: DifficultyLevel): GeneratedCourseStructure {
    // These are intentionally short to trigger the content expansion logic
    return {
      courseTitle: `Introduction to ${subject}`,
      courseDescription: `Start your journey learning ${subject} with this personalized course.`,
      steps: [
        {
          stepNumber: 1,
          title: `Welcome to ${subject}`,
          description: 'Your learning journey begins here',
          content: 'PLACEHOLDER_NEEDS_EXPANSION', // Will be expanded by validateAndExpandContent
          keyPoints: ['Understanding the foundations', 'Setting learning goals', 'Overview of key concepts', 'What to expect in this course'],
          type: 'introduction',
          estimatedMinutes: 5,
          imagePrompt: `An inspiring welcome banner for a ${subject} learning course with modern educational design`,
          needsImage: true
        },
        {
          stepNumber: 2,
          title: `Core Foundations of ${subject}`,
          description: 'Essential concepts to master',
          content: 'PLACEHOLDER_NEEDS_EXPANSION', // Will be expanded by validateAndExpandContent
          keyPoints: ['Key terminology and definitions', 'Core principles explained', 'Foundation concepts', 'How these concepts interconnect'],
          type: 'core_concept',
          estimatedMinutes: 10,
          imagePrompt: `A clear educational diagram showing the fundamental concepts of ${subject} with labeled elements and visual hierarchy`,
          needsImage: true
        },
        {
          stepNumber: 3,
          title: 'Practical Application',
          description: 'Putting knowledge into practice',
          content: 'PLACEHOLDER_NEEDS_EXPANSION', // Will be expanded by validateAndExpandContent
          keyPoints: ['Real-world examples', 'Step-by-step practice', 'Common scenarios and solutions', 'Tips for effective application'],
          type: 'example',
          estimatedMinutes: 12,
          imagePrompt: `A step-by-step visual guide showing practical application of ${subject} concepts with annotated examples`,
          needsImage: true
        },
        {
          stepNumber: 4,
          title: 'Summary and Next Steps',
          description: 'Review and path forward',
          content: 'PLACEHOLDER_NEEDS_EXPANSION', // Will be expanded by validateAndExpandContent
          keyPoints: ['Key takeaways review', 'Practice recommendations', 'Advanced topics to explore', 'Resources for continued learning'],
          type: 'summary',
          estimatedMinutes: 6,
          imagePrompt: `A comprehensive summary infographic for ${subject} showing learning path and achievements`,
          needsImage: true
        }
      ],
      targetedConcepts: [subject, `${subject} fundamentals`, `${subject} application`]
    };
  }

  /**
   * Validate content quality and expand steps with insufficient content
   * Minimum content threshold: 150 words for substantive teaching
   * OPTIMIZED: Run expansions in parallel for 3-4x speedup
   */
  private async validateAndExpandContent(
    steps: CourseStep[],
    subject: string,
    level: DifficultyLevel,
    userContext?: string
  ): Promise<CourseStep[]> {
    const MIN_WORD_COUNT = 150;
    
    // Identify which steps need expansion
    const stepsNeedingExpansion = steps.filter(step => {
      const wordCount = step.content.split(/\s+/).length;
      const needsExpansion = wordCount < MIN_WORD_COUNT;
      if (needsExpansion) {
        console.log(`📝 Step ${step.stepNumber} has only ${wordCount} words, will expand...`);
      } else {
        console.log(`✓ Step ${step.stepNumber} has sufficient content (${wordCount} words)`);
      }
      return needsExpansion;
    });
    
    // 🚀 OPTIMIZATION: Expand all needing steps in parallel (batches of 5)
    const BATCH_SIZE = 5;
    const expansionResults = new Map<number, string>();
    
    for (let i = 0; i < stepsNeedingExpansion.length; i += BATCH_SIZE) {
      const batch = stepsNeedingExpansion.slice(i, i + BATCH_SIZE);
      console.log(`📝 Expanding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(stepsNeedingExpansion.length / BATCH_SIZE)}`);
      
      const batchPromises = batch.map(async (step) => {
        try {
          let expandedContent = await this.generateStepContent(
            step.title,
            step.description,
            step.type,
            subject,
            level,
            step.keyPoints,
            userContext
          );
          
          // 🔤 ALPHABET VALIDATION: Ensure complete alphabet for LANGUAGE courses only
          const isLanguageCourse = /language|arabic|spanish|french|german|chinese|japanese|korean|kazakh|russian|hebrew|hindi|latin|italian|portuguese|turkish|vietnamese/i.test(subject);
          const isAlphabetSection = /alphabet|letter|character|script/i.test(step.title);
          if (isLanguageCourse && isAlphabetSection) {
            const validation = this.validateAlphabetCompleteness(expandedContent, subject);
            if (!validation.isComplete) {
              console.warn(`⚠️ Alphabet incomplete in step ${step.stepNumber}: ${validation.letterCount}/${validation.expected.min} letters. Regenerating...`);
              expandedContent = await this.generateCompleteAlphabet(subject, level);
            }
          }
          
          console.log(`✅ Step ${step.stepNumber} expanded to ${expandedContent.split(/\s+/).length} words`);
          return { stepNumber: step.stepNumber, content: expandedContent };
        } catch (error: any) {
          console.warn(`⚠️ Failed to expand Step ${step.stepNumber}: ${error?.message || 'Unknown error'}. Generating fallback content.`);
          
          // 🎯 FIX: Generate meaningful fallback instead of keeping placeholder
          // 🔤 For alphabet sections, use static fallback
          const isAlphabetSection = /alphabet|letter|character|script/i.test(step.title);
          const fallbackContent = isAlphabetSection 
            ? this.getStaticAlphabetFallback(subject)
            : this.generateFallbackStepContent(step, subject, level);
          return { stepNumber: step.stepNumber, content: fallbackContent };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(r => expansionResults.set(r.stepNumber, r.content));
    }
    
    // Merge results back into steps array maintaining order
    return steps.map(step => {
      const expandedContent = expansionResults.get(step.stepNumber);
      if (expandedContent) {
        return { ...step, content: expandedContent };
      }
      return step;
    });
  }

  /**
   * 🎯 Generate meaningful fallback content when LLM expansion fails
   * This ensures we never return placeholder text to users
   */
  private generateFallbackStepContent(step: CourseStep, subject: string, level: DifficultyLevel): string {
    const isLanguageCourse = /language|arabic|spanish|french|german|chinese|japanese|korean|kazakh|russian/i.test(subject);
    const levelDescriptor = level === 'beginner' ? 'introductory' : level === 'intermediate' ? 'intermediate-level' : 'advanced';
    
    // Type-specific fallback content templates
    const contentByType: Record<string, string> = {
      'introduction': `
# Welcome to ${step.title}

In this ${levelDescriptor} section, we'll explore the foundational concepts of ${subject}. This introduction sets the stage for your learning journey.

## What You'll Learn

${step.keyPoints.map((kp, i) => `${i + 1}. **${kp}** - Understanding this concept is essential for building a strong foundation.`).join('\n')}

## Getting Started

Every expert was once a beginner. As you progress through this course, you'll build confidence and competence step by step. Take your time to absorb each concept before moving forward.

The key to success is consistent practice and engagement with the material. Don't hesitate to revisit sections if needed - repetition strengthens understanding.
      `.trim(),
      
      'core_concept': `
# ${step.title}

This section covers the essential concepts you need to master. Understanding these fundamentals will unlock more advanced topics.

## Key Concepts

${step.keyPoints.map((kp, i) => `### ${i + 1}. ${kp}\n\nThis concept forms a crucial part of your ${subject} knowledge. Take time to understand it fully before proceeding.`).join('\n\n')}

## Why This Matters

Mastering these core concepts provides the foundation for everything that follows. Strong fundamentals make advanced topics more accessible and intuitive.

## Practice Tip

After reading, try to explain these concepts in your own words. Teaching is the best way to solidify your understanding.
      `.trim(),
      
      'vocabulary': isLanguageCourse ? `
# ${step.title} - Vocabulary

Building your vocabulary is essential for ${subject} fluency. This section introduces key words and phrases.

## Essential Words

| Word | Pronunciation | Meaning |
|------|---------------|---------|
| Example 1 | /pronunciation/ | Meaning here |
| Example 2 | /pronunciation/ | Meaning here |
| Example 3 | /pronunciation/ | Meaning here |

## Key Points

${step.keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')}

## Practice Tips

- Say each word out loud multiple times
- Use new words in simple sentences
- Create flashcards for regular review
- Practice with a native speaker if possible
      `.trim() : `
# ${step.title}

This section covers the key terminology you need to know.

## Key Terms

${step.keyPoints.map((kp, i) => `**${kp}**: An important concept in ${subject} that you'll encounter frequently.`).join('\n\n')}
      `.trim(),
      
      'example': `
# ${step.title} - Practical Examples

Let's see these concepts in action. Real-world examples help bridge theory and practice.

## Example Scenarios

${step.keyPoints.map((kp, i) => `### Scenario ${i + 1}: ${kp}\n\nIn this example, we apply the concept to a real situation. Observe how the principles work together.`).join('\n\n')}

## Key Takeaways

Understanding through examples builds intuition. When you encounter similar situations, you'll recognize the patterns and know how to respond.
      `.trim(),
      
      'summary': `
# ${step.title} - Summary

Congratulations on completing this section! Let's review what we've covered.

## Key Takeaways

${step.keyPoints.map((kp, i) => `✓ **${kp}** - A core concept that you should now understand.`).join('\n')}

## What's Next

Continue practicing what you've learned. The next sections will build on these foundations, so make sure you're comfortable before proceeding.

## Tips for Success

- Review this material periodically to reinforce your learning
- Practice regularly, even just 15 minutes a day
- Don't be afraid to return to earlier sections if needed
- Connect new concepts to what you already know
      `.trim()
    };

    return contentByType[step.type] || contentByType['core_concept'];
  }

  /**
   * Generate detailed content for a single step
   */
  private async generateStepContent(
    title: string,
    description: string,
    type: CourseSection['type'],
    subject: string,
    level: DifficultyLevel,
    keyPoints: string[],
    userContext?: string
  ): Promise<string> {
    const languageName = getCurrentLanguageName();
    const languageInstruction = getLanguageInstruction();

    // Detect language course and specific section types
    const isLanguageCourse = /arabic|spanish|french|german|chinese|japanese|korean|kazakh|russian|hebrew|hindi|language/i.test(subject);
    const isAlphabetSection = /alphabet|letter|character|script/i.test(title);
    // 🎯 FIX: Check for specific types BEFORE generic vocabulary to avoid "Core Vocabulary: Verbs" matching vocabulary instead of verbs
    const isVerbSection = /\bverb|action word|conjugat/i.test(title);
    const isGrammarSection = /grammar|rule|structure|syntax/i.test(title);
    const isPhraseSection = /phrase|conversation|dialog|expression/i.test(title);
    // Generic vocabulary check - only if NOT a more specific section
    const isVocabularySection = !isVerbSection && !isPhraseSection && /noun|vocabulary|word|essential/i.test(title);

    // Determine if user needs transliterations based on level and context
    const userNeedsTransliteration = 
      level === 'beginner' || 
      (userContext && /can't speak|cannot speak|don't know|no experience|never learned|new to|first time|complete beginner/i.test(userContext));
    
    // Level-specific complexity for grammar and content
    const levelComplexity = {
      'beginner': {
        grammarRules: 3,
        vocabCount: 15,
        exampleComplexity: 'simple 2-3 word sentences',
        transliteration: 'ALWAYS include romanized transliteration for EVERY word',
        verbForms: 'present tense only',
        sentenceLength: 'short, simple sentences with basic vocabulary'
      },
      'intermediate': {
        grammarRules: 5,
        vocabCount: 25,
        exampleComplexity: 'moderate 4-6 word sentences with common vocabulary',
        transliteration: 'include romanized transliteration for new/complex words',
        verbForms: 'present and past tense',
        sentenceLength: 'medium-length sentences with varied vocabulary'
      },
      'advanced': {
        grammarRules: 8,
        vocabCount: 35,
        exampleComplexity: 'complex sentences with advanced vocabulary and idioms',
        transliteration: 'minimal transliteration, only for rare words',
        verbForms: 'all tenses including subjunctive/conditional',
        sentenceLength: 'complex compound sentences with nuanced meaning'
      }
    };
    
    const complexity = levelComplexity[level] || levelComplexity['beginner'];
    
    // Override transliteration for beginners or users who can't speak
    const transliterationRule = userNeedsTransliteration 
      ? 'MANDATORY: Include romanized transliteration in parentheses for EVERY single word in the target language. Example: مرحبا (marhaba) = Hello'
      : complexity.transliteration;

    // Language-specific structured content instructions - LEVEL-ADAPTED
    const languageTypeInstructions: Record<string, string> = {
      'alphabet': `
Generate the COMPLETE alphabet for ${subject}. Use this EXACT format:

## The ${subject.replace(/language|course/gi, '').trim()} Alphabet

| Letter | Name | Sound | Example Word |
|--------|------|-------|--------------|
| [letter] | [name] | /[sound]/ like '[english sound]' | [example word] ([romanized]) = [meaning] |

⚠️ MANDATORY: Include EVERY single letter in the alphabet. Do not skip any.
This is a reference sheet - learners will use this to study all letters.
Include 25-35 letters depending on the language.

TRANSLITERATION REQUIREMENT: ${transliterationRule}
      `,
      'vocabulary': `
Generate ${complexity.vocabCount} actual vocabulary words for ${subject}. 

LEARNER LEVEL: ${level.toUpperCase()}
${level === 'beginner' ? '- Use ONLY the most common, everyday words' : level === 'intermediate' ? '- Include moderately common words and some abstract concepts' : '- Include advanced vocabulary, idioms, and nuanced terms'}

Use this EXACT format:

## Essential Vocabulary

### People & Family
| Word | Romanized | Pronunciation | Meaning |
|------|-----------|---------------|---------|
| [word] | [romanized] | [pronunciation] | [meaning] |

### Common Objects
| Word | Romanized | Pronunciation | Meaning |
|------|-----------|---------------|---------|

### Numbers (1-10)
| Word | Romanized | Pronunciation | Meaning |
|------|-----------|---------------|---------|

⚠️ MANDATORY: Include ${complexity.vocabCount} ACTUAL words organized by category.
NO flowing text - ONLY tables. This is a vocabulary reference sheet.

TRANSLITERATION: ${transliterationRule}
      `,
      'grammar': `
Generate structured grammar rules for ${subject}.

LEARNER LEVEL: ${level.toUpperCase()}
NUMBER OF RULES: ${complexity.grammarRules}
EXAMPLE COMPLEXITY: ${complexity.exampleComplexity}
VERB FORMS TO COVER: ${complexity.verbForms}

${level === 'beginner' ? `
BEGINNER REQUIREMENTS:
- Only basic grammar rules (word order, basic conjugation, simple questions)
- All examples must be ${complexity.sentenceLength}
- ${transliterationRule}
- Focus on patterns learners will use immediately
` : level === 'intermediate' ? `
INTERMEDIATE REQUIREMENTS:
- Include more nuanced grammar (tenses, cases, agreement)
- Examples should be ${complexity.sentenceLength}
- ${transliterationRule}
- Explain common exceptions
` : `
ADVANCED REQUIREMENTS:
- Cover complex grammar (subjunctive, passive, conditionals)
- Examples should be ${complexity.sentenceLength}
- Include idiomatic usage and stylistic variations
- ${transliterationRule}
`}

Use this EXACT format:

## Grammar Rules

### Rule 1: [Rule Name]
**Pattern:** [Simple pattern description]
**Structure:** [Grammatical structure]
**${level === 'beginner' ? 'Simple ' : level === 'intermediate' ? 'Moderate ' : 'Complex '}Example:**
- ${subject}: [${complexity.exampleComplexity}]
- Romanized: [romanized version]
- English: [translation]

### Rule 2: [Rule Name]
**Pattern:** [Description]
**Example:**
- [example with transliteration if needed]

⚠️ MANDATORY: Include exactly ${complexity.grammarRules} grammar rules.
NO flowing paragraphs - use structured rules format.
All examples must match ${level} level complexity.
      `,
      'verbs': `
Generate ${level === 'beginner' ? '15' : level === 'intermediate' ? '20' : '30'} common verbs for ${subject}.

LEARNER LEVEL: ${level.toUpperCase()}
VERB FORMS: ${complexity.verbForms}

${level === 'beginner' ? `
BEGINNER VERBS:
- Only the most essential everyday verbs (to be, to have, to go, to eat, to drink, to want, to like, etc.)
- Present tense only
- ${transliterationRule}
` : level === 'intermediate' ? `
INTERMEDIATE VERBS:
- Common verbs plus some action/state verbs
- Present and past tense forms
- ${transliterationRule}
` : `
ADVANCED VERBS:
- Full range including abstract and nuanced verbs
- Multiple tense forms where applicable
- ${transliterationRule}
`}

Use this EXACT format:

## Essential Verbs

### Action Verbs
| Infinitive | Romanized | Pronunciation | Meaning |
|------------|-----------|---------------|---------|
| [verb] | [romanized] | [pronunciation] | to [action] |

### State Verbs
| Infinitive | Romanized | Pronunciation | Meaning |
|------------|-----------|---------------|---------|

⚠️ MANDATORY: Include ACTUAL verbs. NO flowing text - ONLY tables.
TRANSLITERATION: ${transliterationRule}
      `,
      'phrases': `
Generate ${level === 'beginner' ? '15' : level === 'intermediate' ? '25' : '35'} common phrases for ${subject}.

LEARNER LEVEL: ${level.toUpperCase()}
SENTENCE COMPLEXITY: ${complexity.sentenceLength}

${level === 'beginner' ? `
BEGINNER PHRASES:
- Only survival phrases (greetings, please, thank you, yes, no, basic questions)
- ${complexity.sentenceLength}
- ${transliterationRule}
` : level === 'intermediate' ? `
INTERMEDIATE PHRASES:
- Everyday conversation phrases
- ${complexity.sentenceLength}
- ${transliterationRule}
` : `
ADVANCED PHRASES:
- Nuanced expressions, idioms, formal/informal registers
- ${complexity.sentenceLength}
- ${transliterationRule}
`}

Use this EXACT format:

## Essential Phrases

### Greetings
| Phrase | Romanized | Meaning | When to Use |
|--------|-----------|---------|-------------|
| [phrase] | [romanized] | [meaning] | [context] |

### Basic Questions
| Phrase | Romanized | Meaning |
|--------|-----------|---------|

### Common Responses
| Phrase | Romanized | Meaning |
|--------|-----------|---------|

### Polite Expressions
| Phrase | Romanized | Meaning |
|--------|-----------|---------|

⚠️ MANDATORY: Include phrases organized by category. NO flowing text.
TRANSLITERATION: ${transliterationRule}
      `
    };

    // 🎯 UNIVERSAL TYPE INSTRUCTIONS - Works for ANY course type, not just languages
    const typeInstructions: Record<string, string> = {
      'introduction': `Write an engaging introduction to ${subject}. 

STRUCTURE YOUR CONTENT AS MARKDOWN:
## Welcome to ${subject}

Write a compelling opener that hooks the learner.

### What You'll Learn
Use bullet points:
- Key skill or concept 1
- Key skill or concept 2
- Key skill or concept 3

### Why This Matters
Explain real-world relevance and applications.

### Course Overview
Brief roadmap of the learning journey.

⚠️ OUTPUT AS CLEAN MARKDOWN with proper headings, not raw text.`,

      'core_concept': `Teach the core concepts of this section thoroughly.

STRUCTURE YOUR CONTENT AS MARKDOWN:
## [Main Concept Title]

### Definition
**[Key Term]**: Clear definition in simple terms.

### How It Works
Explain the principle step by step:
1. First step or aspect
2. Second step or aspect
3. Third step or aspect

### Key Points
| Concept | Description | Example |
|---------|-------------|---------|
| Point 1 | What it means | Real example |
| Point 2 | What it means | Real example |

### Common Mistakes to Avoid
- Mistake 1 and how to avoid it
- Mistake 2 and how to avoid it

⚠️ Use markdown tables, headers, and lists. NO raw JSON.`,

      'example': `Provide detailed practical examples and applications.

STRUCTURE YOUR CONTENT AS MARKDOWN:
## Practical Examples

### Example 1: [Scenario Name]
**Situation**: Describe the context
**Approach**: Step-by-step walkthrough
**Result**: What happens and why

### Example 2: [Different Scenario]
Walk through another practical application.

### Comparison Table
| Scenario | Approach | Outcome |
|----------|----------|---------|
| Case A | Method X | Result |
| Case B | Method Y | Result |

⚠️ Use markdown formatting. Tables for structured data.`,

      'practice': `Create interactive practice content with exercises.

STRUCTURE YOUR CONTENT AS MARKDOWN:
## Practice Exercises

### Exercise 1: [Exercise Name]
**Instructions**: What to do
**Goal**: What you're practicing
**Steps**:
1. First step
2. Second step
3. Check your work

### Exercise 2: [Different Exercise]
Another hands-on task.

### Self-Assessment Checklist
- [ ] Can you explain [concept]?
- [ ] Can you apply [skill]?
- [ ] Can you identify [pattern]?

⚠️ Use clear markdown structure with numbered steps.`,

      'checkpoint': `Provide a comprehensive review checkpoint.

STRUCTURE YOUR CONTENT AS MARKDOWN:
## Knowledge Checkpoint

### Key Concepts Review
| Concept | Quick Summary | Why It Matters |
|---------|---------------|----------------|
| Term 1 | Brief explanation | Application |
| Term 2 | Brief explanation | Application |

### Quick Review Questions
Think about these before moving on:
1. Question about first concept
2. Question about second concept
3. Question about application

### What's Coming Next
Preview of the next section.

⚠️ Use tables for structured review content.`,

      'summary': `Create a thorough summary and conclusion.

STRUCTURE YOUR CONTENT AS MARKDOWN:
## Summary & Key Takeaways

### What We Covered
| Topic | Key Point | Remember This |
|-------|-----------|---------------|
| Topic 1 | Main idea | Quick tip |
| Topic 2 | Main idea | Quick tip |

### Most Important Points
1. **Key Takeaway 1**: Brief explanation
2. **Key Takeaway 2**: Brief explanation
3. **Key Takeaway 3**: Brief explanation

### Next Steps
Suggestions for continued learning and practice.

### Congratulations! 🎉
Celebrate the learner's progress.

⚠️ Use markdown tables and formatting for clean presentation.`
    };

    // Choose the appropriate instruction based on section type
    let instruction: string;
    let formatNote = '';
    
    if (isLanguageCourse) {
      if (isAlphabetSection) {
        instruction = languageTypeInstructions['alphabet'];
        formatNote = 'Use ONLY markdown tables. NO paragraphs.';
      } else if (isVocabularySection) {
        instruction = languageTypeInstructions['vocabulary'];
        formatNote = 'Use ONLY markdown tables organized by category. NO paragraphs.';
      } else if (isGrammarSection) {
        instruction = languageTypeInstructions['grammar'];
        formatNote = 'Use structured rules format with patterns and examples. NO flowing text.';
      } else if (isVerbSection) {
        instruction = languageTypeInstructions['verbs'];
        formatNote = 'Use ONLY markdown tables. NO paragraphs.';
      } else if (isPhraseSection) {
        instruction = languageTypeInstructions['phrases'];
        formatNote = 'Use ONLY markdown tables organized by category. NO paragraphs.';
      } else {
        instruction = typeInstructions[type] || typeInstructions['core_concept'];
      }
    } else {
      instruction = typeInstructions[type] || typeInstructions['core_concept'];
    }

    const prompt = `Write a complete, substantive educational lesson for the following course step.
${languageInstruction}

COURSE: ${subject}
STEP TITLE: ${title}
STEP TYPE: ${type}
DESCRIPTION: ${description}
LEARNER LEVEL: ${level}
KEY POINTS TO COVER: ${keyPoints.join(', ')}

INSTRUCTIONS:
${instruction}

${formatNote ? `⚠️ FORMAT REQUIREMENT: ${formatNote}` : ''}

${!isLanguageCourse || (!isAlphabetSection && !isVocabularySection && !isGrammarSection && !isVerbSection && !isPhraseSection) ? `
REQUIREMENTS:
1. Write 300-450 words of ACTUAL teaching content
2. Use ${level === 'beginner' ? 'simple, accessible language with extra explanations' : level === 'intermediate' ? 'clear language with moderate depth' : 'sophisticated language with in-depth analysis'}
3. Include concrete examples and explanations
4. Make it engaging and conversational
5. Structure content with clear flow between ideas
6. Write in ${languageName}

DO NOT:
- Write generic placeholder text like "In this section we will..."
- Write summaries of what will be covered
- Be vague or abstract

INSTEAD:
- Actually TEACH the material
- Define terms: "X is defined as..."
- Explain concepts: "This works because..."
- Give examples: "For instance, imagine you are..."
- Connect ideas: "This relates to... because..."
` : ''}

Write the lesson content now:`;

    const response = await this.toolRegistry.execute('llm-completion', {
      prompt,
      model: 'accounts/fireworks/models/gpt-oss-120b',
      temperature: 0.65,
      maxTokens: 1500
    }, {});

    const content = this.extractResponseText(response);
    
    // Validate we got real content
    if (!content || content.split(/\s+/).length < 100) {
      throw new Error('Generated content too short');
    }

    return content.trim();
  }

  /**
   * Generate images for course steps that need them
   */
  private async generateCourseImages(
    steps: CourseStep[],
    subject: string
  ): Promise<CourseSection[]> {
    const sectionsWithImages: CourseSection[] = [];
    
    // Generate images in parallel for steps that need them
    const imagePromises = steps.map(async (step) => {
      let imageUrl: string | undefined = undefined;
      
      if (step.needsImage && step.imagePrompt) {
        try {
          console.log(`🎨 Generating image for Step ${step.stepNumber}: ${step.title}`);
          
          // Create enhanced prompt for educational context - subject-specific
          const isLanguageCourse = /arabic|spanish|french|german|chinese|japanese|korean|kazakh|russian|language/i.test(subject);
          const languageStyle = isLanguageCourse ? 'culturally authentic, educational infographic with regional patterns and motifs' : 'clean, modern, professional educational diagram';
          
          const enhancedPrompt = `${step.imagePrompt}. Style: ${languageStyle}. Subject context: ${subject} education. Visual hierarchy with clear sections. ${isLanguageCourse ? 'Include cultural elements and native script examples where appropriate.' : 'Clear labels and annotations.'}`;
          
          const imageResult = await this.toolRegistry.execute('generate-image', {
            prompt: enhancedPrompt,
            style: 'digital-art',
            size: '1024x768'
          }, {});
          
          if (imageResult?.success && (imageResult.data?.imageUrl || imageResult.data?.image_url)) {
            imageUrl = imageResult.data.imageUrl || imageResult.data.image_url;
            console.log(`✅ Image generated for Step ${step.stepNumber}`);
          }
        } catch (imageError) {
          console.warn(`⚠️ Failed to generate image for Step ${step.stepNumber}:`, imageError);
          // Continue without image
        }
      }
      
      // Calculate dynamic time estimate based on word count (avg 200 words/min reading)
      const wordCount = step.content.split(/\s+/).length;
      const dynamicMinutes = Math.max(2, Math.ceil(wordCount / 180)); // Slightly slower for comprehension
      
      return {
        id: `step_${step.stepNumber}`,
        stepNumber: step.stepNumber,
        title: step.title,
        content: step.content,
        type: step.type,
        estimatedMinutes: dynamicMinutes, // Use calculated time, not static
        keyPoints: step.keyPoints,
        imageUrl,
        imagePrompt: step.imagePrompt,
        isCompleted: false,
        isLocked: step.stepNumber > 1, // First step unlocked, others locked initially
        // 🐛 FIX: Preserve chunks that were generated by generateBiteSizedChunks
        chunks: (step as any).chunks || []
      } as CourseSection;
    });
    
    // Wait for all image generations to complete
    const results = await Promise.all(imagePromises);
    return results;
  }

  /**
   * Generate bite-sized chunks for each section
   * Each chunk is 1-3 minutes of focused learning
   * OPTIMIZED: Run chunk generation in parallel batches for 3-4x speedup
   */
  private async generateBiteSizedChunks(
    steps: CourseStep[],
    subject: string,
    level: DifficultyLevel
  ): Promise<CourseStep[]> {
    const languageName = getCurrentLanguageName();
    const languageInstruction = getLanguageInstruction();

    // 🚀 OPTIMIZATION: Generate chunks in parallel (batches of 5 for faster generation)
    // Increased from 3 to 5 - modern APIs handle this well
    const BATCH_SIZE = 5;
    const results: CourseStep[] = [];
    
    for (let i = 0; i < steps.length; i += BATCH_SIZE) {
      const batch = steps.slice(i, i + BATCH_SIZE);
      console.log(`🧩 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(steps.length / BATCH_SIZE)} (${batch.length} sections)`);
      
      const batchPromises = batch.map(async (step) => {
        try {
          // Generate chunks for this step
          const chunks = await this.generateChunksForSection(
            step,
            subject,
            level,
            languageName,
            languageInstruction
          );
          
          // Add chunks to the step
          (step as any).chunks = chunks;
          
          console.log(`✅ Generated ${chunks.length} chunks for: ${step.title}`);
          // DEBUG: Log chunk types and quiz presence
          chunks.forEach((chunk, idx) => {
            console.log(`  Chunk ${idx + 1}: type="${chunk.type}", hasQuiz=${!!chunk.quizQuestions}, quizCount=${chunk.quizQuestions?.length || 0}`);
          });
          return step;
        } catch (error) {
          console.warn(`⚠️ Failed to generate chunks for ${step.title}, using fallback`);
          // Create fallback chunks from existing content
          (step as any).chunks = this.createFallbackChunks(step);
          return step;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 🚀 PROGRESSIVE: Generate chunks for a SINGLE section (used for priority Section 1)
   */
  private async generateChunksForSingleSection(
    step: CourseStep,
    subject: string,
    level: DifficultyLevel,
    sectionIndex: number
  ): Promise<CourseStep> {
    const languageName = getCurrentLanguageName();
    const languageInstruction = getLanguageInstruction();
    
    try {
      console.log(`🧩 Generating chunks for priority section: ${step.title}`);
      const chunks = await this.generateChunksForSection(
        step,
        subject,
        level,
        languageName,
        languageInstruction
      );
      
      (step as any).chunks = chunks;
      (step as any).isGenerating = false;
      (step as any).isLocked = sectionIndex > 0;
      
      console.log(`✅ Section ${sectionIndex + 1} ready with ${chunks.length} chunks`);
      return step;
    } catch (error) {
      console.warn(`⚠️ Failed to generate chunks for ${step.title}, using fallback`);
      (step as any).chunks = this.createFallbackChunks(step);
      (step as any).isGenerating = false;
      return step;
    }
  }

  /**
   * 🖼️ Generate thumbnail images for all sections in parallel
   * Returns a map of sectionIndex -> imageUrl
   * Runs in parallel with Section 1 chunk generation for max speed
   */
  private async generateSectionThumbnails(
    steps: CourseStep[],
    subject: string
  ): Promise<Record<number, string | undefined>> {
    const images: Record<number, string | undefined> = {};
    
    // Generate images for all sections in parallel (limit to 3 concurrent for API limits)
    const CONCURRENT_LIMIT = 3;
    const isLanguageCourse = /arabic|spanish|french|german|chinese|japanese|korean|kazakh|russian|language/i.test(subject);
    
    console.log(`🖼️ IMAGES: Starting parallel generation for ${steps.length} section thumbnails...`);
    
    for (let i = 0; i < steps.length; i += CONCURRENT_LIMIT) {
      const batch = steps.slice(i, i + CONCURRENT_LIMIT);
      
      const batchPromises = batch.map(async (step, batchIdx) => {
        const stepIndex = i + batchIdx;
        
        if (!step.needsImage && !step.imagePrompt) {
          // Generate a default prompt based on section title
          const defaultPrompt = `Educational illustration for "${step.title}" in ${subject} course. ${isLanguageCourse ? 'Include cultural elements and visual vocabulary aids.' : 'Clean, modern educational diagram.'}`;
          step.imagePrompt = defaultPrompt;
        }
        
        try {
          const styleContext = isLanguageCourse 
            ? 'Cultural, educational, with native script elements and regional patterns'
            : 'Clean, professional, minimalist educational diagram';
          
          const enhancedPrompt = `${step.imagePrompt || step.title}. Style: ${styleContext}. Subject: ${subject}. For online learning platform.`;
          
          const imageResult = await this.toolRegistry.execute('generate-image', {
            prompt: enhancedPrompt,
            style: 'digital-art',
            size: '512x512' // Smaller for thumbnails = faster
          }, {});
          
          if (imageResult?.success && (imageResult.data?.imageUrl || imageResult.data?.image_url)) {
            images[stepIndex] = imageResult.data.imageUrl || imageResult.data.image_url;
            console.log(`✅ IMAGES: Section ${stepIndex + 1} thumbnail ready`);
          }
        } catch (err) {
          console.warn(`⚠️ IMAGES: Failed section ${stepIndex + 1} thumbnail`);
          images[stepIndex] = undefined;
        }
        
        return stepIndex;
      });
      
      await Promise.all(batchPromises);
    }
    
    const successCount = Object.values(images).filter(Boolean).length;
    console.log(`✅ IMAGES: Generated ${successCount}/${steps.length} section thumbnails`);
    
    return images;
  }

  /**
   * 🚀 PROGRESSIVE: Background generation for remaining sections
   * Runs after initial course return - user learns Section 1 while this generates
   * Now includes validation of each step before chunk generation
   */
  private async generateRemainingSectionsInBackground(
    course: GeneratedCourse,
    remainingSteps: CourseStep[],
    subject: string,
    level: DifficultyLevel,
    userContext?: string,
    onProgress?: (course: GeneratedCourse, sectionIndex: number) => void
  ): Promise<void> {
    console.log(`🔄 BACKGROUND: Starting generation of ${remainingSteps.length} remaining sections...`);
    
    const languageName = getCurrentLanguageName();
    const languageInstruction = getLanguageInstruction();
    
    // Generate sections in parallel batches of 3 for speed
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < remainingSteps.length; i += BATCH_SIZE) {
      const batch = remainingSteps.slice(i, i + BATCH_SIZE);
      const batchStartIndex = i + 1; // +1 because Section 1 is already done
      
      console.log(`🔄 BACKGROUND: Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(remainingSteps.length / BATCH_SIZE)}`);
      
      const batchPromises = batch.map(async (step, batchIdx) => {
        const sectionIndex = batchStartIndex + batchIdx;
        try {
          // 🔍 Validate/expand this step's content before generating chunks
          const validatedSteps = await this.validateAndExpandContent(
            [step],
            subject,
            level,
            userContext
          );
          const validatedStep = validatedSteps[0];
          
          // Update the course section with validated content
          const section = course.sections[sectionIndex];
          if (section && validatedStep) {
            section.content = validatedStep.content;
            section.keyPoints = validatedStep.keyPoints;
          }
          
          const chunks = await this.generateChunksForSection(
            validatedStep,
            subject,
            level,
            languageName,
            languageInstruction
          );
          
          // Update the course section in-place (reuse existing section variable)
          if (section) {
            section.chunks = chunks;
            (section as any).isGenerating = false;
            section.isLocked = false; // 🔓 UNLOCK - ready for user
            
            // Update progress detail
            if (course.progressDetail?.sectionProgress[sectionIndex]) {
              course.progressDetail.sectionProgress[sectionIndex].totalChunks = chunks.length;
            }
            
            console.log(`✅ BACKGROUND: Section ${sectionIndex + 1} "${section.title}" ready (${chunks.length} chunks)`);
            
            // 🔔 Notify callback if provided
            if (onProgress) {
              onProgress(course, sectionIndex);
            }
            
            // Also notify registered callbacks
            const registeredCallback = this.progressCallbacks.get(course.moduleId);
            if (registeredCallback) {
              registeredCallback(course, sectionIndex);
            }
          }
          
          return { sectionIndex, success: true, chunks };
        } catch (error) {
          console.warn(`⚠️ BACKGROUND: Failed section ${sectionIndex + 1}, using fallback`);
          const section = course.sections[sectionIndex];
          if (section) {
            section.chunks = this.createFallbackChunks(step);
            (section as any).isGenerating = false;
            section.isLocked = false;
            
            // 🔔 Still notify callback on failure (section has fallback content)
            if (onProgress) {
              onProgress(course, sectionIndex);
            }
          }
          return { sectionIndex, success: false };
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    // Recalculate total chunks now that all are generated
    const actualTotalChunks = course.sections.reduce((sum, s) => sum + (s.chunks?.length || 0), 0);
    if (course.progressDetail) {
      course.progressDetail.totalChunks = actualTotalChunks;
    }
    
    console.log(`✅ BACKGROUND: All ${remainingSteps.length} sections complete! Total chunks: ${actualTotalChunks}`);
    
    // 🎯 Vectorize course content for semantic retrieval (do this in background too)
    try {
      await this.vectorizeCourseContent(course, userContext);
      console.log('✅ BACKGROUND: Course content vectorized for semantic search');
    } catch (error) {
      console.warn('⚠️ BACKGROUND: Vectorization failed:', error);
    }
  }

  /**
   * Generate chunks for a single section using LLM
   */
  private async generateChunksForSection(
    step: CourseStep,
    subject: string,
    level: DifficultyLevel,
    languageName: string,
    languageInstruction: string
  ): Promise<CourseChunk[]> {
    const chunkTypes = this.getChunkTypesForSection(step.type);
    
    // 🎯 GET COURSE TYPE FROM LLM CLASSIFICATION (set during Phase 0)
    const courseTypeConfig: CourseTypeConfig | undefined = (this as any).currentCourseTypeConfig;
    const isSoftSkillsCourse = courseTypeConfig?.type === 'soft_skills';
    const isTechnicalCourse = courseTypeConfig?.type === 'technical';
    
    // Detect if this is a language course (from LLM classification OR section content)
    const isLanguageSection = courseTypeConfig?.type === 'language' || 
                               /alphabet|vocabulary|grammar|phrase|pronunciation|letter|word/i.test(step.title) || 
                               /language|arabic|spanish|kazakh/i.test(subject);

    // Detect specific section type for structured content
    // 🎯 FIX: Check for specific types BEFORE generic vocabulary to avoid "Core Vocabulary: Verbs" matching vocabulary instead of verbs
    const isAlphabetSection = /alphabet|letter|character|script/i.test(step.title);
    const isVerbSection = /\bverb|action word|conjugat/i.test(step.title);
    const isGrammarSection = /grammar|rule|structure|syntax/i.test(step.title);
    const isPhraseSection = /phrase|conversation|dialog|expression/i.test(step.title);
    // Generic vocabulary check - only if NOT a more specific section
    const isVocabularySection = !isVerbSection && !isPhraseSection && /noun|vocabulary|word|essential/i.test(step.title);
    
    // Soft skills specific section detection
    const isScenarioSection = isSoftSkillsCourse && /scenario|example|case|situation|real.?world/i.test(step.title);
    const isFrameworkSection = isSoftSkillsCourse && /framework|model|theory|principle|concept/i.test(step.title);
    const isReflectionSection = isSoftSkillsCourse && /reflection|self.?assessment|exercise|practice|action/i.test(step.title);

    const languageChunkGuidance = isLanguageSection ? `
LANGUAGE LEARNING - STRUCTURED CONTENT REQUIREMENTS:

${isAlphabetSection ? `
🔤 ALPHABET SECTION - USE THIS EXACT FORMAT:
Generate the COMPLETE alphabet as a markdown table in the content field:

## The Complete [Language] Alphabet

| Letter | Name | Sound | Example Word |
|--------|------|-------|--------------|
| أ | Alif | /a/ like 'a' in 'father' | أب (ab) = father |
| ب | Ba | /b/ like 'b' in 'book' | باب (bab) = door |
| ت | Ta | /t/ like 't' in 'table' | تمر (tamr) = date |
... CONTINUE FOR ALL LETTERS IN THE ALPHABET

⚠️ CRITICAL: Include EVERY letter. Do NOT skip any. This is a complete alphabet reference.
` : ''}

${isVocabularySection || isVerbSection ? `
📚 VOCABULARY/NOUNS/VERBS - USE THIS EXACT FORMAT:
Generate 20-30 actual words as a markdown table:

### Category: [People/Objects/Food/etc]

| Word | Romanized | Pronunciation | Meaning |
|------|-----------|---------------|---------|
| رجل | rajul | ra-JUL | man |
| امرأة | imra'a | im-RA-a | woman |
| كتاب | kitab | ki-TAB | book |

⚠️ CRITICAL: 
- NO flowing prose text - ONLY tables
- Organize by category (people, objects, food, places, etc.)
- Include 20-30 ACTUAL words, not explanations about words
` : ''}

${isGrammarSection ? `
📐 GRAMMAR RULES - USE THIS EXACT FORMAT:
Present grammar as numbered rules with examples:

### Rule 1: [Rule Name]
**Pattern:** Subject + Verb + Object
**Example:** 
- Arabic: الولد يأكل التفاحة (al-walad ya'kul al-tuffaha)
- English: The boy eats the apple

### Rule 2: [Rule Name]
**Pattern:** [Description]
**Example:**
- ...

⚠️ CRITICAL:
- NO flowing paragraphs - use structured rules
- Each rule must have: name, pattern, and example
- Include 5-8 grammar rules per chunk
` : ''}

${isPhraseSection ? `
💬 PHRASES - USE THIS EXACT FORMAT:
Generate common phrases as a table:

### Greetings

| Phrase | Romanized | Meaning | When to Use |
|--------|-----------|---------|-------------|
| صباح الخير | sabah al-khayr | Good morning | Morning greeting |
| مساء الخير | masa' al-khayr | Good evening | Evening greeting |

### Questions

| Phrase | Romanized | Meaning |
|--------|-----------|---------|
| كيف حالك؟ | kayf halak? | How are you? |
| ما اسمك؟ | ma ismuk? | What is your name? |

⚠️ CRITICAL: ONLY tables and lists, NO paragraphs
` : ''}
` : '';

    // 🎯 SOFT SKILLS SPECIFIC CHUNK GUIDANCE
    const softSkillsChunkGuidance = isSoftSkillsCourse ? `
SOFT SKILLS COURSE - STRUCTURED CONTENT REQUIREMENTS:

⚠️ CRITICAL: DO NOT USE LANGUAGE VOCABULARY FORMAT!
- NO "native", "romanized", "pronunciation" fields
- NO language-style vocabulary tables
- Instead use: frameworks, scenarios, skills, behaviors

${isFrameworkSection ? `
🧠 FRAMEWORK/CONCEPT SECTION - USE THIS FORMAT:
Present the framework with clear visual structure:

## The [Framework Name] Model

### Core Principles
1. **First Principle** - Clear description
2. **Second Principle** - Clear description
3. **Third Principle** - Clear description

### Key Components
| Component | Description | Application |
|-----------|-------------|-------------|
| Component 1 | What it means | How to apply it |
| Component 2 | What it means | How to apply it |

### Visual Representation
[Describe how this framework would look as a diagram]

⚠️ CRITICAL: Use numbered lists, tables, and structured sections
` : ''}

${isScenarioSection ? `
💼 SCENARIO/EXAMPLE SECTION - USE THIS FORMAT:
Provide COMPLETE scenarios (never truncated!):

## Real-World Scenario 1: [Descriptive Title]

### The Situation
[FULL description of the scenario - at least 50-100 words]
Who is involved, what's the context, what happened?

### The Challenge
What specific problem or dilemma does the person face?

### Effective Approach
1. **Step 1**: [Action] - Why it works
2. **Step 2**: [Action] - Why it works
3. **Step 3**: [Action] - Why it works

### Ineffective Approach (What NOT to do)
- ❌ [Wrong behavior] - Why it fails

### The Outcome
What happens when the effective approach is applied?

---

## Real-World Scenario 2: [Title]
[Repeat the full structure - NEVER truncate!]

⚠️ CRITICAL: 
- Minimum 2-3 COMPLETE scenarios per section
- NEVER cut off mid-sentence with "..." or "#"
- Each scenario must be fully fleshed out
- Include both DO and DON'T examples
` : ''}

${isReflectionSection ? `
🪞 REFLECTION/PRACTICE SECTION - USE THIS FORMAT:
Interactive self-assessment and action planning:

## Self-Assessment Checklist

Rate yourself (1-5) on each behavior:

| Skill | Never (1) | Rarely (2) | Sometimes (3) | Often (4) | Always (5) |
|-------|-----------|------------|---------------|-----------|------------|
| [Skill 1] | ○ | ○ | ○ | ○ | ○ |
| [Skill 2] | ○ | ○ | ○ | ○ | ○ |

## Reflection Questions

1. **Describe a situation where you demonstrated [skill]:**
   _Your response:_

2. **What challenges do you face when trying to [behavior]?**
   _Your response:_

3. **Who is someone you admire for their [skill]? Why?**
   _Your response:_

## Action Plan Template

| Goal | Specific Action | Timeline | Success Measure |
|------|-----------------|----------|-----------------|
| | | | |

⚠️ CRITICAL: Make it interactive and actionable
` : ''}

📊 QUIZ FORMAT FOR SOFT SKILLS:
- Use SCENARIO-BASED questions, not memorization
- Questions should present a situation and ask for the best response
- All 4 options must be plausible behaviors (not obviously wrong)
- Explain WHY the correct answer is best

Example soft skills quiz question:
{
  "question": "Your team member frequently interrupts others in meetings. What is the MOST effective first step?",
  "options": [
    "Have a private conversation to understand their perspective",
    "Call them out in the next meeting when it happens",
    "Send an email to the whole team about meeting etiquette",
    "Escalate the issue to HR immediately"
  ],
  "correctAnswer": "Have a private conversation to understand their perspective",
  "explanation": "A private conversation shows respect and allows you to understand the root cause before escalating. This demonstrates emotional intelligence and effective conflict resolution."
}
` : '';

    // Determine if content is for children or adults
    const isChildContent = /kid|child|young|beginner|elementary/i.test(level) || /kid|child/i.test(subject);
    const imageStyle = isChildContent ? '3D Pixar-style cartoon' : 'clean educational illustration';
    
    // Build chunk context for progressive learning (what comes before each chunk)
    const chunkSequenceInfo = chunkTypes.map((ct, idx) => {
      const priorChunks = chunkTypes.slice(0, idx);
      const priorContent = priorChunks.map(p => p.type).join(', ');
      return `Chunk ${idx + 1} (${ct.type}): Comes AFTER [${priorContent || 'nothing - this is first'}]`;
    }).join('\n');
    
    // SIMPLIFIED PROMPT for reliable JSON parsing
    const prompt = `Create ${chunkTypes.length} bite-sized learning chunks for: "${step.title}"
Subject: ${subject}, Level: ${level}

CHUNK TYPES NEEDED:
${chunkTypes.map((t, i) => `${i + 1}. ${t.type}`).join(', ')}

═══════════════════════════════════════════════════════════════════
🔒 UNIVERSAL GENERATION RULES (MUST FOLLOW FOR ALL CHUNKS):
═══════════════════════════════════════════════════════════════════

RULE 1: PICTURE-BASED/VISUAL LEARNING MINIMUM
When generating visual learning content (type="visual" or "vocabulary" with images):
- Generate AT LEAST 10 distinct visual examples
- Each example MUST relate to content previously covered in this section
- Examples should build on what was taught, not introduce new concepts
- For vocabulary: 10+ words with imagePrompt for each visual noun

RULE 2: QUIZ CONTENT RESTRICTION (CRITICAL)
Quiz chunks must ONLY test what was ALREADY introduced in PREVIOUS chunks:
- If chunks 1-3 taught letters "أ ب ت" (a, b, t), the quiz in chunk 4 tests ONLY those 3 letters
- NEVER introduce new content in quizzes - quizzes are for REVIEW, not teaching
- If a concept hasn't been covered yet, it CANNOT appear in the quiz
- Quiz questions must reference SPECIFIC examples from earlier chunks

CHUNK SEQUENCE (for reference):
${chunkSequenceInfo}

═══════════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════
📚 CONTENT FORMATTING RULES (ALL COURSE TYPES):
═══════════════════════════════════════════════════════════════════

FOR ANY "content" FIELD - USE PROPER MARKDOWN:
✅ GOOD: "## Key Concepts\\n\\n### Definition\\n**Term**: Description\\n\\n| Column1 | Column2 |\\n|---------|---------|\\n| Data | More |"
❌ BAD: Raw text without formatting, JSON-like output, or semicolon-separated data

⚠️ CRITICAL TABLE FORMATTING (MUST FOLLOW EXACTLY):
Tables MUST have ALL cells on the SAME line, separated by pipes:
✅ CORRECT TABLE FORMAT:
| Term | Meaning |
|------|---------|
| Psychology | The study of mind |
| Behavior | Observable actions |

❌ WRONG TABLE FORMAT (DO NOT DO THIS):
| Term
| Meaning
------
| Psychology
| The study of mind

Each row MUST be a single line with | separating cells and | at start AND end!

${isLanguageSection ? `
🌍 LANGUAGE COURSE SPECIFIC:
- Include vocabulary with: native, romanized, pronunciation, meaning
- For VISUAL NOUNS (man, woman, ball, house, car, dog, cat, food, etc.), add:
  "imagePrompt": "${imageStyle} of [concept]. No text, no letters, pure visual."
  "isVisualConcept": true
- Quiz questions should ONLY test vocabulary that was explicitly taught in PRIOR chunks
- ⚠️ If you taught 5 letters, the quiz tests those 5 letters ONLY - not 6, not 7
` : `
📖 GENERAL COURSE SPECIFIC:
- Use clear markdown with ## headers, bullet points, and tables
- Include practical examples relevant to the topic
- Key terms should be **bold** and defined clearly
- Use tables for any structured/comparative information
`}

═══════════════════════════════════════════════════════════════════

CRITICAL: Return ONLY a JSON array. Content fields use markdown. NO raw JSON in content.

JSON FORMAT:
[
  {
    "title": "Title",
    "content": "Teaching content",
    "type": "${chunkTypes[0].type}",
    "keyPoint": "Key takeaway"
  }
]

${chunkTypes.some(c => c.type === 'quiz') ? `
⚠️ CRITICAL FOR QUIZ CHUNKS (type="quiz"):
EVERY quiz chunk MUST have a "quizQuestions" array with COMPREHENSIVE coverage.
Each question MUST have exactly 4 options and the correctAnswer MUST match one option exactly.

🎯 MANDATORY: QUIZ EVERYTHING THAT WAS TAUGHT
═══════════════════════════════════════════════════════════════════
THE QUIZ MUST TEST EVERY SINGLE ITEM INTRODUCED IN THIS SECTION.
- If you taught 15 vocabulary words → create 15 questions (one per word)
- If you taught 10 grammar rules → create 10 questions (one per rule)  
- If you taught 8 concepts → create 8 questions (one per concept)
- If you taught 28 letters → divide across quiz chunks to cover ALL 28

NO ITEM LEFT UNTESTED. Every word, letter, concept, rule, or fact 
that was introduced MUST have a corresponding quiz question.

This is NON-NEGOTIABLE. Partial coverage is unacceptable.
═══════════════════════════════════════════════════════════════════

🔒 QUIZ SCOPE RESTRICTION:
- Quizzes test ONLY content from PREVIOUS chunks in this section
- If earlier chunks taught A, B, C → quiz tests ALL of A, B, C
- NEVER test content that hasn't been explicitly introduced yet
- Each question must reference material from a specific earlier chunk

${isLanguageSection ? `FOR LANGUAGE QUIZZES - COMPREHENSIVE TESTING REQUIRED:
⚠️ Test EVERY vocabulary word/letter that was taught - no exceptions!
If you taught 10 words, create 10 questions. If you taught 28 letters, quiz on all 28.

Example - if chunks 1-2 taught: مرحبا (hello), شكراً (thank you), نعم (yes)
Then the quiz MUST have 3 questions - one for EACH word:
{
  "type": "quiz",
  "title": "Vocabulary Check",
  "content": "Test ALL words learned",
  "quizQuestions": [
    {
      "question": "What does 'مرحبا' (marhaba) mean in English?",
      "options": ["Hello", "Goodbye", "Thank you", "Please"],
      "correctAnswer": "Hello",
      "explanation": "مرحبا (marhaba) is the Arabic word for Hello"
    },
    {
      "question": "What does 'شكراً' (shukran) mean in English?",
      "options": ["Thank you", "Hello", "Yes", "No"],
      "correctAnswer": "Thank you",
      "explanation": "شكراً (shukran) means thank you"
    },
    {
      "question": "What does 'نعم' (naam) mean in English?",
      "options": ["Yes", "No", "Maybe", "Hello"],
      "correctAnswer": "Yes",
      "explanation": "نعم (naam) means yes"
    }
  ]
}
✅ CORRECT: All 3 words tested with 3 questions
❌ WRONG: Only testing 2 of 3 words - EVERY item must be tested
❌ WRONG: Testing words that weren't taught yet` : `FOR CONCEPT QUIZZES:
⚠️ ONLY test concepts that were explained in EARLIER chunks!

{
  "type": "quiz",
  "title": "Knowledge Check",
  "content": "Verify your understanding",
  "quizQuestions": [
    {
      "question": "What is the main concept?",
      "options": ["Correct answer here", "Wrong option 1", "Wrong option 2", "Wrong option 3"],
      "correctAnswer": "Correct answer here",
      "explanation": "This is correct because it was covered in chunk X"
    }
  ]
}`}

VALIDATION RULES:
1. correctAnswer must EXACTLY match one of the 4 options
2. NO QUIZ CHUNK WITHOUT quizQuestions - this is mandatory!
3. QUIZ SCOPE: Only test previously covered material!
4. ⚠️ COMPLETE QUESTIONS REQUIRED: Every question must be a COMPLETE sentence!
   ════════════════════════════════════════════════════════════════
   THIS IS CRITICAL - INCOMPLETE QUESTIONS BREAK THE QUIZ EXPERIENCE
   
   ✅ GOOD EXAMPLES (COMPLETE sentences with the target word included):
   - "What does the Spanish verb 'hablar' mean in English?"
   - "Which letter in the Arabic alphabet makes the 'b' sound?"
   - "What is the meaning of 'madre' in Spanish?"
   - "Which of these is the correct translation of 'father'?"
   
   ❌ BAD EXAMPLES (INCOMPLETE - NEVER GENERATE THESE):
   - "What does the Latin word" (TRUNCATED - missing the actual word!)
   - "Which verb means" (TRUNCATED - missing the verb being asked about!)
   - "What is the meaning of" (TRUNCATED - no word specified!)
   - "Which letter makes the" (TRUNCATED - no sound specified!)
   
   THE WORD/CONCEPT BEING TESTED MUST BE IN THE QUESTION TEXT!
   If asking about 'padre', the question must contain 'padre'.
   If asking about the letter 'B', the question must mention 'B'.
   ════════════════════════════════════════════════════════════════
5. Each question must include the specific word/concept being tested
` : ''}

🎯 VOCABULARY ITEMS FORMAT (USE FOR ANY WORD LISTS OR EXAMPLES):
═══════════════════════════════════════════════════════════════════
Whenever you have a list of words, terms, phrases, or examples - use vocabularyItems array!
This enables beautiful interactive vocabulary cards and quiz integration.

"vocabularyItems": [
  {"native": "Word1", "romanized": "word1", "pronunciation": "pron1", "meaning": "meaning1"},
  {"native": "Term2", "romanized": "term2", "pronunciation": "pron2", "meaning": "definition2"},
  ... (include ALL words/terms/examples you introduce)
]

USE vocabularyItems FOR:
- Vocabulary lists (native, romanized, pronunciation, meaning)
- Key terms and definitions (use "native" for term, "meaning" for definition)
- Example sentences (use "native" for sentence, "meaning" for translation)
- Concept lists (use "native" for concept name, "meaning" for explanation)

${chunkTypes.some(c => c.type === 'vocabulary') ? `
⚠️ VOCABULARY CHUNKS SPECIFICALLY:
- MINIMUM 10 vocabularyItems per vocabulary chunk!
- For visual nouns (man, woman, house, cat), add:
  "imagePrompt": "${imageStyle} of [concept]. No text."
  "isVisualConcept": true
` : ''}

${chunkTypes.some(c => c.type === 'practice') ? `
⚠️ PRACTICE CHUNKS SPECIFICALLY (type="practice"):
═══════════════════════════════════════════════════════════════════
Practice chunks MUST have SUBSTANTIAL, ACTIONABLE content:

STRUCTURE:
{
  "type": "practice",
  "title": "Practice: [Activity Name]",
  "content": "## Practice Exercise\\n\\n### Instructions\\n[Clear steps]\\n\\n### Your Task\\n[Specific activity]\\n\\n### Example\\n[Show completed example]\\n\\n### Check Your Work\\n[How to verify]",
  "keyPoint": "Practice makes perfect!"
}

${isLanguageSection ? `FOR LANGUAGE PRACTICE:
- Sentence building exercises using taught vocabulary
- Fill-in-the-blank with vocabulary items as answers
- Translation practice (both directions)
- Pronunciation practice with phonetic guides
- Include vocabularyItems with the words to practice!

EXAMPLE PRACTICE FOR LANGUAGE:
{
  "type": "practice",
  "title": "Practice: Build Sentences",
  "content": "## Sentence Building Practice\\n\\n### Using vocabulary you learned, build sentences:\\n\\n**Exercise 1:** Introduce yourself\\nCombine: [greeting] + [my name is] + [your name]\\n\\n**Exercise 2:** Greet and ask how someone is\\n\\n**Exercise 3:** Say goodbye politely\\n\\n### Check Your Answers\\nSpeak each sentence out loud 3 times.",
  "vocabularyItems": [... include relevant vocabulary for practice],
  "keyPoint": "Practice saying each phrase 3 times!"
}` : `FOR GENERAL PRACTICE:
- Step-by-step exercises that apply the concepts
- Real-world scenarios to work through
- Self-assessment checklists
- Examples with solutions to compare against
`}

⚠️ NEVER leave practice chunks empty! Each must have:
- Clear instructions
- Specific exercises
- Examples or expected outcomes
═══════════════════════════════════════════════════════════════════
` : ''}

${chunkTypes.some(c => c.type === 'example') ? `
⚠️ EXAMPLE CHUNKS SPECIFICALLY (type="example"):
═══════════════════════════════════════════════════════════════════
Example chunks MUST include concrete, specific examples with CONTENT:

STRUCTURE:
{
  "type": "example",
  "title": "Example: [Specific Scenario]",
  "content": "## Real-World Example\\n\\n### Scenario\\n[Describe the situation]\\n\\n### Solution\\n[Step-by-step walkthrough]\\n\\n### Key Insight\\n[What this teaches us]",
  "keyPoint": "Main lesson from this example"
}

${isLanguageSection ? `FOR LANGUAGE EXAMPLES:
- Include vocabularyItems with ALL words used in the example
- Show complete sentences with translations
- Include pronunciation guides

EXAMPLE:
{
  "type": "example",
  "title": "Example: Greeting a Friend",
  "content": "## Greeting a Friend\\n\\n### Scenario\\nYou see your friend Ahmed at the café...\\n\\n### Dialogue\\n**You:** مرحبا، كيف حالك؟\\n**Friend:** بخير، شكراً!\\n\\n### Breakdown\\n...",
  "vocabularyItems": [
    {"native": "مرحبا", "romanized": "marhaba", "pronunciation": "mar-HA-ba", "meaning": "Hello"},
    {"native": "كيف حالك", "romanized": "kayf halak", "pronunciation": "kayf HA-lak", "meaning": "How are you?"}
  ],
  "keyPoint": "Use مرحبا for informal greetings with friends"
}` : `FOR GENERAL EXAMPLES:
- Include vocabularyItems with key terms demonstrated
- Show clear before/after or step-by-step
- Highlight the principle being illustrated
`}

⚠️ EVERY example chunk must have SUBSTANTIAL content - no empty or placeholder examples!
═══════════════════════════════════════════════════════════════════
` : ''}

${chunkTypes.some(c => c.type === 'concept' || c.type === 'hook' || c.type === 'recap') ? `
⚠️ CONCEPT/HOOK/RECAP CHUNKS - ALWAYS INCLUDE vocabularyItems:
═══════════════════════════════════════════════════════════════════
When introducing ANY key terms, definitions, or words - add them to vocabularyItems:

{
  "type": "concept",
  "title": "Understanding [Topic]",
  "content": "## [Topic]\\n\\n### Key Definition\\n**[Term]**: [Clear explanation]\\n\\n...",
  "vocabularyItems": [
    {"native": "Term1", "romanized": "", "pronunciation": "", "meaning": "Definition of term 1"},
    {"native": "Term2", "romanized": "", "pronunciation": "", "meaning": "Definition of term 2"}
  ],
  "keyPoint": "Main takeaway"
}

This ensures ALL introduced terms appear as interactive cards!
═══════════════════════════════════════════════════════════════════
` : ''}

⚠️ CRITICAL: Any content with terms/words MUST use vocabularyItems format
This ensures proper display AND inclusion in reviews/quizzes!
═══════════════════════════════════════════════════════════════════

Output ${chunkTypes.length} chunks. Content in ${languageName}.`;

    // 🎯 WORKING: No response_format, use regex extraction (like commit 2d9d24a)
    // 🎯 FIX: Increase maxTokens for soft skills (scenarios need more content)
    const needsMoreTokens = isSoftSkillsCourse || step.type === 'scenario' || step.type === 'example';
    const response = await this.toolRegistry.execute('llm-completion', {
      prompt: `${prompt}\n\nRespond with ONLY valid JSON. Format: {"chunks": [...]}`,
      model: 'accounts/fireworks/models/gpt-oss-120b',
      temperature: 0.5,
      maxTokens: needsMoreTokens ? 6000 : 4000  // More tokens for scenario-heavy content
    }, {});

    const responseText = this.extractResponseText(response);
    
    // 🎯 WORKING: Extract JSON with regex (like commit 2d9d24a)
    let chunksData = responseText;
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed && parsed.chunks && Array.isArray(parsed.chunks)) {
          chunksData = JSON.stringify(parsed.chunks);
        }
      } catch {
        // If parsing fails, continue with original responseText
      }
    }
    
    // DEBUG: Log if quiz chunks were requested and what we got back
    const hasQuizType = chunkTypes.some(c => c.type === 'quiz');
    if (hasQuizType) {
      console.log(`🎯 QUIZ DEBUG for "${step.title}":`, {
        requestedQuiz: true,
        responseLength: chunksData.length,
        hasQuizQuestionsInResponse: chunksData.includes('quizQuestions'),
        responsePreview: chunksData.substring(0, 500)
      });
    }
    
    const parsedChunks = this.parseChunks(chunksData, step.stepNumber, chunkTypes, step.title);
    
    // Log what quiz chunks we actually got
    const quizChunks = parsedChunks.filter(c => c.type === 'quiz');
    if (quizChunks.length > 0) {
      console.log(`✅ Generated ${quizChunks.length} quiz chunks:`, quizChunks.map((c, i) => ({
        chunkIndex: i,
        title: c.title,
        hasQuestions: !!c.quizQuestions,
        questionCount: c.quizQuestions?.length || 0
      })));
    } else if (hasQuizType) {
      console.warn(`⚠️ Quiz chunks were requested but NONE were generated for "${step.title}"`);
    }
    
    return parsedChunks;
  }

  /**
   * Get chunk types based on section type
   * Enhanced with quiz chunks for comprehension checking
   */
  private getChunkTypesForSection(sectionType: CourseSection['type']): Array<{type: CourseChunk['type'], description: string}> {
    const typeConfigs: Record<string, Array<{type: CourseChunk['type'], description: string}>> = {
      'introduction': [
        { type: 'hook', description: 'Why This Matters' },
        { type: 'concept', description: 'Core Concepts' },
        { type: 'visual', description: 'The Big Picture' },
        { type: 'example', description: 'Real-World Example' },
        { type: 'quiz', description: 'Quick Check' },
        { type: 'recap', description: 'Summary' }
      ],
      'core_concept': [
        { type: 'hook', description: 'Building on What You Know' },
        { type: 'concept', description: 'Key Concepts' },
        { type: 'vocabulary', description: 'Key Terms' },
        { type: 'example', description: 'Worked Example' },
        { type: 'visual', description: 'Visual Guide' },
        { type: 'quiz', description: 'Knowledge Check' },
        { type: 'practice', description: 'Practice Time' }
      ],
      'example': [
        { type: 'hook', description: 'Setting the Scene' },
        { type: 'example', description: 'Step 1' },
        { type: 'example', description: 'Step 2' },
        { type: 'concept', description: 'Why This Works' },
        { type: 'quiz', description: 'Test Your Understanding' },
        { type: 'practice', description: 'Your Turn' }
      ],
      'practice': [
        { type: 'concept', description: 'Quick Review' },
        { type: 'quiz', description: 'Warm-Up Quiz' },
        { type: 'practice', description: 'Exercise 1' },
        { type: 'practice', description: 'Exercise 2' },
        { type: 'example', description: 'Solution Walkthrough' },
        { type: 'quiz', description: 'Mastery Check' }
      ],
      'summary': [
        { type: 'recap', description: 'Key Takeaway 1' },
        { type: 'recap', description: 'Key Takeaway 2' },
        { type: 'visual', description: 'Connecting Everything' },
        { type: 'quiz', description: 'Final Assessment' },
        { type: 'hook', description: 'What\'s Next' }
      ],
      'checkpoint': [
        { type: 'recap', description: 'Progress Review' },
        { type: 'quiz', description: 'Knowledge Check' },
        { type: 'quiz', description: 'Application Check' },
        { type: 'concept', description: 'Tricky Concepts' },
        { type: 'hook', description: 'Keep Going!' }
      ],
      // Special type for language learning alphabet sections
      'alphabet': [
        { type: 'hook', description: 'Introduction to the writing system' },
        { type: 'vocabulary', description: 'First batch of letters (ALL letters must be covered across vocabulary chunks)' },
        { type: 'quiz', description: 'Quiz testing ALL letters taught so far - one question per letter, 100% coverage' },
        { type: 'vocabulary', description: 'Next batch of letters with pronunciation' },
        { type: 'quiz', description: 'Quiz testing ALL letters covered - every single letter must be tested' },
        { type: 'practice', description: 'Write/type the letters practice' }
      ],
      // Special type for vocabulary sections
      'vocabulary': [
        { type: 'hook', description: 'Why These Words Matter' },
        { type: 'vocabulary', description: 'Essential Words Part 1' },
        { type: 'quiz', description: 'Vocabulary Quiz 1' },
        { type: 'vocabulary', description: 'Essential Words Part 2' },
        { type: 'quiz', description: 'Vocabulary Quiz 2' },
        { type: 'practice', description: 'Practice Using Words' }
      ]
    };

    return typeConfigs[sectionType] || typeConfigs['core_concept'];
  }

  /**
   * Parse chunks from LLM response with robust error handling
   */
  private parseChunks(
    responseText: string,
    stepNumber: number,
    chunkTypes: Array<{type: CourseChunk['type'], description: string}>,
    sectionTitle: string = 'this section'
  ): CourseChunk[] {
    try {
      // Comprehensive cleaning
      let cleaned = responseText.trim()
        // Remove markdown code blocks
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        // Normalize quotes
        .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
        .replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4]/g, "'")
        // Normalize dashes
        .replace(/[\u2010-\u2015\u2212\u2043]/g, '-')
        // Remove control characters
        .replace(/[\x00-\x1F\x7F]/g, ' ')
        // Remove problematic unicode
        .replace(/[\u2028\u2029]/g, ' ');
      
      // Find array bounds
      const startIdx = cleaned.indexOf('[');
      const endIdx = cleaned.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        cleaned = cleaned.slice(startIdx, endIdx + 1);
      }

      // AGGRESSIVE FIX: Clean all string values
      cleaned = cleaned.replace(/"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g, (match, key, value) => {
        let cleanValue = value
          .replace(/[\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return `"${key}": "${cleanValue}"`;
      });

      // Fix common issues
      cleaned = cleaned
        .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
        .replace(/}\s*{/g, '},{')      // Fix missing commas between objects
        .replace(/]\s*\[/g, '],[');    // Fix missing commas between arrays

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        // FALLBACK: Try to extract chunks manually
        console.log('JSON parse failed, attempting manual extraction...');
        parsed = this.extractChunksManually(cleaned, chunkTypes);
      }
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('No chunks extracted');
      }

      const resultChunks: CourseChunk[] = parsed.map((chunk: any, index: number) => {
        // 🎯 FIX: ENFORCE expected chunk types - LLM often returns wrong types
        // If we have a defined type for this position, use it regardless of what LLM returned
        const expectedType = chunkTypes[index]?.type;
        const llmType = chunk.type as CourseChunk['type'];
        
        // Prefer expected type, but use LLM type if no expected or if LLM type matches a valid chunk type
        const chunkType = expectedType || llmType || 'concept';
        
        // Log when we're correcting chunk types
        if (expectedType && llmType && expectedType !== llmType) {
          console.log(`📝 Correcting chunk ${index + 1} type: LLM returned "${llmType}", expected "${expectedType}"`);
        }
        
        // Parse quiz questions if present
        let quizQuestions = undefined;
        if (chunk.quizQuestions && Array.isArray(chunk.quizQuestions)) {
          quizQuestions = chunk.quizQuestions
            .map((q: any, qIdx: number) => {
              const question = String(q.question || '').trim();
              const options = Array.isArray(q.options) ? q.options.map(String) : undefined;
              const correctAnswer = String(q.correctAnswer || '').trim();
              
              // 🎯 FIX: Validate and REPAIR truncated questions
              // If question looks incomplete, try to fix it using the correctAnswer
              const incompletePatterns = [
                /\s(the|a|an|what|which|how|who|is|are|does|do|can|will|should|would|could)$/i,
                /\s(Latin|Spanish|French|German|Arabic|word|verb|noun|letter|means?)$/i
              ];
              
              const isIncomplete = 
                question.length < 15 || 
                incompletePatterns.some(p => p.test(question));
              
              let repairedQuestion = question;
              if (isIncomplete && correctAnswer) {
                console.warn(`⚠️ Incomplete quiz question detected: "${question}" - REPAIRING with answer context`);
                // Repair the question based on pattern and correct answer
                if (question.match(/what does.*(word|verb|noun)?$/i)) {
                  repairedQuestion = `What does '${correctAnswer}' mean?`;
                } else if (question.match(/which (verb|word|letter) means?$/i)) {
                  repairedQuestion = `Which word means '${correctAnswer}'?`;
                } else if (question.match(/what is the meaning/i)) {
                  repairedQuestion = `What is the meaning of the word that translates to '${correctAnswer}'?`;
                } else if (question.match(/which letter makes/i)) {
                  repairedQuestion = `Which letter makes the '${correctAnswer}' sound?`;
                } else {
                  // Generic repair using the answer
                  repairedQuestion = `Which of these is '${correctAnswer}'?`;
                }
                console.log(`  ✅ Repaired to: "${repairedQuestion}"`);
              }
              
              // Validate options exist and answer matches
              if (!options || options.length < 2) {
                console.warn(`⚠️ Invalid quiz options in step ${stepNumber}: options=${options?.length}`);
                return null;
              }
              
              // Ensure correctAnswer is in options
              if (!options.includes(correctAnswer)) {
                console.warn(`⚠️ correctAnswer "${correctAnswer}" not in options: ${JSON.stringify(options)}`);
                return null;
              }
              
              return {
            id: `step${stepNumber}_chunk${index + 1}_q${qIdx + 1}`,
                question: repairedQuestion,
            questionType: q.questionType || 'multiple_choice',
                options,
                correctAnswer,
            hint: q.hint ? String(q.hint).trim() : undefined,
            explanation: q.explanation ? String(q.explanation).trim() : undefined,
            targetWord: q.targetWord,
            transliteration: q.transliteration,
            pronunciation: q.pronunciation
              };
            })
            .filter(Boolean); // Remove null entries (invalid questions)
        }
        
        // 🐛 FIX: If this is a quiz chunk but has NO quizQuestions, generate contextual fallback
        if (chunkType === 'quiz' && (!quizQuestions || quizQuestions.length === 0)) {
          console.warn(`⚠️ Quiz chunk without questions in step ${stepNumber}, chunk ${index + 1}. Generating contextual fallback from section content.`);
          
          // Use sectionTitle parameter for context
          const isLanguageSection = /alphabet|vocabulary|grammar|phrase|word|letter/i.test(sectionTitle);
          
          if (isLanguageSection) {
            // Language-specific fallback questions
            quizQuestions = [
              {
                id: `step${stepNumber}_chunk${index + 1}_q1`,
                question: `Which of these is a correct translation from "${sectionTitle}"?`,
                questionType: 'multiple_choice',
                options: ['Translation A (correct)', 'Translation B (similar)', 'Translation C (different)', 'Translation D (unrelated)'],
                correctAnswer: 'Translation A (correct)',
                explanation: 'Pay attention to the exact meanings covered in this section.'
              },
              {
                id: `step${stepNumber}_chunk${index + 1}_q2`,
                question: `What pattern did we learn in "${sectionTitle}"?`,
                questionType: 'multiple_choice',
                options: ['Pattern 1 (correct)', 'Pattern 2 (partially correct)', 'Pattern 3 (opposite)', 'Pattern 4 (unrelated)'],
                correctAnswer: 'Pattern 1 (correct)',
                explanation: 'This pattern helps you construct new sentences.'
              },
              {
                id: `step${stepNumber}_chunk${index + 1}_q3`,
                question: `How would you use what you learned in a real conversation?`,
                questionType: 'multiple_choice',
                options: ['Correct usage', 'Formal only', 'Informal only', 'Written only'],
                correctAnswer: 'Correct usage',
                explanation: 'Practice using these in context.'
              }
            ];
          } else {
            // General knowledge fallback questions
            quizQuestions = [
              {
                id: `step${stepNumber}_chunk${index + 1}_q1`,
                question: `What is the main concept from "${sectionTitle}"?`,
                questionType: 'multiple_choice',
                options: ['The primary concept', 'A related concept', 'An opposite approach', 'An unrelated topic'],
                correctAnswer: 'The primary concept',
                explanation: 'Focus on the core ideas presented.'
              },
              {
                id: `step${stepNumber}_chunk${index + 1}_q2`,
                question: `How does "${sectionTitle}" apply in practice?`,
                questionType: 'multiple_choice',
                options: ['Direct application', 'Theoretical only', 'Historical context', 'No practical use'],
                correctAnswer: 'Direct application',
                explanation: 'Understanding practical applications helps retention.'
              },
              {
                id: `step${stepNumber}_chunk${index + 1}_q3`,
                question: `Which key point from "${sectionTitle}" is most important?`,
                questionType: 'multiple_choice',
                options: ['The foundational concept', 'An advanced detail', 'A minor point', 'An optional extra'],
                correctAnswer: 'The foundational concept',
                explanation: 'Building on fundamentals ensures solid understanding.'
              }
            ];
          }
        }
        
        // Parse vocabulary items if present - with image prompts for visual concepts
        let vocabularyItems = undefined;
        if (chunk.vocabularyItems && Array.isArray(chunk.vocabularyItems)) {
          vocabularyItems = chunk.vocabularyItems.map((v: any) => ({
            native: String(v.native || '').trim(),
            romanized: String(v.romanized || '').trim(),
            pronunciation: String(v.pronunciation || '').trim(),
            meaning: String(v.meaning || '').trim(),
            imageUrl: v.imageUrl,
            imagePrompt: v.imagePrompt ? String(v.imagePrompt).trim() : undefined,
            audioUrl: v.audioUrl,
            isVisualConcept: Boolean(v.isVisualConcept)
          }));
        }
        
        // 🎯 FIX: Parse vocabulary from content field if vocabularyItems is missing
        // LLM sometimes outputs vocabulary as raw text like "1: Salve - imagePrompt: a friendly Roman greeting"
        // Also check for word lists in ANY chunk type, not just vocabulary chunks
        const contentStr = String(chunk.content || '');
        if (!vocabularyItems || vocabularyItems.length === 0) {
          // Check for imagePrompt patterns (language courses)
          if (contentStr.includes('imagePrompt:') || contentStr.includes('- imagePrompt')) {
            console.log('🔧 Parsing vocabulary from raw content text (imagePrompt pattern)...');
            vocabularyItems = this.parseVocabularyFromContent(contentStr);
          }
          // Check for markdown table with Word/Term columns (any course type)
          else if (contentStr.match(/\|\s*(Word|Term|Concept|Native)\s*\|/i) && contentStr.includes('|')) {
            console.log('🔧 Parsing vocabulary from markdown table...');
            vocabularyItems = this.parseVocabularyFromTable(contentStr);
          }
          // Check for definition list patterns (Key: Value format)
          else if (contentStr.match(/^[\*\-]\s*\*\*[^*]+\*\*:\s*.+/m)) {
            console.log('🔧 Parsing vocabulary from definition list...');
            vocabularyItems = this.parseVocabularyFromDefinitionList(contentStr);
          }
        }
        
        // 🎯 FIX: Clean content - remove raw imagePrompt annotations that shouldn't be displayed
        let cleanedContent = contentStr;
        if (contentStr.includes('imagePrompt:') || contentStr.includes('- imagePrompt')) {
          cleanedContent = this.cleanVocabularyContent(contentStr);
        }
        
        // Parse quiz gate settings
        let quizGate = undefined;
        if (chunk.quizGate) {
          quizGate = {
            enabled: Boolean(chunk.quizGate.enabled),
            requiredScore: Number(chunk.quizGate.requiredScore) || 70,
            retryAllowed: chunk.quizGate.retryAllowed !== false
          };
        }
        
        // Determine interaction type based on chunk type
        let interactionType = chunk.interactionType || 'read';
        if (chunkType === 'quiz') interactionType = 'quiz';
        if (chunkType === 'vocabulary') interactionType = 'speak';
        
        return {
          id: `step${stepNumber}_chunk${index + 1}`,
          chunkNumber: index + 1,
          title: String(chunk.title || `Part ${index + 1}`).trim(),
          content: cleanedContent, // 🎯 Use cleaned content without raw imagePrompt annotations
          type: chunkType,
          estimatedSeconds: Math.min(180, Math.max(60, (cleanedContent.split(/\s+/).length || 50) * 2)),
          keyPoint: String(chunk.keyPoint || '').trim(),
          interactionType,
          imagePrompt: chunk.imagePrompt || null,
          isCompleted: false,
          isLocked: index > 0,
          quizQuestions,
          vocabularyItems,
          quizGate
        };
      });
      
      // 🎯 FIX: Ensure we have ALL expected chunks - fill in missing ones
      if (resultChunks.length < chunkTypes.length) {
        console.warn(`⚠️ LLM returned ${resultChunks.length} chunks but expected ${chunkTypes.length}. Filling in missing chunks.`);
        
        for (let i = resultChunks.length; i < chunkTypes.length; i++) {
          const missingType = chunkTypes[i];
          console.log(`  📝 Creating fallback for missing chunk ${i + 1}: ${missingType.type} - ${missingType.description}`);
          
          resultChunks.push({
            id: `step${stepNumber}_chunk${i + 1}`,
            chunkNumber: i + 1,
            title: missingType.description,
            content: `This section covers: ${missingType.description}. We're exploring the key concepts and practical applications related to ${sectionTitle}.`,
            type: missingType.type,
            estimatedSeconds: 90,
            keyPoint: `Focus on understanding ${missingType.description}`,
            interactionType: 'read' as const,
            imagePrompt: undefined,
            isCompleted: false,
            isLocked: i > 0,
            quizQuestions: missingType.type === 'quiz' ? [
              {
                id: `step${stepNumber}_chunk${i + 1}_q1`,
                question: `What is the main concept from "${sectionTitle}"?`,
                questionType: 'multiple_choice' as const,
                options: ['The primary concept', 'A related concept', 'An opposite approach', 'An unrelated topic'],
                correctAnswer: 'The primary concept',
                explanation: 'Focus on the core ideas presented.'
              }
            ] : undefined,
            vocabularyItems: undefined,
            quizGate: undefined
          });
        }
      }
      
      return resultChunks;
    } catch (error) {
      console.error('Failed to parse chunks:', error);
      return this.createFallbackChunks({ stepNumber } as CourseStep);
    }
  }

  /**
   * 🔤 Validate alphabet content is complete
   * Returns true if alphabet appears complete, false if missing letters
   */
  private validateAlphabetCompleteness(content: string, subject: string): { isComplete: boolean; letterCount: number; expected: { min: number; max: number } } {
    // Detect language from subject
    const subjectLower = subject.toLowerCase();
    let alphabetInfo = ALPHABET_SIZES['default'];
    
    for (const [lang, info] of Object.entries(ALPHABET_SIZES)) {
      if (subjectLower.includes(lang)) {
        alphabetInfo = info;
        break;
      }
    }
    
    // Count table rows (letters) in content
    // Pattern: | letter | ... | (markdown table rows)
    const tableRowPattern = /^\|[^|]+\|[^|]+\|[^|]+\|/gm;
    const tableRows = content.match(tableRowPattern) || [];
    // Subtract header row if present
    const letterCount = Math.max(0, tableRows.length - 1);
    
    // Also count any standalone letter entries (for non-table formats)
    // Pattern: single letter/character followed by explanation
    const letterListPattern = /^[\u0600-\u06FF\u0400-\u04FF\u0590-\u05FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0900-\u097FA-Za-z]\s*[-–—:]\s*.+$/gm;
    const letterListMatches = content.match(letterListPattern) || [];
    
    const totalLetters = Math.max(letterCount, letterListMatches.length);
    
    const isComplete = totalLetters >= alphabetInfo.minLetters;
    
    console.log(`🔤 Alphabet validation for ${subject}: ${totalLetters} letters found, expected ${alphabetInfo.minLetters}-${alphabetInfo.maxLetters}`);
    
    return {
      isComplete,
      letterCount: totalLetters,
      expected: { min: alphabetInfo.minLetters, max: alphabetInfo.maxLetters }
    };
  }

  /**
   * 🔤 Generate complete alphabet content when initial generation is incomplete
   */
  private async generateCompleteAlphabet(subject: string, level: DifficultyLevel): Promise<string> {
    const subjectLower = subject.toLowerCase();
    let alphabetInfo = ALPHABET_SIZES['default'];
    let languageName = 'the language';
    
    for (const [lang, info] of Object.entries(ALPHABET_SIZES)) {
      if (subjectLower.includes(lang)) {
        alphabetInfo = info;
        languageName = info.name;
        break;
      }
    }
    
    const prompt = `Generate the COMPLETE ${languageName} alphabet.

⚠️ CRITICAL REQUIREMENTS:
1. Include EVERY SINGLE LETTER - NO exceptions, NO shortcuts
2. Expected: ${alphabetInfo.minLetters}-${alphabetInfo.maxLetters} letters total
3. Use this EXACT markdown table format:

## The Complete ${languageName} Alphabet

| Letter | Name | Sound | Example Word |
|--------|------|-------|--------------|
| [letter] | [name] | /[sound]/ like '[english]' | [word] ([romanized]) = [meaning] |

Continue for ALL ${alphabetInfo.minLetters}+ letters. Do NOT stop early. Do NOT skip any letters.

This is a REFERENCE SHEET - learners depend on seeing EVERY letter. Missing even one letter makes the course unusable.

For ${level} learners: Include simple example words and clear pronunciation guides.`;

    try {
      const response = await this.toolRegistry.execute('llm-completion', {
        prompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.3, // Lower temperature for more consistent output
        maxTokens: 4000 // Enough for full alphabets
      }, {});
      
      const content = this.extractResponseText(response);
      
      // Validate the regenerated content
      const validation = this.validateAlphabetCompleteness(content, subject);
      if (!validation.isComplete) {
        console.warn(`⚠️ Alphabet regeneration still incomplete: ${validation.letterCount}/${validation.expected.min} letters`);
      } else {
        console.log(`✅ Complete alphabet generated: ${validation.letterCount} letters`);
      }
      
      return content;
    } catch (error) {
      console.error('❌ Failed to generate complete alphabet:', error);
      return this.getStaticAlphabetFallback(subject);
    }
  }

  /**
   * 🔤 Static alphabet fallback for common languages
   */
  private getStaticAlphabetFallback(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    // Latin alphabet fallback (for Spanish, French, etc.)
    if (subjectLower.includes('latin') || subjectLower.includes('spanish') || subjectLower.includes('french') || subjectLower.includes('italian') || subjectLower.includes('portuguese') || subjectLower.includes('german')) {
      return `## The Latin Alphabet

| Letter | Name | Sound | Example |
|--------|------|-------|---------|
| A a | a | /a/ like 'father' | amor = love |
| B b | be | /b/ like 'boy' | bonus = good |
| C c | ce | /k/ or /s/ | canis = dog |
| D d | de | /d/ like 'day' | domus = house |
| E e | e | /e/ like 'bed' | et = and |
| F f | ef | /f/ like 'far' | filius = son |
| G g | ge | /g/ like 'go' | gloria = glory |
| H h | ha | /h/ (often silent) | hora = hour |
| I i | i | /i/ like 'machine' | in = in |
| J j | jota | /j/ or /dʒ/ | jocus = joke |
| K k | ka | /k/ like 'king' | kalendae = calends |
| L l | el | /l/ like 'love' | lux = light |
| M m | em | /m/ like 'mother' | mater = mother |
| N n | en | /n/ like 'no' | nox = night |
| O o | o | /o/ like 'more' | omnis = all |
| P p | pe | /p/ like 'peace' | pax = peace |
| Q q | qu | /kw/ like 'queen' | quis = who |
| R r | er | /r/ rolled | rex = king |
| S s | es | /s/ like 'sun' | sol = sun |
| T t | te | /t/ like 'time' | tempus = time |
| U u | u | /u/ like 'rule' | unus = one |
| V v | ve | /v/ or /w/ | vita = life |
| W w | double-u | /w/ like 'water' | (borrowed words) |
| X x | ex | /ks/ like 'box' | rex = king |
| Y y | ypsilon | /i/ or /j/ | lyra = lyre |
| Z z | zeta | /z/ like 'zoo' | zona = zone |

This is the complete Latin alphabet with 26 letters.`;
    }
    
    // Arabic alphabet fallback
    if (subjectLower.includes('arabic')) {
      return `## The Arabic Alphabet (الأبجدية العربية)

| Letter | Name | Sound | Example Word |
|--------|------|-------|--------------|
| ا | Alif | /a/ | أب (ab) = father |
| ب | Ba | /b/ | باب (bab) = door |
| ت | Ta | /t/ | تمر (tamr) = dates |
| ث | Tha | /θ/ | ثلج (thalj) = snow |
| ج | Jim | /dʒ/ | جمل (jamal) = camel |
| ح | Ha | /ħ/ | حب (hubb) = love |
| خ | Kha | /x/ | خبز (khubz) = bread |
| د | Dal | /d/ | دار (dar) = house |
| ذ | Dhal | /ð/ | ذهب (dhahab) = gold |
| ر | Ra | /r/ | رجل (rajul) = man |
| ز | Zay | /z/ | زهرة (zahra) = flower |
| س | Sin | /s/ | سماء (sama) = sky |
| ش | Shin | /ʃ/ | شمس (shams) = sun |
| ص | Sad | /sˤ/ | صباح (sabah) = morning |
| ض | Dad | /dˤ/ | ضوء (daw) = light |
| ط | Ta | /tˤ/ | طفل (tifl) = child |
| ظ | Dha | /ðˤ/ | ظهر (dhuhr) = noon |
| ع | Ayn | /ʕ/ | عين (ayn) = eye |
| غ | Ghayn | /ɣ/ | غرب (gharb) = west |
| ف | Fa | /f/ | فم (fam) = mouth |
| ق | Qaf | /q/ | قلب (qalb) = heart |
| ك | Kaf | /k/ | كتاب (kitab) = book |
| ل | Lam | /l/ | ليل (layl) = night |
| م | Mim | /m/ | ماء (ma) = water |
| ن | Nun | /n/ | نور (nur) = light |
| ه | Ha | /h/ | هواء (hawa) = air |
| و | Waw | /w/ | ولد (walad) = boy |
| ي | Ya | /j/ | يد (yad) = hand |

This is the complete Arabic alphabet with 28 letters.`;
    }
    
    // Default fallback
    return `## Alphabet Reference

The complete alphabet for this language includes all standard letters used in writing.

Please refer to the vocabulary sections for letter-by-letter learning with examples and pronunciation guides.

Each letter section includes:
- The letter form
- Its name
- Pronunciation guide
- Example words

Continue through all sections to learn the complete alphabet.`;
  }

  /**
   * 🎯 Parse vocabulary items from raw content text
   * Handles cases where LLM outputs vocabulary as text like:
   * "1: Salve - imagePrompt: a friendly Roman greeting; 2: Vale - imagePrompt: a Roman waving farewell"
   */
  private parseVocabularyFromContent(content: string): any[] {
    const vocabularyItems: any[] = [];
    
    // Pattern: "Word - imagePrompt: description" or "N: Word - imagePrompt: description"
    const patterns = [
      // Pattern 1: "1: Salve - imagePrompt: description; 2: Vale..."
      /(\d+)[:.]?\s*([^\-–—]+)\s*[-–—]\s*imagePrompt:\s*([^;]+)/gi,
      // Pattern 2: "Salve - imagePrompt: description"
      /([A-Za-z\u00C0-\u024F\u0400-\u04FF]+)\s*[-–—]\s*imagePrompt:\s*([^;,\n]+)/gi
    ];
    
    // Try first pattern (numbered list)
    let matches = [...content.matchAll(patterns[0])];
    if (matches.length > 0) {
      matches.forEach(match => {
        const word = match[2].trim();
        const prompt = match[3].trim();
        if (word && prompt) {
          vocabularyItems.push({
            native: word,
            romanized: word.toLowerCase(),
            pronunciation: '',
            meaning: prompt.replace(/^a\s+/i, '').replace(/\.$/, ''), // Use prompt as meaning hint
            imagePrompt: prompt,
            isVisualConcept: true
          });
        }
      });
    }
    
    // Try second pattern (simple list)
    if (vocabularyItems.length === 0) {
      matches = [...content.matchAll(patterns[1])];
      matches.forEach(match => {
        const word = match[1].trim();
        const prompt = match[2].trim();
        if (word && prompt) {
          vocabularyItems.push({
            native: word,
            romanized: word.toLowerCase(),
            pronunciation: '',
            meaning: prompt.replace(/^a\s+/i, '').replace(/\.$/, ''),
            imagePrompt: prompt,
            isVisualConcept: true
          });
        }
      });
    }
    
    console.log(`🔧 Parsed ${vocabularyItems.length} vocabulary items from content`);
    return vocabularyItems;
  }

  /**
   * 🎯 Parse vocabulary items from markdown table format
   * Handles tables like:
   * | Word | Romanized | Pronunciation | Meaning |
   * |------|-----------|---------------|---------|
   * | madre | madre | ['maðre] | mother |
   */
  private parseVocabularyFromTable(content: string): any[] {
    const vocabularyItems: any[] = [];
    const lines = content.split('\n');
    
    let headerIndices: { word: number; romanized: number; pronunciation: number; meaning: number } | null = null;
    
    for (const line of lines) {
      if (!line.includes('|')) continue;
      
      const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
      if (cells.length < 2) continue;
      
      // Skip separator rows
      if (cells.every(c => /^[-:]+$/.test(c))) continue;
      
      // Detect header row
      if (!headerIndices) {
        const lowerCells = cells.map(c => c.toLowerCase());
        const wordIdx = lowerCells.findIndex(c => /word|term|native|concept/.test(c));
        const romanizedIdx = lowerCells.findIndex(c => /romanized|transliteration/.test(c));
        const pronIdx = lowerCells.findIndex(c => /pronunciation|sound/.test(c));
        const meaningIdx = lowerCells.findIndex(c => /meaning|definition|english|translation/.test(c));
        
        if (wordIdx >= 0 && meaningIdx >= 0) {
          headerIndices = {
            word: wordIdx,
            romanized: romanizedIdx >= 0 ? romanizedIdx : wordIdx,
            pronunciation: pronIdx >= 0 ? pronIdx : -1,
            meaning: meaningIdx
          };
          continue; // Skip header row
        }
      }
      
      // Parse data row
      if (headerIndices && cells.length >= 2) {
        const native = cells[headerIndices.word] || '';
        const romanized = cells[headerIndices.romanized] || native;
        const pronunciation = headerIndices.pronunciation >= 0 ? (cells[headerIndices.pronunciation] || '') : '';
        const meaning = cells[headerIndices.meaning] || '';
        
        if (native && meaning && !native.toLowerCase().includes('word') && !meaning.toLowerCase().includes('meaning')) {
          vocabularyItems.push({
            native: native.replace(/^\[|\]$/g, ''),
            romanized: romanized.replace(/^\[|\]$/g, ''),
            pronunciation: pronunciation.replace(/^\[|\]$/g, ''),
            meaning: meaning,
            isVisualConcept: false
          });
        }
      }
    }
    
    console.log(`🔧 Parsed ${vocabularyItems.length} vocabulary items from table`);
    return vocabularyItems;
  }

  /**
   * 🎯 Parse vocabulary from definition list format
   * Handles patterns like:
   * - **Term**: Definition here
   * - **Concept**: Explanation here
   */
  private parseVocabularyFromDefinitionList(content: string): any[] {
    const vocabularyItems: any[] = [];
    
    // Match "- **Term**: definition" or "* **Term**: definition"
    const pattern = /^[\*\-]\s*\*\*([^*]+)\*\*:\s*(.+)$/gm;
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      const term = match[1].trim();
      const definition = match[2].trim();
      
      if (term && definition) {
        vocabularyItems.push({
          native: term,
          romanized: term.toLowerCase(),
          pronunciation: '',
          meaning: definition,
          isVisualConcept: false
        });
      }
    }
    
    console.log(`🔧 Parsed ${vocabularyItems.length} vocabulary items from definition list`);
    return vocabularyItems;
  }

  /**
   * 🎯 Clean vocabulary content - remove raw imagePrompt annotations
   * Converts "1: Salve - imagePrompt: description" to "1. Salve"
   */
  private cleanVocabularyContent(content: string): string {
    // Remove imagePrompt annotations
    let cleaned = content
      // Remove "- imagePrompt: ..." patterns
      .replace(/\s*[-–—]\s*imagePrompt:\s*[^;,\n]+[;,]?/gi, '')
      // Remove trailing semicolons
      .replace(/;\s*(?=\d+[:.]|\n|$)/g, '\n')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    // If content is now too short, provide a better message
    if (cleaned.length < 20) {
      cleaned = 'Visual vocabulary for this section. Click on the vocabulary cards below to learn each word.';
    }
    
    return cleaned;
  }

  /**
   * Manually extract chunks from malformed JSON
   * Enhanced to handle deeply nested quizQuestions arrays
   */
  private extractChunksManually(
    text: string,
    chunkTypes: Array<{type: CourseChunk['type'], description: string}>
  ): any[] {
    console.log('🔧 Manual chunk extraction starting...');
    
    // Strategy: Find each chunk by looking for "title" fields and extracting surrounding context
    const chunks: any[] = [];
    
    // First, try to extract quizQuestions from the entire text since it might span multiple "chunks"
    const extractAllQuizQuestions = (fullText: string): any[] => {
      const allQuestions: any[] = [];
      
      // Method 1: Try direct JSON parsing of quizQuestions arrays
      const quizArrayRegex = /["']?quizQuestions["']?\s*:\s*\[/gi;
      let match;
      
      while ((match = quizArrayRegex.exec(fullText)) !== null) {
        const startIdx = match.index + match[0].length;
        // Find matching closing bracket using bracket counting
        let bracketCount = 1;
        let endIdx = startIdx;
        
        for (let i = startIdx; i < fullText.length && bracketCount > 0; i++) {
          if (fullText[i] === '[') bracketCount++;
          if (fullText[i] === ']') bracketCount--;
          endIdx = i;
        }
        
        const questionsText = fullText.slice(startIdx, endIdx);
        
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse('[' + questionsText + ']');
          if (Array.isArray(parsed)) {
            parsed.forEach(q => {
              if (q.question && q.options && q.correctAnswer) {
                allQuestions.push(q);
              }
            });
            continue;
          }
        } catch {
          // Fall through to regex extraction
        }
        
        // Extract individual questions using flexible regex
        // Handle both "question" and 'question' formats, and any field order
        const questionPatterns = [
          // Standard JSON format
          /\{\s*["']question["']\s*:\s*["']([^"']+)["'][^}]*["']options["']\s*:\s*\[([^\]]+)\][^}]*["']correctAnswer["']\s*:\s*["']([^"']+)["'](?:[^}]*["']explanation["']\s*:\s*["']([^"']+)["'])?[^}]*\}/gi,
          // Alternate field order (options first)
          /\{\s*["']options["']\s*:\s*\[([^\]]+)\][^}]*["']question["']\s*:\s*["']([^"']+)["'][^}]*["']correctAnswer["']\s*:\s*["']([^"']+)["'](?:[^}]*["']explanation["']\s*:\s*["']([^"']+)["'])?[^}]*\}/gi
        ];
        
        for (const questionRegex of questionPatterns) {
        let qMatch;
        while ((qMatch = questionRegex.exec(questionsText)) !== null) {
            let question, optionsRaw, correctAnswer, explanation;
            
            // Determine which pattern matched
            if (questionRegex.source.startsWith('\\{\\s*["\']question')) {
              question = qMatch[1];
              optionsRaw = qMatch[2];
              correctAnswer = qMatch[3];
              explanation = qMatch[4] || '';
            } else {
              optionsRaw = qMatch[1];
              question = qMatch[2];
              correctAnswer = qMatch[3];
              explanation = qMatch[4] || '';
            }
          
            // Parse options - handle both single and double quotes
            const options = (optionsRaw.match(/["']([^"']+)["']/g) || []).map(o => o.replace(/["']/g, ''));
          
            if (question && options.length >= 2) {
            allQuestions.push({
              question,
              options,
              correctAnswer,
              explanation
              });
            }
          }
        }
      }
      
      // Method 2: If no questions found, try extracting question-like patterns from raw text
      if (allQuestions.length === 0) {
        console.log('🔧 No structured quiz questions found, trying pattern-based extraction...');
        
        // Look for patterns like "Question: ...\nA) ...\nB) ...\nCorrect: A"
        const rawQuestionPattern = /(?:Question|Q)\s*\d*\s*[:.]?\s*([^\n?]+\?)\s*(?:\n|\\n)\s*(?:A\)|1\.|a\.)\s*([^\n]+)\s*(?:\n|\\n)\s*(?:B\)|2\.|b\.)\s*([^\n]+)\s*(?:\n|\\n)\s*(?:C\)|3\.|c\.)\s*([^\n]+)\s*(?:\n|\\n)\s*(?:D\)|4\.|d\.)\s*([^\n]+)(?:.*?(?:Correct|Answer)\s*[:.]?\s*(?:A|B|C|D|1|2|3|4|([^\n]+)))?/gi;
        
        let rawMatch;
        while ((rawMatch = rawQuestionPattern.exec(fullText)) !== null) {
          const question = rawMatch[1].trim();
          const options = [rawMatch[2].trim(), rawMatch[3].trim(), rawMatch[4].trim(), rawMatch[5].trim()];
          const correctAnswer = rawMatch[6]?.trim() || options[0]; // Default to first if not specified
          
          if (question && options.length >= 2) {
            allQuestions.push({
              question,
              options,
              correctAnswer,
              explanation: ''
            });
          }
        }
      }
      
      console.log(`🔧 Extracted ${allQuestions.length} quiz questions from text`);
      return allQuestions;
    };
    
    // Extract all quiz questions first
    const allExtractedQuizQuestions = extractAllQuizQuestions(text);
    
    // Now extract chunk metadata
    const titleMatches = Array.from(text.matchAll(/"title"\s*:\s*"([^"]+)"/g)).map(m => m[1]);
    const contentMatches = Array.from(text.matchAll(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g)).map(m => m[1]);
    const keyPointMatches = Array.from(text.matchAll(/"keyPoint"\s*:\s*"([^"]+)"/g)).map(m => m[1]);
    const typeMatches = Array.from(text.matchAll(/"type"\s*:\s*"([^"]+)"/g)).map(m => m[1]);
    
    console.log(`🔧 Found ${titleMatches.length} titles, ${typeMatches.length} types`);
    
    // Create chunks from extracted data
    for (let i = 0; i < Math.max(titleMatches.length, chunkTypes.length); i++) {
      const chunkType = typeMatches[i] || chunkTypes[i]?.type || 'concept';
      const chunk: any = {
        title: titleMatches[i] || chunkTypes[i]?.description || `Part ${i + 1}`,
        content: contentMatches[i]?.replace(/\\n/g, '\n').replace(/\\"/g, '"') || `Learning content for ${chunkTypes[i]?.type || 'concept'}`,
        type: chunkType,
        keyPoint: keyPointMatches[i] || ''
      };
      
      // If this is a quiz chunk, attach the extracted quiz questions
      if (chunkType === 'quiz' && allExtractedQuizQuestions.length > 0) {
        chunk.quizQuestions = allExtractedQuizQuestions;
        console.log(`✅ Attached ${allExtractedQuizQuestions.length} quiz questions to quiz chunk ${i + 1}`);
      }
      
      chunks.push(chunk);
    }
    
    // If no chunks found, create from types
    if (chunks.length === 0) {
      console.log('🔧 No chunks found, creating from types');
      return chunkTypes.map(ct => ({
        title: ct.description,
        content: `This section covers: ${ct.description}`,
        type: ct.type,
        keyPoint: ''
      }));
    }
    
    console.log(`🔧 Manual extraction complete: ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Create fallback chunks from existing content
   * 🎯 FIX: Detect placeholder content and generate meaningful fallback
   */
  private createFallbackChunks(step: CourseStep): CourseChunk[] {
    let content = step.content || '';
    
    // 🎯 FIX: Detect placeholder content and replace with meaningful content
    if (content.includes('PLACEHOLDER') || content.includes('NEEDS_EXPANSION') || content.length < 50) {
      console.warn(`⚠️ Fallback chunks: Detected placeholder content in step ${step.stepNumber}, generating meaningful fallback`);
      content = `Welcome to ${step.title}. This section covers the key concepts and fundamentals you need to understand. Let's explore the important aspects step by step. We'll begin with the foundational ideas and then move into practical applications. Understanding these concepts will help you build a strong foundation. Take your time to absorb each part before moving forward. Remember, learning is a journey and each step builds on the previous one. By the end of this section, you'll have a clear grasp of the core principles.`;
    }
    
    const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
    const chunks: CourseChunk[] = [];
    
    // Create 4-6 chunks from content
    const chunkCount = Math.min(6, Math.max(4, Math.ceil(sentences.length / 3)));
    const sentencesPerChunk = Math.ceil(sentences.length / chunkCount);
    
    const chunkTitles = ['Getting Started', 'Understanding the Basics', 'Going Deeper', 'Seeing it in Action', 'Putting it Together', 'Key Takeaways'];
    const chunkTypes: CourseChunk['type'][] = ['hook', 'concept', 'concept', 'example', 'practice', 'recap'];
    
    for (let i = 0; i < chunkCount; i++) {
      const startIdx = i * sentencesPerChunk;
      const endIdx = Math.min(startIdx + sentencesPerChunk, sentences.length);
      let chunkContent = sentences.slice(startIdx, endIdx).join(' ');
      
      // 🎯 FIX: Ensure each chunk has meaningful content
      if (!chunkContent || chunkContent.length < 30) {
        chunkContent = `${chunkTitles[i] || 'Continue learning'}: Explore the key aspects of ${step.title}. This part focuses on building your understanding through clear explanations and examples.`;
      }
      
      chunks.push({
        id: `step${step.stepNumber}_chunk${i + 1}`,
        chunkNumber: i + 1,
        title: chunkTitles[i] || `Part ${i + 1}`,
        content: chunkContent,
        type: chunkTypes[i] || 'concept',
        estimatedSeconds: Math.max(60, Math.ceil(chunkContent.split(/\s+/).length * 2)),
        keyPoint: step.keyPoints?.[i] || '',
        interactionType: 'read',
        isCompleted: false,
        isLocked: i > 0
      });
    }
    
    return chunks;
  }

  /**
   * Generate images for key chunks (visual type chunks get images)
   */
  private async generateChunkImages(
    sections: CourseSection[],
    subject: string
  ): Promise<CourseSection[]> {
    const sectionsWithChunkImages: CourseSection[] = [];

    for (const section of sections) {
      const chunks = (section as any).chunks as CourseChunk[] || [];
      
      // Generate images for visual-type chunks and examples (limit to 2-3 per section)
      const chunksNeedingImages = chunks
        .filter(c => c.type === 'visual' || c.type === 'example')
        .slice(0, 2); // Max 2 images per section to save API calls
      
      const imagePromises = chunksNeedingImages.map(async (chunk) => {
        if (!chunk.imagePrompt) return;
        
        try {
          // Subject-specific image prompts for better relevance
          const isLanguageCourse = /arabic|spanish|french|german|chinese|japanese|korean|kazakh|russian|language/i.test(subject);
          const isArabic = /arabic/i.test(subject);
          const styleContext = isLanguageCourse 
            ? `Cultural and educational visual for ${subject} learning. ${isArabic ? 'Include Middle Eastern cultural elements, geometric patterns.' : ''} Authentic and engaging.`
            : `Clean, minimalist educational diagram. White background, clear visual hierarchy.`;
          
          const enhancedPrompt = `${chunk.imagePrompt}. Context: ${subject} education. Style: ${styleContext} Modern illustration suitable for learning.`;
          
          const imageResult = await this.toolRegistry.execute('generate-image', {
            prompt: enhancedPrompt,
            style: 'digital-art',
            size: '512x512'
          }, {});
          
          if (imageResult?.success && (imageResult.data?.imageUrl || imageResult.data?.image_url)) {
            chunk.imageUrl = imageResult.data.imageUrl || imageResult.data.image_url;
            console.log(`✅ Chunk image generated: ${chunk.title}`);
          }
        } catch (err) {
          console.warn(`⚠️ Failed to generate chunk image: ${chunk.title}`);
        }
      });
      
      await Promise.all(imagePromises);
      
      // Update section with chunks that have images
      const updatedSection = {
        ...section,
        chunks,
        totalChunks: chunks.length,
        completedChunks: 0,
        description: section.description || `Learn ${section.title} through ${chunks.length} bite-sized lessons`
      };
      
      sectionsWithChunkImages.push(updatedSection);
    }

    return sectionsWithChunkImages;
  }

  /**
   * Generate a specific section with more detail (for expansion)
   */
  async expandSection(
    sectionTitle: string,
    concept: string,
    userLevel: DifficultyLevel
  ): Promise<string> {
    if (!this.toolRegistry) {
      await this.initialize();
    }

    try {
      const languageName = getCurrentLanguageName();
      const languageInstruction = getLanguageInstruction();
      
      const prompt = `Provide a detailed, comprehensive explanation of "${sectionTitle}" focused on "${concept}" for a ${userLevel} learner.
${languageInstruction}

Include:
1. Clear, in-depth explanation (300-400 words)
2. 3-4 practical examples with step-by-step breakdowns
3. Common mistakes to avoid
4. Pro tips for mastery
5. Practice exercises

Make it engaging, educational, and actionable. Use clear formatting with headers.
Write ALL content in ${languageName}.`;

      const response = await this.toolRegistry.execute('llm-completion', {
        prompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.6,
        maxTokens: 2000
      }, {});

      return this.extractResponseText(response);
    } catch (error) {
      console.error('❌ Failed to expand section:', error);
      return `This section covers ${sectionTitle} focusing on ${concept}. Content expansion is being prepared...`;
    }
  }

  /**
   * Generate practice exercises for a concept
   */
  async generatePracticeExercises(
    concept: string,
    difficulty: DifficultyLevel,
    count: number = 3
  ): Promise<string[]> {
    if (!this.toolRegistry) {
      await this.initialize();
    }

    try {
      const languageName = getCurrentLanguageName();
      const languageInstruction = getLanguageInstruction();
      
      const prompt = `Create ${count} practical exercises for learning "${concept}" at ${difficulty} level.
${languageInstruction}

For each exercise provide:
- Clear instructions
- Step-by-step guidance
- Expected outcome
- Tip for success

Make exercises progressively challenging. Format as a numbered list with clear separation.
Write ALL content in ${languageName}.`;

      const response = await this.toolRegistry.execute('llm-completion', {
        prompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.7,
        maxTokens: 1200
      }, {});

      const responseText = this.extractResponseText(response);
      
      // Parse into array
      const exercises = responseText
        .split(/\d+\.|Exercise \d+:|###/)
        .filter(ex => ex.trim().length > 30)
        .map(ex => ex.trim());

      return exercises.slice(0, count);
    } catch (error) {
      console.error('❌ Failed to generate exercises:', error);
      return [
        `Practice applying ${concept} in a real scenario.`,
        `Analyze examples that demonstrate ${concept}.`,
        `Create your own example using ${concept}.`
      ];
    }
  }

  /**
   * Extract text from various response formats and CLEAN it
   */
  private extractResponseText(response: any): string {
    if (!response) return '';
    
    let text = '';
    
    if (typeof response === 'string') {
      text = response;
    } else if (response.success && response.data) {
      const data = response.data;
      
      // Handle double-nested data (data.data.completion)
      if (data.data) {
        const innerData = data.data;
        if (typeof innerData === 'string') {
          text = innerData;
        } else {
          text = innerData.completion || innerData.response || innerData.text || innerData.content || '';
        }
      } else if (typeof data === 'string') {
        text = data;
      } else {
        text = data.completion || data.response || data.text || data.content || '';
      }
      
      // Handle array responses
      if (!text && Array.isArray(data) && data.length > 0) {
        const first = data[0];
        text = first.generated_text || first.text || first.content || '';
      }
    } else {
      text = response.completion || response.response || response.text || response.content || '';
    }
    
    // CRITICAL: Clean the text to remove JSON artifacts
    return this.cleanResponseText(text);
  }
  
  /**
   * Clean response text - removes JSON wrappers and fixes escapes
   */
  private cleanResponseText(text: string): string {
    if (!text) return '';
    
    let cleaned = text;
    
    // Check if the text starts with JSON markers and extract the actual content
    if (cleaned.includes('"success":true') || cleaned.includes('"data":') || cleaned.includes('"completion":')) {
      // Try to extract the completion value from JSON
      const completionMatch = cleaned.match(/"completion"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (completionMatch) {
        try {
          // Parse the escaped string
          cleaned = JSON.parse(`"${completionMatch[1]}"`);
        } catch (e) {
          // If parsing fails, try a simpler extraction
          cleaned = completionMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
      }
    }
    
    // Fix common escape sequences
    cleaned = cleaned.replace(/\\n/g, '\n');
    cleaned = cleaned.replace(/\\t/g, '\t');
    cleaned = cleaned.replace(/\\"/g, '"');
    cleaned = cleaned.replace(/\\\\/g, '\\');
    
    // Remove any remaining JSON structure markers at the start
    cleaned = cleaned.replace(/^\s*\{\s*"success"\s*:\s*true\s*,?\s*/i, '');
    cleaned = cleaned.replace(/^\s*"data"\s*:\s*\{?\s*/i, '');
    cleaned = cleaned.replace(/^\s*"completion"\s*:\s*"?/i, '');
    
    // Clean up excessive whitespace while preserving paragraphs
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned.trim();
  }

  /**
   * Determine user level from assessment responses
   * 
   * 🎯 RESTRICTIVE LEVEL PROGRESSION:
   * - User can only upgrade ONE level max from their selected difficulty
   * - Requires near-perfect score (5/5 or 4/5) to upgrade
   * - Downgrade only if performing very poorly
   * 
   * @param responses - User's assessment responses
   * @param selectedLevel - The difficulty level user originally selected (optional)
   */
  private determineUserLevel(
    responses: UserResponse[], 
    selectedLevel: DifficultyLevel = 'beginner'
  ): DifficultyLevel {
    // No responses = stick with selected level
    if (responses.length === 0) return selectedLevel;

    const correctCount = responses.filter(r => r.isCorrect).length;
    const totalQuestions = responses.length;
    const accuracy = correctCount / totalQuestions;

    console.log(`📊 Assessment results: ${correctCount}/${totalQuestions} correct (${Math.round(accuracy * 100)}%)`);
    console.log(`📊 Selected level: ${selectedLevel}`);

    // Define level hierarchy for progression
    const levelHierarchy: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
    const currentLevelIndex = levelHierarchy.indexOf(selectedLevel);

    // 🎯 UPGRADE RULES: Only +1 level, only for excellent performance
    // Perfect score (5/5) or near-perfect (4/5 = 80%+) = upgrade one level
    if (accuracy >= 0.8 && currentLevelIndex < levelHierarchy.length - 1) {
      const upgradedLevel = levelHierarchy[currentLevelIndex + 1];
      console.log(`✅ Upgrading from ${selectedLevel} → ${upgradedLevel} (${Math.round(accuracy * 100)}% accuracy)`);
      return upgradedLevel;
    }

    // 🎯 DOWNGRADE RULES: Only if performing very poorly (<40%)
    // This catches users who overestimated their level
    if (accuracy < 0.4 && currentLevelIndex > 0) {
      const downgradedLevel = levelHierarchy[currentLevelIndex - 1];
      console.log(`⚠️ Downgrading from ${selectedLevel} → ${downgradedLevel} (${Math.round(accuracy * 100)}% accuracy)`);
      return downgradedLevel;
    }

    // 🎯 STAY AT SELECTED LEVEL: 40-79% accuracy = user is at the right level
    console.log(`✅ Staying at ${selectedLevel} (${Math.round(accuracy * 100)}% accuracy)`);
    return selectedLevel;
  }

  /**
   * Fallback course when generation completely fails
   * Now actually generates real content instead of returning placeholders
   */
  private async getFallbackCourseWithContent(
    moduleId: string,
    subject: string,
    level: DifficultyLevel
  ): Promise<GeneratedCourse> {
    console.log('🔄 Generating fallback course with real content...');
    
    const structure = this.createMinimalCourseStructure(subject, level);
    
    // Expand all placeholder content
    const expandedSteps = await this.validateAndExpandContent(
      structure.steps,
      subject,
      level
    );
    
    // Generate images
    const sectionsWithImages = await this.generateCourseImages(expandedSteps, subject);
    
    return {
      moduleId,
      courseTitle: structure.courseTitle,
      courseDescription: structure.courseDescription,
      sections: sectionsWithImages,
      totalEstimatedMinutes: sectionsWithImages.reduce((sum, s) => sum + s.estimatedMinutes, 0),
      targetedConcepts: structure.targetedConcepts,
      adaptedForLevel: level,
      generatedAt: new Date()
    };
  }

  /**
   * Synchronous fallback for when async content generation also fails
   * This is the absolute last resort with static educational content
   */
  private getEmergencyFallbackCourse(
    moduleId: string,
    subject: string,
    level: DifficultyLevel
  ): GeneratedCourse {
    console.warn('⚠️ Using emergency static fallback course');
    
    // Create genuinely educational static content as absolute last resort
    const introContent = `Welcome to your learning journey on ${subject}! This course is designed to guide you through the essential concepts and practical applications of ${subject} at the ${level} level.

Learning ${subject} is an exciting endeavor that will open new perspectives and capabilities. Whether you're completely new to this topic or looking to solidify your understanding, this course provides a structured path to mastery.

Throughout this course, you will:
- Build a solid foundation in the core concepts
- Explore practical examples and real-world applications  
- Develop skills you can apply immediately
- Progress at a pace that works for your learning style

Take your time with each section. Understanding is more important than speed. Feel free to revisit earlier sections as you progress, and remember that every expert was once a beginner. Let's begin your journey into ${subject}!`;

    const coreContent = `The foundations of ${subject} rest on several key principles that form the building blocks of deeper understanding. Let's explore these essential concepts together.

At its core, ${subject} involves understanding patterns, relationships, and processes that govern how things work in this domain. The first fundamental principle is observation and awareness - paying attention to the details and nuances that might otherwise go unnoticed.

The second key principle is systematic analysis. Rather than jumping to conclusions, we break down complex ideas into manageable components. This allows us to understand each part before seeing how they connect to form the whole.

The third principle is practical application. Knowledge becomes meaningful when we can use it in real situations. Throughout this course, we'll emphasize not just what things are, but how to actually apply them.

Finally, reflection and iteration are crucial. The best learners regularly pause to consider what they've learned, identify gaps, and adjust their approach. This metacognitive skill accelerates all other learning.

These principles work together: observe carefully, analyze systematically, apply practically, and reflect continuously.`;

    const practiceContent = `Now let's put your knowledge into practice with concrete examples and exercises that will solidify your understanding of ${subject}.

Consider this scenario: You're faced with a new situation related to ${subject}. How would you approach it? The first step is to pause and observe. What are the key elements present? What patterns do you recognize from what you've learned?

Next, apply your analytical framework. Break the situation into its component parts. Which principles from the core foundations apply here? How do the different elements interact with each other?

Here's a practical exercise to try: Take a moment to think about a real situation in your life where ${subject} could apply. Write down three specific observations about it. Then, identify which of the core principles would help you address it.

Another valuable practice is teaching what you've learned. Explain ${subject} to someone else, or even just to yourself out loud. This forces you to organize your thoughts and reveals gaps in understanding.

Remember, practice isn't about perfection - it's about building familiarity and confidence. Each time you apply these concepts, you strengthen your understanding.`;

    const summaryContent = `Congratulations on completing this introduction to ${subject}! Let's review what you've learned and chart your path forward.

You've built a foundation in the core principles: observation and awareness, systematic analysis, practical application, and reflective iteration. These aren't just abstract concepts - they're tools you can use every day.

Key takeaways from this course:
- ${subject} is built on fundamental principles that apply broadly
- Breaking complex topics into components makes them manageable
- Regular practice transforms knowledge into skill
- Reflection accelerates learning and deepens understanding

Your next steps for continued growth:
1. Apply what you've learned to a real situation this week
2. Teach or explain these concepts to someone else
3. Identify one aspect you'd like to explore more deeply
4. Schedule regular practice sessions to reinforce your learning

Remember that mastery is a journey, not a destination. The fact that you've completed this course shows your commitment to growth. Keep building on this foundation, stay curious, and embrace the learning process.

Thank you for learning with us. Your journey with ${subject} is just beginning!`;

    return {
      moduleId,
      courseTitle: `Introduction to ${subject}`,
      courseDescription: `Start your journey learning ${subject} with this personalized course.`,
      sections: [
        {
          id: `${moduleId}_step_1`,
          stepNumber: 1,
          title: `Welcome to ${subject}`,
          description: 'Introduction to the course',
          content: introContent,
          type: 'introduction',
          estimatedMinutes: 5,
          keyPoints: ['Understanding the foundations', 'Setting learning goals', 'Overview of key concepts', 'What to expect in this course'],
          imageUrl: undefined,
          imagePrompt: `An inspiring welcome banner for a ${subject} learning course with modern educational design`,
          isCompleted: false,
          isLocked: false,
          chunks: []
        },
        {
          id: `${moduleId}_step_2`,
          stepNumber: 2,
          title: `Core Foundations of ${subject}`,
          description: 'Core concepts and principles',
          content: coreContent,
          type: 'core_concept',
          estimatedMinutes: 10,
          keyPoints: ['Key terminology and definitions', 'Core principles explained', 'Foundation concepts', 'How these concepts interconnect'],
          imageUrl: undefined,
          imagePrompt: `A clear educational diagram showing the fundamental concepts of ${subject}`,
          isCompleted: false,
          isLocked: true,
          chunks: []
        },
        {
          id: `${moduleId}_step_3`,
          stepNumber: 3,
          title: 'Practical Application',
          description: 'Apply what you learned',
          content: practiceContent,
          type: 'example',
          estimatedMinutes: 12,
          keyPoints: ['Real-world examples', 'Step-by-step practice', 'Common scenarios and solutions', 'Tips for effective application'],
          imageUrl: undefined,
          imagePrompt: `A step-by-step visual guide showing practical application of ${subject} concepts`,
          isCompleted: false,
          isLocked: true,
          chunks: []
        },
        {
          id: `${moduleId}_step_4`,
          stepNumber: 4,
          title: 'Summary and Next Steps',
          description: 'Review and continue learning',
          content: summaryContent,
          type: 'summary',
          estimatedMinutes: 6,
          keyPoints: ['Key takeaways review', 'Practice recommendations', 'Advanced topics to explore', 'Resources for continued learning'],
          imageUrl: undefined,
          imagePrompt: `A comprehensive summary infographic for ${subject}`,
          isCompleted: false,
          isLocked: true,
          chunks: []
        }
      ],
      totalEstimatedMinutes: 33,
      targetedConcepts: [subject, `${subject} fundamentals`, `${subject} application`],
      adaptedForLevel: level,
      generatedAt: new Date()
    };
  }

  /**
   * 🎯 VECTORIZE COURSE CONTENT
   * Stores course sections and chunks in vector database for semantic retrieval
   * Enables queries like "what did I learn about X?" to find relevant course content
   */
  private async vectorizeCourseContent(course: GeneratedCourse, userContext?: string): Promise<void> {
    try {
      const { memoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
      
      // Get userId from learning module tracker or context
      const userId = (await import('./LearningModuleTracker')).learningModuleTracker.getUserId() || 'anonymous';
      
      if (userId === 'anonymous') {
        console.warn('⚠️ Cannot vectorize course - no user ID available');
        return;
      }
      
      console.log(`📚 Vectorizing course content: "${course.courseTitle}" for user ${userId}`);
      
      // Vectorize each section
      for (let sectionIndex = 0; sectionIndex < course.sections.length; sectionIndex++) {
        const section = course.sections[sectionIndex];
        
        // Store section as a whole
        const sectionContent = `
Course: ${course.courseTitle}
Section ${sectionIndex + 1}: ${section.title}
Type: ${section.type}

${section.content}

Key Points:
${section.keyPoints.map(kp => `• ${kp}`).join('\n')}
        `.trim();
        
        await memoryDatabaseBridge.storeMemory({
          userId,
          key: `course_${course.moduleId}_section_${sectionIndex}`,
          value: sectionContent,
          metadata: {
            type: 'course_content',
            category: MEMORY_CATEGORIES.COURSE, // 🔒 Uses registry
            courseId: course.moduleId,
            courseTitle: course.courseTitle,
            sectionIndex,
            sectionTitle: section.title,
            sectionType: section.type,
            isPersonalMemory: false,
            isPersonalRecallable: true, // User CAN ask "what did I learn about X?"
            supersessionBehavior: 'replace_conflicts', // Update if course is regenerated
            timestamp: new Date().toISOString()
          }
        });
        
        // Also vectorize individual chunks for more granular retrieval
        if (section.chunks && section.chunks.length > 0) {
          for (let chunkIndex = 0; chunkIndex < section.chunks.length; chunkIndex++) {
            const chunk = section.chunks[chunkIndex];
            
            const chunkContent = `
Course: ${course.courseTitle}
Section: ${section.title}
Lesson ${chunkIndex + 1}: ${chunk.title}

${chunk.content}
            `.trim();
            
            await memoryDatabaseBridge.storeMemory({
              userId,
              key: `course_${course.moduleId}_section_${sectionIndex}_chunk_${chunkIndex}`,
              value: chunkContent,
              metadata: {
                type: 'course_chunk',
                category: MEMORY_CATEGORIES.COURSE, // 🔒 Uses registry
                courseId: course.moduleId,
                courseTitle: course.courseTitle,
                sectionIndex,
                sectionTitle: section.title,
                chunkIndex,
                chunkTitle: chunk.title,
                isPersonalMemory: false,
                isPersonalRecallable: true,
                supersessionBehavior: 'replace_conflicts',
                timestamp: new Date().toISOString()
              }
            });
          }
        }
      }
      
      // Also store a course summary for high-level queries
      const courseSummary = `
Learning Course: "${course.courseTitle}"
Description: ${course.courseDescription}
Level: ${course.adaptedForLevel}
Total Sections: ${course.sections.length}
Topics Covered: ${course.targetedConcepts.join(', ')}
Sections: ${course.sections.map((s, i) => `${i + 1}. ${s.title}`).join(', ')}
      `.trim();
      
      await memoryDatabaseBridge.storeMemory({
        userId,
        key: `course_${course.moduleId}_summary`,
        value: courseSummary,
        metadata: {
          type: 'course_summary',
          category: MEMORY_CATEGORIES.COURSE, // 🔒 Uses registry
          courseId: course.moduleId,
          courseTitle: course.courseTitle,
          totalSections: course.sections.length,
          adaptedForLevel: course.adaptedForLevel,
          isPersonalMemory: false,
          isPersonalRecallable: true,
          supersessionBehavior: 'replace_conflicts',
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`✅ Vectorized ${course.sections.length} sections for course "${course.courseTitle}"`);
      
    } catch (error) {
      console.error('❌ Failed to vectorize course content:', error);
      // Don't throw - vectorization failure shouldn't block course generation
    }
  }
}

// Export singleton instance
export const dynamicCourseBuilder = new DynamicCourseBuilder();
