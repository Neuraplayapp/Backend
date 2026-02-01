/**
 * 🎯 GREETING SERVICE
 * 
 * Handles personalized greeting generation and user information extraction.
 * Extracted from ChatHandler.ts for better separation of concerns.
 * 
 * Responsibilities:
 * - Generate personalized greetings based on user context
 * - Extract user identity from memories (name, location, hobbies, pets)
 * - Time-based context generation
 * - Third-party memory detection (distinguish user from family members)
 * - Weather, dashboard, and canvas context integration
 * 
 * 🔒 USES MemoryCategoryRegistry for bulletproof category handling
 */

import { toolRegistry } from './ToolRegistry';
import { 
  toStructuredMemory, 
  getPersonalMemories,
  MEMORY_CATEGORIES,
  isValidEntityName,
  debugMemories,
  type StructuredMemory 
} from './MemoryCategoryRegistry';

export interface PersonalInfo {
  userName: string | null;
  userPets: string[];
  userHobbies: string[];
  userLocation: string | null;
  userProfession: string | null;
  userRelationships: string[]; // 🎯 Family members, spouse, etc.
}

export interface GreetingContext {
  personalInfo: PersonalInfo;
  timeContext: string;
  weather?: { location: string; temperature_c: number; condition: string };
  latestCourse?: { name: string };
  latestDocument?: { title: string };
}

class GreetingService {
  
  /**
   * Extract all personal information from memories
   * 🔒 Uses MemoryCategoryRegistry for bulletproof extraction
   */
  extractPersonalInfo(memories: any[]): PersonalInfo {
    // Convert all memories to structured format for reliable extraction
    const structured = memories.map(toStructuredMemory);
    const personal = getPersonalMemories(structured);
    
    console.log(`🔍 extractPersonalInfo: ${memories.length} raw → ${structured.length} structured → ${personal.length} personal`);
    
    // 🔍 DEBUG: Show ALL memories by category with entityName status
    const byCategory: Record<string, { count: number; hasNames: number; examples: string[] }> = {};
    for (const m of structured) {
      if (!byCategory[m.category]) {
        byCategory[m.category] = { count: 0, hasNames: 0, examples: [] };
      }
      byCategory[m.category].count++;
      if (m.entityName) byCategory[m.category].hasNames++;
      if (byCategory[m.category].examples.length < 2) {
        byCategory[m.category].examples.push(`${m.key}: ${m.entityName || 'NO NAME'}`);
      }
    }
    console.log('📊 Memories by category:', byCategory);
    
    // 🔍 DEBUG: Look for ANY user_name memories
    const nameMemories = structured.filter(m => 
      m.category === MEMORY_CATEGORIES.NAME || 
      m.key.toLowerCase().includes('user_name') ||
      m.key.toLowerCase().includes('my_name')
    );
    console.log(`🔍 Found ${nameMemories.length} potential name memories:`, 
      nameMemories.map(m => ({ key: m.key, content: m.content?.substring(0, 30), entityName: m.entityName }))
    );
    
    return {
      userName: this.extractUserNameFromStructured(structured),
      userPets: this.extractUserPetsFromStructured(structured),
      userHobbies: this.extractUserHobbiesFromStructured(structured),
      userLocation: this.extractUserLocationFromStructured(structured),
      userProfession: this.extractUserProfessionFromStructured(structured),
      userRelationships: this.extractUserRelationshipsFromStructured(structured)
    };
  }
  
  // ============================================
  // 🎯 BULLETPROOF EXTRACTION METHODS (using structured memories)
  // ============================================
  
  /**
   * Extract user's name from structured memories
   * 🔒 ROBUST: Only looks in USER-specific memories, NEVER family memories
   * 
   * IMPORTANT: Family members' names (Sadykova Tunell, Mohammed, etc.) are NOT the user's name!
   * 
   * 🐛 CRITICAL FIX: If a name appears in BOTH user_name_X AND family_X memories,
   * that person is a FAMILY MEMBER, not the user! Filter them out.
   */
  private extractUserNameFromStructured(memories: StructuredMemory[]): string | null {
    console.log(`🔍 extractUserName: Searching ${memories.length} memories for user name`);
    
    // 🐛 FIX: First, collect ALL names that appear in family memories
    // These names are FAMILY MEMBERS, not the user!
    const familyMemberNames = new Set<string>();
    for (const m of memories) {
      const keyLower = m.key.toLowerCase();
      const isFamilyMemory = 
        m.category === MEMORY_CATEGORIES.FAMILY ||
        keyLower.startsWith('family_') ||
        keyLower.includes('_family') ||
        keyLower.includes('wife') ||
        keyLower.includes('husband') ||
        keyLower.includes('mother') ||
        keyLower.includes('father') ||
        keyLower.includes('uncle') ||
        keyLower.includes('aunt') ||
        keyLower.includes('son') ||
        keyLower.includes('daughter') ||
        keyLower.includes('brother') ||
        keyLower.includes('sister') ||
        keyLower.includes('grandma') ||
        keyLower.includes('grandpa');
      
      if (isFamilyMemory) {
        // Extract the name from this family memory
        const familyName = m.entityName || m.content;
        if (familyName && isValidEntityName(familyName)) {
          familyMemberNames.add(familyName.toLowerCase());
          console.log(`  📋 Found family member: "${familyName}" from ${m.key}`);
        }
      }
    }
    
    console.log(`  Found ${familyMemberNames.size} family member names to exclude:`, Array.from(familyMemberNames));
    
    // 🚫 EXCLUSION: NEVER look in family/relationship memories for user's own name
    const nonFamilyMemories = memories.filter(m => {
      const keyLower = m.key.toLowerCase();
      const isFamilyMemory = 
        m.category === MEMORY_CATEGORIES.FAMILY ||
        keyLower.startsWith('family_') ||
        keyLower.includes('_family') ||
        keyLower.includes('wife') ||
        keyLower.includes('husband') ||
        keyLower.includes('mother') ||
        keyLower.includes('father') ||
        keyLower.includes('uncle') ||
        keyLower.includes('aunt') ||
        keyLower.includes('son') ||
        keyLower.includes('daughter') ||
        keyLower.includes('brother') ||
        keyLower.includes('sister');
      
      if (isFamilyMemory) {
        console.log(`  ⏭️ Skipping family memory: ${m.key}`);
      }
      return !isFamilyMemory;
    });
    
    console.log(`  Filtered to ${nonFamilyMemories.length} non-family memories`);
    
    // PRIORITY 1: Look for explicit user_name keys (highest priority)
    // 🐛 FIX: BUT exclude any name that also appears in family memories!
    for (const m of nonFamilyMemories) {
      const keyLower = m.key.toLowerCase();
      if (keyLower === 'user_name' || keyLower.startsWith('user_name_') || keyLower === 'my_name' || keyLower === 'name') {
        const name = m.entityName || m.content;
        console.log(`  Checking user_name key: ${m.key} → content="${m.content}", entityName="${m.entityName}"`);
        
        // 🐛 CRITICAL: If this name is a known family member, SKIP IT!
        if (name && familyMemberNames.has(name.toLowerCase())) {
          console.log(`  ⚠️ SKIPPING "${name}" - this is a FAMILY MEMBER, not the user!`);
          continue;
        }
        
        if (name && isValidEntityName(name)) {
          console.log(`✅ extractUserName: Found from user_name key: "${name}"`);
          return name;
        }
      }
    }
    
    // PRIORITY 2: Look for category = 'name' (NOT family)
    const nameMemories = nonFamilyMemories.filter(m => m.category === MEMORY_CATEGORIES.NAME);
    console.log(`  Found ${nameMemories.length} memories with category='name'`);
    
    for (const m of nameMemories) {
      if (m.entityName && isValidEntityName(m.entityName)) {
        console.log(`✅ extractUserName: Found from name category entityName: "${m.entityName}"`);
        return m.entityName;
      }
      if (m.content && isValidEntityName(m.content)) {
        console.log(`✅ extractUserName: Found from name category content: "${m.content}"`);
        return m.content;
      }
    }
    
    // PRIORITY 3: Look in raw metadata for 'userName' or 'user_name' (not just 'name')
    for (const m of nonFamilyMemories) {
      const rawName = m.metadata?.userName || m.metadata?.user_name;
      if (rawName && isValidEntityName(rawName)) {
        console.log(`✅ extractUserName: Found from metadata.userName: "${rawName}"`);
        return rawName;
      }
    }
    
    console.log('❌ extractUserName: No valid user name found (family names excluded)');
    return null;
  }
  
