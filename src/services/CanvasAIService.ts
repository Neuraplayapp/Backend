/**
 * 🎯 Canvas AI Service
 * 
 * AI-powered content generation for canvas elements.
 * (Stub - to be implemented later)
 */

export class CanvasAIService {
  clear(): void {
    // Stub method
    console.log('[np] canvas-ai:clear');
  }
}

// Singleton
let instance: CanvasAIService | null = null;

export function getCanvasAIService(): CanvasAIService {
  if (!instance) {
    instance = new CanvasAIService();
  }
  return instance;
}
