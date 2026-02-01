/**
 * 🔑 CENTRALIZED USER ID SERVICE - SINGLE SOURCE OF TRUTH
 * 
 * This service ensures consistent user identification across ALL components:
 * - Memory storage/retrieval (MemoryDatabaseBridge)
 * - Conversation history (ConversationMemoryService)
 * - Canvas vectorization (NeuraPlayDocumentCanvas)
 * - AI routing fallbacks (AIRouter)
 * 
 * CRITICAL: Reads from 'neuraplay_user' localStorage key (same as UserContext)
 * to prevent user ID fragmentation and memory loss issues.
 * 
 * Priority chain: neuraplay_user.id > neuraplay_user.username > neuraplay_user.email > fallback
 * 
 * ⚠️ NEVER create alternative user ID systems - always use this service!
 */

export class UserIdService {
  private static instance: UserIdService;
  // 🚨 REMOVED cached userId - was causing cross-user memory leakage!
  // Now ALWAYS reads fresh from localStorage

  private constructor() {}

  static getInstance(): UserIdService {
    if (!UserIdService.instance) {
      UserIdService.instance = new UserIdService();
    }
    return UserIdService.instance;
  }

  /**
   * Get the current user ID - SINGLE SOURCE OF TRUTH
   * 
   * 🚨 CRITICAL FIX: ALWAYS reads FRESH from localStorage!
   * Never cache the userId - prevents cross-user memory leakage when
   * users logout/login on the same browser.
   */
  getCurrentUserId(): string {
    if (typeof window !== 'undefined') {
      // 🚨 ALWAYS read fresh from localStorage - NEVER use cached value
      const storedUser = localStorage.getItem('neuraplay_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          // Priority: id (UUID) > username > email
          const resolvedId = userData.id || userData.username || userData.email;
          
          if (resolvedId) {
          return resolvedId;
          }
        } catch (error) {
          console.warn('⚠️ UserIdService: Invalid stored user data');
        }
      }
      
      // No valid user in localStorage = not logged in
      console.warn('🚨 UserIdService: No user in localStorage - user not logged in!');
      return 'anonymous';
  }

    // Server-side - should not happen in frontend
    return 'anonymous';
  }

  /**
   * Resolve user ID from user object
   * Handles various user object formats consistently
   */
  resolveFromUserObject(user: any): string {
    if (!user) {
      return this.getCurrentUserId();
    }

    // Priority order: id (UUID) > username > email
    const userId = user.id || user.username || user.email;
    
    if (userId) {
      return userId;
    }

    return this.getCurrentUserId();
  }

  /**
   * Clear user session - removes cached user data
   */
  clearUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('neuraplay_user_id');
    }
    console.log('🔑 UserIdService: User session cleared');
  }
}

// Export singleton instance
export const userIdService = UserIdService.getInstance();

