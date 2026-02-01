/**
 * 🎯 UNIFIED LEARNING CONTEXT SERVICE
 * 
 * SINGLE source of truth for ALL learning context the AI needs.
 * Consolidates: DashboardContextService + LearningProgressContextService + UserLearningContextService
 * 
 * Provides:
 * - Current course/step the user is on
 * - Progress percentage
 * - Actual lesson CONTENT (what they're studying)
 * - Struggles and knowledge gaps
 * - Emotional journey
 * - Spaced repetition data
 * - Canvas documents
 */

import { learningModuleTracker } from './LearningModuleTracker';

export interface UnifiedLearningContext {
  userId: string;
  
  // CURRENT STATE
  isInLearningCentral: boolean;
  currentCourse: {
    id: string;
    name: string;
    category: string;
    currentStep: number;      // Section index (0-based)
    totalSteps: number;       // Total sections
    progressPercent: number;
    phase: string;
    sessionId: string;
    // 🎯 THE KEY FIX: Actual content of what they're learning
    currentStepContent?: string;
    currentStepTitle?: string;
    // 🎯 NEW: Granular chunk position (for "step 1, part 2 of 6" context)
    currentChunkIndex?: number;   // Current chunk within section (0-based)
    totalChunksInSection?: number;  // Total chunks in current section
    currentChunkTitle?: string;   // Title of current chunk
    currentChunkContent?: string; // Content of current chunk (what user is reading)
    currentChunkType?: string;    // Type: reading, quiz, practice, etc.
  } | null;
  
  // PROGRESS & STATS
  progress: {
    comprehensionLevel: number;  // 0-100
    questionsAnswered: number;
    totalQuestions: number;
    timeSpentMinutes: number;
    lastAccessed: Date | null;
  };
  
  // STRUGGLES & GAPS
  struggles: {
    knowledgeGaps: string[];
    weakAreas: string[];
    needsEncouragement: boolean;
    encouragementReason?: string;
  };
  
  // RETENTION (Spaced Repetition)
  retention: {
    itemsDueForReview: number;
    averageRetention: number;  // 0-100
    overdueConcepts: string[];
  };
  
  // EMOTIONAL STATE
  emotional: {
    recentMood: 'positive' | 'negative' | 'neutral' | 'mixed';
    recentEmotions: string[];
    struggleDetected: boolean;
  };
  
  // AVAILABLE COURSES (names for legacy compatibility)
  availableCourses: string[];
  
  // 🎯 NEW: Full course info for AI navigation (most recent first, includes IDs)
  courseList: Array<{
    id: string;
    title: string;
    category?: string;
    lastAccessed?: string;
  }>;
  
  // CANVAS DOCUMENTS
  canvasDocuments: Array<{
    id: string;
    title: string;
    type: string;
    updatedAt: number;
  }>;
  
  // 🎯 CHUNK ACTIVITY DATA (quiz performance, reading progress inside chunks)
  chunkActivity: {
    recentQuizPerformance: {
      correct: number;
      total: number;
      accuracy: number;
    };
    weakConcepts: Array<{
      concept: string;
      accuracy: number;
      moduleName?: string;
    }>;
    strongConcepts: Array<{
      concept: string;
      accuracy: number;
    }>;
    recentActivities: Array<{
      type: string;
      chunk: string;
      timestamp: Date;
    }>;
    dynamicQuizStats: {
      averageScore: number;
      streakDays: number;
      questionsAnswered: number;
    } | null;
  };
  
  // FORMATTED FOR AI (ready to inject into prompt)
  formattedForAI: string;
}

class UnifiedLearningContextService {
  private static instance: UnifiedLearningContextService;
  private contextCache: Map<string, { context: UnifiedLearningContext; timestamp: number }> = new Map();
  private CACHE_TTL = 5000; // 5 second cache

  static getInstance(): UnifiedLearningContextService {
    if (!UnifiedLearningContextService.instance) {
      UnifiedLearningContextService.instance = new UnifiedLearningContextService();
    }
    return UnifiedLearningContextService.instance;
  }

  /**
   * 🎯 GET COMPLETE LEARNING CONTEXT
   * Single method to get EVERYTHING the AI needs
   */
  async getContext(userId: string, currentMessage?: string): Promise<UnifiedLearningContext> {
    // Check cache
    const cached = this.contextCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.context;
    }