  /**
   * Extract user's pets from structured memories
   */
  private extractUserPetsFromStructured(memories: StructuredMemory[]): string[] {
    const pets: string[] = [];
    const seen = new Set<string>();
    
    // Filter to pet category
    const petMemories = memories.filter(m => m.category === MEMORY_CATEGORIES.PET);
    
    for (const m of petMemories) {
      // Skip if it's third-party content (from a document)
      if (m.metadata?.isThirdPartyMemory || m.source === 'canvas') continue;
      
      const petName = m.entityName || m.content;
      if (petName && !seen.has(petName.toLowerCase()) && petName.length < 50) {
        seen.add(petName.toLowerCase());
        pets.push(petName);
      }
    }
    
    return pets.slice(0, 5);
  }
  
  /**
   * Extract user's hobbies from structured memories
   */
  private extractUserHobbiesFromStructured(memories: StructuredMemory[]): string[] {
    const hobbies: string[] = [];
    const seen = new Set<string>();
    
    // Filter to hobby/interest categories
    const hobbyMemories = memories.filter(m => 
      m.category === MEMORY_CATEGORIES.HOBBY || 
      m.category === MEMORY_CATEGORIES.INTEREST
    );
    
    for (const m of hobbyMemories) {
      const hobby = m.content;
      if (hobby && !seen.has(hobby.toLowerCase()) && hobby.length < 100) {
        seen.add(hobby.toLowerCase());
        hobbies.push(hobby);
      }
    }
    
    return hobbies.slice(0, 5);
  }
  
  /**
   * Extract user's location from structured memories
   */
  private extractUserLocationFromStructured(memories: StructuredMemory[]): string | null {
    // Filter to location category
    const locationMemories = memories.filter(m => m.category === MEMORY_CATEGORIES.LOCATION);
    
    for (const m of locationMemories) {
      if (m.content && m.content.length < 100) {
        return m.content;
      }
    }
    
    return null;
  }
  
  /**
   * Extract user's profession from structured memories
   */
  private extractUserProfessionFromStructured(memories: StructuredMemory[]): string | null {
    // Filter to profession category
    const professionMemories = memories.filter(m => m.category === MEMORY_CATEGORIES.PROFESSION);
    
    for (const m of professionMemories) {
      if (m.content && m.content.length < 100) {
        return m.content;
      }
    }
    
    return null;
  }
  
  /**
   * Extract user's relationships (family members) from structured memories
   */
  private extractUserRelationshipsFromStructured(memories: StructuredMemory[]): string[] {
    const relationships: string[] = [];
    const seen = new Set<string>();
    
    // Filter to family category
    const familyMemories = memories.filter(m => m.category === MEMORY_CATEGORIES.FAMILY);
    
    console.log(`🔍 extractUserRelationships: Found ${familyMemories.length} family memories`);
    
    for (const m of familyMemories) {
      // Get the person's name - prefer entityName over content
      const personName = m.entityName || null;
      const relation = m.entityRelation || 'family member';
      
      // CRITICAL: Only add if we have an actual name (not just "wife" or "mother")
      if (personName && isValidEntityName(personName)) {
        const entry = `${relation}: ${personName}`;
        if (!seen.has(entry.toLowerCase())) {
          seen.add(entry.toLowerCase());
          relationships.push(entry);
          console.log(`✅ extractUserRelationships: Added "${entry}"`);
        }
      } else {
        console.log(`⚠️ extractUserRelationships: Skipped memory - no valid name. key=${m.key}, content="${m.content?.substring(0, 30)}"`);
      }
    }
    
    return relationships.slice(0, 8);
  }
  
