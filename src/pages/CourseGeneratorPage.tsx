import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  ChevronDown, ChevronRight, Plus, Trash2, BookOpen, Send, Loader2,
  Folder, FolderOpen, Clock, SortAsc, 
  MoreVertical, FolderPlus, X, CheckCircle, XCircle, RotateCcw,
  GraduationCap, Languages, Brain, Users, Lightbulb, Target
} from 'lucide-react';

// Types - Varied question types for better engagement
type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank';

interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // For multiple_choice
  correctIndex?: number; // For multiple_choice
  correctAnswer?: string | boolean; // For fill_blank or true_false
  explanation: string;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  keyPoints?: string[];
  examples?: string[];
  quiz?: QuizQuestion[];
}

interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  subject: string;
  courseType: 'language' | 'skill' | 'academic' | 'creative' | 'professional';
  folder: string;
  createdAt: Date;
  modules: Module[];
}

interface ExpandedState {
  [key: string]: boolean;
}

// Inline quiz state - no modal, slides out within lesson
interface InlineQuizState {
  lessonId: string;
  currentQuestion: number;
  answers: (number | string | boolean | null)[];
  submitted: boolean[];
  showResults: boolean;
}

type SortMode = 'date' | 'alpha' | 'folder';
const DEFAULT_FOLDER = 'Uncategorized';

// Course type detection - uses existing CourseTypeDetector service when available
const detectCourseType = async (subject: string): Promise<Course['courseType']> => {
  try {
    // Try to use the existing CourseTypeDetector for LLM-powered classification
    const { courseTypeDetector } = await import('../services/CourseTypeDetector');
    const result = await courseTypeDetector.classifyCourseType(subject);
    const typeMap: Record<string, Course['courseType']> = {
      'language': 'language',
      'soft_skills': 'skill',
      'technical': 'academic',
      'academic': 'academic',
      'creative': 'creative',
      'general': 'academic'
    };
    return typeMap[result.primaryType] || 'academic';
  } catch {
    // Fallback to simple pattern matching
    const lower = subject.toLowerCase();
    const languagePatterns = ['language', 'spanish', 'french', 'german', 'japanese', 'chinese', 'korean', 'italian', 'portuguese', 'russian', 'arabic', 'hindi', 'english', 'alphabet', 'grammar'];
    const skillPatterns = ['soft skill', 'communication', 'leadership', 'teamwork', 'emotional intelligence', 'coaching', 'psychology', 'mindfulness', 'productivity', 'time management'];
    const creativePatterns = ['art', 'music', 'design', 'writing', 'creative', 'photography', 'film', 'animation'];
    const professionalPatterns = ['business', 'marketing', 'finance', 'management', 'sales', 'negotiation', 'project management'];
    
    if (languagePatterns.some(p => lower.includes(p))) return 'language';
    if (skillPatterns.some(p => lower.includes(p))) return 'skill';
    if (creativePatterns.some(p => lower.includes(p))) return 'creative';
    if (professionalPatterns.some(p => lower.includes(p))) return 'professional';
    return 'academic';
  }
};

// Icon mapping
const getModuleIcon = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    'graduation': <GraduationCap className="w-4 h-4" />,
    'language': <Languages className="w-4 h-4" />,
    'brain': <Brain className="w-4 h-4" />,
    'users': <Users className="w-4 h-4" />,
    'lightbulb': <Lightbulb className="w-4 h-4" />,
    'target': <Target className="w-4 h-4" />,
  };
  return icons[iconName] || <BookOpen className="w-4 h-4" />;
};

const CourseGeneratorPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedModules, setExpandedModules] = useState<ExpandedState>({});
  const [expandedLessons, setExpandedLessons] = useState<ExpandedState>({});
  const [expandedFolders, setExpandedFolders] = useState<ExpandedState>({ [DEFAULT_FOLDER]: true });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [folders, setFolders] = useState<string[]>([DEFAULT_FOLDER]);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderMenu, setShowFolderMenu] = useState<string | null>(null);
  const [inlineQuizzes, setInlineQuizzes] = useState<Record<string, InlineQuizState>>({});
  const [generationProgress, setGenerationProgress] = useState<string>('');

  // Generate course with AI
  const generateCourse = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    const subject = prompt.trim();

    try {
      setGenerationProgress('Analyzing subject...');
      const courseType = await detectCourseType(subject);
      setGenerationProgress('Preparing curriculum...');
      const { UnifiedAPIRouter } = await import('../services/UnifiedAPIRouter');
      const router = UnifiedAPIRouter.getInstance();

      // Build appropriate prompt based on course type
      let systemPrompt = `You are an enthusiastic, encouraging teacher who makes learning fun and accessible. 
You believe every student can succeed with the right guidance. Use warm, supportive language.
Generate a comprehensive course structure in JSON format.`;

      let userPrompt = '';

      if (courseType === 'language') {
        userPrompt = `Create a complete language learning course for: ${subject}

Generate EXACTLY this JSON structure (no markdown, just JSON):
{
  "modules": [
    {
      "title": "Module title",
      "description": "Brief encouraging description",
      "icon": "language",
      "lessons": [
        {
          "title": "Lesson title",
          "content": "Detailed lesson content (2-3 paragraphs)",
          "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
          "examples": ["Example 1 with translation", "Example 2 with translation"],
          "quiz": [
            {
              "type": "multiple_choice",
              "question": "What does X mean?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctIndex": 0,
              "explanation": "Why this is correct"
            },
            {
              "type": "true_false",
              "question": "Statement to evaluate?",
              "correctAnswer": true,
              "explanation": "Why true/false"
            },
            {
              "type": "fill_blank",
              "question": "Complete: The ___ is correct.",
              "correctAnswer": "answer",
              "explanation": "The answer fits because..."
            }
          ]
        }
      ]
    }
  ]
}

Create exactly 6 modules:
1. "Alphabet & Pronunciation" - Complete alphabet with phonetic guides, pronunciation tips
2. "Essential Vocabulary" - 50+ core words organized by category (greetings, numbers, colors, family, food)
3. "Grammar Foundations" - Sentence structure, verb conjugations, noun/adjective agreement
4. "Everyday Conversations" - Real dialogues for common situations (shopping, restaurant, directions)
5. "Reading & Writing" - Text comprehension, writing exercises, cultural context
6. "Advanced Communication" - Complex sentences, idioms, formal/informal registers

Each module should have 3-4 lessons with detailed content, examples with translations, and 2-3 quiz questions per lesson.`;
      } else if (courseType === 'skill' || courseType === 'professional') {
        userPrompt = `Create a comprehensive soft skills/professional development course for: ${subject}

Generate EXACTLY this JSON structure (no markdown, just JSON):
{
  "modules": [
    {
      "title": "Module title",
      "description": "Encouraging description",
      "icon": "brain",
      "lessons": [
        {
          "title": "Lesson title",
          "content": "Detailed content with real-world examples",
          "keyPoints": ["Actionable point 1", "Actionable point 2"],
          "examples": ["Real scenario 1", "Real scenario 2"],
          "quiz": [
            {
              "type": "multiple_choice",
              "question": "In this scenario, what's the best approach?",
              "options": ["Response A", "Response B", "Response C", "Response D"],
              "correctIndex": 0,
              "explanation": "Why this works best"
            },
            {
              "type": "true_false",
              "question": "This behavior is considered best practice.",
              "correctAnswer": true,
              "explanation": "Because..."
            }
          ]
        }
      ]
    }
  ]
}

Create exactly 6 modules:
1. "Understanding the Fundamentals" - Core concepts, psychology, why this matters
2. "Self-Assessment & Awareness" - Identify strengths, areas for growth, personal style
3. "Core Techniques & Strategies" - Practical methods, frameworks, step-by-step approaches
4. "Real-World Application" - Case studies, scenarios, practice exercises
5. "Overcoming Challenges" - Common obstacles, troubleshooting, resilience building
6. "Mastery & Continuous Growth" - Advanced techniques, habit formation, ongoing development

Each module: 3-4 lessons, practical examples, scenario-based quizzes.`;
      } else {
        userPrompt = `Create a comprehensive educational course for: ${subject}

Generate EXACTLY this JSON structure (no markdown, just JSON):
{
  "modules": [
    {
      "title": "Module title",
      "description": "Encouraging description",
      "icon": "graduation",
      "lessons": [
        {
          "title": "Lesson title",
          "content": "In-depth educational content",
          "keyPoints": ["Key concept 1", "Key concept 2"],
          "examples": ["Illustrative example 1", "Illustrative example 2"],
          "quiz": [
            {
              "type": "multiple_choice",
              "question": "Conceptual question?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctIndex": 0,
              "explanation": "Why this is correct"
            },
            {
              "type": "fill_blank",
              "question": "The key principle is called ___.",
              "correctAnswer": "term",
              "explanation": "This term means..."
            }
          ]
        }
      ]
    }
  ]
}

Create exactly 6 modules:
1. "Introduction & Foundations" - What it is, why it matters, historical context
2. "Core Principles" - Fundamental concepts, theories, frameworks
3. "Key Techniques & Methods" - How things work, processes, methodologies
4. "Practical Applications" - Real-world uses, hands-on examples, case studies
5. "Advanced Concepts" - Deeper exploration, cutting-edge developments
6. "Synthesis & Mastery" - Connecting ideas, projects, continued learning paths

Each module: 3-4 lessons with thorough content, examples, and 2-3 quiz questions.`;
      }

      setGenerationProgress('Generating course content...');
      
      const response = await router.routeAPICall('llm', 'chat-completion', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      let modules: Module[] = [];

      if (response?.choices?.[0]?.message?.content) {
        try {
          setGenerationProgress('Processing curriculum...');
          const content = response.choices[0].message.content;
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.modules && Array.isArray(parsed.modules)) {
              modules = parsed.modules.map((m: any, mi: number) => ({
                id: `mod-${Date.now()}-${mi}`,
                title: m.title || `Module ${mi + 1}`,
                description: m.description || '',
                icon: m.icon || 'graduation',
                lessons: (m.lessons || []).map((l: any, li: number) => ({
                  id: `les-${Date.now()}-${mi}-${li}`,
                  title: l.title || `Lesson ${li + 1}`,
                  content: l.content || '',
                  keyPoints: l.keyPoints || [],
                  examples: l.examples || [],
                  quiz: (l.quiz || []).map((q: any, qi: number) => ({
                    id: `quiz-${Date.now()}-${mi}-${li}-${qi}`,
                    type: (q.type || 'multiple_choice') as QuestionType,
                    question: q.question || '',
                    options: q.options,
                    correctIndex: q.correctIndex,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || ''
                  }))
                }))
              }));
            }
          }
        } catch (parseErr) {
          console.warn('JSON parse failed:', parseErr);
        }
      }

      // Fallback if AI fails
      if (modules.length === 0) {
        modules = generateFallbackModules(subject, courseType);
      }

      const newCourse: Course = {
        id: `course-${Date.now()}`,
        subject,
        courseType,
        folder: DEFAULT_FOLDER,
        createdAt: new Date(),
        modules
      };

      setCourses(prev => [newCourse, ...prev]);
      setSelectedCourse(newCourse);
      setPrompt('');
      setExpandedModules({ [modules[0]?.id]: true });
      setExpandedFolders(prev => ({ ...prev, [DEFAULT_FOLDER]: true }));
      setGenerationProgress('');
    } catch (error) {
      console.error('Failed to generate course:', error);
      setGenerationProgress('');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating]);

  // Fallback content generator
  const generateFallbackModules = (subject: string, courseType: Course['courseType']): Module[] => {
    const baseModules = [
      { title: 'Introduction & Foundations', icon: 'graduation', desc: `Welcome to your ${subject} journey! Let's build a strong foundation together.` },
      { title: 'Core Concepts', icon: 'brain', desc: 'Master the essential building blocks that everything else depends on.' },
      { title: 'Practical Techniques', icon: 'lightbulb', desc: 'Learn hands-on methods you can apply right away.' },
      { title: 'Real-World Application', icon: 'target', desc: 'See how these concepts work in actual scenarios.' },
      { title: 'Advanced Topics', icon: 'users', desc: 'Take your understanding to the next level.' },
      { title: 'Mastery & Growth', icon: 'graduation', desc: 'Cement your knowledge and plan your continued learning.' }
    ];

    return baseModules.map((m, mi) => ({
      id: `mod-${Date.now()}-${mi}`,
      title: m.title,
      description: m.desc,
      icon: m.icon,
      lessons: [
        {
          id: `les-${Date.now()}-${mi}-0`,
          title: `Understanding ${m.title}`,
          content: `This lesson introduces the key concepts of ${m.title.toLowerCase()} as they relate to ${subject}. You'll discover why these fundamentals matter and how they connect to your broader learning goals.`,
          keyPoints: ['Foundational concept', 'Key principle', 'Important connection'],
          examples: [`Example scenario in ${subject}`, 'Real-world application'],
          quiz: [
            {
              id: `q-${Date.now()}-${mi}-0a`,
              type: 'multiple_choice' as QuestionType,
              question: `What is a key aspect of ${m.title.toLowerCase()}?`,
              options: ['Understanding fundamentals', 'Skipping basics', 'Random approach', 'Ignoring context'],
              correctIndex: 0,
              explanation: 'Building on fundamentals ensures lasting understanding.'
            },
            {
              id: `q-${Date.now()}-${mi}-0b`,
              type: 'true_false' as QuestionType,
              question: `Building a strong foundation in ${m.title.toLowerCase()} is essential for mastery.`,
              correctAnswer: true,
              explanation: 'Foundations make advanced concepts easier to understand.'
            }
          ]
        },
        {
          id: `les-${Date.now()}-${mi}-1`,
          title: `Applying ${m.title}`,
          content: `Now let's put these concepts into practice. This lesson focuses on actionable techniques you can use immediately.`,
          keyPoints: ['Practical technique', 'Step-by-step method', 'Common pitfall to avoid'],
          examples: ['Practice scenario 1', 'Practice scenario 2'],
          quiz: [
            {
              id: `q-${Date.now()}-${mi}-1a`,
              type: 'multiple_choice' as QuestionType,
              question: 'What is the best approach to learning new skills?',
              options: ['Practice regularly', 'Study once intensively', 'Wait for inspiration', 'Avoid mistakes'],
              correctIndex: 0,
              explanation: 'Regular practice builds lasting skills and confidence.'
            },
            {
              id: `q-${Date.now()}-${mi}-1b`,
              type: 'fill_blank' as QuestionType,
              question: 'The key to mastery is consistent ___.',
              correctAnswer: 'practice',
              explanation: 'Consistent practice reinforces learning and builds muscle memory.'
            }
          ]
        }
      ]
    }));
  };

  // Inline quiz handlers - quiz slides out within the lesson card
  const toggleQuiz = useCallback((lessonId: string, quiz: QuizQuestion[]) => {
    setInlineQuizzes(prev => {
      if (prev[lessonId]) {
        // Close quiz
        const { [lessonId]: _, ...rest } = prev;
        return rest;
      }
      // Open quiz
      return {
        ...prev,
        [lessonId]: {
          lessonId,
          currentQuestion: 0,
          answers: new Array(quiz.length).fill(null),
          submitted: new Array(quiz.length).fill(false),
          showResults: false
        }
      };
    });
  }, []);

  const answerInlineQuestion = useCallback((lessonId: string, qIndex: number, answer: number | string | boolean) => {
    setInlineQuizzes(prev => {
      const quiz = prev[lessonId];
      if (!quiz) return prev;
      const newAnswers = [...quiz.answers];
      newAnswers[qIndex] = answer;
      return { ...prev, [lessonId]: { ...quiz, answers: newAnswers } };
    });
  }, []);

  const submitInlineQuestion = useCallback((lessonId: string, qIndex: number) => {
    setInlineQuizzes(prev => {
      const quiz = prev[lessonId];
      if (!quiz) return prev;
      const newSubmitted = [...quiz.submitted];
      newSubmitted[qIndex] = true;
      // Move to next question or show results
      const allSubmitted = newSubmitted.every(s => s);
      return { 
        ...prev, 
        [lessonId]: { 
          ...quiz, 
          submitted: newSubmitted,
          currentQuestion: allSubmitted ? quiz.currentQuestion : qIndex + 1,
          showResults: allSubmitted
        } 
      };
    });
  }, []);

  const resetInlineQuiz = useCallback((lessonId: string, quiz: QuizQuestion[]) => {
    setInlineQuizzes(prev => ({
      ...prev,
      [lessonId]: {
        lessonId,
        currentQuestion: 0,
        answers: new Array(quiz.length).fill(null),
        submitted: new Array(quiz.length).fill(false),
        showResults: false
      }
    }));
  }, []);

  // UI handlers
  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  }, []);

  const toggleLesson = useCallback((lessonId: string) => {
    setExpandedLessons(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
  }, []);

  const toggleFolder = useCallback((folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  }, []);

  const deleteCourse = useCallback((courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCourses(prev => prev.filter(c => c.id !== courseId));
    if (selectedCourse?.id === courseId) setSelectedCourse(null);
  }, [selectedCourse]);

  const moveCourseToFolder = useCallback((courseId: string, folder: string) => {
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, folder } : c));
    setShowFolderMenu(null);
  }, []);

  const addFolder = useCallback(() => {
    if (newFolderName.trim() && !folders.includes(newFolderName.trim())) {
      const name = newFolderName.trim();
      setFolders(prev => [...prev, name]);
      setExpandedFolders(prev => ({ ...prev, [name]: true }));
      setNewFolderName('');
      setShowNewFolderInput(false);
    }
  }, [newFolderName, folders]);

  const deleteFolder = useCallback((folder: string) => {
    if (folder === DEFAULT_FOLDER) return;
    setCourses(prev => prev.map(c => c.folder === folder ? { ...c, folder: DEFAULT_FOLDER } : c));
    setFolders(prev => prev.filter(f => f !== folder));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateCourse();
    }
  }, [generateCourse]);

  const cycleSortMode = useCallback(() => {
    setSortMode(prev => prev === 'date' ? 'alpha' : prev === 'alpha' ? 'folder' : 'date');
  }, []);

  // Sorted courses
  const sortedCourses = useMemo(() => {
    const sorted = [...courses];
    if (sortMode === 'date') sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    else if (sortMode === 'alpha') sorted.sort((a, b) => a.subject.localeCompare(b.subject));
    return sorted;
  }, [courses, sortMode]);

  const coursesByFolder = useMemo(() => {
    const grouped: Record<string, Course[]> = {};
    folders.forEach(f => { grouped[f] = []; });
    sortedCourses.forEach(course => {
      const folder = course.folder || DEFAULT_FOLDER;
      if (!grouped[folder]) grouped[folder] = [];
      grouped[folder].push(course);
    });
    return grouped;
  }, [sortedCourses, folders]);

  // Get quiz for a lesson
  const getQuizForLesson = (lessonId: string): QuizQuestion[] => {
    if (!selectedCourse) return [];
    for (const mod of selectedCourse.modules) {
      for (const les of mod.lessons) {
        if (les.id === lessonId) return les.quiz || [];
      }
    }
    return [];
  };

  // Colors
  const bg = isDarkMode ? 'bg-neutral-950' : 'bg-stone-50';
  const cardBg = isDarkMode ? 'bg-neutral-900' : 'bg-white';
  const borderColor = isDarkMode ? 'border-neutral-800' : 'border-stone-200';
  const textPrimary = isDarkMode ? 'text-neutral-100' : 'text-stone-900';
  const textSecondary = isDarkMode ? 'text-neutral-400' : 'text-stone-500';
  const hoverBg = isDarkMode ? 'hover:bg-neutral-800' : 'hover:bg-stone-100';
  const activeBg = isDarkMode ? 'bg-neutral-800' : 'bg-stone-100';
  const accentBg = isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50';
  const accentText = isDarkMode ? 'text-purple-300' : 'text-purple-700';

  // Inline Quiz Renderer - slides out within the lesson, no modal
  const renderInlineQuiz = (lessonId: string, quiz: QuizQuestion[]) => {
    const quizState = inlineQuizzes[lessonId];
    if (!quizState || quiz.length === 0) return null;

    // Check answer correctness for a question
    const isCorrect = (q: QuizQuestion, answer: number | string | boolean | null): boolean => {
      if (answer === null) return false;
      if (q.type === 'multiple_choice') return answer === q.correctIndex;
      if (q.type === 'true_false') return answer === q.correctAnswer;
      if (q.type === 'fill_blank') {
        const correct = String(q.correctAnswer || '').toLowerCase().trim();
        return String(answer).toLowerCase().trim() === correct;
      }
      return false;
    };

    // Calculate score
    const correctCount = quiz.filter((q, i) => isCorrect(q, quizState.answers[i])).length;

    return (
      <div className={`mt-3 p-4 rounded-xl ${isDarkMode ? 'bg-neutral-800/50' : 'bg-stone-100'} border ${borderColor}`}>
        {/* Quiz Header */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-medium ${accentText}`}>
            Quiz • {quizState.showResults ? `${correctCount}/${quiz.length} correct` : `${quizState.submitted.filter(s => s).length}/${quiz.length} answered`}
          </span>
          <button 
            onClick={() => toggleQuiz(lessonId, quiz)} 
            className={`text-xs ${textSecondary} hover:${textPrimary}`}
          >
            Close
          </button>
        </div>

        {/* Questions - all visible, scroll through */}
        <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
          {quiz.map((q, qIndex) => {
            const answer = quizState.answers[qIndex];
            const isSubmitted = quizState.submitted[qIndex];
            const correct = isCorrect(q, answer);

            return (
              <div 
                key={q.id} 
                className={`p-3 rounded-lg transition-all ${
                  isSubmitted 
                    ? correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                    : isDarkMode ? 'bg-neutral-900' : 'bg-white'
                }`}
              >
                {/* Question type badge + number */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    q.type === 'multiple_choice' ? 'bg-blue-500/20 text-blue-400' :
                    q.type === 'true_false' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {q.type === 'multiple_choice' ? 'Choice' : q.type === 'true_false' ? 'T/F' : 'Fill'}
                  </span>
                  <span className={`text-xs ${textSecondary}`}>Q{qIndex + 1}</span>
                  {isSubmitted && (
                    correct 
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-auto" />
                      : <XCircle className="w-3.5 h-3.5 text-red-500 ml-auto" />
                  )}
                </div>

                {/* Question text */}
                <p className={`text-sm ${textPrimary} mb-2`}>{q.question}</p>

                {/* Answer options based on type */}
                {q.type === 'multiple_choice' && q.options && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {q.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => !isSubmitted && answerInlineQuestion(lessonId, qIndex, i)}
                        disabled={isSubmitted}
                        className={`text-left text-xs p-2 rounded-md transition-all ${
                          isSubmitted
                            ? i === q.correctIndex
                              ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                              : answer === i
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : `${isDarkMode ? 'bg-neutral-800' : 'bg-stone-50'} ${textSecondary}`
                            : answer === i
                              ? `${accentBg} ${accentText} border border-purple-500/40`
                              : `${isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-stone-50 hover:bg-stone-100'} ${textSecondary}`
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'true_false' && (
                  <div className="flex gap-2">
                    {[true, false].map(val => (
                      <button
                        key={String(val)}
                        onClick={() => !isSubmitted && answerInlineQuestion(lessonId, qIndex, val)}
                        disabled={isSubmitted}
                        className={`flex-1 text-xs py-2 rounded-md transition-all ${
                          isSubmitted
                            ? val === q.correctAnswer
                              ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                              : answer === val
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : `${isDarkMode ? 'bg-neutral-800' : 'bg-stone-50'} ${textSecondary}`
                            : answer === val
                              ? `${accentBg} ${accentText} border border-purple-500/40`
                              : `${isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-stone-50 hover:bg-stone-100'} ${textSecondary}`
                        }`}
                      >
                        {val ? 'True' : 'False'}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'fill_blank' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={typeof answer === 'string' ? answer : ''}
                      onChange={(e) => !isSubmitted && answerInlineQuestion(lessonId, qIndex, e.target.value)}
                      disabled={isSubmitted}
                      placeholder="Type your answer..."
                      className={`flex-1 text-xs px-3 py-2 rounded-md outline-none transition-all ${
                        isSubmitted
                          ? correct
                            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400'
                          : `${isDarkMode ? 'bg-neutral-800' : 'bg-stone-50'} border ${borderColor} focus:border-purple-500 ${textPrimary}`
                      }`}
                    />
                    {isSubmitted && !correct && (
                      <span className={`text-xs ${textSecondary} self-center`}>
                        Answer: <span className="text-green-400">{String(q.correctAnswer)}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Submit button for unanswered */}
                {!isSubmitted && answer !== null && (
                  <button
                    onClick={() => submitInlineQuestion(lessonId, qIndex)}
                    className={`mt-2 text-xs px-3 py-1.5 rounded-md ${isDarkMode ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-600 hover:bg-purple-700'} text-white transition-colors`}
                  >
                    Check
                  </button>
                )}

                {/* Explanation after submit */}
                {isSubmitted && q.explanation && (
                  <p className={`mt-2 text-xs ${textSecondary} italic`}>{q.explanation}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Results & Retry */}
        {quizState.showResults && (
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between">
            <span className={`text-sm ${correctCount === quiz.length ? 'text-green-400' : textPrimary}`}>
              {correctCount === quiz.length ? 'Perfect score!' : `${correctCount}/${quiz.length} correct`}
            </span>
            <button
              onClick={() => resetInlineQuiz(lessonId, quiz)}
              className={`text-xs px-3 py-1.5 rounded-md ${hoverBg} ${textSecondary} hover:${textPrimary} flex items-center gap-1`}
            >
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${bg} flex`}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 transition-all duration-200 ${cardBg} border-r ${borderColor} flex flex-col overflow-hidden fixed md:relative inset-y-0 left-0 z-40`}>
        <div className={`p-3 border-b ${borderColor}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className={`w-4 h-4 ${textSecondary}`} />
              <span className={`text-sm font-medium ${textPrimary}`}>Library</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={cycleSortMode} className={`p-1.5 rounded ${hoverBg}`} title={`Sort by ${sortMode}`}>
                {sortMode === 'date' && <Clock className={`w-3.5 h-3.5 ${textSecondary}`} />}
                {sortMode === 'alpha' && <SortAsc className={`w-3.5 h-3.5 ${textSecondary}`} />}
                {sortMode === 'folder' && <Folder className={`w-3.5 h-3.5 ${textSecondary}`} />}
              </button>
              <button onClick={() => setShowNewFolderInput(true)} className={`p-1.5 rounded ${hoverBg}`} title="New folder">
                <FolderPlus className={`w-3.5 h-3.5 ${textSecondary}`} />
              </button>
            </div>
          </div>
          {showNewFolderInput && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFolder()}
                placeholder="Folder name"
                autoFocus
                className={`flex-1 px-2 py-1 text-xs rounded ${isDarkMode ? 'bg-neutral-800' : 'bg-stone-100'} ${textPrimary} focus:outline-none`}
              />
              <button onClick={addFolder} className={`p-1 rounded ${hoverBg}`}><Plus className={`w-3 h-3 ${textSecondary}`} /></button>
              <button onClick={() => setShowNewFolderInput(false)} className={`p-1 rounded ${hoverBg}`}><X className={`w-3 h-3 ${textSecondary}`} /></button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {courses.length === 0 ? (
            <p className={`text-xs ${textSecondary} text-center py-8 px-4`}>No courses yet. Generate one below.</p>
          ) : (
            <div className="space-y-1">
              {folders.map(folder => {
                const folderCourses = coursesByFolder[folder] || [];
                const isExpanded = expandedFolders[folder];
                return (
                  <div key={folder}>
                    <button onClick={() => toggleFolder(folder)} className={`w-full flex items-center justify-between p-2 rounded-lg ${hoverBg} group`}>
                      <div className="flex items-center gap-2">
                        {isExpanded ? <FolderOpen className={`w-4 h-4 ${textSecondary}`} /> : <Folder className={`w-4 h-4 ${textSecondary}`} />}
                        <span className={`text-xs font-medium ${textPrimary}`}>{folder}</span>
                        <span className={`text-xs ${textSecondary}`}>({folderCourses.length})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {folder !== DEFAULT_FOLDER && (
                          <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder); }} className={`p-1 rounded opacity-0 group-hover:opacity-100 ${hoverBg}`}>
                            <Trash2 className={`w-3 h-3 ${textSecondary}`} />
                          </button>
                        )}
                        {isExpanded ? <ChevronDown className={`w-3 h-3 ${textSecondary}`} /> : <ChevronRight className={`w-3 h-3 ${textSecondary}`} />}
                      </div>
                    </button>
                    {isExpanded && folderCourses.length > 0 && (
                      <ul className="ml-4 mt-1 space-y-0.5">
                        {folderCourses.map(course => (
                          <li key={course.id} className="relative">
                            <button onClick={() => setSelectedCourse(course)} className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between group ${selectedCourse?.id === course.id ? activeBg : hoverBg}`}>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium ${textPrimary} truncate`}>{course.subject}</p>
                                <p className={`text-[10px] ${textSecondary}`}>{course.modules.length} modules</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                <button onClick={(e) => { e.stopPropagation(); setShowFolderMenu(course.id); }} className={`p-1 rounded ${hoverBg}`}>
                                  <MoreVertical className={`w-3 h-3 ${textSecondary}`} />
                                </button>
                                <button onClick={(e) => deleteCourse(course.id, e)} className={`p-1 rounded ${hoverBg}`}>
                                  <Trash2 className={`w-3 h-3 ${textSecondary}`} />
                                </button>
                              </div>
                            </button>
                            {showFolderMenu === course.id && (
                              <div className={`absolute right-0 top-full mt-1 z-50 ${cardBg} border ${borderColor} rounded-lg shadow-lg py-1 min-w-[120px]`}>
                                <p className={`px-3 py-1 text-[10px] ${textSecondary} uppercase`}>Move to</p>
                                {folders.filter(f => f !== course.folder).map(f => (
                                  <button key={f} onClick={() => moveCourseToFolder(course.id, f)} className={`w-full text-left px-3 py-1.5 text-xs ${textPrimary} ${hoverBg}`}>{f}</button>
                                ))}
                                <button onClick={() => setShowFolderMenu(null)} className={`w-full text-left px-3 py-1.5 text-xs ${textSecondary} ${hoverBg} border-t ${borderColor}`}>Cancel</button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`md:hidden fixed bottom-20 left-4 z-50 p-3 rounded-full shadow-lg ${cardBg} border ${borderColor}`}>
        <BookOpen className={`w-5 h-5 ${textPrimary}`} />
      </button>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `linear-gradient(${isDarkMode ? '#fff' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? '#fff' : '#000'} 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />

        <div className="flex-1 relative z-10 p-4 md:p-8 pt-20 md:pt-24 pb-32 overflow-y-auto">
          {selectedCourse ? (
            <div className="max-w-3xl mx-auto">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${accentBg} ${accentText}`}>{selectedCourse.courseType}</span>
                </div>
                <h1 className={`text-2xl md:text-3xl font-light ${textPrimary} tracking-tight`}>{selectedCourse.subject}</h1>
                <p className={`text-sm ${textSecondary} mt-2`}>{selectedCourse.modules.length} modules • {selectedCourse.modules.reduce((acc, m) => acc + m.lessons.length, 0)} lessons</p>
              </div>

              {/* Modules - Main Cards */}
              <div className="space-y-4">
                {selectedCourse.modules.map((module, modIndex) => (
                  <div key={module.id} className={`${cardBg} border ${borderColor} rounded-xl overflow-hidden`}>
                    <button onClick={() => toggleModule(module.id)} className={`w-full p-4 flex items-center justify-between text-left ${hoverBg}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentBg} ${accentText}`}>
                          {getModuleIcon(module.icon)}
                        </div>
                        <div>
                          <span className={`text-xs ${textSecondary}`}>Module {modIndex + 1}</span>
                          <h3 className={`text-sm font-medium ${textPrimary}`}>{module.title}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${textSecondary}`}>{module.lessons.length} lessons</span>
                        {expandedModules[module.id] ? <ChevronDown className={`w-4 h-4 ${textSecondary}`} /> : <ChevronRight className={`w-4 h-4 ${textSecondary}`} />}
                      </div>
                    </button>

                    {expandedModules[module.id] && (
                      <div className={`border-t ${borderColor}`}>
                        <p className={`px-4 py-3 text-sm ${textSecondary} bg-opacity-50 ${isDarkMode ? 'bg-neutral-800/50' : 'bg-stone-50'}`}>{module.description}</p>
                        
                        {/* Lessons - Sub Cards */}
                        <div className="p-3 space-y-2">
                          {module.lessons.map((lesson, lesIndex) => (
                            <div key={lesson.id} className={`border ${borderColor} rounded-lg overflow-hidden`}>
                              <button onClick={() => toggleLesson(lesson.id)} className={`w-full p-3 flex items-center justify-between text-left ${hoverBg}`}>
                                <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isDarkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-stone-200 text-stone-600'}`}>
                                    {lesIndex + 1}
                                  </span>
                                  <span className={`text-sm ${textPrimary}`}>{lesson.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {lesson.quiz && lesson.quiz.length > 0 && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${accentBg} ${accentText}`}>Quiz</span>
                                  )}
                                  {expandedLessons[lesson.id] ? <ChevronDown className={`w-4 h-4 ${textSecondary}`} /> : <ChevronRight className={`w-4 h-4 ${textSecondary}`} />}
                                </div>
                              </button>

                              {expandedLessons[lesson.id] && (
                                <div className={`p-4 border-t ${borderColor} ${isDarkMode ? 'bg-neutral-800/30' : 'bg-stone-50/50'}`}>
                                  <p className={`text-sm ${textSecondary} leading-relaxed whitespace-pre-wrap mb-4`}>{lesson.content}</p>
                                  
                                  {lesson.keyPoints && lesson.keyPoints.length > 0 && (
                                    <div className="mb-4">
                                      <h4 className={`text-xs font-medium ${textPrimary} uppercase mb-2`}>Key Points</h4>
                                      <ul className="space-y-1">
                                        {lesson.keyPoints.map((kp, i) => (
                                          <li key={i} className={`text-sm ${textSecondary} flex items-start gap-2`}>
                                            <CheckCircle className={`w-4 h-4 ${accentText} flex-shrink-0 mt-0.5`} />
                                            {kp}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {lesson.examples && lesson.examples.length > 0 && (
                                    <div className="mb-4">
                                      <h4 className={`text-xs font-medium ${textPrimary} uppercase mb-2`}>Examples</h4>
                                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-neutral-700/50' : 'bg-stone-100'}`}>
                                        {lesson.examples.map((ex, i) => (
                                          <p key={i} className={`text-sm ${textSecondary} ${i > 0 ? 'mt-2 pt-2 border-t ' + borderColor : ''}`}>{ex}</p>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {lesson.quiz && lesson.quiz.length > 0 && (
                                    <>
                                      <button
                                        onClick={() => toggleQuiz(lesson.id, lesson.quiz!)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                          inlineQuizzes[lesson.id]
                                            ? `${isDarkMode ? 'bg-neutral-700 hover:bg-neutral-600' : 'bg-stone-200 hover:bg-stone-300'} ${textPrimary}`
                                            : `${isDarkMode ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-600 hover:bg-purple-700'} text-white`
                                        } text-sm`}
                                      >
                                        <GraduationCap className="w-4 h-4" />
                                        {inlineQuizzes[lesson.id] ? 'Hide Quiz' : `Quiz (${lesson.quiz.length})`}
                                      </button>
                                      {renderInlineQuiz(lesson.id, lesson.quiz)}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto text-center py-20">
              <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center ${accentBg}`}>
                <Plus className={`w-8 h-8 ${accentText}`} />
              </div>
              <h2 className={`text-xl font-light ${textPrimary} mb-2`}>Generate a Course</h2>
              <p className={`text-sm ${textSecondary} mb-6`}>Enter any subject to create a comprehensive course with modules, lessons, and quizzes.</p>
              <div className={`text-left p-4 rounded-lg ${isDarkMode ? 'bg-neutral-900' : 'bg-stone-100'}`}>
                <p className={`text-xs ${textSecondary} uppercase mb-2`}>Try these:</p>
                <div className="flex flex-wrap gap-2">
                  {['Spanish Language', 'Emotional Intelligence', 'Python Programming', 'Leadership Skills', 'Art History'].map(s => (
                    <button key={s} onClick={() => setPrompt(s)} className={`text-xs px-3 py-1.5 rounded-full ${cardBg} border ${borderColor} ${hoverBg} ${textPrimary}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className={`fixed bottom-0 left-0 right-0 z-50 md:left-72 ${cardBg} border-t ${borderColor} p-4 ${!sidebarOpen ? 'md:left-0' : ''}`}>
          <div className="max-w-3xl mx-auto">
            {generationProgress && (
              <div className={`flex items-center gap-2 mb-2 text-sm ${accentText}`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                {generationProgress}
              </div>
            )}
            <div className={`flex items-center gap-3 p-2 rounded-xl ${isDarkMode ? 'bg-neutral-800' : 'bg-stone-100'}`}>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a subject (e.g., Japanese Language, Coaching Psychology, Machine Learning...)"
                disabled={isGenerating}
                className={`flex-1 bg-transparent px-3 py-2 text-sm ${textPrimary} placeholder:text-neutral-500 focus:outline-none disabled:opacity-50`}
              />
              <button
                onClick={generateCourse}
                disabled={!prompt.trim() || isGenerating}
                className={`p-2 rounded-lg transition-all ${prompt.trim() && !isGenerating ? (isDarkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white') : (isDarkMode ? 'bg-neutral-700/50 text-neutral-500' : 'bg-stone-200 text-stone-400')} disabled:cursor-not-allowed`}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </main>

      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />}
      {showFolderMenu && <div className="fixed inset-0 z-20" onClick={() => setShowFolderMenu(null)} />}
    </div>
  );
};

export default CourseGeneratorPage;
