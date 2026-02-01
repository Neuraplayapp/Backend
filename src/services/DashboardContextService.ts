/**
 * 🎯 LEARNING CENTRAL CONTEXT SERVICE
 * 
 * Real-time tracking of user Learning Central activity for AI awareness
 * Integrates with existing agentic data systems
 * NOW INCLUDES: Full course content for AI contextual responses
 */

import { dataCollectionService } from './DataCollectionService';
import { learningModuleTracker } from './LearningModuleTracker';

// 🎯 Enhanced course info for AI context (includes ID for navigation)
export interface CourseInfo {
  id: string;
  title: string;
  category?: string;
  lastAccessed?: string;
}

export interface DashboardActivity {
  userId: string;
  activityType: 'dashboard_view' | 'module_view' | 'module_start' | 'module_progress' | 'module_complete' | 'step_view' | 'custom_course_created';
  moduleId?: string;
  moduleName?: string;
  moduleCategory?: string;
  currentPhase?: 'intro' | 'self-assessment' | 'assessment' | 'generating' | 'course' | 'step-view' | 'completed';
  progressData?: {
    questionsAnswered?: number;
    currentQuestion?: number;
    totalQuestions?: number;
    comprehensionLevel?: number;
    timeSpent?: number;
    currentStepIndex?: number; // Track which step user is viewing
    totalSteps?: number;
    // 🎓 MONTESSORI INTEGRATION: Add pedagogical progress
    competencyMastery?: number; // 0-100 average
    itemsDueForReview?: number;
    knowledgeGaps?: string[];
    currentStreak?: number;
    // 🎯 Granular chunk tracking
    currentChunkIndex?: number;
    totalChunks?: number;
    currentSectionTitle?: string;
    currentChunkTitle?: string;
    completedChunksInSection?: number;
  };
  timestamp: Date;
  sessionId: string; // Learning session ID for accessing course content
  availableCourses?: string[]; // List of course names visible on dashboard (legacy)
  // 🎯 NEW: Full course info for AI navigation (includes IDs)
  courseList?: CourseInfo[];
}

export interface DashboardContext {
  userId: string;
  currentActivity: DashboardActivity | null;
  recentActivities: DashboardActivity[];
  isInDashboard: boolean;
  activeModule: {
    id: string;
    name: string;
    category: string;
    phase: string;
    progress: any;
    learningSessionId?: string; // Session ID for accessing course content
    currentStepIndex?: number; // Which step user is on
    totalSteps?: number;
    // 🎯 Granular chunk tracking
    currentChunkIndex?: number;
    totalChunksInSection?: number;
    currentSectionTitle?: string;
    currentChunkTitle?: string;
    completedChunksInSection?: number;
  } | null;
  availableCourses: string[]; // List of course names on the dashboard (legacy)
  // 🎯 NEW: Full course info with IDs for AI navigation (most recent first)
  courseList: CourseInfo[];
  sessionStartTime: Date;
  totalTimeInDashboard: number; // seconds
}

