/**
 * 🎯 MEMORY CATEGORY REGISTRY - SINGLE SOURCE OF TRUTH
 * 
 * This file defines ALL valid memory categories used in the system.
 * ALL memory storage and retrieval MUST use these categories.
 * 
 * NEVER add new categories without updating this file.
 */

// ============================================
// 🏷️ CANONICAL CATEGORY DEFINITIONS
// ============================================

export const MEMORY_CATEGORIES = {
  // ─────────────────────────────────────────
  // PERSONAL IDENTITY (about the user themselves)
  // ─────────────────────────────────────────
  NAME: 'name',                    // User's name
  LOCATION: 'location',            // Where user lives
  PROFESSION: 'profession',        // Job/career
  AGE: 'age',                      // User's age
  BIRTHDAY: 'birthday',            // User's birthday
  
  // ─────────────────────────────────────────
  // RELATIONSHIPS (people the user knows)
  // ─────────────────────────────────────────
  FAMILY: 'family',                // Family members (wife, kids, parents, etc.)
  FRIEND: 'friend',                // Friends
  COLLEAGUE: 'colleague',          // Work colleagues
  
  // ─────────────────────────────────────────
  // PREFERENCES & INTERESTS
  // ─────────────────────────────────────────
  PREFERENCE: 'preference',        // General preferences
  HOBBY: 'hobby',                  // Hobbies and activities
  INTEREST: 'interest',            // Topics of interest
  FAVORITE: 'favorite',            // Favorite things
  
  // ─────────────────────────────────────────
  // PETS & ANIMALS
  // ─────────────────────────────────────────
  PET: 'pet',                      // User's pets
  
  // ─────────────────────────────────────────
  // GOALS & ASPIRATIONS
  // ─────────────────────────────────────────
  GOAL: 'goal',                    // Goals and aspirations
  PLAN: 'plan',                    // Plans and intentions
  
  // ─────────────────────────────────────────
  // EDUCATION & LEARNING
  // ─────────────────────────────────────────
  EDUCATION: 'education',          // Educational background
  COURSE: 'course',                // Course content/progress
  LEARNING_MOMENT: 'learning_moment', // Captured learning interactions
  
  // ─────────────────────────────────────────
  // RESEARCH & INSPIRATION (news discovery)
  // ─────────────────────────────────────────
  RESEARCH_INSIGHT: 'research_insight',  // AI-synthesized research findings
  NEWS_DISCOVERY: 'news_discovery',      // News topics user explored
  
  // ─────────────────────────────────────────
  // EMOTIONS & STATE
  // ─────────────────────────────────────────
  EMOTION: 'emotion',              // Emotional state
  MOOD: 'mood',                    // Current mood
  
  // ─────────────────────────────────────────
  // CONTENT (documents, canvas, etc.)
  // ─────────────────────────────────────────
  CANVAS_DOCUMENT: 'canvas_document',  // Canvas documents
  DOCUMENT: 'document',                // General documents
  
  // ─────────────────────────────────────────
  // SYSTEM/INTERNAL
  // ─────────────────────────────────────────
  COGNITIVE: 'cognitive',          // Cognitive patterns
  BEHAVIOR: 'behavior',            // User behavior patterns
  CONTEXT: 'context',              // Contextual information
  GENERAL: 'general',              // Uncategorized
} as const;

export type MemoryCategory = typeof MEMORY_CATEGORIES[keyof typeof MEMORY_CATEGORIES];

// ============================================
// 🎯 CATEGORY GROUPS FOR RETRIEVAL
// ============================================

/**
 * Categories that contain PERSONAL information about the user
 * Used for greetings, personalization, and "do you remember me" queries
 */
