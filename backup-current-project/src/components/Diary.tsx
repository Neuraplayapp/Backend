import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  Star, 
  Heart,
  Brain,
  Target,
  TrendingUp,
  Award,
  X,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Smile,
  Frown,
  Meh,
  Zap,
  Lightbulb,
  Bookmark,
  Share2
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: 'happy' | 'sad' | 'neutral' | 'excited' | 'frustrated';
  tags: string[];
  learningReflection?: string;
  goals?: string[];
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DiaryProps {
  onClose?: () => void;
}

const Diary: React.FC<DiaryProps> = ({ onClose }) => {
  const { user } = useUser();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<DiaryEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 5;

  // Load entries from localStorage
  useEffect(() => {
    const savedEntries = localStorage.getItem('diary-entries');
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    } else {
      // Default entries
      const defaultEntries: DiaryEntry[] = [
        {
          id: 'default1',
          date: new Date().toISOString().split('T')[0],
          title: 'My Learning Journey Begins',
          content: 'Today I started my learning journey with NeuraPlay. I\'m excited to explore new cognitive exercises and improve my mental skills. The platform seems really intuitive and engaging!',
          mood: 'excited',
          tags: ['learning', 'beginning', 'excitement'],
          learningReflection: 'I learned that I enjoy interactive learning more than passive reading.',
          goals: ['Complete 3 games this week', 'Improve memory skills'],
          isPrivate: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'default2',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          title: 'Memory Game Challenge',
          content: 'Tried the memory sequence game today. It was challenging but fun! I managed to remember 5 items in sequence. Need to practice more to improve.',
          mood: 'happy',
          tags: ['memory', 'game', 'challenge'],
          learningReflection: 'Visual memory is my strength, but I need to work on auditory memory.',
          goals: ['Reach 7 items in memory sequence'],
          isPrivate: false,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      setEntries(defaultEntries);
      localStorage.setItem('diary-entries', JSON.stringify(defaultEntries));
    }
  }, []);

  // Save entries to localStorage
  useEffect(() => {
    localStorage.setItem('diary-entries', JSON.stringify(entries));
  }, [entries]);

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'happy': return <Smile className="w-5 h-5 text-green-400" />;
      case 'excited': return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'sad': return <Frown className="w-5 h-5 text-blue-400" />;
      case 'frustrated': return <Target className="w-5 h-5 text-red-400" />;
      case 'neutral': return <Meh className="w-5 h-5 text-gray-400" />;
      default: return <Meh className="w-5 h-5 text-gray-400" />;
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'happy': return 'from-green-500 to-emerald-500';
      case 'excited': return 'from-yellow-500 to-orange-500';
      case 'sad': return 'from-blue-500 to-cyan-500';
      case 'frustrated': return 'from-red-500 to-pink-500';
      case 'neutral': return 'from-gray-500 to-slate-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const openModal = () => {
    setIsEditMode(false);
    setCurrentEntry(null);
    setIsModalOpen(true);
  };

  const openEditModal = (entry: DiaryEntry) => {
    setIsEditMode(true);
    setCurrentEntry(entry);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setCurrentEntry(null);
  };

  const addEntry = (formData: FormData) => {
    const newEntry: DiaryEntry = {
      id: Date.now().toString(),
      date: formData.get('date') as string,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      mood: (formData.get('mood') as any) || 'neutral',
      tags: (formData.get('tags') as string).split(',').map(tag => tag.trim()).filter(tag => tag),
      learningReflection: formData.get('learningReflection') as string,
      goals: (formData.get('goals') as string).split(',').map(goal => goal.trim()).filter(goal => goal),
      isPrivate: formData.get('isPrivate') === 'true',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setEntries(prev => [newEntry, ...prev]);
    closeModal();
  };

  const updateEntry = (formData: FormData) => {
    if (!currentEntry) return;

    const updatedEntry: DiaryEntry = {
      ...currentEntry,
      date: formData.get('date') as string,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      mood: (formData.get('mood') as any) || 'neutral',
      tags: (formData.get('tags') as string).split(',').map(tag => tag.trim()).filter(tag => tag),
      learningReflection: formData.get('learningReflection') as string,
      goals: (formData.get('goals') as string).split(',').map(goal => goal.trim()).filter(goal => goal),
      isPrivate: formData.get('isPrivate') === 'true',
      updatedAt: new Date().toISOString()
    };

    setEntries(prev => prev.map(entry => 
      entry.id === currentEntry.id ? updatedEntry : entry
    ));
    closeModal();
  };

  const deleteEntry = (entryId: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== entryId));
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesMood = selectedMood === 'all' || entry.mood === selectedMood;
    return matchesSearch && matchesMood;
  });

  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white p-6">
      <motion.div 
        className="max-w-6xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Learning Diary</h1>
              <p className="text-gray-300">Reflect on your learning journey</p>
            </div>
          </div>
          
          <motion.button
            onClick={openModal}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-violet-600 hover:to-purple-700 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>New Entry</span>
          </motion.button>
        </div>

        {/* Search and Filters */}
        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            <select
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Moods</option>
              <option value="happy">Happy</option>
              <option value="excited">Excited</option>
              <option value="neutral">Neutral</option>
              <option value="sad">Sad</option>
              <option value="frustrated">Frustrated</option>
            </select>
          </div>
        </div>

        {/* Entries */}
        <div className="space-y-4">
          {paginatedEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-black/30 transition-all cursor-pointer"
              onClick={() => openEditModal(entry)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getMoodIcon(entry.mood)}
                  <div>
                    <h3 className="text-xl font-semibold">{entry.title}</h3>
                    <p className="text-sm text-gray-400">{new Date(entry.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {entry.isPrivate && (
                    <div className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                      Private
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEntry(entry.id);
                    }}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              <p className="text-gray-300 mb-4 leading-relaxed">{entry.content}</p>

              {entry.learningReflection && (
                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">Learning Reflection</span>
                  </div>
                  <p className="text-sm text-gray-300">{entry.learningReflection}</p>
                </div>
              )}

              {entry.goals && entry.goals.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">Goals</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.goals.map((goal, idx) => (
                      <span key={idx} className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-violet-500/20 text-violet-400 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(entry.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          ))}

          {paginatedEntries.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No entries found</p>
              <p className="text-sm">Start writing your learning journey!</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <span className="text-sm text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </motion.div>

      {/* Add/Edit Entry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">
                  {isEditMode ? 'Edit Entry' : 'New Diary Entry'}
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
                    updateEntry(formData);
                  } else {
                    addEntry(formData);
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <input
                      type="date"
                      name="date"
                      defaultValue={currentEntry?.date || new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Mood</label>
                    <select
                      name="mood"
                      defaultValue={currentEntry?.mood || 'neutral'}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="happy">Happy</option>
                      <option value="excited">Excited</option>
                      <option value="neutral">Neutral</option>
                      <option value="sad">Sad</option>
                      <option value="frustrated">Frustrated</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={currentEntry?.title || ''}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <textarea
                    name="content"
                    defaultValue={currentEntry?.content || ''}
                    rows={6}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Learning Reflection (Optional)</label>
                  <textarea
                    name="learningReflection"
                    defaultValue={currentEntry?.learningReflection || ''}
                    rows={3}
                    placeholder="What did you learn today? What insights did you gain?"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Goals (Optional)</label>
                  <textarea
                    name="goals"
                    defaultValue={currentEntry?.goals?.join(', ') || ''}
                    rows={2}
                    placeholder="Enter goals separated by commas"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tags (Optional)</label>
                  <input
                    type="text"
                    name="tags"
                    defaultValue={currentEntry?.tags?.join(', ') || ''}
                    placeholder="Enter tags separated by commas"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="isPrivate"
                    id="isPrivate"
                    defaultChecked={currentEntry?.isPrivate || false}
                    className="w-4 h-4 text-violet-500 bg-white/10 border-white/20 rounded focus:ring-violet-500"
                  />
                  <label htmlFor="isPrivate" className="text-sm text-gray-300">
                    Make this entry private
                  </label>
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
                    {isEditMode ? 'Update' : 'Add'} Entry
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

export default Diary; 