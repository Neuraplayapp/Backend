// Step Content Renderer - Breaks down step content into digestible sub-sections
// Provides interactive, formatted learning experience with progress tracking

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Lightbulb,
  Target,
  Play,
  PauseCircle,
  Volume2,
  VolumeX
} from 'lucide-react';
import EducationalMarkdownRenderer from './EducationalMarkdownRenderer';

interface SubSection {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  estimatedMinutes: number;
  type: 'overview' | 'concept' | 'example' | 'practice' | 'summary';
  isCompleted: boolean;
}

interface StepContentRendererProps {
  stepTitle: string;
  stepType: string;
  content: string;
  keyPoints: string[];
  estimatedMinutes: number;
  imageUrl?: string;
  isDarkMode: boolean;
  onSubSectionComplete?: (subSectionIndex: number) => void;
  onStepComplete?: () => void;
}

// Parse content into logical sub-sections
function parseContentIntoSubSections(content: string, stepType: string): SubSection[] {
  const subSections: SubSection[] = [];
  
  // Split content by paragraph breaks or natural section indicators
  const paragraphs = content
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 50); // Only meaningful paragraphs
  
  if (paragraphs.length === 0) {
    // Fallback: split by sentences into chunks
    const sentences = content.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    sentences.forEach(sentence => {
      if ((currentChunk + sentence).length > 400) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    });
    if (currentChunk) chunks.push(currentChunk.trim());
    
    return chunks.map((chunk, index) => ({
      id: `subsection_${index}`,
      title: getSubSectionTitle(index, chunks.length, stepType),
      content: chunk,
      wordCount: chunk.split(/\s+/).length,
      estimatedMinutes: Math.max(1, Math.ceil(chunk.split(/\s+/).length / 200)),
      type: getSubSectionType(index, chunks.length),
      isCompleted: false
    }));
  }
  
  // Group paragraphs into logical sections (2-3 paragraphs each)
  const sectionsCount = Math.min(Math.max(2, Math.ceil(paragraphs.length / 2)), 5);
  const paragraphsPerSection = Math.ceil(paragraphs.length / sectionsCount);
  
  for (let i = 0; i < sectionsCount; i++) {
    const start = i * paragraphsPerSection;
    const end = Math.min(start + paragraphsPerSection, paragraphs.length);
    const sectionParagraphs = paragraphs.slice(start, end);
    const sectionContent = sectionParagraphs.join('\n\n');
    const wordCount = sectionContent.split(/\s+/).length;
    
    subSections.push({
      id: `subsection_${i}`,
      title: getSubSectionTitle(i, sectionsCount, stepType),
      content: sectionContent,
      wordCount,
      estimatedMinutes: Math.max(1, Math.ceil(wordCount / 200)), // ~200 words per minute reading
      type: getSubSectionType(i, sectionsCount),
      isCompleted: false
    });
  }
  
  return subSections;
}

function getSubSectionTitle(index: number, total: number, stepType: string): string {
  const titles: Record<string, string[]> = {
    'introduction': ['Getting Started', 'The Foundation', 'Core Ideas', 'Moving Forward', 'Key Concepts'],
    'core_concept': ['Understanding the Basics', 'Deep Dive', 'Key Principles', 'Putting It Together', 'Mastery Check'],
    'example': ['Setting the Scene', 'Practical Walkthrough', 'Real-World Application', 'Try It Yourself', 'Lessons Learned'],
    'practice': ['Warm-Up', 'Building Skills', 'Challenge Mode', 'Apply Your Knowledge', 'Reflection'],
    'summary': ['Quick Recap', 'Key Takeaways', 'What You Learned', 'Next Steps', 'Final Thoughts']
  };
  
  const typeKey = stepType in titles ? stepType : 'core_concept';
  const titleList = titles[typeKey];
  return titleList[Math.min(index, titleList.length - 1)];
}

function getSubSectionType(index: number, total: number): SubSection['type'] {
  if (index === 0) return 'overview';
  if (index === total - 1) return 'summary';
  if (index === 1) return 'concept';
  if (index === 2) return 'example';
  return 'practice';
}

function getSubSectionIcon(type: SubSection['type']) {
  switch (type) {
    case 'overview': return BookOpen;
    case 'concept': return Lightbulb;
    case 'example': return Target;
    case 'practice': return Play;
    case 'summary': return CheckCircle;
    default: return BookOpen;
  }
}