    const context: UnifiedLearningContext = {
      userId,
      isInLearningCentral: false,
      currentCourse: null,
      progress: {
        comprehensionLevel: 0,
        questionsAnswered: 0,
        totalQuestions: 0,
        timeSpentMinutes: 0,
        lastAccessed: null
      },
      struggles: {
        knowledgeGaps: [],
        weakAreas: [],
        needsEncouragement: false
      },
      retention: {
        itemsDueForReview: 0,
        averageRetention: 0,
        overdueConcepts: []
      },
      emotional: {
        recentMood: 'neutral',
        recentEmotions: [],
        struggleDetected: false
      },
      availableCourses: [],
      courseList: [], // 🎯 NEW: Full course info for AI navigation
      canvasDocuments: [],
      chunkActivity: {
        recentQuizPerformance: { correct: 0, total: 0, accuracy: 0 },
        weakConcepts: [],
        strongConcepts: [],
        recentActivities: [],
        dynamicQuizStats: null
      },
      formattedForAI: ''
    };

    try {
      // 1. GET DASHBOARD CONTEXT (current activity)
      await this.populateFromDashboard(context, userId);
      
      // 2. GET COURSE CONTENT (if in a course)
      if (context.currentCourse?.sessionId) {
        await this.populateCourseContent(context);
      }
      
      // 3. GET PROGRESS STATS
      await this.populateProgressStats(context, userId);
      
      // 4. GET STRUGGLES & EMOTIONAL STATE
      await this.populateStrugglesAndEmotional(context, userId);
      
      // 5. GET SPACED REPETITION DATA
      await this.populateRetentionData(context, userId);
      
      // 6. GET CANVAS DOCUMENTS
      await this.populateCanvasDocuments(context);
      
      // 7. GET CHUNK ACTIVITY DATA (quiz performance inside chunks)
      await this.populateChunkActivityData(context, userId);
      
      // 8. FORMAT FOR AI
      context.formattedForAI = this.formatForAI(context, currentMessage);
      
    } catch (error) {
      console.warn('⚠️ UnifiedLearningContext: Error building context:', error);
    }

    // Cache result
    this.contextCache.set(userId, { context, timestamp: Date.now() });
    
