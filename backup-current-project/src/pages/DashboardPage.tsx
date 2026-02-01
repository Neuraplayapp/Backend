import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
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
  CheckSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import TaskManager from '../components/TaskManager';
import StudyCalendar from '../components/StudyCalendar';
import Diary from '../components/Diary';

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
  type: 'video' | 'interactive' | 'reading' | 'quiz' | 'game';
  skills: string[];
  rating: number;
  instructor: string;
  lastAccessed?: Date;
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

  // Mock data for learning modules
  const learningModules: LearningModule[] = [
    {
      id: '1',
      title: 'Introduction to Memory Techniques',
      description: 'Learn powerful memory techniques to improve your learning efficiency and retention.',
      category: 'Memory',
      difficulty: 'Beginner',
      duration: '15 min',
      progress: 75,
      isBookmarked: true,
      isCompleted: false,
      thumbnail: '/assets/images/Neuraplaybrain.png',
      type: 'video',
      skills: ['Working Memory', 'Visual Memory', 'Sequential Processing'],
      rating: 4.8,
      instructor: 'Dr. Sarah Chen',
      lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      id: '2',
      title: 'Advanced Problem Solving Strategies',
      description: 'Master advanced problem-solving techniques for complex cognitive challenges.',
      category: 'Logic',
      difficulty: 'Advanced',
      duration: '25 min',
      progress: 30,
      isBookmarked: false,
      isCompleted: false,
      thumbnail: '/assets/images/Thecube.png',
      type: 'interactive',
      skills: ['Problem Solving', 'Critical Thinking', 'Analytical Reasoning'],
      rating: 4.9,
      instructor: 'Prof. Michael Rodriguez',
      lastAccessed: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      id: '3',
      title: 'Focus and Attention Training',
      description: 'Develop sustained attention and focus through specialized exercises.',
      category: 'Focus',
      difficulty: 'Intermediate',
      duration: '20 min',
      progress: 100,
      isBookmarked: true,
      isCompleted: true,
      thumbnail: '/assets/images/Mascot.png',
      type: 'game',
      skills: ['Sustained Attention', 'Selective Attention', 'Divided Attention'],
      rating: 4.7,
      instructor: 'Dr. Emily Watson',
      lastAccessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    },
    {
      id: '4',
      title: 'Creative Thinking Workshop',
      description: 'Unlock your creative potential through innovative thinking exercises.',
      category: 'Creativity',
      difficulty: 'Intermediate',
      duration: '18 min',
      progress: 0,
      isBookmarked: false,
      isCompleted: false,
      thumbnail: '/assets/images/neuraplaybanner1.png',
      type: 'interactive',
      skills: ['Creative Thinking', 'Divergent Thinking', 'Innovation'],
      rating: 4.6,
      instructor: 'Prof. David Kim',
      lastAccessed: undefined
    },
    {
      id: '5',
      title: 'Spatial Reasoning Fundamentals',
      description: 'Build strong spatial reasoning skills through 3D visualization exercises.',
      category: 'Spatial',
      difficulty: 'Beginner',
      duration: '22 min',
      progress: 45,
      isBookmarked: false,
      isCompleted: false,
      thumbnail: '/assets/images/Thecube.png',
      type: 'game',
      skills: ['Spatial Reasoning', 'Visual Processing', '3D Thinking'],
      rating: 4.5,
      instructor: 'Dr. Lisa Thompson',
      lastAccessed: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
    },
    {
      id: '6',
      title: 'Language Development Mastery',
      description: 'Enhance your language skills through comprehensive vocabulary and grammar exercises.',
      category: 'Language',
      difficulty: 'Advanced',
      duration: '30 min',
      progress: 60,
      isBookmarked: true,
      isCompleted: false,
      thumbnail: '/assets/images/police.jpg',
      type: 'reading',
      skills: ['Verbal Memory', 'Language Processing', 'Communication'],
      rating: 4.8,
      instructor: 'Prof. James Wilson',
      lastAccessed: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
    }
  ];

  const categories = ['all', 'Memory', 'Logic', 'Focus', 'Creativity', 'Spatial', 'Language'];
  const difficulties = ['all', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredModules = learningModules.filter(module => {
    const matchesSearch = module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || module.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
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
    setCurrentModule(module);
    setIsPlaying(true);
    setCurrentTime(0);
    setTotalTime(parseInt(module.duration) * 60); // Convert minutes to seconds
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleBookmark = (moduleId: string) => {
    // In a real app, this would update the backend
    console.log('Toggle bookmark for module:', moduleId);
  };

  const progressPercentage = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  // Show login prompt if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/assets/images/Mascot.png" 
              alt="NeuraPlay Mascot" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to NeuraPlay!</h1>
          <p className="text-lg text-gray-300 mb-8">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Library className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Learning Central</h1>
                <p className="text-sm text-gray-300">Your personal learning library</p>
          </div>
        </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <img 
                  src={user?.profile?.avatar || '/assets/images/placeholder.png'} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium">{user?.username || 'User'}</span>
            </div>
            </div>
          </div>
                </div>
              </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <nav className="space-y-2">
                {[
                  { id: 'library', label: 'Library', icon: <BookOpen className="w-5 h-5" /> },
                  { id: 'progress', label: 'Progress', icon: <TrendingUp className="w-5 h-5" /> },
                  { id: 'bookmarks', label: 'Bookmarks', icon: <Bookmark className="w-5 h-5" /> },
                  { id: 'diary', label: 'Diary', icon: <BookOpen className="w-5 h-5" /> },
                  { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
                  { id: 'stats', label: 'Statistics', icon: <BarChart3 className="w-5 h-5" /> },
                  { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" /> }
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
                      } else {
                        setActiveTab(tab.id);
                      }
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-xl text-left transition-all ${
                      (activeTab === tab.id || (tab.id === 'tasks' && showTaskManager) || (tab.id === 'calendar' && showCalendar) || (tab.id === 'diary' && showDiary))
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' 
                        : 'hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    {tab.icon}
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>

              {/* Quick Stats */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Modules Completed</span>
                    <span className="text-sm font-medium">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Total Study Time</span>
                    <span className="text-sm font-medium">8.5h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Current Streak</span>
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
            ) : activeTab === 'library' && (
              <div className="space-y-6">
                {/* Search and Filters */}
                <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search modules..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {categories.map(category => (
                        <option key={category} value={category} className="bg-slate-800">
                          {category === 'all' ? 'All Categories' : category}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {difficulties.map(difficulty => (
                        <option key={difficulty} value={difficulty} className="bg-slate-800">
                          {difficulty === 'all' ? 'All Levels' : difficulty}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredModules.map(module => (
                    <div
                      key={module.id}
                      className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden hover:border-violet-500/50 transition-all group cursor-pointer"
                      onClick={() => handleModuleClick(module)}
                    >
                      <div className="relative">
                        <img 
                          src={module.thumbnail} 
                          alt={module.title}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-3 right-3 flex space-x-2">
                          {module.isBookmarked && (
                            <button className="p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors">
                              <Bookmark className="w-4 h-4 text-yellow-400 fill-current" />
                            </button>
                          )}
                          <button 
                            className="p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBookmark(module.id);
                            }}
                          >
                            <Bookmark className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(module.difficulty)}`}>
                            {module.difficulty}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex items-center space-x-2 mb-3">
                          {getCategoryIcon(module.category)}
                          <span className="text-sm text-gray-300">{module.category}</span>
                          <div className="flex items-center space-x-1 ml-auto">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm">{module.rating}</span>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-semibold mb-2 group-hover:text-violet-400 transition-colors">
                          {module.title}
                        </h3>
                        
                        <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                          {module.description}
                        </p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(module.type)}
                            <span className="text-sm text-gray-400">{module.duration}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">
                              {module.lastAccessed ? formatTimeAgo(module.lastAccessed) : 'Never'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-300">Progress</span>
                            <span className="text-violet-400">{module.progress}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-violet-500 to-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${module.progress}%` }}
                            />
                      </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">{module.instructor}</span>
                          {module.isCompleted && (
                            <div className="flex items-center space-x-1 text-green-400">
                              <Trophy className="w-4 h-4" />
                              <span className="text-sm">Completed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                        </div>
            )}

            {activeTab === 'progress' && (
              <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h2 className="text-2xl font-bold mb-6">Learning Progress</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                      <Trophy className="w-8 h-8 text-white" />
                      <div>
                        <p className="text-sm text-green-100">Modules Completed</p>
                        <p className="text-2xl font-bold text-white">12</p>
                      </div>
                        </div>
                        </div>
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-8 h-8 text-white" />
                      <div>
                        <p className="text-sm text-blue-100">Study Time</p>
                        <p className="text-2xl font-bold text-white">8.5h</p>
                      </div>
                        </div>
                        </div>
                  <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="w-8 h-8 text-white" />
                      <div>
                        <p className="text-sm text-purple-100">Current Streak</p>
                        <p className="text-2xl font-bold text-white">7 days</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Progress Chart Placeholder */}
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Weekly Progress</h3>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                      <p>Progress chart will be displayed here</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bookmarks' && (
              <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h2 className="text-2xl font-bold mb-6">Bookmarked Modules</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {learningModules.filter(m => m.isBookmarked).map(module => (
                    <div key={module.id} className="bg-white/5 rounded-xl p-4">
                      <h3 className="font-semibold mb-2">{module.title}</h3>
                      <p className="text-sm text-gray-300 mb-3">{module.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{module.duration}</span>
                        <button className="text-violet-400 hover:text-violet-300">
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h2 className="text-2xl font-bold mb-6">Study Calendar</h2>
                <div className="h-96 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-2" />
                    <p>Calendar view will be displayed here</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h2 className="text-2xl font-bold mb-6">Detailed Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Category Performance</h3>
                    <div className="space-y-3">
                      {['Memory', 'Logic', 'Focus', 'Creativity'].map(category => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm">{category}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-white/10 rounded-full h-2">
                              <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${Math.random() * 100}%` }} />
                            </div>
                            <span className="text-sm text-gray-300">85%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Study Habits</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Average Session</span>
                        <span className="text-sm text-gray-300">25 min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Best Time</span>
                        <span className="text-sm text-gray-300">Morning</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Completion Rate</span>
                        <span className="text-sm text-gray-300">78%</span>
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
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <img 
                src={currentModule.thumbnail} 
                alt={currentModule.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
              
              <div className="flex-1">
                <h3 className="font-semibold">{currentModule.title}</h3>
                <p className="text-sm text-gray-300">{currentModule.instructor}</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                
                <button onClick={togglePlayPause} className="p-3 bg-violet-600 hover:bg-violet-700 rounded-full transition-colors">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 max-w-md">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-300">
                    {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-gray-300">
                    {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}
                  </span>
              </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-violet-500 h-2 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
              </div>
              </div>
              
              <button 
                onClick={() => setCurrentModule(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
              </div>
            </div>
          )}
    </div>
  );
};

export default DashboardPage; 