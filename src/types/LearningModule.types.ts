// TypeScript interfaces for Generative Learning Module System

export type ModuleType = 'video' | 'interactive' | 'reading' | 'quiz' | 'game' | 'generative';

export type LearningSpeed = 'fast' | 'moderate' | 'slow';
export type ContentType = 'visual' | 'textual' | 'interactive';
export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type QuestionType = 'multiple_choice' | 'short_answer' | 'scenario';

// User-Level Cognitive Tracking
export interface LearningModuleCognitiveProfile {
  conceptGrasp: number; // 1-5 scale
  retentionLevel: number; // 0-100
  learningSpeed: LearningSpeed;
  preferredContentType: ContentType;
}

export interface LearningModuleProgress {
  overallComprehension: number; // 0-100
  timeSpent: number; // minutes
  questionsAnswered: number;
  accuracyRate: number; // 0-100
  lastAccessed: Date;
  status: ModuleStatus;
  cognitiveProfile: LearningModuleCognitiveProfile;
  currentSection?: string;
  completedSections: string[];
}

// Question System
export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: QuestionOption[];
  correctAnswer?: string;
  concept: string;
  difficulty: DifficultyLevel;
  hint?: string;
  explanation?: string;
}

export interface UserResponse {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number; // seconds
  timestamp: Date;
  concept: string;
}

export interface EvaluationResult {
  isCorrect: boolean;
  score: number; // 0-100
  feedback: string;
  conceptUnderstanding: number; // 0-100
  needsReinforcement: boolean;
}

// Quiz question within a chunk
export interface ChunkQuizQuestion {
  id: string;
  question: string;
  questionType: 'multiple_choice' | 'fill_blank' | 'translate' | 'match' | 'listen_repeat';
  options?: string[]; // For multiple choice
  correctAnswer: string;
  hint?: string;
  explanation?: string;
  // For language learning
  targetWord?: string; // Word in target language
  transliteration?: string; // Romanized version
  pronunciation?: string; // Pronunciation guide
  audioUrl?: string; // Audio pronunciation
}

// Bite-sized learning chunk - the smallest unit of learning (1-3 minutes)
export interface CourseChunk {
  id: string;
  chunkNumber: number; // 1, 2, 3, etc. within the section
  title: string; // Short, descriptive title like "What is an API?"
  content: string; // Focused, bite-sized content (150-300 words max)
  type: 'hook' | 'concept' | 'example' | 'visual' | 'practice' | 'recap' | 'quiz' | 'vocabulary';
  estimatedSeconds: number; // 60-180 seconds typically
  imageUrl?: string; // AI-generated illustration for this chunk
  imagePrompt?: string; // Prompt used for image generation
  keyPoint?: string; // Single key takeaway from this chunk
  interactionType?: 'read' | 'watch' | 'reflect' | 'try' | 'quiz' | 'speak';
  isCompleted?: boolean;
  isLocked?: boolean;
  // TTS support
  ttsAudioUrl?: string; // Pre-generated TTS audio URL
  ttsEnabled?: boolean;
  // Quiz/Exercise support
  quizQuestions?: ChunkQuizQuestion[];
  // Vocabulary items (for LANGUAGE LEARNING chunks only)
  vocabularyItems?: Array<{
    native: string; // Native script
    romanized: string; // Transliteration
    pronunciation: string; // Pronunciation guide
    meaning: string; // Translation
    imageUrl?: string; // Visual aid (generated)
    imagePrompt?: string; // Prompt for image generation (NO text/letters, visual only)
    audioUrl?: string; // Audio pronunciation
    isVisualConcept?: boolean; // True for nouns/verbs that can be illustrated (man, run, ball)
  }>;
  
  // Key terms (for SOFT SKILLS / TECHNICAL / ACADEMIC courses - NOT language)
  keyTerms?: Array<{
    term: string; // The term/concept name
    definition: string; // Clear definition
    example?: string; // Practical example of usage
    category?: string; // Category grouping (e.g., "Communication", "Leadership")
  }>;
  
  // Quiz gate - must pass to proceed
  quizGate?: {
    enabled: boolean;
    requiredScore: number; // 0-100
    retryAllowed: boolean;
  };
  // Inline images for content
  inlineImages?: Array<{
    marker: string; // e.g., "[IMAGE: bee]"
    description: string;
    imageUrl?: string;
  }>;
}

