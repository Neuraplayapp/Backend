// Mobile Course Generator - Optimized for performance
// No framer-motion, CSS transitions only, memoized components

import React, { useState, useCallback, useMemo, memo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  ChevronDown, ChevronRight, Plus, BookOpen, Send, Loader2,
  CheckCircle, XCircle, GraduationCap, X
} from 'lucide-react';

// Types
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  keyPoints?: string[];
  quiz?: QuizQuestion[];
}

interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  subject: string;
  modules: Module[];
}

interface QuizState {
  lessonId: string;
  current: number;
  answers: number[];
  done: boolean;
}

// Memoized Module Card
const ModuleCard = memo<{
  module: Module;
  index: number;
  isExpanded: boolean;
  expandedLessons: Set<string>;
  onToggle: () => void;
  onToggleLesson: (id: string) => void;
  onStartQuiz: (id: string) => void;
  isDark: boolean;
}>(({ module, index, isExpanded, expandedLessons, onToggle, onToggleLesson, onStartQuiz, isDark }) => {
  const bg = isDark ? 'bg-neutral-900' : 'bg-white';
  const border = isDark ? 'border-neutral-800' : 'border-stone-200';
  const text = isDark ? 'text-neutral-100' : 'text-stone-900';
  const textSec = isDark ? 'text-neutral-400' : 'text-stone-500';
  
  return (
    <div className={`${bg} border ${border} rounded-xl overflow-hidden`}>
      <button 
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between text-left active:bg-neutral-800/30"
      >
        <div className="flex items-center gap-2">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium ${isDark ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
            {index + 1}
          </span>
          <span className={`text-sm font-medium ${text}`}>{module.title}</span>
        </div>
        {isExpanded 
          ? <ChevronDown className={`w-4 h-4 ${textSec}`} />
          : <ChevronRight className={`w-4 h-4 ${textSec}`} />
        }
      </button>
      
      {isExpanded && (
        <div className={`border-t ${border} p-2 space-y-1`}>
          {module.lessons.map((lesson, li) => {
            const lessonExpanded = expandedLessons.has(lesson.id);
            return (
              <div key={lesson.id} className={`border ${border} rounded-lg overflow-hidden`}>
                <button 
                  onClick={() => onToggleLesson(lesson.id)}
                  className="w-full p-2.5 flex items-center justify-between text-left active:bg-neutral-800/20"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-stone-200 text-stone-600'}`}>
                      {li + 1}
                    </span>
                    <span className={`text-xs ${text}`}>{lesson.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {lesson.quiz && lesson.quiz.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>Quiz</span>
                    )}
                    {lessonExpanded ? <ChevronDown className={`w-3 h-3 ${textSec}`} /> : <ChevronRight className={`w-3 h-3 ${textSec}`} />}
                  </div>
                </button>
                
                {lessonExpanded && (
                  <div className={`p-3 border-t ${border} ${isDark ? 'bg-neutral-800/30' : 'bg-stone-50'}`}>
                    <p className={`text-xs ${textSec} leading-relaxed`}>{lesson.content}</p>
                    
                    {lesson.keyPoints && lesson.keyPoints.length > 0 && (
                      <div className="mt-3">
                        <p className={`text-[10px] font-medium ${text} uppercase mb-1`}>Key Points</p>
                        {lesson.keyPoints.map((kp, i) => (
                          <p key={i} className={`text-xs ${textSec} flex items-start gap-1 mt-1`}>
                            <CheckCircle className={`w-3 h-3 ${isDark ? 'text-purple-400' : 'text-purple-600'} flex-shrink-0 mt-0.5`} />
                            {kp}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    {lesson.quiz && lesson.quiz.length > 0 && (
                      <button
                        onClick={() => onStartQuiz(lesson.id)}
                        className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white ${isDark ? 'bg-purple-600 active:bg-purple-500' : 'bg-purple-600 active:bg-purple-700'}`}
                      >
                        <GraduationCap className="w-3 h-3" />
                        Quiz ({lesson.quiz.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

ModuleCard.displayName = 'ModuleCard';

// Main Component
const MobileCourseGenerator: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  // Generate course
  const generateCourse = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    const subject = prompt.trim();

    try {
      const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
      const router = UnifiedAPIRouter.getInstance();

      const response = await router.routeAPICall('llm', 'chat-completion', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an encouraging teacher. Generate a course as JSON: {"modules":[{"title":"...","description":"...","lessons":[{"title":"...","content":"...","keyPoints":["..."],"quiz":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}]}]}. Create 6 modules with 2 lessons each.' },
          { role: 'user', content: `Create a course for: ${subject}` }
        ],
        temperature: 0.7,
        max_tokens: 3000
      });

      let modules: Module[] = [];
      if (response?.choices?.[0]?.message?.content) {
        try {
          const match = response.choices[0].message.content.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            modules = (parsed.modules || []).map((m: any, mi: number) => ({
              id: `m${Date.now()}-${mi}`,
              title: m.title || `Module ${mi + 1}`,
              description: m.description || '',
              lessons: (m.lessons || []).map((l: any, li: number) => ({
                id: `l${Date.now()}-${mi}-${li}`,
                title: l.title || `Lesson ${li + 1}`,
                content: l.content || '',
                keyPoints: l.keyPoints || [],
                quiz: (l.quiz || []).map((q: any, qi: number) => ({
                  id: `q${Date.now()}-${mi}-${li}-${qi}`,
                  question: q.question || '',
                  options: q.options || [],
                  correctIndex: q.correctIndex || 0,
                  explanation: q.explanation || ''
                }))
              }))
            }));
          }
        } catch { /* fallback below */ }
      }

      // Fallback
      if (modules.length === 0) {
        modules = Array.from({ length: 6 }, (_, i) => ({
          id: `m${Date.now()}-${i}`,
          title: ['Introduction', 'Core Concepts', 'Techniques', 'Application', 'Advanced', 'Mastery'][i],
          description: `Module ${i + 1} of ${subject}`,
          lessons: [
            { id: `l${Date.now()}-${i}-0`, title: 'Understanding Basics', content: `Learn the fundamentals of ${subject}.`, keyPoints: ['Key concept 1', 'Key concept 2'], quiz: [{ id: `q${Date.now()}-${i}-0`, question: 'What is important?', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'A is correct.' }] },
            { id: `l${Date.now()}-${i}-1`, title: 'Practical Steps', content: `Apply ${subject} in practice.`, keyPoints: ['Step 1', 'Step 2'], quiz: [] }
          ]
        }));
      }

      const newCourse: Course = { id: `c${Date.now()}`, subject, modules };
      setCourses(prev => [newCourse, ...prev]);
      setSelectedCourse(newCourse);
      setPrompt('');
      setExpandedModules(new Set([modules[0]?.id]));
    } catch (e) {
      console.error('Generate failed:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating]);

  const toggleModule = useCallback((id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleLesson = useCallback((id: string) => {
    setExpandedLessons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const getQuiz = useCallback((lessonId: string): QuizQuestion[] => {
    if (!selectedCourse) return [];
    for (const m of selectedCourse.modules) {
      for (const l of m.lessons) {
        if (l.id === lessonId) return l.quiz || [];
      }
    }
    return [];
  }, [selectedCourse]);

  const startQuiz = useCallback((lessonId: string) => {
    setQuiz({ lessonId, current: 0, answers: [], done: false });
  }, []);

  const answerQuiz = useCallback((idx: number) => {
    if (!quiz) return;
    const questions = getQuiz(quiz.lessonId);
    const newAnswers = [...quiz.answers, idx];
    if (newAnswers.length >= questions.length) {
      setQuiz({ ...quiz, answers: newAnswers, done: true });
    } else {
      setQuiz({ ...quiz, answers: newAnswers, current: quiz.current + 1 });
    }
  }, [quiz, getQuiz]);

  // Colors
  const bg = isDarkMode ? 'bg-neutral-950' : 'bg-stone-50';
  const cardBg = isDarkMode ? 'bg-neutral-900' : 'bg-white';
  const border = isDarkMode ? 'border-neutral-800' : 'border-stone-200';
  const text = isDarkMode ? 'text-neutral-100' : 'text-stone-900';
  const textSec = isDarkMode ? 'text-neutral-400' : 'text-stone-500';

  // Quiz Modal
  const quizQuestions = quiz ? getQuiz(quiz.lessonId) : [];
  const currentQ = quiz && !quiz.done ? quizQuestions[quiz.current] : null;

  return (
    <div className={`h-full flex flex-col ${bg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-3 border-b ${border} ${cardBg}`}>
        <div className="flex items-center gap-2">
          <BookOpen className={`w-5 h-5 ${textSec}`} />
          <span className={`text-sm font-medium ${text}`}>Courses</span>
        </div>
        <button 
          onClick={() => setShowLibrary(!showLibrary)}
          className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-neutral-800' : 'bg-stone-100'} ${text}`}
        >
          {showLibrary ? 'Close' : `Library (${courses.length})`}
        </button>
      </div>

      {/* Library Dropdown */}
      {showLibrary && courses.length > 0 && (
        <div className={`${cardBg} border-b ${border} max-h-48 overflow-y-auto`}>
          {courses.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedCourse(c); setShowLibrary(false); }}
              className={`w-full p-3 text-left border-b ${border} active:bg-neutral-800/30 ${selectedCourse?.id === c.id ? (isDarkMode ? 'bg-neutral-800' : 'bg-stone-100') : ''}`}
            >
              <p className={`text-sm font-medium ${text}`}>{c.subject}</p>
              <p className={`text-xs ${textSec}`}>{c.modules.length} modules</p>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedCourse ? (
          <div className="space-y-2">
            <div className="mb-4">
              <h1 className={`text-lg font-medium ${text}`}>{selectedCourse.subject}</h1>
              <p className={`text-xs ${textSec}`}>{selectedCourse.modules.length} modules</p>
            </div>
            {selectedCourse.modules.map((mod, i) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                index={i}
                isExpanded={expandedModules.has(mod.id)}
                expandedLessons={expandedLessons}
                onToggle={() => toggleModule(mod.id)}
                onToggleLesson={toggleLesson}
                onStartQuiz={startQuiz}
                isDark={isDarkMode}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
              <Plus className={`w-7 h-7 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`} />
            </div>
            <h2 className={`text-base font-medium ${text} mb-1`}>Generate a Course</h2>
            <p className={`text-xs ${textSec} mb-4`}>Enter any topic below</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Spanish', 'Leadership', 'Python', 'Psychology'].map(s => (
                <button key={s} onClick={() => setPrompt(s)} className={`text-xs px-3 py-1.5 rounded-full ${cardBg} border ${border} ${text}`}>{s}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`p-3 border-t ${border} ${cardBg}`}>
        <div className={`flex items-center gap-2 p-2 rounded-xl ${isDarkMode ? 'bg-neutral-800' : 'bg-stone-100'}`}>
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generateCourse()}
            placeholder="Topic (e.g., Machine Learning)"
            disabled={isGenerating}
            className={`flex-1 bg-transparent px-2 py-1.5 text-sm ${text} placeholder:text-neutral-500 focus:outline-none`}
          />
          <button
            onClick={generateCourse}
            disabled={!prompt.trim() || isGenerating}
            className={`p-2 rounded-lg ${prompt.trim() && !isGenerating ? 'bg-purple-600 text-white' : 'bg-neutral-700/50 text-neutral-500'}`}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Quiz Modal */}
      {quiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className={`${cardBg} rounded-2xl w-full max-w-sm p-4`}>
            {quiz.done ? (
              <div className="text-center">
                <GraduationCap className={`w-10 h-10 mx-auto mb-3 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                <h3 className={`text-lg font-medium ${text} mb-2`}>Complete!</h3>
                <p className={`text-sm ${textSec} mb-4`}>
                  {quiz.answers.filter((a, i) => a === quizQuestions[i]?.correctIndex).length}/{quizQuestions.length} correct
                </p>
                <div className="space-y-2 mb-4 text-left max-h-48 overflow-y-auto">
                  {quizQuestions.map((q, i) => (
                    <div key={q.id} className={`p-2 rounded-lg text-xs ${quiz.answers[i] === q.correctIndex ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <div className="flex items-start gap-1.5">
                        {quiz.answers[i] === q.correctIndex 
                          ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        }
                        <div>
                          <p className={text}>{q.question}</p>
                          <p className={`${textSec} mt-0.5`}>{q.explanation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setQuiz(null)} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm">Close</button>
              </div>
            ) : currentQ ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs ${textSec}`}>{quiz.current + 1}/{quizQuestions.length}</span>
                  <button onClick={() => setQuiz(null)} className="p-1"><X className={`w-4 h-4 ${textSec}`} /></button>
                </div>
                <h3 className={`text-sm font-medium ${text} mb-3`}>{currentQ.question}</h3>
                <div className="space-y-2">
                  {currentQ.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => answerQuiz(i)}
                      className={`w-full text-left p-3 rounded-lg border ${border} text-sm ${text} active:bg-neutral-800/30`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(MobileCourseGenerator);
