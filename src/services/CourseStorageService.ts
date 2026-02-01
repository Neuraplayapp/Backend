/**
 * COURSE STORAGE SERVICE
 * 
 * Syncs courses with backend database for permanent storage.
 * Uses LAZY LOADING - only metadata loaded initially, full content on demand.
 * 
 * PERSISTENCE HIERARCHY:
 * 1. Database (permanent, survives sign out)
 * 2. localStorage (metadata cache only - NOT full content)
 * 
 * LAZY LOADING STRATEGY:
 * - loadCourses() returns METADATA only (id, title, thumbnail, progress, section count)
 * - loadFullCourse() fetches complete course content when user opens it
 * - localStorage only stores lightweight metadata (avoids quota issues)
 */

import type { GenerativeLearningModuleData } from '../types/LearningModule.types';

const LOCAL_STORAGE_KEY = 'neuraplay_course_metadata'; // Renamed - now stores only metadata
const CONTENT_CACHE_PREFIX = 'neuraplay_course_content_'; // Individual course content cache

// 🚨 FIX: Use relative URLs in production, only use VITE_API_BASE for local dev
const getApiBase = (): string => {
  const envBase = import.meta.env.VITE_API_BASE || '';
  // If we're on production (not localhost), use relative URLs
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return ''; // Use relative URLs on production
  }
  return envBase.replace(/\/$/, '');
};
const API_BASE = getApiBase();

interface CourseProgress {
  currentSectionIndex: number;
  totalSections: number;
  completedSteps: string[];
  comprehensionLevel: number;
  phase: string;
  lastAccessed: string;
}

/**
 * Lightweight course metadata for initial load (fast)
 */
interface CourseMetadata {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  thumbnail?: string;
  estimatedMinutes: number;
  sectionCount: number;
  hasGeneratedContent: boolean;
  lastAccessed?: string;
  progress?: number;
}

class CourseStorageService {
  private static instance: CourseStorageService;
  private syncInProgress = false;
  private contentCache: Map<string, GenerativeLearningModuleData> = new Map();

  static getInstance(): CourseStorageService {
    if (!CourseStorageService.instance) {
      CourseStorageService.instance = new CourseStorageService();
    }
    return CourseStorageService.instance;
  }

