/**
 * 🌉 HNSW SYSTEM BRIDGES - CommonJS Version
 * 
 * Bridges that connect ALL existing NeuraPlay systems to use HNSW as their core vector service
 * Converted to CommonJS for server-side compatibility
 */

const { hnswCoreIntegration } = require('./HNSWCoreIntegration.cjs');

/**
 * 🧠 MEMORY SYSTEM BRIDGE
 * Connects RetrievalMachine, RecallMachine, MemoryDatabaseBridge to HNSW
 */
class MemorySystemBridge {
  static getInstance() {
    if (!MemorySystemBridge.instance) {
      MemorySystemBridge.instance = new MemorySystemBridge();
    }
    return MemorySystemBridge.instance;
  }

  /**
   * Enhanced memory storage with HNSW acceleration
   */
  async storeMemoryWithHNSW(data) {
    try {
      // 🎯 PROPER COMPONENT TYPE: Use determined type for efficient filtering at scale
      const determinedComponentType = hnswCoreIntegration.determineComponentType(
        data.memoryKey || '', 
        data.category || ''
      );
      
      // Store in HNSW for ultra-fast retrieval
      const result = await hnswCoreIntegration.storeVector({
        id: `memory_${data.memoryKey}_${Date.now()}`,
        content: data.content,
        componentType: determinedComponentType,  // 🎯 Proper type instead of hardcoded 'chat_knowledge'
        userId: data.userId,
        sessionId: data.sessionId,
        metadata: {
          memoryKey: data.memoryKey,
          category: data.category,
          importance: data.importance,
          context: data.context,
          timestamp: new Date().toISOString(),
          contentType: determinedComponentType,  // 🔧 Match component type
          tags: [data.category, 'memory', 'user_knowledge']
        }
      });

      console.log(`🧠 Memory stored with HNSW (type: ${determinedComponentType}): ${data.memoryKey}`);
      return result;
      
    } catch (error) {
      console.error('❌ Memory storage with HNSW failed:', error?.message);
      return { success: false, vectorId: '' };
    }
  }

  /**
   * Enhanced memory recall with HNSW acceleration
   */
  async recallMemoryWithHNSW(query, userId, options = {}) {
    try {
      // 🎯 ALL COMPONENT TYPES: Include all possible types for comprehensive search
      // Includes old 'chat_knowledge' for backward compatibility + all new types
      const allComponentTypes = [
        'chat_knowledge',      // Legacy (backward compatibility)
        'personal_identity',   // Names, identity
        'relationships',       // Family, friends, pets
        'professional',        // Job, education
        'personal_context',    // Location
        'emotional_state',     // Emotions
        'preferences',         // Likes, dislikes
        'interests',           // Hobbies
        'goals',               // Plans, deadlines
        'learning'             // Courses
      ];
      
      // Search using HNSW (50-100x faster)
      const searchOptions = {
        userId,
        componentTypes: options.componentTypes || allComponentTypes,  // 🎯 All types by default
        limit: options.limit || 10,
        similarityThreshold: options.similarityThreshold || 0.3,  // Lowered for better recall
        sessionId: options.sessionId,
        timeRange: options.timeRange || 'all'
      };

      const results = await hnswCoreIntegration.searchVectors(query, searchOptions);

      // Filter by category if specified
      let filteredResults = results;
      if (options.category) {
        filteredResults = results.filter(r => r.metadata.category === options.category);
      }

      // Transform to memory format for compatibility
      return filteredResults.map(result => ({
        id: result.id,
        memory_key: result.metadata.memoryKey,
        content: result.content,
        category: result.metadata.category,
        importance_score: result.metadata.importance,
        similarity: result.similarity,
        context: result.metadata.context,
        timestamp: result.metadata.timestamp,
        source: 'hnsw_accelerated'
      }));
      
    } catch (error) {
      console.error('❌ Memory recall with HNSW failed:', error?.message);
      return [];
    }
  }
}

/**
 * 🎨 CANVAS SYSTEM BRIDGE
 * Connects all canvas systems (Code, Chart, Document) to HNSW
 */
class CanvasSystemBridge {
  static getInstance() {
    if (!CanvasSystemBridge.instance) {
      CanvasSystemBridge.instance = new CanvasSystemBridge();
    }
    return CanvasSystemBridge.instance;
  }

