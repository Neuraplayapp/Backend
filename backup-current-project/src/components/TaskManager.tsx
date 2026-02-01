import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  Star, 
  Target, 
  TrendingUp, 
  Award,
  X,
  ChevronRight,
  CheckCircle,
  Circle,
  AlertCircle,
  Zap,
  BookOpen,
  Brain,
  Trophy,
  Palette
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  column: 'todo' | 'progress' | 'done';
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  category: 'learning' | 'game' | 'exercise' | 'reading' | 'creative';
  estimatedTime: number; // in minutes
  isCompleted: boolean;
  createdAt: string;
  completedAt?: string;
}

interface TaskManagerProps {
  onClose?: () => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({ onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [rippleEffect, setRippleEffect] = useState<{ x: number; y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [recentlyCompleted, setRecentlyCompleted] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Load tasks from localStorage on component mount and clean up old completed tasks
  useEffect(() => {
    const savedTasks = localStorage.getItem('animated-tasks');
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);
      // Clean up completed tasks older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const cleanedTasks = parsedTasks.filter((task: Task) => {
        if (task.isCompleted && task.completedAt) {
          const completedDate = new Date(task.completedAt);
          return completedDate > thirtyDaysAgo;
        }
        return true;
      });
      
      setTasks(cleanedTasks);
      localStorage.setItem('animated-tasks', JSON.stringify(cleanedTasks));
    } else {
      // Default tasks with new structure
      const defaultTasks: Task[] = [
        {
          id: "default1",
          title: "Complete your first learning game",
          description: "Start your learning journey by completing your first educational game!",
          column: "todo",
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          priority: "high",
          category: "game",
          estimatedTime: 15,
          isCompleted: false,
          createdAt: new Date().toISOString()
        },
        {
          id: "default2",
          title: "Read a chapter from your favorite book",
          description: "Spend some time reading to improve your vocabulary and comprehension.",
          column: "todo",
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "medium",
          category: "reading",
          estimatedTime: 20,
          isCompleted: false,
          createdAt: new Date().toISOString()
        },
        {
          id: "default3",
          title: "Practice spatial reasoning with puzzles",
          description: "Work on puzzles to improve your spatial awareness and problem-solving skills.",
          column: "progress",
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "medium",
          category: "exercise",
          estimatedTime: 25,
          isCompleted: false,
          createdAt: new Date().toISOString()
        }
      ];
      setTasks(defaultTasks);
      localStorage.setItem('animated-tasks', JSON.stringify(defaultTasks));
    }
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem('animated-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleRipple = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setRippleEffect({ x, y });
    setTimeout(() => setRippleEffect(null), 600);
  };

  const getTasksByColumn = (column: string) => {
    return tasks.filter(task => task.column === column);
  };

  const getFilteredTasks = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    switch (activeTab) {
      case 'today':
        return tasks.filter(task => {
          if (!task.deadline) return false;
          const deadline = new Date(task.deadline);
          return deadline >= today && deadline < tomorrow;
        });
      case 'upcoming':
        return tasks.filter(task => {
          if (!task.deadline) return false;
          const deadline = new Date(task.deadline);
          return deadline >= tomorrow;
        });
      case 'completed':
        return tasks.filter(task => task.isCompleted);
      default:
        return tasks;
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    if (draggedTask) {
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === draggedTask 
            ? { ...task, column: targetColumn as 'todo' | 'progress' | 'done' }
            : task
        )
      );
      setDraggedTask(null);
    }
  };

  const openModal = (columnType?: string) => {
    setIsEditMode(false);
    setCurrentTask(null);
    if (formRef.current) {
      formRef.current.reset();
    }
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setIsEditMode(true);
    setCurrentTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setCurrentTask(null);
  };

  const addTask = (formData: FormData) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      column: (formData.get('column') as 'todo' | 'progress' | 'done') || 'todo',
      deadline: formData.get('deadline') as string || undefined,
      priority: (formData.get('priority') as 'low' | 'medium' | 'high') || 'medium',
      category: (formData.get('category') as 'learning' | 'game' | 'exercise' | 'reading' | 'creative') || 'learning',
      estimatedTime: parseInt(formData.get('estimatedTime') as string) || 15,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [...prev, newTask]);
    closeModal();
  };

  const updateTask = (formData: FormData) => {
    if (!currentTask) return;

    const updatedTask: Task = {
      ...currentTask,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      column: (formData.get('column') as 'todo' | 'progress' | 'done') || currentTask.column,
      deadline: formData.get('deadline') as string || undefined,
      priority: (formData.get('priority') as 'low' | 'medium' | 'high') || currentTask.priority,
      category: (formData.get('category') as 'learning' | 'game' | 'exercise' | 'reading' | 'creative') || currentTask.category,
      estimatedTime: parseInt(formData.get('estimatedTime') as string) || currentTask.estimatedTime
    };

    setTasks(prev => prev.map(task => task.id === currentTask.id ? updatedTask : task));
    closeModal();
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newIsCompleted = !task.isCompleted;
        
        // Add completion animation
        if (newIsCompleted) {
          setRecentlyCompleted(taskId);
          setTimeout(() => setRecentlyCompleted(null), 2000);
        }
        
        return {
          ...task,
          isCompleted: newIsCompleted,
          completedAt: newIsCompleted ? new Date().toISOString() : undefined,
          column: newIsCompleted ? 'done' : (task.column === 'progress' ? 'progress' : 'todo') // Move to done column when completed, preserve original column when uncompleting
        };
      }
      return task;
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'learning': return <Brain className="w-4 h-4" />;
      case 'game': return <Trophy className="w-4 h-4" />;
      case 'exercise': return <Target className="w-4 h-4" />;
      case 'reading': return <BookOpen className="w-4 h-4" />;
      case 'creative': return <Palette className="w-4 h-4" />;
      default: return <CheckSquare className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'learning': return 'from-blue-500 to-cyan-500';
      case 'game': return 'from-purple-500 to-pink-500';
      case 'exercise': return 'from-green-500 to-emerald-500';
      case 'reading': return 'from-orange-500 to-red-500';
      case 'creative': return 'from-pink-500 to-rose-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  // Function to manually clean up old completed tasks
  const cleanupOldCompletedTasks = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    setTasks(prev => {
      const cleanedTasks = prev.filter(task => {
        if (task.isCompleted && task.completedAt) {
          const completedDate = new Date(task.completedAt);
          return completedDate > thirtyDaysAgo;
        }
        return true;
      });
      localStorage.setItem('animated-tasks', JSON.stringify(cleanedTasks));
      return cleanedTasks;
    });
  };

  // Get count of completed tasks that will be auto-deleted soon
  const getSoonToBeDeletedCount = () => {
    const twentyFiveDaysAgo = new Date();
    twentyFiveDaysAgo.setDate(twentyFiveDaysAgo.getDate() - 25);
    
    return tasks.filter(task => {
      if (task.isCompleted && task.completedAt) {
        const completedDate = new Date(task.completedAt);
        return completedDate < twentyFiveDaysAgo;
      }
      return false;
    }).length;
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "spring" as const, 
        stiffness: 300, 
        damping: 30,
        duration: 0.4
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: (i: number) => ({ 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        delay: i * 0.1,
        type: "spring" as const, 
        stiffness: 400, 
        damping: 25,
        duration: 0.5
      }
    }),
    exit: { 
      opacity: 0, 
      y: -20, 
      scale: 0.95,
      transition: { duration: 0.3 }
    }
  };

  const rippleVariants = {
    initial: { scale: 0, opacity: 1 },
    animate: { 
      scale: 4, 
      opacity: 0,
      transition: { duration: 0.6, ease: "easeOut" as const }
    }
  };

  const waveRevealVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      filter: "blur(10px)"
    },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.15,
        duration: 0.6,
        ease: "easeOut" as const
      }
    })
  };

  const contentRevealVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.15 + 0.3,
        duration: 0.5,
        ease: "easeOut" as const
      }
    })
  };

  const filteredTasks = getFilteredTasks();
  const todoTasks = filteredTasks.filter(task => task.column === 'todo');
  const progressTasks = filteredTasks.filter(task => task.column === 'progress');
  const doneTasks = filteredTasks.filter(task => task.column === 'done');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white p-6">
      <motion.div 
        className="max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          variants={cardVariants}
          custom={0}
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Task Manager</h1>
              <p className="text-gray-300">Organize your learning journey</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="text-green-400 flex items-center space-x-1">
                  <Award className="w-4 h-4" />
                  <span>Auto-delete completed tasks after 30 days</span>
                </span>
                {getSoonToBeDeletedCount() > 0 && (
                  <span className="text-yellow-400 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{getSoonToBeDeletedCount()} tasks will be deleted soon</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={cleanupOldCompletedTasks}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 hover:from-orange-600 hover:to-red-700 transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
              <span>Cleanup</span>
            </motion.button>
            
            <motion.button
              onClick={() => openModal()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onMouseDown={handleRipple}
              className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-violet-600 hover:to-purple-700 transition-all duration-200 relative overflow-hidden"
            >
              <Plus className="w-5 h-5" />
              <span>Add Task</span>
              {rippleEffect && (
                <motion.div
                  className="absolute inset-0 bg-white/20 rounded-xl"
                  initial="initial"
                  animate="animate"
                  variants={rippleVariants}
                  style={{
                    left: rippleEffect.x,
                    top: rippleEffect.y,
                  }}
                />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div 
          className="flex space-x-2 mb-6"
          variants={cardVariants}
          custom={1}
        >
          {[
            { id: 'all', label: 'All Tasks', icon: <CheckSquare className="w-4 h-4" /> },
            { id: 'today', label: 'Today', icon: <Calendar className="w-4 h-4" /> },
            { id: 'upcoming', label: 'Upcoming', icon: <Clock className="w-4 h-4" /> },
            { id: 'completed', label: 'Completed', icon: <Award className="w-4 h-4" /> }
          ].map((tab, index) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
              variants={cardVariants}
              custom={index + 2}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* To Do Column */}
          <motion.div 
            className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10"
            variants={cardVariants}
            custom={3}
          >
            <motion.div 
              className="flex items-center justify-between mb-4"
              variants={waveRevealVariants}
              custom={0}
            >
              <div className="flex items-center space-x-2">
                <Circle className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold">To Do</h3>
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                  {todoTasks.length}
                </span>
              </div>
            </motion.div>

            <div 
              className="space-y-3 min-h-[400px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'todo')}
            >
              <AnimatePresence>
                {todoTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={cardVariants}
                    custom={index}
                    className={`bg-white/10 border border-white/20 rounded-xl p-4 cursor-pointer hover:bg-white/20 transition-all relative ${
                      draggedTask === task.id ? 'opacity-50' : ''
                    } ${recentlyCompleted === task.id ? 'ring-2 ring-green-500 animate-pulse' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => openEditModal(task)}
                  >
                    {/* Celebration animation */}
                    {recentlyCompleted === task.id && (
                      <motion.div
                        className="absolute inset-0 bg-green-500/20 rounded-xl pointer-events-none"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <motion.div
                            initial={{ scale: 0, rotate: 0 }}
                            animate={{ scale: 1, rotate: 360 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          >
                            <Award className="w-8 h-8 text-green-400" />
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskCompletion(task.id);
                          }}
                          className="p-1 hover:bg-white/20 rounded transition-colors"
                        >
                          <Circle className="w-4 h-4 text-gray-400" />
                        </button>
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getCategoryColor(task.category)}`} />
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>

                    <motion.h4 
                      className="font-semibold text-white mb-2"
                      variants={contentRevealVariants}
                      custom={0}
                    >
                      {task.title}
                    </motion.h4>
                    
                    <motion.p 
                      className="text-sm text-gray-300 mb-3"
                      variants={contentRevealVariants}
                      custom={1}
                    >
                      {task.description}
                    </motion.p>

                    <motion.div 
                      className="flex items-center justify-between text-xs text-gray-400"
                      variants={contentRevealVariants}
                      custom={2}
                    >
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(task.category)}
                        <span>{task.category}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{task.estimatedTime}m</span>
                      </div>
                    </motion.div>

                    {task.deadline && (
                      <motion.div 
                        className="mt-2 text-xs text-gray-400 flex items-center space-x-1"
                        variants={contentRevealVariants}
                        custom={3}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(task.deadline).toLocaleDateString()}</span>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* In Progress Column */}
          <motion.div 
            className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10"
            variants={cardVariants}
            custom={4}
          >
            <motion.div 
              className="flex items-center justify-between mb-4"
              variants={waveRevealVariants}
              custom={0}
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-semibold">In Progress</h3>
                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-medium">
                  {progressTasks.length}
                </span>
              </div>
            </motion.div>

            <div 
              className="space-y-3 min-h-[400px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'progress')}
            >
              <AnimatePresence>
                {progressTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={cardVariants}
                    custom={index}
                    className={`bg-white/10 border border-white/20 rounded-xl p-4 cursor-pointer hover:bg-white/20 transition-all relative ${
                      draggedTask === task.id ? 'opacity-50' : ''
                    } ${recentlyCompleted === task.id ? 'ring-2 ring-green-500 animate-pulse' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => openEditModal(task)}
                  >
                    {/* Celebration animation */}
                    {recentlyCompleted === task.id && (
                      <motion.div
                        className="absolute inset-0 bg-green-500/20 rounded-xl pointer-events-none"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <motion.div
                            initial={{ scale: 0, rotate: 0 }}
                            animate={{ scale: 1, rotate: 360 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          >
                            <Award className="w-8 h-8 text-green-400" />
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskCompletion(task.id);
                          }}
                          className="p-1 hover:bg-white/20 rounded transition-colors"
                        >
                          <Circle className="w-4 h-4 text-gray-400" />
                        </button>
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getCategoryColor(task.category)}`} />
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>

                    <motion.h4 
                      className="font-semibold text-white mb-2"
                      variants={contentRevealVariants}
                      custom={0}
                    >
                      {task.title}
                    </motion.h4>
                    
                    <motion.p 
                      className="text-sm text-gray-300 mb-3"
                      variants={contentRevealVariants}
                      custom={1}
                    >
                      {task.description}
                    </motion.p>

                    <motion.div 
                      className="flex items-center justify-between text-xs text-gray-400"
                      variants={contentRevealVariants}
                      custom={2}
                    >
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(task.category)}
                        <span>{task.category}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{task.estimatedTime}m</span>
                      </div>
                    </motion.div>

                    {task.deadline && (
                      <motion.div 
                        className="mt-2 text-xs text-gray-400 flex items-center space-x-1"
                        variants={contentRevealVariants}
                        custom={3}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(task.deadline).toLocaleDateString()}</span>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Done Column */}
          <motion.div 
            className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10"
            variants={cardVariants}
            custom={5}
          >
            <motion.div 
              className="flex items-center justify-between mb-4"
              variants={waveRevealVariants}
              custom={0}
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold">Done</h3>
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                  {doneTasks.length}
                </span>
              </div>
            </motion.div>

            <div 
              className="space-y-3 min-h-[400px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'done')}
            >
              <AnimatePresence>
                {doneTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={cardVariants}
                    custom={index}
                    className={`bg-white/10 border border-white/20 rounded-xl p-4 cursor-pointer hover:bg-white/20 transition-all ${
                      draggedTask === task.id ? 'opacity-50' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => openEditModal(task)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskCompletion(task.id);
                          }}
                          className="p-1 hover:bg-white/20 rounded transition-colors"
                        >
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </button>
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getCategoryColor(task.category)}`} />
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>

                    <motion.h4 
                      className="font-semibold text-white mb-2 line-through opacity-75"
                      variants={contentRevealVariants}
                      custom={0}
                    >
                      {task.title}
                    </motion.h4>
                    
                    <motion.p 
                      className="text-sm text-gray-300 mb-3 line-through opacity-75"
                      variants={contentRevealVariants}
                      custom={1}
                    >
                      {task.description}
                    </motion.p>

                    <motion.div 
                      className="flex items-center justify-between text-xs text-gray-400"
                      variants={contentRevealVariants}
                      custom={2}
                    >
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(task.category)}
                        <span>{task.category}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{task.estimatedTime}m</span>
                      </div>
                    </motion.div>

                    {task.completedAt && (
                      <motion.div 
                        className="mt-2 text-xs text-green-400 flex items-center space-x-1"
                        variants={contentRevealVariants}
                        custom={3}
                      >
                        <Award className="w-3 h-3" />
                        <span>Completed {new Date(task.completedAt).toLocaleDateString()}</span>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Add/Edit Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-black/90 backdrop-blur-md rounded-2xl p-6 w-full max-w-md border border-white/20"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {isEditMode ? 'Edit Task' : 'Add New Task'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                ref={formRef}
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  if (isEditMode) {
                    updateTask(formData);
                  } else {
                    addTask(formData);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={currentTask?.title || ''}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Enter task title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    defaultValue={currentTask?.description || ''}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Enter task description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Priority</label>
                    <select
                      name="priority"
                      defaultValue={currentTask?.priority || 'medium'}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      name="category"
                      defaultValue={currentTask?.category || 'learning'}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="learning">Learning</option>
                      <option value="game">Game</option>
                      <option value="exercise">Exercise</option>
                      <option value="reading">Reading</option>
                      <option value="creative">Creative</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Estimated Time (min)</label>
                    <input
                      type="number"
                      name="estimatedTime"
                      defaultValue={currentTask?.estimatedTime || 15}
                      min="1"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Deadline</label>
                    <input
                      type="date"
                      name="deadline"
                      defaultValue={currentTask?.deadline ? currentTask.deadline.split('T')[0] : ''}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg text-white font-medium hover:from-violet-600 hover:to-purple-700 transition-all"
                  >
                    {isEditMode ? 'Update' : 'Add'} Task
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskManager; 