  /**
   * 🚀 LAZY LOAD: Get course list with metadata only (FAST - no content)
   * Full content is loaded on-demand via loadFullCourse()
   */
  async loadCourses(userId: string): Promise<GenerativeLearningModuleData[]> {
    if (!userId) {
      console.warn('⚠️ CourseStorage: No userId provided, using localStorage metadata');
      return this.loadMetadataFromLocalStorage();
    }

    try {
      console.log('📚 CourseStorage: Loading course metadata from database...');
      const startTime = Date.now();
      
      // 🚀 Request metadata-only endpoint (or use query param)
      const response = await fetch(`${API_BASE}/api/courses/${userId}?metadataOnly=true`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.courses)) {
        const loadTime = Date.now() - startTime;
        console.log(`✅ CourseStorage: Loaded ${data.courses.length} courses in ${loadTime}ms`);
        
        // Extract and save metadata only to localStorage (lightweight)
        const metadataList = data.courses.map((c: any) => this.extractMetadata(c));
        this.saveMetadataToLocalStorage(metadataList);
        
        // Return courses WITH basic structure but without full chunk content
        // This allows the dashboard to show courses immediately
        return data.courses.map((c: any) => this.createLightweightCourse(c));
      }
      
      throw new Error('Invalid response format');
      
    } catch (error) {
      console.warn('⚠️ CourseStorage: DB load failed, using localStorage:', error);
      return this.loadMetadataFromLocalStorage();
    }
  }

  /**
   * 🚀 LAZY LOAD: Fetch full course content when user opens a course
   * Returns cached version if available, otherwise fetches from DB
   */
  async loadFullCourse(userId: string, courseId: string): Promise<GenerativeLearningModuleData | null> {
    // Check memory cache first (fastest)
    if (this.contentCache.has(courseId)) {
      console.log('📚 CourseStorage: Using memory-cached course:', courseId);
      return this.contentCache.get(courseId)!;
    }

    try {
      console.log('📚 CourseStorage: Fetching full course content:', courseId);
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/api/courses/${userId}/${courseId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.course) {
        const loadTime = Date.now() - startTime;
        console.log(`✅ CourseStorage: Full course loaded in ${loadTime}ms`);
        
        // Cache in memory for quick access
        this.contentCache.set(courseId, data.course);
        
        return data.course;
      }
      
      throw new Error('Course not found');
      
    } catch (error) {
      console.error('❌ CourseStorage: Failed to load full course:', error);
      return null;
    }
  }

  /**
   * Extract lightweight metadata from a full course
   */
  private extractMetadata(course: GenerativeLearningModuleData): CourseMetadata {
    const gc = (course as any).generatedCourse;
    return {
      id: course.id,
      title: course.title || gc?.courseTitle || 'Untitled',
      description: course.description || gc?.courseDescription || '',
      category: course.category || 'custom',
      difficulty: course.difficulty || 'beginner',
      thumbnail: course.thumbnail,
      estimatedMinutes: course.estimatedMinutes || gc?.totalEstimatedMinutes || 30,
      sectionCount: gc?.sections?.length || 0,
      hasGeneratedContent: !!(gc?.sections?.length > 0),
      progress: 0
    };
  }

  /**
   * Create a lightweight course object for dashboard display
   * Has structure but no heavy chunk content
   */
  private createLightweightCourse(course: any): GenerativeLearningModuleData {
    const gc = course.generatedCourse;
    
    // Create lightweight version - keep section structure but strip chunk content
    const lightweightGeneratedCourse = gc ? {
      ...gc,
      sections: gc.sections?.map((s: any) => ({
        ...s,
        // Keep structure but minimize chunk data
        chunks: s.chunks?.map((c: any) => ({
          id: c.id,
          title: c.title,
          type: c.type,
          isCompleted: c.isCompleted || false,
          // Strip heavy content - will be loaded on demand
          content: '[Content loads when opened]',
          quizQuestions: c.quizQuestions?.length > 0 ? [{ placeholder: true, count: c.quizQuestions.length }] : undefined,
          vocabularyItems: c.vocabularyItems?.length > 0 ? [{ placeholder: true, count: c.vocabularyItems.length }] : undefined
        })) || []
      })) || []
    } : undefined;

    return {
      ...course,
      generatedCourse: lightweightGeneratedCourse,
      // 🎯 CRITICAL: Preserve hasGeneratedContent from backend for metadata-only loads
      // OR calculate it from sections if we have them
      hasGeneratedContent: course.hasGeneratedContent === true || !!(gc?.sections?.length > 0)
    };
  }

  /**
   * Save a course to database (and update localStorage metadata)
   */
  async saveCourse(userId: string, course: GenerativeLearningModuleData): Promise<boolean> {
    if (!userId || !course) {
      console.error('❌ CourseStorage: Missing userId or course');
      return false;
    }

    // Update localStorage metadata + memory cache (fast, won't exceed quota)
    this.updateLocalStorageMetadata(course);

    try {
      console.log('📚 CourseStorage: Saving course to database:', course.id);
      
      const response = await fetch(`${API_BASE}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, course })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ CourseStorage: Course saved to DB:', course.id);
        return true;
      }
      
      throw new Error(data.error || 'Save failed');
      
    } catch (error) {
      console.error('❌ CourseStorage: DB save failed:', error);
      // Metadata is in localStorage, full content in memory cache
      return false;
    }
  }

  /**
   * Update course progress
   */
  async updateProgress(userId: string, courseId: string, progress: CourseProgress): Promise<boolean> {
    if (!userId || !courseId) return false;

    // Update localStorage progress
    const progressKey = `course_progress_${courseId}`;
    localStorage.setItem(progressKey, JSON.stringify(progress));

    try {
      const response = await fetch(`${API_BASE}/api/courses/${courseId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, progress })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      console.log('✅ CourseStorage: Progress synced to DB');
      return true;
      
    } catch (error) {
      console.warn('⚠️ CourseStorage: Progress sync failed (cached locally):', error);
      return false;
    }
  }

  /**
   * Delete a course
   */
  async deleteCourse(userId: string, courseId: string): Promise<boolean> {
    if (!userId || !courseId) return false;

    // Remove from localStorage
    this.removeFromLocalStorage(courseId);
    localStorage.removeItem(`course_progress_${courseId}`);

    try {
      const response = await fetch(
        `${API_BASE}/api/courses/${courseId}?userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      console.log('✅ CourseStorage: Course deleted from DB:', courseId);
      return true;
      
    } catch (error) {
      console.error('❌ CourseStorage: DB delete failed:', error);
      return false;
    }
  }

  /**
   * Sync all localStorage courses to database (for migration)
   */
  async syncLocalToDatabase(userId: string): Promise<number> {
    if (this.syncInProgress) {
      console.log('⏳ CourseStorage: Sync already in progress');
      return 0;
    }

    this.syncInProgress = true;
    let syncedCount = 0;

    try {
      const localCourses = this.loadFromLocalStorage();
      console.log(`📤 CourseStorage: Syncing ${localCourses.length} local courses to DB`);

      for (const course of localCourses) {
        const success = await this.saveCourse(userId, course);
        if (success) syncedCount++;
      }

      console.log(`✅ CourseStorage: Synced ${syncedCount}/${localCourses.length} courses to DB`);
      
    } finally {
      this.syncInProgress = false;
    }

    return syncedCount;
  }

  // ================== Local Storage Helpers (Metadata Only) ==================

  /**
   * Load METADATA only from localStorage (lightweight)
   */
  private loadMetadataFromLocalStorage(): GenerativeLearningModuleData[] {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!saved) return [];
      
      const metadata: CourseMetadata[] = JSON.parse(saved);
      
      // Convert metadata back to lightweight course objects
      return metadata.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        category: m.category,
        difficulty: m.difficulty as any,
        thumbnail: m.thumbnail,
        estimatedMinutes: m.estimatedMinutes,
        type: 'generative' as const,
        subject: m.title,
        topics: [],
        learningObjectives: [],
        // Indicate that content needs to be loaded
        generatedCourse: m.hasGeneratedContent ? {
          moduleId: m.id,
          courseTitle: m.title,
          courseDescription: m.description,
          sections: Array(m.sectionCount).fill(null).map((_, i) => ({
            id: `section_${i}`,
            stepNumber: i + 1,
            title: `Section ${i + 1}`,
            content: '[Content loads when opened]',
            type: 'core_concept' as const,
            estimatedMinutes: 5,
            keyPoints: [],
            isCompleted: false,
            isLocked: false,
            chunks: []
          })),
          totalEstimatedMinutes: m.estimatedMinutes,
          targetedConcepts: [],
          adaptedForLevel: m.difficulty as any,
          generatedAt: new Date(),
          competencies: []
        } : undefined
      } as GenerativeLearningModuleData));
    } catch {
      return [];
    }
  }

  /**
   * Save METADATA only to localStorage (prevents quota issues)
   */
  private saveMetadataToLocalStorage(metadata: CourseMetadata[]): void {
    try {
      // Metadata is very small - should never exceed quota
      const jsonSize = JSON.stringify(metadata).length;
      console.log(`📦 CourseStorage: Saving ${metadata.length} course metadata (${(jsonSize / 1024).toFixed(1)}KB)`);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(metadata));
    } catch (e) {
      console.warn('⚠️ CourseStorage: localStorage metadata save failed:', e);
    }
  }

  /**
   * Update metadata for a single course
   */
  private updateLocalStorageMetadata(course: GenerativeLearningModuleData): void {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const metadata: CourseMetadata[] = saved ? JSON.parse(saved) : [];
      
      const newMetadata = this.extractMetadata(course);
      const existingIndex = metadata.findIndex(m => m.id === course.id);
      
      if (existingIndex >= 0) {
        metadata[existingIndex] = newMetadata;
      } else {
        metadata.push(newMetadata);
      }
      
      this.saveMetadataToLocalStorage(metadata);
      
      // Also update memory cache with full content
      this.contentCache.set(course.id, course);
    } catch (e) {
      console.warn('⚠️ CourseStorage: localStorage metadata update failed:', e);
    }
  }

  private removeFromLocalStorage(courseId: string): void {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const metadata: CourseMetadata[] = saved ? JSON.parse(saved) : [];
      const filtered = metadata.filter(m => m.id !== courseId);
      this.saveMetadataToLocalStorage(filtered);
      
      // Also remove from memory cache
      this.contentCache.delete(courseId);
    } catch (e) {
      console.warn('⚠️ CourseStorage: localStorage remove failed:', e);
    }
  }

  /**
   * Clear content cache to free memory
   */
  clearContentCache(): void {
    this.contentCache.clear();
    console.log('🧹 CourseStorage: Content cache cleared');
  }
}

export const courseStorageService = CourseStorageService.getInstance();
export default CourseStorageService;

