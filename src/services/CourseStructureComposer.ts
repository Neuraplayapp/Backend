// Course Structure Composer - Dynamically assembles card sequences
// Uses CardRegistry to compose course structures based on course type classification
// This is the bridge between CourseTypeDetector and DynamicCourseBuilder

import { CARD_TYPES, getCardsForCourseType, type CardTypeDefinition } from './CardRegistry';
import type { CourseTypeConfig } from './CourseTypeDetector';

export interface SectionStructure {
  sectionNumber: number;
  sectionTitle: string;
  sectionDescription: string;
  cardSequence: string[];  // Card type IDs in order
  estimatedMinutes: number;
}

export interface CourseStructureTemplate {
  courseType: string;
  totalSections: number;
  sections: SectionStructure[];
  availableCardTypes: string[];
  excludedCardTypes: string[];
  mandatoryCards: string[];  // Must appear in every course
  sectionPatterns: Record<string, string[]>;  // Pattern name -> card sequence
}

// =============================================================================
// SECTION PATTERNS - Reusable card sequences for different purposes
// =============================================================================

const SECTION_PATTERNS: Record<string, Record<string, string[]>> = {
  // Language course patterns
  language: {
    introduction: ['hook', 'concept', 'recap'],
    alphabet: ['hook', 'alphabet', 'visual', 'quiz', 'recap'],
    vocabulary: ['hook', 'vocabulary', 'visual', 'practice', 'quiz', 'recap'],
    grammar: ['hook', 'concept', 'practice', 'quiz', 'recap'],
    phrases: ['hook', 'vocabulary', 'practice', 'quiz', 'recap'],
    conversation: ['hook', 'scenario', 'practice', 'quiz', 'recap']
  },
  
  // Soft skills patterns
  soft_skills: {
    introduction: ['hook', 'concept', 'recap'],
    framework: ['hook', 'framework', 'key_terms', 'practice', 'recap'],
    scenarios: ['hook', 'scenario', 'scenario', 'reflection', 'recap'],
    skills: ['hook', 'concept', 'key_terms', 'practice', 'quiz', 'recap'],
    application: ['hook', 'scenario', 'practice', 'reflection', 'recap'],
    assessment: ['hook', 'quiz', 'reflection', 'recap']
  },
  
  // Technical course patterns
  technical: {
    introduction: ['hook', 'concept', 'recap'],
    fundamentals: ['hook', 'concept', 'key_terms', 'practice', 'quiz', 'recap'],
    hands_on: ['hook', 'concept', 'practice', 'practice', 'quiz', 'recap'],
    deep_dive: ['hook', 'concept', 'concept', 'practice', 'quiz', 'recap'],
    project: ['hook', 'concept', 'practice', 'practice', 'recap']
  },
  
  // Academic course patterns
  academic: {
    introduction: ['hook', 'concept', 'recap'],
    theory: ['hook', 'concept', 'key_terms', 'quiz', 'recap'],
    examples: ['hook', 'concept', 'visual', 'practice', 'quiz', 'recap'],
    application: ['hook', 'concept', 'practice', 'practice', 'quiz', 'recap']
  },
  
  // General/creative patterns
  general: {
    introduction: ['hook', 'concept', 'recap'],
    content: ['hook', 'concept', 'practice', 'quiz', 'recap'],
    application: ['hook', 'concept', 'practice', 'recap']
  }
};

// =============================================================================
// DEFAULT COURSE STRUCTURES - Baseline structures for each course type
// =============================================================================

const DEFAULT_STRUCTURES: Record<string, { sections: string[]; description: string }> = {
  language: {
    sections: ['introduction', 'alphabet', 'vocabulary', 'grammar', 'phrases', 'vocabulary', 'grammar', 'conversation'],
    description: 'Comprehensive language learning from alphabet to conversation'
  },
  soft_skills: {
    sections: ['introduction', 'framework', 'scenarios', 'skills', 'application', 'assessment'],
    description: 'Framework-based soft skills development with real-world scenarios'
  },
  technical: {
    sections: ['introduction', 'fundamentals', 'hands_on', 'deep_dive', 'project'],
    description: 'Concept-to-practice technical learning journey'
  },
  academic: {
    sections: ['introduction', 'theory', 'examples', 'application'],
    description: 'Theory-based academic learning with examples'
  },
  general: {
    sections: ['introduction', 'content', 'content', 'application'],
    description: 'General content delivery with practice'
  },
  creative: {
    sections: ['introduction', 'content', 'content', 'application'],
    description: 'Creative learning with hands-on projects'
  }
};

// =============================================================================
// COMPOSER CLASS
// =============================================================================

export class CourseStructureComposer {
  
  /**
   * Compose a complete course structure based on course type config
   */
  static compose(config: CourseTypeConfig, subject: string): CourseStructureTemplate {
    const courseType = config.type;
    const patterns = SECTION_PATTERNS[courseType] || SECTION_PATTERNS.general;
    const defaultStructure = DEFAULT_STRUCTURES[courseType] || DEFAULT_STRUCTURES.general;
    
    // Get available cards for this course type
    const availableCards = getCardsForCourseType(courseType);
    const availableCardTypes = availableCards.map(c => c.id);
    
    // Determine excluded cards based on course type
    const excludedCardTypes = this.getExcludedCards(courseType);
    
    // Build sections from patterns
    const sections: SectionStructure[] = [];
    const sectionPatterns = defaultStructure.sections.slice(0, config.maxSteps);
    
    for (let i = 0; i < sectionPatterns.length; i++) {
      const patternName = sectionPatterns[i];
      const cardSequence = patterns[patternName] || patterns.content || ['hook', 'concept', 'practice', 'recap'];
      
      // Filter out excluded cards from sequence
      const filteredSequence = cardSequence.filter(c => !excludedCardTypes.includes(c));
      
      sections.push({
        sectionNumber: i + 1,
        sectionTitle: this.generateSectionTitle(patternName, subject, i + 1),
        sectionDescription: this.generateSectionDescription(patternName, courseType),
        cardSequence: filteredSequence,
        estimatedMinutes: filteredSequence.length * 3  // ~3 min per card
      });
    }
    
    return {
      courseType,
      totalSections: sections.length,
      sections,
      availableCardTypes,
      excludedCardTypes,
      mandatoryCards: ['hook', 'recap'],
      sectionPatterns: patterns
    };
  }
  
