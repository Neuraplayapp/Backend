// Common types and interfaces for the application

export interface Stat {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description: string;
}

export interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  benefits: string[];
}

export interface SafetyFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export interface Step {
  number: number;
  title: string;
  description: string;
  points: string[];
}

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  canonicalUrl?: string;
}

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

// Course-related types
export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  modules: CourseModule[];
  progress: number; // 0-100
  status: 'not_started' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  instructor?: string;
  rating?: number;
  enrolledCount?: number;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: CourseLesson[];
  completed: boolean;
  progress: number; // 0-100
}

export interface CourseLesson {
  id: string;
  title: string;
  type: 'video' | 'reading' | 'quiz' | 'interactive' | 'assignment';
  duration: number; // in minutes
  completed: boolean;
  order: number;
}

export interface CourseGenerationRequest {
  topic: string;
  age?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number; // total hours
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  goals?: string[];
}

export interface CourseGenerationResponse {
  courseId: string;
  course: Course;
  estimatedDuration: number;
  modules: number;
  lessons: number;
}