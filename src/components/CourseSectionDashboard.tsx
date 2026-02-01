// Course Section Dashboard - Grid view of bite-sized chunks within a section
// Provides visual, clickable navigation through pedagogically structured learning chunks

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  CheckCircle,
  Lock,
  Clock,
  Target,
  Lightbulb,
  BookOpen,
  Eye,
  PenTool,
  RefreshCw,
  Sparkles,
  Volume2,
  Image as ImageIcon,
  HelpCircle,
  Languages
} from 'lucide-react';
import type { CourseSection, CourseChunk } from '../types/LearningModule.types';

interface CourseSectionDashboardProps {
  section: CourseSection;
  sectionIndex: number;
  totalSections: number;
  isDarkMode: boolean;
  onChunkSelect: (chunkIndex: number) => void;
  onBack: () => void;
  onSectionComplete: () => void;
  completedChunks: Set<number>;
}

// Get icon for chunk type
const getChunkIcon = (type: CourseChunk['type']) => {
  switch (type) {
    case 'hook': return Sparkles;
    case 'concept': return Lightbulb;
    case 'example': return Target;
    case 'visual': return Eye;
    case 'practice': return PenTool;
    case 'recap': return RefreshCw;
    case 'quiz': return HelpCircle;
    case 'vocabulary': return Languages;
    default: return BookOpen;
  }
};

// Get gradient for chunk type
const getChunkGradient = (type: CourseChunk['type']) => {
  switch (type) {
    case 'hook': return 'from-amber-500 to-orange-500';
    case 'concept': return 'from-violet-500 to-purple-500';
    case 'example': return 'from-green-500 to-emerald-500';
    case 'visual': return 'from-cyan-500 to-blue-500';
    case 'practice': return 'from-pink-500 to-rose-500';
    case 'recap': return 'from-indigo-500 to-violet-500';
    case 'quiz': return 'from-yellow-500 to-amber-500';
    case 'vocabulary': return 'from-teal-500 to-cyan-500';
    default: return 'from-gray-500 to-slate-500';
  }
};

// Get friendly name for chunk type
const getChunkTypeName = (type: CourseChunk['type']) => {
  switch (type) {
    case 'hook': return 'Introduction';
    case 'concept': return 'Learn';
    case 'example': return 'Example';
    case 'visual': return 'Visualize';
    case 'practice': return 'Practice';
    case 'recap': return 'Review';
    case 'quiz': return 'Quiz';
    case 'vocabulary': return 'Vocabulary';
    default: return 'Learn';
  }
};

// Get interaction type label
const getInteractionLabel = (type: CourseChunk['interactionType']) => {
  switch (type) {
    case 'read': return 'Read';
    case 'watch': return 'Watch';
    case 'reflect': return 'Think';
    case 'try': return 'Try It';
    case 'quiz': return 'Quiz';
    default: return 'Learn';
  }
};