// Course Content - Grid-based step structure with bite-sized chunks
export interface CourseSection {
  id: string;
  stepNumber: number; // 1, 2, 3, etc.
  title: string;
  description: string; // Brief description of what this section covers
  content: string; // Full content (for backward compatibility)
  chunks: CourseChunk[]; // Bite-sized pieces within this section
  type: 'introduction' | 'core_concept' | 'example' | 'practice' | 'summary' | 'checkpoint' | 
        'hook' | 'framework' | 'scenario' | 'key_terms' | 'reflection' | 'recap' | 
        'alphabet' | 'vocabulary' | 'quiz' | 'visual';
  estimatedMinutes: number;
  keyPoints: string[];
  imageUrl?: string; // AI-generated image URL for section header
  imagePrompt?: string; // The prompt used to generate the image
  needsImage?: boolean; // Whether this section needs an image generated
  visualAids?: string[]; // Additional URLs or descriptions
  isCompleted?: boolean;
  isLocked?: boolean;
  isGenerating?: boolean; // 🚀 Progressive: true while background generation is in progress
  completedChunks?: number; // How many chunks completed
  totalChunks?: number; // Total chunks in section
}

// Hierarchical progress tracking for LLM context
export interface ChunkProgress {
  chunkId: string;
  sectionId: string;
  completedAt?: Date;
  timeSpent: number; // seconds
  ttsUsed: boolean;
  comprehensionScore?: number; // 0-100 if quiz chunk
}

export interface SectionProgress {
  sectionId: string;
  sectionTitle: string;
  sectionType: CourseSection['type'];
  totalChunks: number;
  completedChunks: number;
  chunkProgress: ChunkProgress[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface CourseProgressDetail {
  courseId: string;
  courseTitle: string;
  totalSections: number;
  completedSections: number;
  totalChunks: number;
  completedChunks: number;
  currentSection: number; // Index
  currentChunk: number; // Index within current section
  sectionProgress: SectionProgress[];
  lastAccessedAt: Date;
  totalTimeSpent: number; // seconds
  overallProgress: number; // 0-100 percentage
}

export interface GeneratedCourse {
  moduleId: string;
  sections: CourseSection[];
  totalEstimatedMinutes: number;
  targetedConcepts: string[];
  adaptedForLevel: DifficultyLevel;
  generatedAt: Date;
  courseTitle?: string;
  courseDescription?: string;
  // Hierarchical progress
  progressDetail?: CourseProgressDetail;
  // TTS configuration
  ttsLanguage?: string; // e.g., 'en', 'ar', 'es'
  ttsVoiceId?: string; // ElevenLabs voice ID
  // 🎓 Montessori: Competency tracking
  competencies?: Array<{
    id: string;
    name: string;
    indicators: string[];
    masteryThreshold: number;
  }>;
}

// Cognitive Markers
export interface CognitiveMarkers {
  conceptUnderstanding: Record<string, number>; // concept name -> understanding level (0-100)
  knowledgeGaps: string[];
  strengthAreas: string[];
  learningPatterns: {
    respondsWellTo: ContentType[];
    strugglessWith: string[];
    preferredPace: LearningSpeed;
  };
}

// Session Data
export interface LearningModuleSession {
  moduleId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  sessionDuration: number; // seconds
  questionsAsked: Question[];
  userResponses: UserResponse[];
  comprehensionLevel: number; // 0-100
  contentGenerated: GeneratedCourse;
  cognitiveMarkers: CognitiveMarkers;
  completed: boolean;
}

// Module Definition
export interface GenerativeLearningModuleData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: DifficultyLevel;
  type: 'generative';
  subject: string;
  topics: string[];
  thumbnail: string;
  estimatedMinutes: number;
  prerequisites?: string[];
  learningObjectives: string[];
  // Optional system context that guides LLM generation while keeping content dynamic
  // This provides hints/focus areas without restricting the generative nature
  systemContext?: {
    focusAreas?: string[];      // Key areas the LLM should emphasize
    teachingApproach?: string;  // Suggested pedagogical approach
    culturalContext?: string;   // Cultural or contextual considerations
    specialInstructions?: string; // Additional guidance for content generation
  };
  // Flag to indicate this is a course creator placeholder card
  isCourseCreator?: boolean;
  // 🎯 Lazy loading support - indicates course has content in DB but wasn't fully loaded yet
  hasGeneratedContent?: boolean;
  // Full generated course data (may be undefined if metadata-only load)
  generatedCourse?: GeneratedCourse;
  // Saved progress data
  progress?: {
    currentSectionIndex?: number;
    totalSections?: number;
    completedSteps?: number[];
    completedChunks?: Record<number, number[]>;
    comprehensionLevel?: number;
    phase?: string;
    lastAccessed?: string;
  };
}

// Progress Update Payload
export interface ProgressUpdatePayload {
  moduleId: string;
  comprehensionDelta: number;
  timeSpentDelta: number;
  questionsAnswered: number;
  accuracy: number;
  cognitiveInsights: Partial<CognitiveMarkers>;
}

