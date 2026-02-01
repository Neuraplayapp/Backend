import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  Target, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Star,
  Brain,
  Trophy,
  Gamepad2,
  FileText,
  Palette,
  Zap,
  Award
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface StudySession {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'learning' | 'game' | 'exercise' | 'reading' | 'creative' | 'review';
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  notes?: string;
  moduleId?: string;
}

interface StudyCalendarProps {
  onClose?: () => void;
}

const StudyCalendar: React.FC<StudyCalendarProps> = ({ onClose }) => {
  const { user } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Load sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('study-sessions');
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem('study-sessions', JSON.stringify(sessions));
  }, [sessions]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay };
  };

  const getSessionsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return sessions.filter(session => session.date === dateString);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'learning': return <Brain className="w-4 h-4" />;
      case 'game': return <Gamepad2 className="w-4 h-4" />;
      case 'exercise': return <Target className="w-4 h-4" />;
      case 'reading': return <FileText className="w-4 h-4" />;
      case 'creative': return <Palette className="w-4 h-4" />;
      case 'review': return <BookOpen className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'learning': return 'from-blue-500 to-cyan-500';
      case 'game': return 'from-purple-500 to-pink-500';
      case 'exercise': return 'from-green-500 to-emerald-500';
      case 'reading': return 'from-orange-500 to-red-500';
      case 'creative': return 'from-pink-500 to-rose-500';
      case 'review': return 'from-yellow-500 to-amber-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const openModal = (date?: Date) => {
    setIsEditMode(false);
    setCurrentSession(null);
    if (date) {
      setSelectedDate(date);
    }
    setIsModalOpen(true);
  };

  const openEditModal = (session: StudySession) => {
    setIsEditMode(true);
    setCurrentSession(session);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setCurrentSession(null);
  };

  const addSession = (formData: FormData) => {
    const newSession: StudySession = {
      id: Date.now().toString(),
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      type: (formData.get('type') as any) || 'learning',
      priority: (formData.get('priority') as any) || 'medium',
      isCompleted: false,
      notes: formData.get('notes') as string,
      moduleId: formData.get('moduleId') as string
    };

    setSessions(prev => [...prev, newSession]);
    closeModal();
  };

  const updateSession = (formData: FormData) => {
    if (!currentSession) return;

    const updatedSession: StudySession = {
      ...currentSession,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      type: (formData.get('type') as any) || 'learning',
      priority: (formData.get('priority') as any) || 'medium',
      notes: formData.get('notes') as string,
      moduleId: formData.get('moduleId') as string
    };

    setSessions(prev => prev.map(session => 
      session.id === currentSession.id ? updatedSession : session
    ));
    closeModal();
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
  };

  const toggleSessionCompletion = (sessionId: string) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, isCompleted: !session.isCompleted }
        : session
    ));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white p-6">
      <motion.div 
        className="max-w-7xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Study Calendar</h1>
              <p className="text-gray-300">Plan and track your learning sessions</p>
            </div>
          </div>
          
          <motion.button
            onClick={() => openModal()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-violet-600 hover:to-purple-700 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>Add Session</span>
          </motion.button>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <h2 className="text-2xl font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-center font-semibold text-gray-300 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for days before the first day of the month */}
            {Array.from({ length: startingDay }, (_, i) => (
              <div key={`empty-${i}`} className="h-32 bg-white/5 rounded-lg"></div>
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const daySessions = getSessionsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

              return (
                <motion.div
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  className={`h-32 bg-white/10 rounded-lg p-2 cursor-pointer transition-all hover:bg-white/20 ${
                    isToday ? 'ring-2 ring-violet-500' : ''
                  } ${isSelected ? 'bg-violet-500/20' : ''}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${isToday ? 'text-violet-400' : ''}`}>
                      {day}
                    </span>
                    {daySessions.length > 0 && (
                      <span className="bg-violet-500 text-white text-xs px-1 rounded-full">
                        {daySessions.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {daySessions.slice(0, 2).map(session => (
                      <div
                        key={session.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(session);
                        }}
                        className={`text-xs p-1 rounded ${
                          session.isCompleted 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-violet-500/20 text-violet-400'
                        } cursor-pointer hover:opacity-80`}
                      >
                        <div className="flex items-center space-x-1">
                          {getTypeIcon(session.type)}
                          <span className="truncate">{session.title}</span>
                        </div>
                      </div>
                    ))}
                    {daySessions.length > 2 && (
                      <div className="text-xs text-gray-400 text-center">
                        +{daySessions.length - 2} more
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Sessions */}
        {selectedDate && (
          <motion.div 
            className="mt-6 bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                Sessions for {selectedDate.toLocaleDateString()}
              </h3>
              <button
                onClick={() => openModal(selectedDate)}
                className="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 rounded-lg text-sm font-medium hover:from-violet-600 hover:to-purple-700 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {getSessionsForDate(selectedDate).map(session => (
                <motion.div
                  key={session.id}
                  className={`p-4 rounded-lg border ${
                    session.isCompleted 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-white/10 border-white/20'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <button
                          onClick={() => toggleSessionCompletion(session.id)}
                          className="p-1 hover:bg-white/20 rounded transition-colors"
                        >
                          {session.isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getTypeColor(session.type)}`} />
                        <h4 className={`font-semibold ${session.isCompleted ? 'line-through opacity-75' : ''}`}>
                          {session.title}
                        </h4>
                        <span className={`text-xs ${getPriorityColor(session.priority)}`}>
                          {session.priority}
                        </span>
                      </div>
                      
                      <p className={`text-sm text-gray-300 mb-2 ${session.isCompleted ? 'line-through opacity-75' : ''}`}>
                        {session.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{session.startTime} - {session.endTime}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {getTypeIcon(session.type)}
                          <span>{session.type}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors ml-2"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </motion.div>
              ))}
              
              {getSessionsForDate(selectedDate).length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No sessions scheduled for this date</p>
                  <button
                    onClick={() => openModal(selectedDate)}
                    className="mt-2 text-violet-400 hover:text-violet-300"
                  >
                    Add your first session
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Add/Edit Session Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">
                  {isEditMode ? 'Edit Session' : 'Add Study Session'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  if (isEditMode) {
                    updateSession(formData);
                  } else {
                    addSession(formData);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={currentSession?.title || ''}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    defaultValue={currentSession?.description || ''}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <input
                      type="date"
                      name="date"
                      defaultValue={currentSession?.date || selectedDate?.toISOString().split('T')[0] || ''}
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select
                      name="type"
                      defaultValue={currentSession?.type || 'learning'}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="learning">Learning</option>
                      <option value="game">Game</option>
                      <option value="exercise">Exercise</option>
                      <option value="reading">Reading</option>
                      <option value="creative">Creative</option>
                      <option value="review">Review</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      defaultValue={currentSession?.startTime || ''}
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">End Time</label>
                    <input
                      type="time"
                      name="endTime"
                      defaultValue={currentSession?.endTime || ''}
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select
                    name="priority"
                    defaultValue={currentSession?.priority || 'medium'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                  <textarea
                    name="notes"
                    defaultValue={currentSession?.notes || ''}
                    rows={2}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
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
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg font-medium hover:from-violet-600 hover:to-purple-700 transition-all"
                  >
                    {isEditMode ? 'Update' : 'Add'} Session
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

export default StudyCalendar; 