  /**
   * Enhanced canvas element storage with HNSW
   */
  async storeCanvasElement(data) {
    try {
      let result;

      switch (data.elementType) {
        case 'code':
          result = await hnswCoreIntegration.storeCodeCanvasData({
            canvasId: data.canvasId,
            elementId: data.elementId,
            code: data.content.code || '',
            language: data.content.language || 'javascript',
            userId: data.userId,
            sessionId: data.sessionId,
            tags: data.metadata?.tags
          });
          break;

        case 'chart':
          result = await hnswCoreIntegration.storeChartCanvasData({
            canvasId: data.canvasId,
            elementId: data.elementId,
            chartConfig: data.content.config || {},
            chartType: data.content.chartType || 'bar',
            userId: data.userId,
            sessionId: data.sessionId,
            description: data.content.title || data.content.description
          });
          break;

        case 'document':
        case 'text':
          result = await hnswCoreIntegration.storeDocumentCanvasData({
            canvasId: data.canvasId,
            elementId: data.elementId,
            content: data.content.text || data.content.content || '',
            documentType: data.content.type || 'text',
            userId: data.userId,
            sessionId: data.sessionId,
            title: data.content.title
          });
          break;

        default:
          throw new Error(`Unsupported element type: ${data.elementType}`);
      }

      console.log(`🎨 Canvas element stored in HNSW: ${data.elementType} (${data.canvasId}/${data.elementId})`);
      return result;
      
    } catch (error) {
      console.error('❌ Canvas element storage failed:', error?.message);
      return { success: false, vectorId: '' };
    }
  }

  /**
   * Enhanced canvas search with HNSW
   */
  async searchCanvasElements(query, userId, options = {}) {
    try {
      const results = [];

      // Search each requested element type
      const elementTypes = options.elementTypes || ['code', 'chart', 'document'];

      if (elementTypes.includes('code')) {
        const codeResults = await hnswCoreIntegration.searchCodeCanvas(query, userId, {
          language: options.language,
          canvasId: options.canvasId,
          limit: Math.ceil((options.limit || 10) / elementTypes.length)
        });
        results.push(...codeResults.map(r => ({ ...r, elementType: 'code' })));
      }

      if (elementTypes.includes('chart')) {
        const chartResults = await hnswCoreIntegration.searchChartCanvas(query, userId, {
          chartType: options.chartType,
          canvasId: options.canvasId,
          limit: Math.ceil((options.limit || 10) / elementTypes.length)
        });
        results.push(...chartResults.map(r => ({ ...r, elementType: 'chart' })));
      }

      if (elementTypes.includes('document')) {
        const searchOptions = {
          userId,
          componentTypes: ['document_canvas'],
          limit: Math.ceil((options.limit || 10) / elementTypes.length),
          similarityThreshold: 0.6
        };

        const docResults = await hnswCoreIntegration.searchVectors(query, searchOptions);
        results.push(...docResults.map(r => ({ ...r, elementType: 'document' })));
      }

      // Sort by similarity and limit
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, options.limit || 10);
      
    } catch (error) {
      console.error('❌ Canvas search failed:', error?.message);
      return [];
    }
  }
}

/**
 * 🤖 ASSISTANT SYSTEM BRIDGE
 * Connects AIAssistantSmall, NeuraPlayAssistantLite to HNSW
 */
class AssistantSystemBridge {
  static getInstance() {
    if (!AssistantSystemBridge.instance) {
      AssistantSystemBridge.instance = new AssistantSystemBridge();
    }
    return AssistantSystemBridge.instance;
  }

  /**
   * Enhanced assistant memory storage with HNSW
   */
  async storeAssistantInteraction(data) {
    try {
      // Store the conversation context for future recall
      const conversationContent = `User: ${data.userMessage}\nAssistant: ${data.assistantResponse}`;
      
      const result = await hnswCoreIntegration.storeAssistantMemory({
        userId: data.userId,
        assistantType: data.assistantType,
        sessionId: data.sessionId,
        memoryType: 'conversation',
        content: conversationContent,
        context: {
          userMessage: data.userMessage,
          assistantResponse: data.assistantResponse,
          ...data.context
        }
      });

      console.log(`🤖 Assistant interaction stored: ${data.assistantType} assistant`);
      return result;
      
    } catch (error) {
      console.error('❌ Assistant interaction storage failed:', error?.message);
      return { success: false, vectorId: '' };
    }
  }

