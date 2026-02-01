/**
 * VISION HANDLER - Multimodal AI Processing
 * 
 * Handles requests that contain visual content (images, documents).
 * Integrates with the existing AI pipeline following the pattern:
 * Guard → Vision → Intent → Main Processing
 * 
 * FEATURES:
 * - Processes images using Fireworks Llama4-Maverick
 * - Handles document parsing and OCR
 * - Combines visual and textual analysis
 * - Caches processed results for performance
 * - Provides fallback handling for failures
 */

// any type replaced - using legacy object from AIRouter
import { AIRequest, AIResponse } from '../AIRouter';
import { visionService, VisionRequest } from '../../services/VisionService';
import { toolRegistry } from '../../services/ToolRegistry';
import { serviceContainer } from '../../services/ServiceContainer';
import { getModelPath, getModelForOperation } from '../../config/ModelConfig';

export class VisionHandler {
  async handle(request: AIRequest, intentAnalysis: any): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      console.log('👁️ VisionHandler: Processing multimodal request');
      console.log('👁️ Attachments:', {
        hasImages: !!request.attachments?.images?.length,
        hasDocuments: !!request.attachments?.documents?.length,
        totalFiles: request.attachments?.metadata?.totalFiles || 0
      });

      // Validate that we actually have visual content
      if (!request.attachments?.images?.length && !request.attachments?.documents?.length) {
        console.warn('👁️ VisionHandler: No visual content found, falling back to regular processing');
        return await this.fallbackToRegularProcessing(request, intentAnalysis, startTime);
      }

      // Wait for services to be ready
      await serviceContainer.waitForReady();

      // Step 1: Process visual content through Vision Service with tool calling enabled
      const visionRequest: VisionRequest = {
        images: request.attachments.images,
        documents: request.attachments.documents,
        text: request.message,
        context: this.buildVisionContext(request, intentAnalysis),
        cacheKey: request.visionContext?.cacheKey,
        enableToolCalls: true // Enable vision model tool calling
      };

      const visionResponse = await visionService.processVisionRequest(visionRequest);

      if (!visionResponse.success) {
        console.error('👁️ VisionHandler: Vision processing failed, using fallback');
        return await this.fallbackToRegularProcessing(request, intentAnalysis, startTime, visionResponse.error);
      }

      console.log('✅ VisionHandler: Vision processing completed', {
        hasAnalysis: !!visionResponse.analysis,
        hasProcessedText: !!visionResponse.processedText,
        hasCombinedInsights: !!visionResponse.combinedInsights,
        hasToolCalls: !!visionResponse.toolCalls,
        modelUsed: visionResponse.modelUsed,
        cached: visionResponse.cached
      });

      // Step 2: Use vision response directly or generate enhanced response
      // Vision models now provide complete responses with tool calls
      console.log('🔍 VisionHandler: Determining response format', {
        hasCombinedInsights: !!visionResponse.combinedInsights,
        combinedInsightsLength: visionResponse.combinedInsights?.length || 0,
        hasAnalysis: !!visionResponse.analysis,
        hasProcessedText: !!visionResponse.processedText
      });

      let enhancedResponse = visionResponse.combinedInsights;
      
      // If no combined insights, generate from available data
      if (!enhancedResponse || enhancedResponse.trim().length === 0) {
        console.log('⚠️ No combined insights, generating enhanced response...');
        enhancedResponse = await this.generateEnhancedResponse(request, intentAnalysis, visionResponse);
      }

      console.log('📤 Final response length:', enhancedResponse?.length || 0);

      // Step 3: Build final AI response with tool call support
      const aiResponse: AIResponse = {
        success: true,
        response: enhancedResponse,
        toolResults: visionResponse.toolResults || [],
        metadata: {
          sessionId: request.sessionId,
          executionTime: Date.now() - startTime,
          toolsExecuted: visionResponse.toolCalls?.length || 0,
          mode: 'vision',
          activateCanvas: this.shouldActivateCanvas(intentAnalysis, visionResponse),
          modelUsed: visionResponse.modelUsed
        },
        visionAnalysis: visionResponse.analysis,
        processedDocuments: this.formatProcessedDocuments(request.attachments.documents, visionResponse.processedText),
        combinedInsights: visionResponse.combinedInsights,
        toolCalls: visionResponse.toolCalls
      };