export const CourseSectionDashboard: React.FC<CourseSectionDashboardProps> = ({
  section,
  sectionIndex: _sectionIndex,
  totalSections: _totalSections,
  isDarkMode,
  onChunkSelect,
  onBack: _onBack,
  onSectionComplete: _onSectionComplete,
  completedChunks
}) => {
  // Props handled by parent header: _sectionIndex, _totalSections, _onBack, _onSectionComplete
  void _sectionIndex; void _totalSections; void _onBack; void _onSectionComplete;
  
  const chunks = section.chunks || [];

  // Batch unlock configuration
  const UNLOCK_BATCH_SIZE = 3; // How many chunks to unlock at once
  const COMPLETION_THRESHOLD = 2; // How many must be completed before next batch unlocks

  const isChunkUnlocked = (index: number): boolean => {
    // First batch (first UNLOCK_BATCH_SIZE chunks) is always unlocked
    if (index < UNLOCK_BATCH_SIZE) return true;
    
    // For subsequent chunks, determine which "batch" this chunk belongs to
    const batchNumber = Math.floor(index / UNLOCK_BATCH_SIZE);
    
    // Calculate how many chunks in ALL previous batches must be completed
    // User must complete at least COMPLETION_THRESHOLD from each previous batch
    const requiredCompleted = batchNumber * COMPLETION_THRESHOLD;
    
    // Count how many of the previous chunks are completed
    const previousChunksCompleted = Array.from({ length: index }, (_, i) => i)
      .filter(i => completedChunks.has(i)).length;
    
    // Unlock if user has completed enough previous chunks
    return previousChunksCompleted >= requiredCompleted;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chunks Grid - Header is now handled by parent GenerativeLearningModule */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chunks.map((chunk, index) => {
            const Icon = getChunkIcon(chunk.type);
            const gradient = getChunkGradient(chunk.type);
            const isCompleted = completedChunks.has(index);
            const isUnlocked = isChunkUnlocked(index);
            const isNext = !isCompleted && isUnlocked && !completedChunks.has(index);
            
            return (
              <motion.div
                key={chunk.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative rounded-xl overflow-hidden cursor-pointer transition-all group ${
                  isUnlocked 
                    ? 'hover:scale-[1.02] hover:shadow-lg' 
                    : 'opacity-60 cursor-not-allowed'
                } ${
                  isCompleted 
                    ? isDarkMode ? 'bg-green-500/10 border-2 border-green-500/30' : 'bg-green-50 border-2 border-green-200'
                    : isNext
                      ? isDarkMode ? 'bg-violet-500/10 border-2 border-violet-500/50 shadow-lg shadow-violet-500/20' : 'bg-violet-50 border-2 border-violet-300'
                      : isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
                }`}
                onClick={() => isUnlocked && onChunkSelect(index)}
              >
                {/* Chunk Header with Icon */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Status indicator */}
                      {isCompleted ? (
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      ) : !isUnlocked ? (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                          <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                      ) : isNext ? (
                        <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center animate-pulse">
                          <Play className="w-4 h-4 text-white ml-0.5" />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Chunk Type Badge */}
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${gradient} text-white`}>
                      {getChunkTypeName(chunk.type)}
                    </span>
                    {chunk.imageUrl && (
                      <span className={`px-2 py-0.5 rounded-full text-xs flex items-center space-x-1 ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        <ImageIcon className="w-3 h-3" />
                        <span>Visual</span>
                      </span>
                    )}
                  </div>

                  {/* Chunk Title */}
                  <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {chunk.title}
                  </h3>

                  {/* Key Point Preview */}
                  {chunk.keyPoint && (
                    <p className={`text-sm line-clamp-2 mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {chunk.keyPoint}
                    </p>
                  )}

                  {/* Chunk Footer */}
                  <div className={`flex items-center justify-between pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                    <div className={`flex items-center space-x-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <Clock className="w-3 h-3" />
                      <span>{Math.ceil((chunk.estimatedSeconds || 90) / 60)} min</span>
                    </div>
                    
                    <div className={`flex items-center space-x-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {chunk.ttsEnabled !== false && (
                        <Volume2 className="w-3 h-3" title="Audio available" />
                      )}
                      <span className="capitalize">{getInteractionLabel(chunk.interactionType)}</span>
                    </div>
                  </div>
                </div>

                {/* Next indicator */}
                {isNext && !isCompleted && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 opacity-50" />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Key Points Summary (shown at bottom) */}
        {section.keyPoints && section.keyPoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`mt-8 p-5 rounded-xl ${isDarkMode ? 'bg-violet-500/10 border border-violet-500/30' : 'bg-violet-50 border border-violet-200'}`}
          >
            <h4 className={`font-semibold mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-violet-300' : 'text-violet-800'}`}>
              <Target className="w-5 h-5" />
              <span>What You'll Learn in This Section</span>
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {section.keyPoints.map((point, index) => (
                <li 
                  key={index}
                  className={`flex items-start space-x-2 text-sm ${isDarkMode ? 'text-violet-200' : 'text-violet-700'}`}
                >
                  <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${completedChunks.size > index ? 'text-green-500' : 'text-violet-400'}`} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CourseSectionDashboard;

