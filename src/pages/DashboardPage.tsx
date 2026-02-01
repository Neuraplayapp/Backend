import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { isRegistrationEnabled } from '../config/features';
import { dataCollectionService } from '../services/DataCollectionService';
import { dashboardContextService } from '../services/DashboardContextService';
import { 
  BookOpen, 
  Brain, 
  Target, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Star, 
  Trophy, 
  Users, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Bookmark,
  Share2,
  Download,
  Eye,
  Heart,
  MessageCircle,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Award,
  Crown,
  Lightbulb,
  GraduationCap,
  Library,
  Notebook,
  Video,
  Headphones,
  FileText,
  Image,
  Code,
  Palette,
  Calculator,
  Globe,
  Map,
  Music,
  Camera,
  Gamepad2,
  Puzzle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Home,
  Settings,
  Bell,
  User,
  LogOut,
  X,
  CheckSquare,
  AlertTriangle,
  AlertCircle,
  Wand2
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import TaskManager from '../components/TaskManager';
import StudyCalendar from '../components/StudyCalendar';
import Diary from '../components/Diary';
import TeachersRoom from '../components/TeachersRoom';
import GenerativeLearningModule from '../components/GenerativeLearningModule';
import FlashcardStudyComponent from '../components/FlashcardStudyComponent';
import DynamicQuizWidget from '../components/DynamicQuizWidget';
import type { GenerativeLearningModuleData } from '../types/LearningModule.types';
import { learnerPedagogicalProfileService, type LearnerPedagogicalProfile } from '../services/LearnerPedagogicalProfile';
import { flashcardGeneratorService, type FlashcardStats } from '../services/FlashcardGeneratorService';
import { dynamicQuizGenerator } from '../services/DynamicQuizGenerator';
import { chunkActivityTracker } from '../services/ChunkActivityTracker';
import CompetencyHelpModal from '../components/CompetencyHelpModal';
import { courseStorageService } from '../services/CourseStorageService';



interface LearningModule {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  progress: number;
  isBookmarked: boolean;
  isCompleted: boolean;
  thumbnail: string;
  type: 'video' | 'interactive' | 'reading' | 'quiz' | 'game' | 'generative';
  skills: string[];
  rating: number;
  instructor: string;
  lastAccessed?: Date;
  // For generative modules
  subject?: string;
  topics?: string[];
  learningObjectives?: string[];
  // Mark custom courses for special handling
  isCustomCourse?: boolean;
  // System context for LLM guidance - directs generation while keeping it dynamic
  systemContext?: {
    focusAreas?: string[];
    teachingApproach?: string;
    culturalContext?: string;
    specialInstructions?: string;
  };
}

interface StudySession {
  id: string;
  moduleId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  progress: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useUser();
  const { isDarkMode, isBrightMode, isDarkGradient, isWhitePurpleGradient } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [currentModule, setCurrentModule] = useState<LearningModule | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const [showTeachersRoom, setShowTeachersRoom] = useState(false);
  const [activeGenerativeModule, setActiveGenerativeModule] = useState<GenerativeLearningModuleData | null>(null);
  
  // 🎓 Pedagogical Profile State
  const [pedagogicalProfile, setPedagogicalProfile] = useState<LearnerPedagogicalProfile | null>(null);
  const [selectedCompetency, setSelectedCompetency] = useState<{ name: string; level: number } | null>(null);
  
  // 🎴 Flashcard Study Help State
  const [showFlashcardStudy, setShowFlashcardStudy] = useState(false);
  const [flashcardStats, setFlashcardStats] = useState<FlashcardStats | null>(null);
  
  // 🎯 Dynamic Quiz Widget State
  const [showDynamicQuiz, setShowDynamicQuiz] = useState(false);
  const [dynamicQuizStats, setDynamicQuizStats] = useState<any>(null);
  
  // Custom course creation state
  const [showCustomCourseModal, setShowCustomCourseModal] = useState(false);
  const [customCourseTopic, setCustomCourseTopic] = useState('');
  const [customCourseDescription, setCustomCourseDescription] = useState('');
  const [customCourseDifficulty, setCustomCourseDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  
  // Saved custom courses - persisted to DATABASE (with localStorage cache)
  const [savedCustomCourses, setSavedCustomCourses] = useState<GenerativeLearningModuleData[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);

  // 📚 Load courses from DATABASE when user logs in
  useEffect(() => {
    const loadCoursesFromDB = async () => {
      if (!user?.id) {
        // No user - try localStorage only
        try {
          const saved = localStorage.getItem('neuraplay_custom_courses');
          if (saved) {
            const parsed = JSON.parse(saved);
            setSavedCustomCourses(parsed);
            setCoursesLoaded(true); // 🎯 FIX: Mark as loaded even without user
            console.log(`📚 DashboardPage: Loaded ${parsed.length} courses from localStorage (no user)`);
          }
        } catch {}
        return;
      }

      try {
        console.log('📚 DashboardPage: Loading courses from database...');
        const courses = await courseStorageService.loadCourses(user.id);
        
        // 🎯 DEBUG: Log course details to identify persistence issues
        courses.forEach((c: any, i: number) => {
          const hasContent = !!(c.generatedCourse?.sections?.length);
          console.log(`📚 Course ${i}: "${c.title}" | category="${c.category}" | hasContent=${hasContent} | sections=${c.generatedCourse?.sections?.length || 0}`);
        });
        
        setSavedCustomCourses(courses);
        setCoursesLoaded(true);
        console.log(`✅ DashboardPage: Loaded ${courses.length} courses from DB`);
        
        // If we have local courses that weren't synced, sync them now
        const localCourses = localStorage.getItem('neuraplay_custom_courses');
        if (localCourses) {
          const parsed = JSON.parse(localCourses);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Find courses in localStorage that aren't in DB
            const dbIds = new Set(courses.map(c => c.id));
            const unsynced = parsed.filter((c: GenerativeLearningModuleData) => !dbIds.has(c.id));
            
            if (unsynced.length > 0) {
              console.log(`📤 DashboardPage: Syncing ${unsynced.length} local courses to DB`);
              for (const course of unsynced) {
                await courseStorageService.saveCourse(user.id, course);
              }
              // Reload to get the merged list
              const updatedCourses = await courseStorageService.loadCourses(user.id);
              setSavedCustomCourses(updatedCourses);
            }
          }
        }
      } catch (error) {
        console.error('❌ DashboardPage: Failed to load courses from DB:', error);
        // Fallback to localStorage
        try {
          const saved = localStorage.getItem('neuraplay_custom_courses');
          if (saved) {
            const parsed = JSON.parse(saved);
            setSavedCustomCourses(parsed);
            setCoursesLoaded(true); // 🎯 FIX: Mark as loaded even on fallback
            console.log(`📚 DashboardPage: Loaded ${parsed.length} courses from localStorage fallback`);
          }
        } catch {}
      }
    };

    loadCoursesFromDB();
  }, [user?.id]);

  // Persist custom courses to localStorage (cache) AND database
  useEffect(() => {
    if (!coursesLoaded && savedCustomCourses.length === 0) return; // Don't save empty on initial load
    
    // Update localStorage cache (with quota protection)
    try {
      localStorage.setItem('neuraplay_custom_courses', JSON.stringify(savedCustomCourses));
    } catch (e) {
      // Quota exceeded - database is primary storage, localStorage is just cache
      console.warn('⚠️ localStorage quota exceeded for courses cache (DB is primary, this is OK)');
    }
  }, [savedCustomCourses, coursesLoaded]);

  // 🎯 Handle openCourse query parameter for AI navigation
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const openCourse = searchParams.get('openCourse');
    if (openCourse && savedCustomCourses.length > 0) {
      console.log('📚 DashboardPage: Opening course from URL:', openCourse);
      
      // Find course by name (case-insensitive, partial match)
      const courseLower = openCourse.toLowerCase();
      const matchingCourse = savedCustomCourses.find(
        course => 
          course.title.toLowerCase() === courseLower ||
          course.title.toLowerCase().includes(courseLower) ||
          courseLower.includes(course.title.toLowerCase())
      );
      
      if (matchingCourse) {
        console.log('✅ DashboardPage: Found matching course:', matchingCourse.title);
        setActiveGenerativeModule(matchingCourse);
        // Clear the query param to prevent re-opening on refresh
        setSearchParams({}, { replace: true });
      } else {
        console.log('⚠️ DashboardPage: No matching course found for:', openCourse);
      }
    }
  }, [searchParams, savedCustomCourses, setSearchParams]);

  // 🎓 Load pedagogical profile
  useEffect(() => {
    if (user?.id && activeTab === 'progress') {
      loadPedagogicalProfile();
    }
  }, [user?.id, activeTab]);

  // 🎴 Load flashcard stats
  useEffect(() => {
    if (user?.id) {
      const stats = flashcardGeneratorService.getStats(user.id);
      setFlashcardStats(stats);
      
      // 🎯 Load dynamic quiz stats
      const quizStats = dynamicQuizGenerator.getQuizStats(user.id);
      setDynamicQuizStats(quizStats);
    }
  }, [user?.id, activeTab, showFlashcardStudy, showDynamicQuiz]);

  const loadPedagogicalProfile = async () => {
    if (!user?.id) return;
    try {
      const profile = await learnerPedagogicalProfileService.getProfile(user.id);
      setPedagogicalProfile(profile);
    } catch (error) {
      console.error('Failed to load pedagogical profile:', error);
    }
  };

  // Get dynamic course image based on topic keywords
  const getCourseImage = (topic: string): string => {
    const topicLower = topic.toLowerCase();
    
    // Language courses
    if (topicLower.includes('arabic') || topicLower.includes('language') || topicLower.includes('spanish') || 
        topicLower.includes('french') || topicLower.includes('german') || topicLower.includes('japanese') ||
        topicLower.includes('chinese') || topicLower.includes('korean')) {
      return 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=300&fit=crop';
    }
    // Programming/Tech
    if (topicLower.includes('python') || topicLower.includes('programming') || topicLower.includes('coding') ||
        topicLower.includes('javascript') || topicLower.includes('software') || topicLower.includes('web') ||
        topicLower.includes('api') || topicLower.includes('ai') || topicLower.includes('machine learning')) {
      return 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=400&h=300&fit=crop';
    }
    // Math/Science
    if (topicLower.includes('math') || topicLower.includes('calculus') || topicLower.includes('algebra') ||
        topicLower.includes('physics') || topicLower.includes('chemistry') || topicLower.includes('biology')) {
      return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop';
    }
    // Music
    if (topicLower.includes('music') || topicLower.includes('guitar') || topicLower.includes('piano') ||
        topicLower.includes('violin') || topicLower.includes('singing')) {
      return 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=300&fit=crop';
    }
    // Art/Design
    if (topicLower.includes('art') || topicLower.includes('design') || topicLower.includes('drawing') ||
        topicLower.includes('painting') || topicLower.includes('photography')) {
      return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=300&fit=crop';
    }
    // Business/Finance
    if (topicLower.includes('business') || topicLower.includes('finance') || topicLower.includes('marketing') ||
        topicLower.includes('economics') || topicLower.includes('investing')) {
      return 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop';
    }
    // Health/Fitness
    if (topicLower.includes('health') || topicLower.includes('fitness') || topicLower.includes('nutrition') ||
        topicLower.includes('yoga') || topicLower.includes('meditation')) {
      return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop';
    }
    // History/Social Sciences
    if (topicLower.includes('history') || topicLower.includes('psychology') || topicLower.includes('philosophy') ||
        topicLower.includes('sociology') || topicLower.includes('politics')) {
      return 'https://images.unsplash.com/photo-1461360370896-922624d12a74?w=400&h=300&fit=crop';
    }
    // Writing/Literature
    if (topicLower.includes('writing') || topicLower.includes('literature') || topicLower.includes('poetry') ||
        topicLower.includes('creative') || topicLower.includes('storytelling')) {
      return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=300&fit=crop';
    }
    // Cooking/Culinary
    if (topicLower.includes('cooking') || topicLower.includes('culinary') || topicLower.includes('baking') ||
        topicLower.includes('recipe') || topicLower.includes('cuisine')) {
      return 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop';
    }
    
    // Default - education/learning themed
    return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop';
  };

  // Get category based on topic keywords
  const getCourseCategory = (topic: string): string => {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('arabic') || topicLower.includes('language') || topicLower.includes('spanish') ||
        topicLower.includes('french') || topicLower.includes('german')) return 'Language';
    if (topicLower.includes('python') || topicLower.includes('programming') || topicLower.includes('coding') ||
        topicLower.includes('javascript') || topicLower.includes('api')) return 'Technology';
    if (topicLower.includes('math') || topicLower.includes('physics') || topicLower.includes('chemistry')) return 'Science';
    if (topicLower.includes('music') || topicLower.includes('guitar') || topicLower.includes('piano')) return 'Music';
    if (topicLower.includes('art') || topicLower.includes('design') || topicLower.includes('drawing')) return 'Art';
    if (topicLower.includes('business') || topicLower.includes('finance') || topicLower.includes('marketing')) return 'Business';
    if (topicLower.includes('health') || topicLower.includes('fitness') || topicLower.includes('nutrition')) return 'Health';
    if (topicLower.includes('memory') || topicLower.includes('focus') || topicLower.includes('brain')) return 'Memory';
    
    return 'Custom';
  };

  // Check if a course has saved progress
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

  // Create custom course from user input
  const handleCreateCustomCourse = () => {
    if (!customCourseTopic.trim()) return;
    
    // 🔍 Check if a course with this topic already exists
    const normalizedTopic = customCourseTopic.trim().toLowerCase();
    const existingCourse = savedCustomCourses.find(
      course => course.title.toLowerCase() === normalizedTopic
    );
    
    // If course exists, just open it instead of creating a duplicate
    if (existingCourse) {
      console.log('📚 Reopening existing course:', existingCourse.title);
      setActiveGenerativeModule(existingCourse);
      setShowCustomCourseModal(false);
      return;
    }
    
    const courseId = `custom-${Date.now()}`;
    const thumbnail = getCourseImage(customCourseTopic);
    const category = getCourseCategory(customCourseTopic);
    
    const customModule: GenerativeLearningModuleData = {
      id: courseId,
      title: customCourseTopic,
      description: customCourseDescription || `Learn ${customCourseTopic} with AI-powered personalized instruction.`,
      category,
      difficulty: customCourseDifficulty.toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
      type: 'generative',
      subject: customCourseTopic,
      topics: [],
      thumbnail,
      estimatedMinutes: 30,
      learningObjectives: [
        `Understand the fundamentals of ${customCourseTopic}`,
        `Apply ${customCourseTopic} concepts in practical scenarios`,
        `Build confidence through progressive learning`
      ]
    };
    
    // Save to custom courses list (state + localStorage cache)
    setSavedCustomCourses(prev => [...prev, customModule]);
    
    // 📚 Save to DATABASE for permanent storage
    if (user?.id) {
      courseStorageService.saveCourse(user.id, customModule).then(success => {
        if (success) {
          console.log('✅ Course saved to database:', customModule.id);
        } else {
          console.warn('⚠️ Course saved locally but DB sync failed');
        }
      });
    }
    
    // Open the module
    setActiveGenerativeModule(customModule);
    setShowCustomCourseModal(false);
    setCustomCourseTopic('');
    setCustomCourseDescription('');
    setCustomCourseDifficulty('Beginner');
    
    // Track custom course creation
    if (user?.id) {
      const sessionId = `custom_course_${Date.now()}`;
      dashboardContextService.trackDashboardActivity(user.id, {
        activityType: 'custom_course_created',
        moduleId: customModule.id,
        moduleName: customModule.title,
        moduleCategory: category,
        sessionId,
      });
    }
  };

  // Delete a custom course
  const handleDeleteCustomCourse = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the course
    if (confirm('Are you sure you want to delete this course? This will also delete your progress.')) {
      setSavedCustomCourses(prev => prev.filter(c => c.id !== courseId));
      // Also clean up progress data
      localStorage.removeItem(`course_progress_${courseId}`);
      
      // 📚 Delete from DATABASE
      if (user?.id) {
        courseStorageService.deleteCourse(user.id, courseId).then(success => {
          if (success) {
            console.log('✅ Course deleted from database:', courseId);
          }
        });
      }
    }
  };

  // Bookmarked module IDs - persisted to localStorage
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('neuraplay_bookmarked_modules');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('neuraplay_bookmarked_modules', JSON.stringify(Array.from(bookmarkedIds)));
    } catch (e) {
      console.warn('⚠️ localStorage quota exceeded for bookmarks');
    }
  }, [bookmarkedIds]);

  // 🗄️ DATABASE INTEGRATION: Log dashboard page visit
  useEffect(() => {
    dataCollectionService.logNavigation('dashboard', location.pathname).catch(error => {
      console.error('Failed to log dashboard navigation:', error);
    });

    // 📊 DASHBOARD CONTEXT: Track dashboard activity for AI awareness + available courses
    if (user?.id) {
      // 🎯 FIX: Send FULL course info (with IDs) for AI navigation, not just names
      const courseList = savedCustomCourses.map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        lastAccessed: (c as any).lastAccessed || new Date().toISOString()
      }));
      const courseNames = savedCustomCourses.map(c => c.title);
      console.log('📚 Tracking dashboard with courses:', courseList.map(c => `${c.title} [${c.id.slice(0,8)}]`));
      
      dashboardContextService.trackDashboardActivity(user.id, {
        activityType: 'dashboard_view',
        sessionId: `dashboard_${Date.now()}`,
        availableCourses: courseNames, // Legacy compatibility
        courseList: courseList // 🎯 NEW: Full course info for AI navigation
      });
    }

    // Cleanup on unmount
    return () => {
      if (user?.id) {
        dashboardContextService.markDashboardExit(user.id);
      }
    };
  }, [user?.id]);

  // 📚 RE-TRACK when courses change so AI always knows available courses
  useEffect(() => {
    if (user?.id && savedCustomCourses.length > 0) {
      // 🎯 FIX: Send FULL course info (with IDs) for AI navigation
      const courseList = savedCustomCourses.map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        lastAccessed: (c as any).lastAccessed || new Date().toISOString()
      }));
      const courseNames = savedCustomCourses.map(c => c.title);
      console.log('📚 Courses changed - updating AI context:', courseList.map(c => `${c.title} [${c.id.slice(0,8)}]`));
      dashboardContextService.trackDashboardActivity(user.id, {
        activityType: 'dashboard_view',
        sessionId: `dashboard_${Date.now()}`,
        availableCourses: courseNames, // Legacy compatibility  
        courseList: courseList // 🎯 NEW: Full course info for AI navigation
      });
    }
  }, [user?.id, savedCustomCourses]);

  // Learning modules - Only populated courses with actual generative content
  // The Course Creator card allows dynamic creation of any subject
  const learningModules: LearningModule[] = [
    // Course Creator Card - Special card that opens the custom course modal
    {
      id: 'course-creator',
      title: 'Create Your Own Course',
      description: 'Learn anything you want! Describe what you want to learn and our AI will create a personalized course just for you.',
      category: 'Custom',
      difficulty: 'Beginner',
      duration: '∞',
      progress: 0,
      isBookmarked: false,
      isCompleted: false,
      thumbnail: '/assets/images/Mascot.png',
      type: 'generative',
      skills: ['Any Subject', 'Personalized Learning', 'AI-Powered'],
      rating: 5.0,
      instructor: 'AI Course Generator',
      subject: 'Custom',
      topics: [],
      learningObjectives: [
        'Learn any subject you desire',
        'Get AI-powered personalized instruction',
        'Progress at your own pace'
      ]
    }
  ];

  const categories = ['all', 'Memory', 'Logic', 'Focus', 'Creativity', 'Spatial', 'Language', 'Technology', 'Science', 'Custom'];
  const difficulties = ['all', 'Beginner', 'Intermediate', 'Advanced'];

  // Combine static modules with saved custom courses and add bookmark status
  const allModules: LearningModule[] = [
    // Static modules with bookmark check
    ...learningModules.map(m => ({
      ...m,
      isBookmarked: bookmarkedIds.has(m.id)
    })),
    // Convert saved custom courses to LearningModule format
    ...savedCustomCourses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      difficulty: (course.difficulty.charAt(0).toUpperCase() + course.difficulty.slice(1)) as 'Beginner' | 'Intermediate' | 'Advanced',
      duration: `${course.estimatedMinutes} min`,
      progress: hasSavedProgress(course.id) ? 50 : 0, // Show some progress if saved
      isBookmarked: bookmarkedIds.has(course.id),
      isCompleted: false,
      thumbnail: course.thumbnail,
      type: 'generative' as const,
      skills: course.topics || [],
      rating: 5.0,
      instructor: 'AI-Generated Content',
      subject: course.subject,
      topics: course.topics,
      learningObjectives: course.learningObjectives,
      isCustomCourse: true // Mark as custom for special handling
    } as LearningModule & { isCustomCourse?: boolean }))
  ];

  const filteredModules = allModules
    .filter(module => {
      const matchesSearch = module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           module.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || module.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    })
    // Sort: Course Creator first, then bookmarked, then by lastAccessed
    .sort((a, b) => {
      // Course Creator always first
      if (a.id === 'course-creator') return -1;
      if (b.id === 'course-creator') return 1;
      
      // Bookmarked items come next
      if (a.isBookmarked && !b.isBookmarked) return -1;
      if (!a.isBookmarked && b.isBookmarked) return 1;
      
      // Then by progress (in-progress courses)
      const aHasProgress = hasSavedProgress(a.id);
      const bHasProgress = hasSavedProgress(b.id);
      if (aHasProgress && !bHasProgress) return -1;
      if (!aHasProgress && bHasProgress) return 1;
      
      // Then by lastAccessed date
      if (a.lastAccessed && b.lastAccessed) {
        return b.lastAccessed.getTime() - a.lastAccessed.getTime();
      }
      if (a.lastAccessed) return -1;
      if (b.lastAccessed) return 1;
      
      return 0;
    });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Memory': return <Brain className="w-5 h-5" />;
      case 'Logic': return <Puzzle className="w-5 h-5" />;
      case 'Focus': return <Target className="w-5 h-5" />;
      case 'Creativity': return <Palette className="w-5 h-5" />;
      case 'Spatial': return <Globe className="w-5 h-5" />;
      case 'Language': return <FileText className="w-5 h-5" />;
      default: return <BookOpen className="w-5 h-5" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'interactive': return <Code className="w-4 h-4" />;
      case 'reading': return <FileText className="w-4 h-4" />;
      case 'quiz': return <Calculator className="w-4 h-4" />;
      case 'game': return <Gamepad2 className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-500 bg-green-100';
      case 'Intermediate': return 'text-yellow-500 bg-yellow-100';
      case 'Advanced': return 'text-red-500 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const handleModuleClick = (module: LearningModule) => {
    // Special handling for Course Creator card - opens custom course modal
    if (module.id === 'course-creator') {
      setShowCustomCourseModal(true);
      return;
    }

    // 📊 DASHBOARD CONTEXT: Track module click
    if (user?.id) {
      dashboardContextService.trackDashboardActivity(user.id, {
        activityType: 'module_view',
        moduleId: module.id,
        moduleName: module.title,
        moduleCategory: module.category,
        sessionId: `dashboard_${Date.now()}`,
      });
    }

    // Check if module is generative type
    if (module.type === 'generative') {
      // 🎯 CRITICAL FIX: Check if this is a saved custom course with generated content
      // Check BOTH generatedCourse property AND hasGeneratedContent flag (for metadata-only loads)
      const savedCourse = savedCustomCourses.find(c => c.id === module.id);
      
      // Course has content if: has generatedCourse OR has hasGeneratedContent flag (from DB metadata)
      const hasContent = savedCourse && (
        savedCourse.generatedCourse || 
        savedCourse.hasGeneratedContent === true
      );
      
      if (hasContent) {
        // This is a saved course with content - pass it directly (will lazy load if needed)
        console.log('📚 Opening saved course:', savedCourse!.id, { 
          hasGeneratedCourse: !!savedCourse.generatedCourse,
          hasGeneratedContent: savedCourse.hasGeneratedContent
        });
        setActiveGenerativeModule(savedCourse!);
      } else {
        // Convert to GenerativeLearningModuleData format with systemContext
        const generativeModule: GenerativeLearningModuleData = {
          id: module.id,
          title: module.title,
          description: module.description,
          category: module.category,
          difficulty: module.difficulty.toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
          type: 'generative',
          subject: module.subject || module.title,
          topics: module.topics || [],
          thumbnail: module.thumbnail,
          estimatedMinutes: parseInt(module.duration) || 30,
          learningObjectives: module.learningObjectives || [],
          // Pass systemContext to guide LLM generation while keeping it dynamic
          systemContext: module.systemContext
        };
        setActiveGenerativeModule(generativeModule);
      }

      // Track module start
      if (user?.id) {
        dashboardContextService.trackDashboardActivity(user.id, {
          activityType: 'module_start',
          moduleId: module.id,
          moduleName: module.title,
          moduleCategory: module.category,
          sessionId: `dashboard_${Date.now()}`,
        });
      }
    } else {
      // Regular media player for video/audio modules
      setCurrentModule(module);
      setIsPlaying(true);
      setCurrentTime(0);
      setTotalTime(parseInt(module.duration) * 60); // Convert minutes to seconds
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleBookmark = (moduleId: string) => {
    setBookmarkedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
        console.log('🔖 Removed bookmark for:', moduleId);
      } else {
        newSet.add(moduleId);
        console.log('🔖 Added bookmark for:', moduleId);
      }
      return newSet;
    });
  };

  const handleUserClick = () => {
    if (user) {
                      navigate(`/profile`);
    }
  };

  const progressPercentage = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  // Get theme-appropriate background classes
  const getBackgroundClasses = () => {
    if (isDarkGradient) {
      return "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900";
    } else if (isWhitePurpleGradient) {
      return "min-h-screen bg-gradient-to-br from-white via-purple-50 to-indigo-50";
    } else if (isBrightMode) {
      return "min-h-screen bg-white";
    } else if (isDarkMode) {
      return "min-h-screen bg-gray-900";
    } else {
      return "min-h-screen bg-white";
    }
  };

  // Get theme-appropriate card background classes
  const getCardBackgroundClasses = () => {
    if (isDarkMode || isDarkGradient) {
      return "backdrop-blur-md border border-white/10 theme-card";
    } else if (isBrightMode) {
      return "backdrop-blur-md border border-gray-200 theme-card";
    } else {
      return "backdrop-blur-md border border-gray-200 theme-card";
    }
  };

  // Get theme-appropriate text classes
  const getTextClasses = (type: 'primary' | 'secondary' | 'tertiary' = 'primary') => {
    if (isDarkMode || isDarkGradient) {
      switch (type) {
        case 'primary': return 'text-white';
        case 'secondary': return 'text-gray-300';
        case 'tertiary': return 'text-gray-400';
        default: return 'text-white';
      }
    } else {
      switch (type) {
        case 'primary': return 'text-gray-900';
        case 'secondary': return 'text-gray-700';
        case 'tertiary': return 'text-gray-600';
        default: return 'text-gray-900';
      }
    }
  };

  // Get theme-appropriate input classes
  const getInputClasses = () => {
    if (isDarkMode || isDarkGradient) {
      return "w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500";
    } else {
      return "w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500";
    }
  };

  // Get theme-appropriate select classes
  const getSelectClasses = () => {
    if (isDarkMode || isDarkGradient) {
      return "px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
    } else {
      return "px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500";
    }
  };

  // Show login prompt if user is not logged in
  if (!user) {
    return (
      <div className={`${getBackgroundClasses()} flex items-center justify-center`}>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/assets/images/Mascot.png" 
              alt="NeuraPlay Mascot" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to NeuraPlay!</h1>
          <p className={`text-lg mb-8 ${isDarkMode ? 'text-gray-300' : 'text-black'}`}>
            Please log in to access your personalized learning dashboard and track your progress.
          </p>
          <div className="space-y-4">
            <Link 
              to="/forum-registration" 
              className="inline-block w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-8 py-4 rounded-full hover:from-violet-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Create Account
            </Link>
            <Link 
              to="/login" 
              className="inline-block w-full bg-transparent border-2 border-white/20 text-white font-bold px-8 py-4 rounded-full hover:bg-white/10 transition-all duration-300"
            >
              Log In
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-6">
            Join thousands of learners discovering the joy of cognitive development!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${getBackgroundClasses()} relative min-h-screen`}>
      {/* Header */}
      <div className={`${isDarkMode || isDarkGradient ? 'bg-black/20 backdrop-blur-md border-b border-white/10' : 'bg-white/80 backdrop-blur-md border-b border-gray-200'} ${isBrightMode ? 'bg-white/90' : ''}`}>
      <div className="container mx-auto px-6 pt-24 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Library className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode || isDarkGradient ? 'text-white' : 'text-gray-900'}`}>Learning Central</h1>
                <p className={`text-sm ${isDarkMode || isDarkGradient ? 'text-gray-300' : 'text-gray-600'}`}>Your personal learning library</p>
              </div>
            </div>
            {/* Removed lower DemoUser avatar and name */}
          </div>
                </div>
              </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className={`${isDarkMode || isDarkGradient ? 'bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10' : 'bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-gray-200'} ${isBrightMode ? 'bg-white/90' : ''}`}>
              <nav className="space-y-2">
                {[
                  { id: 'library', label: 'Library', icon: <BookOpen className="w-5 h-5" /> },
                  { id: 'study-help', label: 'Study Help', icon: <Lightbulb className="w-5 h-5" />, badge: flashcardStats?.dueToday },
                  { id: 'progress', label: 'Progress', icon: <TrendingUp className="w-5 h-5" /> },
                  { id: 'bookmarks', label: 'Bookmarks', icon: <Bookmark className="w-5 h-5" /> },
                  { id: 'diary', label: 'Diary', icon: <BookOpen className="w-5 h-5" /> },
                  { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
                  { id: 'stats', label: 'Statistics', icon: <BarChart3 className="w-5 h-5" /> },
                  { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" /> },
                  { id: 'teachers-room', label: 'Teachers Room', icon: <GraduationCap className="w-5 h-5" /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      // Reset all states first
                      setShowTaskManager(false);
                      setShowCalendar(false);
                      setShowDiary(false);
                      
                      if (tab.id === 'tasks') {
                        setShowTaskManager(true);
                        setActiveTab('tasks');
                      } else if (tab.id === 'calendar') {
                        setShowCalendar(true);
                        setActiveTab('calendar');
                      } else if (tab.id === 'diary') {
                        setShowDiary(true);
                        setActiveTab('diary');
                      } else if (tab.id === 'teachers-room') {
                        setShowTeachersRoom(true);
                        setActiveTab('teachers-room');
                      } else {
                        setActiveTab(tab.id);
                      }
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-xl text-left transition-all ${
                      (activeTab === tab.id || (tab.id === 'tasks' && showTaskManager) || (tab.id === 'calendar' && showCalendar) || (tab.id === 'diary' && showDiary) || (tab.id === 'teachers-room' && showTeachersRoom))
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' 
                        : `${isDarkMode || isDarkGradient ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`
                    }`}
                  >
                    {tab.icon}
                    <span className="font-medium flex-1">{tab.label}</span>
                    {tab.badge && tab.badge > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Quick Stats */}
              <div className={`mt-8 pt-6 border-t ${isDarkMode || isDarkGradient ? 'border-white/10' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode || isDarkGradient ? 'text-white' : 'text-gray-900'}`}>Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode || isDarkGradient ? 'text-gray-300' : 'text-gray-600'}`}>Modules Completed</span>
                    <span className={`text-sm font-medium ${isDarkMode || isDarkGradient ? 'text-white' : 'text-gray-900'}`}>12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode || isDarkGradient ? 'text-gray-300' : 'text-gray-600'}`}>Total Study Time</span>
                    <span className={`text-sm font-medium ${isDarkMode || isDarkGradient ? 'text-white' : 'text-gray-900'}`}>8.5h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode || isDarkGradient ? 'text-gray-300' : 'text-gray-600'}`}>Current Streak</span>
                    <span className="text-sm font-medium text-green-400">7 days</span>
                  </div>
                </div>
              </div>
                    </div>
                  </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {showTaskManager ? (
              <TaskManager onClose={() => setShowTaskManager(false)} />
            ) : showCalendar ? (
              <StudyCalendar onClose={() => setShowCalendar(false)} />
            ) : showDiary ? (
              <Diary onClose={() => setShowDiary(false)} />
            ) : showTeachersRoom ? (
              <TeachersRoom onClose={() => setShowTeachersRoom(false)} />
            ) : activeTab === 'library' && (
              <div className="space-y-6">
                {/* Search and Filters */}
                <div className={`${getCardBackgroundClasses()} rounded-2xl p-6`}>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDarkMode || isDarkGradient ? 'text-gray-400' : 'text-gray-500'}`} />
                      <input
                        type="text"
                        placeholder="Search modules..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={getInputClasses()}
                      />
                    </div>
                    
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className={getSelectClasses()}
                    >
                      {categories.map(category => (
                        <option key={category} value={category} className={isDarkMode || isDarkGradient ? "bg-slate-800" : "bg-white"}>
                          {category === 'all' ? 'All Categories' : category}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className={getSelectClasses()}
                    >
                      {difficulties.map(difficulty => (
                        <option key={difficulty} value={difficulty} className={isDarkMode || isDarkGradient ? "bg-slate-800" : "bg-white"}>
                          {difficulty === 'all' ? 'All Levels' : difficulty}
                        </option>
                      ))}
                    </select>
                    
                    {/* Create Custom Course Button */}
                    <button
                      onClick={() => setShowCustomCourseModal(true)}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Create Custom Course</span>
                    </button>
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredModules.map((module, index) => {
                    // Special styling for Course Creator card
                    const isCourseCreator = module.id === 'course-creator';
                    const isCustom = module.isCustomCourse;
                    const hasProgress = hasSavedProgress(module.id);
                    
                    return (
                    <div
                      key={module.id}
                      className={`${isCourseCreator 
                        ? `${isDarkMode || isDarkGradient ? 'bg-slate-800/60' : 'bg-slate-50'} backdrop-blur-md border border-slate-500/20 shadow-sm` 
                        : isCustom 
                          ? `${getCardBackgroundClasses()} ring-2 ring-violet-500/30`
                          : getCardBackgroundClasses()} rounded-2xl overflow-hidden hover:border-slate-400/40 transition-all duration-300 group cursor-pointer ${isCourseCreator ? 'hover:shadow-lg' : ''}`}
                      onClick={() => handleModuleClick(module)}
                    >
                      <div className="relative">
                        {isCourseCreator ? (
                          // Refined header for Course Creator card
                          <div className={`w-full h-48 flex items-center justify-center relative overflow-hidden ${isDarkMode || isDarkGradient ? 'bg-gradient-to-br from-slate-700/80 via-slate-600/60 to-slate-700/80' : 'bg-gradient-to-br from-slate-100 via-slate-200/80 to-slate-100'}`}>
                            {/* Subtle geometric accent */}
                            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl" />
                            <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl" />
                            <div className="text-center z-10">
                              <div className={`w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center ${isDarkMode || isDarkGradient ? 'bg-white/10' : 'bg-slate-800/5'}`}>
                                <Wand2 className={`w-8 h-8 ${isDarkMode || isDarkGradient ? 'text-violet-400' : 'text-slate-600'}`} />
                              </div>
                              <span className={`text-sm font-medium tracking-wide uppercase ${isDarkMode || isDarkGradient ? 'text-slate-400' : 'text-slate-500'}`}>Custom Learning</span>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={module.thumbnail || getCourseImage(module.title)} 
                            alt={module.title}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              // Fallback to default image if external image fails
                              (e.target as HTMLImageElement).src = '/assets/images/Neuraplaybrain.png';
                            }}
                          />
                        )}
                        {!isCourseCreator && (
                          <>
                            <div className="absolute top-3 right-3 flex space-x-2">
                              {/* Delete button for custom courses */}
                              {isCustom && (
                                <button 
                                  className="p-2 bg-red-500/80 rounded-lg hover:bg-red-600 transition-colors"
                                  onClick={(e) => handleDeleteCustomCourse(module.id, e)}
                                  title="Delete course"
                                >
                                  <X className="w-4 h-4 text-white" />
                                </button>
                              )}
                              {/* Bookmark toggle button */}
                              <button 
                                className={`p-2 rounded-lg transition-colors ${
                                  module.isBookmarked 
                                    ? 'bg-yellow-500/80 hover:bg-yellow-600' 
                                    : 'bg-black/50 hover:bg-black/70'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBookmark(module.id);
                                }}
                                title={module.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                              >
                                <Bookmark className={`w-4 h-4 ${module.isBookmarked ? 'text-white fill-current' : 'text-white'}`} />
                              </button>
                            </div>
                            <div className="absolute bottom-3 left-3 flex space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(module.difficulty)}`}>
                                {module.difficulty}
                              </span>
                              {isCustom && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-500 text-white">
                                  Custom
                                </span>
                              )}
                              {hasProgress && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white flex items-center space-x-1">
                                  <Play className="w-3 h-3" />
                                  <span>In Progress</span>
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="p-6">
                        <div className="flex items-center space-x-2 mb-3">
                          {isCourseCreator ? <Wand2 className={`w-4 h-4 ${isDarkMode || isDarkGradient ? 'text-slate-400' : 'text-slate-500'}`} /> : getCategoryIcon(module.category)}
                          <span className={`text-sm ${isCourseCreator ? `${isDarkMode || isDarkGradient ? 'text-slate-400' : 'text-slate-500'}` : getTextClasses('secondary')}`}>{module.category}</span>
                          {!isCourseCreator && (
                            <div className="flex items-center space-x-1 ml-auto">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className={`text-sm ${getTextClasses('primary')}`}>{module.rating}</span>
                            </div>
                          )}
                        </div>
                        
                        <h3 className={`text-lg font-semibold mb-2 group-hover:text-violet-500 transition-colors ${isCourseCreator ? getTextClasses('primary') : getTextClasses('primary')}`}>
                          {module.title}
                        </h3>
                        
                        <p className={`text-sm mb-4 line-clamp-2 ${isCourseCreator ? getTextClasses('secondary') : getTextClasses('secondary')}`}>
                          {module.description}
                        </p>
                        
                        {isCourseCreator ? (
                          // Refined CTA for Course Creator card
                          <div className="mt-4">
                            <button className={`w-full py-3 font-medium rounded-xl flex items-center justify-center space-x-2 transition-all ${isDarkMode || isDarkGradient ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}>
                              <span>Create Course</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-2">
                                {getTypeIcon(module.type)}
                                <span className={`text-sm ${getTextClasses('tertiary')}`}>{module.duration}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className={`w-4 h-4 ${isDarkMode || isDarkGradient ? 'text-gray-400' : 'text-gray-500'}`} />
                                <span className={`text-sm ${getTextClasses('tertiary')}`}>
                                  {module.lastAccessed ? formatTimeAgo(module.lastAccessed) : 'Never'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className={getTextClasses('secondary')}>Progress</span>
                                <span className="text-violet-400">{module.progress}%</span>
                              </div>
                              <div className={`w-full rounded-full h-3 ${isDarkMode || isDarkGradient ? 'bg-white/20' : 'bg-gray-200'}`}>
                                <div 
                                  className="bg-gradient-to-r from-violet-500 to-purple-600 h-3 rounded-full transition-all shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                                  style={{ width: `${module.progress}%` }}
                                />
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${getTextClasses('tertiary')}`}>{module.instructor}</span>
                              {module.isCompleted && (
                                <div className="flex items-center space-x-1 text-green-400">
                                  <Trophy className="w-4 h-4" />
                                  <span className="text-sm">Completed</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}

            {/* 🎴 STUDY HELP - Flashcards & Spaced Repetition */}
            {activeTab === 'study-help' && (
              <div className="space-y-6">
                {/* Header Section */}
                <div className={`${getCardBackgroundClasses()} rounded-2xl p-6`}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className={`text-2xl font-bold ${getTextClasses('primary')}`}>Study Help</h2>
                      <p className={`mt-1 ${getTextClasses('secondary')}`}>
                        Strengthen your memory with flashcards based on your learning
                      </p>
                    </div>
                    {flashcardStats && flashcardStats.dueToday > 0 && (
                      <button
                        onClick={() => setShowFlashcardStudy(true)}
                        className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:from-violet-600 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg hover:shadow-violet-500/25"
                      >
                        <Zap className="w-5 h-5" />
                        Start Review ({flashcardStats.dueToday} due)
                      </button>
                    )}
                  </div>

                  {/* Stats Grid */}
                  {flashcardStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className={`${isDarkMode || isDarkGradient ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-xl p-4 text-center`}>
                        <div className="text-3xl font-bold text-violet-500">{flashcardStats.totalCards}</div>
                        <div className={`text-sm ${getTextClasses('secondary')}`}>Total Cards</div>
                      </div>
                      <div className={`${isDarkMode || isDarkGradient ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-xl p-4 text-center`}>
                        <div className="text-3xl font-bold text-amber-500">{flashcardStats.dueToday}</div>
                        <div className={`text-sm ${getTextClasses('secondary')}`}>Due Today</div>
                      </div>
                      <div className={`${isDarkMode || isDarkGradient ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-xl p-4 text-center`}>
                        <div className="text-3xl font-bold text-green-500">{flashcardStats.mastered}</div>
                        <div className={`text-sm ${getTextClasses('secondary')}`}>Mastered</div>
                      </div>
                      <div className={`${isDarkMode || isDarkGradient ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-xl p-4 text-center`}>
                        <div className="text-3xl font-bold text-blue-500">{flashcardStats.averageRetention}%</div>
                        <div className={`text-sm ${getTextClasses('secondary')}`}>Retention</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Flashcard Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Quick Review */}
                  <div 
                    className={`${getCardBackgroundClasses()} rounded-2xl p-6 cursor-pointer hover:border-violet-500/50 transition-all group`}
                    onClick={() => setShowFlashcardStudy(true)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${getTextClasses('primary')}`}>Quick Review</h3>
                    <p className={`text-sm ${getTextClasses('secondary')}`}>
                      Review cards due today using spaced repetition
                    </p>
                    {flashcardStats && flashcardStats.dueToday > 0 && (
                      <div className="mt-4 px-3 py-1 rounded-full bg-amber-500/20 text-amber-500 text-sm font-medium inline-block">
                        {flashcardStats.dueToday} cards waiting
                      </div>
                    )}
                  </div>

                  {/* Struggling Areas */}
                  <div className={`${getCardBackgroundClasses()} rounded-2xl p-6`}>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 flex items-center justify-center mb-4">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${getTextClasses('primary')}`}>Needs Review</h3>
                    <p className={`text-sm ${getTextClasses('secondary')}`}>
                      Cards you're struggling with
                    </p>
                    {flashcardStats && (
                      <div className="mt-4 px-3 py-1 rounded-full bg-red-500/20 text-red-500 text-sm font-medium inline-block">
                        {flashcardStats.struggling} cards
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className={`${getCardBackgroundClasses()} rounded-2xl p-6`}>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mb-4">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${getTextClasses('primary')}`}>Your Progress</h3>
                    <p className={`text-sm ${getTextClasses('secondary')}`}>
                      Total reviews completed
                    </p>
                    {flashcardStats && (
                      <div className="mt-4 px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-sm font-medium inline-block">
                        {flashcardStats.totalReviews} reviews • {flashcardStats.streakDays} day streak
                      </div>
                    )}
                  </div>
                </div>

                {/* 🎯 Dynamic Quiz Section */}
                <div className={`${getCardBackgroundClasses()} rounded-2xl p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${getTextClasses('primary')}`}>Daily Review Quiz</h3>
                        <p className={`text-sm ${getTextClasses('secondary')}`}>Personalized questions based on your learning</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDynamicQuiz(true)}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Start Quiz
                    </button>
                  </div>
                  
                  {/* Dynamic Quiz Stats */}
                  {dynamicQuizStats && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`${isDarkMode || isDarkGradient ? 'bg-white/5' : 'bg-gray-100'} rounded-lg p-3 text-center`}>
                        <div className="text-xl font-bold text-orange-500">{dynamicQuizStats.streakDays || 0}</div>
                        <div className={`text-xs ${getTextClasses('secondary')}`}>Day Streak</div>
                      </div>
                      <div className={`${isDarkMode || isDarkGradient ? 'bg-white/5' : 'bg-gray-100'} rounded-lg p-3 text-center`}>
                        <div className="text-xl font-bold text-blue-500">{dynamicQuizStats.averageScore || 0}%</div>
                        <div className={`text-xs ${getTextClasses('secondary')}`}>Avg Score</div>
                      </div>
                      <div className={`${isDarkMode || isDarkGradient ? 'bg-white/5' : 'bg-gray-100'} rounded-lg p-3 text-center`}>
                        <div className="text-xl font-bold text-green-500">{dynamicQuizStats.conceptsReviewed || 0}</div>
                        <div className={`text-xs ${getTextClasses('secondary')}`}>Concepts</div>
                      </div>
                    </div>
                  )}

                  {/* Weak areas alert */}
                  {dynamicQuizStats?.weakAreas && dynamicQuizStats.weakAreas.length > 0 && (
                    <div className={`mt-4 p-3 rounded-lg ${isDarkMode || isDarkGradient ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className={`w-4 h-4 ${isDarkMode || isDarkGradient ? 'text-orange-400' : 'text-orange-600'}`} />
                        <span className={`text-sm font-medium ${isDarkMode || isDarkGradient ? 'text-orange-300' : 'text-orange-700'}`}>
                          Focus areas:
                        </span>
                      </div>
                      <p className={`text-sm ${isDarkMode || isDarkGradient ? 'text-orange-400/80' : 'text-orange-600'}`}>
                        {dynamicQuizStats.weakAreas.slice(0, 3).join(', ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Empty state */}
                {(!flashcardStats || flashcardStats.totalCards === 0) && (
                  <div className={`${getCardBackgroundClasses()} rounded-2xl p-12 text-center`}>
                    <Lightbulb className={`w-16 h-16 mx-auto mb-4 ${isDarkMode || isDarkGradient ? 'text-gray-600' : 'text-gray-300'}`} />
                    <h3 className={`text-xl font-semibold mb-2 ${getTextClasses('primary')}`}>No Flashcards Yet</h3>
                    <p className={`${getTextClasses('secondary')} max-w-md mx-auto`}>
                      Flashcards are automatically created when you get quiz questions wrong in your courses. 
                      Keep learning and they'll appear here!
                    </p>
                  </div>
                )}

                {/* How it works */}
                <div className={`${getCardBackgroundClasses()} rounded-2xl p-6`}>
                  <h3 className={`text-lg font-semibold mb-4 ${getTextClasses('primary')}`}>How Study Help Works</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 text-violet-500 font-bold">1</div>
                      <div>
                        <h4 className={`font-medium ${getTextClasses('primary')}`}>Learn & Quiz</h4>
                        <p className={`text-sm ${getTextClasses('secondary')}`}>Take courses and complete quizzes</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 text-violet-500 font-bold">2</div>
                      <div>
                        <h4 className={`font-medium ${getTextClasses('primary')}`}>Cards Created</h4>
                        <p className={`text-sm ${getTextClasses('secondary')}`}>Wrong answers become flashcards</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 text-violet-500 font-bold">3</div>
                      <div>
                        <h4 className={`font-medium ${getTextClasses('primary')}`}>Smart Review</h4>
                        <p className={`text-sm ${getTextClasses('secondary')}`}>SM2 algorithm schedules optimal reviews</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'progress' && pedagogicalProfile && (
              <div className={`${getCardBackgroundClasses()} rounded-2xl p-6`}>
                <h2 className={`text-2xl font-bold mb-6 ${getTextClasses('primary')}`}>Learning Progress</h2>
                
                {/* Real Stats from Pedagogical Profile */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                      <Trophy className="w-8 h-8 text-white" />
                      <div>
                        <p className="text-sm text-green-100">Skills Mastered</p>
                        <p className="text-2xl font-bold text-white">{pedagogicalProfile.masteredCount}</p>
                      </div>
                        </div>
                        </div>
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                      <Brain className="w-8 h-8 text-white" />
                      <div>
                        <p className="text-sm text-blue-100">Overall Mastery</p>
                        <p className="text-2xl font-bold text-white">{pedagogicalProfile.overallMastery}%</p>
                      </div>
                        </div>
                        </div>
                  <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-8 h-8 text-white" />
                      <div>
                        <p className="text-sm text-purple-100">Review Streak</p>
                        <p className="text-2xl font-bold text-white">{pedagogicalProfile.reviewStreak} days</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Skills & Mastery Section */}
                <div className="space-y-6">
                  {/* Strengths */}
                  {pedagogicalProfile.strengthAreas.length > 0 && (
                    <div>
                      <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${getTextClasses('primary')}`}>
                        <Sparkles className="w-5 h-5 text-green-500" />
                        Your Strengths
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {pedagogicalProfile.competencies
                          .filter(c => c.currentLevel >= 70)
                          .sort((a, b) => b.currentLevel - a.currentLevel)
                          .slice(0, 4)
                          .map((comp) => (
                            <div key={comp.competencyId} className={`rounded-xl p-4 ${isDarkMode || isDarkGradient ? 'bg-white/5' : 'bg-white'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className={`font-semibold capitalize ${getTextClasses('primary')}`}>
                                  {comp.competencyName}
                                </h4>
                                <span className={`text-lg font-bold ${
                                  comp.currentLevel >= 90 ? 'text-green-500' :
                                  comp.currentLevel >= 80 ? 'text-blue-500' :
                                  'text-yellow-500'
                                }`}>
                                  {comp.currentLevel}%
                                </span>
                    </div>
                              <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode || isDarkGradient ? 'bg-white/10' : 'bg-gray-200'}`}>
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    comp.currentLevel >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                    comp.currentLevel >= 80 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                    'bg-gradient-to-r from-yellow-500 to-amber-500'
                                  }`}
                                  style={{ width: `${comp.currentLevel}%` }}
                                />
                  </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Areas to Practice - CLICKABLE CARDS */}
                  {pedagogicalProfile.knowledgeGaps.length > 0 && (
                    <div>
                      <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${getTextClasses('primary')}`}>
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Where You're Struggling - Get Help Now!
                      </h3>
                      <p className={`text-sm mb-4 ${getTextClasses('secondary')}`}>
                        Click on any skill card below to get personalized help and practice
                      </p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {pedagogicalProfile.competencies
                          .filter(c => c.currentLevel < 70)
                          .sort((a, b) => a.currentLevel - b.currentLevel)
                          .map((comp) => (
                            <button
                              key={comp.competencyId}
                              onClick={() => setSelectedCompetency({ name: comp.competencyName, level: comp.currentLevel })}
                              className={`group rounded-xl p-5 text-left transition-all duration-300 transform hover:scale-105 hover:shadow-xl cursor-pointer ${
                                isDarkMode || isDarkGradient 
                                  ? 'bg-gradient-to-br from-red-900/20 to-orange-900/20 hover:from-red-900/30 hover:to-orange-900/30 border-2 border-red-500/30 hover:border-red-500' 
                                  : 'bg-gradient-to-br from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 border-2 border-red-200 hover:border-red-400'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {comp.currentLevel < 30 ? (
                                      <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                                    ) : comp.currentLevel < 50 ? (
                                      <AlertCircle className="w-5 h-5 text-orange-500" />
                                    ) : (
                                      <Target className="w-5 h-5 text-yellow-500" />
                                    )}
                                    <h4 className={`font-bold capitalize ${getTextClasses('primary')}`}>
                                      {comp.competencyName}
                                    </h4>
                                  </div>
                                  <p className={`text-xs ${getTextClasses('tertiary')}`}>
                                    {comp.currentLevel < 30 ? '🚨 Urgent - Needs immediate attention' :
                                     comp.currentLevel < 50 ? '⚠️ Struggling - Practice recommended' :
                                     '📚 Below target - Keep practicing'}
                                  </p>
                                </div>
                                <span className={`text-2xl font-bold ${
                                  comp.currentLevel < 30 ? 'text-red-500' :
                                  comp.currentLevel < 50 ? 'text-orange-500' : 'text-yellow-500'
                                }`}>
                                  {comp.currentLevel}%
                                </span>
                              </div>
                              <div className={`w-full h-3 rounded-full overflow-hidden mb-3 ${isDarkMode || isDarkGradient ? 'bg-white/10' : 'bg-gray-200'}`}>
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    comp.currentLevel >= 50 
                                      ? 'bg-gradient-to-r from-orange-500 to-amber-500' 
                                      : 'bg-gradient-to-r from-red-500 to-rose-500 animate-pulse'
                                  }`}
                                  style={{ width: `${comp.currentLevel}%` }}
                                />
                              </div>
                              
                              {/* Click to Get Help Indicator */}
                              <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                isDarkMode || isDarkGradient 
                                  ? 'bg-violet-500/20 group-hover:bg-violet-500/30' 
                                  : 'bg-violet-100 group-hover:bg-violet-200'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <Wand2 className="w-4 h-4 text-violet-500 group-hover:animate-bounce" />
                                  <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                                    Click to Get Personalized Help
                                  </span>
                                </div>
                                <ArrowRight className="w-5 h-5 text-violet-500 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Next Action */}
                  {pedagogicalProfile.nextAction && (
                    <div className={`rounded-xl p-6 border-2 border-violet-500/30 ${isDarkMode || isDarkGradient ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                      <div className="flex items-center gap-3">
                        <Lightbulb className="w-6 h-6 text-violet-500" />
                        <div>
                          <h4 className={`font-semibold ${getTextClasses('primary')}`}>Recommended Next Step</h4>
                          <p className={`text-sm ${getTextClasses('secondary')}`}>{pedagogicalProfile.nextAction}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'bookmarks' && (
              <div className={`${getCardBackgroundClasses()} rounded-2xl p-6`}>
                <h2 className={`text-2xl font-bold mb-6 ${getTextClasses('primary')}`}>Bookmarked Modules</h2>
                {allModules.filter(m => m.isBookmarked).length === 0 ? (
                  <div className="text-center py-12">
                    <Bookmark className={`w-16 h-16 mx-auto mb-4 ${isDarkMode || isDarkGradient ? 'text-gray-600' : 'text-gray-300'}`} />
                    <h3 className={`text-lg font-medium mb-2 ${getTextClasses('primary')}`}>No bookmarks yet</h3>
                    <p className={`text-sm ${getTextClasses('secondary')}`}>
                      Click the bookmark icon on any course card to save it here for quick access.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {allModules.filter(m => m.isBookmarked).map(module => (
                      <div 
                        key={module.id} 
                        className={`${isDarkMode || isDarkGradient ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} rounded-xl overflow-hidden cursor-pointer transition-colors`}
                        onClick={() => handleModuleClick(module)}
                      >
                        <div className="relative">
                          <img 
                            src={module.thumbnail || getCourseImage(module.title)} 
                            alt={module.title}
                            className="w-full h-32 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/assets/images/Neuraplaybrain.png';
                            }}
                          />
                          <div className="absolute top-2 right-2">
                            <button 
                              className="p-1.5 bg-yellow-500/80 rounded-lg hover:bg-yellow-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookmark(module.id);
                              }}
                              title="Remove bookmark"
                            >
                              <Bookmark className="w-3 h-3 text-white fill-current" />
                            </button>
                          </div>
                          {module.isCustomCourse && (
                            <div className="absolute bottom-2 left-2">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500 text-white">
                                Custom
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className={`font-semibold mb-2 ${getTextClasses('primary')}`}>{module.title}</h3>
                          <p className={`text-sm mb-3 line-clamp-2 ${getTextClasses('secondary')}`}>{module.description}</p>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${getTextClasses('tertiary')}`}>{module.duration}</span>
                            <div className="flex items-center space-x-2">
                              {hasSavedProgress(module.id) && (
                                <span className="text-xs text-green-500 font-medium">In Progress</span>
                              )}
                              <button className="text-violet-400 hover:text-violet-300">
                                <Play className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className={`${getCardBackgroundClasses()} rounded-2xl p-6`}>
                <h2 className={`text-2xl font-bold mb-6 ${getTextClasses('primary')}`}>Study Calendar</h2>
                <div className={`h-96 flex items-center justify-center ${getTextClasses('tertiary')}`}>
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-2" />
                    <p>Calendar view will be displayed here</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className={`${getCardBackgroundClasses()} rounded-2xl p-6`}>
                <h2 className={`text-2xl font-bold mb-6 ${getTextClasses('primary')}`}>Detailed Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`${isDarkMode || isDarkGradient ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-6`}>
                    <h3 className={`text-lg font-semibold mb-4 ${getTextClasses('primary')}`}>Category Performance</h3>
                    <div className="space-y-3">
                      {['Memory', 'Logic', 'Focus', 'Creativity'].map(category => (
                        <div key={category} className="flex items-center justify-between">
                          <span className={`text-sm ${getTextClasses('primary')}`}>{category}</span>
                          <div className="flex items-center space-x-2">
                            <div className={`w-20 rounded-full h-2 ${isDarkMode || isDarkGradient ? 'bg-white/10' : 'bg-gray-200'}`}>
                              <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${Math.random() * 100}%` }} />
                            </div>
                            <span className={`text-sm ${getTextClasses('secondary')}`}>85%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className={`${isDarkMode || isDarkGradient ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-6`}>
                    <h3 className={`text-lg font-semibold mb-4 ${getTextClasses('primary')}`}>Study Habits</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${getTextClasses('primary')}`}>Average Session</span>
                        <span className={`text-sm ${getTextClasses('secondary')}`}>25 min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${getTextClasses('primary')}`}>Best Time</span>
                        <span className={`text-sm ${getTextClasses('secondary')}`}>Morning</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${getTextClasses('primary')}`}>Completion Rate</span>
                        <span className={`text-sm ${getTextClasses('secondary')}`}>78%</span>
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          )}
              </div>
              </div>
            </div>

      {/* Current Module Player */}
      {currentModule && (
        <div className={`fixed bottom-0 left-0 right-0 backdrop-blur-md border-t ${isDarkMode || isDarkGradient ? 'bg-black/90 border-white/10' : 'bg-white/90 border-gray-200'}`}>
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <img 
                src={currentModule.thumbnail || getCourseImage(currentModule.title)} 
                alt={currentModule.title}
                className="w-16 h-16 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/images/Neuraplaybrain.png';
                }}
              />
              
              <div className="flex-1">
                <h3 className={`font-semibold ${getTextClasses('primary')}`}>{currentModule.title}</h3>
                <p className={`text-sm ${getTextClasses('secondary')}`}>{currentModule.instructor}</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <button onClick={toggleMute} className={`p-2 rounded-lg transition-colors ${isDarkMode || isDarkGradient ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                
                <button onClick={togglePlayPause} className="p-3 bg-violet-600 hover:bg-violet-700 rounded-full transition-colors">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                
                <button className={`p-2 rounded-lg transition-colors ${isDarkMode || isDarkGradient ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 max-w-md">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className={getTextClasses('secondary')}>
                    {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
                  </span>
                  <span className={getTextClasses('secondary')}>
                    {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}
                  </span>
              </div>
                <div className={`w-full rounded-full h-2 ${isDarkMode || isDarkGradient ? 'bg-white/10' : 'bg-gray-200'}`}>
                  <div 
                    className="bg-violet-500 h-2 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
              </div>
              </div>
              
              <button 
                onClick={() => setCurrentModule(null)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode || isDarkGradient ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
              </div>
            </div>
          )}

      {/* Generative Learning Module Overlay */}
      {activeGenerativeModule && (
        <GenerativeLearningModule
          module={activeGenerativeModule}
          onClose={async () => {
            setActiveGenerativeModule(null);
            // 🎯 FIX: Reload courses from DB to get fresh hasGeneratedContent flags
            // This ensures immediate persistence after course generation
            if (user?.id) {
              try {
                const freshCourses = await courseStorageService.loadCourses(user.id);
                setSavedCustomCourses(freshCourses);
                console.log('✅ DashboardPage: Refreshed courses from DB after module close');
              } catch (error) {
                console.warn('⚠️ DashboardPage: Failed to refresh courses:', error);
              }
            }
          }}
        />
      )}

      {/* 🎴 Flashcard Study Overlay */}
      {showFlashcardStudy && user && (
        <FlashcardStudyComponent
          userId={user.id}
          onClose={() => {
            setShowFlashcardStudy(false);
            // Refresh stats after study session
            const newStats = flashcardGeneratorService.getStats(user.id);
            setFlashcardStats(newStats);
          }}
        />
      )}

      {/* 🎯 Dynamic Quiz Overlay */}
      {showDynamicQuiz && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <DynamicQuizWidget
              userId={user.id}
              isDarkMode={isDarkMode || isDarkGradient}
              onClose={() => {
                setShowDynamicQuiz(false);
                // Refresh stats after quiz
                const newStats = dynamicQuizGenerator.getQuizStats(user.id);
                setDynamicQuizStats(newStats);
              }}
            />
          </motion.div>
        </div>
      )}

      {/* Competency Help Modal */}
      {selectedCompetency && pedagogicalProfile && (
        <CompetencyHelpModal
          competencyName={selectedCompetency.name}
          currentLevel={selectedCompetency.level}
          courseContext={selectedCompetency.name}
          strengthAreas={pedagogicalProfile.strengthAreas}
          onClose={() => setSelectedCompetency(null)}
          onComplete={(improvement) => {
            console.log(`Improved by ${improvement}%!`);
            loadPedagogicalProfile();
            setSelectedCompetency(null);
          }}
        />
      )}

      {/* Custom Course Creation Modal */}
      {showCustomCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-xl ${isDarkMode || isDarkGradient ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
            <div className={`p-6 border-b ${isDarkMode || isDarkGradient ? 'border-slate-700/50' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDarkMode || isDarkGradient ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <Wand2 className={`w-5 h-5 ${isDarkMode || isDarkGradient ? 'text-slate-400' : 'text-slate-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${isDarkMode || isDarkGradient ? 'text-white' : 'text-slate-900'}`}>
                      Create Custom Course
                    </h2>
                    <p className={`text-sm ${isDarkMode || isDarkGradient ? 'text-slate-500' : 'text-slate-500'}`}>
                      Personalized AI-generated learning
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomCourseModal(false)}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode || isDarkGradient ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode || isDarkGradient ? 'text-slate-300' : 'text-slate-700'}`}>
                  What do you want to learn?
                </label>
                <input
                  type="text"
                  value={customCourseTopic}
                  onChange={(e) => setCustomCourseTopic(e.target.value)}
                  placeholder="e.g., Python, Spanish, Machine Learning..."
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDarkMode || isDarkGradient
                      ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400'
                  } focus:outline-none transition-colors`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode || isDarkGradient ? 'text-slate-300' : 'text-slate-700'}`}>
                  Focus areas <span className={`font-normal ${isDarkMode || isDarkGradient ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
                </label>
                <textarea
                  value={customCourseDescription}
                  onChange={(e) => setCustomCourseDescription(e.target.value)}
                  placeholder="Specific topics or goals..."
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl border resize-none ${
                    isDarkMode || isDarkGradient
                      ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400'
                  } focus:outline-none transition-colors`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode || isDarkGradient ? 'text-slate-300' : 'text-slate-700'}`}>
                  Your experience level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setCustomCourseDifficulty(level)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        customCourseDifficulty === level
                          ? isDarkMode || isDarkGradient
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'bg-slate-800 text-white'
                          : isDarkMode || isDarkGradient
                            ? 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
                            : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className={`p-4 rounded-xl ${isDarkMode || isDarkGradient ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-100'}`}>
                <div className="flex items-start space-x-3">
                  <Brain className={`w-4 h-4 mt-0.5 ${isDarkMode || isDarkGradient ? 'text-slate-500' : 'text-slate-400'}`} />
                  <p className={`text-sm leading-relaxed ${isDarkMode || isDarkGradient ? 'text-slate-400' : 'text-slate-500'}`}>
                    Your course will include adaptive assessments, structured lessons, and visual content tailored to your level.
                  </p>
                </div>
              </div>
            </div>
            
            <div className={`p-6 border-t ${isDarkMode || isDarkGradient ? 'border-slate-700/50' : 'border-slate-100'} flex space-x-3`}>
              <button
                onClick={() => setShowCustomCourseModal(false)}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isDarkMode || isDarkGradient
                    ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomCourse}
                disabled={!customCourseTopic.trim()}
                className={`flex-1 px-4 py-3 font-medium rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                  isDarkMode || isDarkGradient
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                <span>Begin Learning</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage; 