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

import { llmService } from './LLMHelper';

// ============================================
// CANONICAL CATEGORY DEFINITIONS
// ============================================

export const MEMORY_CATEGORIES = {
  NAME: 'name',
  LOCATION: 'location',
  PROFESSION: 'profession',
  AGE: 'age',
  BIRTHDAY: 'birthday',
  FAMILY: 'family',
  FRIEND: 'friend',
  COLLEAGUE: 'colleague',
  PREFERENCE: 'preference',
  HOBBY: 'hobby',
  INTEREST: 'interest',
  FAVORITE: 'favorite',
  PET: 'pet',
  GOAL: 'goal',
  PLAN: 'plan',
  EDUCATION: 'education',
  COURSE: 'course',
  LEARNING_MOMENT: 'learning_moment',
  RESEARCH_INSIGHT: 'research_insight',
  NEWS_DISCOVERY: 'news_discovery',
  EMOTION: 'emotion',
  MOOD: 'mood',
  CANVAS_DOCUMENT: 'canvas_document',
  DOCUMENT: 'document',
  COGNITIVE: 'cognitive',
  BEHAVIOR: 'behavior',
  CONTEXT: 'context',
  GENERAL: 'general',
} as const;

export type MemoryCategory = typeof MEMORY_CATEGORIES[keyof typeof MEMORY_CATEGORIES];

// ============================================
// CATEGORY GROUPS
// ============================================

export const PERSONAL_CATEGORIES: MemoryCategory[] = [
  MEMORY_CATEGORIES.NAME, MEMORY_CATEGORIES.LOCATION, MEMORY_CATEGORIES.PROFESSION,
  MEMORY_CATEGORIES.AGE, MEMORY_CATEGORIES.BIRTHDAY, MEMORY_CATEGORIES.FAMILY,
  MEMORY_CATEGORIES.FRIEND, MEMORY_CATEGORIES.COLLEAGUE, MEMORY_CATEGORIES.PREFERENCE,
  MEMORY_CATEGORIES.HOBBY, MEMORY_CATEGORIES.INTEREST, MEMORY_CATEGORIES.FAVORITE,
  MEMORY_CATEGORIES.PET, MEMORY_CATEGORIES.GOAL, MEMORY_CATEGORIES.PLAN,
  MEMORY_CATEGORIES.EMOTION, MEMORY_CATEGORIES.MOOD,
];

export const EDUCATION_CATEGORIES: MemoryCategory[] = [
  MEMORY_CATEGORIES.EDUCATION, MEMORY_CATEGORIES.COURSE, MEMORY_CATEGORIES.LEARNING_MOMENT,
];

export const DOCUMENT_CATEGORIES: MemoryCategory[] = [
  MEMORY_CATEGORIES.CANVAS_DOCUMENT, MEMORY_CATEGORIES.DOCUMENT,
];

export const ALL_CATEGORIES: MemoryCategory[] = Object.values(MEMORY_CATEGORIES);

// ============================================
// PRIORITY BOOSTS
// ============================================

