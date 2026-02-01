import { useNavigate } from 'react-router-dom';

export interface PageInfo {
  path: string;
  name: string;
  description: string;
  icon: string;
  category: 'main' | 'games' | 'social' | 'settings' | 'help';
  requiresAuth: boolean;
  isActive: boolean;
}

export class NavigationService {
  private static instance: NavigationService;
  private pages: Map<string, PageInfo> = new Map();
  private navigate: any;

  private constructor() {
    this.initializePages();
  }

  static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

  setNavigate(navigate: any) {
    this.navigate = navigate;
  }

  private initializePages() {
    const allPages: PageInfo[] = [
      { path: '/', name: 'Home', description: 'Main landing page', icon: '🏠', category: 'main', requiresAuth: false, isActive: true },
      { path: '/playground', name: 'Playground', description: 'Games and activities', icon: '��', category: 'games', requiresAuth: false, isActive: true },
      { path: '/dashboard', name: 'Dashboard', description: 'Your learning progress', icon: '📊', category: 'main', requiresAuth: true, isActive: true },
      { path: '/forum', name: 'Forum', description: 'Community discussions', icon: '💬', category: 'social', requiresAuth: false, isActive: true },
      { path: '/forum-registration', name: 'Forum Registration', description: 'Join the forum', icon: '📝', category: 'social', requiresAuth: false, isActive: true },
      { path: '/registration', name: 'Registration', description: 'Create an account', icon: '👤', category: 'main', requiresAuth: false, isActive: true },
      { path: '/signin', name: 'Sign In', description: 'Login to your account', icon: '🔑', category: 'main', requiresAuth: false, isActive: true },
      { path: '/ai-report', name: 'AI Report', description: 'AI learning analytics', icon: '📈', category: 'main', requiresAuth: true, isActive: true },
      { path: '/about', name: 'About Us', description: 'Learn about NeuraPlay', icon: 'ℹ️', category: 'help', requiresAuth: false, isActive: true },
      { path: '/license', name: 'License Agreement', description: 'Software license and legal terms', icon: '⚖️', category: 'help', requiresAuth: false, isActive: true },
      { path: '/counting-test', name: 'Counting Test', description: 'Math practice', icon: '��', category: 'games', requiresAuth: false, isActive: true },
      { path: '/test', name: 'Test Page', description: 'Testing features', icon: '🧪', category: 'help', requiresAuth: false, isActive: true },
      { path: '/text-reveal', name: 'Text Reveal', description: 'Text animations', icon: '✨', category: 'help', requiresAuth: false, isActive: true },
      { path: '/old-home', name: 'Old Home', description: 'Previous home page', icon: '🏠', category: 'main', requiresAuth: false, isActive: false },
      { path: '/profile', name: 'Profile', description: 'Your user profile', icon: '👤', category: 'settings', requiresAuth: true, isActive: true },
      { path: '/user-profile', name: 'User Profile', description: 'Detailed user profile', icon: '👤', category: 'settings', requiresAuth: true, isActive: true }
    ];

    allPages.forEach(page => {
      this.pages.set(page.path, page);
    });
  }

  /**
   * Navigate to a page by page name (alias for navigateTo with path lookup)
   * @param pageName - The page name or path to navigate to
   * @param user - The user object or userId for authentication checks (not navigation params)
   */
  async navigateToPage(pageName: string, user?: any): Promise<{ success: boolean; message: string }> {
    console.log('🔍 NavigationService Debug - navigateToPage called with:', { pageName, hasUser: !!user, userId: typeof user === 'string' ? user : user?.id });
    
    // Handle direct paths
    if (pageName.startsWith('/')) {
      return this.navigateTo(pageName, user);
    }
    
    // Convert page name to path
    const pageNameLower = pageName.toLowerCase();
    const pathMap: Record<string, string> = {
      'home': '/',
      'homepage': '/',
      'playground': '/playground',
      'dashboard': '/dashboard',
      'learning central': '/dashboard',  // 🎯 Learning Central = Dashboard
      'learning-central': '/dashboard',
      'learningcentral': '/dashboard',
      'courses': '/dashboard',
      'my courses': '/dashboard',
      'forum': '/forum',
      'profile': '/profile',
      'about': '/about',
      'license': '/license',
      'legal': '/license',
      'signin': '/signin',
      'login': '/signin',
      'registration': '/registration',
      'signup': '/registration',
      'ai-report': '/ai-report',
      'user-profile': '/user-profile',
      'settings': '/settings'
    };
    
    const path = pathMap[pageNameLower] || `/${pageNameLower}`;
    return this.navigateTo(path, user);
  }

