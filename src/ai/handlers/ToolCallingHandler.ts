// Tool Calling Handler - FIXED MEMORY INTEGRATION
// Moves handleToolCallingMode, directToolMapping, and related extraction helpers

// any type replaced - using legacy object from AIRouter
import { AIRequest, AIResponse } from '../AIRouter';
import { toolRegistry } from '../../services/ToolRegistry';
import { serviceContainer } from '../../services/ServiceContainer';
import { conversationMemoryService } from '../../services/ConversationMemoryService';
// Removed unused import: unifiedMemoryManager, UnifiedMemoryRequest

export class ToolCallingHandler {
  async handle(request: AIRequest, intentAnalysis: any): Promise<AIResponse> {
    try {
      console.log('🔧 ToolCallingHandler: Processing tool calling mode request');
      
      // DIRECT TOOL MAPPING - No more LLM guessing!
      const toolMapping = await this.directToolMapping(request.message, intentAnalysis, request.userId, request);
      
      if (!toolMapping) {
        console.log('🔧 No direct tool mapping found, falling back to natural conversation');
        // FALLBACK: Route to natural conversation instead of forcing tool execution
        
        // Wait for services to be ready before calling tools
        await serviceContainer.waitForReady();
        
        // UNIFIED: Use conversation-aware prompt from unified service
        const conversationPrompt = await conversationMemoryService.buildConversationAwarePrompt(
          request.message, 
          request.sessionId || '', 
          request.userId || 'anonymous',
          {
            includePersonalMemories: true,
            includeLearningContext: true, // ✨ NEW: Include learning progress
            includeDashboardContext: true  // ✨ NEW: Include dashboard activity
          }
        );
        
        const llmResult = await toolRegistry.execute('llm-completion', {
          prompt: conversationPrompt,
          model: 'accounts/fireworks/models/gpt-oss-20b',
          temperature: 0.6,
          maxTokens: 2000
        }, {
          sessionId: request.sessionId,
          userId: request.userId,
          startTime: Date.now()
        });

        // 🔧 FIX: ToolRegistry double-wraps the result
        // CoreTools returns: { success, data: { completion, response, message } }
        // ToolRegistry wraps as: { success, data: <CoreTools result>, metadata }
        // So we need: llmResult.data.data.completion (double .data!)
        const innerData = llmResult.data?.data || llmResult.data;
        const responseText = innerData?.completion || 
                           innerData?.response || 
                           innerData?.message || 
                           'I\'m here to help! Could you tell me more about what you\'d like to do?';
        
        return {
          success: true,
          response: responseText,
          toolResults: [],
          metadata: {
            sessionId: request.sessionId,
            executionTime: 0,
            toolsExecuted: 0,
            mode: 'tool-calling-fallback'
          }
        };
      }
      
      console.log('🔧 Selected toorunl:', toolMapping.tool, 'with params:', toolMapping.params);
      
      // Wait for services to be ready before executing tools
      await serviceContainer.waitForReady();
      
      // Execute the mapped tool directly
      // 🎯 CRITICAL: Pass conversation history for context-aware tools like canvas
      const toolResult = await toolRegistry.execute(
        toolMapping.tool,
        toolMapping.params,
        {
          sessionId: request.sessionId,
          userId: request.userId,
          startTime: Date.now(),
          session: {
            conversationHistory: request.conversationHistory?.map(msg => ({
              isUser: msg.role === 'user',
              text: msg.content,
              content: msg.content
            })) || []
          }
        }
      );

      console.log('🔧 Tool execution result:', {
        success: toolResult.success,
        hasData: !!toolResult.data,
        hasImageUrl: !!(toolResult.data?.image_url),
        toolType: toolMapping.tool
      });

      // Generate contextual response
      let responseText = await this.buildToolResponse(request.message, toolMapping, toolResult);

      // CRITICAL FIX: Include Socratic questions if they were generated
      // This allows educational guidance ALONGSIDE tool execution (e.g., canvas + questions)
      if (intentAnalysis.socraticQuestions && Array.isArray(intentAnalysis.socraticQuestions) && intentAnalysis.socraticQuestions.length > 0) {
        console.log('🏛️ ToolCallingHandler: Appending Socratic questions to tool response', {
          questionCount: intentAnalysis.socraticQuestions.length,
          toolType: toolMapping.tool
        });
        
        // Format Socratic questions as a follow-up
        const socraticSection = '\n\n---\n\n🤔 **Some questions to deepen your understanding:**\n\n' + 
          intentAnalysis.socraticQuestions
            .slice(0, 3) // Limit to 3 questions to avoid overwhelming
            .map((q: string, i: number) => `${i + 1}. ${q}`)
            .join('\n\n');
        
        responseText += socraticSection;
      }

      return {
        success: true,
        response: responseText,
        toolResults: [toolResult],
        metadata: {
          sessionId: request.sessionId,
          executionTime: 0,
          toolsExecuted: 1,
          mode: 'tool-calling',
          socraticQuestionsIncluded: !!(intentAnalysis.socraticQuestions && intentAnalysis.socraticQuestions.length > 0)
        }
      };

    } catch (error) {
      console.error('🔧 Tool calling failed:', error);
      throw new Error(`Tool calling mode failed: ${(error as Error).message}`);
    }
  }