export const CATEGORY_PRIORITY_BOOSTS: Record<MemoryCategory, number> = {
  [MEMORY_CATEGORIES.NAME]: 0.5,
  [MEMORY_CATEGORIES.FAMILY]: 0.4,
  [MEMORY_CATEGORIES.FRIEND]: 0.4,
  [MEMORY_CATEGORIES.COLLEAGUE]: 0.4,
  [MEMORY_CATEGORIES.LOCATION]: 0.4,
  [MEMORY_CATEGORIES.PROFESSION]: 0.4,
  [MEMORY_CATEGORIES.AGE]: 0.4,
  [MEMORY_CATEGORIES.BIRTHDAY]: 0.4,
  [MEMORY_CATEGORIES.PET]: 0.4,
  [MEMORY_CATEGORIES.PREFERENCE]: 0.3,
  [MEMORY_CATEGORIES.HOBBY]: 0.3,
  [MEMORY_CATEGORIES.INTEREST]: 0.3,
  [MEMORY_CATEGORIES.FAVORITE]: 0.3,
  [MEMORY_CATEGORIES.GENERAL]: 0.3,
  [MEMORY_CATEGORIES.GOAL]: 0.2,
  [MEMORY_CATEGORIES.PLAN]: 0.2,
  [MEMORY_CATEGORIES.EMOTION]: 0.2,
  [MEMORY_CATEGORIES.MOOD]: 0.2,
  [MEMORY_CATEGORIES.EDUCATION]: 0.1,
  [MEMORY_CATEGORIES.COURSE]: 0.1,
  [MEMORY_CATEGORIES.LEARNING_MOMENT]: 0.1,
  [MEMORY_CATEGORIES.RESEARCH_INSIGHT]: 0.1,
  [MEMORY_CATEGORIES.NEWS_DISCOVERY]: 0.1,
  [MEMORY_CATEGORIES.COGNITIVE]: 0.0,
  [MEMORY_CATEGORIES.BEHAVIOR]: 0.0,
  [MEMORY_CATEGORIES.CONTEXT]: 0.0,
  [MEMORY_CATEGORIES.CANVAS_DOCUMENT]: -0.2,
  [MEMORY_CATEGORIES.DOCUMENT]: -0.2,
};

export function getCategoryBoost(category: string): number {
  const normalized = category?.toLowerCase() as MemoryCategory;
  return CATEGORY_PRIORITY_BOOSTS[normalized] ?? 0.1;
}

export function getCategoriesByTier(tier: 1 | 2 | 3 | 4 | 5 | 6 | 7): MemoryCategory[] {
  const tierRanges: Record<number, [number, number]> = {
    1: [0.5, 0.5], 2: [0.4, 0.4], 3: [0.3, 0.3],
    4: [0.2, 0.2], 5: [0.1, 0.1], 6: [0.0, 0.0], 7: [-1, -0.1],
  };
  const [min, max] = tierRanges[tier];
  return Object.entries(CATEGORY_PRIORITY_BOOSTS)
    .filter(([_, boost]) => boost >= min && boost <= max)
    .map(([cat]) => cat as MemoryCategory);
}

// ============================================
// STRUCTURAL HELPERS (No Regex)
// ============================================

/** Check if string contains any of the keywords */
function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw));
}

/** Check if character is uppercase A-Z */
function isUpperCase(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 65 && code <= 90;
}

/** Check if character is lowercase a-z */
function isLowerCase(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 97 && code <= 122;
}

/** Check if character is a letter */
function isLetter(ch: string): boolean {
  return isUpperCase(ch) || isLowerCase(ch);
}

/** Check if string starts with a letter (replaces /^[A-Za-z]/) */
function startsWithLetter(str: string): boolean {
  return str.length > 0 && isLetter(str[0]);
}

/** Check if string has any uppercase letter (replaces /[A-Z]/) */
function hasUpperCase(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    if (isUpperCase(str[i])) return true;
  }
  return false;
}

// Extract capitalized words from text structurally
function extractCapitalizedWords(text: string): string[] {
  const words: string[] = [];
  const separators = new Set([' ', '\t', '\n', ',', ';', ':', '.', '!', '?', '(', ')', '[', ']', '{', '}', "'", '"']);
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    if (separators.has(text[i])) {
      if (current) { parts.push(current); current = ''; }
    } else {
      current += text[i];
    }
  }
  if (current) parts.push(current);
  
  for (const part of parts) {
    if (part.length >= 2 && isUpperCase(part[0]) && isLowerCase(part[1])) {
      // Check rest is lowercase
      let valid = true;
      for (let i = 2; i < part.length; i++) {
        if (!isLowerCase(part[i])) { valid = false; break; }
      }
      if (valid) words.push(part);
    }
  }
  
  return words;
}