export const PERSONAL_CATEGORIES: MemoryCategory[] = [
  MEMORY_CATEGORIES.NAME,
  MEMORY_CATEGORIES.LOCATION,
  MEMORY_CATEGORIES.PROFESSION,
  MEMORY_CATEGORIES.AGE,
  MEMORY_CATEGORIES.BIRTHDAY,
  MEMORY_CATEGORIES.FAMILY,
  MEMORY_CATEGORIES.FRIEND,
  MEMORY_CATEGORIES.COLLEAGUE,
  MEMORY_CATEGORIES.PREFERENCE,
  MEMORY_CATEGORIES.HOBBY,
  MEMORY_CATEGORIES.INTEREST,
  MEMORY_CATEGORIES.FAVORITE,
  MEMORY_CATEGORIES.PET,
  MEMORY_CATEGORIES.GOAL,
  MEMORY_CATEGORIES.PLAN,
  MEMORY_CATEGORIES.EMOTION,
  MEMORY_CATEGORIES.MOOD,
];

/**
 * Categories that contain EDUCATIONAL content
 * Used for learning context
 */
export const EDUCATION_CATEGORIES: MemoryCategory[] = [
  MEMORY_CATEGORIES.EDUCATION,
  MEMORY_CATEGORIES.COURSE,
  MEMORY_CATEGORIES.LEARNING_MOMENT,
];

/**
 * Categories that contain DOCUMENT content
 * Usually filtered OUT for personal queries
 */
export const DOCUMENT_CATEGORIES: MemoryCategory[] = [
  MEMORY_CATEGORIES.CANVAS_DOCUMENT,
  MEMORY_CATEGORIES.DOCUMENT,
];

/**
 * ALL categories - for unrestricted search
 */
export const ALL_CATEGORIES: MemoryCategory[] = Object.values(MEMORY_CATEGORIES);

// ============================================
// 🎯 HIERARCHICAL CATEGORY PRIORITY BOOSTS
// ============================================

/**
 * Category priority tiers for similarity scoring
 * Higher boost = more important in personal context
 * 
 * TIER 1 (0.5): Core Personal Identity - WHO the user IS
 * TIER 2 (0.4): Relationships & Demographics - WHO they KNOW and WHERE they ARE  
 * TIER 3 (0.3): Preferences & Interests - WHAT they LIKE
 * TIER 4 (0.2): Goals & State - WHAT they WANT and HOW they FEEL
 * TIER 5 (0.1): Education & Research - WHAT they're LEARNING
 * TIER 6 (0.0): System/Internal - Behavioral patterns
 * TIER 7 (-0.2): Content chunks - Pollutes personal context
 */
export const CATEGORY_PRIORITY_BOOSTS: Record<MemoryCategory, number> = {
  // TIER 1: Core Identity
  [MEMORY_CATEGORIES.NAME]: 0.5,
  
  // TIER 2: Relationships & Demographics
  [MEMORY_CATEGORIES.FAMILY]: 0.4,
  [MEMORY_CATEGORIES.FRIEND]: 0.4,
  [MEMORY_CATEGORIES.COLLEAGUE]: 0.4,
  [MEMORY_CATEGORIES.LOCATION]: 0.4,
  [MEMORY_CATEGORIES.PROFESSION]: 0.4,
  [MEMORY_CATEGORIES.AGE]: 0.4,
  [MEMORY_CATEGORIES.BIRTHDAY]: 0.4,
  [MEMORY_CATEGORIES.PET]: 0.4,
  
  // TIER 3: Preferences & Interests
  [MEMORY_CATEGORIES.PREFERENCE]: 0.3,
  [MEMORY_CATEGORIES.HOBBY]: 0.3,
  [MEMORY_CATEGORIES.INTEREST]: 0.3,
  [MEMORY_CATEGORIES.FAVORITE]: 0.3,
  [MEMORY_CATEGORIES.GENERAL]: 0.3, // Legacy data - may contain valuable personal info!
  
  // TIER 4: Goals & State
  [MEMORY_CATEGORIES.GOAL]: 0.2,
  [MEMORY_CATEGORIES.PLAN]: 0.2,
  [MEMORY_CATEGORIES.EMOTION]: 0.2,
  [MEMORY_CATEGORIES.MOOD]: 0.2,
  
  // TIER 5: Education & Research
  [MEMORY_CATEGORIES.EDUCATION]: 0.1,
  [MEMORY_CATEGORIES.COURSE]: 0.1,
  [MEMORY_CATEGORIES.LEARNING_MOMENT]: 0.1,
  [MEMORY_CATEGORIES.RESEARCH_INSIGHT]: 0.1,
  [MEMORY_CATEGORIES.NEWS_DISCOVERY]: 0.1,
  
  // TIER 6: System/Internal
  [MEMORY_CATEGORIES.COGNITIVE]: 0.0,
  [MEMORY_CATEGORIES.BEHAVIOR]: 0.0,
  [MEMORY_CATEGORIES.CONTEXT]: 0.0,
  
  // TIER 7: Content (de-prioritize)
  [MEMORY_CATEGORIES.CANVAS_DOCUMENT]: -0.2,
  [MEMORY_CATEGORIES.DOCUMENT]: -0.2,
};

