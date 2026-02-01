// Generative Learning Module - Main Component with Hierarchical Grid-Based Course Display
// Features: Course Overview → Section Dashboard → Bite-sized Chunks with TTS
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Brain, Trophy, Loader2, ArrowLeft, ChevronRight, Lock, CheckCircle, Image as ImageIcon, Grid, List, Play, Clock, HelpCircle, Target, MessageSquare } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import AIAssistantSmall from './AIAssistantSmall';
import LearningQuestionEngine from './LearningQuestionEngine';
import StepContentRenderer from './StepContentRenderer';
import CourseSectionDashboard from './CourseSectionDashboard';
import ChunkContentViewer from './ChunkContentViewer';
import { learningQuestionEngine } from '../services/LearningQuestionEngine';
import { dynamicCourseBuilder } from '../services/DynamicCourseBuilder';
import { learningModuleTracker } from '../services/LearningModuleTracker';
import { dashboardContextService } from '../services/DashboardContextService';
import { unifiedProgressCalculator } from '../services/UnifiedProgressCalculator';
import { sm2SpacedRepetitionService } from '../services/SM2SpacedRepetitionService';
import { competencyMasteryTracker } from '../services/CompetencyMasteryTracker';
import { courseStorageService } from '../services/CourseStorageService';
import type {
  GenerativeLearningModuleData,
  Question,
  UserResponse,
  GeneratedCourse,
  CourseSection,
  CourseChunk,
  LearnerPracticeState
} from '../types/LearningModule.types';

interface GenerativeLearningModuleProps {
  module: GenerativeLearningModuleData;
  onClose: () => void;
}

// Hierarchical navigation phases
type ModulePhase = 'intro' | 'self-assessment' | 'assessment' | 'generating' | 'course' | 'section-view' | 'chunk-view' | 'step-view' | 'completed';
type CourseViewMode = 'grid' | 'list';