// Remove key prefix from content structurally
// Replaces regex-based key prefix removal
function removeKeyPrefix(content: string, key: string): string {
  let result = content;
  
  // Check if content starts with key followed by ":"
  const keyLower = key.toLowerCase();
  const contentLower = result.toLowerCase();
  
  if (contentLower.startsWith(keyLower + ':')) {
    result = result.substring(key.length + 1).trimStart();
  } else {
    // Check for generic "key: value" pattern
    const colonIdx = result.indexOf(':');
    if (colonIdx > 0 && colonIdx < 30) {
      const beforeColon = result.substring(0, colonIdx);
      // Check if before colon is all lowercase letters and underscores
      let isKeyLike = true;
      for (let i = 0; i < beforeColon.length; i++) {
        const ch = beforeColon[i];
        if (!isLowerCase(ch) && ch !== '_') { isKeyLike = false; break; }
      }
      if (isKeyLike) {
        result = result.substring(colonIdx + 1).trimStart();
      }
    }
  }
  
  return result;
}

/**
 * Parse family key structurally
 * Replaces: /family_(\w+?)_([a-zA-Z][a-zA-Z\s]+?)(?:_family)?$/i
 * and: /family_(\w+)_family$/i
 */
function parseFamilyKey(key: string): { relation: string; name: string | null } | null {
  const keyLower = key.toLowerCase();
  if (!keyLower.startsWith('family_')) return null;
  
  const rest = key.substring(7); // after "family_"
  
  // Remove trailing "_family" if present
  let core = rest;
  if (core.toLowerCase().endsWith('_family')) {
    core = core.substring(0, core.length - 7);
  }
  
  // Split by underscore
  const parts = core.split('_');
  if (parts.length === 0) return null;
  
  if (parts.length === 1) {
    return { relation: parts[0].toLowerCase(), name: null };
  }
  
  // First part is relation, rest is name
  const relation = parts[0].toLowerCase();
  const nameParts = parts.slice(1);
  const name = nameParts.join(' ');
  
  return { relation, name: name || null };
}

// ============================================
// CATEGORY DETECTION (No Regex)
// ============================================

const FAMILY_KEYWORDS = ['wife', 'husband', 'spouse', 'partner', 'daughter', 'son', 'child', 'kid',
  'mother', 'father', 'mom', 'dad', 'parent', 'sister', 'brother', 'sibling',
  'grandmother', 'grandfather', 'grandma', 'grandpa', 'uncle', 'aunt', 'cousin', 'niece', 'nephew'];

export function detectCategoryFromKey(key: string): MemoryCategory {
  const keyLower = (key || '').toLowerCase();
  
  if (keyLower.includes('canvas_document') || keyLower.startsWith('canvas-'))
    return MEMORY_CATEGORIES.CANVAS_DOCUMENT;
  if (keyLower.includes('document'))
    return MEMORY_CATEGORIES.DOCUMENT;
  if (keyLower === 'user_name' || keyLower.startsWith('user_name_') || keyLower === 'name' || keyLower === 'my_name')
    return MEMORY_CATEGORIES.NAME;
  if (keyLower.startsWith('family_') || containsAny(keyLower, FAMILY_KEYWORDS))
    return MEMORY_CATEGORIES.FAMILY;
  if (containsAny(keyLower, ['pet', 'dog', 'cat']))
    return MEMORY_CATEGORIES.PET;
  if (containsAny(keyLower, ['location', 'city', 'country', 'lives_in', 'from_']))
    return MEMORY_CATEGORIES.LOCATION;
  if (containsAny(keyLower, ['profession', 'job', 'career', 'work', 'occupation']))
    return MEMORY_CATEGORIES.PROFESSION;
  if (containsAny(keyLower, ['hobby', 'hobbies']))
    return MEMORY_CATEGORIES.HOBBY;
  if (containsAny(keyLower, ['interest', 'likes', 'enjoys']))
    return MEMORY_CATEGORIES.INTEREST;
  if (containsAny(keyLower, ['preference', 'prefer', 'favorite']))
    return MEMORY_CATEGORIES.PREFERENCE;
  if (containsAny(keyLower, ['goal', 'aspiration', 'dream', 'want_to']))
    return MEMORY_CATEGORIES.GOAL;
  if (keyLower.includes('course_') || keyLower.includes('learning_moment'))
    return MEMORY_CATEGORIES.COURSE;
  if (containsAny(keyLower, ['education', 'study', 'school', 'university']))
    return MEMORY_CATEGORIES.EDUCATION;
  if (containsAny(keyLower, ['emotion', 'feeling', 'mood']))
    return MEMORY_CATEGORIES.EMOTION;
  if (keyLower.includes('cognitive'))
    return MEMORY_CATEGORIES.COGNITIVE;
  if (containsAny(keyLower, ['behavior', 'behaviour']))
    return MEMORY_CATEGORIES.BEHAVIOR;
  if (keyLower.includes('friend'))
    return MEMORY_CATEGORIES.FRIEND;
  if (containsAny(keyLower, ['colleague', 'coworker']))
    return MEMORY_CATEGORIES.COLLEAGUE;
  if (containsAny(keyLower, ['age', 'born']))
    return MEMORY_CATEGORIES.AGE;
  if (keyLower.includes('birthday'))
    return MEMORY_CATEGORIES.BIRTHDAY;
  
  return MEMORY_CATEGORIES.GENERAL;
}