/**
 * Get the priority boost for a category
 */
export function getCategoryBoost(category: string): number {
  const normalizedCategory = category?.toLowerCase() as MemoryCategory;
  return CATEGORY_PRIORITY_BOOSTS[normalizedCategory] ?? 0.1; // Default to low boost
}

/**
 * Get categories by tier
 */
export function getCategoriesByTier(tier: 1 | 2 | 3 | 4 | 5 | 6 | 7): MemoryCategory[] {
  const tierRanges: Record<number, [number, number]> = {
    1: [0.5, 0.5],
    2: [0.4, 0.4],
    3: [0.3, 0.3],
    4: [0.2, 0.2],
    5: [0.1, 0.1],
    6: [0.0, 0.0],
    7: [-1, -0.1],
  };
  
  const [min, max] = tierRanges[tier];
  return Object.entries(CATEGORY_PRIORITY_BOOSTS)
    .filter(([_, boost]) => boost >= min && boost <= max)
    .map(([cat]) => cat as MemoryCategory);
}

// ============================================
// 🔍 CATEGORY DETECTION UTILITIES
// ============================================

/**
 * Detect the most appropriate category for a memory key
 */
export function detectCategoryFromKey(key: string): MemoryCategory {
  const keyLower = (key || '').toLowerCase();
  
  // Check for specific patterns first (most specific to least)
  
  // CANVAS/DOCUMENT content
  if (keyLower.includes('canvas_document') || keyLower.startsWith('canvas-')) {
    return MEMORY_CATEGORIES.CANVAS_DOCUMENT;
  }
  if (keyLower.includes('document')) {
    return MEMORY_CATEGORIES.DOCUMENT;
  }
  
  // USER NAME - must check before family to avoid conflicts
  if (keyLower === 'user_name' || keyLower.startsWith('user_name_') || keyLower === 'name' || keyLower === 'my_name') {
    return MEMORY_CATEGORIES.NAME;
  }
  
  // FAMILY MEMBERS
  const familyPatterns = ['wife', 'husband', 'spouse', 'partner', 'daughter', 'son', 'child', 'kid',
    'mother', 'father', 'mom', 'dad', 'parent', 'sister', 'brother', 'sibling',
    'grandmother', 'grandfather', 'grandma', 'grandpa', 'uncle', 'aunt', 'cousin', 'niece', 'nephew'];
  if (keyLower.startsWith('family_') || familyPatterns.some(p => keyLower.includes(p))) {
    return MEMORY_CATEGORIES.FAMILY;
  }
  
  // PETS
  if (keyLower.includes('pet') || keyLower.includes('dog') || keyLower.includes('cat')) {
    return MEMORY_CATEGORIES.PET;
  }
  
  // LOCATION
  if (keyLower.includes('location') || keyLower.includes('city') || keyLower.includes('country') || keyLower.includes('lives_in') || keyLower.includes('from_')) {
    return MEMORY_CATEGORIES.LOCATION;
  }
  
  // PROFESSION
  if (keyLower.includes('profession') || keyLower.includes('job') || keyLower.includes('career') || keyLower.includes('work') || keyLower.includes('occupation')) {
    return MEMORY_CATEGORIES.PROFESSION;
  }
  
  // HOBBY
  if (keyLower.includes('hobby') || keyLower.includes('hobbies')) {
    return MEMORY_CATEGORIES.HOBBY;
  }
  
  // INTEREST
  if (keyLower.includes('interest') || keyLower.includes('likes') || keyLower.includes('enjoys')) {
    return MEMORY_CATEGORIES.INTEREST;
  }
  
  // PREFERENCE
  if (keyLower.includes('preference') || keyLower.includes('prefer') || keyLower.includes('favorite')) {
    return MEMORY_CATEGORIES.PREFERENCE;
  }
  
  // GOAL
  if (keyLower.includes('goal') || keyLower.includes('aspiration') || keyLower.includes('dream') || keyLower.includes('want_to')) {
    return MEMORY_CATEGORIES.GOAL;
  }
  
  // EDUCATION/COURSES
  if (keyLower.includes('course_') || keyLower.includes('learning_moment')) {
    return MEMORY_CATEGORIES.COURSE;
  }
  if (keyLower.includes('education') || keyLower.includes('study') || keyLower.includes('school') || keyLower.includes('university')) {
    return MEMORY_CATEGORIES.EDUCATION;
  }
  
  // EMOTION
  if (keyLower.includes('emotion') || keyLower.includes('feeling') || keyLower.includes('mood')) {
    return MEMORY_CATEGORIES.EMOTION;
  }
  
  // COGNITIVE PATTERNS
  if (keyLower.includes('cognitive')) {
    return MEMORY_CATEGORIES.COGNITIVE;
  }
  
  // BEHAVIOR
  if (keyLower.includes('behavior') || keyLower.includes('behaviour')) {
    return MEMORY_CATEGORIES.BEHAVIOR;
  }
  
  // FRIEND
  if (keyLower.includes('friend')) {
    return MEMORY_CATEGORIES.FRIEND;
  }
  
  // COLLEAGUE
  if (keyLower.includes('colleague') || keyLower.includes('coworker')) {
    return MEMORY_CATEGORIES.COLLEAGUE;
  }
  
  // AGE
  if (keyLower.includes('age') || keyLower.includes('born')) {
    return MEMORY_CATEGORIES.AGE;
  }
  
  // BIRTHDAY
  if (keyLower.includes('birthday')) {
    return MEMORY_CATEGORIES.BIRTHDAY;
  }
  
  return MEMORY_CATEGORIES.GENERAL;
}