  /**
   * DIRECT TOOL MAPPING - Eliminates LLM guessing for tool selection
   */
  private async directToolMapping(message: string, intentAnalysis: any, userId?: string, request?: AIRequest): Promise<{ tool: string; params: any; reasoning: string } | null> {
    // CRITICAL FIX: Add null/undefined checks for message parameter
    if (!message || typeof message !== 'string') {
      console.warn('🔧 DIRECT TOOL MAPPING: Invalid message parameter:', message);
      return null;
    }
    
    const messageLower = message.toLowerCase();
    
    // 🚫 CRITICAL: Check if canvas is disabled for this request (e.g., from AIAssistantSmall)
    // Small assistant should never create canvas documents - only fullscreen assistant can
    const canvasEnabled = (request as any)?.canvasEnabled !== false;
    if (!canvasEnabled) {
      console.log('🚫 ToolCallingHandler: Canvas DISABLED for this request (assistantType:', 
        (request as any)?.locationContext?.assistantType || 'unknown', ')');
    }
    
    console.log('🔧 DIRECT TOOL MAPPING for:', messageLower);
    console.log('🔧 Intent Analysis received:', {
      primaryDomain: intentAnalysis.primaryDomain,
      processingMode: intentAnalysis.processingMode,
      primaryIntent: intentAnalysis.primaryIntent,
      lengthRequirement: intentAnalysis.lengthRequirement, // CRITICAL for long documents
      complexityLevel: intentAnalysis.complexityLevel,
      isCanvasRevision: intentAnalysis.isCanvasRevision, // CRITICAL for revision detection
      targetDocumentId: intentAnalysis.targetDocumentId // CRITICAL for revision routing
    });
    
    // 🔧 CRITICAL: Check for REVISION/MODIFICATION keywords FIRST before Q&A
    // Keywords that indicate the user wants to CHANGE the document, not ASK about it
    const revisionKeywords = [
      // Direct writing commands
      'write more', 'write about', 'write', 'keep writing', 'go on', 'go on writing',
      'continue writing', 'continue', 'continue with', 'keep going',
      // Addition/expansion
      'add to', 'add more', 'add a', 'add some', 'expand', 'elaborate', 'extend',
      'append', 'include', 'mention', 'put in', 'insert',
      // Location indicators (not in chat = in document)
      'not in the chat', 'not here', 'not in chat', 'in the document', 'to the document',
      'in document', 'on the canvas', 'in the canvas', 'on canvas',
      // Modification/update commands
      'update', 'modify', 'change', 'edit', 'revise', 'improve', 'enhance',
      // User wants AI to write
      'i want you to write', 'please write', 'can you write', 'could you write'
    ];
    
    // 🎯 SMARTER: Check if it's a revision by combining keywords + context
    // "write" alone is ambiguous, but "write" + "document" context = revision
    const hasWriteCommand = ['write', 'add', 'include', 'continue', 'go on'].some(cmd => messageLower.includes(cmd));
    const hasDocumentContext = ['document', 'canvas', 'planner', 'diary', 'journal', 'plan'].some(ctx => messageLower.includes(ctx));
    const hasNegativeLocation = ['not in the chat', 'not here', 'not in chat'].some(neg => messageLower.includes(neg));
    
    const isRevisionRequest = revisionKeywords.some(keyword => messageLower.includes(keyword)) ||
                             (hasWriteCommand && (hasDocumentContext || hasNegativeLocation));
    
    // 📄 CANVAS DOCUMENT CONTEXT - User asking about their document (Q&A mode)
    // Detect phrases like "my document", "the document", "help me understand", "explain the", "tell me about"
    const documentReferencePatterns = [
      'my document', 'the document', 'this document',
      'my canvas', 'the canvas',
      'help me understand', 'explain', 'tell me about',
      'what does it say', 'summarize', 'the research',
      'more about it', 'about this', 'about that',
      'in the document', 'from the document'
    ];
    
    const keywordDocumentReference = documentReferencePatterns.some(pattern => messageLower.includes(pattern));
    
    // 🧠 LLM-BASED: Also check if intent analysis indicates informational query about canvas
    const llmDocumentInformational = intentAnalysis?.primaryIntent === 'informational' && 
                                      (intentAnalysis?.canvasActivation?.contentType === 'document' ||
                                       intentAnalysis?.mentionsExistingContent === true);
    
    const isDocumentReference = keywordDocumentReference || llmDocumentInformational;
    
    // CRITICAL: Check if this is a REVISION request before treating as Q&A
    // Use MULTIPLE signals for robustness:
    // 1. AIRouter detection (isCanvasRevision=true)
    // 2. LLM intent analysis (primaryIntent === 'modification' or 'creation')
    // 3. Keyword-based detection (fallback)
    const isCanvasRevisionFromRouter = intentAnalysis.isCanvasRevision === true;
    const isModificationIntent = intentAnalysis?.primaryIntent === 'modification' || 
                                 intentAnalysis?.primaryIntent === 'creation';
    
    if (isDocumentReference && request?.sessionId && 
        !isCanvasRevisionFromRouter && 
        !isRevisionRequest && 
        !isModificationIntent) {
      console.log('📄 DOCUMENT CONTEXT DETECTED - searching vectorized canvas content via HNSW (Q&A mode)');
      
      try {
        // 🔍 SEMANTIC SEARCH: Query HNSW for vectorized canvas documents
        const { vectorSearchService } = await import('../../services/VectorSearchService');
        
        // Search for canvas documents related to user's query
        // PROPER CALL: (query, queryEmbedding?, userId?, limit?, threshold?, contextFilters?)
        // 🎯 ONLY search canvas categories AND filter by current conversation
        const searchResults = await vectorSearchService.semanticSearch(
          message,
          undefined,  // Let it generate embedding
          request.userId,  // 🔥 PASS USER ID
          5,  // limit
          0.4,  // threshold
          {
            categories: ['canvas_document', 'document'],  // 🔥 ONLY canvas documents
            excludeCategories: ['family', 'location', 'name', 'profession', 'hobby', 'interest', 'course'],  // 🔥 EXCLUDE personal
            conversationId: request.sessionId  // 🎯 CRITICAL: Only docs from THIS conversation
          }
        );
        
        console.log('🔍 HNSW search results for canvas context:', searchResults?.length || 0, 'matches', 'conversation:', request.sessionId);
        
        let documentContext = '';
        let documentTitle = 'Document';
        
        // If HNSW search found results, use them
        if (searchResults && searchResults.length > 0) {
          console.log('✅ Found vectorized canvas content via HNSW');
          documentContext = searchResults.map((r: any) => r.content || r.value || '').join('\n\n---\n\n');
          documentTitle = searchResults[0]?.metadata?.title || 'Document';
        } else {
          // Fallback: Get directly from canvas store if HNSW has no results
          // 🎯 NEW: Use CanvasAccessTracker for LAST-OPENED priority
          console.log('⚠️ No HNSW results, falling back to direct canvas access with LAST-OPENED priority');
          const { useCanvasStore } = await import('../../stores/canvasStore');
          const { canvasAccessTracker } = await import('../../services/CanvasAccessTracker');
          const store = useCanvasStore.getState();
          const elements = store.canvasElementsByConversation[request.sessionId] || [];
          
          const documentElements = elements.filter(el => el.type === 'document');
          
          if (documentElements.length > 0) {
            // 🎯 PRIORITY: Use last-opened document instead of just the last one in array
            const canvasContext = canvasAccessTracker.getCanvasContextForAssistant(5);
            const lastOpened = canvasContext.lastOpened;
            
            let targetDoc = documentElements[documentElements.length - 1]; // Default fallback
            
            // Check if last-opened document is in this conversation
            if (lastOpened) {
              const lastOpenedDoc = documentElements.find(el => el.id === lastOpened.elementId);
              if (lastOpenedDoc) {
                targetDoc = lastOpenedDoc;
                console.log('📌 Using LAST-OPENED document:', lastOpened.title);
              }
            }
            
            const latestVersion = targetDoc.versions?.[targetDoc.versions.length - 1];
            documentContext = latestVersion?.content || '';
            documentTitle = targetDoc.content?.title || 'Document';
          }
        }
        
        if (documentContext) {
          console.log('📄 Found document context:', documentTitle, '- length:', documentContext.length);
          
          // Return LLM completion with document context
          return {
            tool: 'llm-completion',
            params: {
              prompt: `The user is asking about their canvas document titled "${documentTitle}".

You CAN see this document. Here is the content:

DOCUMENT CONTENT:
${documentContext.substring(0, 4000)}

USER QUESTION: ${message}

Please answer the user's question based on the document content above. Be helpful and specific, referencing relevant parts of the document. If they're asking for clarification, explain concepts from the document. If they want a summary, provide one.`,
              model: 'accounts/fireworks/models/gpt-oss-120b',  // 🎯 Use same model as rest of system
              temperature: 0.6,
              maxTokens: 2000
            },
            reasoning: `User asking about canvas document "${documentTitle}" - using HNSW semantic search for context`
          };
        } else {
          console.log('📄 No document context found for this conversation');
        }
      } catch (canvasError) {
        console.warn('⚠️ Failed to get canvas context:', canvasError);
      }
    }
    
    // WEATHER REQUESTS
    if (messageLower.includes('weather') || messageLower.includes('temperature') || 
        messageLower.includes('forecast') || messageLower.includes('climate')) {
      const location = this.extractLocation(message);
      console.log('☁️ WEATHER REQUEST DETECTED:', { message, extractedLocation: location });
      return {
        tool: 'get-weather',
        params: { 
          location: location || undefined,  // Let it auto-detect if no location found
          autoDetectLocation: !location     // Auto-detect when no location specified
        },
        reasoning: 'Weather information requested'
      };
    }
    
    // 🧭 NAVIGATION REQUESTS - Agentic control for page navigation
    if (intentAnalysis?.toolRequests?.isNavigationRequest) {
      console.log('🧭 NAVIGATION REQUEST DETECTED via LLM analysis:', message);
      const targetPage = this.extractNavigationTarget(message);
      console.log('🧭 Extracted navigation target:', targetPage);
      
      if (targetPage) {
        return {
          tool: 'navigate_to_page',
          params: {
            page: targetPage
          },
          reasoning: `Navigation to ${targetPage} requested`
        };
      }
    }
    
    // ⚙️ SETTINGS REQUESTS - Agentic control for settings/preferences
    if (intentAnalysis?.toolRequests?.isSettingsRequest) {
      console.log('⚙️ SETTINGS REQUEST DETECTED via LLM analysis:', message);
      const settingsChange = this.extractSettingsChange(message);
      console.log('⚙️ Extracted settings change:', settingsChange);
      
      if (settingsChange) {
        return {
          tool: 'update_settings',
          params: {
            setting: settingsChange.setting,
            value: settingsChange.value,
            reason: settingsChange.reason
          },
          reasoning: `Settings update: ${settingsChange.setting} → ${settingsChange.value}`
        };
      }
    }
    
    // GAME RECOMMENDATIONS
    if (messageLower.includes('game') && (messageLower.includes('recommend') || 
        messageLower.includes('suggest') || messageLower.includes('play'))) {
      return {
        tool: 'recommend_game',
        params: {
          topic: this.extractGameTopic(message),
          age_group: '6-8', // Default
          difficulty: 'medium'
        },
        reasoning: 'Game recommendation requested'
      };
    }
    
    // CLEAN ROUTING - Tool selection based on intent analysis (correct architecture)
    // Complex detection logic belongs in anyService Layer 2
    
    // IMAGE GENERATION - Use LLM analysis from UnifiedCognitiveAnalyzer
    // intentAnalysis.toolRequests.isImageRequest is set by LLM-based detection
    // CRITICAL: Exclude charts/graphs/plots - those go to canvas, not image generation
    const chartExclusionKeywords = ['chart', 'graph', 'plot', 'diagram', 'visualization', 'visualize'];
    const isChartRequest = chartExclusionKeywords.some(keyword => messageLower.includes(keyword));
    
    if (intentAnalysis.toolRequests?.isImageRequest && !isChartRequest) {
      console.log('🎨 IMAGE GENERATION DETECTED via LLM analysis - routing to image tools');
      
      // Use the original message as the prompt, let the image generation tool handle cleanup
      return {
        tool: 'generate-image',  
        params: {
          prompt: message,
          style: 'realistic',  
          size: '1024x1024'    
        },
        reasoning: 'Image generation requested - detected via LLM analysis (UnifiedCognitiveAnalyzer)'
      };
    } else if (intentAnalysis.toolRequests?.isImageRequest && isChartRequest) {
      console.log('🎨 IMAGE REQUEST OVERRIDDEN - detected chart/graph keywords, routing to canvas instead');
    }
    
    // Canvas creation routing based on LLM intent analysis
    // PRIORITY: Canvas activation checked AFTER image generation to prevent misclassification
    const canvasActivation = intentAnalysis?.canvasActivation || { shouldActivate: false, trigger: 'none', reason: 'No analysis available' };
    const shouldActivateCanvas = canvasActivation.shouldActivate;
    const primaryDomain = intentAnalysis?.primaryDomain || '';
    const secondaryIntent = (intentAnalysis?.secondaryIntent || '').toLowerCase();
    
    // 🎯 SMART REVISION DETECTION: If canvas exists + modification intent, it's a revision
    // 🚫 Skip if canvas is disabled for this request (small assistant or explicit disable)
    let hasExistingCanvasDocument = false;
    let existingDoc = null;
    
    if (!canvasEnabled) {
      console.log('🚫 ToolCallingHandler: Skipping canvas operations (canvasEnabled=false)');
    } else {
    try {
      const { useCanvasStore } = await import('../../stores/canvasStore');
      const currentConvId = request?.sessionId || useCanvasStore.getState().currentConversationId;
      const elements = useCanvasStore.getState().canvasElementsByConversation[currentConvId] || [];
      hasExistingCanvasDocument = elements.some((el: any) => el.type === 'document');
      existingDoc = elements.find((el: any) => el.type === 'document');
      
      if (hasExistingCanvasDocument) {
        // CRITICAL FIX: Check for revision keywords in message FIRST
        // Keywords like "longer", "more", "add", etc. indicate they want to extend existing document
        const revisionIndicators = /\b(longer|more|super|extensive|detailed|add|include|also|continue|expand)\b/i;
        const hasRevisionKeywords = revisionIndicators.test(message);
        
        // PURE LLM: Use intentAnalysis.primaryIntent from UnifiedCognitiveAnalyzer
        // - 'modification' = revise existing document
        // - 'creation' + revision keywords + existing doc = ADD to existing
        // - 'informational' = question about document
        const isModificationIntent = intentAnalysis?.primaryIntent === 'modification';
        const isCreationWithRevisionKeywords = intentAnalysis?.primaryIntent === 'creation' && hasRevisionKeywords;
        
        if (isModificationIntent || isCreationWithRevisionKeywords) {
          console.log('🔄 CANVAS REVISION DETECTED (LLM-based):', {
            conversationId: currentConvId,
            elementCount: elements.length,
            message: message.substring(0, 50),
            primaryIntent: intentAnalysis?.primaryIntent,
            hasRevisionKeywords,
            reason: isModificationIntent ? 'modification intent' : 'creation + revision keywords'
          });
          
          return {
            tool: 'canvas-document-creation',
            params: {
              request: message,
              activateCanvas: true,
              preferAppend: true,
              targetDocumentId: existingDoc?.id,
              intentAnalysis: intentAnalysis, // Pass LLM analysis for length/complexity
              position: { x: 50, y: 50 },
              size: { width: 700, height: 500 }
            },
            reasoning: isModificationIntent 
              ? 'Canvas revision - LLM detected modification intent for existing document'
              : 'Canvas revision - creation with revision keywords detected for existing document'
          };
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not check for existing canvas elements:', e);
      }
    }
    
    // CRITICAL: Check for AIRouter revision detection BEFORE canvas activation check
    // If AIRouter already determined this is a revision, route directly to canvas-document-creation
    if (intentAnalysis.isCanvasRevision === true && intentAnalysis.targetDocumentId) {
      console.log('📝 ToolCallingHandler: AIRouter revision detected, routing to canvas-document-creation', {
        targetDocumentId: intentAnalysis.targetDocumentId,
        lengthRequirement: intentAnalysis.lengthRequirement,
        complexityLevel: intentAnalysis.complexityLevel
      });
      return {
        tool: 'canvas-document-creation',
        params: {
          request: message,
          activateCanvas: true,
          preferAppend: true,
          targetDocumentId: intentAnalysis.targetDocumentId,
          intentAnalysis: intentAnalysis, // Pass full analysis for length/complexity
          position: { x: 50, y: 50 },
          size: { width: 700, height: 500 }
        },
        reasoning: 'Canvas revision - AIRouter detected revision with target document ID'
      };
    }
    
    // 🐛 CRITICAL FIX: Memory operations should NEVER trigger canvas
    // Use LLM intent analysis - NOT regex patterns!
    const isMemoryIntent = intentAnalysis?.toolRequests?.isMemoryRequest || false;
    
    // 🎯 ALSO detect name statements: "my name is X", "I'm X", "call me X"
    const nameStatementPattern = /\b(?:my\s+name\s+is|i(?:'m|\s+am)\s+\w+|call\s+me)\b/i;
    const isNameStatement = nameStatementPattern.test(message);
    
    if (isMemoryIntent || isNameStatement) {
      console.log('🚫 ToolCallingHandler: Skipping canvas - detected as MEMORY/NAME REQUEST', {
        isMemoryIntent,
        isNameStatement
      });
      // CRITICAL: Actually return null to skip canvas and let chat handler process
      return null;
    }
    
    // 🚫 CRITICAL: Skip canvas creation if canvasEnabled === false (e.g., from small assistant)
    if (!canvasEnabled && (shouldActivateCanvas || primaryDomain === 'creative' || primaryDomain === 'professional')) {
      console.log('🚫 ToolCallingHandler: Canvas would activate but BLOCKED (canvasEnabled=false)');
      console.log('🚫 Reason: Request came from small assistant or canvas is explicitly disabled');
      // Skip canvas activation entirely - let it fall through to natural conversation
    }
    
    if (canvasEnabled && (shouldActivateCanvas || primaryDomain === 'creative' || primaryDomain === 'professional')) {
      // CRITICAL FIX: Add null/undefined check for secondaryIntent and primaryDomain
      
      console.log('🧠 LLM Canvas Analysis (UnifiedCognitiveAnalyzer):', {
        shouldActivate: canvasActivation.shouldActivate,
        trigger: canvasActivation.trigger,
        reason: canvasActivation.reason,
        secondaryIntent,
        primaryDomain
      });
      
      // CRITICAL FIX: Check for document references FIRST, including append patterns
      const documentReferencePatterns = [
        /add\s+(?:a|an|some|the)?\s*[\w\s]+\s+(?:to|into|in)\s+(?:the|my|this|that)?\s*(?:document|guide|plan|report|diary|planner|tracker|journal)/i,
        /(?:include|put|insert)\s+(?:a|an|some|the)?\s*[\w\s]+\s+(?:in|into)\s+(?:the|my|this|that)?\s*(?:document|guide|plan|report|diary|planner|tracker|journal)/i,
        /(?:the|my|this|that)\s+(?:document|guide|plan|report|diary|planner|tracker|journal)\s+(?:should|could|needs?\s+to|must)\s+(?:have|include|contain)/i,
        /(?:the|my|this|that)\s+(?:document|guide|plan|report|diary|planner|tracker|journal)\s+(?:needs|requires|wants|should\s+have)\s+(?:a|an|some|the)?\s*[\w\s]+/i,
        /(?:can|could|would)\s+you\s+(?:also|please)?\s*(?:add|include|put).*(?:document|guide|plan|report|diary|planner|tracker|journal)/i,
        /(?:update|revise|modify|enhance|expand|extend|improve)\s+(?:the|my|this|that)?\s*(?:document|guide|plan|report|diary|planner|tracker|journal)/i,
        // New patterns for natural language like "the planner needs a..."
        /(?:the|my|this)\s+\w+\s+(?:needs|requires|should\s+have|must\s+have)\s+(?:a|an|some)/i,
        /^add\s+(?:a|an|some|the)?\s*/i  // Simple "add" at start of message
      ];
      
      // Check if this is ANY kind of document-related request (creation OR append)
      const hasDocumentReference = documentReferencePatterns.some(pattern => pattern.test(message));
      
      // Document creation keywords
      const documentKeywords = ['document', 'write', 'content', 'text', 'roadmap', 'plan', 'schedule', 'agenda', 'report', 'outline', 'guide', 'proposal', 'memo', 'note', 'diary', 'planner', 'journal', 'tracker', 'log', 'organizer'];
      const hasDocumentKeyword = documentKeywords.some(keyword => 
        secondaryIntent.includes(keyword) || messageLower.includes(keyword)
      );
      
      // Is this a document request of any kind?
      const isDocumentRequest = hasDocumentReference || hasDocumentKeyword;
      
      // Is this specifically referring to an existing document?
      const hasExistingDocumentContext = hasDocumentReference ||
                                         intentAnalysis.characteristics?.hasExistingContext ||
                                         intentAnalysis.characteristics?.isRevision ||
                                         intentAnalysis.characteristics?.isAppend ||
                                         intentAnalysis.isCanvasRevision; // From AIRouter revision detection
      
      // CANVAS REVISION: If AIRouter detected this as a revision OR revision keywords detected, treat as document request
      const isCanvasRevisionRequest = intentAnalysis.isCanvasRevision === true || isRevisionRequest;
      
      if (isDocumentRequest || isCanvasRevisionRequest) {
        console.log('📝 ToolCallingHandler: Document/revision request detected', {
          isDocumentRequest,
          isCanvasRevisionRequest,
          hasExistingDocumentContext
        });
        // If it's an append request, include a flag to check for existing documents
        const params: any = {
          request: message,
          activateCanvas: shouldActivateCanvas,
          intentAnalysis: intentAnalysis, // Pass LLM analysis for length/complexity detection
          position: { x: 50, y: 50 },
          size: { width: 700, height: 500 }
        };
        
        // Add hint for append mode detection based on natural language understanding
        if (hasExistingDocumentContext) {
          params.preferAppend = true;
          params.appendHint = 'Natural language indicates reference to existing document';
          console.log('📝 Detected existing document reference in natural language:', message);
          
          // CRITICAL FIX: Find existing document in canvas store and pass its ID
          try {
            const { useCanvasStore } = await import('../../stores/canvasStore');
            const canvasState = useCanvasStore.getState();
            const sessionId = request?.sessionId;
            
            if (sessionId) {
              const currentElements = canvasState.canvasElementsByConversation[sessionId] || [];
              const documentElements = currentElements.filter((el: any) => el.type === 'document');
              
              if (documentElements.length > 0) {
                // Get most recent document
                const sortedDocs = [...documentElements].sort((a: any, b: any) => 
                  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
                params.targetDocumentId = sortedDocs[0].id;
                console.log('📄 ToolCallingHandler: Found existing document for append:', params.targetDocumentId);
              }
            }
          } catch (error) {
            console.warn('⚠️ ToolCallingHandler: Could not check for existing documents:', error);
          }
        }
        
        return {
          tool: 'canvas-document-creation',
          params,
          reasoning: `Document ${hasExistingDocumentContext ? 'append/update' : 'creation'} intent detected via LLM analysis. Canvas activation: ${shouldActivateCanvas ? 'APPROVED' : 'DENIED'} (${canvasActivation.trigger})`
        };
      }
      
      // Chart creation routing - check both secondaryIntent AND message content
      const chartKeywords = ['chart', 'graph', 'plot', 'visualization', 'visualize', 'diagram'];
      const hasChartKeyword = chartKeywords.some(keyword => 
        secondaryIntent.includes(keyword) || messageLower.includes(keyword)
      );
      
      if (hasChartKeyword) {
        return {
          tool: 'canvas-chart-creation',
          params: {
            request: message,
            activateCanvas: shouldActivateCanvas,
            npuAnalysis: canvasActivation,
            position: { x: 60, y: 60 },
            size: { width: 600, height: 400 }
          },
          reasoning: `Chart creation intent detected via NPU analysis. Canvas activation: ${shouldActivateCanvas ? 'APPROVED' : 'DENIED'} (${canvasActivation.trigger})`
        };
      }
      
      // Code creation routing - check both secondaryIntent AND message content
      const codeKeywords = ['code', 'program', 'script', 'function', 'algorithm', 'implementation', 'python', 'javascript', 'java', 'typescript', 'c++', 'golang', 'rust', 'fibonacci', 'example'];
      const hasCodeKeyword = codeKeywords.some(keyword => 
        secondaryIntent.includes(keyword) || messageLower.includes(keyword)
      );
      
      if (hasCodeKeyword) {
        return {
          tool: 'canvas-code-creation',
          params: {
            request: message,
            activateCanvas: shouldActivateCanvas,
            npuAnalysis: canvasActivation,
            position: { x: 70, y: 70 },
            size: { width: 700, height: 500 }
          },
          reasoning: `Code creation intent detected via NPU analysis. Canvas activation: ${shouldActivateCanvas ? 'APPROVED' : 'DENIED'} (${canvasActivation.trigger})`
        };
      }
    }
    
    // MEMORY MANAGEMENT - Use LLM intelligence instead of primitive regex
    console.log('🔍 MEMORY CHECK: Using LLM analysis for memory detection:', messageLower);
    
    // 🧠 USE LLM ANALYSIS - Much more sophisticated than regex patterns
    const isMemoryRequest = intentAnalysis?.toolRequests?.isMemoryRequest || false;
    // FIXED: Proper intent classification for memory requests
    // 🔧 FIX: Added patterns for "I am [name]", "I'm [name]", personal info sharing
    const explicitStorePatterns = [
      /\b(my name is|call me|i'm called|i am called)\b/i,
      /\b(i am|i'm|im)\s+[a-z]+\b/i,  // "I am Sammy", "I'm John" - name introduction
      /\b(remember that|save that|store that|don't forget)\b/i,
      /\b(my .* is)\b/i,  // "my age is", "my location is", etc.
      /\bi (work|study|live|am from|have a|do|like|love|hate)\b/i,  // Personal statements
      /\b(i'm a|i am a|i'm an|i am an)\b/i  // "I'm a developer", "I am a student"
    ];
    
    const explicitRecallPatterns = [
      /\b(what.*my|whats.*my|what's.*my)\b/i,
      /\b(do you (know|remember).*my)\b/i,
      /\b(tell me.*my|remind me.*my)\b/i,
      /\b(who am i|what am i)\b/i
    ];
    
    // Question marks indicate recall, not storage
    const hasQuestionPattern = /[?]/.test(message) || /\b(what|who|how|when|where|why)\b/i.test(message);
    
    const isStoreRequest = isMemoryRequest && explicitStorePatterns.some(pattern => pattern.test(message)) && !hasQuestionPattern;
    const isRecallRequest = isMemoryRequest && (explicitRecallPatterns.some(pattern => pattern.test(message)) || hasQuestionPattern || !isStoreRequest);
    
    console.log('🧠 LLM MEMORY PATTERNS:', { 
      isMemoryRequest, 
      isStoreRequest, 
      isRecallRequest,
      llmReasoning: intentAnalysis?.toolRequests?.reasoning 
    });
    
    if (isStoreRequest || isRecallRequest) {
      console.log('🧠 MEMORY MAPPING: Memory request detected');
      
      // 🧠 LLM-POWERED extraction (no more primitive regex matching)
      console.log('✅ MEMORY DETECTED: Using LLM intelligence for sophisticated memory handling');
      
      if (isStoreRequest) {
        // 🧠 LLM-POWERED MEMORY STORAGE - Extract content intelligently  
        const content = message.replace(/(remember|store|save)\s+(that|this)?\s*/i, '').trim();
        const key = content.split(' ').slice(0, 3).join('_').toLowerCase().replace(/[^a-z0-9_]/g, '');
        
        console.log('🧠 LLM MEMORY STORAGE:', { 
          key, 
          content,
          userId: userId
        });
        
        // 🎯 ACTIVATE COMPREHENSIVE CATEGORIZATION SYSTEM
        const primaryCategory = this.categorizeMemory(key, content);
        const memoryCategories = [primaryCategory]; // Convert to array for consistency
        console.log('🏷️ COMPREHENSIVE CATEGORIZATION:', {
          key: key,
          content: content,
          primaryCategory: primaryCategory,
          categories: memoryCategories
        });

        return {
          tool: 'unified_memory_search',
          params: {
            action: 'store',
            key: key,
            content: content,
            userId: userId || 'anonymous',
            sessionId: request?.sessionId || `session_${Date.now()}`,
            context: {
              extractionMethod: 'LLM-powered',
              confidence: 0.9,
              timestamp: new Date().toISOString(),
              categories: memoryCategories,  // 🎯 ADD CATEGORIES TO STORAGE
              componentType: this.determineComponentType(memoryCategories)
            }
          },
          reasoning: `Memory storage with comprehensive categorization: ${primaryCategory}`
        };
      } else if (isRecallRequest) {
        // 🧠 UNIFIED MEMORY SEARCH - Use new UnifiedMemoryManager
        let query = '';
        
        // 🌍 UNIVERSAL NAME EXTRACTION SYSTEM - Global, comprehensive approach
        query = this.extractUniversalMemoryQuery(message);
        
        console.log('🧠 UNIVERSAL MEMORY EXTRACTION:', { 
          originalMessage: message,
          extractedQuery: query,
          extractionMethod: 'universal'
        });
        
        // 🎯 ENHANCE SEARCH WITH CATEGORIZATION HINTS
        const searchCategories = this.predictSearchCategories(query, message);
        const componentTypes = searchCategories.map(cat => this.determineComponentType([cat]));
        
        console.log('🧠 ENHANCED MEMORY SEARCH:', { 
          originalMessage: message,
          extractedQuery: query,
          predictedCategories: searchCategories,
          componentTypes: componentTypes,
          userId: userId,
          sessionId: request?.sessionId || `session_${Date.now()}`
        });
        
        return {
          tool: 'unified_memory_search',
          params: {
            action: 'search',
            query: query,
            userId: userId,
            sessionId: request?.sessionId || `session_${Date.now()}`,
            context: {
              conversationContext: (request as any)?.context,
              userPreferences: (request as any)?.userPreferences,
              sessionHistory: (request as any)?.sessionHistory,
              searchCategories: searchCategories,  // 🎯 ADD SEARCH CATEGORY HINTS
              componentTypes: componentTypes        // 🎯 ADD COMPONENT TYPE FILTERS
            }
          },
          reasoning: `Enhanced memory search with categorization: ${searchCategories.join(', ')}`
        };
      }
    }
    
    // IMAGE GENERATION logic moved to PRIORITY CHECK above canvas routing
    
    // SEARCH TRIGGERS - Enhanced to catch more patterns including "google" and NEWS requests
    const searchKeywords = [
      'search', 'find', 'lookup', 'what is', 'tell me about', 'explain', 
      'research', 'learn about', 'information', 'google', 'web search',
      'look up', 'find out', 'show me', 'get info', 'check', 'investigate',
      'news', 'latest', 'current', 'recent', 'update', 'happening', 'today',
      'yesterday', 'this week', 'breaking'
    ];
    
    // Check for memory-related questions FIRST - these should NOT trigger search
    const isMemoryQuestion = /\b(what('s|s|\s+is)\s+my\s+(name|pet|birthday|favorite|goal|preference)|who\s+(am\s+i|is\s+my)|do\s+you\s+(remember|recall|know)\s+(my|about))\b/i.test(messageLower) ||
                            /\b(remember|recall)\s+my\s+(name|pet|birthday|favorite|goal|preference)\b/i.test(messageLower);
    
    const hasSearchIntent = !isMemoryQuestion && (
                           searchKeywords.some(keyword => messageLower.includes(keyword)) ||
                           /\b(google|search|find|lookup)\s+(for|about|on|up)?\s*\w+/.test(messageLower) ||
                           /\b(latest|current|recent)\s+(news|updates?|information|events?)\b/.test(messageLower) ||
                           /\bnews\s+(on|about|regarding)\b/.test(messageLower) ||
                           /\bwhat.s\s+(happening|new|going on)\b/.test(messageLower));
    
    if (hasSearchIntent) {
      const extractedQuery = await this.extractSearchQuery(message);
      const hasNewsKeywords = /\b(news|latest|current|recent|breaking|update|happening|today|yesterday)\b/i.test(messageLower);
      const isExplicitWebSearch = /\b(google|web|internet)(\s+(search|for))?\b/i.test(messageLower) || /\b(search|google)\s+\w+/i.test(messageLower);
      const isDeepResearch = /\b(research|deep|comprehensive|analyze|investigate|study|explore)\b/i.test(messageLower);
      
      console.log('🔍 SEARCH INTENT DETECTED:', {
        originalMessage: message,
        extractedQuery: extractedQuery,
        hasNewsKeywords: hasNewsKeywords,
        isExplicitWebSearch: isExplicitWebSearch,
        isDeepResearch: isDeepResearch
      });
      
      // Route news searches to NewsOrchestrator for comprehensive multi-category coverage
      if (hasNewsKeywords) {
        return {
          tool: 'news-orchestrator',
          params: {
            query: extractedQuery,
            userId: request?.userId,
            sessionId: request?.sessionId || 'default',
            conversationContext: []
          },
          reasoning: 'News search detected - routing to NewsOrchestrator for comprehensive multi-category coverage'
        };
      }
      
      // Enhanced WebSearchEngine with contextual intelligence for non-news searches
      return {
        tool: 'web-search-engine',
        params: {
          query: extractedQuery,
          searchType: isDeepResearch ? 'intelligent' : 
                     isExplicitWebSearch ? 'web' : 'auto',
          userId: request?.userId,
          sessionId: request?.sessionId || 'default',
          conversationContext: []
        },
        reasoning: isDeepResearch ? 'Deep research mode with contextual suggestions' :
                  isExplicitWebSearch ? 'Web search with intelligent follow-ups' :
                  'Smart search with conversation-aware suggestions'
      };
    }
    
    // GENERAL HELP/QUESTIONS - Route to natural conversation
    const helpKeywords = ['help', 'can you', 'how do', 'assist', 'support'];
    if (helpKeywords.some(keyword => messageLower.includes(keyword))) {
      // Return null to fall back to natural conversation
      return null;
    }
    
    return null; // No direct mapping found
  }

  private async buildToolResponse(_originalMessage: string, toolMapping: any, toolResult: any): Promise<string> {
    if (!toolResult.success) {
      return `I apologize, but I encountered an issue while ${toolMapping.reasoning.toLowerCase()}. Please try again.`;
    }
    
    switch (toolMapping.tool) {
      case 'generate-image':  // Fixed to match the actual tool name
        return `I've generated the visual you requested! The image should be displayed above. ${toolResult.data?.image_url ? '' : 'If you don\'t see it, please let me know and I\'ll help troubleshoot.'}`;
      
      case 'scribble_chart_create':
        // Trigger canvas activation if chart was successfully created
        if (toolResult.success && toolResult.canvasActivation) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('activateCanvas', {
              detail: {
                type: 'chart_created',
                chartData: toolResult.data,
                timestamp: Date.now()
              }
            }));
          }, 500);
        }
        return `📊 I've created an interactive chart for you in the Canvas Workspace! You can interact with it, zoom, and explore the data. The canvas should now be visible with your chart.`;
        
      case 'create_math_diagram':
        return `📊 I've generated a mathematical visualization for you! This diagram has been created using AI analysis of your request and should display the appropriate mathematical concept, function, or data visualization.`;
        
      case 'web-search':  // Fixed to match the actual tool name
        return `I found some relevant information about your search. Here are the key results:`;
      
      case 'news-orchestrator':
        if (toolResult.data?.stories && toolResult.data.stories.length > 0) {
          const newsData = toolResult.data;
          const breakingCount = newsData.stories?.filter((s: any) => s.isBreaking).length || 0;
          const categoryCount = newsData.categories?.length || 0;
          
          let response = `📰 **Latest News Overview** - Found ${newsData.stories.length} stories across ${categoryCount} categories`;
          
          if (breakingCount > 0) {
            response += `\n\n🚨 **${breakingCount} Breaking News** ${breakingCount === 1 ? 'Story' : 'Stories'} Detected`;
          }
          
          // Add top 3 breaking/important stories as preview
          const topStories = newsData.stories.slice(0, 3);
          if (topStories.length > 0) {
            response += `\n\n**Top Stories:**`;
            topStories.forEach((story: any, index: number) => {
              const breakingTag = story.isBreaking ? '🚨 ' : '';
              response += `\n${index + 1}. ${breakingTag}**${story.title}** - ${story.source}`;
            });
          }
          
          response += `\n\nView all stories and details in the search results below.`;
          return response;
        }
        if (toolResult.data?.summary) {
          return `📰 **News Summary**\n\n${toolResult.data.summary}`;
        }
        // Return empty string to let the tool results renderer handle the display
        return '';
        
      case 'canvas-document-creation':
        if (toolResult.success && toolResult.data?.message) {
          return toolResult.data.message;
        }
        // 🧠 LLM-GENERATED contextual response for canvas creation
        const docTitle = toolResult.data?.documentData?.title || 'document';
        const isRevision = toolResult.data?.isRevision;
        const revisionType = toolResult.data?.revisionType;
        const userRequest = toolMapping.params?.request || toolMapping.originalMessage || _originalMessage;
        const docSummary = toolResult.data?.documentData?.content?.substring(0, 300) || '';
        
        // Generate LLM response for canvas creation
        return await this.generateCanvasCreationResponse(
          docTitle, 
          userRequest, 
          isRevision, 
          revisionType,
          docSummary
        );
        
      case 'get-weather':
        // Weather data is directly in toolResult.data (not nested under .weather)
        const weatherData = toolResult.data;
        if (weatherData?.location && weatherData?.temperature !== undefined) {
          const feelsLike = weatherData.feelslike !== undefined ? ` (feels like ${weatherData.feelslike}°C)` : '';
          const humidity = weatherData.humidity ? ` Humidity is ${weatherData.humidity}%.` : '';
          const wind = weatherData.windSpeed ? ` Wind at ${weatherData.windSpeed} km/h.` : '';
          return `🌤️ The weather in ${weatherData.location}, ${weatherData.country || ''} is currently **${weatherData.description || 'clear'}** with a temperature of **${weatherData.temperature}°C**${feelsLike}.${humidity}${wind}`;
        }
        // Fallback: don't dump raw JSON, just acknowledge
        return `🌤️ I checked the weather for you! The conditions look ${toolResult.data?.description || 'typical'} right now.`;
        
      case 'navigate_to_page':
        if (toolResult.success) {
          const pageName = toolMapping.params.page === '/' ? 'Home' : 
                          toolMapping.params.page.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          return `🧭 Taking you to ${pageName}! ${toolResult.data?.message || ''}`;
        }
        return `I couldn't navigate to that page. ${toolResult.error || 'Please try again.'}`;
        
      case 'update_settings':
        if (toolResult.success) {
          return `⚙️ Done! I've updated your ${toolMapping.params.setting} setting. ${toolResult.data?.message || ''}`;
        }
        return `I couldn't update that setting. ${toolResult.error || 'Please try again.'}`;
        
      case 'store_memory':
        if (toolMapping.params.action === 'store') {
          return await this.generateNaturalMemoryStorageConfirmation(toolMapping.params.memory || toolMapping.params.content || toolMapping.originalMessage);
        } else if (toolMapping.params.action === 'search') {
          if (toolResult.data?.memories && toolResult.data.memories.length > 0) {
            // 🧠 NATURAL LLM-POWERED MEMORY RESPONSES
            return await this.generateNaturalMemoryResponse(toolResult.data.memories, toolMapping.params.query);
          }
          return `I don't have any specific memories about that topic yet.`;
        }
        return `Memory operation completed.`;
        
      case 'unified_memory_search':
        if (toolMapping.params.action === 'store') {
          return await this.generateNaturalMemoryStorageConfirmation(toolMapping.params.memory || toolMapping.params.content || toolMapping.originalMessage);
        } else if (toolMapping.params.action === 'search') {
          // 🔍 ENHANCED DEBUGGING: Log the full toolResult structure
          console.log('🔍 UnifiedMemorySearch Debug:', {
            hasData: !!toolResult.data,
            dataKeys: toolResult.data ? Object.keys(toolResult.data) : [],
            memoriesType: typeof toolResult.data?.memories,
            memoriesIsArray: Array.isArray(toolResult.data?.memories),
            memoriesLength: toolResult.data?.memories?.length,
            sourcesLength: toolResult.data?.sources?.length,
            count: toolResult.data?.count,
            fullToolResult: toolResult
          });
          
          // 🧠 ENHANCED CONDITION: Check for memories in multiple possible locations
          let memories = toolResult.data?.memories;
          
          // Handle different response formats from memory services
          if (!memories && toolResult.memories) {
            memories = toolResult.memories; // Direct memories property
          }
          if (!memories && toolResult.data?.data?.memories) {
            memories = toolResult.data.data.memories; // Nested data structure (COMMON CASE)
          }
          
          // 🔍 ADDITIONAL DEBUG: Log which location we found memories in
          if (memories && Array.isArray(memories) && memories.length > 0) {
            console.log('✅ Found memories in structure:', {
              location: toolResult.data?.memories ? 'data.memories' : 
                       toolResult.memories ? 'direct.memories' : 
                       toolResult.data?.data?.memories ? 'data.data.memories' : 'unknown',
              count: memories.length,
              firstMemory: memories[0]
            });
          }
          
          const hasValidMemories = memories && Array.isArray(memories) && memories.length > 0;
          
          if (hasValidMemories) {
            // 🧠 ENHANCED UNIFIED MEMORY RESPONSES
            const sources = toolResult.data?.sources || toolResult.data?.data?.sources || [];
            const count = toolResult.data?.count || toolResult.data?.data?.count || memories.length;
            
            console.log('🧠 UnifiedMemoryResponse: Processing', count, 'memories from', sources.length, 'sources');
            
            // Generate personalized response based on unified memories
            return await this.generateUnifiedMemoryResponse(memories, toolMapping.params.query, sources);
          }
          
          // 🔍 BETTER ERROR HANDLING: More detailed debugging
          console.log('⚠️ UnifiedMemorySearch: No valid memories found', {
            memoriesExists: !!memories,
            memoriesType: typeof memories,
            memoriesIsArray: Array.isArray(memories),
            memoriesLength: memories?.length,
            memoriesContent: JSON.stringify(memories, null, 2),
            toolResultSuccess: toolResult.success,
            toolResultDataKeys: toolResult.data ? Object.keys(toolResult.data) : [],
            fullToolResultStructure: JSON.stringify(toolResult, null, 2)
          });
          
          return `I don't have any specific memories about that topic yet.`;
        }
        return `Unified memory operation completed successfully.`;
        
      case 'llm-completion':
        // 🧠 LLM completion tool - extract the generated response
        // CoreTools returns: { success, data: { completion, response, message } }
        // ToolRegistry wraps as: { success, data: <CoreTools result>, metadata }
        const llmInnerData = toolResult.data?.data || toolResult.data;
        const llmResponse = llmInnerData?.completion || 
                           llmInnerData?.response || 
                           llmInnerData?.message || '';
        if (llmResponse) {
          console.log('✅ LLM completion response:', llmResponse.substring(0, 100) + '...');
          return llmResponse;
        }
        return 'I processed your request but couldn\'t generate a response. Please try again.';
        
      default:
        // For tools with custom renderers (search, news, etc.), don't show generic completion message
        // The tool results renderer will handle display
        return '';
    }
  }

  // Helper methods for tool mapping
  private extractLocation(message: string): string | null {
    console.log('🔍 EXTRACT LOCATION - Input message:', message);
    
    // ENHANCED: More precise location extraction patterns
    // Pattern 1: "weather in/for/at LOCATION" - most specific
    const weatherLocationMatch = message.match(/weather\s+(?:in|for|at)\s+([a-zA-Z\s,.-]+?)(?:\s+(?:today|tomorrow|forecast|temperature)|\s*[?!.,]|$)/i);
    if (weatherLocationMatch) {
      const location = weatherLocationMatch[1].trim();
      console.log('🔍 EXTRACT LOCATION - Found weather location:', location);
      return this.validateLocationString(location);
    }
    
    // Pattern 2: "in/for/at LOCATION" anywhere in the message  
    const generalLocationMatch = message.match(/(?:^|\s)(?:in|for|at)\s+([a-zA-Z\s,.-]+?)(?:\s+(?:weather|today|tomorrow|forecast|temperature)|\s*[?!.,]|\s+(?:what|how|when|where|why)|$)/i);
    if (generalLocationMatch) {
      const location = generalLocationMatch[1].trim();
      console.log('🔍 EXTRACT LOCATION - Found general location:', location);
      return this.validateLocationString(location);
    }
    
    // Pattern 3: Look for standalone city names (must be at least 3 characters and not common words)
    // ENHANCED: Only check words that look like proper nouns (capitalized) and aren't at the start of a sentence
    const words = message.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const cleanWord = word.replace(/[^a-zA-Z\s-]/g, '').trim();
      
      // Only consider words that are:
      // 1. At least 4 characters (more restrictive)
      // 2. Capitalized (proper nouns)
      // 3. Not the first word of the sentence (to avoid sentence starters)
      if (cleanWord.length >= 4 && 
          /^[A-Z][a-z]+$/.test(cleanWord) && 
          i > 0) {
        const validLocation = this.validateLocationString(cleanWord);
        if (validLocation) {
          console.log('🔍 EXTRACT LOCATION - Found standalone city:', validLocation);
          return validLocation;
        }
      }
    }
    
    console.log('🔍 EXTRACT LOCATION - No location found, returning null');
    return null;
  }
  
  private validateLocationString(location: string): string | null {
    if (!location || location.length < 2) return null;
    
    // Filter out common non-location words including contractions and common typos
    const nonLocationWords = [
      'what', 'whats', 'how', 'when', 'where', 'why', 'who', 'can', 'could', 
      'will', 'would', 'should', 'the', 'is', 'are', 'was', 'were', 'be', 
      'been', 'have', 'has', 'had', 'do', 'does', 'did', 'get', 'got', 
      'weather', 'temperature', 'forecast', 'today', 'tomorrow', 'now', 
      'currently', 'like', 'this', 'that', 'thats', 'there', 'here',
      // Common contractions and typos
      'thats', 'whats', 'hows', 'wheres', 'whos', 'dont', 'cant', 'wont',
      'im', 'ive', 'ill', 'youre', 'youd', 'youll', 'right', 'good', 'nice',
      'please', 'thanks', 'yeah', 'yes', 'no', 'ok', 'okay', 'sure', 'well'
    ];
    
    const locationWords = location.toLowerCase().split(/\s+/);
    
    // Check if any word in the location is a non-location word
    for (const word of locationWords) {
      if (nonLocationWords.includes(word.trim())) {
        console.log('🔍 VALIDATE LOCATION - Rejected non-location word:', word);
        return null;
      }
    }
    
    // Must contain at least one letter and be reasonable length
    if (!/[a-zA-Z]/.test(location) || location.length > 100) {
      console.log('🔍 VALIDATE LOCATION - Rejected invalid format:', location);
      return null;
    }
    
    // Capitalize first letter of each word for consistency
    const normalized = location.split(/\s+/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    console.log('🔍 VALIDATE LOCATION - Validated and normalized:', normalized);
    return normalized;
  }
  
  private extractGameTopic(message: string): string {
    // Extract topic from game recommendation requests
    const topicMatch = message.match(/(?:for|about|with)\s+([a-zA-Z\s]+?)(?:\s|$)/i);
    if (topicMatch) return topicMatch[1].trim();
    
    // Default topics based on keywords
    if (message.includes('math')) return 'mathematics';
    if (message.includes('reading')) return 'language arts';
    if (message.includes('science')) return 'science';
    if (message.includes('memory')) return 'memory training';
    
    return 'general learning';
  }

  /**
   * 📄 REQUEST CONTEXT EXTRACTION
   * Extracts the meaningful context from user's canvas document request
   * Used to generate dynamic, contextually-aware messages
   */
  private extractRequestContext(message: string): string | null {
    if (!message || typeof message !== 'string') return null;
    
    // Remove common prefixes to get to the actual request
    const prefixesToRemove = [
      /^(please\s+)?(can\s+you\s+)?(help\s+me\s+)?/i,
      /^(create|write|make|generate|draft|build)\s+(me\s+)?(a\s+)?/i,
      /^(i\s+need|i\s+want|i'd\s+like)\s+(a\s+)?/i,
      /^(put\s+)?(this\s+)?(in|on|into)\s+(the\s+)?canvas:?\s*/i,
      /^canvas:?\s*/i
    ];
    
    let cleanedMessage = message;
    for (const prefix of prefixesToRemove) {
      cleanedMessage = cleanedMessage.replace(prefix, '');
    }
    
    // If the message is about specific content types, extract the subject
    const documentTypes = ['document', 'article', 'essay', 'report', 'guide', 'tutorial', 'explanation', 'overview', 'summary'];
    const typePattern = new RegExp(`(${documentTypes.join('|')})\\s+(about|on|for|regarding|explaining)\\s+(.+)`, 'i');
    const typeMatch = cleanedMessage.match(typePattern);
    if (typeMatch && typeMatch[3]) {
      return typeMatch[3].trim();
    }
    
    // Check for "about X" pattern
    const aboutMatch = cleanedMessage.match(/about\s+(.+)/i);
    if (aboutMatch && aboutMatch[1]) {
      return aboutMatch[1].trim();
    }
    
    // Check for "on X" pattern (e.g., "document on climate change")
    const onMatch = cleanedMessage.match(/\bon\s+(.+)/i);
    if (onMatch && onMatch[1] && onMatch[1].length > 5) {
      return onMatch[1].trim();
    }
    
    // If cleanedMessage is reasonably short, use it as context
    if (cleanedMessage.length > 3 && cleanedMessage.length < 100) {
      return cleanedMessage.trim();
    }
    
    // For longer messages, try to extract the key topic
    const words = cleanedMessage.split(/\s+/).slice(0, 8).join(' ');
    if (words.length > 3) {
      return words + (cleanedMessage.split(/\s+/).length > 8 ? '...' : '');
    }
    
    return null;
  }

  /**
   * 🧭 NAVIGATION TARGET EXTRACTION
   * Extracts the target page from navigation requests
   */
  private extractNavigationTarget(message: string): string | null {
    const messageLower = message.toLowerCase();
    
    // Page mappings - common ways users refer to pages
    const pageAliases: Record<string, string[]> = {
      '/': ['home', 'homepage', 'home page', 'main', 'main page', 'start', 'landing'],
      '/playground': ['playground', 'play', 'games', 'gaming', 'play area', 'game area'],
      '/dashboard': ['dashboard', 'my dashboard', 'stats', 'statistics', 'progress', 'my progress', 'learning central', 'learning-central', 'learningcentral', 'courses', 'my courses', 'course library', 'library'],
      '/forum': ['forum', 'forums', 'community', 'discussions', 'chat rooms', 'boards'],
      '/profile': ['profile', 'my profile', 'account', 'my account', 'user profile'],
      '/user-profile': ['user profile', 'detailed profile'],
      '/registration': ['registration', 'register', 'sign up', 'signup', 'create account', 'new account'],
      '/signin': ['signin', 'sign in', 'login', 'log in', 'sign-in', 'log-in'],
      '/about': ['about', 'about us', 'about page', 'info', 'information'],
      '/ai-report': ['ai report', 'report', 'ai analytics', 'analytics', 'learning report'],
      '/forum-registration': ['forum registration', 'join forum', 'forum signup'],
      '/counting-test': ['counting test', 'counting', 'math test', 'count test'],
      '/test': ['test', 'test page', 'testing'],
      '/text-reveal': ['text reveal', 'text animation', 'reveal']
    };
    
    // Try to extract the page from the message
    // Pattern: "go to X", "take me to X", "open X", "navigate to X", "show me X"
    const patterns = [
      /(?:go\s+to|take\s+me\s+to|navigate\s+to|bring\s+me\s+to|head\s+to|switch\s+to)\s+(?:the\s+)?(.+?)(?:\s+page)?(?:\s*[?!.,]|$)/i,
      /(?:open|show\s+me|visit)\s+(?:the\s+)?(.+?)(?:\s+page)?(?:\s*[?!.,]|$)/i,
      /(?:i\s+want\s+to\s+(?:go\s+to|see|visit))\s+(?:the\s+)?(.+?)(?:\s+page)?(?:\s*[?!.,]|$)/i
    ];
    
    let targetPhrase = '';
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        targetPhrase = match[1].toLowerCase().trim();
        break;
      }
    }
    
    if (!targetPhrase) {
      // Try direct keyword matching
      for (const [path, aliases] of Object.entries(pageAliases)) {
        for (const alias of aliases) {
          if (messageLower.includes(alias)) {
            console.log(`🧭 Navigation matched alias "${alias}" → ${path}`);
            return path;
          }
        }
      }
      return null;
    }
    
    // Match the extracted phrase to a page
    for (const [path, aliases] of Object.entries(pageAliases)) {
      for (const alias of aliases) {
        if (targetPhrase.includes(alias) || alias.includes(targetPhrase)) {
          console.log(`🧭 Navigation matched phrase "${targetPhrase}" with alias "${alias}" → ${path}`);
          return path;
        }
      }
    }
    
    console.log(`🧭 Navigation: Could not match phrase "${targetPhrase}" to any page`);
    return null;
  }

  /**
   * ⚙️ SETTINGS CHANGE EXTRACTION
   * Extracts the setting and value from settings requests
   */
  private extractSettingsChange(message: string): { setting: string; value: any; reason: string } | null {
    const messageLower = message.toLowerCase();
    
    // Theme changes - comprehensive patterns
    const darkThemePatterns = [
      'dark mode', 'dark theme', 'switch to dark', 'make it dark',
      'enable dark', 'turn on dark', 'go dark', 'use dark',
      'set dark mode', 'set dark theme', 'switch dark'
    ];
    const lightThemePatterns = [
      'light mode', 'light theme', 'switch to light', 'make it light',
      'enable light', 'turn on light', 'go light', 'use light',
      'set light mode', 'set light theme', 'switch light'
    ];
    const brightThemePatterns = [
      'bright mode', 'bright theme', 'switch to bright', 'make it bright',
      'enable bright', 'use bright', 'set bright'
    ];
    
    if (darkThemePatterns.some(p => messageLower.includes(p))) {
      return { setting: 'theme', value: 'dark', reason: 'User requested dark mode' };
    }
    if (lightThemePatterns.some(p => messageLower.includes(p))) {
      return { setting: 'theme', value: 'light', reason: 'User requested light mode' };
    }
    if (brightThemePatterns.some(p => messageLower.includes(p))) {
      return { setting: 'theme', value: 'bright', reason: 'User requested bright mode' };
    }
    if (messageLower.match(/change.*theme.*to\s+(\w+)/i)) {
      const match = messageLower.match(/change.*theme.*to\s+(\w+)/i);
      return { setting: 'theme', value: match![1], reason: `User requested theme change to ${match![1]}` };
    }
    if (messageLower.match(/set.*theme.*to\s+(\w+)/i)) {
      const match = messageLower.match(/set.*theme.*to\s+(\w+)/i);
      return { setting: 'theme', value: match![1], reason: `User requested theme change to ${match![1]}` };
    }
    
    // Notification settings
    if (messageLower.includes('turn on notifications') || messageLower.includes('enable notifications')) {
      return { setting: 'notifications', value: true, reason: 'User enabled notifications' };
    }
    if (messageLower.includes('turn off notifications') || messageLower.includes('disable notifications')) {
      return { setting: 'notifications', value: false, reason: 'User disabled notifications' };
    }
    
    // Sound settings
    if (messageLower.includes('turn on sound') || messageLower.includes('enable sound') || 
        messageLower.includes('unmute') || messageLower.includes('turn up sound')) {
      return { setting: 'sound', value: true, reason: 'User enabled sound' };
    }
    if (messageLower.includes('turn off sound') || messageLower.includes('disable sound') || 
        messageLower.includes('mute') || messageLower.includes('silence')) {
      return { setting: 'sound', value: false, reason: 'User disabled sound' };
    }
    
    // Language settings
    const languageMatch = messageLower.match(/(?:change|set|switch).*(?:language|lang).*to\s+(\w+)/i);
    if (languageMatch) {
      return { setting: 'language', value: languageMatch[1], reason: `User changed language to ${languageMatch[1]}` };
    }
    
    // Voice settings
    if (messageLower.includes('turn on voice') || messageLower.includes('enable voice') ||
        messageLower.includes('enable tts') || messageLower.includes('turn on tts') ||
        messageLower.includes('read aloud') || messageLower.includes('speak to me')) {
      return { setting: 'voice', value: true, reason: 'User enabled voice/TTS' };
    }
    if (messageLower.includes('turn off voice') || messageLower.includes('disable voice') ||
        messageLower.includes('disable tts') || messageLower.includes('turn off tts') ||
        messageLower.includes('stop reading') || messageLower.includes('stop speaking')) {
      return { setting: 'voice', value: false, reason: 'User disabled voice/TTS' };
    }
    
    // Voice language settings (for TTS)
    const voiceLanguagePatterns = [
      { pattern: /(?:set|change|switch).*voice.*(?:to|language)\s*(arabic|english|spanish|french|german|russian|kazakh|chinese|japanese|korean|swedish|norwegian|finnish)/i, extract: 1 },
      { pattern: /(?:speak|talk|read).*(?:in|to me in)\s*(arabic|english|spanish|french|german|russian|kazakh|chinese|japanese|korean|swedish|norwegian|finnish)/i, extract: 1 },
      { pattern: /(?:use|switch to)\s*(arabic|english|spanish|french|german|russian|kazakh|chinese|japanese|korean|swedish|norwegian|finnish)\s*voice/i, extract: 1 }
    ];
    for (const { pattern, extract } of voiceLanguagePatterns) {
      const match = messageLower.match(pattern);
      if (match && match[extract]) {
        return { setting: 'voiceLanguage', value: match[extract], reason: `User set voice language to ${match[extract]}` };
      }
    }
    
    // Playback speed
    if (messageLower.includes('faster') && (messageLower.includes('read') || messageLower.includes('speak') || messageLower.includes('playback'))) {
      return { setting: 'playbackSpeed', value: 'fast', reason: 'User requested faster playback' };
    }
    if (messageLower.includes('slower') && (messageLower.includes('read') || messageLower.includes('speak') || messageLower.includes('playback'))) {
      return { setting: 'playbackSpeed', value: 'slow', reason: 'User requested slower playback' };
    }
    if (messageLower.includes('normal speed') || messageLower.includes('regular speed') || messageLower.includes('reset speed')) {
      return { setting: 'playbackSpeed', value: 'normal', reason: 'User reset playback speed' };
    }
    
    // Accessibility settings
    if (messageLower.includes('larger text') || messageLower.includes('bigger text') || messageLower.includes('increase font') ||
        messageLower.includes('bigger font') || messageLower.includes('larger font')) {
      return { setting: 'fontSize', value: 'large', reason: 'User requested larger text' };
    }
    if (messageLower.includes('smaller text') || messageLower.includes('decrease font') ||
        messageLower.includes('smaller font') || messageLower.includes('reduce font')) {
      return { setting: 'fontSize', value: 'small', reason: 'User requested smaller text' };
    }
    if (messageLower.includes('normal text') || messageLower.includes('default font') || messageLower.includes('reset font')) {
      return { setting: 'fontSize', value: 'medium', reason: 'User reset font size' };
    }
    
    // High contrast mode
    if (messageLower.includes('high contrast') || messageLower.includes('increase contrast')) {
      return { setting: 'highContrast', value: true, reason: 'User enabled high contrast mode' };
    }
    if (messageLower.includes('normal contrast') || messageLower.includes('disable contrast') || messageLower.includes('turn off contrast')) {
      return { setting: 'highContrast', value: false, reason: 'User disabled high contrast mode' };
    }
    
    // Reduced motion (accessibility)
    if (messageLower.includes('reduce motion') || messageLower.includes('disable animations') || messageLower.includes('turn off animations') ||
        messageLower.includes('stop animations') || messageLower.includes('no animations')) {
      return { setting: 'reducedMotion', value: true, reason: 'User enabled reduced motion' };
    }
    if (messageLower.includes('enable animations') || messageLower.includes('turn on animations') || messageLower.includes('enable motion')) {
      return { setting: 'reducedMotion', value: false, reason: 'User disabled reduced motion' };
    }
    
    // Auto-play settings
    if (messageLower.includes('auto play') || messageLower.includes('autoplay') || messageLower.includes('auto-play')) {
      if (messageLower.includes('disable') || messageLower.includes('turn off') || messageLower.includes('stop')) {
        return { setting: 'autoPlay', value: false, reason: 'User disabled auto-play' };
      } else if (messageLower.includes('enable') || messageLower.includes('turn on')) {
        return { setting: 'autoPlay', value: true, reason: 'User enabled auto-play' };
      }
    }
    
    // Dyslexia-friendly mode
    if (messageLower.includes('dyslexia') || messageLower.includes('dyslexic')) {
      if (messageLower.includes('enable') || messageLower.includes('turn on') || messageLower.includes('friendly')) {
        return { setting: 'dyslexiaMode', value: true, reason: 'User enabled dyslexia-friendly mode' };
      } else if (messageLower.includes('disable') || messageLower.includes('turn off')) {
        return { setting: 'dyslexiaMode', value: false, reason: 'User disabled dyslexia-friendly mode' };
      }
    }
    
    // Screen reader optimization
    if (messageLower.includes('screen reader')) {
      if (messageLower.includes('enable') || messageLower.includes('turn on') || messageLower.includes('optimize')) {
        return { setting: 'screenReaderOptimized', value: true, reason: 'User enabled screen reader optimization' };
      } else if (messageLower.includes('disable') || messageLower.includes('turn off')) {
        return { setting: 'screenReaderOptimized', value: false, reason: 'User disabled screen reader optimization' };
      }
    }
    
    // Focus mode
    if (messageLower.includes('focus mode') || messageLower.includes('distraction free') || messageLower.includes('zen mode')) {
      if (messageLower.includes('enable') || messageLower.includes('turn on') || messageLower.includes('enter') || 
          !messageLower.includes('disable') && !messageLower.includes('exit') && !messageLower.includes('turn off')) {
        return { setting: 'focusMode', value: true, reason: 'User enabled focus mode' };
      } else {
        return { setting: 'focusMode', value: false, reason: 'User disabled focus mode' };
      }
    }
    
    console.log(`⚙️ Settings: Could not extract settings change from "${messageLower}"`);
    return null;
  }

  /**
   * 🧠 UNIVERSAL LLM-POWERED MEMORY RESPONSE GENERATION
   * 
   * Uses sophisticated AI to generate contextual responses that never confuse user vs AI identity.
   * This is a truly universal solution that understands the semantic difference between 
   * user memories and AI responses in any language or context.
   */
  private async generateNaturalMemoryResponse(memories: any[], query: string): Promise<string> {
    try {
      // 🧠 UNIVERSAL LLM-BASED RESPONSE GENERATION
      return await this.generateUniversalMemoryResponse(memories, query);
    } catch (error) {
      console.error('❌ Universal memory response generation failed:', error);
      
      // 🛡️ UNIVERSAL FALLBACK: Always safe, never claims user identity
      const memoryCount = memories.length;
      if (memoryCount === 1) {
        return `Yes, I remember something about you! How can I help you today? 😊`;
      } else {
        return `I found ${memoryCount} things I remember about you! What would you like to know? 😊`;
      }
    }
  }

  /**
   * 🌟 UNIVERSAL LLM-POWERED MEMORY RESPONSE GENERATOR
   * 
   * The most sophisticated memory response system - uses LLM intelligence to:
   * 1. Never confuse user vs AI identity 
   * 2. Handle any language or cultural context
   * 3. Generate natural, empathetic responses
   * 4. Work universally without pattern matching
   */
  private async generateUniversalMemoryResponse(memories: any[], query: string): Promise<string> {
    const memoryContent = memories.map(m => m.memory_value || m.content || m.value || '').join(' | ');
    
    // 🧠 UNIVERSAL LLM PROMPT - Works for any content, any language, any culture
    const universalPrompt = `You are an AI assistant with memory capabilities. A user is asking about something you remember about THEM.

STORED USER MEMORY: "${memoryContent}"
USER'S QUERY: "${query}"

CRITICAL RULES:
1. The memory is about THE USER, not about you (the AI)
2. NEVER say "My name is..." or "I work..." or claim the user's identity
3. Always respond from the AI perspective remembering something about THE USER
4. Be warm, natural, and conversational
5. If the memory contains "my name is [Name]" respond like "Yes, I remember you [Name]!"
6. If the memory contains "I work at..." respond like "I remember you work at..."
7. Be empathetic and contextually appropriate

Generate a natural, warm response that acknowledges you remember this information ABOUT THE USER.

Response:`;

    // 🚀 Use fast, efficient model for response generation
    const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
    const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
    
    const response = await unifiedAPIRouter.routeAPICall(
      'fireworks',
      'llm-completion',
      {
        messages: [{ role: 'user', content: universalPrompt }],
        model: 'accounts/fireworks/models/gpt-oss-20b', // Fast, efficient model
        temperature: 0.6, // Natural variation
        max_tokens: 2000
      }
    );

    if (response?.choices?.[0]?.message?.content) {
      const generatedResponse = response.choices[0].message.content.trim();
      
      // 🛡️ SAFETY CHECK: Ensure the AI didn't accidentally claim user identity
      if (this.containsIdentityConfusion(generatedResponse, memoryContent)) {
        console.warn('⚠️ LLM generated identity confusion, using safe fallback');
        return this.generateSafeMemoryFallback(memories);
      }
      
      return generatedResponse;
    }
    
    // Fallback if LLM fails
    return this.generateSafeMemoryFallback(memories);
  }

  /**
   * 🛡️ UNIVERSAL IDENTITY CONFUSION DETECTOR
   * 
   * Detects if the AI accidentally claimed user identity in any language/context
   */
  private containsIdentityConfusion(aiResponse: string, userMemory: string): boolean {
    const responseLower = aiResponse.toLowerCase();
    const memoryLower = userMemory.toLowerCase();
    
    // Check if AI is using first-person pronouns with user's information
    const identityMarkers = ['my name is', "i'm ", 'i am ', 'i work', 'i live', 'i have'];
    
    for (const marker of identityMarkers) {
      if (responseLower.includes(marker) && memoryLower.includes(marker)) {
        return true; // Potential identity confusion
      }
    }
    
    return false;
  }

  /**
   * 🧠 UNIFIED MEMORY RESPONSE GENERATOR
   * 
   * Generates responses for the new unified memory system that coordinates
   * multiple memory sources (vector, database, conversation, preference)
   */
  private async generateUnifiedMemoryResponse(memories: any[], query: string, sources: string[]): Promise<string> {
    try {
      console.log('🧠 Generating unified memory response for', memories.length, 'memories from sources:', sources);
      
      // Group memories by source for better context
      const memoryBySource = memories.reduce((acc, memory) => {
        const source = memory.source || 'unknown';
        if (!acc[source]) acc[source] = [];
        acc[source].push(memory);
        return acc;
      }, {} as Record<string, any[]>);
      
      // Build comprehensive memory content
      const memoryContent = memories.map(m => {
        const content = m.content || m.memory_value || m.value || '';
        const source = m.source || 'memory';
        const similarity = m.similarity ? ` (${Math.round(m.similarity * 100)}% match)` : '';
        return `[${source}${similarity}] ${content}`;
      }).join(' | ');
      
      // Enhanced prompt for unified memory system
      const unifiedPrompt = `You are an AI assistant with a sophisticated memory system that remembers information about users across multiple sources.

UNIFIED MEMORY SOURCES: ${sources.join(', ')}
TOTAL MEMORIES FOUND: ${memories.length}
MEMORY CONTENT: "${memoryContent}"
USER'S QUERY: "${query}"

MEMORY BREAKDOWN:
${Object.entries(memoryBySource).map(([source, mems]) => 
  `- ${source}: ${(mems as any[]).length} memories`
).join('\n')}

RESPONSE GUIDELINES:
1. The memories are about THE USER, not about you (the AI)
2. NEVER claim the user's identity or use first-person for their information
3. Reference the comprehensive nature of your memory system when appropriate
4. Be warm, personal, and show you remember them across conversations
5. If you have their name, use it naturally
6. Acknowledge the richness of information you have about them
7. Be conversational and empathetic

Generate a natural, warm response that shows you remember this information about the user from your comprehensive memory system.

Response:`;

      // Use LLM to generate natural response
      const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      const response = await unifiedAPIRouter.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [{ role: 'user', content: unifiedPrompt }],
          model: 'accounts/fireworks/models/gpt-oss-20b',
          temperature: 0.6,
          max_tokens: 2000
        }
      );
      
      const generatedResponse = response?.choices?.[0]?.message?.content?.trim() || '';
      
      if (generatedResponse && !this.containsIdentityConfusion(generatedResponse, memoryContent)) {
        console.log('✅ Generated unified memory response:', generatedResponse.substring(0, 100) + '...');
        return generatedResponse;
      }
      
      // Enhanced fallback for unified system
      if (memories.length === 1) {
        const memory = memories[0];
        if (memory.content?.toLowerCase().includes('name')) {
          return `Yes, I remember you! I have your information stored in my ${memory.source || 'memory'} system. How can I help you today? 😊`;
        }
        return `I found something about you in my ${memory.source || 'memory'} system! What would you like to know? 😊`;
      } else {
        const sourceList = sources.length > 1 ? `across ${sources.join(', ')} systems` : `in my ${sources[0] || 'memory'} system`;
        return `I found ${memories.length} things I remember about you ${sourceList}! I have a comprehensive picture of our conversations. What can I help you with? 😊`;
      }
      
    } catch (error) {
      console.error('❌ Unified memory response generation failed:', error);
      
      // Safe fallback
      const sourceCount = sources.length;
      if (sourceCount > 1) {
        return `I found information about you across ${sourceCount} different memory systems! I remember our conversations well. How can I help you today? 😊`;
      } else {
        return `Yes, I remember you! I have information stored about our previous conversations. What would you like to know? 😊`;
      }
    }
  }

  /**
   * 🛡️ UNIVERSAL SAFE MEMORY FALLBACK
   * 
   * Always safe, never confuses identities, works in any context
   */
  private generateSafeMemoryFallback(memories: any[]): string {
    const memoryCount = memories.length;
    
    if (memoryCount === 1) {
      return `Yes, I remember you! It's good to see you again. How can I help you today? 😊`;
    } else {
      return `I remember several things about you! What would you like to talk about? 😊`;
    }
  }

  /**
   * 🌟 NATURAL MEMORY STORAGE CONFIRMATION GENERATOR
   * 
   * Generates contextual, LLM-powered confirmations when storing memories
   * that specifically acknowledge what was remembered about the user
   */
  private async generateNaturalMemoryStorageConfirmation(memoryContent: string): Promise<string> {
    try {
      if (!memoryContent || memoryContent.trim().length === 0) {
        return `I'll remember that for you! I've stored this information for future reference.`;
      }

      // 🧠 CONTEXTUAL LLM PROMPT - Generates natural acknowledgment of what was stored
      const storagePrompt = `You are an AI assistant that just stored some information about a user in your memory system.

INFORMATION STORED ABOUT THE USER: "${memoryContent}"

CRITICAL RULES:
1. This is information ABOUT THE USER, not about you (the AI)
2. NEVER claim the user's identity or use first-person for their information
3. Generate a warm, natural confirmation that specifically acknowledges what you learned/stored
4. Be conversational and show you understand what they shared
5. Keep it concise but specific to what was stored
6. Use phrases like "I'll remember that you..." or "Got it, I've noted that you..." or "Okay, I'll remember your..."

Generate a natural, contextual confirmation message that specifically acknowledges what you learned about the user:`;

      // Use LLM to generate natural confirmation
      const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      const response = await unifiedAPIRouter.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [{ role: 'user', content: storagePrompt }],
          model: 'accounts/fireworks/models/gpt-oss-20b',
          temperature: 0.6, // More controlled for less reasoning leak
          max_tokens: 2000
        }
      );
      
      const generatedResponse = response?.choices?.[0]?.message?.content?.trim() || '';
      
      if (generatedResponse && generatedResponse.length > 10) {
        console.log('✅ Generated natural memory storage confirmation:', generatedResponse);
        return generatedResponse;
      }
      
      // Fallback with some context if LLM fails
      if (memoryContent.toLowerCase().includes('name')) {
        return `Got it, I'll remember your name for our future conversations!`;
      } else if (memoryContent.toLowerCase().includes('prefer')) {
        return `I'll remember your preference for next time!`;
      } else if (memoryContent.toLowerCase().includes('work') || memoryContent.toLowerCase().includes('job')) {
        return `I'll remember what you shared about your work!`;
      } else {
        return `I'll remember that information about you for our future conversations!`;
      }
    } catch (error) {
      console.error('❌ Memory storage confirmation generation failed:', error);
      return `I'll remember that for you! I've stored this information for future reference.`;
    }
  }

  /**
   * 🎨 LLM-GENERATED CANVAS CREATION RESPONSE
   * 
   * Generates contextual, engaging responses when canvas documents are created
   * Uses memories and course context to personalize the response
   */
  private async generateCanvasCreationResponse(
    docTitle: string,
    userRequest: string,
    isRevision: boolean,
    revisionType?: string,
    docSummary?: string
  ): Promise<string> {
    try {
      const action = isRevision 
        ? (revisionType === 'append' ? 'added content to' : 'updated') 
        : 'created';
      
      // 🧠 LLM PROMPT - Generates natural, contextual confirmation
      const canvasPrompt = `You are a warm, engaging academic coach who just ${action} a document for a student.

DOCUMENT TITLE: "${docTitle}"
USER'S REQUEST: "${userRequest}"
${docSummary ? `DOCUMENT PREVIEW: "${docSummary.substring(0, 200)}..."` : ''}

CRITICAL RULES:
1. Generate a SHORT (1-2 sentences), warm confirmation that acknowledges the specific document
2. Reference the topic naturally (e.g., "Your guide on ${docTitle} is ready!")
3. Add a brief, relevant encouragement or next-step suggestion
4. DO NOT repeat the full content - just confirm and encourage
5. DO NOT use phrases like "I've created a document" - be more creative
6. Use ONE emoji maximum at the end
7. Sound like an excited tutor, not a robot

EXAMPLES OF GOOD RESPONSES:
- "Your happiness study guide is now in the canvas! Take a look and let me know if you'd like to expand any section. 📝"
- "I've put together that project management overview for you—it covers the key frameworks you'll need. Ready when you are! ✨"
- "Your Arabic learning roadmap is all set in the workspace. Let's tackle those first milestones together! 🎯"

Generate a natural, warm response (1-2 sentences only):`;

      const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      const response = await unifiedAPIRouter.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [{ role: 'user', content: canvasPrompt }],
          model: 'accounts/fireworks/models/gpt-oss-20b',
          temperature: 0.7,
          max_tokens: 150
        }
      );
      
      const generatedResponse = response?.choices?.[0]?.message?.content?.trim() || '';
      
      if (generatedResponse && generatedResponse.length > 10 && generatedResponse.length < 300) {
        console.log('✅ Generated canvas creation response:', generatedResponse);
        return generatedResponse;
      }
      
      // Contextual fallback
      if (isRevision) {
        return `I've ${revisionType === 'append' ? 'expanded' : 'updated'} "${docTitle}" for you—check it out in the canvas! ✨`;
      }
      return `Your "${docTitle}" is now in the canvas workspace—take a look and let me know if you'd like any changes! 📝`;
      
    } catch (error) {
      console.error('❌ Canvas creation response generation failed:', error);
      if (isRevision) {
        return `I've updated "${docTitle}" in the canvas for you! ✨`;
      }
      return `Your document "${docTitle}" is ready in the canvas workspace! 📝`;
    }
  }