/**
 * Async category detection with LLM for ambiguous keys
 */
export async function detectCategoryWithLLM(key: string, content?: string): Promise<MemoryCategory> {
  // TIER 1: Fast structural
  const fast = detectCategoryFromKey(key);
  if (fast !== MEMORY_CATEGORIES.GENERAL) return fast;
  
  // TIER 2: LLM for ambiguous keys (no underscores, long keys)
  const isAmbiguous = !key.includes('_') && key.length > 15;
  if (isAmbiguous || (content && content.length > 100)) {
    const result = await llmService.classify(
      key + (content ? ` | ${content.substring(0, 200)}` : ''),
      `Categorize this memory key into ONE category: ${Object.values(MEMORY_CATEGORIES).join(', ')}.\nRespond with ONLY the category name.`,
      () => fast,
      `category:${key}`
    );
    
    const validCategories = Object.values(MEMORY_CATEGORIES) as string[];
    if (validCategories.includes(result.result.toLowerCase())) {
      return result.result.toLowerCase() as MemoryCategory;
    }
  }
  
  return fast;
}

// ============================================
// UTILITY FUNCTIONS (No Regex)
// ============================================

export function isPersonalCategory(category: string): boolean {
  return PERSONAL_CATEGORIES.includes(category as MemoryCategory);
}

export function isDocumentCategory(category: string): boolean {
  return DOCUMENT_CATEGORIES.includes(category as MemoryCategory);
}

export function isEducationCategory(category: string): boolean {
  return EDUCATION_CATEGORIES.includes(category as MemoryCategory);
}

// ============================================
// CONTENT NORMALIZATION (No Regex)
// ============================================

export function normalizeMemoryContent(key: string, content: string, metadata?: any): string {
  if (!content) return '';
  let normalized = content.trim();
  normalized = removeKeyPrefix(normalized, key);
  if (metadata?.entityName && isValidEntityName(metadata.entityName)) {
    return metadata.entityName;
  }
  return normalized.trim();
}

const INVALID_NAMES = new Set([
  'wife', 'husband', 'spouse', 'partner', 'daughter', 'son', 'child', 'kid', 'baby',
  'mother', 'father', 'mom', 'dad', 'parent', 'sister', 'brother', 'sibling',
  'grandmother', 'grandfather', 'grandma', 'grandpa', 'uncle', 'aunt', 'cousin', 'niece', 'nephew',
  'friend', 'colleague', 'coworker', 'named', 'called', 'name', 'null', 'undefined',
  'the', 'a', 'an', 'my', 'your', 'his', 'her', 'their',
]);

export function isValidEntityName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 100) return false;
  if (INVALID_NAMES.has(name.toLowerCase())) return false;
  if (!startsWithLetter(name)) return false;
  if (!hasUpperCase(name) && name.length > 2) return false;
  return true;
}

/**
 * Extract name from content using structural parsing
 * Replaces 3 regex patterns for name extraction
 */