      console.log('✅ VisionHandler: Processing completed successfully', {
        toolCallsExecuted: visionResponse.toolCalls?.length || 0,
        modelUsed: visionResponse.modelUsed
      });
      return aiResponse;

    } catch (error) {
      console.error('❌ VisionHandler: Processing failed', error);
      
      // Fallback to regular processing on any error
      return await this.fallbackToRegularProcessing(
        request,
        intentAnalysis,
        startTime,
        error instanceof Error ? error.message : 'Vision processing error'
      );
    }
  }

  /**
   * Build context information for vision processing
   */
  private buildVisionContext(request: AIRequest, intentAnalysis: any): string {
    const contextParts: string[] = [];

    // Add intent analysis context
    if (intentAnalysis.primaryDomain) {
      contextParts.push(`Domain: ${intentAnalysis.primaryDomain}`);
    }

    if (intentAnalysis.secondaryIntent) {
      contextParts.push(`Intent: ${intentAnalysis.secondaryIntent}`);
    }

    if (intentAnalysis.complexityLevel) {
      contextParts.push(`Complexity: ${intentAnalysis.complexityLevel}`);
    }

    // Add session context if available
    if (request.sessionId) {
      contextParts.push(`Session: ${request.sessionId}`);
    }

    return contextParts.join(' | ');
  }

  /**
   * Generate enhanced response combining vision analysis with user request
   * 🎯 ARCHITECTURE: Maverick Vision → GPT-OSS-120B synthesis → Final output
   * 
   * IMPORTANT: This is ONLY for UPLOADED images/documents, NOT for image generation requests.
   * Image generation ("create an image of...") goes through ToolCallingHandler → generate-image tool.
   * This handler is invoked only when request.attachments contains actual uploaded files.
   */
  private async generateEnhancedResponse(
    request: AIRequest,
    intentAnalysis: any,
    visionResponse: any
  ): Promise<string> {
    try {
      // 🔒 SAFEGUARD: Only process if user actually UPLOADED files
      // This ensures we don't interfere with image GENERATION requests
      const hasUploadedImages = request.attachments?.images && request.attachments.images.length > 0;
      const hasUploadedDocuments = request.attachments?.documents && request.attachments.documents.length > 0;
      
      console.log('🧠 VisionHandler: Generating GPT-OSS-120B enhanced response', {
        hasUploadedImages,
        hasUploadedDocuments,
        hasCombinedInsights: !!visionResponse.combinedInsights,
        hasAnalysis: !!visionResponse.analysis,
        hasProcessedText: !!visionResponse.processedText
      });

      // 🚫 If no uploaded files, this shouldn't be called - return fallback
      if (!hasUploadedImages && !hasUploadedDocuments) {
        console.warn('⚠️ VisionHandler: No uploaded files detected, using fallback');
        return this.buildFallbackResponse(request, visionResponse);
      }

      // For documents: GPT-OSS already processed (combinedInsights contains GPT-OSS response)
      if (visionResponse.combinedInsights && visionResponse.combinedInsights.length > 100) {
        console.log('✅ Using GPT-OSS-120B response from document processing');
        return visionResponse.combinedInsights;
      }

      // For UPLOADED images ONLY: Pass Maverick's analysis to GPT-OSS-120B for synthesis
      // This does NOT apply to image generation requests (those use ToolCallingHandler)
      if (hasUploadedImages && (visionResponse.analysis || visionResponse.processedText)) {
        console.log('🧠 VisionHandler: Synthesizing Maverick vision with GPT-OSS-120B for UPLOADED image...');
        const synthesizedResponse = await this.synthesizeWithGPTOSS(request, visionResponse);
        if (synthesizedResponse) {
          return synthesizedResponse;
        }
      }

      // Fallback: Build response from available data
      console.log('⚠️ Building fallback response from available data');
      const fallbackResponse = this.buildFallbackResponse(request, visionResponse);
      
      console.log('📝 Fallback response length:', fallbackResponse?.length || 0);
      return fallbackResponse;

    } catch (error) {
      console.error('❌ VisionHandler: Enhanced response generation failed', error);
      return this.buildFallbackResponse(request, visionResponse);
    }
  }

  /**
   * 🎯 SYNTHESIS: Pass Maverick vision analysis to GPT-OSS-120B for final response
   * This ensures consistent quality and tone across all vision responses
   */
  private async synthesizeWithGPTOSS(
    request: AIRequest,
    visionResponse: any
  ): Promise<string | null> {
    try {
      // Build context from Maverick's analysis
      const visionContext = this.buildVisionContextForSynthesis(visionResponse);
      
      if (!visionContext || visionContext.trim().length < 20) {
        console.warn('⚠️ VisionHandler: Insufficient vision context for synthesis');
        return null;
      }

      const synthesisPrompt = `You are NeuraPlay AI, a helpful educational assistant. You have just received a detailed visual analysis from an AI vision system (Llama Vision).

## VISION ANALYSIS FROM LLAMA MAVERICK:
${visionContext}

## USER'S ORIGINAL QUESTION:
"${request.message}"

## YOUR TASK:
Based on the vision analysis above, provide a helpful, conversational response to the user's question. 
- Interpret and explain what was seen in the image/document
- Answer the user's specific question using the visual information
- Be natural and conversational, not robotic
- If relevant data was extracted (charts, tables, text), present it clearly
- Keep response focused and helpful

Respond now:`;

      console.log('📤 VisionHandler: Sending to GPT-OSS-120B for synthesis');
      console.log('📋 Vision context length:', visionContext.length);

      const llmResult = await toolRegistry.execute('llm-completion', {
        prompt: synthesisPrompt,
        model: getModelPath('primaryLLM'), // GPT-OSS-120B
        temperature: 0.6,
        maxTokens: 1500
      }, {
        sessionId: request.sessionId,
        startTime: Date.now()
      });

      if (llmResult.success) {
        const actualData = llmResult.data?.data || llmResult.data;
        const responseText = actualData?.completion || actualData?.response || actualData?.message;
        
        if (responseText && responseText.trim().length > 20) {
          console.log('✅ VisionHandler: GPT-OSS-120B synthesis successful');
          console.log('📝 Synthesized response length:', responseText.length);
          return responseText;
        }
      }

      console.warn('⚠️ VisionHandler: GPT-OSS-120B synthesis returned empty, using fallback');
      return null;

    } catch (error) {
      console.error('❌ VisionHandler: GPT-OSS synthesis failed:', error);
      return null;
    }
  }

  /**
   * Build vision context string from Maverick's analysis for GPT-OSS synthesis
   */
  private buildVisionContextForSynthesis(visionResponse: any): string {
    const parts: string[] = [];

    // Include processed text (from documents)
    if (visionResponse.processedText && visionResponse.processedText.trim()) {
      parts.push(`### Document Content:\n${visionResponse.processedText}`);
    }

    // Include structured analysis (from images)
    if (visionResponse.analysis) {
      const analysis = visionResponse.analysis;
      
      if (analysis.description) {
        parts.push(`### Visual Description:\n${analysis.description}`);
      }
      
      if (analysis.objects && analysis.objects.length > 0) {
        parts.push(`### Objects Detected:\n${analysis.objects.join(', ')}`);
      }
      
      if (analysis.text) {
        parts.push(`### Text Found (OCR):\n${analysis.text}`);
      }
      
      if (analysis.scene && analysis.scene !== 'unknown') {
        parts.push(`### Scene/Setting:\n${analysis.scene}`);
      }
      
      if (analysis.colors && analysis.colors.length > 0) {
        parts.push(`### Colors:\n${analysis.colors.join(', ')}`);
      }
      
      if (analysis.emotions) {
        parts.push(`### Mood/Emotions:\n${analysis.emotions}`);
      }
      
      if (analysis.fullResponse && analysis.fullResponse !== analysis.description) {
        parts.push(`### Full Vision Analysis:\n${analysis.fullResponse}`);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Build fallback response when LLM processing fails
   * Actually includes the processed content instead of just mentioning it
   */
  private buildFallbackResponse(request: AIRequest, visionResponse: any): string {
    let response = '';

    // Prioritize processedText (from documents) as it contains the actual vision model response
    if (visionResponse.processedText && visionResponse.processedText.trim().length > 0) {
      console.log('✅ Using processedText from documents');
      response = visionResponse.processedText;
      return response;
    }

    // If no processedText, build from analysis
    response = "I've analyzed the visual content you shared. ";

    if (visionResponse.analysis) {
      const analysis = visionResponse.analysis;
      response += `I can see ${analysis.description || 'the content in your image'}. `;

      if (analysis.objects?.length) {
        response += `The main objects I detected include: ${analysis.objects.slice(0, 5).join(', ')}. `;
      }

      if (analysis.text) {
        response += `I also found text that reads: "${analysis.text}". `;
      }

      if (analysis.scene !== 'unknown') {
        response += `This appears to be ${analysis.scene}. `;
      }
    }

    if (visionResponse.combinedInsights) {
      response += '\n\n' + visionResponse.combinedInsights;
    } else {
      response += "\n\nLet me know if you'd like me to analyze any specific aspects of the visual content or if you have questions about what I've observed.";
    }

    console.log('📝 Built fallback response length:', response.length);
    return response;
  }

  /**
   * Format processed documents for response
   */
  private formatProcessedDocuments(documents?: File[], processedText?: string): any[] | undefined {
    if (!documents?.length || !processedText) return undefined;

    return documents.map((doc, index) => ({
      filename: doc.name,
      content: processedText,
      type: doc.type
    }));
  }

  /**
   * Determine if canvas should be activated based on vision results
   */
  private shouldActivateCanvas(intentAnalysis: any, visionResponse: any): boolean {
    // Activate canvas for creative or professional content with substantial visual analysis
    if (intentAnalysis.primaryDomain === 'creative' || intentAnalysis.primaryDomain === 'professional') {
      return true;
    }

    // Activate for complex analysis
    if (intentAnalysis.complexityLevel === 'complex' || intentAnalysis.complexityLevel === 'expert') {
      return true;
    }

    // Activate if we have substantial combined insights
    if (visionResponse.combinedInsights && visionResponse.combinedInsights.length > 200) {
      return true;
    }

    return false;
  }

  /**
   * Fallback to regular processing when vision fails or isn't needed
   * Uses vision models for consistency (they can handle text-only requests too)
   */
  private async fallbackToRegularProcessing(
    request: AIRequest,
    intentAnalysis: any,
    startTime: number,
    errorMessage?: string
  ): Promise<AIResponse> {
    console.log('🔄 VisionHandler: Falling back to text-based vision model processing');

    try {
      // Use vision model for text processing (they're multimodal and handle text well)
      const modelPath = getModelPath('visionAnalysis');
      
      const llmResult = await toolRegistry.execute('llm-completion', {
        prompt: `You are NeuraPlay AI, a helpful educational assistant with vision capabilities.

${errorMessage ? `Note: There was an issue processing visual content (${errorMessage}), but I can still help with your text request.` : ''}

User message: "${request.message}"

Please provide a helpful response.${request.attachments ? ' The user also shared some files, but I\'m currently unable to fully analyze them.' : ''}`,
        model: modelPath,
        temperature: 0.7,
        maxTokens: 500
      }, {
        sessionId: request.sessionId,
        userId: request.userId,
        startTime: Date.now()
      });

      const responseText = llmResult.data?.completion || 
                          llmResult.data?.response || 
                          llmResult.data?.message || 
                          'I apologize, but I\'m currently unable to process your request. Please try again.';

      return {
        success: true,
        response: responseText,
        toolResults: [],
        metadata: {
          sessionId: request.sessionId,
          executionTime: Date.now() - startTime,
          toolsExecuted: 1,
          mode: 'vision-fallback',
          modelUsed: getModelForOperation('visionAnalysis').displayName
        }
      };

    } catch (fallbackError) {
      console.error('❌ VisionHandler: Fallback processing also failed', fallbackError);
      
      return {
        success: false,
        response: 'I apologize, but I\'m currently experiencing technical difficulties processing your request. Please try again later.',
        toolResults: [],
        metadata: {
          sessionId: request.sessionId,
          executionTime: Date.now() - startTime,
          toolsExecuted: 0,
          mode: 'vision-error'
        },
        error: errorMessage || 'Vision processing failed'
      };
    }
  }
}