  /**
   * 🏷️ COMPREHENSIVE MEMORY CATEGORIZATION
   * 
   * ALL memory categories from the system + emotions + relationships
   * NOTE: Currently unused but kept for future enhancements
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private categorizeMemory(key: string, content: string): string {
    // Safety checks for undefined values
    if (!key || !content) {
      console.warn('⚠️ Categorization: Missing key or content', { key, content });
      return 'general';
    }
    
    const keyLower = key.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // 🎯 COMPREHENSIVE CATEGORY MAPPING
    const categoryPatterns = {
      // 👤 Personal Identity
      'name': ['name', 'call', 'known_as', 'username'],
      'age': ['age', 'born', 'birthday', 'old'],
      'location': ['location', 'live', 'from', 'city', 'country', 'hometown', 'current_location'],
      
      // 💼 Professional
      'profession': ['job', 'work', 'career', 'profession', 'occupation', 'company'],
      'education': ['school', 'university', 'degree', 'study', 'education', 'college'],
      'skills': ['skill', 'talent', 'ability', 'good_at', 'expertise'],
      
      // 👨‍👩‍👧‍👦 Relationships & Family
      'family': ['family', 'parent', 'mother', 'father', 'sibling', 'brother', 'sister', 'child', 'son', 'daughter', 'uncle', 'aunt', 'cousin', 'grandparent', 'grandmother', 'grandfather', 'wife', 'husband', 'spouse', 'partner'],
      'friend': ['friend', 'buddy', 'pal', 'bestfriend'],
      'colleague': ['colleague', 'coworker', 'boss', 'assistant', 'team_member', 'manager'],
      'pet': ['pet', 'dog', 'cat', 'animal', 'pet_name'],
      
      // 💖 Emotions & Feelings
      'happy_emotions': ['happy', 'joyful', 'excited', 'thrilled', 'elated', 'cheerful', 'delighted'],
      'sad_emotions': ['sad', 'depressed', 'upset', 'disappointed', 'melancholy', 'heartbroken'],
      'anxious_emotions': ['anxious', 'worried', 'nervous', 'stressed', 'overwhelmed', 'panic'],
      'angry_emotions': ['angry', 'furious', 'mad', 'irritated', 'frustrated', 'annoyed'],
      'love_emotions': ['love', 'adore', 'cherish', 'care', 'affection', 'devoted'],
      'fear_emotions': ['afraid', 'scared', 'terrified', 'fearful', 'phobia'],
      
      // 🎯 Preferences & Interests
      'favorite_food': ['favorite_food', 'love_eating', 'cuisine', 'dish'],
      'favorite_color': ['favorite_color', 'color', 'prefer_color'],
      'hobbies': ['hobby', 'interest', 'passion', 'enjoy', 'activity', 'fun'],
      'music': ['music', 'song', 'band', 'artist', 'genre', 'listen'],
      'movies': ['movie', 'film', 'show', 'series', 'watch', 'favorite_movie'],
      'books': ['book', 'read', 'author', 'novel', 'literature'],
      'sports': ['sport', 'game', 'team', 'play', 'exercise', 'fitness'],
      
      // 🎯 Goals & Aspirations
      'goals': ['goal', 'dream', 'aspiration', 'plan', 'ambition', 'want', 'hope'],
      'achievements': ['achievement', 'accomplish', 'success', 'proud', 'won', 'completed'],
      'fears': ['fear', 'worry', 'concern', 'afraid_of', 'scared_of'],
      'challenges': ['challenge', 'difficult', 'struggle', 'problem', 'issue'],
      
      // 📅 Temporal & Events
      'memories': ['memory', 'remember', 'experience', 'event', 'happened', 'time'],
      'routine': ['routine', 'daily', 'habit', 'usually', 'regular'],
      'special_dates': ['birthday', 'anniversary', 'holiday', 'celebration', 'important_date'],
      
      // 🏠 Living & Lifestyle
      'home': ['home', 'house', 'apartment', 'room', 'living'],
      'health': ['health', 'medical', 'condition', 'allergy', 'medication', 'doctor'],
      'transportation': ['car', 'drive', 'transport', 'travel', 'commute'],
      'technology': ['computer', 'phone', 'device', 'software', 'tech', 'app']
    };
    
    // Find matching category
    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      for (const pattern of patterns) {
        if (keyLower.includes(pattern) || contentLower.includes(pattern)) {
          return category;
        }
      }
    }
    
    return 'general';
  }

  /**
   * 🎯 DETERMINE COMPONENT TYPE FROM CATEGORIES
   * Maps memory categories to vector storage component types for enhanced search
   */
  private determineComponentType(categories: string[]): string {
    // Priority mapping: most specific categories take precedence
    // 🔄 ALIGNED with server-src/hnsw-services/HNSWCoreIntegration.cjs:determineComponentType()
    const categoryToComponentMap: Record<string, string> = {
      // High-priority personal information
      'name': 'personal_identity',
      'identity': 'personal_identity',
      'birthday': 'personal_identity',
      'age': 'personal_identity',
      
      // Relationships & Family - Each canonical category maps to its component type
      'family': 'relationships',
      'friend': 'relationships',
      'colleague': 'professional',  // 🔥 Colleague is professional, NOT relationships
      'pet': 'relationships',
      // Legacy/alternate names that might appear
      'friends': 'relationships',
      'pets': 'relationships',
      'wife': 'relationships',
      'husband': 'relationships',
      'spouse': 'relationships',
      'partner': 'relationships',
      'romantic_partner': 'relationships',
      'son': 'relationships',
      'daughter': 'relationships',
      'child': 'relationships',
      'mother': 'relationships',
      'father': 'relationships',
      'parent': 'relationships',
      'uncle': 'relationships',
      'aunt': 'relationships',
      'cousin': 'relationships',
      'sibling': 'relationships',
      'brother': 'relationships',
      'sister': 'relationships',
      'coworker': 'professional',
      'boss': 'professional',
      'assistant': 'professional',
      'social_connections': 'relationships',
      
      // Professional & Education
      'job': 'professional',
      'work': 'professional',
      'career': 'professional',
      'education': 'professional',
      'school': 'professional',
      'university': 'professional',
      
      // Location
      'location': 'personal_context',
      'city': 'personal_context',
      'country': 'personal_context',
      'home': 'personal_context',
      
      // Emotional and behavioral
      'happy': 'emotional_state',
      'sad': 'emotional_state',
      'angry': 'emotional_state',
      'anxious': 'emotional_state',
      'love': 'emotional_state',
      'fear': 'emotional_state',
      'emotion': 'emotional_state',
      
      // Preferences and interests
      'food_preferences': 'preferences',
      'music_preferences': 'preferences', 
      'movie_preferences': 'preferences',
      'preference': 'preferences',
      'favorite': 'preferences',
      'hobbies': 'interests',
      'interests': 'interests',
      'hobby': 'interests',
      
      // Plans & Goals (NEW - aligned with backend)
      'plan': 'goals',
      'goal': 'goals',
      'deadline': 'goals',
      'assignment': 'goals',
      'project': 'goals',
      
      // Learning (NEW - aligned with backend)
      'course': 'learning',
      'learning': 'learning',
      'lesson': 'learning',
      'study': 'learning',
      
      // Default fallbacks
      'general': 'chat_knowledge',
      'personal': 'personal_identity'
    };

    // Find the highest priority component type
    for (const category of categories) {
      if (categoryToComponentMap[category]) {
        return categoryToComponentMap[category];
      }
    }

    // Default to chat_knowledge for conversation context
    return 'chat_knowledge';
  }

