/**
 * 🗄️ LOCAL STORAGE MANAGER
 * 
 * Manages localStorage quota to prevent QuotaExceededError
 * - Automatically cleans up old course data
 * - Monitors storage usage
 * - Provides fallback strategies
 */

interface StorageItem {
  key: string;
  size: number;
  timestamp: number;
}

export class StorageManager {
  private readonly MAX_STORAGE_MB = 5; // 5MB soft limit
  private readonly CLEANUP_THRESHOLD_MB = 4; // Start cleanup at 4MB
  
  /**
   * Get approximate size of a value in bytes
   */
  private getValueSize(value: string): number {
    return new Blob([value]).size;
  }

  /**
   * Get current localStorage usage
   */
  private getCurrentUsage(): { totalBytes: number; items: StorageItem[] } {
    const items: StorageItem[] = [];
    let totalBytes = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = this.getValueSize(value);
          totalBytes += size;
          
          // Try to extract timestamp from value if it's JSON
          let timestamp = Date.now();
          try {
            const parsed = JSON.parse(value);
            if (parsed.timestamp) {
              timestamp = new Date(parsed.timestamp).getTime();
            }
          } catch (e) {
            // Not JSON or no timestamp, use current time
          }
          
          items.push({ key, size, timestamp });
        }
      }
    }

    return { totalBytes, items };
  }

  /**
   * Clean up old course progress data
   */
  private cleanupOldCourseData(): boolean {
    const courseKeys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('course_progress_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const data = JSON.parse(value);
            const age = Date.now() - new Date(data.timestamp || 0).getTime();
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            
            // Remove courses older than 7 days or incomplete courses older than 1 day
            if (age > sevenDays || (age > 24 * 60 * 60 * 1000 && !data.completed)) {
              courseKeys.push(key);
            }
          }
        } catch (e) {
          // Invalid data, mark for removal
          courseKeys.push(key);
        }
      }
    }

    // Remove old courses
    courseKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed old course data: ${key}`);
      } catch (e) {
        console.error(`Failed to remove ${key}:`, e);
      }
    });

    return courseKeys.length > 0;
  }

  /**
   * Clean up by removing least recently used items
   */
  private cleanupLRU(targetBytes: number): boolean {
    const { items } = this.getCurrentUsage();
    
    // Sort by timestamp (oldest first)
    items.sort((a, b) => a.timestamp - b.timestamp);
    
    let freedBytes = 0;
    const removedKeys: string[] = [];

    // Remove oldest items until we free enough space
    for (const item of items) {
      if (freedBytes >= targetBytes) break;
      
      // Don't remove critical items
      if (item.key.startsWith('user_') || item.key.startsWith('auth_')) {
        continue;
      }

      try {
        localStorage.removeItem(item.key);
        freedBytes += item.size;
        removedKeys.push(item.key);
      } catch (e) {
        console.error(`Failed to remove ${item.key}:`, e);
      }
    }

    if (removedKeys.length > 0) {
      console.log(`🗑️ Cleaned up ${removedKeys.length} items, freed ${(freedBytes / 1024 / 1024).toFixed(2)}MB`);
    }

    return freedBytes >= targetBytes;
  }

  /**
   * Set item with automatic cleanup
   */
  public setItem(key: string, value: string): boolean {
    const valueSize = this.getValueSize(value);
    const { totalBytes } = this.getCurrentUsage();
    const totalMB = totalBytes / 1024 / 1024;
    const valueMB = valueSize / 1024 / 1024;

    // Check if we need cleanup
    if (totalMB > this.CLEANUP_THRESHOLD_MB || totalMB + valueMB > this.MAX_STORAGE_MB) {
      console.warn(`⚠️ Storage usage high: ${totalMB.toFixed(2)}MB, attempting cleanup...`);
      
      // Try cleanup strategies in order
      if (!this.cleanupOldCourseData()) {
        // If course cleanup didn't help, use LRU
        const targetFree = this.MAX_STORAGE_MB * 1024 * 1024 * 0.3; // Free 30% of max
        this.cleanupLRU(targetFree);
      }
    }

    // Try to set the item
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('❌ QuotaExceededError: Emergency cleanup...');
        
        // Emergency cleanup: remove more aggressively
        const emergencyTarget = this.MAX_STORAGE_MB * 1024 * 1024 * 0.5; // Free 50%
        this.cleanupLRU(emergencyTarget);
        
        // Try again
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          console.error('❌ Failed to set item even after cleanup:', retryError);
          return false;
        }
      }
      
      console.error('❌ Failed to set localStorage item:', error);
      return false;
    }
  }

  /**
   * Get item from localStorage with JSON parsing
   */
  public get<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (e) {
      console.warn(`⚠️ Failed to get/parse localStorage item ${key}:`, e);
      return null;
    }
  }

  /**
   * Set item with JSON stringify and automatic cleanup
   */
  public set<T>(key: string, value: T): boolean {
    try {
      const jsonValue = JSON.stringify(value);
      return this.setItem(key, jsonValue);
    } catch (e) {
      console.warn(`⚠️ Failed to stringify/set localStorage item ${key}:`, e);
      return false;
    }
  }

  /**
   * Get storage usage report
   */
  public getUsageReport(): {
    totalMB: number;
    itemCount: number;
    largestItems: Array<{ key: string; sizeMB: number }>;
  } {
    const { totalBytes, items } = this.getCurrentUsage();
    
    const largestItems = items
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(item => ({
        key: item.key,
        sizeMB: item.size / 1024 / 1024
      }));

    return {
      totalMB: totalBytes / 1024 / 1024,
      itemCount: items.length,
      largestItems
    };
  }

  /**
   * Clear all course progress data (manual cleanup)
   */
  public clearAllCourseData(): number {
    let count = 0;
    const keys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('course_progress_')) {
        keys.push(key);
      }
    }

    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
        count++;
      } catch (e) {
        console.error(`Failed to remove ${key}:`, e);
      }
    });

    console.log(`🗑️ Cleared ${count} course progress items`);
    return count;
  }
}

// Export singleton instance
export const storageManager = new StorageManager();

// Auto-cleanup on page load
if (typeof window !== 'undefined') {
  const report = storageManager.getUsageReport();
  console.log(`📊 Storage Usage: ${report.totalMB.toFixed(2)}MB across ${report.itemCount} items`);
  
  if (report.totalMB > 4) {
    console.warn('⚠️ High storage usage detected, running cleanup...');
    storageManager.setItem('_cleanup_check_' + Date.now(), '{}'); // Trigger cleanup
  }
}

