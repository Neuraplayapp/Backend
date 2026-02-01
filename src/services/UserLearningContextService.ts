/**
 * 🎯 USER LEARNING CONTEXT SERVICE
 * 
 * UNIFIED service for retrieving user's learning context:
 * - Canvas documents (created anytime, accessible anytime)
 * - Course progress (from Learning Central)
 * - Both are vectorized for semantic search
 * 
 * This replaces scattered context retrieval in ChatHandler, GreetingService, etc.
 * 
 * USAGE:
 *   const context = await userLearningContextService.getContext(userId, query);
 *   // Returns documents, courses, formatted context
 */

export interface CanvasDocument {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'chart' | 'code';
  conversationId: string;
  createdAt: number;
  updatedAt: number;
  currentVersion: number;
}

export interface CourseProgress {
  moduleId: string;
  moduleName: string;
  category: string;
  phase: string;
  currentStep?: number;
  totalSteps?: number;
  comprehensionLevel?: number;
  completedAt?: Date;
}

export interface UserLearningContext {
  canvasDocuments: CanvasDocument[];
  courses: CourseProgress[];
  mostRecentDocument: CanvasDocument | null;
  mostRecentCourse: CourseProgress | null;
  isInLearningCentral: boolean;
  formattedForAI: string;
  richLearningContext?: string;  // Deep learning context: struggles, retention, current content
  vectorResults?: any[];         // Vector search results for course content
}

class UserLearningContextService {
  private static instance: UserLearningContextService;

  static getInstance(): UserLearningContextService {
    if (!UserLearningContextService.instance) {
      UserLearningContextService.instance = new UserLearningContextService();
    }
    return UserLearningContextService.instance;
  }

  /**
   * 🎯 GET UNIFIED LEARNING CONTEXT
   * Retrieves all canvas documents and courses with DEEP learning context
   */
  async getContext(userId: string, query?: string): Promise<UserLearningContext> {
    const canvasDocuments = await this.getCanvasDocuments();
    const courses = await this.getCourseProgress(userId);
    const isInLearningCentral = await this.checkIfInLearningCentral(userId);

    // Find most recent
    const mostRecentDocument = canvasDocuments.length > 0 
      ? canvasDocuments.reduce((a, b) => a.updatedAt > b.updatedAt ? a : b)
      : null;

    const mostRecentCourse = courses.length > 0
      ? courses.reduce((a, b) => 
          (a.completedAt?.getTime() || 0) > (b.completedAt?.getTime() || 0) ? a : b)
      : null;

    // 🧠 GET RICH LEARNING CONTEXT (struggles, retention, current content)
    let richLearningContext = '';
    if (isInLearningCentral && mostRecentCourse?.moduleId) {
      richLearningContext = await this.getRichLearningContext(userId, mostRecentCourse.moduleId);
    }

    // Format for AI - now includes rich context
    let formattedForAI = this.formatContextForAI(
      canvasDocuments,
      courses,
      mostRecentDocument,
      mostRecentCourse,
      isInLearningCentral,
      query
    );

    // Append rich learning context if available
    if (richLearningContext) {
      formattedForAI += '\n' + richLearningContext;
    }

    return {
      canvasDocuments,
      courses,
      mostRecentDocument,
      mostRecentCourse,
      isInLearningCentral,
      formattedForAI,
      richLearningContext
    };
  }

  /**
   * 📄 GET CANVAS DOCUMENTS
   * Retrieves all documents from canvas store
   */
  private async getCanvasDocuments(): Promise<CanvasDocument[]> {
    try {
      const { useCanvasStore } = await import('../stores/canvasStore');
      const store = useCanvasStore.getState();
      
      const allDocuments: CanvasDocument[] = [];
      
      for (const [convId, elements] of Object.entries(store.canvasElementsByConversation || {})) {
        const docs = (elements as any[]).filter((el: any) => el.type === 'document');
        
        for (const doc of docs) {
          const versions = doc.versions || [];
          const latestVersion = versions[versions.length - 1];
          
          allDocuments.push({
            id: doc.id,
            title: doc.content?.title || 'Untitled Document',
            content: latestVersion?.content || doc.content?.content || '',
            type: doc.type,
            conversationId: convId,
            createdAt: doc.createdAt || Date.now(),
            updatedAt: doc.updatedAt || doc.createdAt || Date.now(),
            currentVersion: doc.currentVersion || 1
          });
        }
      }
      
      // Sort by most recent
      allDocuments.sort((a, b) => b.updatedAt - a.updatedAt);
      
      return allDocuments;
    } catch (error) {
      console.warn('⚠️ Failed to get canvas documents:', error);
      return [];
    }
  }

