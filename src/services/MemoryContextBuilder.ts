/**
 * 🧠 MEMORY CONTEXT BUILDER
 * 
 * Transforms raw memory data into structured, contextual prompts.
 * Uses memory metadata to properly categorize:
 * - USER's own information vs
 * - Information ABOUT others (family, friends, colleagues)
 * 
 * This service is called during conversation to inject relevant memories.
 * 
 * @author NeuraPlay AI System
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RawMemory {
  id?: string;
  key?: string;
  memory_key?: string;
  value?: string;
  content?: string;
  memory_value?: string;
  category?: string;
  similarity?: number;
  metadata?: {
    entityType?: string;
    entityRelation?: string;
    entityName?: string;
    attribute?: string;
    confidence?: number;
    source?: string;
    originalText?: string;
    [key: string]: any;
  };
}

export interface StructuredContext {
  // USER's own information
  user: {
    name?: string;
    location?: string;
    profession?: string;
    hobbies: string[];
    preferences: string[];
    other: Record<string, string>;
  };
  
  // Information about OTHERS
  family: Record<string, PersonInfo>;
  friends: Record<string, PersonInfo>;
  colleagues: Record<string, PersonInfo>;
  
  // Pets
  pets: PetInfo[];
  
  // Other/uncategorized
  general: Array<{ key: string; value: string }>;
}

export interface PersonInfo {
  name?: string;
  relationship: string;
  location?: string;
  profession?: string;
  age?: string;
  other: Record<string, string>;
}

export interface PetInfo {
  name: string;
  type: string;
  other: Record<string, string>;
}

export interface ContextBuildOptions {
  maxMemories?: number;
  includeConfidence?: boolean;
  formatStyle?: 'natural' | 'structured' | 'compact';
}

// ============================================================================
// MEMORY CONTEXT BUILDER CLASS
// ============================================================================

export class MemoryContextBuilder {
  private static instance: MemoryContextBuilder;
  
  static getInstance(): MemoryContextBuilder {
    if (!MemoryContextBuilder.instance) {
      MemoryContextBuilder.instance = new MemoryContextBuilder();
    }
    return MemoryContextBuilder.instance;
  }
  
  /**
   * 🎯 MAIN METHOD: Build structured context from raw memories
   */
  buildStructuredContext(memories: RawMemory[]): StructuredContext {
    const context: StructuredContext = {
      user: {
        hobbies: [],
        preferences: [],
        other: {}
      },
      family: {},
      friends: {},
      colleagues: {},
      pets: [],
      general: []
    };
    
    for (const memory of memories) {
      this.categorizeMemory(memory, context);
    }
    
    return context;
  }
  
  /**
   * 🎯 BUILD PROMPT INJECTION: Convert structured context to prompt text
   */
  buildPromptInjection(memories: RawMemory[], options: ContextBuildOptions = {}): string {
    const { formatStyle = 'natural', maxMemories = 15 } = options;
    
    // Limit memories
    const limitedMemories = memories.slice(0, maxMemories);
    
    // Build structured context first
    const context = this.buildStructuredContext(limitedMemories);
    
    // Format based on style
    switch (formatStyle) {
      case 'natural':
        return this.formatNatural(context);
      case 'structured':
        return this.formatStructured(context);
      case 'compact':
        return this.formatCompact(context);
      default:
        return this.formatNatural(context);
    }
  }
  
  /**
   * Categorize a single memory into the structured context
   */
  private categorizeMemory(memory: RawMemory, context: StructuredContext): void {
    const key = memory.key || memory.memory_key || '';
    const value = memory.value || memory.content || memory.memory_value || '';
    const metadata = memory.metadata || {};
    const entityType = metadata.entityType || this.inferEntityType(key);
    
    if (!value || value.trim().length === 0) return;
    
    switch (entityType) {
      case 'USER':
        this.categorizeUserMemory(key, value, metadata, context);
        break;
        
      case 'FAMILY_MEMBER':
        this.categorizeFamilyMemory(key, value, metadata, context);
        break;
        
      case 'FRIEND':
        this.categorizeFriendMemory(key, value, metadata, context);
        break;
        
      case 'COLLEAGUE':
        this.categorizeColleagueMemory(key, value, metadata, context);
        break;
        
      case 'PET':
        this.categorizePetMemory(key, value, metadata, context);
        break;
        
      default:
        // Try to infer from key patterns
        if (key.startsWith('user_')) {
          this.categorizeUserMemory(key, value, metadata, context);
        } else if (key.startsWith('family_')) {
          this.categorizeFamilyMemory(key, value, metadata, context);
        } else if (key.startsWith('pet_') || key.includes('_pet_')) {
          this.categorizePetMemory(key, value, metadata, context);
        } else {
          context.general.push({ key, value });
        }
    }
  }
  
  /**
   * Infer entity type from key pattern
   */
  private inferEntityType(key: string): string {
    const keyLower = key.toLowerCase();
    
    if (keyLower.startsWith('user_')) return 'USER';
    if (keyLower.startsWith('family_')) return 'FAMILY_MEMBER';
    if (keyLower.startsWith('friend_')) return 'FRIEND';
    if (keyLower.startsWith('colleague_') || keyLower.startsWith('coworker_')) return 'COLLEAGUE';
    if (keyLower.includes('pet_') || keyLower.includes('_cat') || keyLower.includes('_dog')) return 'PET';
    
    return 'UNKNOWN';
  }
  
  /**
   * Categorize USER's own memory
   */
  private categorizeUserMemory(key: string, value: string, metadata: any, context: StructuredContext): void {
    const attribute = metadata.attribute || this.inferAttribute(key);
    
    switch (attribute) {
      case 'name':
        context.user.name = value;
        break;
      case 'location':
        context.user.location = value;
        break;
      case 'profession':
        context.user.profession = value;
        break;
      case 'hobby':
        if (!context.user.hobbies.includes(value)) {
          context.user.hobbies.push(value);
        }
        break;
      case 'preference':
        if (!context.user.preferences.includes(value)) {
          context.user.preferences.push(value);
        }
        break;
      default:
        // Dynamic/custom attributes
        const cleanKey = key.replace(/^user_/, '').replace(/_\d+$/, '');
        context.user.other[cleanKey] = value;
    }
  }
  
  /**
   * Categorize FAMILY member memory
   */
  private categorizeFamilyMemory(key: string, value: string, metadata: any, context: StructuredContext): void {
    const relation = metadata.entityRelation || this.extractRelation(key);
    const personName = metadata.entityName || this.extractPersonName(key);
    const attribute = metadata.attribute || this.inferAttribute(key);
    
    // Create unique ID for this family member
    const memberId = personName ? `${relation}_${personName}` : relation;
    
    if (!context.family[memberId]) {
      context.family[memberId] = {
        name: personName,
        relationship: relation,
        other: {}
      };
    }
    
    const member = context.family[memberId];
    
    switch (attribute) {
      case 'name':
        member.name = value;
        break;
      case 'location':
        member.location = value;
        break;
      case 'profession':
        member.profession = value;
        break;
      case 'age':
        member.age = value;
        break;
      default:
        member.other[attribute] = value;
    }
  }
  
  /**
   * Categorize FRIEND memory
   */
  private categorizeFriendMemory(key: string, value: string, metadata: any, context: StructuredContext): void {
    const personName = metadata.entityName || this.extractPersonName(key);
    const attribute = metadata.attribute || this.inferAttribute(key);
    const friendId = personName || `friend_${Object.keys(context.friends).length}`;
    
    if (!context.friends[friendId]) {
      context.friends[friendId] = {
        name: personName,
        relationship: 'friend',
        other: {}
      };
    }
    
    const friend = context.friends[friendId];
    
    switch (attribute) {
      case 'name':
        friend.name = value;
        break;
      case 'location':
        friend.location = value;
        break;
      case 'profession':
        friend.profession = value;
        break;
      default:
        friend.other[attribute] = value;
    }
  }
  
  /**
   * Categorize COLLEAGUE memory
   */
  private categorizeColleagueMemory(key: string, value: string, metadata: any, context: StructuredContext): void {
    const personName = metadata.entityName || this.extractPersonName(key);
    const relation = metadata.entityRelation || 'colleague';
    const attribute = metadata.attribute || this.inferAttribute(key);
    const colleagueId = personName || `colleague_${Object.keys(context.colleagues).length}`;
    
    if (!context.colleagues[colleagueId]) {
      context.colleagues[colleagueId] = {
        name: personName,
        relationship: relation,
        other: {}
      };
    }
    
    const colleague = context.colleagues[colleagueId];
    
    switch (attribute) {
      case 'name':
        colleague.name = value;
        break;
      case 'profession':
        colleague.profession = value;
        break;
      default:
        colleague.other[attribute] = value;
    }
  }
  
  /**
   * Categorize PET memory
   */
  private categorizePetMemory(key: string, value: string, metadata: any, context: StructuredContext): void {
    // Extract pet type and name from key or value
    const petTypeMatch = key.match(/(?:pet_)?(cat|dog|bird|fish|hamster|parrot|kitten|puppy)/i) ||
                         value.match(/\b(cat|dog|bird|fish|hamster|parrot|kitten|puppy)\b/i);
    const petType = petTypeMatch ? petTypeMatch[1].toLowerCase() : 'pet';
    
    // Extract pet name
    let petName = metadata.entityName;
    if (!petName) {
      const nameMatch = value.match(/^([A-Z][a-z]+)/);
      petName = nameMatch ? nameMatch[1] : value.split(' ')[0];
    }
    
    // Check if pet already exists
    const existingPet = context.pets.find(p => p.name.toLowerCase() === petName.toLowerCase());
    
    if (existingPet) {
      // Update existing pet
      const attribute = metadata.attribute || 'description';
      existingPet.other[attribute] = value;
    } else {
      // Add new pet
      context.pets.push({
        name: petName,
        type: petType,
        other: {}
      });
    }
  }
  
  /**
   * Extract relation from key (e.g., "family_uncle_mohammad" -> "uncle")
   */
  private extractRelation(key: string): string {
    const relations = ['mother', 'father', 'mom', 'dad', 'wife', 'husband', 'daughter', 'son', 
                       'sister', 'brother', 'uncle', 'aunt', 'cousin', 'grandma', 'grandpa',
                       'grandmother', 'grandfather', 'mentor', 'teacher'];
    
    const keyLower = key.toLowerCase();
    for (const rel of relations) {
      if (keyLower.includes(rel)) {
        return rel;
      }
    }
    return 'family member';
  }
  
  /**
   * Extract person name from key (e.g., "family_uncle_mohammad_profession" -> "Mohammad")
   */
  private extractPersonName(key: string): string | undefined {
    // Remove common prefixes and suffixes
    const cleaned = key
      .replace(/^(family_|friend_|colleague_|person_)/, '')
      .replace(/_(name|location|profession|age|description)$/, '');
    
    // Split and find name-like segments
    const segments = cleaned.split('_');
    
    // Skip relation words
    const relations = ['mother', 'father', 'mom', 'dad', 'wife', 'husband', 'daughter', 'son', 
                       'sister', 'brother', 'uncle', 'aunt', 'cousin', 'grandma', 'grandpa'];
    
    for (const segment of segments) {
      if (!relations.includes(segment.toLowerCase()) && segment.length > 1) {
        // Capitalize first letter
        return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
      }
    }
    
    return undefined;
  }
  
  /**
   * Infer attribute from key
   */
  private inferAttribute(key: string): string {
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('name')) return 'name';
    if (keyLower.includes('location') || keyLower.includes('live') || keyLower.includes('city')) return 'location';
    if (keyLower.includes('profession') || keyLower.includes('job') || keyLower.includes('work')) return 'profession';
    if (keyLower.includes('hobby') || keyLower.includes('interest')) return 'hobby';
    if (keyLower.includes('prefer') || keyLower.includes('like') || keyLower.includes('favorite')) return 'preference';
    if (keyLower.includes('age') || keyLower.includes('years_old')) return 'age';
    
    return 'description';
  }
  
  // ============================================================================
  // FORMAT METHODS
  // ============================================================================
  
  /**
   * Format context in natural language style
   */
  private formatNatural(context: StructuredContext): string {
    const sections: string[] = [];
    
    // USER section
    const userInfo: string[] = [];
    if (context.user.name) {
      userInfo.push(`The user's name is ${context.user.name}`);
    }
    if (context.user.location) {
      userInfo.push(`They live in ${context.user.location}`);
    }
    if (context.user.profession) {
      userInfo.push(`They work as ${context.user.profession}`);
    }
    if (context.user.hobbies.length > 0) {
      userInfo.push(`They enjoy ${context.user.hobbies.join(', ')}`);
    }
    if (context.user.preferences.length > 0) {
      userInfo.push(`They prefer ${context.user.preferences.join(', ')}`);
    }
    // Add custom attributes
    for (const [attr, val] of Object.entries(context.user.other)) {
      userInfo.push(`Their ${attr.replace(/_/g, ' ')}: ${val}`);
    }
    
    if (userInfo.length > 0) {
      sections.push(`👤 **ABOUT THE USER:**\n${userInfo.join('. ')}.`);
    }
    
    // FAMILY section
    const familyInfo: string[] = [];
    for (const [id, member] of Object.entries(context.family)) {
      const parts: string[] = [];
      const nameStr = member.name ? `${member.name}` : `their ${member.relationship}`;
      
      if (member.profession) {
        parts.push(`works as ${member.profession}`);
      }
      if (member.location) {
        parts.push(`lives in ${member.location}`);
      }
      if (member.age) {
        parts.push(`is ${member.age}`);
      }
      for (const [attr, val] of Object.entries(member.other)) {
        parts.push(`${attr}: ${val}`);
      }
      
      if (parts.length > 0) {
        familyInfo.push(`${nameStr} (${member.relationship}): ${parts.join(', ')}`);
      } else if (member.name) {
        familyInfo.push(`${member.name} is their ${member.relationship}`);
      }
    }
    
    if (familyInfo.length > 0) {
      sections.push(`👨‍👩‍👧‍👦 **FAMILY:**\n${familyInfo.join('\n')}`);
    }
    
    // PETS section
    if (context.pets.length > 0) {
      const petInfo = context.pets.map(pet => {
        const extras = Object.entries(pet.other).map(([k, v]) => `${k}: ${v}`).join(', ');
        return `${pet.name} (${pet.type})${extras ? ` - ${extras}` : ''}`;
      });
      sections.push(`🐾 **PETS:**\n${petInfo.join('\n')}`);
    }
    
    // FRIENDS section
    if (Object.keys(context.friends).length > 0) {
      const friendInfo: string[] = [];
      for (const [id, friend] of Object.entries(context.friends)) {
        const parts: string[] = [];
        if (friend.profession) parts.push(`works as ${friend.profession}`);
        if (friend.location) parts.push(`lives in ${friend.location}`);
        
        const nameStr = friend.name || 'A friend';
        if (parts.length > 0) {
          friendInfo.push(`${nameStr}: ${parts.join(', ')}`);
        }
      }
      if (friendInfo.length > 0) {
        sections.push(`👥 **FRIENDS:**\n${friendInfo.join('\n')}`);
      }
    }
    
    // GENERAL section (uncategorized)
    if (context.general.length > 0) {
      const generalInfo = context.general.map(g => `${g.key}: ${g.value}`);
      sections.push(`📝 **OTHER INFO:**\n${generalInfo.join('\n')}`);
    }
    
    if (sections.length === 0) {
      return '';
    }
    
    return `🧠 **PERSONAL CONTEXT:**\n\n${sections.join('\n\n')}\n\n💡 **USAGE:** Reference this information naturally in conversation. Use their name, mention family appropriately, and recall their interests when relevant. NEVER confuse USER's info with FAMILY's info.`;
  }
  
  /**
   * Format context in structured key-value style
   */
  private formatStructured(context: StructuredContext): string {
    const lines: string[] = ['🧠 **STRUCTURED PERSONAL CONTEXT:**'];
    
    lines.push('\n[USER]');
    if (context.user.name) lines.push(`  name: ${context.user.name}`);
    if (context.user.location) lines.push(`  location: ${context.user.location}`);
    if (context.user.profession) lines.push(`  profession: ${context.user.profession}`);
    if (context.user.hobbies.length) lines.push(`  hobbies: ${context.user.hobbies.join(', ')}`);
    if (context.user.preferences.length) lines.push(`  preferences: ${context.user.preferences.join(', ')}`);
    for (const [k, v] of Object.entries(context.user.other)) {
      lines.push(`  ${k}: ${v}`);
    }
    
    for (const [id, member] of Object.entries(context.family)) {
      lines.push(`\n[FAMILY: ${member.relationship}${member.name ? ` - ${member.name}` : ''}]`);
      if (member.location) lines.push(`  location: ${member.location}`);
      if (member.profession) lines.push(`  profession: ${member.profession}`);
      if (member.age) lines.push(`  age: ${member.age}`);
      for (const [k, v] of Object.entries(member.other)) {
        lines.push(`  ${k}: ${v}`);
      }
    }
    
    if (context.pets.length > 0) {
      lines.push('\n[PETS]');
      for (const pet of context.pets) {
        lines.push(`  ${pet.name}: ${pet.type}`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Format context in compact single-line style
   */
  private formatCompact(context: StructuredContext): string {
    const parts: string[] = [];
    
    if (context.user.name) parts.push(`User: ${context.user.name}`);
    if (context.user.location) parts.push(`Location: ${context.user.location}`);
    if (context.user.profession) parts.push(`Job: ${context.user.profession}`);
    
    for (const [id, member] of Object.entries(context.family)) {
      const name = member.name || member.relationship;
      if (member.profession) {
        parts.push(`${member.relationship} ${name}: ${member.profession}`);
      }
      if (member.location) {
        parts.push(`${member.relationship} location: ${member.location}`);
      }
    }
    
    for (const pet of context.pets) {
      parts.push(`Pet: ${pet.name} (${pet.type})`);
    }
    
    return parts.length > 0 ? `Context: ${parts.join(' | ')}` : '';
  }
}

// Export singleton instance
export const memoryContextBuilder = MemoryContextBuilder.getInstance();

