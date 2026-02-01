// Centralized LLM Model Configuration
// Single source of truth for all AI model selections across the platform

export interface ModelEndpoint {
  provider: 'fireworks' | 'openai' | 'anthropic';
  modelPath: string;
  displayName: string;
  capabilities: ('text' | 'code' | 'reasoning' | 'fast' | 'vision')[];
  contextWindow: number;
  costTier: 'low' | 'medium' | 'high';
}

export interface ModelConfiguration {
  // NPU & Intent Analysis
  intentAnalysis: string;
  
  // Canvas Operations
  documentGeneration: string;
  codeGeneration: string;
  chartGeneration: string;
  
  // Memory Operations
  memoryExtraction: string;
  memoryRetrieval: string;
  
  // Cognitive Modules
  errorDetection: string;
  theoryOfMind: string;
  semanticAnalysis: string;
  
  // Chat Operations
  generalChat: string;
  creativeTasks: string;
  technicalTasks: string;
  
  // Vision Operations
  visionAnalysis: string;
  documentSummarization: string;
  
  // Fallback
  fallback: string;
}

// Available Model Endpoints
export const AVAILABLE_MODELS: Record<string, ModelEndpoint> = {
  // === FIREWORKS MODELS ===
  'llama-8b': {
    provider: 'fireworks',
    modelPath: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
    displayName: 'Llama 3.1 8B (Fast)',
    capabilities: ['text', 'fast'],
    contextWindow: 8192,
    costTier: 'low'
  },
  
  'gpt-oss-20b': {
    provider: 'fireworks',
    modelPath: 'accounts/fireworks/models/gpt-oss-20b',
    displayName: 'GPT OSS 20B (Code)',
    capabilities: ['text', 'code'],
    contextWindow: 4096,
    costTier: 'medium'
  },
  
  'gpt-oss-120b': {
    provider: 'fireworks',
    modelPath: 'accounts/fireworks/models/gpt-oss-120b',
    displayName: 'GPT OSS 120B (Advanced)',
    capabilities: ['text', 'reasoning', 'code'],
    contextWindow: 4096,
    costTier: 'high'
  },
  
  // === VISION MODELS ===
  'llama-maverick-vision': {
    provider: 'fireworks',
    modelPath: 'accounts/fireworks/models/llama-v4-maverick-vision',
    displayName: 'Llama 4 Maverick Vision',
    capabilities: ['text', 'vision', 'code', 'reasoning'],
    contextWindow: 8192,
    costTier: 'medium'
  },
  
  'llama-scout': {
    provider: 'fireworks',
    modelPath: 'accounts/fireworks/models/llama4-scout-instruct-basic',
    displayName: 'Llama 4 Scout (Document Expert)',
    capabilities: ['text', 'vision', 'reasoning', 'code'],
    contextWindow: 131072, // 128K context for large documents
    costTier: 'high'
  },
  
  // === FUTURE EXPANSIONS ===
  'gpt-4-turbo': {
    provider: 'openai',
    modelPath: 'gpt-4-turbo-preview',
    displayName: 'GPT-4 Turbo',
    capabilities: ['text', 'reasoning', 'code'],
    contextWindow: 128000,
    costTier: 'high'
  },
  
  'claude-3-sonnet': {
    provider: 'anthropic',
    modelPath: 'claude-3-sonnet-20240229',
    displayName: 'Claude 3 Sonnet',
    capabilities: ['text', 'reasoning'],
    contextWindow: 200000,
    costTier: 'high'
  }
};

// === CURRENT MODEL CONFIGURATION ===
// DESIGN: gpt-oss-120b for quality, gpt-oss-20b for speed-critical ops
export const MODEL_CONFIG: ModelConfiguration = {
  // NPU & Intent Analysis - 20B for fast but quality classification
  intentAnalysis: 'gpt-oss-20b',
  
  // Canvas Operations - 120B for high-quality content creation
  documentGeneration: 'gpt-oss-120b',
  codeGeneration: 'gpt-oss-20b',
  chartGeneration: 'gpt-oss-120b',
  
  // Memory Operations - 20B for efficiency with quality
  memoryExtraction: 'gpt-oss-20b',
  memoryRetrieval: 'gpt-oss-20b',
  
  // Cognitive Modules - 20B for real-time processing with quality
  errorDetection: 'gpt-oss-20b',
  theoryOfMind: 'gpt-oss-20b',
  semanticAnalysis: 'gpt-oss-20b',
  
  // Chat Operations - 120B for best conversational quality
  generalChat: 'gpt-oss-120b',
  creativeTasks: 'gpt-oss-120b',
  technicalTasks: 'gpt-oss-120b',
  
  // Vision Operations - Vision-instructed models for multimodal tasks
  visionAnalysis: 'llama-maverick-vision',
  documentSummarization: 'llama-scout', // Scout for large documents (up to 150MB PDFs)
  
  // Fallback - 20B for balance
  fallback: 'gpt-oss-20b'
};

// === CONFIGURATION UTILITIES ===

/**
 * Get model endpoint for a specific operation
 */
export function getModelForOperation(operation: keyof ModelConfiguration): ModelEndpoint {
  const modelKey = MODEL_CONFIG[operation];
  const model = AVAILABLE_MODELS[modelKey];
  
  if (!model) {
    console.warn(`⚠️ Model ${modelKey} not found for operation ${operation}, using fallback`);
    return AVAILABLE_MODELS[MODEL_CONFIG.fallback];
  }
  
  return model;
}

/**
 * Get model path for use with UnifiedAPIRouter
 */
export function getModelPath(operation: keyof ModelConfiguration): string {
  return getModelForOperation(operation).modelPath;
}

/**
 * Update model configuration at runtime
 */
export function updateModelConfig(operation: keyof ModelConfiguration, modelKey: string): boolean {
  if (!AVAILABLE_MODELS[modelKey]) {
    console.error(`❌ Model ${modelKey} not available`);
    return false;
  }
  
  MODEL_CONFIG[operation] = modelKey;
  console.log(`✅ Updated ${operation} to use ${AVAILABLE_MODELS[modelKey].displayName}`);
  return true;
}

/**
 * Get configuration overview for admin/debugging
 */
export function getConfigurationOverview(): Record<string, string> {
  const overview: Record<string, string> = {};
  
  Object.entries(MODEL_CONFIG).forEach(([operation, modelKey]) => {
    const model = AVAILABLE_MODELS[modelKey];
    overview[operation] = model ? model.displayName : `Unknown (${modelKey})`;
  });
  
  return overview;
}

/**
 * Validate configuration
 */
export function validateConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  Object.entries(MODEL_CONFIG).forEach(([operation, modelKey]) => {
    if (!AVAILABLE_MODELS[modelKey]) {
      errors.push(`Operation '${operation}' references unknown model '${modelKey}'`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Export default configuration
export default MODEL_CONFIG;
