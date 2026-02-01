// Service Initializer - Ensures all singletons work in production
export class ServiceInitializer {
  private static initialized = false;
  private static services = new Map();

  static async initializeAll() {
    if (this.initialized) return;
    
    console.log('🔧 ServiceInitializer: Starting critical service initialization...');
    
    try {
      // Force-initialize APIService first (required by everything)
      const { APIService } = await import('./APIService');
      const apiService = APIService.getInstance();
      this.services.set('apiService', apiService);
      console.log('✅ APIService initialized');
      
      // 🧠 NEW: Use UnifiedCognitiveAnalyzer instead of old monolith
      try {
        const { unifiedCognitiveAnalyzer } = await import('./UnifiedCognitiveAnalyzer');
        this.services.set('unifiedCognitiveAnalyzer', unifiedCognitiveAnalyzer);
        this.services.set('cognitiveAnalyzer', unifiedCognitiveAnalyzer); // Alias
        console.log('✅ UnifiedCognitiveAnalyzer initialized (replacing old monolith)');
        
        // Legacy fallback for code that still expects intentAnalysisService
        this.services.set('intentAnalysisService', {
          analyzeIntentHierarchy: async (message: string, context: any) => {
            console.warn('⚠️ Legacy intentAnalysisService called, redirecting to UnifiedCognitiveAnalyzer');
            const result = await unifiedCognitiveAnalyzer.analyzeMessage({
              message,
              sessionContext: context
            });
            return {
              primaryIntent: result.intent.primaryIntent,
              processingMode: result.processingMode.mode,
              confidence: result.confidence,
              shouldExecute: result.intent.shouldExecute
            };
          }
        });
      } catch (error) {
        console.error('❌ UnifiedCognitiveAnalyzer failed, using minimal fallback:', error);
        // Create minimal fallback service
        this.services.set('intentAnalysisService', {
          analyzeIntentHierarchy: async () => ({
            primaryIntent: 'conversational',
            mode: 'chat',
            confidence: 0.5,
            parameters: {}
          })
        });
      }
      
      // Initialize other critical services
      const services = [
        'DocumentGenerator',
        'CodeGenerator', 
        'ContentRenderer',
        'WebSocketService'
      ];
      
      for (const serviceName of services) {
        try {
          const module = await import(`./${serviceName}`);
          const ServiceClass = module[serviceName] || module.default;
          if (ServiceClass && ServiceClass.getInstance) {
            const instance = ServiceClass.getInstance();
            this.services.set(serviceName.toLowerCase(), instance);
            console.log(`✅ ${serviceName} initialized`);
          }
        } catch (error) {
          console.warn(`⚠️ ${serviceName} failed to initialize:`, error);
        }
      }
      
      this.initialized = true;
      console.log('🎉 ServiceInitializer: All critical services initialized');
      
    } catch (error) {
      console.error('💥 ServiceInitializer: Critical failure:', error);
      throw error;
    }
  }
  
  static getService(name: string) {
    return this.services.get(name);
  }
  
  static isReady() {
    return this.initialized;
  }
}