class DashboardContextService {
  private static instance: DashboardContextService;
  private contextStore: Map<string, DashboardContext> = new Map();
  private activityTimers: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): DashboardContextService {
    if (!DashboardContextService.instance) {
      DashboardContextService.instance = new DashboardContextService();
    }
    return DashboardContextService.instance;
  }

  /**
   * Track dashboard activity
   */
  async trackDashboardActivity(userId: string, activity: Omit<DashboardActivity, 'userId' | 'timestamp'>): Promise<void> {
    try {
      const fullActivity: DashboardActivity = {
        userId,
        ...activity,
        timestamp: new Date()
      };

      // Get or create context
      let context = this.contextStore.get(userId);
      if (!context) {
        context = {
          userId,
          currentActivity: null,
          recentActivities: [],
          isInDashboard: false,
          activeModule: null,
          availableCourses: [],
          courseList: [], // 🎯 NEW: Full course info for AI navigation
          sessionStartTime: new Date(),
          totalTimeInDashboard: 0
        };
        this.contextStore.set(userId, context);
      }

      // Update context
      context.currentActivity = fullActivity;
      context.recentActivities.unshift(fullActivity);
      context.recentActivities = context.recentActivities.slice(0, 20); // Keep last 20 activities

      // Update dashboard status and available courses
      if (activity.activityType === 'dashboard_view') {
        context.isInDashboard = true;
        // 🎯 FIX: Store FULL course info (with IDs) for AI navigation
        if (activity.courseList && activity.courseList.length > 0) {
          context.courseList = activity.courseList;
          context.availableCourses = activity.courseList.map(c => c.title); // Keep legacy for compatibility
          console.log('📚 Stored courses for AI (with IDs):', context.courseList.map(c => `${c.title} [${c.id.slice(0,8)}]`));
        } else if (activity.availableCourses && activity.availableCourses.length > 0) {
          // Legacy fallback - just names
          context.availableCourses = activity.availableCourses;
          console.log('📚 Stored available courses (names only):', context.availableCourses);
        }
      }

      // Update active module with full context including session ID for course content
      // 🎯 ENHANCED: Include granular chunk position for AI context
      if (activity.moduleId && activity.moduleName) {
        const progressData = activity.progressData || {};
        context.activeModule = {
          id: activity.moduleId,
          name: activity.moduleName,
          category: activity.moduleCategory || 'general',
          phase: activity.currentPhase || 'intro',
          progress: progressData,
          learningSessionId: activity.sessionId, // For accessing generated course content
          currentStepIndex: progressData.currentStepIndex,
          totalSteps: progressData.totalSteps,
          // 🎯 NEW: Granular chunk tracking for "Section 1, Part 2 of 6"
          currentChunkIndex: progressData.currentChunkIndex,
          totalChunksInSection: progressData.totalChunks,
          currentSectionTitle: progressData.currentSectionTitle,
          currentChunkTitle: progressData.currentChunkTitle,
          completedChunksInSection: progressData.completedChunksInSection
        };
      }

      // Log to analytics database using correct method
      await dataCollectionService.logNavigation(
        activity.activityType === 'dashboard_view' ? 'dashboard' : 
        activity.activityType === 'module_view' ? `dashboard/module/${activity.moduleId}` :
        activity.activityType === 'module_start' ? `learning/${activity.moduleId}` :
        `dashboard/${activity.activityType}`,
        'dashboard'
      ).catch(err => {
        console.warn('⚠️ Failed to log navigation:', err);
      });

      // 🔧 FIX: Clear learning context cache when activity changes
      // This ensures AI gets fresh course progress data
      try {
        const { unifiedLearningContextService } = await import('./UnifiedLearningContextService');
        unifiedLearningContextService.clearCache(userId);
      } catch (e) {
        // Ignore - service may not be loaded yet
      }

      console.log('📊 Dashboard activity tracked:', fullActivity);
    } catch (error) {
      console.error('❌ Failed to track dashboard activity:', error);
    }
  }

  /**
   * Get current dashboard context for a user
   */
  getCurrentDashboardContext(userId: string): DashboardContext | null {
    const context = this.contextStore.get(userId);
    if (!context) return null;

    // Calculate time in dashboard
    const now = new Date();
    const timeSpent = Math.floor((now.getTime() - context.sessionStartTime.getTime()) / 1000);
    context.totalTimeInDashboard = timeSpent;

    return context;
  }

  /**
   * Format dashboard context for AI consumption
   * NOW INCLUDES: Full course content + Montessori pedagogical state
   */
  formatDashboardContextForAI(context: DashboardContext | null): string {
    if (!context || !context.currentActivity) {
      return '';
    }

    let formattedContext = '\n\n📊 **DASHBOARD ACTIVITY:**\n';

    if (context.isInDashboard) {
      formattedContext += '• User is currently in Learning Central\n';
    }

    if (context.activeModule) {
      const module = context.activeModule;
      formattedContext += `• Currently ${this.getActivityVerb(context.currentActivity.activityType)}: "${module.name}" (${module.category})\n`;
      
      if (module.phase && module.phase !== 'intro') {
        formattedContext += `• Learning phase: ${this.formatPhase(module.phase)}\n`;
      }

      if (module.progress) {
        const progress = module.progress;
        if (progress.currentQuestion && progress.totalQuestions) {
          formattedContext += `• Progress: Question ${progress.currentQuestion} of ${progress.totalQuestions}\n`;
        }
        if (progress.comprehensionLevel !== undefined) {
          formattedContext += `• Comprehension: ${progress.comprehensionLevel}%\n`;
        }
        if (module.currentStepIndex !== undefined && module.totalSteps) {
          formattedContext += `• Current step: ${module.currentStepIndex + 1} of ${module.totalSteps}\n`;
        }
        
        // 🎓 MONTESSORI: Add pedagogical insights
        if (progress.competencyMastery !== undefined) {
          formattedContext += `• Skill Mastery: ${progress.competencyMastery}%\n`;
        }
        if (progress.itemsDueForReview !== undefined && progress.itemsDueForReview > 0) {
          formattedContext += `• ⚠️ ${progress.itemsDueForReview} items due for review TODAY\n`;
        }
        if (progress.knowledgeGaps && progress.knowledgeGaps.length > 0) {
          formattedContext += `• 📉 Struggling with: ${progress.knowledgeGaps.slice(0, 3).join(', ')}\n`;
        }
        if (progress.currentStreak !== undefined && progress.currentStreak > 0) {
          formattedContext += `• 🔥 Review streak: ${progress.currentStreak} days\n`;
        }
      }

      // 🎓 CRITICAL: Include the actual course content for AI awareness
      if (module.learningSessionId && (module.phase === 'course' || module.phase === 'step-view')) {
        const courseContent = learningModuleTracker.formatCourseForAI(
          module.learningSessionId,
          module.currentStepIndex
        );
        if (courseContent) {
          formattedContext += courseContent;
        }
      }
    }

    if (context.totalTimeInDashboard > 60) {
      const minutes = Math.floor(context.totalTimeInDashboard / 60);
      formattedContext += `• Time in dashboard: ${minutes} minute${minutes !== 1 ? 's' : ''}\n`;
    }

    formattedContext += '\n⚠️ CRITICAL FOR AI TUTOR:\n';
    formattedContext += '- You have full access to the course content and pedagogical state\n';
    formattedContext += '- When user asks questions, use the course content to give specific answers\n';
    formattedContext += '- If they\'re struggling with concepts (see knowledge gaps above), provide targeted help\n';
    formattedContext += '- If items are due for review, gently encourage them to complete reviews\n';
    formattedContext += '- Celebrate their streak and progress!\n';

    // 📚 LEARNING CENTRAL: Add courses context from dashboard view
    if (context.isInDashboard && (!context.activeModule || context.activeModule.phase === 'intro')) {
      // 🎯 ENHANCED: Show full course info (with IDs) for AI navigation
      // Courses are in MOST RECENT FIRST order
      if (context.courseList && context.courseList.length > 0) {
        formattedContext += `\n**USER'S COURSES IN LEARNING CENTRAL (most recent first):**\n`;
        context.courseList.forEach((course, index) => {
          const recency = index === 0 ? ' ← MOST RECENTLY CREATED/ACCESSED' : 
                          index === 1 ? ' ← second most recent' : '';
          formattedContext += `${index + 1}. "${course.title}" [ID: ${course.id}]${recency}\n`;
        });
        formattedContext += `\n**TOTAL: ${context.courseList.length} courses**\n`;
        formattedContext += '\n**🎯 COURSE NAVIGATION INSTRUCTIONS:**\n';
        formattedContext += '- To open a course, use: openCourse(courseId) or navigate user to Learning Central\n';
        formattedContext += '- ALWAYS prioritize the MOST RECENT course when user asks about "my course" or "the course"\n';
        formattedContext += '- If user asks about a specific course, match by title and use its ID\n';
        formattedContext += '- These are their ACTUAL Learning Central courses, not canvas documents\n';
        formattedContext += '- Be enthusiastic about their learning journey!\n';
      } else if (context.availableCourses && context.availableCourses.length > 0) {
        // Legacy fallback - just names
        formattedContext += `\n**AVAILABLE COURSES IN LEARNING CENTRAL:**\n`;
        context.availableCourses.forEach(course => {
          formattedContext += `- ${course}\n`;
        });
        formattedContext += '\n**BE A WARM TUTOR:**\n';
        formattedContext += '- If user asks about courses, reference these specific courses by name\n';
        formattedContext += '- These are their ACTUAL Learning Central courses, not canvas documents\n';
        formattedContext += '- Be enthusiastic about their learning journey!\n';
        formattedContext += '- Call it "Learning Central" when referring to the dashboard\n';
      }
    }

    return formattedContext;
  }

  /**
   * Determine if AI should proactively mention Learning Central activity
   */
  shouldProactivelyMention(message: string, dashboardContext: DashboardContext | null): boolean {
    if (!dashboardContext || !dashboardContext.activeModule) {
      return false;
    }

    const messageLower = message.toLowerCase();

    // Proactively mention if user is asking for help
    const helpPatterns = [
      /help/i,
      /stuck/i,
      /don'?t understand/i,
      /confused/i,
      /explain/i,
      /how do i/i,
      /what is/i,
      /assist/i
    ];

    if (helpPatterns.some(pattern => pattern.test(messageLower))) {
      return true;
    }

    // Mention if user references the module
    if (dashboardContext.activeModule.name && 
        messageLower.includes(dashboardContext.activeModule.name.toLowerCase())) {
      return true;
    }

    // Mention if user references learning/studying
    const learningPatterns = [
      /learn/i,
      /study/i,
      /practice/i,
      /module/i,
      /lesson/i,
      /quiz/i,
      /question/i
    ];

    if (learningPatterns.some(pattern => pattern.test(messageLower))) {
      return true;
    }

    return false;
  }

  /**
   * Mark user as leaving dashboard
   */
  markDashboardExit(userId: string): void {
    const context = this.contextStore.get(userId);
    if (context) {
      context.isInDashboard = false;
      context.activeModule = null;
    }
  }

  /**
   * Clear dashboard context (e.g., on logout)
   */
  clearContext(userId: string): void {
    this.contextStore.delete(userId);
    const timer = this.activityTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.activityTimers.delete(userId);
    }
  }

  // Helper methods
  private getActivityVerb(activityType: string): string {
    switch (activityType) {
      case 'dashboard_view': return 'browsing';
      case 'module_view': return 'viewing';
      case 'module_start': return 'starting';
      case 'module_progress': return 'working on';
      case 'module_complete': return 'completing';
      default: return 'interacting with';
    }
  }

  private formatPhase(phase: string): string {
    switch (phase) {
      case 'self-assessment': return 'Self-Assessment';
      case 'assessment': return 'Knowledge Assessment';
      case 'generating': return 'Generating Personalized Content';
      case 'course': return 'Learning Course';
      case 'completed': return 'Completed';
      default: return phase;
    }
  }

  private getPlatform(): string {
    if (typeof window === 'undefined') return 'server';
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mobile')) return 'mobile';
    if (userAgent.includes('tablet')) return 'tablet';
    return 'desktop';
  }
}

// Export singleton instance
export const dashboardContextService = DashboardContextService.getInstance();