  /**
   * Get time-based greeting with timezone awareness and cultural context
   * Matches the enhanced version from NeuraPlayAssistantLite
   */
  getTimeBasedContext(): string {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const month = now.getMonth(); // 0 = January
    const date = now.getDate();
    
    // 🎄 HOLIDAYS take priority
    if (month === 0 && date === 1) return '🎊 Happy New Year';
    if (month === 11 && date === 24) return '🎄 Good Christmas Eve';
    if (month === 11 && date === 25) return '🎅 Merry Christmas';
    if (month === 11 && date === 31) return '🥳 Happy New Year\'s Eve';
    if (month === 1 && date === 14) return '💝 Happy Valentine\'s Day';
    if (month === 9 && date === 31) return '🎃 Happy Halloween';
    
    // Weekend awareness
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // 🕐 TIME-BASED greetings
    if (hour >= 4 && hour < 6) {
      return 'Good early morning';
    } else if (hour >= 6 && hour < 12) {
      return 'Good morning';
    } else if (hour === 12 && minutes < 30) {
      return 'Good noon';
    } else if ((hour === 12 && minutes >= 30) || hour === 13) {
      return 'Good day';
    } else if (hour >= 14 && hour < 17) {
      return 'Good afternoon';
    } else if (hour >= 17 && hour < 19) {
      return 'Good early evening';
    } else if (hour >= 19 && hour < 22) {
      return 'Good evening';
    } else if (hour >= 22 || hour < 4) {
      return isWeekend ? 'Good night' : 'Working late';
    }
    
    return 'Hello';
  }
  
  /**
   * Get day-specific context (Monday blues, Friday excitement, weekend vibes)
   */
  getDayContext(): string {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    const isMonday = dayOfWeek === 1;
    const isFriday = dayOfWeek === 5;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (isMonday && hour < 12) {
      return 'Hope your Monday is starting well!';
    } else if (isFriday && hour >= 15) {
      return 'Almost weekend time!';
    } else if (isWeekend && hour >= 10) {
      return 'Enjoying your weekend?';
    }
    
    return '';
  }
  
  /**
   * Get personal context string from extracted info
   */
  getPersonalContext(pets: string[], hobbies: string[], location: string | null): string {
    const contextParts: string[] = [];
    
    if (pets.length > 0) {
      contextParts.push(`The user has ${pets.length === 1 ? 'a pet' : 'pets'}: ${pets.join(', ')}`);
    }
    
    if (hobbies.length > 0) {
      contextParts.push(`Interests/hobbies: ${hobbies.join(', ')}`);
    }
    
    if (location) {
      contextParts.push(`Location: ${location}`);
    }
    
    return contextParts.join('. ');
  }
  
  /**
   * Fetch weather for greeting context
   */
  async fetchWeather(userId?: string): Promise<{ location: string; temperature_c: number; condition: string } | null> {
    try {
      console.log('🌤️ GreetingService.fetchWeather: Starting fetch...');
      const weatherResult = await toolRegistry.execute('get-weather', { 
        autoDetectLocation: true 
      }, { 
        sessionId: 'greeting-context',
        userId: userId || '',
        startTime: Date.now()
      });
      
      console.log('🌤️ GreetingService.fetchWeather: Raw result:', JSON.stringify(weatherResult, null, 2)?.substring(0, 500));
      
      if (weatherResult?.success && weatherResult?.data) {
        // Handle double-nested data structure from ToolRegistry
        const toolReturn = weatherResult.data;
        const actualWeather = toolReturn.data || toolReturn.metadata || toolReturn;
        
        console.log('🌤️ GreetingService.fetchWeather: Extracted weather:', {
          location: actualWeather.location || actualWeather.city,
          temp: actualWeather.temperature_c || actualWeather.temperature,
          condition: actualWeather.condition || actualWeather.weather || actualWeather.description
        });
        
        return {
          location: actualWeather.location || actualWeather.city || 'Unknown',
          temperature_c: actualWeather.temperature_c || actualWeather.temperature,
          condition: actualWeather.condition || actualWeather.weather || actualWeather.description
        };
      }
      
      console.log('🌤️ GreetingService.fetchWeather: No weather data in result');
    } catch (error) {
      console.warn('🌤️ Weather fetch failed:', error);
    }
    return null;
  }
  
  /**
   * Fetch latest canvas document for greeting context
   */
  async fetchLatestCanvasDocument(): Promise<{ title: string; timestamp: number } | null> {
    try {
      const { useCanvasStore } = await import('../stores/canvasStore');
      const store = useCanvasStore.getState();
      
      // Get all documents and apply FIFO (most recent)
      const allDocuments: Array<{title: string, timestamp: number}> = [];
      for (const [_convId, elements] of Object.entries(store.canvasElementsByConversation || {})) {
        const docs = elements.filter((el: any) => el.type === 'document');
        docs.forEach((doc: any) => {
          allDocuments.push({
            title: doc.content?.title || 'Untitled',
            timestamp: new Date(doc.timestamp).getTime()
          });
        });
      }
      
      // Sort by timestamp (most recent first)
      allDocuments.sort((a, b) => b.timestamp - a.timestamp);
      return allDocuments[0] || null;
    } catch {
      return null;
    }
  }
  
  /**
   * Fetch latest dashboard course for greeting context
   */
  async fetchLatestCourse(userId: string): Promise<{ 
    name: string; 
    title?: string; 
    currentStep?: number; 
    totalSteps?: number;
    progress?: any;
  } | null> {
    try {
      const { dashboardContextService } = await import('./DashboardContextService');
      const dashboardContext = dashboardContextService.getCurrentDashboardContext(userId);
      
      if (dashboardContext?.activeModule) {
        const module = dashboardContext.activeModule;
        return {
          name: module.name,
          title: module.name,
          currentStep: module.currentStepIndex,
          totalSteps: module.totalSteps,
          progress: module.progress
        };
      }
      
      return dashboardContext?.availableCourses?.[0] 
        ? { name: dashboardContext.availableCourses[0] } 
        : null;
    } catch {
      return null;
    }
  }
  