function getSubSectionColor(type: SubSection['type']): string {
  switch (type) {
    case 'overview': return 'from-blue-500 to-cyan-500';
    case 'concept': return 'from-violet-500 to-purple-500';
    case 'example': return 'from-green-500 to-emerald-500';
    case 'practice': return 'from-orange-500 to-amber-500';
    case 'summary': return 'from-pink-500 to-rose-500';
    default: return 'from-gray-500 to-slate-500';
  }
}

export const StepContentRenderer: React.FC<StepContentRendererProps> = ({
  stepTitle,
  stepType,
  content,
  keyPoints,
  estimatedMinutes,
  imageUrl,
  isDarkMode,
  onSubSectionComplete,
  onStepComplete
}) => {
  const [currentSubSection, setCurrentSubSection] = useState(0);
  const [completedSubSections, setCompletedSubSections] = useState<Set<number>>(new Set());
  const [isReading, setIsReading] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  
  // Parse content into sub-sections
  const subSections = useMemo(() => 
    parseContentIntoSubSections(content, stepType),
    [content, stepType]
  );
  
  const currentContent = subSections[currentSubSection];
  const totalSubSections = subSections.length;
  const completionPercentage = Math.round((completedSubSections.size / totalSubSections) * 100);
  
  // Calculate total reading time
  const totalReadingTime = useMemo(() => 
    subSections.reduce((acc, s) => acc + s.estimatedMinutes, 0),
    [subSections]
  );
  
  // Auto-progress reading timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isReading && currentContent) {
      const duration = currentContent.estimatedMinutes * 60 * 1000; // Convert to ms
      const increment = 100 / (duration / 100); // Update every 100ms
      
      interval = setInterval(() => {
        setReadingProgress(prev => {
          if (prev >= 100) {
            setIsReading(false);
            return 100;
          }
          return prev + increment;
        });
      }, 100);
    }
    
    return () => clearInterval(interval);
  }, [isReading, currentContent]);
  
  // Mark sub-section as completed
  const handleCompleteSubSection = useCallback(() => {
    const newCompleted = new Set(completedSubSections);
    newCompleted.add(currentSubSection);
    setCompletedSubSections(newCompleted);
    onSubSectionComplete?.(currentSubSection);
    
    // Auto-advance if not last section
    if (currentSubSection < totalSubSections - 1) {
      setCurrentSubSection(prev => prev + 1);
      setReadingProgress(0);
    } else if (newCompleted.size === totalSubSections) {
      onStepComplete?.();
    }
  }, [currentSubSection, completedSubSections, totalSubSections, onSubSectionComplete, onStepComplete]);
  
  const handlePrevSubSection = () => {
    if (currentSubSection > 0) {
      setCurrentSubSection(prev => prev - 1);
      setReadingProgress(0);
    }
  };
  
  const handleNextSubSection = () => {
    if (currentSubSection < totalSubSections - 1) {
      // Mark current as completed when moving forward
      if (!completedSubSections.has(currentSubSection)) {
        handleCompleteSubSection();
      } else {
        setCurrentSubSection(prev => prev + 1);
        setReadingProgress(0);
      }
    } else {
      handleCompleteSubSection();
    }
  };
  
  const Icon = getSubSectionIcon(currentContent?.type || 'overview');
  const colorClass = getSubSectionColor(currentContent?.type || 'overview');
  
  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Sub-Section Progress Bar - Sticky on PC for scroll context */}
      <div className={`p-4 rounded-xl lg:sticky lg:top-0 lg:z-10 lg:backdrop-blur-sm ${isDarkMode ? 'bg-white/5 lg:bg-slate-900/80' : 'bg-gray-50 lg:bg-white/80'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-sm lg:text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {totalReadingTime} min total • Part {currentSubSection + 1} of {totalSubSections}
            </span>
          </div>
          <span className={`text-sm lg:text-base font-medium ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>
            {completionPercentage}% complete
          </span>
        </div>
        
        {/* Section Progress Dots */}
        <div className="flex items-center space-x-2">
          {subSections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => {
                setCurrentSubSection(index);
                setReadingProgress(0);
              }}
              className={`flex-1 h-2 lg:h-2.5 rounded-full transition-all ${
                completedSubSections.has(index)
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : index === currentSubSection
                    ? `bg-gradient-to-r ${colorClass}`
                    : isDarkMode ? 'bg-white/10' : 'bg-gray-200'
              }`}
              title={section.title}
            />
          ))}
        </div>
      </div>
      
      {/* Current Sub-Section Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSubSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Sub-Section Header - Larger on PC */}
          <div className="flex items-center space-x-3 lg:space-x-4">
            <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-r ${colorClass} flex items-center justify-center`}>
              <Icon className="w-5 h-5 lg:w-7 lg:h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className={`text-xl lg:text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {currentContent?.title}
                </h3>
                {completedSubSections.has(currentSubSection) && (
                  <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" />
                )}
              </div>
              <p className={`text-sm lg:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentContent?.wordCount} words • ~{currentContent?.estimatedMinutes} min read
              </p>
            </div>
          </div>
          
          {/* Reading Progress (optional timer mode) */}
          {isReading && (
            <div className={`h-1 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
              <motion.div
                className={`h-1 rounded-full bg-gradient-to-r ${colorClass}`}
                initial={{ width: 0 }}
                animate={{ width: `${readingProgress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          )}
          
          {/* Content - Rendered with EducationalMarkdownRenderer for proper formatting */}
          <div className="prose prose-lg lg:prose-xl max-w-none">
            <EducationalMarkdownRenderer 
              content={currentContent?.content || ''}
              isDarkMode={isDarkMode}
              className="text-base lg:text-lg leading-relaxed lg:leading-loose"
            />
          </div>
          
          {/* Key Points (only show in last sub-section) */}
          {currentSubSection === totalSubSections - 1 && keyPoints && keyPoints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`p-5 rounded-xl border ${
                isDarkMode 
                  ? 'bg-violet-500/10 border-violet-500/30' 
                  : 'bg-violet-50 border-violet-200'
              }`}
            >
              <h4 className={`font-semibold mb-3 flex items-center space-x-2 ${
                isDarkMode ? 'text-violet-300' : 'text-violet-800'
              }`}>
                <Target className="w-5 h-5" />
                <span>Key Takeaways</span>
              </h4>
              <ul className="space-y-2">
                {keyPoints.map((point, index) => (
                  <li 
                    key={index} 
                    className={`flex items-start space-x-2 text-sm ${
                      isDarkMode ? 'text-violet-200' : 'text-violet-700'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Navigation Controls - Simplified on PC, sticky at bottom */}
      <div className={`flex items-center justify-between pt-4 lg:pt-6 border-t lg:sticky lg:bottom-0 lg:pb-4 lg:backdrop-blur-sm ${isDarkMode ? 'border-white/10 lg:bg-slate-900/80' : 'border-gray-200 lg:bg-white/80'}`}>
        {/* Previous - Icon only on mobile, with text on PC */}
        <button
          onClick={handlePrevSubSection}
          disabled={currentSubSection === 0}
          className={`flex items-center space-x-2 px-3 py-2 lg:px-5 lg:py-3 rounded-lg lg:rounded-xl transition-all ${
            currentSubSection === 0
              ? 'opacity-50 cursor-not-allowed'
              : isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
          <span className="hidden lg:inline">Previous</span>
        </button>
        
        {/* Center - Reading timer (mobile) or progress indicator (PC) */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Reading Mode Toggle - visible on mobile */}
          <button
            onClick={() => setIsReading(!isReading)}
            className={`p-2 rounded-lg transition-all lg:hidden ${
              isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
            title={isReading ? 'Pause reading timer' : 'Start reading timer'}
          >
            {isReading ? (
              <PauseCircle className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
          
          {/* PC: Show current position text */}
          <span className={`hidden lg:block text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {currentSubSection + 1} of {totalSubSections}
          </span>
        </div>
        
        {/* Next/Complete button - larger on PC */}
        <button
          onClick={handleNextSubSection}
          className={`flex items-center space-x-2 px-5 py-2 lg:px-8 lg:py-3 rounded-lg lg:rounded-xl transition-all bg-gradient-to-r ${colorClass} text-white hover:opacity-90 shadow-lg lg:text-lg lg:font-medium`}
        >
          <span>
            {currentSubSection === totalSubSections - 1 
              ? (completedSubSections.has(currentSubSection) ? 'Complete' : 'Mark Complete')
              : 'Continue'
            }
          </span>
          <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
        </button>
      </div>
    </div>
  );
};

export default StepContentRenderer;