    return context;
  }

  private async populateFromDashboard(context: UnifiedLearningContext, userId: string): Promise<void> {
    try {
      const { dashboardContextService } = await import('./DashboardContextService');
      const dashboardContext = dashboardContextService.getCurrentDashboardContext(userId);
      
      // 🎯 FIRST: Try dashboard context (real-time, if user is viewing)
      if (dashboardContext) {
        context.isInLearningCentral = dashboardContext.isInDashboard;
        context.availableCourses = dashboardContext.availableCourses || [];
        
        if (dashboardContext.activeModule) {
          const module = dashboardContext.activeModule as any; // Cast to access all properties
          const currentStep = module.currentStepIndex ?? module.progress?.currentStepIndex ?? 0;
          
          // 🔧 FIX: Check multiple sources for totalSteps to avoid defaulting to 1
          // Priority: module.totalSteps > progress.totalSteps > progress.totalSections > 1
          const totalSteps = module.totalSteps || 
                             module.progress?.totalSteps || 
                             module.progress?.totalSections || 
                             1;
          
          // 🔧 FIX: Use overallProgress if available (calculated correctly by GenerativeLearningModule)
          // Otherwise calculate from currentStep/totalSteps
          const progressPercent = module.progress?.overallProgress ?? 
                                  module.progress?.progressPercent ??
                                  Math.round(((currentStep + 1) / Math.max(totalSteps, 1)) * 100);
          
          context.currentCourse = {
            id: module.id,
            name: module.name,
            category: module.category,
            currentStep,
            totalSteps,
            progressPercent,
            phase: module.phase,
            sessionId: module.learningSessionId || '',
            // 🎯 NEW: Granular chunk position (for "Section 1, Part 2 of 6" context)
            currentChunkIndex: module.currentChunkIndex ?? module.progress?.currentChunkIndex,
            totalChunksInSection: module.totalChunksInSection ?? module.progress?.totalChunks,
            currentStepTitle: module.currentSectionTitle ?? module.progress?.currentSectionTitle,
            currentChunkTitle: module.currentChunkTitle ?? module.progress?.currentChunkTitle,
            currentChunkType: module.progress?.currentChunkType
          };
          
          if (module.progress) {
            context.progress.comprehensionLevel = module.progress.comprehensionLevel ?? 0;
            context.progress.questionsAnswered = module.progress.questionsAnswered ?? 0;
            context.progress.totalQuestions = module.progress.totalQuestions ?? 0;
          }
          return; // Dashboard has active module, we're done
        }
      }
      
      // 🎯 FALLBACK: Load courses from localStorage (even when not viewing)
      await this.loadCoursesFromStorage(context);
      
    } catch (e) {
      console.warn('⚠️ Dashboard context unavailable:', e);
      // Still try localStorage fallback
      await this.loadCoursesFromStorage(context);
    }
  }
  
  /**
   * 🎯 CRITICAL: Load courses from DATABASE (primary) and localStorage (fallback)
   * AI needs to know about ALL courses, in MOST RECENT FIRST order
   */
  private async loadCoursesFromStorage(context: UnifiedLearningContext): Promise<void> {
    try {
      // 🎯 FIX: Try to get courses from DATABASE first (authoritative source)
      let courses: any[] = [];
      
      try {
        const { courseStorageService } = await import('./CourseStorageService');
        if (context.userId) {
          const dbCourses = await courseStorageService.loadCourses(context.userId);
          if (Array.isArray(dbCourses) && dbCourses.length > 0) {
            courses = dbCourses;
            console.log(`📚 UnifiedLearningContext: Loaded ${courses.length} courses from DATABASE`);
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Database course fetch failed, using localStorage:', dbError);
      }
      
      // Fallback to localStorage if database fetch failed
      if (courses.length === 0) {
      const storedCourses = localStorage.getItem('neuraplay_custom_courses');
      if (storedCourses) {
        const parsed = JSON.parse(storedCourses);
        if (Array.isArray(parsed)) {
            courses = parsed;
            console.log(`📚 UnifiedLearningContext: Loaded ${courses.length} courses from localStorage`);
          }
        }
      }
      
      // 🎯 CRITICAL FIX: Sort courses by MOST RECENT FIRST before processing
      // This ensures the most recent course becomes currentCourse, not an older one
      courses.sort((a: any, b: any) => {
        const dateA = new Date(a.lastAccessed || a.updatedAt || 0).getTime();
        const dateB = new Date(b.lastAccessed || b.updatedAt || 0).getTime();
        return dateB - dateA; // Most recent first
      });
      console.log(`📚 UnifiedLearningContext: Sorted ${courses.length} courses by recency before processing`);
      
      // Store full course info for AI navigation
      (context as any).courseList = [];
      
      for (const course of courses) {
            const courseName = course.name || course.title;
        const courseId = course.id;
        
        if (courseName) {
          // Add to legacy availableCourses (names only)
          if (!context.availableCourses.includes(courseName)) {
              context.availableCourses.push(courseName);
          }
          
          // 🎯 NEW: Add to courseList with full info
          (context as any).courseList.push({
            id: courseId,
            title: courseName,
            category: course.category || 'custom',
            lastAccessed: course.lastAccessed || course.updatedAt
          });
            }
            
            // Get progress for this course
            const progressKey = `course_progress_${course.id}`;
            const savedProgress = localStorage.getItem(progressKey);
            
            if (savedProgress) {
              const progressData = JSON.parse(savedProgress);
              
              // If this course has progress and no current course is set, use it as current
              if (!context.currentCourse && progressData.currentSectionIndex !== undefined) {
                // 🎯 FIX: Calculate total chunks (actual steps) across all sections
                const totalChunks = this.calculateTotalChunks(course);
                const currentChunkIndex = progressData.currentChunkIndex ?? progressData.currentSectionIndex ?? 0;
                
                context.currentCourse = {
                  id: course.id,
                  name: courseName,
                  category: course.category || 'custom',
                  currentStep: currentChunkIndex,
                  totalSteps: totalChunks || progressData.totalChunks || progressData.totalSections || 1,
                  progressPercent: progressData.progressPercent || 
                    Math.round(((currentChunkIndex + 1) / (totalChunks || 1)) * 100),
                  phase: progressData.phase || 'in_progress',
                  sessionId: progressData.sessionId || course.id
                };
                
                context.progress.comprehensionLevel = progressData.comprehensionLevel || 0;
              }
            }
          }
      
      // 🎯 CRITICAL FIX: Sort courses by MOST RECENT FIRST
      // This ensures the AI shows the French course (recently accessed) before Arabic course
      if ((context as any).courseList && (context as any).courseList.length > 1) {
        (context as any).courseList.sort((a: any, b: any) => {
          const dateA = new Date(a.lastAccessed || 0).getTime();
          const dateB = new Date(b.lastAccessed || 0).getTime();
          return dateB - dateA; // Most recent first
        });
        console.log(`📚 UnifiedLearningContext: Sorted ${(context as any).courseList.length} courses by recency`);
          }
      
      console.log(`📚 UnifiedLearningContext: Available courses: ${context.availableCourses.join(', ')}`);
      console.log(`📚 UnifiedLearningContext: Course list for AI: ${(context as any).courseList?.map((c: any) => c.title).join(', ')}`);
      
      
      // 2. Get generated modules from LearningModuleTracker
      const trackerSessions = learningModuleTracker.getActiveSessions();
      for (const [sessionId, sessionData] of Object.entries(trackerSessions)) {
        const courseName = (sessionData as any).moduleName || (sessionData as any).title;
        if (courseName && !context.availableCourses.includes(courseName)) {
          context.availableCourses.push(courseName);
        }
        
        // If no current course set, use most recent active session
        if (!context.currentCourse && sessionData) {
          const sd = sessionData as any;
          const totalChunks = this.calculateTotalChunks(sd);
          
          context.currentCourse = {
            id: sessionId,
            name: courseName || 'Active Course',
            category: sd.category || 'learning',
            currentStep: sd.currentChunkIndex ?? sd.currentStepIndex ?? 0,
            totalSteps: totalChunks || sd.totalChunks || sd.totalSteps || 1,
            progressPercent: sd.progressPercent || 0,
            phase: sd.phase || 'in_progress',
            sessionId: sessionId
          };
        }
      }
      
      console.log('📚 UnifiedLearningContext: Loaded from storage:', {
        availableCourses: context.availableCourses,
        currentCourse: context.currentCourse?.name
      });
      
    } catch (e) {
      console.warn('⚠️ Failed to load courses from storage:', e);
    }
  }

  private async populateCourseContent(context: UnifiedLearningContext): Promise<void> {
    if (!context.currentCourse?.sessionId) return;
    
    try {
      // Get the full course data
      const course = learningModuleTracker.getCurrentCourseContent(context.currentCourse.sessionId);
      if (!course?.sections || course.sections.length === 0) {
        console.log('📚 UnifiedLearningContext: No course sections found');
        return;
      }
      
      const currentSectionIndex = context.currentCourse.currentStep || 0;
      const currentSection = course.sections[currentSectionIndex];
      
      if (currentSection) {
        // 🎯 SECTION-LEVEL DATA
        context.currentCourse.currentStepTitle = currentSection.title;
        context.currentCourse.currentStepContent = currentSection.content?.substring(0, 2000);
        
        // 🎯 GRANULAR CHUNK-LEVEL DATA (sophisticated tracking!)
        if (currentSection.chunks && currentSection.chunks.length > 0) {
          // Get the current chunk index from localStorage progress
          const progressKey = `course_progress_${context.currentCourse.id}`;
          let currentChunkInSection = 0;
          
          try {
            const savedProgress = localStorage.getItem(progressKey);
            if (savedProgress) {
              const progressData = JSON.parse(savedProgress);
              currentChunkInSection = progressData.currentChunkIndex || 0;
              
              // Adjust if chunk index is section-relative vs absolute
              if (progressData.currentSectionIndex !== undefined) {
                // Calculate chunk offset for current section
                let chunkOffset = 0;
                for (let i = 0; i < currentSectionIndex; i++) {
                  chunkOffset += course.sections[i]?.chunks?.length || 1;
                }
                currentChunkInSection = Math.max(0, (progressData.currentChunkIndex || 0) - chunkOffset);
              }
            }
          } catch (e) { /* Use 0 as default */ }
          
          // Clamp to valid range
          currentChunkInSection = Math.min(currentChunkInSection, currentSection.chunks.length - 1);
          currentChunkInSection = Math.max(0, currentChunkInSection);
          
          const currentChunk = currentSection.chunks[currentChunkInSection];
          
          if (currentChunk) {
            context.currentCourse.currentChunkIndex = currentChunkInSection;
            context.currentCourse.totalChunksInSection = currentSection.chunks.length;
            context.currentCourse.currentChunkTitle = currentChunk.title || `Part ${currentChunkInSection + 1}`;
            context.currentCourse.currentChunkType = currentChunk.type || 'reading';
            
            // 🎯 THE ACTUAL CONTENT the user is reading RIGHT NOW
            context.currentCourse.currentChunkContent = typeof currentChunk.content === 'string'
              ? currentChunk.content.substring(0, 1500)
              : JSON.stringify(currentChunk.content).substring(0, 1500);
            
            console.log(`📚 UnifiedLearningContext: User is on Section ${currentSectionIndex + 1} "${currentSection.title}", ` +
              `Chunk ${currentChunkInSection + 1}/${currentSection.chunks.length} "${currentChunk.title}" (${currentChunk.type})`);
          }
        } else {
          console.log(`📚 UnifiedLearningContext: Section ${currentSectionIndex + 1} has no chunks array`);
        }
      }
      
      // Also include formatted full course for reference
      const fullCourseContext = learningModuleTracker.formatCourseForAI(
        context.currentCourse.sessionId,
        context.currentCourse.currentStep
      );
      
      if (fullCourseContext && !context.currentCourse.currentStepContent) {
        context.currentCourse.currentStepContent = fullCourseContext.substring(0, 2000);
      }
    } catch (e) {
      console.warn('⚠️ Course content unavailable:', e);
    }
  }

  /**
   * 🎯 Calculate total chunks (steps) across all sections of a course
   * Each section has multiple chunks (hook, concept, visual, example, quiz, recap)
   * 
   * 🔧 FIX: Check multiple property paths since course structure varies:
   * - course.sections (direct)
   * - course.generatedCourse.sections (from createLightweightCourse)
   * - course.sectionCount (from metadata)
   */
  private calculateTotalChunks(course: any): number {
    if (!course) return 1;
    
    // If course has explicit totalChunks, use it
    if (course.totalChunks) return course.totalChunks;
    
    // 🔧 FIX: Check both course.sections AND course.generatedCourse.sections
    const sections = course.sections || course.generatedCourse?.sections;
    
    // Otherwise, count chunks in all sections
    if (sections && Array.isArray(sections)) {
      let total = 0;
      for (const section of sections) {
        if (section.chunks && Array.isArray(section.chunks)) {
          total += section.chunks.length;
        } else {
          // If section doesn't have chunks array, count it as 1
          total += 1;
        }
      }
      return total || 1;
    }
    
    // 🔧 FIX: Check sectionCount from metadata
    if (course.sectionCount && course.sectionCount > 0) {
      return course.sectionCount;
    }
    
    // Fallback to sections length (checking both paths)
    const sectionLength = course.sections?.length || course.generatedCourse?.sections?.length;
    return sectionLength || 1;
  }

  private async populateProgressStats(context: UnifiedLearningContext, userId: string): Promise<void> {
    try {
      const { learningProgressContextService } = await import('./LearningProgressContextService');
      const learningContext = await learningProgressContextService.getUserLearningContext(userId);
      
      if (learningContext.currentSession) {
        context.progress.comprehensionLevel = learningContext.currentSession.comprehensionLevel ?? 0;
        context.progress.questionsAnswered = learningContext.currentSession.userResponses?.length ?? 0;
        
        // Struggles from current session
        if (learningContext.currentSession.cognitiveMarkers) {
          context.struggles.knowledgeGaps = learningContext.currentSession.cognitiveMarkers.knowledgeGaps || [];
          context.struggles.weakAreas = learningContext.currentSession.cognitiveMarkers.strugglingAreas || [];
        }
      }
      
      // Overall stats
      if (learningContext.overallStats) {
        context.progress.timeSpentMinutes = learningContext.overallStats.totalLearningTime || 0;
        
        if (learningContext.overallStats.strugglingAreas?.length > 0) {
          context.struggles.weakAreas = learningContext.overallStats.strugglingAreas;
          context.struggles.needsEncouragement = true;
          context.struggles.encouragementReason = 'User struggling with: ' + learningContext.overallStats.strugglingAreas.slice(0, 2).join(', ');
        }
      }
    } catch (e) {
      console.warn('⚠️ Progress stats unavailable:', e);
    }
  }

  private async populateStrugglesAndEmotional(context: UnifiedLearningContext, userId: string): Promise<void> {
    try {
      const { learningMomentCapture } = await import('./LearningMomentCapture');
      
      if (context.currentCourse?.id) {
        const summary = await learningMomentCapture.getCourseMomentSummary(userId, context.currentCourse.id);
        
        if (summary) {
          context.emotional.recentMood = summary.overallMood || 'neutral';
          context.emotional.recentEmotions = summary.emotionalJourney?.slice(-3).map(e => e.emotion) || [];
          
          if (summary.struggleAreas?.length > 0) {
            context.emotional.struggleDetected = true;
            context.struggles.weakAreas = [...new Set([
              ...context.struggles.weakAreas,
              ...summary.struggleAreas.map(s => s.section)
            ])];
          }
          
          if (summary.needsEncouragement) {
            context.struggles.needsEncouragement = true;
            context.struggles.encouragementReason = summary.encouragementReason;
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Emotional/struggle context unavailable:', e);
    }
  }

  private async populateRetentionData(context: UnifiedLearningContext, userId: string): Promise<void> {
    try {
      const { sm2SpacedRepetitionService } = await import('./SM2SpacedRepetitionService');
      const dueItems = await sm2SpacedRepetitionService.getDueItems(userId);
      
      if (dueItems && dueItems.length > 0) {
        context.retention.itemsDueForReview = dueItems.length;
        context.retention.overdueConcepts = dueItems.slice(0, 5).map(item => item.conceptId);
        
        // Calculate average retention
        const avgEase = dueItems.reduce((sum, item) => sum + (item.easeFactor || 2.5), 0) / dueItems.length;
        context.retention.averageRetention = Math.round(((avgEase - 1.3) / 1.7) * 100);
      }
    } catch (e) {
      // SM2 service may not be available - that's ok
    }
  }

  private async populateCanvasDocuments(context: UnifiedLearningContext): Promise<void> {
    try {
      const { useCanvasStore } = await import('../stores/canvasStore');
      const store = useCanvasStore.getState();
      
      for (const [_convId, elements] of Object.entries(store.canvasElementsByConversation || {})) {
        const docs = (elements as any[]).filter((el: any) => el.type === 'document');
        for (const doc of docs) {
          context.canvasDocuments.push({
            id: doc.id,
            title: doc.content?.title || 'Untitled',
            type: doc.type,
            updatedAt: doc.updatedAt || doc.createdAt || Date.now()
          });
        }
      }
      
      // Sort by most recent
      context.canvasDocuments.sort((a, b) => b.updatedAt - a.updatedAt);
      context.canvasDocuments = context.canvasDocuments.slice(0, 10); // Limit to 10
    } catch (e) {
      console.warn('⚠️ Canvas documents unavailable:', e);
    }
  }

  /**
   * 🎯 CHUNK ACTIVITY DATA
   * Get quiz performance and learning activity from inside course chunks
   */
  private async populateChunkActivityData(context: UnifiedLearningContext, userId: string): Promise<void> {
    try {
      const { chunkActivityTracker } = await import('./ChunkActivityTracker');
      const { dynamicQuizGenerator } = await import('./DynamicQuizGenerator');
      
      // Get weak concepts for quiz generation
      const weakConcepts = chunkActivityTracker.getWeakConceptsForQuiz(userId, 5);
      context.chunkActivity.weakConcepts = weakConcepts.map(c => ({
        concept: c.concept,
        accuracy: c.accuracy,
        moduleName: c.moduleName
      }));
      
      // Get SM2 items due for review (overdue concepts)
      const sm2DueItems = chunkActivityTracker.getSM2ItemsDue(userId);
      if (sm2DueItems.length > 0) {
        context.retention.itemsDueForReview = sm2DueItems.length;
        context.retention.overdueConcepts = sm2DueItems.slice(0, 5).map(item => item.conceptId);
      }
      
      // Get recent activities
      const recentActivities = chunkActivityTracker.getRecentActivities(userId, 10);
      context.chunkActivity.recentActivities = recentActivities.map(a => ({
        type: a.activityType,
        chunk: a.chunkTitle || a.chunkId,
        timestamp: a.timestamp
      }));
      
      // Calculate recent quiz performance from activities
      const quizAnswers = recentActivities.filter(a => a.activityType === 'quiz_answer');
      if (quizAnswers.length > 0) {
        const correct = quizAnswers.filter(a => a.data?.isCorrect).length;
        context.chunkActivity.recentQuizPerformance = {
          correct,
          total: quizAnswers.length,
          accuracy: Math.round((correct / quizAnswers.length) * 100)
        };
      }
      
      // Get dynamic quiz stats
      const quizStats = dynamicQuizGenerator.getQuizStats(userId);
      if (quizStats) {
        context.chunkActivity.dynamicQuizStats = {
          averageScore: quizStats.averageScore,
          streakDays: quizStats.streakDays,
          questionsAnswered: quizStats.questionsAnswered
        };
      }
      
      // Identify strong concepts (for encouragement)
      if (context.currentCourse?.id) {
        const analytics = chunkActivityTracker.getLearningAnalytics(userId, context.currentCourse.id);
        context.chunkActivity.strongConcepts = analytics.strongConcepts.slice(0, 3).map(c => ({
          concept: c.concept,
          accuracy: c.accuracy
        }));
        
        // Also merge weak concepts from analytics
        analytics.weakConcepts.slice(0, 3).forEach(weak => {
          if (!context.chunkActivity.weakConcepts.find(w => w.concept === weak.concept)) {
            context.chunkActivity.weakConcepts.push({
              concept: weak.concept,
              accuracy: weak.accuracy
            });
          }
        });
      }
      
      console.log('📊 UnifiedLearningContext: Chunk activity loaded:', {
        weakConcepts: context.chunkActivity.weakConcepts.length,
        recentActivities: context.chunkActivity.recentActivities.length,
        sm2Due: context.retention.itemsDueForReview
      });
      
    } catch (e) {
      console.warn('⚠️ Chunk activity data unavailable:', e);
    }
  }

  /**
   * 🎨 FORMAT CONTEXT FOR AI PROMPT
   * Creates a RICH, natural language context block
   */
  private formatForAI(context: UnifiedLearningContext, currentMessage?: string): string {
    const parts: string[] = [];
    
    // 📚 CURRENT LEARNING STATE
    if (context.currentCourse) {
      const course = context.currentCourse;
      parts.push(`\n📚 **ACTIVE LEARNING:**`);
      parts.push(`Course: "${course.name}" (${course.category})`);
      parts.push(`Progress: Section ${course.currentStep + 1} of ${course.totalSteps} (${course.progressPercent}% overall)`);
      
      // 🎯 ENHANCED: Granular chunk position (e.g., "Part 2 of 6 in current section")
      if (course.currentChunkIndex !== undefined && course.totalChunksInSection) {
        parts.push(`Currently on: Part ${course.currentChunkIndex + 1} of ${course.totalChunksInSection} in this section`);
      }
      
      if (course.currentStepTitle) {
        parts.push(`Section: "${course.currentStepTitle}"`);
      }
      
      // 🎯 NEW: Current chunk title and type
      if (course.currentChunkTitle) {
        parts.push(`Current lesson: "${course.currentChunkTitle}"${course.currentChunkType ? ` (${course.currentChunkType})` : ''}`);
      }
      
      if (context.progress.comprehensionLevel > 0) {
        parts.push(`Comprehension: ${context.progress.comprehensionLevel}%`);
      }
      
      // Include actual lesson content if available
      if (course.currentChunkContent) {
        parts.push(`\n📖 **CURRENT LESSON CONTENT (what user is studying NOW):**`);
        parts.push(course.currentChunkContent);
      } else if (course.currentStepContent) {
        parts.push(`\n📖 **SECTION CONTENT:**`);
        parts.push(course.currentStepContent);
      }
    }
    
    // ⚠️ STRUGGLES
    if (context.struggles.knowledgeGaps.length > 0 || context.struggles.weakAreas.length > 0) {
      parts.push(`\n⚠️ **AREAS NEEDING HELP:**`);
      if (context.struggles.knowledgeGaps.length > 0) {
        parts.push(`Knowledge gaps: ${context.struggles.knowledgeGaps.slice(0, 3).join(', ')}`);
      }
      if (context.struggles.weakAreas.length > 0) {
        parts.push(`Struggling with: ${context.struggles.weakAreas.slice(0, 3).join(', ')}`);
      }
    }
    
    // 🧠 SPACED REPETITION
    if (context.retention.itemsDueForReview > 0) {
      parts.push(`\n🧠 **SPACED REPETITION:**`);
      parts.push(`${context.retention.itemsDueForReview} items due for review`);
      if (context.retention.overdueConcepts.length > 0) {
        parts.push(`Topics: ${context.retention.overdueConcepts.slice(0, 3).join(', ')}`);
      }
    }
    
    // 💭 EMOTIONAL STATE
    if (context.emotional.struggleDetected || context.struggles.needsEncouragement) {
      parts.push(`\n💭 **USER STATE:**`);
      parts.push(`Mood: ${context.emotional.recentMood}`);
      if (context.struggles.needsEncouragement) {
        parts.push(`⚡ User needs encouragement${context.struggles.encouragementReason ? ': ' + context.struggles.encouragementReason : ''}`);
      }
    }
    
    // 📄 CANVAS DOCUMENTS
    if (context.canvasDocuments.length > 0) {
      parts.push(`\n📄 **CANVAS DOCUMENTS:**`);
      context.canvasDocuments.slice(0, 5).forEach(doc => {
        parts.push(`- "${doc.title}"`);
      });
    }
    
    // 🎯 CHUNK ACTIVITY (quiz performance, learning behavior)
    if (context.chunkActivity.recentQuizPerformance.total > 0 || context.chunkActivity.weakConcepts.length > 0) {
      parts.push(`\n🎯 **LEARNING ACTIVITY:**`);
      
      // Quiz performance
      if (context.chunkActivity.recentQuizPerformance.total > 0) {
        const perf = context.chunkActivity.recentQuizPerformance;
        parts.push(`Recent quiz accuracy: ${perf.accuracy}% (${perf.correct}/${perf.total} correct)`);
      }
      
      // Weak concepts needing review
      if (context.chunkActivity.weakConcepts.length > 0) {
        const weakList = context.chunkActivity.weakConcepts
          .slice(0, 3)
          .map(c => `${c.concept} (${c.accuracy}%)`)
          .join(', ');
        parts.push(`⚠️ Struggling with: ${weakList}`);
      }
      
      // Strong concepts
      if (context.chunkActivity.strongConcepts.length > 0) {
        const strongList = context.chunkActivity.strongConcepts
          .slice(0, 3)
          .map(c => c.concept)
          .join(', ');
        parts.push(`✅ Strong in: ${strongList}`);
      }
      
      // Dynamic quiz stats
      if (context.chunkActivity.dynamicQuizStats) {
        const stats = context.chunkActivity.dynamicQuizStats;
        if (stats.streakDays > 0) {
          parts.push(`🔥 Quiz streak: ${stats.streakDays} days, avg score: ${stats.averageScore}%`);
        }
      }
    }
    
    // 📋 AVAILABLE COURSES - Show full list with IDs for AI navigation
    // 🎯 CRITICAL: Courses are in MOST RECENT FIRST order
    if (context.courseList && context.courseList.length > 0) {
      parts.push(`\n📋 **USER'S LEARNING CENTRAL COURSES (${context.courseList.length} total, most recent first):**`);
      context.courseList.forEach((course, index) => {
        const recency = index === 0 ? ' ← MOST RECENT' : index === 1 ? ' ← 2nd most recent' : '';
        parts.push(`  ${index + 1}. "${course.title}" [ID: ${course.id}]${recency}`);
      });
      parts.push(`\n🎯 COURSE NAVIGATION: When user asks about "my course" or "the course", prioritize the MOST RECENT (#1).`);
      parts.push(`To open a course: Reference the course by name - the user can click it in Learning Central.`);
    } else if (context.availableCourses.length > 0 && !context.currentCourse) {
      parts.push(`\n📋 **AVAILABLE COURSES:**`);
      parts.push(context.availableCourses.join(', '));
    }
    
    // 💡 AI INSTRUCTIONS
    if (parts.length > 0) {
      parts.push(`\n💡 **INSTRUCTIONS:**`);
      parts.push(`- You KNOW their exact course position and what they're studying`);
      parts.push(`- Reference the lesson content when they ask about the course`);
      parts.push(`- If struggling with concepts, offer targeted help on those weak areas`);
      parts.push(`- Acknowledge their strengths when appropriate`);
      parts.push(`- If they have items due for review, gently remind them`);
      parts.push(`- Be warm and encouraging, not sterile`);
      parts.push(`- When user asks about courses, use the FULL course list above (most recent first)`);
    }
    
    return parts.join('\n');
  }

  /**
   * Clear cache for user (call when activity changes)
   */
  clearCache(userId: string): void {
    this.contextCache.delete(userId);
  }
}

export const unifiedLearningContextService = UnifiedLearningContextService.getInstance();