  /**
   * 🌟 MAIN GREETING GENERATOR
   * Generates a personalized greeting using UNIFIED learning context
   */
  async generatePersonalizedGreeting(
    _message: string, 
    memories: any[], 
    userId: string, 
    _sessionId?: string
  ): Promise<string | null> {
    console.log('🎯 GreetingService.generatePersonalizedGreeting called with', memories?.length || 0, 'memories');
    
    try {
      // Extract key personal information from memories
      const personalInfo = this.extractPersonalInfo(memories);
      const { userName, userPets, userHobbies, userLocation, userRelationships } = personalInfo;
      
      const hasAnyMemories = memories && memories.length > 0;
      
      // 🎯 CRITICAL: Name is REQUIRED for personalized greeting
      // If we don't know their name, stay at onboarding to ask for it
      if (!userName) {
        console.log('🌟 GreetingService: No name found - staying at onboarding to ask for name');
        return this.generateNewUserOnboarding();
      }
      
      // User has name - they're a returning user
      const isReturningUser = true;
      
      // 🎯 USE UNIFIED CONTEXT - single source of truth!
      const { unifiedLearningContextService } = await import('./UnifiedLearningContextService');
      const unifiedContext = await unifiedLearningContextService.getContext(userId);
      
      // Fetch weather in parallel (only thing not in unified context)
      const weatherData = await this.fetchWeather(userId);
      
      console.log('✅ GreetingService: Unified context:', {
        currentCourse: unifiedContext.currentCourse?.name || 'NONE',
        progress: unifiedContext.currentCourse?.progressPercent || 0,
        struggles: unifiedContext.struggles.knowledgeGaps.length,
        dueItems: unifiedContext.retention.itemsDueForReview,
        weather: weatherData ? `${weatherData.temperature_c}°C in ${weatherData.location}` : 'NONE'
      });
      
      // Build course info for greeting
      const latestCourse = unifiedContext.currentCourse ? {
        name: unifiedContext.currentCourse.name,
        title: unifiedContext.currentCourse.name,
        currentStep: unifiedContext.currentCourse.currentStep,
        totalSteps: unifiedContext.currentCourse.totalSteps,
        progress: { 
          comprehensionLevel: unifiedContext.progress.comprehensionLevel,
          knowledgeGaps: unifiedContext.struggles.knowledgeGaps
        }
      } : null;
      
      // Get latest canvas document
      const latestDocument = unifiedContext.canvasDocuments.length > 0 
        ? { title: unifiedContext.canvasDocuments[0].title }
        : null;
      
      // Generate the greeting with all context
      return await this.generateWarmEducationalGreeting(
        userName, 
        userPets, 
        userHobbies, 
        userLocation, 
        userRelationships,
        isReturningUser,
        latestCourse,
        latestDocument,
        weatherData,
        unifiedContext  // Pass unified context for extra richness
      );
      
    } catch (error) {
      console.error('❌ GreetingService.generatePersonalizedGreeting FAILED:', error);
      console.error('❌ Stack:', (error as Error).stack);
      return null;
    }
  }
  
  /**
   * 🎓 WARM EMPATHIC GREETING GENERATOR
   * Sounds like a genuine, caring coach - not a robot listing facts.
   * 
   * GOOD: "Hey Sammy! How are you doing tonight? I was just thinking about your Arabic journey - 
   *        you've been making really solid progress. Ready to keep the momentum going?"
   * 
   * BAD:  "Good evening, Sammy. You are 30% complete. Would you like to continue or review?"
   */
  private async generateWarmEducationalGreeting(
    userName: string | null, 
    userPets: string[], 
    userHobbies: string[], 
    _userLocation: string | null,
    userRelationships: string[],
    isReturningUser: boolean = true,
    latestCourse?: { name: string; title?: string; progress?: any; currentStep?: number; totalSteps?: number } | null,
    latestDocument?: { title: string } | null,
    weatherData?: { location: string; temperature_c: number; condition: string } | null,
    unifiedContext?: any
  ): Promise<string> {
    const timeContext = this.getTimeBasedContext();
    const name = userName || 'there';
    
    // Extract family names for warm mention
    const familyNames = userRelationships
      .map(r => {
        const colonIndex = r.indexOf(':');
        return colonIndex > 0 ? r.substring(colonIndex + 1).trim() : null;
      })
      .filter((n): n is string => !!n && n.length > 0 && n.length < 30);
    
    // Course info
    const courseName = latestCourse?.title || latestCourse?.name;
    const currentStep = latestCourse?.currentStep ?? latestCourse?.progress?.currentStep;
    const totalSteps = latestCourse?.totalSteps ?? latestCourse?.progress?.totalSteps;
    const percent = (currentStep !== undefined && totalSteps) 
      ? Math.round(((currentStep + 1) / totalSteps) * 100) 
      : null;
    const needsReview = unifiedContext?.retention?.itemsDueForReview > 0;
    const reviewCount = unifiedContext?.retention?.itemsDueForReview || 0;
    const documentTitle = latestDocument?.title;
    
    // ====================================
    // BUILD A GENUINELY WARM GREETING
    // ====================================
    
    const lines: string[] = [];
    
    // 🎯 BUILD A TRULY CONVERSATIONAL GREETING
    // Weave time, weather, location, and name into ONE natural sentence
    const hour = new Date().getHours();
    const temp = weatherData?.temperature_c;
    const locationName = weatherData?.location || _userLocation || '';
    
    // Determine time-based context
    let timeNote = '';
    if (hour >= 22 || hour < 5) {
      timeNote = 'working late';
    } else if (hour >= 5 && hour < 9) {
      timeNote = 'up early';
    } else if (hour >= 9 && hour < 12) {
      timeNote = 'starting your morning';
    } else if (hour >= 12 && hour < 14) {
      timeNote = 'taking a midday break';
    } else if (hour >= 14 && hour < 18) {
      timeNote = 'here this afternoon';
    } else {
      timeNote = 'here this evening';
    }
    
    // Build the warm opening that combines everything
    let opener = '';
    
    if (temp !== undefined && locationName) {
      // Full context: time + weather + location
      if (temp < 0) {
        opener = `Oh ${timeNote}, ${name}! Nice to see you again. 🌟 I hope it's not too freezing at ${temp}°C in ${locationName}—stay warm!`;
      } else if (temp < 10) {
        opener = `${timeNote.charAt(0).toUpperCase() + timeNote.slice(1)}, ${name}? Great to see you! It's a bit chilly at ${temp}°C in ${locationName}—good on you for pushing through. 💪`;
      } else if (temp > 30) {
        opener = `Hey ${name}! ${timeNote.charAt(0).toUpperCase() + timeNote.slice(1)}—hope you're staying cool at ${temp}°C in ${locationName}! 🌡️`;
      } else if (temp >= 20 && temp <= 25) {
        opener = `${name}! Perfect weather in ${locationName} at ${temp}°C. Great to see you ${timeNote}! ☀️`;
      } else {
        opener = `Hey ${name}! Nice to see you ${timeNote}. It's ${temp}°C in ${locationName}—not bad! 👋`;
      }
    } else if (locationName) {
      // Location but no weather
      opener = `Hey ${name}! Great to see you ${timeNote}. Hope all is well in ${locationName}! 👋`;
    } else {
      // Just time context
      const lateNightOpeners = [
        `Oh ${timeNote}, ${name}? Nice dedication! 🌙`,
        `${name}! Burning the midnight oil? Great to see you. ✨`,
        `Hey ${name}—${timeNote} I see! Love the commitment. 💪`
      ];
      const dayOpeners = [
        `Hey ${name}! Great to see you ${timeNote}. 👋`,
        `${name}! ${timeContext}—nice to have you back! 🌟`,
        `Welcome back, ${name}! Hope you're having a good one. 😊`
      ];
      const openers = (hour >= 22 || hour < 5) ? lateNightOpeners : dayOpeners;
      opener = openers[Math.floor(Date.now() / 60000) % openers.length];
    }
    
    lines.push(opener);
    
    // LINE 3: Family warmth (natural, not formulaic)
    if (familyNames.length > 0 && isReturningUser) {
      // Only mention sometimes - not every time
      if (new Date().getMinutes() % 2 === 0) {
        if (familyNames.length === 1) {
          lines.push(`Hope ${familyNames[0]} is doing well! 💙`);
        } else {
          const nameList = familyNames.slice(0, 3).join(' and ');
          lines.push(`Hope ${nameList} are all doing well!`);
        }
      }
    }
    
    // LINE 4: Course progress (encouraging, coach-like)
    if (courseName && percent !== null) {
      if (percent >= 100) {
        lines.push(`You finished "${courseName}"—that's amazing! 🎉 Really proud of you for sticking with it.`);
      } else if (needsReview && reviewCount > 0) {
        lines.push(`I noticed you've got ${reviewCount} items ready for a quick review in "${courseName}". Your brain will thank you for the refresher! 🧠`);
      } else if (percent > 70) {
        lines.push(`You're in the home stretch with "${courseName}"—${percent}% done! So close. Let's finish strong?`);
      } else if (percent > 30) {
        lines.push(`You've been making really solid progress on "${courseName}" (about ${percent}% through). How are you feeling about it?`);
      } else {
        lines.push(`Good to see you back! You started "${courseName}"—ready to dive deeper?`);
      }
    } else if (documentTitle) {
      lines.push(`I see you were working on "${documentTitle}" last time. Want to pick up where you left off?`);
    }
    
    // LINE 5: Gentle invitation (not a menu of options)
    if (!courseName && !documentTitle) {
      const invitations = [
        `What's on your mind today?`,
        `What would you like to explore?`,
        `Ready to learn something new?`,
        `What can I help you with?`
      ];
      const inviteIndex = Math.floor(Date.now() / 1000) % invitations.length;
      lines.push(invitations[inviteIndex]);
    } else if (courseName && percent !== null && percent < 100) {
      // Already asked about course above - add a gentle nudge
      if (!lines[lines.length - 1].includes('?')) {
        lines.push(`Let me know what you'd like to do—I'm here for you.`);
      }
    }
    
    // LINE 6: Pet mention (occasional, natural)
    if (userPets.length > 0 && new Date().getSeconds() % 5 === 0) {
      lines.push(`(Say hi to ${userPets[0]} for me! 🐾)`);
    }
    
    // Combine with natural paragraph breaks
    const greeting = lines.join('\n\n');
    console.log('✅ GreetingService: Built warm greeting:', greeting);
    
    return greeting;
  }
  