  /**
   * 📚 GET COURSE PROGRESS
   * Retrieves course progress from localStorage and Learning Central tracker
   */
  private async getCourseProgress(userId: string): Promise<CourseProgress[]> {
    try {
      const courses: CourseProgress[] = [];
      
      // 1. Get from DashboardContextService (real-time activity)
      const { dashboardContextService } = await import('./DashboardContextService');
      const dashboardContext = dashboardContextService.getCurrentDashboardContext(userId);
      
      if (dashboardContext?.activeModule) {
        const activeModule = dashboardContext.activeModule;
        console.log('📚 UserLearningContextService: Found active module:', {
          name: activeModule.name,
          phase: activeModule.phase,
          currentStep: activeModule.currentStepIndex,
          totalSteps: activeModule.totalSteps,
          progress: activeModule.progress
        });
        
        courses.push({
          moduleId: activeModule.id,
          moduleName: activeModule.name,
          category: activeModule.category,
          phase: activeModule.phase,
          currentStep: activeModule.currentStepIndex,
          totalSteps: activeModule.totalSteps,
          comprehensionLevel: activeModule.progress?.comprehensionLevel ||
                             activeModule.progress?.questionsAnswered && activeModule.progress?.totalQuestions
                               ? Math.round((activeModule.progress.questionsAnswered / activeModule.progress.totalQuestions) * 100)
                               : undefined
        });
      }
      
      // 2. Get available courses from dashboard context
      if (dashboardContext?.availableCourses) {
        for (const courseName of dashboardContext.availableCourses) {
          // Avoid duplicates
          if (!courses.find(c => c.moduleName === courseName)) {
            courses.push({
              moduleId: `course-${courseName.toLowerCase().replace(/\s+/g, '-')}`,
              moduleName: courseName,
              category: 'general',
              phase: 'available'
            });
          }
        }
      }
      
      // 3. Get from localStorage (persisted custom courses)
      try {
        const storedCourses = localStorage.getItem('neuraplay_custom_courses');
        if (storedCourses) {
          const parsed = JSON.parse(storedCourses);
          if (Array.isArray(parsed)) {
            for (const course of parsed) {
              if (!courses.find(c => c.moduleId === course.id)) {
                // Also try to get progress for this course
                let progressData: any = null;
                try {
                  const progressKey = `course_progress_${course.id}`;
                  const savedProgress = localStorage.getItem(progressKey);
                  if (savedProgress) {
                    progressData = JSON.parse(savedProgress);
                  }
                } catch {}
                
                courses.push({
                  moduleId: course.id,
                  moduleName: course.name || course.title,
                  category: course.category || 'custom',
                  phase: progressData?.phase || course.phase || 'available',
                  currentStep: progressData?.currentSectionIndex,
                  totalSteps: progressData?.totalSections,
                  comprehensionLevel: progressData?.comprehensionLevel || course.progress?.comprehension
                });
              }
            }
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
      
      return courses;
    } catch (error) {
      console.warn('⚠️ Failed to get course progress:', error);
      return [];
    }
  }

  /**
   * Check if user is currently in Learning Central
   */
  private async checkIfInLearningCentral(userId: string): Promise<boolean> {
    try {
      const { dashboardContextService } = await import('./DashboardContextService');
      const context = dashboardContextService.getCurrentDashboardContext(userId);
      return context?.isInDashboard || false;
    } catch {
      return false;
    }
  }

  /**
   * 🎨 FORMAT CONTEXT FOR AI
   * Creates a COMPREHENSIVE natural language summary for the AI prompt
   * Includes: course progress, current content, emotional journey, struggles, retention
   */
  private formatContextForAI(
    documents: CanvasDocument[],
    courses: CourseProgress[],
    recentDoc: CanvasDocument | null,
    recentCourse: CourseProgress | null,
    isInLearningCentral: boolean,
    query?: string
  ): string {
    const parts: string[] = [];
    
    // 📄 Canvas Documents
    if (documents.length > 0) {
      parts.push(`\n📄 **USER'S CANVAS DOCUMENTS (${documents.length} total):**`);
      
      const topDocs = documents.slice(0, 5);
      for (const doc of topDocs) {
        const ageInDays = (Date.now() - doc.updatedAt) / (1000 * 60 * 60 * 24);
        const ageLabel = ageInDays < 1 ? 'today' : ageInDays < 7 ? `${Math.floor(ageInDays)}d ago` : 'older';
        parts.push(`- "${doc.title}" (${ageLabel}, v${doc.currentVersion})`);
      }
      
      if (recentDoc) {
        parts.push(`\n🎯 Most recent work: "${recentDoc.title}"`);
      }
    }
    
    // 📚 ENHANCED: Rich course context
    if (courses.length > 0) {
      parts.push(`\n📚 **LEARNING CENTRAL COURSES (${courses.length} total):**`);
      
      for (const course of courses) {
        let courseInfo = `- ${course.moduleName}`;
        
        if (course.phase === 'course' || course.phase === 'step-view') {
          const stepInfo = course.currentStep !== undefined && course.totalSteps 
            ? ` (Step ${course.currentStep + 1} of ${course.totalSteps})` 
            : '';
          const progressPercent = course.totalSteps && course.currentStep !== undefined
            ? Math.round(((course.currentStep + 1) / course.totalSteps) * 100)
            : 0;
          courseInfo += ` [IN PROGRESS${stepInfo} - ${progressPercent}% complete]`;
          
          if (course.comprehensionLevel !== undefined) {
            courseInfo += ` | Comprehension: ${course.comprehensionLevel}%`;
          }
        } else if (course.phase === 'completed') {
          courseInfo += ' [COMPLETED ✓]';
        } else if (course.phase === 'available') {
          courseInfo += ' [AVAILABLE]';
        }
        
        parts.push(courseInfo);
      }
    }
    
    // 🎓 Learning Central status
    if (isInLearningCentral) {
      parts.push(`\n🎓 **ACTIVE LEARNING SESSION:**`);
      parts.push(`User is currently IN Learning Central and may ask about their course content.`);
    }
    
    // Add usage guidelines
    if (documents.length > 0 || courses.length > 0) {
      parts.push(`\n💡 **IMPORTANT:**`);
      parts.push(`- You KNOW their exact course position (step X of Y)`);
      parts.push(`- Canvas documents ≠ Courses (don't confuse them)`);
      parts.push(`- Reference courses by name and their actual progress`);
    }
    
    return parts.join('\n');
  }

  /**
   * 🧠 GET RICH LEARNING CONTEXT
   * Combines multiple services for comprehensive learning state
   */
  async getRichLearningContext(userId: string, courseId?: string): Promise<string> {
    const lines: string[] = [];
    
    try {
      // 1. Get learning moment context (emotional journey, struggles, retention)
      const { learningMomentCapture } = await import('./LearningMomentCapture');
      if (courseId) {
        const aiContext = await learningMomentCapture.getAIContext(userId, courseId);
        if (aiContext && aiContext.length > 20) {
          lines.push(aiContext);
        }
      }
      
      // 2. Get spaced repetition due items
      try {
        const { sm2SpacedRepetitionService } = await import('./SM2SpacedRepetitionService');
        const dueItems = await sm2SpacedRepetitionService.getDueItems(userId);
        if (dueItems && dueItems.length > 0) {
          lines.push(`\n📊 **SPACED REPETITION (${dueItems.length} items due for review):**`);
          const topDue = dueItems.slice(0, 5);
          for (const item of topDue) {
            const retention = item.easeFactor ? Math.round((item.easeFactor - 1.3) * 50 + 50) : 50;
            lines.push(`- ${item.conceptId}: ${retention}% retention (${item.repetitions} reviews)`);
          }
        }
      } catch (e) {
        // SM2 service may not be available
      }
      
      // 3. Get current course content (what they're actually looking at)
      try {
        const { dashboardContextService } = await import('./DashboardContextService');
        const dashboardContext = dashboardContextService.getCurrentDashboardContext(userId);
        
        if (dashboardContext?.activeModule?.learningSessionId) {
          const { learningModuleTracker } = await import('./LearningModuleTracker');
          const courseContent = learningModuleTracker.formatCourseForAI(
            dashboardContext.activeModule.learningSessionId,
            dashboardContext.activeModule.currentStepIndex
          );
          if (courseContent && courseContent.length > 50) {
            lines.push(`\n📖 **CURRENT LESSON CONTENT:**`);
            // Truncate to prevent token explosion but keep meaningful context
            lines.push(courseContent.substring(0, 1500) + (courseContent.length > 1500 ? '...' : ''));
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not get current course content:', e);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to get rich learning context:', error);
    }
    
    return lines.join('\n');
  }

  /**
   * 🔍 SEARCH CONTEXT (VECTOR-POWERED)
   * Semantic search across documents and courses using vector database
   */
  async searchContext(userId: string, query: string): Promise<{
    matchingDocuments: CanvasDocument[];
    matchingCourses: CourseProgress[];
    vectorResults: any[];
    bestMatch: { type: 'document' | 'course' | 'course_content'; item: any } | null;
  }> {
    const context = await this.getContext(userId, query);
    const queryLower = query.toLowerCase();
    
    // 🎯 VECTOR SEARCH for course content (smart chunks)
    let vectorResults: any[] = [];
    try {
      const { memoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
      const vectorSearch = await memoryDatabaseBridge.searchMemories({
        userId,
        query,
        limit: 10,
        categories: ['education'] // Only search course content
      });
      
      if (vectorSearch.success && vectorSearch.memories) {
        vectorResults = vectorSearch.memories.filter((m: any) => 
          m.metadata?.type === 'course_content' || 
          m.metadata?.type === 'course_chunk' ||
          m.metadata?.type === 'course_summary'
        );
        console.log(`🔍 Vector search found ${vectorResults.length} course content matches for: "${query}"`);
      }
    } catch (error) {
      console.warn('⚠️ Vector search failed:', error);
    }
    
    // Keyword matching as fallback
    const matchingDocuments = context.canvasDocuments.filter(doc =>
      doc.title.toLowerCase().includes(queryLower) ||
      doc.content.toLowerCase().includes(queryLower)
    );
    
    const matchingCourses = context.courses.filter(course =>
      course.moduleName.toLowerCase().includes(queryLower) ||
      course.category.toLowerCase().includes(queryLower)
    );
    
    // Determine best match - prioritize vector results
    let bestMatch: { type: 'document' | 'course' | 'course_content'; item: any } | null = null;
    
    if (vectorResults.length > 0) {
      // Vector search found course content - use that
      bestMatch = { type: 'course_content', item: vectorResults[0] };
    } else if (matchingDocuments.length > 0 && matchingCourses.length === 0) {
      bestMatch = { type: 'document', item: matchingDocuments[0] };
    } else if (matchingCourses.length > 0 && matchingDocuments.length === 0) {
      bestMatch = { type: 'course', item: matchingCourses[0] };
    } else if (matchingDocuments.length > 0 && matchingCourses.length > 0) {
      // Prefer whichever was updated more recently
      const docTime = matchingDocuments[0].updatedAt;
      const courseTime = matchingCourses[0].completedAt?.getTime() || 0;
      bestMatch = docTime > courseTime 
        ? { type: 'document', item: matchingDocuments[0] }
        : { type: 'course', item: matchingCourses[0] };
    }
    
    return { matchingDocuments, matchingCourses, vectorResults, bestMatch };
  }
}

export const userLearningContextService = UserLearningContextService.getInstance();