  async navigateTo(path: string, user?: any): Promise<{ success: boolean; message: string }> {
    console.log('🔍 NavigationService Debug - navigateTo called with:', { path, user });
    console.log('🔍 NavigationService Debug - navigate function available:', !!this.navigate);
    
    const page = this.pages.get(path);
    console.log('🔍 NavigationService Debug - page found:', page);
    
    if (!page) {
      console.log('🔍 NavigationService Debug - Page not found');
      return { success: false, message: `Page "${path}" not found! 🚫` };
    }

    if (!page.isActive) {
      console.log('🔍 NavigationService Debug - Page not active');
      return { success: false, message: `Page "${page.name}" is not available! 🚫` };
    }

    if (page.requiresAuth && !user) {
      console.log('🔍 NavigationService Debug - Auth required but no user');
      return { success: false, message: `You need to sign in to access "${page.name}"! 🚫` };
    }

    try {
      if (this.navigate) {
        console.log('🔍 NavigationService Debug - Using React Router navigate');
        this.navigate(path);
        return { success: true, message: `🚀 Taking you to ${page.name}! ${page.description} ✨` };
      }
      // No navigate available: DO NOT redirect implicitly
      console.warn('🔍 NavigationService Debug - No navigate available; suppressing fallback redirect');
      return { success: false, message: `Navigation suppressed (no router). Intended: ${page.name}` };
    } catch (error) {
      console.error('🔍 NavigationService Debug - Navigation error:', error);
      return { success: false, message: `Failed to navigate to "${page.name}"! 🚫` };
    }
  }

  getPageInfo(path: string): PageInfo | null {
    return this.pages.get(path) || null;
  }

  getAllPages(): PageInfo[] {
    return Array.from(this.pages.values()).filter(page => page.isActive);
  }

  getPagesByCategory(category: string): PageInfo[] {
    return this.getAllPages().filter(page => page.category === category);
  }

  /**
   * 🎯 Navigate to a specific course by name
   * Navigates to dashboard with course parameter so it auto-opens
   */
  async navigateToCourse(courseName: string, user?: any): Promise<{ success: boolean; message: string }> {
    console.log('📚 NavigationService: Navigating to course:', courseName);
    
    if (!this.navigate) {
      console.warn('⚠️ NavigationService: No router available');
      return { success: false, message: 'Navigation not available' };
    }
    
    // Encode the course name for URL
    const encodedCourse = encodeURIComponent(courseName);
    const path = `/dashboard?openCourse=${encodedCourse}`;
    
    try {
      this.navigate(path);
      return { 
        success: true, 
        message: `🚀 Opening your "${courseName}" course! Let's continue learning! ✨` 
      };
    } catch (error) {
      console.error('❌ NavigationService: Course navigation failed:', error);
      return { success: false, message: `Failed to open course "${courseName}"` };
    }
  }
  
  /**
   * Find a course by name (fuzzy match)
   */
  findCourseByName(courseName: string, availableCourses: string[]): string | null {
    const searchLower = courseName.toLowerCase();
    
    // Exact match
    const exactMatch = availableCourses.find(c => c.toLowerCase() === searchLower);
    if (exactMatch) return exactMatch;
    
    // Contains match
    const containsMatch = availableCourses.find(c => 
      c.toLowerCase().includes(searchLower) || 
      searchLower.includes(c.toLowerCase())
    );
    if (containsMatch) return containsMatch;
    
    // Word match (e.g., "greek" matches "Greek Language Course")
    const wordMatch = availableCourses.find(c => {
      const words = c.toLowerCase().split(/\s+/);
      return words.some(word => word.startsWith(searchLower) || searchLower.startsWith(word));
    });
    
    return wordMatch || null;
  }

  searchPages(query: string): PageInfo[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPages().filter(page => 
      page.name.toLowerCase().includes(lowerQuery) ||
      page.description.toLowerCase().includes(lowerQuery) ||
      page.path.toLowerCase().includes(lowerQuery)
    );
  }
} 