export function extractNameFromContent(content: string): string | null {
  if (!content) return null;
  const cleaned = content.trim();
  
  if (cleaned.length < 40 && isValidEntityName(cleaned)) return cleaned;
  
  // Structural parsing: look for "is [Name]" or "named [Name]" or ": [Name]"
  const nameIndicators = ['is ', 'named ', 'called ', ': '];
  for (const indicator of nameIndicators) {
    const idx = cleaned.toLowerCase().indexOf(indicator);
    if (idx !== -1) {
      const afterIndicator = cleaned.substring(idx + indicator.length).trim();
      const words = afterIndicator.split(' ').filter(w => w.length > 0);
      // Take 1-3 capitalized words
      const nameWords: string[] = [];
      for (const word of words) {
        if (word.length >= 2 && isUpperCase(word[0])) {
          nameWords.push(word);
          if (nameWords.length >= 3) break;
        } else if (nameWords.length > 0) {
          break;
        }
      }
      if (nameWords.length > 0) {
        const name = nameWords.join(' ');
        if (isValidEntityName(name)) return name;
      }
    }
  }
  
  // Fallback: find capitalized words
  const capitalizedWords = extractCapitalizedWords(cleaned);
  if (capitalizedWords.length > 0) {
    const potentialName = capitalizedWords.slice(0, 3).join(' ');
    if (isValidEntityName(potentialName)) return potentialName;
  }
  
  return null;
}

// ============================================
// STRUCTURED MEMORY
// ============================================

export interface StructuredMemory {
  id: string;
  key: string;
  category: MemoryCategory;
  content: string;
  entityName?: string;
  entityRelation?: string;
  entityType?: 'PERSON' | 'PLACE' | 'THING' | 'CONCEPT' | 'OTHER';
  confidence: number;
  timestamp: string;
  source: string;
  metadata: Record<string, any>;
}

export function toStructuredMemory(raw: any): StructuredMemory {
  const key = raw.memory_key || raw.key || raw.id || '';
  const metadata = raw.metadata || {};
  const rawContent = raw.content || raw.value || raw.memory_value || '';
  const category = (metadata.category || raw.category || detectCategoryFromKey(key)) as MemoryCategory;
  const content = normalizeMemoryContent(key, rawContent, metadata);
  
  let entityName = metadata.entityName || undefined;
  let entityRelation = metadata.entityRelation || metadata.relationship || metadata.relation || undefined;
  
  if (entityName && isValidEntityName(entityName)) {
    // Good
  } else if (category === MEMORY_CATEGORIES.FAMILY) {
    const parsed = parseFamilyKey(key);
    if (parsed) {
      const relationTypes = new Set(['wife', 'husband', 'mother', 'father', 'son', 'daughter', 'uncle', 'aunt', 'cousin', 'brother', 'sister']);
      if (parsed.name && !relationTypes.has(parsed.name.toLowerCase()) && isValidEntityName(parsed.name)) {
        entityName = parsed.name.charAt(0).toUpperCase() + parsed.name.slice(1);
        entityRelation = parsed.relation;
      } else if (relationTypes.has(parsed.relation)) {
        entityRelation = parsed.relation;
      }
    }
    
    if (!entityRelation) {
      const simpleResult = parseFamilyKey(key);
      if (simpleResult && !simpleResult.name) {
        entityRelation = simpleResult.relation;
      }
    }
  } else if (category === MEMORY_CATEGORIES.NAME) {
    if (content && isValidEntityName(content)) {
      entityName = content;
    }
  }
  
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
    content: entityName || content,
    entityName: entityName || undefined,
    entityRelation: entityRelation || undefined,
    entityType: metadata.entityType || (entityName ? 'PERSON' : 'OTHER'),
    confidence: raw.similarity || metadata.confidence || 0.8,
    timestamp: raw.created_at || raw.timestamp || metadata.timestamp || new Date().toISOString(),
    source: raw.source || metadata.source || 'unknown',
    metadata,
  };
}

export function filterByCategories(memories: StructuredMemory[], categories: MemoryCategory[]): StructuredMemory[] {
  return memories.filter(m => categories.includes(m.category));
}

export function getPersonalMemories(memories: StructuredMemory[]): StructuredMemory[] {
  return filterByCategories(memories, PERSONAL_CATEGORIES);
}