  /**
   * Enhanced assistant context retrieval with HNSW
   */
  async getAssistantContext(query, userId, assistantType, options = {}) {
    try {
      const results = await hnswCoreIntegration.searchAssistantMemory(
        query,
        userId,
        assistantType,
        {
          sessionId: options.sessionId,
          limit: options.limit || 5
        }
      );

      // Optionally include context from other assistant type
      if (options.includeOtherAssistant) {
        const otherAssistantType = assistantType === 'small' ? 'full' : 'small';
        const otherResults = await hnswCoreIntegration.searchAssistantMemory(
          query,
          userId,
          otherAssistantType,
          { limit: Math.ceil((options.limit || 5) / 2) }
        );
        
        results.push(...otherResults);
        results.sort((a, b) => b.similarity - a.similarity);
      }

      return results.slice(0, options.limit || 5);
      
    } catch (error) {
      console.error('❌ Assistant context retrieval failed:', error?.message);
      return [];
    }
  }
}

/**
 * 🔄 CROSS-CHAT KNOWLEDGE BRIDGE
 * Connects existing cross-chat knowledge to HNSW
 */
class CrossChatKnowledgeBridge {
  static getInstance() {
    if (!CrossChatKnowledgeBridge.instance) {
      CrossChatKnowledgeBridge.instance = new CrossChatKnowledgeBridge();
    }
    return CrossChatKnowledgeBridge.instance;
  }

  /**
   * Enhanced cross-chat knowledge storage with HNSW
   */
  async storeCrossChatKnowledge(data) {
    try {
      const result = await hnswCoreIntegration.storeVector({
        id: data.id,
        content: data.content,
        componentType: 'chat_knowledge',
        userId: data.userId,
        sessionId: data.sessionId,
        metadata: {
          knowledgeType: data.knowledgeType,
          originalId: data.id,
          crossChat: true,
          timestamp: new Date().toISOString(),
          tags: ['cross_chat', data.knowledgeType],
          ...data.metadata
        }
      });

      console.log(`🔄 Cross-chat knowledge stored in HNSW: ${data.knowledgeType}`);
      return result;
      
    } catch (error) {
      console.error('❌ Cross-chat knowledge storage failed:', error?.message);
      return { success: false, vectorId: '' };
    }
  }

  /**
   * Enhanced cross-chat knowledge retrieval with HNSW
   */
  async getCrossChatKnowledge(query, userId, options = {}) {
    try {
      // 🎯 ALL COMPONENT TYPES: Include personal types for comprehensive memory search
      const allComponentTypes = [
        'chat_knowledge', 'general', 'memory',              // Legacy
        'personal_identity', 'relationships', 'professional', // Personal
        'personal_context', 'emotional_state', 'preferences', // Context
        'interests', 'goals', 'learning'                      // Behavioral
      ];
      
      const searchOptions = {
        userId,
        componentTypes: options.componentTypes || allComponentTypes,  // 🎯 ALL types by default
        limit: options.limit || 10,
        similarityThreshold: options.similarityThreshold || 0.3,  // Lowered for better recall
        sessionId: options.sessionId
      };

      const results = await hnswCoreIntegration.searchVectors(query, searchOptions);

      // Filter by knowledge type if specified
      let filteredResults = results;
      if (options.knowledgeType) {
        filteredResults = results.filter(r => r.metadata.knowledgeType === options.knowledgeType);
      }

      // Transform to cross-chat knowledge format
      return filteredResults.map(result => ({
        id: result.metadata.originalId || result.id,
        content: result.content,
        knowledgeType: result.metadata.knowledgeType,
        relevanceScore: result.similarity,
        metadata: result.metadata,
        timestamp: result.metadata.timestamp,
        source: 'hnsw_accelerated'
      }));
      
    } catch (error) {
      console.error('❌ Cross-chat knowledge retrieval failed:', error?.message);
      return [];
    }
  }
}

// Export singleton instances
const memorySystemBridge = MemorySystemBridge.getInstance();
const canvasSystemBridge = CanvasSystemBridge.getInstance();
const assistantSystemBridge = AssistantSystemBridge.getInstance();
const crossChatKnowledgeBridge = CrossChatKnowledgeBridge.getInstance();

module.exports = {
  MemorySystemBridge,
  CanvasSystemBridge,
  AssistantSystemBridge,
  CrossChatKnowledgeBridge,
  memorySystemBridge,
  canvasSystemBridge,
  assistantSystemBridge,
  crossChatKnowledgeBridge
};