  /**
   * Build fallback greeting when LLM fails
   */
  private buildFallbackGreeting(
    userName: string | null,
    timeContext: string,
    weatherData?: { location: string; temperature_c: number; condition: string } | null,
    latestCourse?: { name: string; title?: string } | null,
    latestDocument?: { title: string } | null
  ): string {
    let greeting = `${timeContext}${userName ? `, ${userName}` : ''}! `;
    
    if (weatherData) {
      greeting += `It's ${weatherData.temperature_c}°C and ${weatherData.condition.toLowerCase()} in ${weatherData.location}. `;
    }
    
    if (latestCourse) {
      greeting += `Ready to continue with "${latestCourse.title || latestCourse.name}"?`;
    } else if (latestDocument) {
      greeting += `Want to keep working on "${latestDocument.title}"?`;
    } else {
      greeting += `What would you like to explore today? 🌟`;
    }
    
    return greeting;
  }
  
  /**
   * 🔒 ROBUST: Extract user name, excluding family members
   */
  extractUserName(memories: any[]): string | null {
    // 🔍 DEBUG: Log what memories we're searching
    console.log(`🔍 extractUserName: Searching ${memories.length} memories for user name`);
    
    // Log first 5 memories to see what we're working with
    for (let i = 0; i < Math.min(5, memories.length); i++) {
      const m = memories[i];
      console.log(`  Memory ${i}: key="${m.memory_key || m.key}", category="${m.category || m.metadata?.category}", content="${(m.content || m.value || '').substring(0, 50)}..."`);
    }
    
    // 🎯 PRIORITY 0: Check metadata.entityName with entityType = 'PERSON' or category = 'name'
    for (const memory of memories) {
      const metadata = memory.metadata || {};
      const key = (memory.memory_key || memory.key || '').toLowerCase();
      
      // Skip family members
      if (this.isFamilyMemberKey(key)) continue;
      
      if (metadata.entityName && metadata.category === 'name' && this.isValidPersonName(metadata.entityName)) {
        console.log(`✅ extractUserName: Found via metadata.entityName: "${metadata.entityName}"`);
        return metadata.entityName;
      }
    }
    
    // 🎯 PRIORITY 1: Look for metadata-based name storage with isAboutUser flag
    for (const memory of memories) {
      const metadata = memory.metadata || {};
      const content = memory.content || memory.value || memory.memory_value || '';
      
      if (metadata.category === 'name' && metadata.isAboutUser === true) {
        console.log(`✅ extractUserName: Found via isAboutUser flag: "${content}"`);
        return content;
      }
    }
    
    // 🎯 PRIORITY 2: Look for 'user_name' key (with or without timestamp suffix)
    for (const memory of memories) {
      const key = memory.memory_key || memory.key || '';
      const keyLower = key.toLowerCase();
      const content = memory.content || memory.value || memory.memory_value || '';
      const metadata = memory.metadata || {};
      
      // Match 'user_name' or 'user_name_1234567890'
      if ((keyLower === 'user_name' || keyLower.startsWith('user_name_')) && metadata.isAboutUser !== false) {
        // Content should be just the name
        const name = this.extractActualName(content);
        if (name && this.isValidPersonName(name)) {
          console.log(`✅ extractUserName: Found via user_name key: "${name}"`);
          return name;
        }
      }
    }
    
    // 🎯 PRIORITY 3: Look for category = 'name' in metadata
    for (const memory of memories) {
      const key = memory.memory_key || memory.key || '';
      const category = memory.category || memory.metadata?.category || '';
      const content = memory.content || memory.value || memory.memory_value || '';
      
      if (category === 'name' && !this.isFamilyMemberKey(key)) {
        const name = this.extractActualName(content);
        if (name && this.isValidPersonName(name)) {
          console.log(`✅ extractUserName: Found via category=name: "${name}"`);
          return name;
        }
      }
    }
    
    // 🎯 PRIORITY 4: Any memory with 'name' in the key
    for (const memory of memories) {
      const key = (memory.memory_key || memory.key || '').toLowerCase();
      const content = memory.content || memory.value || memory.memory_value || '';
      
      if (this.isFamilyMemberKey(key)) continue;
      
      // Look for keys like "my_name", "name", etc.
      if (key === 'name' || key === 'my_name' || key === 'first_name') {
        const name = this.extractActualName(content);
        if (name && this.isValidPersonName(name)) {
          console.log(`✅ extractUserName: Found via key match: "${name}"`);
          return name;
        }
      }
    }
    
    // 🎯 PRIORITY 5: FALLBACK - Search content for "my name is X" patterns
    for (const memory of memories) {
      const content = memory.content || memory.value || memory.memory_value || '';
      if (!content || content.length > 200) continue;
      
      // Match patterns like "my name is Sammy", "I'm Sammy", "call me Sammy"
      const namePatterns = [
        /my name is (\w+)/i,
        /i(?:'m| am) (\w+)/i,
        /call me (\w+)/i,
        /name[:\s]+(\w+)/i
      ];
      
      for (const pattern of namePatterns) {
        const match = content.match(pattern);
        if (match && match[1] && !this.isCommonWord(match[1]) && this.isValidPersonName(match[1])) {
          console.log(`✅ extractUserName: Found via content pattern: "${match[1]}"`);
          return match[1];
        }
      }
    }
    
    console.log('❌ extractUserName: No name found in memories');
    return null;
  }
  
  /**
   * Extract user's pets from memories - NO REGEX
   */
  extractUserPets(memories: any[]): string[] {
    const pets: string[] = [];
    const seen = new Set<string>();
    
    for (const memory of memories) {
      const key = (memory.memory_key || memory.key || '').toLowerCase();
      const content = memory.content || memory.value || memory.memory_value || '';
      const category = (memory.category || memory.metadata?.category || '').toLowerCase();
      
      // Skip if content is too long (not a pet name)
      if (!content || content.length > 50) continue;
      
      // Skip family members' pets or third-party content
      if (this.isThirdPartyMemory(key, content)) continue;
      
      // Skip canvas/document content
      if (key.includes('canvas') || key.includes('document')) continue;
      
      // Method 1: Check key for pet indicators
      const isPetKey = key.includes('pet') || key.includes('dog') || key.includes('cat') || 
                       key.includes('bird') || key.includes('fish') || key.includes('animal');
      
      // Method 2: Check category
      const isPetCategory = category === 'pet' || category === 'pets' || category === 'animal';
      
      if (isPetKey || isPetCategory) {
        const petName = content.trim();
        if (petName && !seen.has(petName.toLowerCase())) {
          seen.add(petName.toLowerCase());
          pets.push(petName);
        }
      }
    }
    
    return pets.slice(0, 3); // Max 3 pets
  }
  
  /**
   * Extract user's hobbies from memories
   */
  /**
   * Extract user's hobbies from memories - NO REGEX
   */
  extractUserHobbies(memories: any[]): string[] {
    const hobbies: string[] = [];
    const seen = new Set<string>();
    
    for (const memory of memories) {
      const key = (memory.memory_key || memory.key || '').toLowerCase();
      const content = memory.content || memory.value || memory.memory_value || '';
      const category = (memory.category || memory.metadata?.category || '').toLowerCase();
      
      // Skip if content is too long
      if (!content || content.length > 50) continue;
      
      // Skip family members' hobbies or third-party content
      if (this.isThirdPartyMemory(key, content)) continue;
      
      // Skip canvas/document content
      if (key.includes('canvas') || key.includes('document')) continue;
      
      // Method 1: Check key for hobby indicators
      const isHobbyKey = key.includes('hobby') || key.includes('interest') || 
                         key.includes('likes') || key.includes('enjoys') || 
                         key.includes('preference');
      
      // Method 2: Check category
      const isHobbyCategory = category === 'hobby' || category === 'hobbies' || 
                              category === 'interest' || category === 'preference';
      
      if (isHobbyKey || isHobbyCategory) {
        const hobby = content.trim();
        if (hobby && !seen.has(hobby.toLowerCase())) {
          seen.add(hobby.toLowerCase());
          hobbies.push(hobby);
        }
      }
    }
    
    return hobbies.slice(0, 5);
  }
  
  /**
   * Extract user's location from memories - NO REGEX
   */
  extractUserLocation(memories: any[]): string | null {
    for (const memory of memories) {
      const key = (memory.memory_key || memory.key || '').toLowerCase();
      const content = memory.content || memory.value || memory.memory_value || '';
      const category = (memory.category || memory.metadata?.category || '').toLowerCase();
      
      // Skip if content is too long
      if (!content || content.length > 100) continue;
      
      // Skip family members' locations
      if (this.isThirdPartyMemory(key, content)) continue;
      
      // Check key for location indicators
      const isLocationKey = key.includes('location') || key.includes('city') || 
                            key.includes('country') || key.includes('address') ||
                            key.includes('lives_in') || key.includes('based_in');
      
      // Check category
      const isLocationCategory = category === 'location';
      
      if (isLocationKey || isLocationCategory) {
        return content.trim();
      }
    }
    
    return null;
  }
  
  /**
   * Extract user's profession from memories - NO REGEX
   */
  extractUserProfession(memories: any[]): string | null {
    for (const memory of memories) {
      const key = (memory.memory_key || memory.key || '').toLowerCase();
      const content = memory.content || memory.value || memory.memory_value || '';
      const category = (memory.category || memory.metadata?.category || '').toLowerCase();
      
      // Skip if content is too long
      if (!content || content.length > 100) continue;
      
      // Skip family members' professions
      if (this.isThirdPartyMemory(key, content)) continue;
      
      // Check key for profession indicators
      const isProfessionKey = key.includes('job') || key.includes('work') || 
                              key.includes('profession') || key.includes('career') ||
                              key.includes('occupation') || key.includes('role');
      
      // Check category
      const isProfessionCategory = category === 'profession' || category === 'job' || category === 'work';
      
      if (isProfessionKey || isProfessionCategory) {
        return content.trim();
      }
    }
    
    return null;
  }
  
  /**
   * 🎯 Extract user's relationships (family, spouse, etc.)
   * NO REGEX - uses structured memory data directly
   */
  extractUserRelationships(memories: any[]): string[] {
    const relationships: string[] = [];
    const seen = new Set<string>(); // Avoid duplicates
    
    // Relationship type keywords in memory keys
    const relationshipTypes = [
      'wife', 'husband', 'spouse', 'partner',
      'daughter', 'son', 'child', 'kid',
      'mother', 'father', 'mom', 'dad',
      'sister', 'brother', 'sibling',
      'grandmother', 'grandfather', 'grandma', 'grandpa',
      'uncle', 'aunt', 'cousin', 'niece', 'nephew'
    ];
    
    for (const memory of memories) {
      const key = (memory.memory_key || memory.key || '').toLowerCase();
      const content = memory.content || memory.value || memory.memory_value || '';
      const metadata = memory.metadata || {};
      const category = (metadata.category || memory.category || '').toLowerCase();
      
      // Skip if it's a document or canvas content
      if (key.includes('canvas') || key.includes('document')) continue;
      
      // 🎯 PRIORITY 1: Use metadata.entityName if available (most reliable)
      if (metadata.entityName && this.isValidPersonName(metadata.entityName)) {
        const relType = metadata.entityRelation || metadata.relationship || 'family member';
        const name = metadata.entityName;
        if (!seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          relationships.push(`${relType}: ${name}`);
          console.log(`✅ extractUserRelationships: Found ${relType}: ${name} from metadata.entityName`);
        }
        continue;
      }
      
      // 🎯 PRIORITY 2: Extract relation type from key, name from content
      for (const relType of relationshipTypes) {
        if (key.includes(relType) || key.includes(`family_${relType}`)) {
          // Don't process if content is just the relation type repeated
          if (content.toLowerCase() === relType || content.toLowerCase().includes(`_${relType}:`)) {
            // Skip - content is malformed like "family_wife_family: wife"
            continue;
          }
          const name = this.extractActualName(content);
          if (name && !seen.has(name.toLowerCase()) && this.isValidPersonName(name)) {
            seen.add(name.toLowerCase());
            relationships.push(`${relType}: ${name}`);
            console.log(`✅ extractUserRelationships: Found ${relType}: ${name} from content`);
          }
          break;
        }
      }
      
      // 🎯 PRIORITY 3: Check metadata category (fallback)
      if (category === 'family' || category === 'relationship') {
        const relType = metadata.relationship || metadata.relation || metadata.entityRelation || 'family member';
        const name = this.extractActualName(content);
        if (name && !seen.has(name.toLowerCase()) && this.isValidPersonName(name)) {
          seen.add(name.toLowerCase());
          relationships.push(`${relType}: ${name}`);
        }
      }
    }
    
    return relationships.slice(0, 8);
  }
  
  // === HELPER METHODS ===
  
  /**
   * Check if a memory key indicates a family member
   */
  isFamilyMemberKey(key: string): boolean {
    const keyLower = (key || '').toLowerCase();
    
    if (keyLower.startsWith('family_')) return true;
    if (keyLower.startsWith('user_')) return false;
    
    const familyIndicators = [
      'mother', 'father', 'mom', 'dad', 'parent',
      'wife', 'husband', 'spouse', 'partner',
      'daughter', 'son', 'child', 'kid',
      'sister', 'brother', 'sibling',
      'grandmother', 'grandfather', 'grandma', 'grandpa',
      'uncle', 'aunt', 'cousin', 'niece', 'nephew',
      '_family', 'relative', 'friend_', 'colleague_', 'coworker_'
    ];
    
    return familyIndicators.some(indicator => keyLower.includes(indicator));
  }
  
  /**
   * Check if memory content is about a family member - NO REGEX
   */
  isFamilyMemberContent(content: string): boolean {
    const contentLower = (content || '').toLowerCase();
    
    // Simple keyword check
    const familyKeywords = [
      'my mother', 'my father', 'my mom', 'my dad',
      'my wife', 'my husband', 'my spouse', 'my partner',
      'my daughter', 'my son', 'my child',
      'my sister', 'my brother',
      'her name', 'his name', 'their name'
    ];
    
    return familyKeywords.some(keyword => contentLower.includes(keyword));
  }
  
  /**
   * Check if a word is a common word that's not a name
   */
  isCommonWord(word: string): boolean {
    const commonWords = [
      'here', 'back', 'good', 'fine', 'okay', 'ready', 'done', 'new',
      'going', 'coming', 'working', 'living', 'feeling', 'thinking',
      'a', 'an', 'the', 'very', 'really', 'quite', 'just', 'now'
    ];
    return commonWords.includes(word.toLowerCase());
  }
  
  /**
   * Extract actual name from content that might contain extra text
   * Handles: "Sarah", "my wife Sarah", "named Sarah", "Sarah Tunell"
   */
  extractActualName(content: string): string {
    if (!content) return '';
    
    let cleaned = content.trim();
    
    // If content is short (under 30 chars), it's likely just a name
    if (cleaned.length < 30) {
      // Remove common prefixes
      cleaned = cleaned
        .replace(/^(my\s+)?(wife|husband|son|daughter|mother|father|mom|dad|partner|spouse)\s*(is\s+)?(named\s+|called\s+)?/i, '')
        .replace(/^(named|called)\s+/i, '')
        .trim();
      
      // Return first capitalized word(s) that look like a name
      const words = cleaned.split(/\s+/);
      const nameWords: string[] = [];
      
      for (const word of words) {
        // Check if word starts with capital (likely a name)
        if (word.length > 1 && /^[A-Z]/.test(word)) {
          nameWords.push(word);
        } else if (nameWords.length > 0) {
          // Stop at first non-capitalized word after we've found name parts
          break;
        }
      }
      
      if (nameWords.length > 0) {
        return nameWords.join(' ');
      }
      
      return cleaned;
    }
    
    return '';
  }
  
  /**
   * Check if a string looks like a valid person name
   * Filters out common words, verbs, and garbage
   */
  isValidPersonName(name: string): boolean {
    if (!name || name.length < 2 || name.length > 50) return false;
    
    const nameLower = name.toLowerCase();
    
    // List of words that are NOT names
    const invalidNames = [
      'named', 'called', 'name', 'is', 'are', 'was', 'were', 'the', 'a', 'an',
      'my', 'your', 'his', 'her', 'their', 'our', 'its',
      'wife', 'husband', 'son', 'daughter', 'mother', 'father', 'mom', 'dad',
      'partner', 'spouse', 'child', 'kid', 'baby', 'sibling',
      'here', 'there', 'back', 'good', 'fine', 'okay', 'yes', 'no',
      'going', 'coming', 'working', 'doing', 'being', 'having',
      'document', 'canvas', 'null', 'undefined', 'true', 'false'
    ];
    
    // Check if it's in the invalid list
    if (invalidNames.includes(nameLower)) return false;
    
    // Check if it's all lowercase (names should have capital)
    if (name === nameLower && name.length > 2) return false;
    
    // Check first character is a letter
    if (!/^[A-Za-z]/.test(name)) return false;
    
    return true;
  }
  
  /**
   * 🔒 Check if a memory is about a THIRD PARTY (not the user themselves)
   */
  isThirdPartyMemory(key: string, content: string): boolean {
    const keyLower = (key || '').toLowerCase();
    const contentLower = (content || '').toLowerCase();
    
    const relationshipKeyIndicators = [
      'mother', 'father', 'mom', 'dad', 'parent',
      'wife', 'husband', 'spouse', 'partner',
      'daughter', 'son', 'child', 'kid', 'baby',
      'sister', 'brother', 'sibling',
      'grandmother', 'grandfather', 'grandma', 'grandpa', 'grandparent',
      'uncle', 'aunt', 'cousin', 'niece', 'nephew',
      'friend', 'colleague', 'coworker', 'boss', 'manager',
      'family_', '_family', 'relative', 'in_law', 'inlaw',
      'neighbor', 'roommate', 'mentor', 'teacher', 'student'
    ];
    
    if (relationshipKeyIndicators.some(indicator => keyLower.includes(indicator))) {
      return true;
    }
    
    const thirdPartyContentPatterns = [
      /(?:my|our)\s+(?:mother|father|mom|dad|wife|husband|daughter|son|sister|brother|uncle|aunt|cousin|friend|colleague|boss|grandma|grandpa|grandmother|grandfather|parent|child|kid|baby|partner|spouse|nephew|niece|in-law|mentor|teacher)/i,
      /(?:her|his|their|s?he)\s+(?:name|job|work|career|profession|occupation)/i,
      /\bis\s+(?:my|our)\s+(?:mother|father|mom|dad|wife|husband|daughter|son|sister|brother|uncle|aunt|cousin|friend|colleague|boss)/i
    ];
    
    return thirdPartyContentPatterns.some(pattern => pattern.test(contentLower));
  }
  
  /**
   * Extract pet info from content string
   */
  /**
   * Extract pet info from content - NO REGEX
   * If content is structured (just a name), use it directly
   */
  private extractPetInfo(content: string): string | null {
    if (!content) return null;
    const trimmed = content.trim();
    // If content is short (a name), use it directly
    if (trimmed.length < 30) return trimmed;
    return null;
  }
  
  /**
   * Extract hobby info from content - NO REGEX
   * If content is structured (just a hobby), use it directly
   */
  private extractHobbyInfo(content: string): string | null {
    if (!content) return null;
    const trimmed = content.trim();
    // If content is short (a hobby name), use it directly
    if (trimmed.length < 50) return trimmed;
    return null;
  }
  
  /**
   * 🌟 NEW USER ONBOARDING GREETING
   * Warm, engaging introduction for first-time users
   */
  private generateNewUserOnboarding(): string {
    const timeGreeting = this.getTimeBasedContext();
    
    const greetings = [
      `${timeGreeting}! I'm NeuraPlay, your personal learning companion. 🌟\n\nI'm here to help you learn *anything* you're curious about—languages, science, history, coding, or whatever sparks your interest. I can create personalized courses just for you, help you practice with quizzes, and remember your progress so we can pick up right where you left off.\n\nWhat's your name? I'd love to get to know you and hear what you're excited to learn!`,
      
      `${timeGreeting}! Welcome to NeuraPlay! 🎓✨\n\nI'm your AI learning coach—think of me as a tutor who's always here, never judges, and genuinely cares about helping you grow. Whether you want to learn a new language, dive into a subject, or just explore something fun, I'm here for it.\n\nLet's start simple: What should I call you? And what are you curious about right now?`,
      
      `${timeGreeting}! Great to meet you! I'm NeuraPlay. 🌟\n\nImagine having a personal teacher who adapts to exactly how you learn best—that's what I'm here to be. I can build custom courses, explain tricky concepts in ways that click, and even remember what you've been working on.\n\nFirst things first—what's your name? And tell me, what would you love to learn if you had unlimited time?`
    ];
    
    // Pick a random greeting for variety
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    console.log('🌟 GreetingService: Generated new user onboarding');
    return greeting;
  }
}

// Singleton export
export const greetingService = new GreetingService();
export default greetingService;