export const GenerativeLearningModule: React.FC<GenerativeLearningModuleProps> = ({
  module,
  onClose
}) => {
  const { isDarkMode, isBrightMode, isDarkGradient, isWhitePurpleGradient } = useTheme();
  const { user, updateLearningModuleProgress, getLearningModuleProgress } = useUser();

  // 🎯 FIX: Skip intro phase - go directly to self-assessment
  // The intro showed redundant info (objectives, duration) that user already saw
  const [phase, setPhase] = useState<ModulePhase>('self-assessment');
  const [sessionId, setSessionId] = useState<string>('');
  const [userSelfAssessment, setUserSelfAssessment] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourse | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [comprehensionLevel, setComprehensionLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CourseViewMode>('grid');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // Hierarchical chunk tracking
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [completedChunks, setCompletedChunks] = useState<Map<number, Set<number>>>(new Map()); // sectionIndex -> Set of chunkIndexes

  // 🎓 MONTESSORI: Track practice states and competencies
  const [practiceStates, setPracticeStates] = useState<LearnerPracticeState[]>([]);
  const [competencyLevels, setCompetencyLevels] = useState<Array<{ name: string; level: number; threshold: number }>>([]);
  
  // 📊 Generation progress (simulated for UX feedback)
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  
  // 🎯 Track background generation completion for re-save
  const backgroundSectionsCompleted = useRef(0);
  const totalBackgroundSections = useRef(0);
  const courseRef = useRef<GeneratedCourse | null>(null);


  // Initialize session on mount AND restore generated course if available
  useEffect(() => {
    const initCourse = async () => {
      if (!user) return;
      
      learningModuleTracker.setUserId(user.id);
      const sid = learningModuleTracker.startSession(module.id);
      setSessionId(sid);
      console.log('✅ Learning module session started:', sid);
      
      // 📚 Check if module has full course content or just placeholder
      const savedCourse = module.generatedCourse;
      const hasRealContent = savedCourse?.sections?.some((s) => 
        s.chunks?.some((c) => c.content && !c.content.includes('[Content loads when opened]'))
      );
      
      // 🎯 FIX: Check if module has hasGeneratedContent flag (from metadata-only load)
      // This means the course exists in DB but wasn't loaded with full content yet
      const hasGeneratedContentFlag = module.hasGeneratedContent === true;
      
      // 🔍 DEBUG: Log module state to trace regeneration issue
      console.log('🔍 GenerativeLearningModule.initCourse:', {
        moduleId: module.id,
        hasGeneratedCourse: !!savedCourse,
        hasSections: savedCourse?.sections?.length || 0,
        hasRealContent,
        hasGeneratedContentFlag,
        moduleKeys: Object.keys(module)
      });
        
      // 🎯 FIX: Helper to restore progress from course data
      const restoreProgressFromCourse = (courseData: any) => {
        const progressData = courseData.progress;
        if (progressData) {
          console.log('📥 Restoring progress data:', progressData);
          
          // Restore section-level progress
          if (progressData.completedSteps && Array.isArray(progressData.completedSteps)) {
            setCompletedSteps(new Set(progressData.completedSteps));
          }
          
          // Restore chunk-level progress (Map<number, Set<number>>)
          if (progressData.completedChunks && typeof progressData.completedChunks === 'object') {
            const restoredChunks = new Map<number, Set<number>>();
            Object.entries(progressData.completedChunks).forEach(([sectionIdx, chunkArr]) => {
              restoredChunks.set(Number(sectionIdx), new Set(chunkArr as number[]));
            });
            setCompletedChunks(restoredChunks);
            console.log('✅ Restored completedChunks for unlock tracking');
          }
          
          // Restore section index
          if (typeof progressData.currentSectionIndex === 'number') {
            setCurrentSectionIndex(progressData.currentSectionIndex);
          }
          
          // Restore comprehension level
          if (typeof progressData.comprehensionLevel === 'number') {
            setComprehensionLevel(progressData.comprehensionLevel);
          }
        }
      };
        
      if (savedCourse && savedCourse.sections?.length > 0 && hasRealContent) {
        // Full content available - use it directly
        console.log('✅ Using pre-loaded course content:', module.id);
        const cleanedCourse = {
          ...savedCourse,
          sections: savedCourse.sections.map((section: any) => ({
            ...section,
            isLocked: false,
            isGenerating: false
          }))
        };
        
        setGeneratedCourse(cleanedCourse);
        learningModuleTracker.recordGeneratedContent(sid, cleanedCourse);
        
        // 🎯 FIX: Restore progress from module data
        restoreProgressFromCourse(module);
        
        setPhase('course');
        console.log('✅ Restored course with all sections unlocked:', cleanedCourse.sections.length);
      } else if ((savedCourse && savedCourse.sections?.length > 0) || hasGeneratedContentFlag) {
        // 🚀 LAZY LOAD: Has structure OR has content in DB (metadata-only load)
        console.log('📚 Lazy loading full course content:', module.id, { hasGeneratedContentFlag, hasSections: savedCourse?.sections?.length > 0 });
        setLoading(true);
        setPhase('generating');
        setGenerationStep('Loading your course...');
        setGenerationProgress(50);
        
        try {
          const fullCourse = await courseStorageService.loadFullCourse(user.id, module.id);
          
          if (fullCourse && (fullCourse as any).generatedCourse) {
            const gc = (fullCourse as any).generatedCourse;
            const cleanedCourse = {
              ...gc,
              sections: gc.sections.map((section: any) => ({
                ...section,
                isLocked: false,
                isGenerating: false
              }))
            };
            
            setGeneratedCourse(cleanedCourse);
            learningModuleTracker.recordGeneratedContent(sid, cleanedCourse);
            
            // 🎯 FIX: Restore progress from loaded course
            restoreProgressFromCourse(fullCourse);
            
            setPhase('course');
            console.log('✅ Full course loaded:', cleanedCourse.sections.length, 'sections');
          } else {
            // No full content found - user needs to generate new course
            console.log('⚠️ No full content found, starting fresh');
            setPhase('self-assessment');
          }
        } catch (error) {
          console.error('❌ Failed to load full course:', error);
          setPhase('self-assessment');
        } finally {
          setLoading(false);
          setGenerationProgress(100);
        }
      }
    };
    
    initCourse();
  }, [user, module.id]);

  // Save progress to DATABASE whenever it changes (NOT localStorage - too large)
  // We only save minimal metadata, the full course is stored in the DB
  useEffect(() => {
    if (generatedCourse && generatedCourse.sections?.length > 0 && user?.id) {
      // 🎯 FIX: Convert completedChunks Map<number, Set<number>> to serializable format
      // Format: { sectionIndex: [chunkIndex1, chunkIndex2, ...], ... }
      const completedChunksData: Record<number, number[]> = {};
      completedChunks.forEach((chunkSet, sectionIdx) => {
        completedChunksData[sectionIdx] = Array.from(chunkSet);
      });
      
      // Only sync progress to DATABASE (permanent storage)
      // DO NOT store full course in localStorage - causes quota issues
      courseStorageService.updateProgress(user.id, module.id, {
        currentSectionIndex,
        totalSections: generatedCourse.sections.length,
        completedSteps: Array.from(completedSteps),
        completedChunks: completedChunksData, // 🎯 FIX: Also save chunk-level progress
        comprehensionLevel,
        phase,
        lastAccessed: new Date().toISOString()
      }).catch(err => console.warn('⚠️ DB progress sync failed:', err));
      
      console.log('💾 Synced course progress to DB for:', module.id, 'at step:', currentSectionIndex, 'completedChunks:', completedChunksData);
    }
  }, [generatedCourse, currentSectionIndex, completedSteps, completedChunks, comprehensionLevel, module.id, phase, user?.id]);

  // Load existing progress from user context (for comprehension level)
  useEffect(() => {
    const existingProgress = getLearningModuleProgress(module.id);
    if (existingProgress && existingProgress.status === 'in_progress') {
      setComprehensionLevel(existingProgress.overallComprehension);
    }
  }, [module.id, getLearningModuleProgress]);

  // 📊 DASHBOARD CONTEXT: Track phase changes for AI awareness
  // NOW INCLUDES: Current step, chunk, and detailed progress for LLM context
  useEffect(() => {
    if (user?.id && sessionId) {
      const currentSection = generatedCourse?.sections?.[currentSectionIndex];
      const currentChunk = currentSection?.chunks?.[currentChunkIndex];
      const sectionCompletedChunks = completedChunks.get(currentSectionIndex)?.size || 0;
      
      dashboardContextService.trackDashboardActivity(user.id, {
        activityType: phase === 'chunk-view' ? 'chunk_view' : phase === 'section-view' ? 'section_view' : phase === 'step-view' ? 'step_view' : 'module_progress',
        moduleId: module.id,
        moduleName: module.title,
        moduleCategory: module.category,
        currentPhase: phase,
        progressData: {
          comprehensionLevel,
          questionsAnswered: responses.length,
          totalQuestions: questions.length,
          currentStepIndex: currentSectionIndex,
          currentChunkIndex: currentChunkIndex,
          totalSteps: generatedCourse?.sections?.length || 0,
          totalChunks: currentSection?.chunks?.length || 0,
          completedChunksInSection: sectionCompletedChunks,
          overallProgress: calculateOverallProgress(),
          // Current content for AI context
          currentSectionTitle: currentSection?.title,
          currentChunkTitle: currentChunk?.title,
          currentChunkType: currentChunk?.type,
          // 🎓 MONTESSORI: Add pedagogical context
          competencyMastery: competencyLevels.length > 0
            ? Math.round(competencyLevels.reduce((sum, c) => sum + c.level, 0) / competencyLevels.length)
            : comprehensionLevel,
          itemsDueForReview: sm2SpacedRepetitionService.getDueItems(practiceStates).length,
          knowledgeGaps: competencyMasteryTracker.identifyKnowledgeGaps(
            competencyLevels.map(c => ({
              competencyId: c.name,
              competencyName: c.name,
              currentLevel: c.level,
              masteryThreshold: c.threshold,
              trend: 'stable' as const,
              confidence: 0.8,
              assessmentHistory: [],
              recommendation: 'practice' as const,
              indicators: []
            }))
          ),
          currentStreak: sm2SpacedRepetitionService.calculateStats(practiceStates).streak,
        },
        sessionId,
      });
    }
  }, [phase, user?.id, sessionId, module.id, module.title, module.category, comprehensionLevel, responses.length, questions.length, currentSectionIndex, currentChunkIndex, generatedCourse?.sections?.length, completedChunks]);

  // Theme-aware styling
  const getBackgroundClasses = () => {
    if (isDarkGradient) {
      return "bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900";
    } else if (isWhitePurpleGradient) {
      return "bg-gradient-to-br from-white via-purple-50 to-indigo-50";
    } else if (isBrightMode) {
      return "bg-white";
    } else if (isDarkMode) {
      return "bg-gray-900";
    } else {
      return "bg-white";
    }
  };

  const getCardClasses = () => {
    if (isDarkMode || isDarkGradient) {
      return "bg-white/10 backdrop-blur-md border border-white/20";
    } else {
      return "bg-white/80 backdrop-blur-md border border-gray-200";
    }
  };

  const getTextColor = (type: 'primary' | 'secondary' = 'primary') => {
    if (isDarkMode || isDarkGradient) {
      return type === 'primary' ? 'text-white' : 'text-gray-300';
    } else {
      return type === 'primary' ? 'text-gray-900' : 'text-gray-700';
    }
  };

  // Start Assessment with user context
  const handleStartAssessment = async () => {
    if (!userSelfAssessment.trim()) {
      setError('Please describe your current knowledge level first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Generate diagnostic questions based on user's self-assessment
      const generatedQuestions = await learningQuestionEngine.generateAssessmentQuestions(
        module.id,
        module.subject,
        module.difficulty,
        5, // Number of questions
        userSelfAssessment // Pass user's self-description
      );

      if (generatedQuestions.length === 0) {
        throw new Error('Failed to generate questions');
      }

      generatedQuestions.forEach(q => {
        learningModuleTracker.recordQuestion(sessionId, q);
      });

      setQuestions(generatedQuestions);
      setPhase('assessment');
    } catch (err) {
      console.error('Assessment generation error:', err);
      setError('Failed to generate assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Question Response
  const handleQuestionResponse = (questionId: string, answer: string, response: UserResponse) => {
    setResponses([...responses, response]);
    learningModuleTracker.recordResponse(sessionId, response);

    // Update comprehension in real-time
    const session = learningModuleTracker.getSession(sessionId);
    if (session) {
      setComprehensionLevel(session.comprehensionLevel);
    }
  };

  // 🔄 Callback for background section generation - saves course when sections complete
  const handleBackgroundSectionReady = useCallback((updatedCourse: GeneratedCourse, sectionIndex: number) => {
    console.log(`🔄 Background section ${sectionIndex + 1} ready with ${updatedCourse.sections[sectionIndex]?.chunks?.length || 0} chunks`);
    
    // Update React state with the new section data
    setGeneratedCourse(prev => {
      if (!prev) return updatedCourse;
      
      // Merge the updated section into state
      const newSections = [...prev.sections];
      if (updatedCourse.sections[sectionIndex]) {
        newSections[sectionIndex] = {
          ...updatedCourse.sections[sectionIndex],
          isLocked: false,
          isGenerating: false
        };
      }
      return { ...prev, sections: newSections };
    });
    
    // Track completion
    backgroundSectionsCompleted.current++;
    const totalSections = totalBackgroundSections.current;
    
    // 🎯 When ALL background sections are complete, re-save the full course to DB
    if (backgroundSectionsCompleted.current >= totalSections && user?.id) {
      console.log(`✅ All ${totalSections} background sections complete! Re-saving full course to DB...`);
      
      // Get the latest course data and save it
      const courseToSave = updatedCourse;
      const generatedTitle = courseToSave.courseTitle || module.title;
      
      // Clean course for DB (remove loading/locked flags)
      const cleanedCourseForDB = {
        ...courseToSave,
        sections: courseToSave.sections.map((section: any) => ({
          ...section,
          isLocked: false,
          isGenerating: false
        }))
      };
      
      const courseWithContent = {
        ...module,
        id: module.id,
        title: generatedTitle,
        name: generatedTitle,
        category: module.category,
        description: courseToSave.courseDescription || module.description,
        generatedCourse: cleanedCourseForDB
      };
      
      courseStorageService.saveCourse(user.id, courseWithContent as any).then(success => {
        if (success) {
          console.log('✅ Full course with all dynamic content saved to database:', module.id);
        }
      }).catch(err => console.warn('⚠️ Failed to save full course to DB:', err));
    }
  }, [user?.id, module]);

  // Complete Assessment & Generate Course
  const handleAssessmentComplete = async () => {
    setPhase('generating');
    setLoading(true);
    setError(null);
    setGenerationProgress(0);
    setGenerationStep('Analyzing your responses...');
    
    // Reset background tracking
    backgroundSectionsCompleted.current = 0;

    // 📊 Simulated progress for UX feedback
    const progressSteps = [
      { progress: 10, step: 'Analyzing your responses...' },
      { progress: 25, step: 'Identifying your learning style...' },
      { progress: 40, step: 'Designing course structure...' },
      { progress: 55, step: 'Generating personalized content...' },
      { progress: 70, step: 'Creating interactive exercises...' },
      { progress: 85, step: 'Adding comprehension checks...' },
      { progress: 95, step: 'Finalizing your course...' },
    ];
    
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setGenerationProgress(progressSteps[stepIndex].progress);
        setGenerationStep(progressSteps[stepIndex].step);
        stepIndex++;
      }
    }, 2500); // Update every 2.5 seconds

    try {
      // Get cognitive markers from session
      const session = learningModuleTracker.getSession(sessionId);
      if (!session) {
        clearInterval(progressInterval);
        throw new Error('Session not found');
      }

      // Generate personalized course with user's self-assessment context and system guidance
      // 🎯 Pass module.difficulty so level determination is restrictive (max +1 upgrade)
      // 🔄 Pass onProgress callback to update state + re-save when background sections complete
      const course = await dynamicCourseBuilder.generateCourse(
        module.id,
        module.subject,
        responses,
        session.cognitiveMarkers,
        'textual', // Could be based on user preference
        userSelfAssessment, // Pass user's original self-description
        module.systemContext, // Pass system context for LLM guidance while keeping generation dynamic
        handleBackgroundSectionReady, // 🎯 Callback for background section updates
        module.difficulty // 🎯 User's SELECTED difficulty level
      );
      
      // 🎯 Track how many sections need background generation (all except section 1)
      totalBackgroundSections.current = Math.max(0, course.sections.length - 1);
      courseRef.current = course;

      // ✅ Generation complete
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStep('Course ready!');
      
      learningModuleTracker.recordGeneratedContent(sessionId, course);
      setGeneratedCourse(course);
      setPhase('course');

      // 📚 SAVE COURSE TO DATABASE (after user enters course, not during generation)
      // This ensures permanent storage and cross-device access
      // CRITICAL: Include the FULL generatedCourse content, not just metadata!
      // 🎯 FIX: Use courseTitle (the LLM-generated title), NOT the user's prompt
      const generatedTitle = course.courseTitle || module.title;
      console.log('📚 Course generated with title:', generatedTitle, '(was:', module.title, ')');
      
      if (user?.id) {
        // 🎯 CLEAN course before saving: Remove all loading/locked flags
        // These are only for progressive generation, not for persisted courses
        const cleanedCourseForDB = {
          ...course,
          sections: course.sections.map((section: any) => ({
            ...section,
            isLocked: false,
            isGenerating: false
          }))
        };
        
        const courseWithContent = {
          ...module,
          id: module.id,
          title: generatedTitle, // 🎯 FIX: Use the generated course title, not user prompt
          name: generatedTitle,  // 🎯 FIX: Also set name for consistency
          category: module.category,
          description: course.courseDescription || module.description, // 🎯 FIX: Use courseDescription
          // IMPORTANT: Include the full generated course content for persistence (cleaned)
          generatedCourse: cleanedCourseForDB
        };
        courseStorageService.saveCourse(user.id, courseWithContent as any).then(success => {
          if (success) {
            console.log('✅ Course with content saved to database (all sections unlocked):', module.id);
          }
        }).catch(err => console.warn('⚠️ Failed to save course to DB:', err));
        
        // 🎯 FIX: Also update localStorage cache with the correct title
        try {
          const storedCourses = localStorage.getItem('neuraplay_custom_courses');
          if (storedCourses) {
            const courses = JSON.parse(storedCourses);
            const updatedCourses = courses.map((c: any) => 
              c.id === module.id 
                ? { ...c, title: generatedTitle, name: generatedTitle, description: course.courseDescription || c.description }
                : c
            );
            localStorage.setItem('neuraplay_custom_courses', JSON.stringify(updatedCourses));
            console.log('✅ Updated localStorage course title to:', generatedTitle);
          }
        } catch (localStorageErr) {
          console.warn('⚠️ Failed to update localStorage course title:', localStorageErr);
        }
      }

      // 🎓 Extract competencies from course if available
      const courseCompetencies = (course as any).competencies || [];
      if (courseCompetencies.length > 0) {
        setCompetencyLevels(courseCompetencies.map((c: any) => ({
          name: c.name,
          level: 50, // Initial level
          threshold: c.masteryThreshold || 80
        })));
      }

      // Update user progress with Montessori metrics
      const metrics = unifiedProgressCalculator.calculateModuleProgress(
        course,
        completedChunks,
        practiceStates,
        competencyLevels,
        undefined
      );

      updateLearningModuleProgress(module.id, {
        overallComprehension: metrics.competencyMastery,
        questionsAnswered: responses.length,
        accuracyRate: (responses.filter(r => r.isCorrect).length / responses.length) * 100,
        status: 'in_progress',
        cognitiveProfile: {
          conceptGrasp: Math.ceil(session.comprehensionLevel / 20),
          retentionLevel: session.comprehensionLevel,
          learningSpeed: session.cognitiveMarkers.learningPatterns.preferredPace,
          preferredContentType: 'textual'
        }
      });

    } catch (err) {
      clearInterval(progressInterval);
      console.error('Course generation error:', err);
      setError('Failed to generate course content. Please try again.');
      setPhase('assessment');
      setGenerationProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // Complete Module with Montessori metrics
  const handleCompleteModule = async () => {
    try {
      await learningModuleTracker.endSession(sessionId);
      
      // 🎓 Calculate final metrics
      const metrics = unifiedProgressCalculator.calculateModuleProgress(
        generatedCourse,
        completedChunks,
        practiceStates,
        competencyLevels,
        undefined
      );

      updateLearningModuleProgress(module.id, {
        status: 'completed',
        overallComprehension: metrics.competencyMastery
      });

      setPhase('completed');
    } catch (err) {
      console.error('Error completing module:', err);
    }
  };

  // Navigate sections
  const handleNextSection = () => {
    // Mark current step as completed
    setCompletedSteps(prev => new Set([...prev, currentSectionIndex]));
    
    if (generatedCourse && currentSectionIndex < generatedCourse.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentChunkIndex(0); // Reset chunk index for new section
    } else {
      handleCompleteModule();
    }
  };

  const handlePrevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      setCurrentChunkIndex(0);
    }
  };

  // Handle section selection from course overview - opens section dashboard
  // 🎯 Gracefully handles sections still generating in background
  const handleSectionClick = async (index: number) => {
    setCurrentSectionIndex(index);
    setCurrentChunkIndex(0);
    
    const section = generatedCourse?.sections[index];
    
    // If section has chunks, show section dashboard immediately
    if (section?.chunks && section.chunks.length > 0) {
      setPhase('section-view');
      return;
    }
    
    // 🎯 Section doesn't have chunks yet (still generating in background)
    // Show a brief preparation state, then check again
    setLoading(true);
    setGenerationStep('Preparing section content...');
    
    // Wait briefly for background generation to potentially complete
    // Check every 500ms for up to 5 seconds
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
      
      // Re-check if chunks are now available
      const updatedSection = generatedCourse?.sections[index];
      if (updatedSection?.chunks && updatedSection.chunks.length > 0) {
        setLoading(false);
        setGenerationStep('');
        setPhase('section-view');
        return;
      }
    }
    
    // If still not ready after 5 seconds, show step-view with content (fallback)
    setLoading(false);
    setGenerationStep('');
    setPhase('step-view');
    console.log(`⚠️ Section ${index + 1} chunks not ready after 5s, showing step-view`);
  };

  // Handle chunk selection from section dashboard
  const handleChunkSelect = (chunkIndex: number) => {
    setCurrentChunkIndex(chunkIndex);
    setPhase('chunk-view');
    
    // Track chunk view for LLM context
    // 🔧 FIX: Include ALL required fields especially totalSteps to prevent data loss
    if (user?.id && sessionId) {
      const currentSection = generatedCourse?.sections?.[currentSectionIndex];
      const currentChunk = currentSection?.chunks?.[chunkIndex];
      
      dashboardContextService.trackDashboardActivity(user.id, {
        activityType: 'chunk_view',
        moduleId: module.id,
        moduleName: module.title,
        moduleCategory: module.category,
        currentPhase: 'chunk-view',
        progressData: {
          currentStepIndex: currentSectionIndex,
          currentChunkIndex: chunkIndex,
          // 🔧 FIX: Include totalSteps so it doesn't get lost!
          totalSteps: generatedCourse?.sections?.length || 1,
          totalSections: generatedCourse?.sections?.length || 1,
          totalChunks: currentSection?.chunks?.length || 0,
          overallProgress: calculateOverallProgress(),
          currentSectionTitle: currentSection?.title,
          currentChunkTitle: currentChunk?.title,
        },
        sessionId,
      });
    }
  };

  // Handle chunk completion
  const handleChunkComplete = (chunkIndex: number) => {
    setCompletedChunks(prev => {
      const newMap = new Map(prev);
      const sectionChunks = newMap.get(currentSectionIndex) || new Set();
      sectionChunks.add(chunkIndex);
      newMap.set(currentSectionIndex, sectionChunks);
      return newMap;
    });
    
    // Check if all chunks in section are complete
    const section = generatedCourse?.sections[currentSectionIndex];
    const totalChunks = section?.chunks?.length || 0;
    const completedInSection = (completedChunks.get(currentSectionIndex)?.size || 0) + 1;
    
    if (completedInSection >= totalChunks) {
      // Mark section as completed
      setCompletedSteps(prev => new Set([...prev, currentSectionIndex]));
    }
    
    console.log(`✅ Chunk ${chunkIndex + 1} completed in section ${currentSectionIndex + 1}`);
  };

  // Navigate to next chunk
  const handleNextChunk = () => {
    const section = generatedCourse?.sections[currentSectionIndex];
    const totalChunks = section?.chunks?.length || 0;
    
    if (currentChunkIndex < totalChunks - 1) {
      setCurrentChunkIndex(currentChunkIndex + 1);
    } else {
      // All chunks done, go back to section dashboard
      setPhase('section-view');
    }
  };

  // Navigate to previous chunk
  const handlePrevChunk = () => {
    if (currentChunkIndex > 0) {
      setCurrentChunkIndex(currentChunkIndex - 1);
    }
  };

  // Return to section dashboard from chunk view
  const handleBackToSection = () => {
    setPhase('section-view');
  };

  // Return to course overview from section dashboard
  const handleBackToCourse = () => {
    setPhase('course');
  };

  // Handle section complete - move to next section
  const handleSectionComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentSectionIndex]));
    
    if (generatedCourse && currentSectionIndex < generatedCourse.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentChunkIndex(0);
      setPhase('section-view');
    } else {
      handleCompleteModule();
    }
  };

  // Legacy: Handle step selection (for backward compatibility)
  const handleStepClick = (index: number) => {
    handleSectionClick(index);
  };

  // Get completed chunks for current section
  const getCompletedChunksForSection = (sectionIndex: number): Set<number> => {
    return completedChunks.get(sectionIndex) || new Set();
  };

  // 🎓 Calculate overall progress with Montessori metrics
  const calculateOverallProgress = (): number => {
    if (!generatedCourse) return 0;
    
    // Use UnifiedProgressCalculator for comprehensive progress
    const metrics = unifiedProgressCalculator.calculateModuleProgress(
      generatedCourse,
      completedChunks,
      practiceStates,
      competencyLevels,
      undefined // TODO: Add three-period tracking
    );
    
    return metrics.overallProgress;
    
    return totalChunks > 0 ? Math.round((completedTotal / totalChunks) * 100) : 0;
  };

  // Get step type color
  const getStepTypeColor = (type: CourseSection['type']) => {
    switch (type) {
      case 'introduction': return 'from-blue-500 to-cyan-500';
      case 'core_concept': return 'from-violet-500 to-purple-500';
      case 'example': return 'from-green-500 to-emerald-500';
      case 'practice': return 'from-orange-500 to-amber-500';
      case 'checkpoint': return 'from-pink-500 to-rose-500';
      case 'summary': return 'from-indigo-500 to-blue-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const currentSection = generatedCourse?.sections[currentSectionIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute inset-0 z-50 ${getBackgroundClasses()} overflow-hidden`}
      >
        {/* Unified Header - Context-aware based on phase */}
        <div className={`${getCardClasses()} border-b flex-shrink-0`}>
          <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
            {/* Section View Header - Compact with image and progress */}
            {phase === 'section-view' && currentSection ? (
              <div className="flex items-center gap-4">
                {/* Back Button */}
                <button
                  onClick={handleBackToCourse}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors flex-shrink-0 ${
                    isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Back to Course</span>
                </button>

                {/* Section Image */}
                {currentSection.imageUrl ? (
                  <img 
                    src={currentSection.imageUrl} 
                    alt={currentSection.title}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                )}

                {/* Section Info + Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className={`text-lg font-bold truncate ${getTextColor('primary')}`}>
                      {currentSection.title}
                    </h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                      Section {currentSectionIndex + 1}/{generatedCourse?.sections.length || 0}
                    </span>
                  </div>
                  {/* Compact Progress Bar */}
                  <div className="flex items-center gap-3">
                    <div className={`flex-1 h-1.5 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                        style={{ width: `${(getCompletedChunksForSection(currentSectionIndex).size / (currentSection.chunks?.length || 1)) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs flex-shrink-0 ${getTextColor('secondary')}`}>
                      {getCompletedChunksForSection(currentSectionIndex).size}/{currentSection.chunks?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Continue Button */}
                {getCompletedChunksForSection(currentSectionIndex).size === currentSection.chunks?.length && (
                  <button
                    onClick={handleSectionComplete}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex-shrink-0 hidden sm:flex items-center gap-2"
                  >
                    <span>Continue to Next Section</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              /* Default Header - Course overview and other phases */
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h1 className={`text-xl font-bold ${getTextColor('primary')}`}>
                        {module.title}
                      </h1>
                      <p className={`text-xs ${getTextColor('secondary')} hidden sm:block`}>
                        {module.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Indicator - Only show during course viewing */}
                {(() => {
                  const currentChunk = generatedCourse?.sections?.[currentSectionIndex]?.chunks?.[currentChunkIndex];
                  const isInQuizMode = phase === 'chunk-view' && currentChunk?.type === 'quiz';
                  const shouldHideProgress = phase === 'intro' || phase === 'assessment' || phase === 'generating' || isInQuizMode;
                  const hasCourse = generatedCourse && generatedCourse.sections && generatedCourse.sections.length > 0;
                  return !shouldHideProgress && hasCourse;
                })() && (
                  <div className="mt-3 flex items-center space-x-4">
                    <div className="flex-1">
                      <div className={`w-full rounded-full h-1.5 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round((completedSteps.size / (generatedCourse?.sections.length || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs ${getTextColor('secondary')}`}>
                      {completedSteps.size}/{generatedCourse?.sections.length || 0} sections
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Content - Responsive padding for mobile */}
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4 h-[calc(100vh-80px)] sm:h-[calc(100vh-100px)] overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Introduction Phase */}
          {phase === 'intro' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-2xl mx-auto ${getCardClasses()} rounded-2xl p-4 sm:p-8`}
            >
              <div className="text-center mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${isDarkMode || isDarkGradient ? 'bg-slate-700/60' : 'bg-slate-100'}`}>
                  <BookOpen className={`w-8 h-8 ${isDarkMode || isDarkGradient ? 'text-slate-300' : 'text-slate-600'}`} />
                </div>
                <h2 className={`text-2xl font-semibold mb-3 ${getTextColor('primary')}`}>
                  {module.title}
                </h2>
                <p className={`text-base leading-relaxed ${getTextColor('secondary')}`}>
                  {module.description}
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className={`p-5 rounded-xl ${isDarkMode || isDarkGradient ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-100'}`}>
                  <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${getTextColor('primary')}`}>
                    <Target className={`w-4 h-4 ${isDarkMode || isDarkGradient ? 'text-slate-400' : 'text-slate-500'}`} />
                    Learning Objectives
                  </h3>
                  <ul className="space-y-2">
                    {module.learningObjectives.map((objective, index) => (
                      <li key={index} className={`text-sm flex items-start gap-2 ${getTextColor('secondary')}`}>
                        <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${isDarkMode || isDarkGradient ? 'bg-slate-500' : 'bg-slate-400'}`} />
                        {objective}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-xl ${isDarkMode || isDarkGradient ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-100'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className={`w-4 h-4 ${isDarkMode || isDarkGradient ? 'text-slate-400' : 'text-slate-500'}`} />
                      <span className={`text-xs font-medium ${isDarkMode || isDarkGradient ? 'text-slate-400' : 'text-slate-500'}`}>Duration</span>
                    </div>
                    <p className={`text-sm font-medium ${getTextColor('primary')}`}>
                      ~{module.estimatedMinutes} min
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl ${isDarkMode || isDarkGradient ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-100'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className={`w-4 h-4 ${isDarkMode || isDarkGradient ? 'text-slate-400' : 'text-slate-500'}`} />
                      <span className={`text-xs font-medium ${isDarkMode || isDarkGradient ? 'text-slate-400' : 'text-slate-500'}`}>Approach</span>
                    </div>
                    <p className={`text-sm font-medium ${getTextColor('primary')}`}>
                      Adaptive
                    </p>
                  </div>
                </div>

                <div className={`p-5 rounded-xl ${isDarkMode || isDarkGradient ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-100'}`}>
                  <h3 className={`text-sm font-medium mb-3 ${getTextColor('primary')}`}>How it works</h3>
                  <ol className="space-y-2">
                    <li className={`text-sm flex items-start gap-3 ${getTextColor('secondary')}`}>
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center ${isDarkMode || isDarkGradient ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>1</span>
                      Quick assessment to understand your level
                    </li>
                    <li className={`text-sm flex items-start gap-3 ${getTextColor('secondary')}`}>
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center ${isDarkMode || isDarkGradient ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>2</span>
                      Personalized course generated for you
                    </li>
                    <li className={`text-sm flex items-start gap-3 ${getTextColor('secondary')}`}>
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center ${isDarkMode || isDarkGradient ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>3</span>
                      Learn at your pace with AI assistance
                    </li>
                  </ol>
                </div>
              </div>

              <button
                onClick={() => setPhase('self-assessment')}
                className={`w-full py-3.5 font-medium rounded-xl transition-all flex items-center justify-center space-x-2 ${isDarkMode || isDarkGradient ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Self-Assessment Phase */}
          {phase === 'self-assessment' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-2xl mx-auto ${getCardClasses()} rounded-2xl p-8`}
            >
              <div className="text-center mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${isDarkMode || isDarkGradient ? 'bg-slate-700/60' : 'bg-slate-100'}`}>
                  <MessageSquare className={`w-8 h-8 ${isDarkMode || isDarkGradient ? 'text-slate-300' : 'text-slate-600'}`} />
                </div>
                <h2 className={`text-2xl font-semibold mb-3 ${getTextColor('primary')}`}>
                  Tell us about your experience
                </h2>
                <p className={`text-base leading-relaxed ${getTextColor('secondary')}`}>
                  This helps us create the right assessment for your level in {module.subject}.
                </p>
              </div>

              <div className="space-y-5 mb-8">
                <div className={`p-5 rounded-xl ${isDarkMode || isDarkGradient ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-100'}`}>
                  <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${getTextColor('primary')}`}>
                    <HelpCircle className={`w-4 h-4 ${isDarkMode || isDarkGradient ? 'text-slate-400' : 'text-slate-500'}`} />
                    Example responses
                  </h3>
                  <ul className={`space-y-2 text-sm ${getTextColor('secondary')}`}>
                    <li className="flex items-start gap-2">
                      <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${isDarkMode || isDarkGradient ? 'bg-slate-500' : 'bg-slate-400'}`} />
                      "Complete beginner, never studied this before"
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${isDarkMode || isDarkGradient ? 'bg-slate-500' : 'bg-slate-400'}`} />
                      "I know the basics but need help with advanced topics"
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${isDarkMode || isDarkGradient ? 'bg-slate-500' : 'bg-slate-400'}`} />
                      "Some exposure but need structured learning"
                    </li>
                  </ul>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${getTextColor('primary')}`}>
                    Your background with {module.subject}
                  </label>
                  <textarea
                    value={userSelfAssessment}
                    onChange={(e) => setUserSelfAssessment(e.target.value)}
                    placeholder={`Describe your current knowledge level...`}
                    rows={4}
                    className={`w-full p-4 rounded-xl border ${
                      isDarkMode || isDarkGradient
                        ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400'
                    } focus:outline-none resize-none transition-colors`}
                  />
                  <p className={`text-xs mt-2 ${isDarkMode || isDarkGradient ? 'text-slate-500' : 'text-slate-400'}`}>
                    The more detail you provide, the better we can tailor the assessment.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setPhase('intro')}
                  className={`px-5 py-3 rounded-xl font-medium transition-colors ${
                    isDarkMode || isDarkGradient ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={handleStartAssessment}
                  disabled={!userSelfAssessment.trim() || loading}
                  className={`flex-1 py-3.5 font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 ${isDarkMode || isDarkGradient ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing assessment...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Assessment Phase */}
          {phase === 'assessment' && questions.length > 0 && (
            <LearningQuestionEngine
              questions={questions}
              onResponseSubmit={handleQuestionResponse}
              onComplete={handleAssessmentComplete}
              isDarkMode={isDarkMode || isDarkGradient}
            />
          )}

          {/* Generating Phase */}
          {phase === 'generating' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`max-w-md mx-auto ${getCardClasses()} rounded-2xl p-10 text-center`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isDarkMode || isDarkGradient ? 'bg-slate-700/60' : 'bg-slate-100'}`}>
                <Loader2 className={`w-7 h-7 animate-spin ${isDarkMode || isDarkGradient ? 'text-slate-300' : 'text-slate-600'}`} />
              </div>
              <h2 className={`text-xl font-semibold mb-2 ${getTextColor('primary')}`}>
                Building your course
              </h2>
              <p className={`text-sm mb-6 ${getTextColor('secondary')}`}>
                {generationStep || 'Analyzing your responses...'}
              </p>
              
              {/* Progress Bar */}
              <div className="w-full mb-4">
                <div className={`w-full rounded-full h-1.5 overflow-hidden ${isDarkMode || isDarkGradient ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full ${isDarkMode || isDarkGradient ? 'bg-slate-400' : 'bg-slate-600'}`}
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <span className={`text-xs font-medium ${isDarkMode || isDarkGradient ? 'text-slate-500' : 'text-slate-400'}`}>
                    {generationProgress}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Course Grid Overview Phase */}
          {phase === 'course' && generatedCourse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              {/* Course Header */}
              <div className={`${getCardClasses()} rounded-2xl p-6 mb-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className={`text-2xl font-bold ${getTextColor('primary')}`}>
                      {generatedCourse.courseTitle || module.title}
                    </h2>
                    <p className={`mt-1 ${getTextColor('secondary')}`}>
                      {generatedCourse.courseDescription || module.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-violet-600 text-white' : isDarkMode || isDarkGradient ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-violet-600 text-white' : isDarkMode || isDarkGradient ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <span className={getTextColor('secondary')}>
                    <strong>{generatedCourse.sections.length}</strong> Steps
                  </span>
                  <span className={getTextColor('secondary')}>
                    <strong>{generatedCourse.totalEstimatedMinutes}</strong> min total
                  </span>
                  <span className={getTextColor('secondary')}>
                    <strong>{completedSteps.size}</strong> / {generatedCourse.sections.length} completed
                  </span>
                </div>
              </div>

              {/* Course Steps Grid - 🎯 ALL sections appear ready (no loading/locked states) */}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                {generatedCourse.sections.map((section, index) => {
                  const isCompleted = completedSteps.has(index);
                  // 🎯 NO locked/generating states - all sections appear accessible
                  const typeColor = getStepTypeColor(section.type);
                  // Check if section has quiz chunks
                  const quizChunks = section.chunks?.filter(c => c.type === 'quiz') || [];
                  const hasQuiz = quizChunks.length > 0;
                  const totalQuizQuestions = quizChunks.reduce((sum, c) => sum + (c.quizQuestions?.length || 0), 0);
                  
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleStepClick(index)}
                      className={`${getCardClasses()} rounded-xl overflow-hidden transition-all group relative ${
                        isCompleted ? 'ring-2 ring-green-500/50 cursor-pointer hover:border-violet-500/50' : 
                        'cursor-pointer hover:border-violet-500/50'
                      }`}
                    >
                      {/* 🔄 Generating Overlay */}
                      {/* 🎯 NO loading/locked overlays - all sections appear ready */}
                      
                      {/* Step Number Badge */}
                      <div className={`absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-gradient-to-r ${typeColor} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : section.stepNumber || index + 1}
                      </div>
                      
                      {/* Quiz Badge - Show if section has quiz */}
                      {hasQuiz && (
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg">
                          <HelpCircle className="w-3 h-3" />
                          <span>{totalQuizQuestions} Q</span>
                        </div>
                      )}
                      
                      {/* Image or Placeholder */}
                      <div className="relative h-32 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                        {section.imageUrl ? (
                          <img 
                            src={section.imageUrl} 
                            alt={section.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${typeColor} opacity-20`}>
                            <ImageIcon className="w-12 h-12 text-white/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 right-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full bg-black/50 text-white`}>
                            {section.estimatedMinutes} min
                          </span>
                        </div>
                      </div>
                      
                      {/* Step Content */}
                      <div className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${typeColor} text-white`}>
                            {section.type.replace('_', ' ')}
                          </span>
                          {hasQuiz && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white`}>
                              📝 Quiz
                            </span>
                          )}
                        </div>
                        <h3 className={`font-semibold mb-2 group-hover:text-violet-400 transition-colors ${getTextColor('primary')}`}>
                          {section.title}
                        </h3>
                        <p className={`text-sm line-clamp-2 ${getTextColor('secondary')}`}>
                          {section.content.substring(0, 100)}...
                        </p>
                        
                        {/* Key Points Preview */}
                        {section.keyPoints && section.keyPoints.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {section.keyPoints.slice(0, 2).map((point, i) => (
                              <span key={i} className={`text-xs px-2 py-0.5 rounded ${isDarkMode || isDarkGradient ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                {point.length > 20 ? point.substring(0, 20) + '...' : point}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Chunk count indicator */}
                        {section.chunks && section.chunks.length > 0 && (
                          <div className={`mt-3 pt-3 border-t ${isDarkMode || isDarkGradient ? 'border-white/10' : 'border-gray-200'} flex items-center justify-between text-xs`}>
                            <span className={getTextColor('secondary')}>
                              {section.chunks.length} lessons
                            </span>
                            {hasQuiz && (
                              <span className="text-amber-500 font-medium">
                                {totalQuizQuestions} questions
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Hover Play Overlay */}
                      <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-600/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                          <Play className="w-6 h-6 text-white ml-0.5" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Dedicated Quizzes Section */}
              {(() => {
                const allQuizzes = generatedCourse.sections.flatMap((section, sectionIndex) => 
                  (section.chunks || [])
                    .filter(c => c.type === 'quiz' && c.quizQuestions && c.quizQuestions.length > 0)
                    .map((chunk, chunkIndex) => ({ 
                      chunk, 
                      sectionIndex, 
                      chunkIndex: section.chunks?.indexOf(chunk) || 0,
                      sectionTitle: section.title 
                    }))
                );
                
                if (allQuizzes.length === 0) return null;
                
                return (
                  <div className="mt-8">
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${getTextColor('primary')}`}>
                      <HelpCircle className="w-5 h-5 text-amber-500" />
                      Comprehension Quizzes
                      <span className={`text-sm font-normal ${getTextColor('secondary')}`}>
                        ({allQuizzes.reduce((sum, q) => sum + (q.chunk.quizQuestions?.length || 0), 0)} questions total)
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allQuizzes.map((quiz, idx) => (
                        <motion.div
                          key={`quiz-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => {
                            setCurrentSectionIndex(quiz.sectionIndex);
                            setCurrentChunkIndex(quiz.chunkIndex);
                            setPhase('chunk-view');
                          }}
                          className={`${getCardClasses()} rounded-xl p-4 cursor-pointer hover:border-amber-500/50 transition-all group`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                              <HelpCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-semibold text-sm group-hover:text-amber-400 transition-colors ${getTextColor('primary')}`}>
                                {quiz.chunk.title || 'Comprehension Check'}
                              </h4>
                              <p className={`text-xs mt-1 ${getTextColor('secondary')}`}>
                                {quiz.sectionTitle}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                                  {quiz.chunk.quizQuestions?.length || 0} questions
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              
              {/* Complete Course Button */}
              {completedSteps.size === generatedCourse.sections.length && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 text-center"
                >
                  <button
                    onClick={handleCompleteModule}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg flex items-center space-x-2 mx-auto"
                  >
                    <Trophy className="w-6 h-6" />
                    <span>Complete Course</span>
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Section View Phase - Grid of bite-sized chunks within a section */}
          {phase === 'section-view' && currentSection && (
            <motion.div
              key={`section-${currentSectionIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <CourseSectionDashboard
                section={currentSection}
                sectionIndex={currentSectionIndex}
                totalSections={generatedCourse?.sections.length || 0}
                isDarkMode={isDarkMode || isDarkGradient}
                onChunkSelect={handleChunkSelect}
                onBack={handleBackToCourse}
                onSectionComplete={handleSectionComplete}
                completedChunks={getCompletedChunksForSection(currentSectionIndex)}
              />
            </motion.div>
          )}

          {/* Chunk View Phase - Individual bite-sized learning chunk with TTS */}
          {phase === 'chunk-view' && currentSection?.chunks?.[currentChunkIndex] && (
            <motion.div
              key={`chunk-${currentSectionIndex}-${currentChunkIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <ChunkContentViewer
                chunk={currentSection.chunks[currentChunkIndex]}
                chunkIndex={currentChunkIndex}
                totalChunks={currentSection.chunks.length}
                sectionTitle={currentSection.title}
                isDarkMode={isDarkMode || isDarkGradient}
                onComplete={() => handleChunkComplete(currentChunkIndex)}
                onNext={handleNextChunk}
                onPrevious={handlePrevChunk}
                onBack={handleBackToSection}
                isCompleted={getCompletedChunksForSection(currentSectionIndex).has(currentChunkIndex)}
                canGoNext={currentChunkIndex < currentSection.chunks.length - 1}
                canGoPrevious={currentChunkIndex > 0}
                userId={user?.id}
                moduleId={module.id}
                moduleName={module.title}
              />
            </motion.div>
          )}

          {/* Step View Phase (Legacy - for sections without chunks) */}
          {/* PC: Full-width with page scroll | Mobile: Card layout */}
          {phase === 'step-view' && currentSection && (
            <motion.div
              key={currentSectionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`max-w-4xl lg:max-w-5xl mx-auto ${getCardClasses()} rounded-2xl lg:rounded-3xl overflow-visible lg:shadow-2xl`}
            >
              {/* Step Image Header - Larger on PC */}
              {currentSection.imageUrl && (
                <div className="relative h-56 lg:h-80 overflow-hidden">
                  <img 
                    src={currentSection.imageUrl} 
                    alt={currentSection.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 lg:bottom-8 left-6 lg:left-10 right-6 lg:right-10">
                    <div className="flex items-center space-x-3 mb-2 lg:mb-3">
                      <span className={`text-xs lg:text-sm font-medium px-3 lg:px-4 py-1 lg:py-1.5 rounded-full bg-gradient-to-r ${getStepTypeColor(currentSection.type)} text-white`}>
                        Step {currentSection.stepNumber || currentSectionIndex + 1} of {generatedCourse?.sections.length || 0}
                      </span>
                      <span className="text-xs lg:text-sm text-white/70 flex items-center space-x-1">
                        <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
                        <span>{currentSection.estimatedMinutes} min</span>
                      </span>
                    </div>
                    <h2 className="text-2xl lg:text-4xl font-bold text-white">
                      {currentSection.title}
                    </h2>
                  </div>
                </div>
              )}
              
              {/* Step Header (if no image) - Larger on PC */}
              {!currentSection.imageUrl && (
                <div className="p-6 lg:p-10 pb-0">
                  <div className="flex items-center justify-between mb-4 lg:mb-6">
                    <div className="flex items-center space-x-3 lg:space-x-4">
                      <span className={`text-sm lg:text-base font-medium px-3 lg:px-4 py-1 lg:py-1.5 rounded-full bg-gradient-to-r ${getStepTypeColor(currentSection.type)} text-white`}>
                        Step {currentSection.stepNumber || currentSectionIndex + 1} of {generatedCourse?.sections.length || 0}
                      </span>
                      <span className={`text-sm lg:text-base flex items-center space-x-1 ${getTextColor('secondary')}`}>
                        <Clock className="w-4 h-4 lg:w-5 lg:h-5" />
                        <span>{currentSection.estimatedMinutes} min</span>
                      </span>
                    </div>
                  </div>
                  <h2 className={`text-2xl lg:text-4xl font-bold ${getTextColor('primary')}`}>
                    {currentSection.title}
                  </h2>
                </div>
              )}

              <div className="p-6 lg:p-10">
                {/* Structured Content Renderer - Breaks content into digestible sub-sections */}
                <StepContentRenderer
                  stepTitle={currentSection.title}
                  stepType={currentSection.type}
                  content={currentSection.content}
                  keyPoints={currentSection.keyPoints || []}
                  estimatedMinutes={currentSection.estimatedMinutes}
                  imageUrl={currentSection.imageUrl}
                  isDarkMode={isDarkMode || isDarkGradient}
                  onSubSectionComplete={(subIdx) => {
                    console.log(`Sub-section ${subIdx} completed in step ${currentSectionIndex}`);
                  }}
                  onStepComplete={() => {
                    // Mark step as completed
                    setCompletedSteps(prev => new Set([...prev, currentSectionIndex]));
                  }}
                />

                {/* Step Navigation - Simplified on PC (single bar), full on mobile */}
                <div className={`mt-8 lg:mt-12 pt-6 border-t ${isDarkMode || isDarkGradient ? 'border-white/10' : 'border-gray-200'}`}>
                  {/* Mobile: Full navigation with all buttons */}
                  <div className="flex lg:hidden justify-between items-center">
                    <button
                      onClick={handleBackToCourse}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                        isDarkMode || isDarkGradient ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Grid className="w-5 h-5" />
                      <span className="text-sm">Overview</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handlePrevSection}
                        disabled={currentSectionIndex === 0}
                        className={`p-2 rounded-lg transition-all ${
                          currentSectionIndex === 0
                            ? 'opacity-50 cursor-not-allowed'
                            : isDarkMode || isDarkGradient ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setCompletedSteps(prev => new Set([...prev, currentSectionIndex]));
                          if (currentSectionIndex < (generatedCourse?.sections.length || 0) - 1) {
                            setCurrentSectionIndex(currentSectionIndex + 1);
                          } else {
                            handleCompleteModule();
                          }
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg text-sm"
                      >
                        <span>
                          {currentSectionIndex === (generatedCourse?.sections.length || 0) - 1
                            ? 'Complete'
                            : 'Next'}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* PC: Clean single navigation bar */}
                  <div className="hidden lg:flex justify-between items-center">
                    <button
                      onClick={handleBackToCourse}
                      className={`flex items-center space-x-3 px-6 py-3 rounded-xl transition-all ${
                        isDarkMode || isDarkGradient ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Grid className="w-5 h-5" />
                      <span>Back to Course Overview</span>
                    </button>

                    <div className={`text-sm ${isDarkMode || isDarkGradient ? 'text-gray-400' : 'text-gray-500'}`}>
                      Step {currentSectionIndex + 1} of {generatedCourse?.sections.length || 0}
                    </div>

                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handlePrevSection}
                        disabled={currentSectionIndex === 0}
                        className={`flex items-center space-x-2 px-5 py-3 rounded-xl transition-all ${
                          currentSectionIndex === 0
                            ? 'opacity-50 cursor-not-allowed'
                            : isDarkMode || isDarkGradient ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Previous Step</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setCompletedSteps(prev => new Set([...prev, currentSectionIndex]));
                          if (currentSectionIndex < (generatedCourse?.sections.length || 0) - 1) {
                            setCurrentSectionIndex(currentSectionIndex + 1);
                          } else {
                            handleCompleteModule();
                          }
                        }}
                        className="flex items-center space-x-3 px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg text-lg font-medium"
                      >
                        <span>
                          {currentSectionIndex === (generatedCourse?.sections.length || 0) - 1
                            ? 'Complete Course'
                            : 'Next Step'}
                        </span>
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Completed Phase */}
          {phase === 'completed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`max-w-2xl mx-auto ${getCardClasses()} rounded-2xl p-12 text-center`}
            >
              <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <h2 className={`text-3xl font-bold mb-4 ${getTextColor('primary')}`}>
                Congratulations!
              </h2>
              <p className={`text-lg mb-6 ${getTextColor('secondary')}`}>
                You've completed {module.title} with a comprehension score of {comprehensionLevel}%!
              </p>
              <div className={`p-6 rounded-xl mb-8 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h3 className={`font-semibold mb-4 ${getTextColor('primary')}`}>
                  📊 Your Performance:
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className={getTextColor('secondary')}>Questions Answered</p>
                    <p className={`text-2xl font-bold ${getTextColor('primary')}`}>{responses.length}</p>
                  </div>
                  <div>
                    <p className={getTextColor('secondary')}>Accuracy</p>
                    <p className={`text-2xl font-bold ${getTextColor('primary')}`}>
                      {Math.round((responses.filter(r => r.isCorrect).length / responses.length) * 100)}%
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-lg font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
              >
                Return to Learning Central
              </button>
            </motion.div>
          )}
        </div>

        {/* AI Assistant - Always Available */}
        <AIAssistantSmall />
      </motion.div>
    </AnimatePresence>
  );
};

export default GenerativeLearningModule;