/**
 * Check if a category is a personal memory category (about the user)
 */
export function isPersonalCategory(category: string): boolean {
  return PERSONAL_CATEGORIES.includes(category as MemoryCategory);
}

/**
 * Check if a category is a document/content category
 */
export function isDocumentCategory(category: string): boolean {
  return DOCUMENT_CATEGORIES.includes(category as MemoryCategory);
}

/**
 * Check if a category is an education category
 */
export function isEducationCategory(category: string): boolean {
  return EDUCATION_CATEGORIES.includes(category as MemoryCategory);
}

// ============================================
// 🧹 MEMORY CONTENT NORMALIZATION
// ============================================

/**
 * Normalize memory content to ensure it contains ONLY the meaningful value
 * NOT the key repeated in the content
 */
export function normalizeMemoryContent(key: string, content: string, metadata?: any): string {
  if (!content) return '';
  
  let normalized = content.trim();
  
  // Remove key prefix if content starts with key
  // e.g., "family_wife_family: wife" -> "wife"  (still useless)
  // e.g., "user_name: John" -> "John"
  const keyPatterns = [
    new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*`, 'i'),
    new RegExp(`^[a-z_]+:\\s*`, 'i'), // Generic "key: value" pattern
  ];
  
  for (const pattern of keyPatterns) {
    normalized = normalized.replace(pattern, '');
  }
  
  // If we have metadata.entityName and it's a valid name, prefer that
  if (metadata?.entityName && isValidEntityName(metadata.entityName)) {
    return metadata.entityName;
  }
  
  return normalized.trim();
}

/**
 * Check if an entity name is valid (not a placeholder or relation type)
 */
export function isValidEntityName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 100) return false;
  
  const nameLower = name.toLowerCase();
  
  // Invalid patterns - these are relation types, not names
  const invalidNames = [
    'wife', 'husband', 'spouse', 'partner',
    'daughter', 'son', 'child', 'kid', 'baby',
    'mother', 'father', 'mom', 'dad', 'parent',
    'sister', 'brother', 'sibling',
    'grandmother', 'grandfather', 'grandma', 'grandpa',
    'uncle', 'aunt', 'cousin', 'niece', 'nephew',
    'friend', 'colleague', 'coworker',
    'named', 'called', 'name', 'null', 'undefined',
    'the', 'a', 'an', 'my', 'your', 'his', 'her', 'their',
  ];
  
  if (invalidNames.includes(nameLower)) return false;
  
  // Must start with a letter
  if (!/^[A-Za-z]/.test(name)) return false;
  
  // Should have at least one capital letter (for proper names)
  if (!/[A-Z]/.test(name) && name.length > 2) return false;
  
  return true;
}

/**
 * Extract the actual name from memory content
 * Handles various formats like "my wife is Sarah", "Sarah", "wife: Sarah"
 */
export function extractNameFromContent(content: string): string | null {
  if (!content) return null;
  
  let cleaned = content.trim();
  
  // If content is short and looks like a name, return it directly
  if (cleaned.length < 40 && isValidEntityName(cleaned)) {
    return cleaned;
  }
  
  // Try to extract from common patterns
  const patterns = [
    /(?:my\s+)?(?:wife|husband|partner|son|daughter|mother|father|mom|dad|sister|brother|uncle|aunt)\s+(?:is\s+)?(?:named\s+|called\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:name[d]?\s*(?:is)?[:\s]+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/,  // Just a capitalized name
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1] && isValidEntityName(match[1])) {
      return match[1];
    }
  }
  
  // Last resort: find all capitalized words and use first 1-3
  const capitalizedWords = cleaned.match(/\b[A-Z][a-z]+\b/g);
  if (capitalizedWords && capitalizedWords.length > 0) {
    const potentialName = capitalizedWords.slice(0, 3).join(' ');
    if (isValidEntityName(potentialName)) {
      return potentialName;
    }
  }
  
  return null;
}

// ============================================
// 📊 STRUCTURED MEMORY FORMAT
// ============================================

export interface StructuredMemory {
  id: string;
  key: string;
  category: MemoryCategory;
  content: string;          // The actual meaningful value (e.g., "Sarah", not "wife")
  entityName?: string;      // For people: their name
  entityRelation?: string;  // For family: the relation (wife, son, etc.)
  entityType?: 'PERSON' | 'PLACE' | 'THING' | 'CONCEPT' | 'OTHER';
  confidence: number;
  timestamp: string;
  source: string;
  metadata: Record<string, any>;
}

/**
 * Convert a raw memory into a structured format
 * 🔒 ROBUST: Extracts entityName from multiple sources:
 *    1. metadata.entityName (preferred)
 *    2. KEY pattern: family_{relation}_{name}_family → extracts name
 *    3. Content parsing (fallback)
 */
export function toStructuredMemory(raw: any): StructuredMemory {
  const key = raw.memory_key || raw.key || raw.id || '';
  const metadata = raw.metadata || {};
  const rawContent = raw.content || raw.value || raw.memory_value || '';
  
  // Determine category from metadata first, then from key
  const category = (metadata.category || raw.category || detectCategoryFromKey(key)) as MemoryCategory;
  
  // Normalize content
  const content = normalizeMemoryContent(key, rawContent, metadata);
  
  // ============================================
  // 🎯 EXTRACT ENTITY NAME (multiple strategies)
  // ============================================
  let entityName = metadata.entityName || undefined;
  let entityRelation = metadata.entityRelation || metadata.relationship || metadata.relation || undefined;
  
  // STRATEGY 1: Already have entityName from metadata
  if (entityName && isValidEntityName(entityName)) {
    // Great, we have it
  }
  // STRATEGY 2: Extract from KEY pattern for family members
  // Pattern: family_{relation}_{name}_family  e.g., family_uncle_mohammed_family
  else if (category === MEMORY_CATEGORIES.FAMILY) {
    const keyMatch = key.match(/family_(\w+?)_([a-zA-Z][a-zA-Z\s]+?)(?:_family)?$/i);
    if (keyMatch) {
      const potentialRelation = keyMatch[1].toLowerCase();
      const potentialName = keyMatch[2];
      
      // Check if the second part is a name (not a relation type)
      const relationTypes = ['wife', 'husband', 'mother', 'father', 'son', 'daughter', 'uncle', 'aunt', 'cousin', 'brother', 'sister'];
      
      if (!relationTypes.includes(potentialName.toLowerCase()) && isValidEntityName(potentialName)) {
        entityName = potentialName.charAt(0).toUpperCase() + potentialName.slice(1);
        entityRelation = potentialRelation;
      } else if (relationTypes.includes(potentialRelation)) {
        // Key is like family_wife_family - no name, just relation
        entityRelation = potentialRelation;
      }
    }
    
    // Also try pattern: family_{relation}_family (no name embedded)
    if (!entityRelation) {
      const simpleMatch = key.match(/family_(\w+)_family$/i);
      if (simpleMatch) {
        entityRelation = simpleMatch[1].toLowerCase();
      }
    }
  }
  // STRATEGY 3: Extract from KEY pattern for user name
  // Pattern: user_name_{timestamp} - content should be the name
  else if (category === MEMORY_CATEGORIES.NAME) {
    if (content && isValidEntityName(content)) {
      entityName = content;
    }
  }
  
  // STRATEGY 4: Try to extract from content as last resort
  if (!entityName && (category === MEMORY_CATEGORIES.FAMILY || category === MEMORY_CATEGORIES.NAME)) {
    const extracted = extractNameFromContent(rawContent);
    if (extracted && isValidEntityName(extracted)) {
      entityName = extracted;
    }
  }
  
  return {
    id: raw.id || `${key}_${Date.now()}`,
    key,
    category,
    content: entityName || content, // Prefer entityName if available
    entityName: entityName || undefined,
    entityRelation: entityRelation || undefined,
    entityType: metadata.entityType || (entityName ? 'PERSON' : 'OTHER'),
    confidence: raw.similarity || metadata.confidence || 0.8,
    timestamp: raw.created_at || raw.timestamp || metadata.timestamp || new Date().toISOString(),
    source: raw.source || metadata.source || 'unknown',
    metadata,
  };
}

/**
 * Filter structured memories by category group
 */
export function filterByCategories(memories: StructuredMemory[], categories: MemoryCategory[]): StructuredMemory[] {
  return memories.filter(m => categories.includes(m.category));
}

/**
 * Get personal memories (excluding documents, courses, cognitive patterns)
 */
export function getPersonalMemories(memories: StructuredMemory[]): StructuredMemory[] {
  return filterByCategories(memories, PERSONAL_CATEGORIES);
}

// ============================================
// 🔍 DEBUG UTILITIES
// ============================================

export function debugMemory(memory: any, label?: string): void {
  const structured = toStructuredMemory(memory);
  console.log(`📝 ${label || 'Memory'}:`, {
    key: structured.key,
    category: structured.category,
    content: structured.content?.substring(0, 50) + (structured.content?.length > 50 ? '...' : ''),
    entityName: structured.entityName,
    entityRelation: structured.entityRelation,
    confidence: structured.confidence,
  });
}

export function debugMemories(memories: any[], label?: string): void {
  console.log(`🔍 ${label || 'Memories'}: ${memories.length} total`);
  
  const structured = memories.map(toStructuredMemory);
  const byCategory: Record<string, number> = {};
  
  for (const m of structured) {
    byCategory[m.category] = (byCategory[m.category] || 0) + 1;
  }
  
  console.log('📊 By category:', byCategory);
  
  // Show first 5
  for (let i = 0; i < Math.min(5, structured.length); i++) {
    debugMemory(structured[i], `  [${i}]`);
  }
}