  /**
   * Get cards that should be excluded for this course type
   */
  private static getExcludedCards(courseType: string): string[] {
    switch (courseType) {
      case 'language':
        return ['key_terms', 'framework', 'reflection'];  // Language uses vocabulary, not key_terms
      case 'soft_skills':
        return ['vocabulary', 'alphabet'];  // Soft skills uses key_terms, not vocabulary
      case 'technical':
        return ['vocabulary', 'alphabet', 'reflection'];
      case 'academic':
        return ['vocabulary', 'alphabet', 'scenario'];
      default:
        return ['vocabulary', 'alphabet'];  // Default: exclude language-specific cards
    }
  }
  
  /**
   * Generate a section title based on pattern and subject
   */
  private static generateSectionTitle(patternName: string, subject: string, sectionNumber: number): string {
    const titleTemplates: Record<string, string> = {
      introduction: `Introduction to ${subject}`,
      alphabet: `The ${subject} Alphabet`,
      vocabulary: `Essential ${subject} Vocabulary`,
      grammar: `${subject} Grammar Rules`,
      phrases: `Common ${subject} Phrases`,
      conversation: `${subject} in Conversation`,
      framework: `Core Framework`,
      scenarios: `Real-World Scenarios`,
      skills: `Key Skills`,
      application: `Practical Application`,
      assessment: `Assessment & Review`,
      fundamentals: `Fundamentals`,
      hands_on: `Hands-On Practice`,
      deep_dive: `Deep Dive`,
      project: `Capstone Project`,
      theory: `Theoretical Foundation`,
      examples: `Examples & Case Studies`,
      content: `Section ${sectionNumber}`
    };
    
    return titleTemplates[patternName] || `Section ${sectionNumber}: ${patternName}`;
  }
  
  /**
   * Generate section description based on pattern and course type
   */
  private static generateSectionDescription(patternName: string, courseType: string): string {
    const descriptions: Record<string, string> = {
      introduction: 'Get started with the fundamentals and understand why this matters.',
      alphabet: 'Learn the complete writing system and character recognition.',
      vocabulary: 'Build your core vocabulary with essential words and phrases.',
      grammar: 'Master the grammatical structures and patterns.',
      phrases: 'Learn commonly used phrases for everyday situations.',
      conversation: 'Practice putting it all together in realistic conversations.',
      framework: 'Understand the core framework that guides effective practice.',
      scenarios: 'See concepts in action through real-world situations.',
      skills: 'Develop specific skills through targeted learning.',
      application: 'Apply what you\'ve learned to practical situations.',
      assessment: 'Test your knowledge and identify areas for growth.',
      fundamentals: 'Build a strong foundation with core concepts.',
      hands_on: 'Learn by doing with guided exercises.',
      deep_dive: 'Explore advanced topics in depth.',
      project: 'Bring it all together in a comprehensive project.',
      theory: 'Understand the theoretical underpinnings.',
      examples: 'Learn through detailed examples and case studies.',
      content: 'Explore key concepts and ideas.'
    };
    
    return descriptions[patternName] || 'Learn and practice key concepts.';
  }
  
  /**
   * Get LLM generation instructions for a specific card sequence
   */
  static getGenerationInstructions(cardSequence: string[]): string {
    const instructions: string[] = [];
    
    for (const cardType of cardSequence) {
      const definition = CARD_TYPES[cardType];
      if (definition) {
        instructions.push(`
### ${definition.name} (type: "${cardType}")
${definition.generationInstructions}
Minimum content length: ${definition.minContentLength} characters
`);
      }
    }
    
    return instructions.join('\n');
  }
  
  /**
   * Validate a generated section against its structure
   */
  static validateSection(section: any, structure: SectionStructure): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!section.chunks || !Array.isArray(section.chunks)) {
      issues.push('Section missing chunks array');
      return { valid: false, issues };
    }
    
    // Check chunk count matches expected
    if (section.chunks.length < structure.cardSequence.length) {
      issues.push(`Expected ${structure.cardSequence.length} chunks, got ${section.chunks.length}`);
    }
    
    // Validate each chunk
    for (let i = 0; i < section.chunks.length; i++) {
      const chunk = section.chunks[i];
      const expectedType = structure.cardSequence[i];
      
      if (chunk.type !== expectedType) {
        issues.push(`Chunk ${i + 1}: expected type "${expectedType}", got "${chunk.type}"`);
      }
      
      // Check for empty/short content
      if (!chunk.content || chunk.content.length < 50) {
        issues.push(`Chunk ${i + 1} (${chunk.type}): content too short or missing`);
      }
      
      // Quiz-specific validation
      if (chunk.type === 'quiz' && (!chunk.quizQuestions || chunk.quizQuestions.length < 3)) {
        issues.push(`Quiz chunk ${i + 1}: needs at least 3 questions`);
      }
    }
    
    return { valid: issues.length === 0, issues };
  }
}

export default CourseStructureComposer;

