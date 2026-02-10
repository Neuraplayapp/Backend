/**
 * 🧠 LLM Helper Service
 * 
 * Battle-tested helper for 3-tier detection:
 * 1. Fast structural checks (no LLM)
 * 2. LLM semantic analysis (cached, with fallback)
 * 3. Pattern-matching fallback
 * 
 * Features:
 * - Automatic caching (configurable TTL)
 * - Graceful fallback when LLM unavailable
 * - Confidence scoring
 * - Source tracking (llm | cache | fallback)
 * - Debug logging
 */

export interface ClassifyResult {
    result: string;
    source: 'llm' | 'cache' | 'fallback';
    confidence: number;
    cacheKey?: string;
    duration?: number;
  }
  
  interface CacheEntry {
    result: string;
    confidence: number;
    timestamp: number;
    ttl: number;
  }
  
  export class LLMService {
    private cache = new Map<string, CacheEntry>();
    private enabled: boolean = true;
    private defaultTTL: number = 5 * 60 * 1000; // 5 minutes
    private debugMode: boolean = false;
    private stats = {
      totalCalls: 0,
      cacheHits: 0,
      llmCalls: 0,
      fallbackCalls: 0,
      errors: 0,
    };
  
    constructor(options?: { enabled?: boolean; defaultTTL?: number; debug?: boolean }) {
      this.enabled = options?.enabled ?? true;
      this.defaultTTL = options?.defaultTTL ?? this.defaultTTL;
      this.debugMode = options?.debug ?? false;
    }
  
    /**
     * Classify input using LLM with automatic caching and fallback
     */
    async classify(
      input: string,
      prompt: string,
      fallbackFn: () => string,
      cacheKey: string,
      options?: { ttl?: number; minConfidence?: number }
    ): Promise<ClassifyResult> {
      const start = performance.now();
      this.stats.totalCalls++;
  
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        this.log(`Cache HIT for key: ${cacheKey}`);
        return {
          result: cached.result,
          source: 'cache',
          confidence: cached.confidence,
          cacheKey,
          duration: performance.now() - start,
        };
      }
  
      // Try LLM if enabled
      if (this.enabled) {
        try {
          this.stats.llmCalls++;
          const llmResult = await this.callLLM(input, prompt);
          
          if (llmResult) {
            const confidence = this.estimateConfidence(llmResult, input);
            const ttl = options?.ttl ?? this.defaultTTL;
            
            this.setCache(cacheKey, llmResult, confidence, ttl);
            this.log(`LLM result for key: ${cacheKey} → "${llmResult}" (confidence: ${confidence})`);
            
            return {
              result: llmResult,
              source: 'llm',
              confidence,
              cacheKey,
              duration: performance.now() - start,
            };
          }
        } catch (error) {
          this.stats.errors++;
          this.log(`LLM error for key: ${cacheKey}: ${error}`, 'warn');
        }
      }
  
      // Fallback
      this.stats.fallbackCalls++;
      const fallbackResult = fallbackFn();
      this.log(`Fallback for key: ${cacheKey} → "${fallbackResult}"`);
      
      // Cache fallback result too (shorter TTL)
      this.setCache(cacheKey, fallbackResult, 0.6, (options?.ttl ?? this.defaultTTL) / 2);
      
      return {
        result: fallbackResult,
        source: 'fallback',
        confidence: 0.6,
        cacheKey,
        duration: performance.now() - start,
      };
    }
  
    /**
     * Batch classify multiple inputs
     */
    async classifyBatch(
      items: Array<{
        input: string;
        prompt: string;
        fallbackFn: () => string;
        cacheKey: string;
      }>
    ): Promise<ClassifyResult[]> {
      return Promise.all(
        items.map(item => this.classify(item.input, item.prompt, item.fallbackFn, item.cacheKey))
      );
    }
  
    /**
     * Simple yes/no classification
     */
    async isMatch(
      input: string,
      question: string,
      fallbackFn: () => boolean,
      cacheKey: string
    ): Promise<{ match: boolean; source: ClassifyResult['source']; confidence: number }> {
      const result = await this.classify(
        input,
        `${question}\n\nRespond with ONLY "yes" or "no".`,
        () => fallbackFn() ? 'yes' : 'no',
        cacheKey
      );
      
      return {
        match: result.result.toLowerCase().trim() === 'yes',
        source: result.source,
        confidence: result.confidence,
      };
    }
  
    // ─────────────────────────────────────────
    // Cache Management
    // ─────────────────────────────────────────
  
    private getFromCache(key: string): CacheEntry | null {
      const entry = this.cache.get(key);
      if (!entry) return null;
      
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return null;
      }
      
      return entry;
    }
  
    private setCache(key: string, result: string, confidence: number, ttl: number): void {
      this.cache.set(key, {
        result,
        confidence,
        timestamp: Date.now(),
        ttl,
      });
    }
  
    clearCache(): void {
      this.cache.clear();
    }
  
    getCacheSize(): number {
      return this.cache.size;
    }
  
    // ─────────────────────────────────────────
    // LLM Integration (Stub - replace with actual LLM call)
    // ─────────────────────────────────────────
  
    private async callLLM(input: string, prompt: string): Promise<string | null> {
      // This is a stub. In production, replace with actual LLM API call.
      // For now, returns null to always use fallback.
      // 
      // Example integration:
      // const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      //   method: 'POST',
      //   headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     messages: [
      //       { role: 'system', content: prompt },
      //       { role: 'user', content: input }
      //     ],
      //     max_tokens: 50,
      //     temperature: 0.1,
      //   })
      // });
      // const data = await response.json();
      // return data.choices?.[0]?.message?.content?.trim() || null;
      
      return null;
    }
  
    private estimateConfidence(result: string, input: string): number {
      // Simple confidence estimation based on result characteristics
      if (!result || result.length === 0) return 0.1;
      if (result.length > 500) return 0.5; // Suspiciously long
      if (result.split(' ').length <= 3) return 0.9; // Concise = confident
      return 0.75;
    }
  
    // ─────────────────────────────────────────
    // Configuration
    // ─────────────────────────────────────────
  
    setEnabled(enabled: boolean): void {
      this.enabled = enabled;
    }
  
    isEnabled(): boolean {
      return this.enabled;
    }
  
    setDebugMode(debug: boolean): void {
      this.debugMode = debug;
    }
  
    getStats(): typeof this.stats & { cacheHitRate: number; fallbackRate: number } {
      return {
        ...this.stats,
        cacheHitRate: this.stats.totalCalls > 0
          ? (this.stats.cacheHits / this.stats.totalCalls) * 100
          : 0,
        fallbackRate: this.stats.totalCalls > 0
          ? (this.stats.fallbackCalls / this.stats.totalCalls) * 100
          : 0,
      };
    }
  
    resetStats(): void {
      this.stats = {
        totalCalls: 0,
        cacheHits: 0,
        llmCalls: 0,
        fallbackCalls: 0,
        errors: 0,
      };
    }
  
    private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
      if (!this.debugMode) return;
      const prefix = '🧠 LLMService:';
      switch (level) {
        case 'warn': console.warn(prefix, message); break;
        case 'error': console.error(prefix, message); break;
        default: console.log(prefix, message);
      }
    }
  }
  
  // Singleton instance
  export const llmService = new LLMService({ debug: false });  