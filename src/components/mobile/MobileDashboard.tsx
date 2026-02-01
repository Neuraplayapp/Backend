/**
 * 🎨 MOBILE DASHBOARD - Scandinavian Minimalist Design
 * 
 * Features:
 * - Pastel purple aesthetic with clean lines
 * - Connects to Learning Central backend
 * - Custom courses, bookmarks, study help, progress tracking
 * - Native mobile UX with smooth animations
 * 
 * Design Philosophy:
 * - Scandinavian minimalism: clean, functional, calm
 * - Pastel purple as accent (not flashy)
 * - Plenty of whitespace
 * - Focus on content hierarchy
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { 
  BookOpen, GraduationCap, TrendingUp, Bookmark, Calendar,
  ChevronRight, ArrowLeft, Plus, Play, Clock, Star, CheckCircle,
  Sparkles, Target, Trophy, Lightbulb, X, AlertCircle, Zap
} from 'lucide-react';

import { dashboardContextService } from '../../services/DashboardContextService';
import { courseStorageService } from '../../services/CourseStorageService';
import { learnerPedagogicalProfileService, type LearnerPedagogicalProfile } from '../../services/LearnerPedagogicalProfile';
import { flashcardGeneratorService, type FlashcardStats } from '../../services/FlashcardGeneratorService';
import { dynamicQuizGenerator } from '../../services/DynamicQuizGenerator';
import type { GenerativeLearningModuleData } from '../../types/LearningModule.types';

// Lazy load heavy components
const GenerativeLearningModule = React.lazy(() => import('../GenerativeLearningModule'));
const FlashcardStudyComponent = React.lazy(() => import('../FlashcardStudyComponent'));
const DynamicQuizWidget = React.lazy(() => import('../DynamicQuizWidget'));

// ===== TYPES =====
interface MobileDashboardProps {
  onClose?: () => void;
}

type DashboardTab = 'library' | 'study-help' | 'progress' | 'bookmarks';

// ===== COLOR SYSTEM - Scandinavian Pastel Purple =====
const colors = {
  // Primary pastel purples
  lavender50: '#F8F7FC',
  lavender100: '#EEEAFC',
  lavender200: '#DDD4F9',
  lavender300: '#C5B8F4',
  lavender400: '#A896ED',
  lavender500: '#8B72E3',
  lavender600: '#7559D6',
  // Neutral Scandinavian tones
  stone50: '#FAFAF9',
  stone100: '#F5F5F4',
  stone200: '#E7E5E4',
  stone300: '#D6D3D1',
  stone400: '#A8A29E',
  stone500: '#78716C',
  stone600: '#57534E',
  stone700: '#44403C',
  stone800: '#292524',
  stone900: '#1C1917',
};

// ===== MAIN COMPONENT =====
const MobileDashboard: React.FC<MobileDashboardProps> = ({ onClose }) => {
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  
  // State
  const [activeTab, setActiveTab] = useState<DashboardTab>('library');
  const [courses, setCourses] = useState<GenerativeLearningModuleData[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const [activeModule, setActiveModule] = useState<GenerativeLearningModuleData | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  
  // Study Help State
  const [flashcardStats, setFlashcardStats] = useState<FlashcardStats | null>(null);
  const [showFlashcardStudy, setShowFlashcardStudy] = useState(false);
  const [showDynamicQuiz, setShowDynamicQuiz] = useState(false);
  const [quizStats, setQuizStats] = useState<any>(null);
  
  // Progress State
  const [pedagogicalProfile, setPedagogicalProfile] = useState<LearnerPedagogicalProfile | null>(null);
  
  // Create Course Modal State
  const [newCourseTopic, setNewCourseTopic] = useState('');
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [newCourseDifficulty, setNewCourseDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  
  // Background styling
  const bg = isDarkMode 
    ? `bg-gradient-to-br from-[${colors.stone900}] via-[#1F1C2C] to-[${colors.stone800}]`
    : `bg-gradient-to-br from-[${colors.lavender50}] via-white to-[${colors.stone50}]`;

  // ===== LOAD DATA =====
  useEffect(() => {
    const loadCourses = async () => {
      if (!user?.id) {
        // Try localStorage fallback
        try {
          const saved = localStorage.getItem('neuraplay_custom_courses');
          if (saved) {
            setCourses(JSON.parse(saved));
            setCoursesLoaded(true);
          }
        } catch {}
        return;
      }

      try {
        const dbCourses = await courseStorageService.loadCourses(user.id);
        setCourses(dbCourses);
        setCoursesLoaded(true);
      } catch (error) {
        console.error('Failed to load courses:', error);
        // Try localStorage fallback
        try {
          const saved = localStorage.getItem('neuraplay_custom_courses');
          if (saved) {
            setCourses(JSON.parse(saved));
            setCoursesLoaded(true);
          }
        } catch {}
      }
    };

    loadCourses();

    // Load bookmarks
    try {
      const saved = localStorage.getItem('neuraplay_bookmarked_modules');
      if (saved) setBookmarkedIds(new Set(JSON.parse(saved)));
    } catch {}
  }, [user?.id]);

  // Load study help stats
  useEffect(() => {
    if (user?.id) {
      const stats = flashcardGeneratorService.getStats(user.id);
      setFlashcardStats(stats);
      
      const qStats = dynamicQuizGenerator.getQuizStats(user.id);
      setQuizStats(qStats);
    }
  }, [user?.id, activeTab]);

  // Load progress profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id || activeTab !== 'progress') return;
      try {
        const profile = await learnerPedagogicalProfileService.getProfile(user.id);
        setPedagogicalProfile(profile);
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    loadProfile();
  }, [user?.id, activeTab]);

  // Track dashboard activity
  useEffect(() => {
    if (user?.id) {
      dashboardContextService.trackDashboardActivity(user.id, {
        activityType: 'dashboard_view',
        sessionId: `mobile_${Date.now()}`,
        availableCourses: courses.map(c => c.title)
      });
    }
  }, [user?.id, courses]);

  // ===== ACTIONS =====
  const handleCreateCourse = async () => {
    if (!newCourseTopic.trim()) return;

    const courseId = `custom-${Date.now()}`;
    const newCourse: GenerativeLearningModuleData = {
      id: courseId,
      title: newCourseTopic,
      description: newCourseDescription || `Learn ${newCourseTopic} with AI-powered personalized instruction.`,
      category: 'Custom',
      difficulty: newCourseDifficulty,
      type: 'generative',
      subject: newCourseTopic,
      topics: [],
      thumbnail: getCourseImage(newCourseTopic),
      estimatedMinutes: 30,
      learningObjectives: [
        `Understand the fundamentals of ${newCourseTopic}`,
        `Apply ${newCourseTopic} concepts in practical scenarios`,
        `Build confidence through progressive learning`
      ]
    };

    // Save to state
    setCourses(prev => [...prev, newCourse]);
    
    // Save to database
    if (user?.id) {
      await courseStorageService.saveCourse(user.id, newCourse);
    }

    // Reset modal
    setShowCreateCourse(false);
    setNewCourseTopic('');
    setNewCourseDescription('');
    setNewCourseDifficulty('beginner');

    // Open the new course
    setActiveModule(newCourse);
  };

  const handleOpenCourse = (course: GenerativeLearningModuleData) => {
    setActiveModule(course);
    
    if (user?.id) {
      dashboardContextService.trackDashboardActivity(user.id, {
        activityType: 'module_start',
        moduleId: course.id,
        moduleName: course.title,
        moduleCategory: course.category
      });
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Delete this course and all progress?')) return;
    
    setCourses(prev => prev.filter(c => c.id !== courseId));
    localStorage.removeItem(`course_progress_${courseId}`);
    
    if (user?.id) {
      await courseStorageService.deleteCourse(user.id, courseId);
    }
  };

  const toggleBookmark = (courseId: string) => {
    setBookmarkedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      localStorage.setItem('neuraplay_bookmarked_modules', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const hasSavedProgress = (moduleId: string): boolean => {
    try {
      const saved = localStorage.getItem(`course_progress_${moduleId}`);
      if (saved) {
        const data = JSON.parse(saved);
        return data.generatedCourse && data.currentSectionIndex !== undefined;
      }
    } catch {}
    return false;
  };

  // ===== HELPERS =====
  const getCourseImage = (topic: string): string => {
    const t = topic.toLowerCase();
    if (t.includes('arabic') || t.includes('language')) return 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=300&fit=crop';
    if (t.includes('python') || t.includes('programming') || t.includes('code')) return 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=400&h=300&fit=crop';
    if (t.includes('math') || t.includes('science')) return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop';
    if (t.includes('music')) return 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=300&fit=crop';
    if (t.includes('art') || t.includes('design')) return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=300&fit=crop';
    return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop';
  };

  // ===== TAB NAVIGATION =====
  const tabs: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'study-help', label: 'Study', icon: Lightbulb },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'bookmarks', label: 'Saved', icon: Bookmark },
  ];

  // ===== RENDER LIBRARY TAB =====
  const renderLibrary = () => (
    <div className="space-y-4">
      {/* Create Course Card */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setShowCreateCourse(true)}
        className={`w-full p-5 rounded-2xl border-2 border-dashed transition-all ${
          isDarkMode 
            ? 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10' 
            : 'border-purple-200 bg-purple-50/50 hover:bg-purple-100/50'
        }`}
      >
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
          }`}>
            <Plus className="w-6 h-6 text-purple-500" />
          </div>
          <div className="text-left">
            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
              Create Custom Course
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Learn anything with AI-powered lessons
            </p>
          </div>
        </div>
      </motion.button>

      {/* Course List */}
      {courses.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No courses yet</p>
          <p className="text-sm">Create your first AI-powered course above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-2xl overflow-hidden ${
                isDarkMode 
                  ? 'bg-stone-800/50 border border-stone-700/50' 
                  : 'bg-white border border-stone-200'
              }`}
            >
              <button
                onClick={() => handleOpenCourse(course)}
                className="w-full text-left"
              >
                <div className="flex">
                  {/* Thumbnail */}
                  <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-l-xl">
                    <img 
                      src={course.thumbnail || '/assets/images/Neuraplaybrain.png'} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                      loading="eager"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/images/Neuraplaybrain.png';
                      }}
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <h3 className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                          {course.title}
                        </h3>
                        <p className={`text-xs mt-1 line-clamp-2 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                          {course.description}
                        </p>
                      </div>
                      <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`} />
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-2">
                      {hasSavedProgress(course.id) && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                          In Progress
                        </span>
                      )}
                      <span className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>
                        {course.estimatedMinutes}min
                      </span>
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Actions */}
              <div className={`flex border-t ${isDarkMode ? 'border-stone-700/50' : 'border-stone-100'}`}>
                <button
                  onClick={() => toggleBookmark(course.id)}
                  className={`flex-1 py-2 text-xs font-medium ${
                    bookmarkedIds.has(course.id)
                      ? 'text-purple-500'
                      : isDarkMode ? 'text-stone-400 hover:text-stone-300' : 'text-stone-500 hover:text-stone-600'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 mx-auto ${bookmarkedIds.has(course.id) ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => handleDeleteCourse(course.id)}
                  className={`flex-1 py-2 text-xs font-medium ${
                    isDarkMode ? 'text-stone-400 hover:text-red-400' : 'text-stone-500 hover:text-red-500'
                  }`}
                >
                  <X className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // ===== RENDER STUDY HELP TAB =====
  const renderStudyHelp = () => (
    <div className="space-y-4">
      {/* Flashcard Stats */}
      <div className={`p-5 rounded-2xl ${
        isDarkMode ? 'bg-stone-800/50 border border-stone-700/50' : 'bg-white border border-stone-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
            }`}>
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                Flashcards
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                Spaced repetition
              </p>
            </div>
          </div>
          {flashcardStats && flashcardStats.dueToday > 0 && (
            <button
              onClick={() => setShowFlashcardStudy(true)}
              className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-xl"
            >
              Review ({flashcardStats.dueToday})
            </button>
          )}
        </div>

        {flashcardStats && (
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-stone-700/50' : 'bg-stone-50'}`}>
              <p className="text-xl font-bold text-purple-500">{flashcardStats.totalCards}</p>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Cards</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-stone-700/50' : 'bg-stone-50'}`}>
              <p className="text-xl font-bold text-amber-500">{flashcardStats.dueToday}</p>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Due</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-stone-700/50' : 'bg-stone-50'}`}>
              <p className="text-xl font-bold text-green-500">{flashcardStats.averageRetention}%</p>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Retention</p>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Quiz */}
      <div className={`p-5 rounded-2xl ${
        isDarkMode ? 'bg-stone-800/50 border border-stone-700/50' : 'bg-white border border-stone-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                Daily Quiz
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                {quizStats?.streakDays || 0} day streak
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDynamicQuiz(true)}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl"
          >
            Start
          </button>
        </div>
      </div>

      {/* Empty State */}
      {(!flashcardStats || flashcardStats.totalCards === 0) && (
        <div className={`text-center py-8 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
          <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Flashcards are created automatically when you miss quiz questions</p>
        </div>
      )}
    </div>
  );

  // ===== RENDER PROGRESS TAB =====
  const renderProgress = () => (
    <div className="space-y-4">
      {pedagogicalProfile ? (
        <>
          {/* Overall Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-4 rounded-2xl text-center ${
              isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'
            }`}>
              <Trophy className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-lg font-bold text-green-500">{pedagogicalProfile.masteredCount}</p>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Mastered</p>
            </div>
            <div className={`p-4 rounded-2xl text-center ${
              isDarkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'
            }`}>
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-lg font-bold text-purple-500">{pedagogicalProfile.overallMastery}%</p>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Mastery</p>
            </div>
            <div className={`p-4 rounded-2xl text-center ${
              isDarkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
            }`}>
              <Zap className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              <p className="text-lg font-bold text-amber-500">{pedagogicalProfile.reviewStreak}</p>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Streak</p>
            </div>
          </div>

          {/* Competencies */}
          {pedagogicalProfile.competencies.length > 0 && (
            <div className={`p-5 rounded-2xl ${
              isDarkMode ? 'bg-stone-800/50 border border-stone-700/50' : 'bg-white border border-stone-200'
            }`}>
              <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                Skills
              </h3>
              <div className="space-y-3">
                {pedagogicalProfile.competencies.slice(0, 5).map((comp) => (
                  <div key={comp.competencyId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm capitalize ${isDarkMode ? 'text-stone-300' : 'text-stone-600'}`}>
                        {comp.competencyName}
                      </span>
                      <span className={`text-sm font-medium ${
                        comp.currentLevel >= 70 ? 'text-green-500' :
                        comp.currentLevel >= 40 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {comp.currentLevel}%
                      </span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-stone-700' : 'bg-stone-200'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          comp.currentLevel >= 70 ? 'bg-green-500' :
                          comp.currentLevel >= 40 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${comp.currentLevel}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Action */}
          {pedagogicalProfile.nextAction && (
            <div className={`p-4 rounded-2xl ${
              isDarkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'
            }`}>
              <div className="flex items-start space-x-3">
                <Lightbulb className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    Recommended
                  </p>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-600'}`}>
                    {pedagogicalProfile.nextAction}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 🎯 FIX: Add Daily Review Quiz section (same as desktop) */}
          <div className={`p-5 rounded-2xl ${
            isDarkMode ? 'bg-stone-800/50 border border-stone-700/50' : 'bg-white border border-stone-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                    Daily Review Quiz
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                    Personalized questions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDynamicQuiz(true)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-xl"
              >
                Start
              </button>
            </div>
            
            {/* Quiz Stats */}
            {quizStats && (
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2 rounded-xl text-center ${isDarkMode ? 'bg-stone-900/50' : 'bg-stone-100'}`}>
                  <p className="text-lg font-bold text-orange-500">{quizStats.streakDays || 0}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>Streak</p>
                </div>
                <div className={`p-2 rounded-xl text-center ${isDarkMode ? 'bg-stone-900/50' : 'bg-stone-100'}`}>
                  <p className="text-lg font-bold text-blue-500">{quizStats.averageScore || 0}%</p>
                  <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>Avg</p>
                </div>
                <div className={`p-2 rounded-xl text-center ${isDarkMode ? 'bg-stone-900/50' : 'bg-stone-100'}`}>
                  <p className="text-lg font-bold text-green-500">{quizStats.conceptsReviewed || 0}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>Topics</p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={`text-center py-12 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No progress data</p>
          <p className="text-sm">Complete some lessons to see your progress</p>
        </div>
      )}
    </div>
  );

  // ===== RENDER BOOKMARKS TAB =====
  const renderBookmarks = () => {
    const bookmarkedCourses = courses.filter(c => bookmarkedIds.has(c.id));
    
    return (
      <div className="space-y-3">
        {bookmarkedCourses.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
            <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No bookmarks</p>
            <p className="text-sm">Tap the bookmark icon on courses to save them</p>
          </div>
        ) : (
          bookmarkedCourses.map((course, index) => (
            <motion.button
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleOpenCourse(course)}
              className={`w-full p-4 rounded-2xl flex items-center space-x-4 text-left ${
                isDarkMode 
                  ? 'bg-stone-800/50 border border-stone-700/50' 
                  : 'bg-white border border-stone-200'
              }`}
            >
              <img 
                src={course.thumbnail || '/assets/images/Neuraplaybrain.png'} 
                alt={course.title}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                loading="eager"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/images/Neuraplaybrain.png';
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                  {course.title}
                </h3>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                  {course.estimatedMinutes}min • {course.category}
                </p>
              </div>
              <ChevronRight className={`w-5 h-5 ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`} />
            </motion.button>
          ))
        )}
      </div>
    );
  };

  // ===== MAIN RENDER =====
  return (
    <div className={`h-full flex flex-col relative overflow-hidden ${isDarkMode ? 'bg-stone-900' : 'bg-gradient-to-br from-purple-50/50 to-white'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-stone-700/50' : 'border-stone-200/50'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
          }`}>
            <GraduationCap className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
              Learning Central
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Your personal learning hub
            </p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className={`flex px-2 py-2 ${isDarkMode ? 'bg-stone-800/50' : 'bg-stone-50'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium transition-all ${
              activeTab === tab.id
                ? isDarkMode 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'bg-purple-100 text-purple-600'
                : isDarkMode 
                  ? 'text-stone-400 hover:text-stone-300' 
                  : 'text-stone-500 hover:text-stone-600'
            }`}
          >
            <tab.icon className="w-5 h-5 mx-auto mb-1" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'library' && renderLibrary()}
            {activeTab === 'study-help' && renderStudyHelp()}
            {activeTab === 'progress' && renderProgress()}
            {activeTab === 'bookmarks' && renderBookmarks()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Create Course Modal - Contained within Dashboard pane */}
      <AnimatePresence>
        {showCreateCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`w-full max-w-lg rounded-t-3xl ${
                isDarkMode ? 'bg-stone-800' : 'bg-white'
              } p-6 pb-8`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                  Create Course
                </h2>
                <button onClick={() => setShowCreateCourse(false)}>
                  <X className={`w-6 h-6 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    What do you want to learn?
                  </label>
                  <input
                    type="text"
                    value={newCourseTopic}
                    onChange={(e) => setNewCourseTopic(e.target.value)}
                    placeholder="e.g., Python, Spanish, Photography..."
                    className={`w-full px-4 py-3 rounded-xl border ${
                      isDarkMode 
                        ? 'bg-stone-700 border-stone-600 text-white placeholder-stone-400' 
                        : 'bg-stone-50 border-stone-200 text-stone-800 placeholder-stone-400'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Focus areas (optional)
                  </label>
                  <textarea
                    value={newCourseDescription}
                    onChange={(e) => setNewCourseDescription(e.target.value)}
                    placeholder="Specific topics or goals..."
                    rows={2}
                    className={`w-full px-4 py-3 rounded-xl border resize-none ${
                      isDarkMode 
                        ? 'bg-stone-700 border-stone-600 text-white placeholder-stone-400' 
                        : 'bg-stone-50 border-stone-200 text-stone-800 placeholder-stone-400'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Experience level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setNewCourseDifficulty(level)}
                        className={`py-2 rounded-xl text-sm font-medium transition-all ${
                          newCourseDifficulty === level
                            ? 'bg-purple-500 text-white'
                            : isDarkMode 
                              ? 'bg-stone-700 text-stone-300 border border-stone-600' 
                              : 'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreateCourse}
                  disabled={!newCourseTopic.trim()}
                  className={`w-full py-3 rounded-xl font-medium transition-all disabled:opacity-40 ${
                    isDarkMode 
                      ? 'bg-purple-500 text-white hover:bg-purple-600' 
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
                >
                  <Sparkles className="w-5 h-5 inline mr-2" />
                  Create Course
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generative Learning Module Overlay - CONTAINED in Dashboard pane */}
      {activeModule && (
        <React.Suspense fallback={
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        }>
          {/* Contained within dashboard pane - uses absolute, not fixed */}
          <div className="absolute inset-0 z-[100] overflow-hidden">
            <GenerativeLearningModule
              module={activeModule}
              onClose={() => setActiveModule(null)}
            />
          </div>
        </React.Suspense>
      )}

      {/* Flashcard Study Overlay - CONTAINED in Dashboard pane */}
      {showFlashcardStudy && user && (
        <React.Suspense fallback={null}>
          <div className="absolute inset-0 z-[100] overflow-hidden">
            <FlashcardStudyComponent
              userId={user.id}
              onClose={() => {
                setShowFlashcardStudy(false);
                const newStats = flashcardGeneratorService.getStats(user.id);
                setFlashcardStats(newStats);
              }}
            />
          </div>
        </React.Suspense>
      )}

      {/* Dynamic Quiz Overlay - CONTAINED in Dashboard pane */}
      {showDynamicQuiz && user && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm overflow-hidden">
          <React.Suspense fallback={null}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full h-full max-h-[95vh] overflow-y-auto rounded-2xl"
            >
              <DynamicQuizWidget
                userId={user.id}
                isDarkMode={isDarkMode}
                onClose={() => {
                  setShowDynamicQuiz(false);
                  const newStats = dynamicQuizGenerator.getQuizStats(user.id);
                  setQuizStats(newStats);
                }}
              />
            </motion.div>
          </React.Suspense>
        </div>
      )}
    </div>
  );
};

export default MobileDashboard;