  /**
   * 🔍 PREDICT SEARCH CATEGORIES
   * Predicts which memory categories are most relevant for a search query
   */
  private predictSearchCategories(query: string, originalMessage: string): string[] {
    const categories: string[] = [];
    const lowerQuery = query.toLowerCase();
    const lowerMessage = originalMessage.toLowerCase();
    
    // Direct keyword mapping
    const searchKeywords: Record<string, string[]> = {
      'name': ['name', 'called', 'who am i', 'my name'],
      'family': ['family', 'mother', 'father', 'parent', 'sibling', 'wife', 'husband', 'kids', 'children'],
      'pets': ['cat', 'dog', 'pet', 'animal'],
      'job': ['work', 'job', 'career', 'profession', 'employer'],
      'location': ['live', 'address', 'city', 'country', 'home'],
      'age': ['age', 'old', 'born', 'birthday'],
      'hobbies': ['hobby', 'interest', 'enjoy', 'like doing'],
      'food_preferences': ['food', 'eat', 'favorite meal', 'cuisine'],
      'music_preferences': ['music', 'song', 'band', 'artist'],
      'movie_preferences': ['movie', 'film', 'show', 'watch'],
      'emotions': ['feel', 'mood', 'emotion', 'happy', 'sad', 'angry'],
      'health': ['health', 'medical', 'condition', 'illness', 'doctor'],
      'education': ['school', 'university', 'study', 'degree', 'education']
    };
    
    // Check both query and original message for keywords
    for (const [category, keywords] of Object.entries(searchKeywords)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword) || lowerMessage.includes(keyword)) {
          if (!categories.includes(category)) {
            categories.push(category);
          }
        }
      }
    }
    
    // If no specific categories found, default to general search categories
    if (categories.length === 0) {
      categories.push('general', 'personal');
    }
    
    return categories;
  }

  /**
   * 🧠 CONTEXTUAL RESPONSE GENERATION
   * 
   * Uses LLM to generate natural, empathetic responses based on memory category
   * NOTE: Currently unused but kept for future enhancements
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async generateContextualResponse(category: string, content: string, _originalQuery: string, allMemories: any[]): Promise<string> {
    // 🎭 CATEGORY-SPECIFIC RESPONSE TEMPLATES (Natural & Empathetic)
    const responseTemplates: Record<string, string[]> = {
      // 👤 Personal Identity
      'name': [
        `Yes, I remember you! You're {content}. It's great to see you again! 😊`,
        `Of course I remember - you're {content}! How have you been?`,
        `{content}! Yes, I definitely remember you. What can I help you with today?`
      ],
      'age': [
        `I remember you mentioned you're {content}. `,
        `Yes, you told me you're {content}. `,
        `I recall you're {content}. `
      ],
      'location': [
        `I remember you're from {content}! How are things there?`,
        `Yes, you're in {content}! I hope the weather's been nice there.`,
        `{content} - that's right! I remember you mentioning that location.`
      ],
      
      // 💼 Professional
      'profession': [
        `I remember you work in {content}! How's your job going?`,
        `Yes, you told me about your work in {content}. That sounds interesting!`,
        `I recall you mentioned working as {content}. How do you like it?`
      ],
      'education': [
        `I remember you studied {content}! That's impressive.`,
        `Yes, you mentioned your education in {content}. That must have been quite a journey!`,
        `I recall you telling me about {content}. How did you find that experience?`
      ],
      
      // 👨‍👩‍👧‍👦 Relationships & Family
      'family': [
        `I remember you telling me about your family - {content}. How are they doing?`,
        `Yes, you mentioned {content}. Family is so important! How are things with them?`,
        `I recall you sharing about {content}. I hope they're all well!`
      ],
      'romantic': [
        `I remember you mentioned {content}. I hope things are going well between you two! 💕`,
        `Yes, you told me about {content}. Relationships are such an important part of life!`,
        `I recall you sharing about {content}. How are things going?`
      ],
      'friends': [
        `I remember you talking about your friend {content}! How are they doing?`,
        `Yes, you mentioned {content}. Good friends are such a blessing! 😊`,
        `I recall you telling me about {content}. Friendship is so valuable!`
      ],
      'pets': [
        `I remember your pet {content}! How are they doing? I bet they're adorable! 🐾`,
        `Yes, you told me about {content}! Pets bring such joy to our lives.`,
        `I recall you mentioning {content}. I hope they're happy and healthy!`
      ],
      
      // 💖 Emotions & Feelings  
      'happy_emotions': [
        `I remember you feeling {content}! I'm glad you were in such a positive mood. 😊`,
        `Yes, you shared that you were {content}. It's wonderful when life brings those moments!`,
        `I recall you mentioning feeling {content}. Those are the moments worth cherishing!`
      ],
      'sad_emotions': [
        `I remember you were going through {content}. I hope things have gotten better for you. 💙`,
        `Yes, you shared that you were feeling {content}. I hope you're doing better now.`,
        `I recall you mentioning {content}. Sometimes life can be challenging, but you're stronger than you know.`
      ],
      'love_emotions': [
        `I remember you feeling {content}! Love is such a beautiful emotion. 💕`,
        `Yes, you shared that sense of {content}. It's wonderful when we feel that deeply!`,
        `I recall you mentioning {content}. Those feelings make life so meaningful!`
      ],
      
      // 🎯 Preferences & Interests
      'favorite_food': [
        `I remember your favorite is {content}! That sounds delicious. 🍽️`,
        `Yes, you told me you love {content}! Good taste!`,
        `I recall you mentioning {content} as your favorite. Yum!`
      ],
      'hobbies': [
        `I remember you enjoy {content}! Have you been able to do that lately?`,
        `Yes, you mentioned your passion for {content}. That's such a great hobby!`,
        `I recall you telling me about {content}. Hobbies bring such joy to life!`
      ],
      'music': [
        `I remember you like {content}! Music has such power to move us. 🎵`,
        `Yes, you mentioned {content}! Great musical taste.`,
        `I recall you sharing about {content}. Music is such a universal language!`
      ],
      
      // 🎯 Goals & Aspirations
      'goals': [
        `I remember your goal of {content}! How's that progressing? I'm rooting for you! 🌟`,
        `Yes, you shared your aspiration about {content}. That's inspiring!`,
        `I recall you mentioning wanting to {content}. Goals give life such purpose!`
      ],
      'achievements': [
        `I remember you achieved {content}! That's fantastic - you should be proud! 🏆`,
        `Yes, you told me about {content}! What an accomplishment!`,
        `I recall you sharing about {content}. Celebrations are in order! ✨`
      ],
      
      // Default for other categories
      'general': [
        `I remember you mentioning {content}. Thanks for sharing that with me!`,
        `Yes, I recall {content}. I appreciate you telling me about that.`,
        `I remember {content}. It's always nice to learn more about you!`
      ]
    };
    
    // Get appropriate template
    const templates = responseTemplates[category] || responseTemplates['general'];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // 🔧 CRITICAL FIX: Special processing for name category to extract actual name
    let processedContent = content;
    if (category === 'name') {
      // Extract just the name from "My name is Sammy" or "I'm Sammy" patterns
      const nameMatch = content.match(/(?:my name is|i'm|call me)\s+([a-zA-Z]+)/i);
      if (nameMatch && nameMatch[1]) {
        processedContent = nameMatch[1];
      } else {
        // If no pattern matches, try to extract the first capitalized word (likely a name)
        const capitalizedMatch = content.match(/\b[A-Z][a-z]+\b/);
        if (capitalizedMatch) {
          processedContent = capitalizedMatch[0];
        }
      }
    }
    
    // Generate natural response
    const response = template.replace('{content}', processedContent);
    
    // Add contextual follow-up if multiple memories
    if (allMemories.length > 1) {
      const additionalInfo = allMemories.slice(1, 3).map(m => 
        m.memory_value || m.content || ''
      ).filter(Boolean);
      
      if (additionalInfo.length > 0) {
        const followUps = [
          ` I also remember you mentioned ${additionalInfo.join(' and ')}.`,
          ` Plus, you told me about ${additionalInfo.join(' and ')}.`,
          ` And I recall ${additionalInfo.join(' and ')} as well.`
        ];
        return response + followUps[Math.floor(Math.random() * followUps.length)];
      }
    }
    
    return response;
  }

  /**
   * 🌍 UNIVERSAL MEMORY QUERY EXTRACTION
   * 
   * Global, comprehensive system that handles ALL patterns:
   * - Name introduction: "I'm John", "im sarah", "my name is alex"
   * - Identity questions: "do you remember me", "who am i"  
   * - Specific queries: "my pet", "my favorite", "my job"
   * - Complex patterns: "remember when I told you about my dog"
   * 
   * This replaces ALL situational fixes with one robust system.
   */
  private extractUniversalMemoryQuery(message: string): string {
    const messageLower = message.toLowerCase();
    
    // 🎯 PATTERN 1: Name Introduction (highest priority)
    // Patterns: "im john", "i'm sarah", "my name is alex", "call me mike", "i am david"
    // FIXED: Exclude location prepositions and common non-name contexts
    const namePatterns = [
      /\b(?:i'?m|i am)\s+(?!(?:in|at|from|near|going|coming|here|there|back|good|fine|okay|ready|done|new|feeling|thinking|working|living|staying)\b)([a-zA-Z]{2,20})\b/i,
      /\bmy name is\s+([a-zA-Z]{2,20})\b/i,
      /\bcall me\s+([a-zA-Z]{2,20})\b/i,
      /\bi go by\s+([a-zA-Z]{2,20})\b/i,
      /\bknow me as\s+([a-zA-Z]{2,20})\b/i,
      /\bthey call me\s+([a-zA-Z]{2,20})\b/i
    ];
    
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const extractedName = match[1].trim();
        // Filter out common non-names
        if (!['here', 'back', 'good', 'fine', 'okay', 'ready', 'done', 'new'].includes(extractedName.toLowerCase())) {
          console.log(`🎯 NAME EXTRACTED: "${extractedName}" using pattern: ${pattern}`);
          return extractedName;
        }
      }
    }
    
    // 🎯 PATTERN 2: Specific Memory Categories
    const categoryPatterns = {
      'user_name name': ['my name', 'what i am called', 'what to call me'],
      'pet_name pet animal': ['my pet', 'my dog', 'my cat', 'my animal'],
      'favorite food': ['my favorite food', 'what i like to eat', 'my preferred meal'],
      'favorite color': ['my favorite color', 'my preferred color', 'color i like'],
      'hobby interests': ['my hobby', 'my hobbies', 'what i do for fun', 'my interests'],
      'job profession work': ['my job', 'my work', 'my profession', 'what i do', 'my career'],
      'location home': ['where i live', 'my location', 'my home', 'my city', 'my country'],
      'family relationship': ['my family', 'my parents', 'my siblings', 'my children'],
      'goal dream': ['my goal', 'my goals', 'my dream', 'my dreams', 'my aspirations'],
      'birthday age': ['my birthday', 'my age', 'when i was born', 'my birth date'],
      'education school': ['my school', 'my education', 'where i study', 'my university']
    };
    
    for (const [searchTerms, patterns] of Object.entries(categoryPatterns)) {
      for (const pattern of patterns) {
        if (messageLower.includes(pattern)) {
          console.log(`🎯 CATEGORY MATCH: "${searchTerms}" for pattern: "${pattern}"`);
          return searchTerms;
        }
      }
    }
    
    // 🎯 PATTERN 3: Recognition Questions
    const recognitionPatterns = [
      /do you (?:remember|recall|know) me/i,
      /who am i/i,
      /remember me/i,
      /what do you know about me/i,
      /tell me about myself/i,
      /my information/i
    ];
    
    for (const pattern of recognitionPatterns) {
      if (pattern.test(message)) {
        console.log(`🎯 RECOGNITION REQUEST: Using "ALL MEMORIES" for pattern: ${pattern}`);
        return 'ALL MEMORIES';
      }
    }
    
    // 🎯 PATTERN 4: Context-based extraction
    // "remember when I told you about X" → extract X
    const contextPatterns = [
      /remember when i (?:told you|said|mentioned) about (.+?)(?:\?|$)/i,
      /you know how i (?:told you|said|mentioned) about (.+?)(?:\?|$)/i,
      /recall when i (?:told you|said|mentioned) (.+?)(?:\?|$)/i
    ];
    
    for (const pattern of contextPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const context = match[1].trim();
        console.log(`🎯 CONTEXT EXTRACTED: "${context}" using pattern: ${pattern}`);
        return context;
      }
    }
    
    // 🎯 PATTERN 5: Smart keyword extraction
    // Remove common words and extract meaningful terms
    const stopWords = ['what', 'is', 'my', 'and', 'the', 'a', 'an', 'do', 'you', 'me', 'im', 'am', 'i', 'can', 'will', 'would', 'could', 'should'];
    const words = message.toLowerCase().split(/\s+/).filter(word => 
      word.length > 2 && 
      !stopWords.includes(word) &&
      !/^\d+$/.test(word) // Remove pure numbers
    );
    
    if (words.length > 0) {
      const smartQuery = words.join(' ');
      console.log(`🎯 SMART EXTRACTION: "${smartQuery}" from keywords: [${words.join(', ')}]`);
      return smartQuery;
    }
    
    // 🎯 FALLBACK: Search all memories
    console.log('🎯 FALLBACK: Using "ALL MEMORIES" - no specific patterns matched');
    return 'ALL MEMORIES';
  }
  
  
  
  private async extractSearchQuery(message: string): Promise<string> {
    // Use LLM to intelligently extract the core search query
    try {
      const extractionPrompt = `Extract the core search query from this user message. Remove conversational fluff, remove question words (what, how, can you, etc.), and return ONLY the essential search terms.

Examples:
- "what's the latest news" → "latest news"
- "can you show me current events" → "current events"
- "tell me about AI developments" → "AI developments"
- "find information about climate change" → "climate change"
- "what are the breaking news today" → "breaking news today"

User message: "${message}"

Core search query:`;

      const result = await toolRegistry.execute('llm-completion', {
        prompt: `Return ONLY the core search query, no explanations or reasoning.\n\n${extractionPrompt}`,
        model: 'accounts/fireworks/models/gpt-oss-20b',
        temperature: 0.0, // CRITICAL: Deterministic = no reasoning tokens
        maxTokens: 50
      }, {
        sessionId: '',
        userId: '',
        startTime: Date.now()
      });

      let extractedQuery = '';
      if (result.success && result.data) {
        extractedQuery = (result.data.completion || result.data.response || result.data.message || '').trim();
        
        // Clean up any remaining artifacts
        extractedQuery = extractedQuery.replace(/^["']|["']$/g, ''); // Remove quotes
        extractedQuery = extractedQuery.replace(/\n.*$/s, ''); // Remove everything after first line
        extractedQuery = extractedQuery.trim();
      }

      // Fallback to simple cleanup if LLM fails
      if (!extractedQuery || extractedQuery.length < 3) {
        extractedQuery = message.toLowerCase()
          .replace(/^(what('s|s| is| are)|how|can you|please|show me|tell me|find|get me)\s+/i, '')
          .replace(/\s+(please|for me|\?)$/i, '')
          .trim();
      }

      console.log('🔍 LLM Query Extraction:', {
        original: message,
        extracted: extractedQuery
      });

      return extractedQuery || message;
    } catch (error) {
      console.error('❌ LLM query extraction failed:', error);
      // Fallback to simple cleanup
      return message.toLowerCase()
        .replace(/^(what('s|s| is| are)|how|can you|please|show me|tell me|find|get me)\s+/i, '')
        .replace(/\s+(please|for me|\?)$/i, '')
        .trim() || message;
    }
  }

  // buildConversationAwarePrompt method moved to unified ConversationMemoryService
}

