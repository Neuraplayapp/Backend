/**
 * VISION SERVICE - Vision-Instructed LLM Integration
 * 
 * Standalone vision service for multimodal AI capabilities.
 * Integrates with existing NeuraPlay architecture for seamless vision processing.
 * 
 * FEATURES:
 * - Image analysis using Llama4-Maverick-Vision
 * - Large document processing (up to 150MB PDFs) using Llama4-Scout
 * - Tool calling support for document creation, data extraction
 * - Multimodal context management
 * - Caching for processed visual content
 * - Error handling with intelligent fallbacks
 * 
 * ARCHITECTURE:
 * - All requests route through Render backend (/api/unified-route)
 * - Uses ModelConfig for centralized model management
 * - Vision models handle both analysis AND tool calling
 */

import { apiService } from './APIService';
import { getModelPath, getModelForOperation } from '../config/ModelConfig';

export interface VisionRequest {
  images?: File[] | string[]; // File objects or base64 strings
  documents?: File[]; // PDF, DOC, TXT files
  text?: string; // Associated text prompt
  context?: string; // Additional context
  cacheKey?: string; // For caching processed results
  enableToolCalls?: boolean; // Enable tool calling for vision models
  useScout?: boolean; // Force use of Scout for large documents
}

export interface VisionAnalysis {
  description: string;
  objects: string[];
  text: string; // OCR text if any
  scene: string;
  emotions?: string;
  colors: string[];
  composition: string;
  confidence: number;
}

export interface VisionResponse {
  success: boolean;
  analysis?: VisionAnalysis;
  processedText?: string; // From documents
  combinedInsights?: string; // LLM analysis combining visual + text
  toolCalls?: any[]; // Tool calls from vision model
  toolResults?: any[]; // Results from executed tools
  error?: string;
  cached?: boolean;
  processingTime?: number;
  modelUsed?: string; // Which model was used (Maverick or Scout)
}

interface CacheEntry {
  timestamp: number;
  data: VisionAnalysis | string;
  expiresAt: number;
}

class VisionService {
  private static instance: VisionService;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
  private initialized = false;

  private constructor() {}

  public static getInstance(): VisionService {
    if (!VisionService.instance) {
      VisionService.instance = new VisionService();
    }
    return VisionService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('👁️ VisionService: Initializing Vision-Instructed LLM integration...');
    console.log('📦 Vision Models:', {
      imageAnalysis: getModelForOperation('visionAnalysis').displayName,
      documentSummarization: getModelForOperation('documentSummarization').displayName
    });
    
    // Start cache cleanup timer
    this.startCacheCleanup();
    
    this.initialized = true;
    console.log('✅ VisionService: Ready for multimodal processing');
  }

  /**
   * Get tool definitions for vision models to call
   */
  private getVisionTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'create_document',
          description: 'Create a structured document from analyzed visual or textual content',
          parameters: {
            type: 'object',
            properties: {
              title: { 
                type: 'string', 
                description: 'Title of the document' 
              },
              content: { 
                type: 'string', 
                description: 'Main content of the document in markdown format' 
              },
              format: { 
                type: 'string', 
                enum: ['markdown', 'plain'],
                description: 'Document format' 
              }
            },
            required: ['title', 'content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'extract_data',
          description: 'Extract structured data from images, charts, tables, or documents',
          parameters: {
            type: 'object',
            properties: {
              data_type: { 
                type: 'string', 
                description: 'Type of data extracted (e.g., table, chart_data, text, metadata)' 
              },
              values: { 
                type: 'array',
                items: { type: 'object' },
                description: 'Extracted data values as structured objects' 
              },
              summary: {
                type: 'string',
                description: 'Brief summary of the extracted data'
              }
            },
            required: ['data_type', 'values']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_chart',
          description: 'Create a chart or visualization from analyzed data in images or documents',
          parameters: {
            type: 'object',
            properties: {
              chart_type: {
                type: 'string',
                enum: ['bar', 'line', 'pie', 'scatter', 'area'],
                description: 'Type of chart to create'
              },
              data: {
                type: 'object',
                description: 'Chart data with labels and values'
              },
              title: {
                type: 'string',
                description: 'Chart title'
              },
              description: {
                type: 'string',
                description: 'Chart description and insights'
              }
            },
            required: ['chart_type', 'data', 'title']
          }
        }
      }
    ];
  }

  /**
   * Main vision processing entry point
   * Routes to appropriate model: Maverick for images, Scout for large documents
   */
  async processVisionRequest(request: VisionRequest): Promise<VisionResponse> {
    const startTime = Date.now();
    
    try {
      await this.initialize();
      
      // DEBUG: Log what we receive at entry point
      console.log('🔍 DEBUG: VisionService received request.documents:', request.documents);
      if (request.documents && request.documents.length > 0) {
        console.log('🔍 DEBUG: First document structure:', {
          keys: Object.keys(request.documents[0]),
          hasFile: !!(request.documents[0] as any).file,
          isFile: request.documents[0] instanceof File,
          type: typeof request.documents[0]
        });
      }
      
      // Determine which model to use
      const hasLargeDocuments = request.documents && request.documents.some(doc => doc.size > 10 * 1024 * 1024); // >10MB
      const useScout = request.useScout || hasLargeDocuments;
      const modelKey = useScout ? 'documentSummarization' : 'visionAnalysis';
      const modelInfo = getModelForOperation(modelKey);
      
      console.log('👁️ VisionService: Processing multimodal request', {
        hasImages: !!request.images?.length,
        hasDocuments: !!request.documents?.length,
        hasText: !!request.text,
        modelUsed: modelInfo.displayName,
        enableToolCalls: request.enableToolCalls,
        cacheKey: request.cacheKey
      });

      // Check cache first
      if (request.cacheKey) {
        const cached = this.getFromCache(request.cacheKey);
        if (cached) {
          console.log('⚡ VisionService: Using cached result');
          return {
            success: true,
            analysis: cached as VisionAnalysis,
            cached: true,
            processingTime: Date.now() - startTime,
            modelUsed: modelInfo.displayName
          };
        }
      }

      let visionAnalysis: VisionAnalysis | null = null;
      let documentText = '';
      let toolCalls: any[] = [];
      let combinedInsights: string | undefined;

      // Process images if present
      if (request.images && request.images.length > 0) {
        const imageResult = await this.analyzeImages(
          request.images, 
          request.text, 
          request.context,
          request.enableToolCalls,
          modelKey
        );
        visionAnalysis = imageResult.analysis;
        toolCalls = imageResult.toolCalls || [];
        combinedInsights = imageResult.response;
      }

      // Process documents if present (especially for large PDFs with Scout)
      if (request.documents && request.documents.length > 0) {
        const docResult = await this.processDocuments(
          request.documents, 
          request.text,
          request.context,
          request.enableToolCalls,
          useScout
        );
        documentText = docResult.text;
        toolCalls = [...toolCalls, ...(docResult.toolCalls || [])];
        combinedInsights = combinedInsights || docResult.response;
      }

      // Cache the results
      if (request.cacheKey && visionAnalysis) {
        this.setCache(request.cacheKey, visionAnalysis);
      }

      const response: VisionResponse = {
        success: true,
        analysis: visionAnalysis || undefined,
        processedText: documentText || undefined,
        combinedInsights,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        processingTime: Date.now() - startTime,
        modelUsed: modelInfo.displayName
      };

      console.log('✅ VisionService: Processing completed', {
        hasAnalysis: !!visionAnalysis,
        hasText: !!documentText,
        documentTextLength: documentText?.length || 0,
        hasInsights: !!combinedInsights,
        combinedInsightsLength: combinedInsights?.length || 0,
        hasToolCalls: toolCalls.length > 0,
        processingTime: response.processingTime,
        modelUsed: modelInfo.displayName
      });

      console.log('🔍 FULL RESPONSE DETAILS:', {
        processedText: documentText?.substring(0, 200) + '...',
        combinedInsights: combinedInsights?.substring(0, 200) + '...'
      });

      return response;

    } catch (error) {
      console.error('❌ VisionService: Processing failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Vision processing failed',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze images using Vision-Instructed LLM (Maverick or Scout)
   * Sends images to BACKEND for processing (better security, consistent architecture)
   */
  private async analyzeImages(
    images: File[] | string[], 
    prompt?: string,
    context?: string,
    enableToolCalls?: boolean,
    modelKey: 'visionAnalysis' | 'documentSummarization' = 'visionAnalysis'
  ): Promise<{ analysis: VisionAnalysis; toolCalls?: any[]; response?: string }> {
    console.log(`📸 VisionService: Sending images to backend for analysis`);

    try {
      // Create FormData to send images to backend
      const formData = new FormData();
      
      // Add image files
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (typeof image === 'string') {
          // If already base64, convert back to blob for upload
          const response = await fetch(image);
          const blob = await response.blob();
          formData.append('files', blob, `image_${i}.jpg`);
        } else {
          // Extract File object from wrapper if needed
          const fileObj = (image as any).file || image;
          formData.append('files', fileObj, fileObj.name || `image_${i}.jpg`);
        }
      }
      
      // Add metadata
      formData.append('prompt', prompt || 'Analyze this image in detail');
      if (context) {
        formData.append('context', context);
      }
      formData.append('enableToolCalls', enableToolCalls ? 'true' : 'false');
      formData.append('modelKey', modelKey);

      // Send to backend image analysis endpoint
      const response = await apiService.makeRequest({
        endpoint: '/api/vision/analyze',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!response.success || !response.data) {
        throw new Error(`Backend image analysis failed: ${response.error || 'Unknown error'}`);
      }

      // 🔧 FIX: Handle double-wrapping from APIService (same pattern as document processing)
      // Backend returns: { success, data: { analysis, toolCalls, rawResponse }, ... }
      // APIService wraps as: { success, data: <backend_response> }
      const backendData = response.data.data || response.data;

      console.log('📊 Backend image analysis response:', {
        hasData: !!response.data,
        hasNestedData: !!response.data.data,
        hasAnalysis: !!backendData.analysis,
        hasToolCalls: !!backendData.toolCalls,
        hasRawResponse: !!backendData.rawResponse
      });

      // Extract from backend response format
      const analysis = backendData.analysis || {
        description: 'Image analysis temporarily unavailable',
        objects: [],
        text: '',
        scene: 'unknown',
        colors: [],
        composition: 'Unable to analyze',
        confidence: 0.1
      };
      
      const toolCalls = backendData.toolCalls || [];
      const rawResponse = backendData.rawResponse || '';

      console.log('📝 Image analysis completed:', {
        description: analysis.description?.substring(0, 100),
        objectsFound: analysis.objects?.length || 0,
        confidence: analysis.confidence
      });

      return {
        analysis,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        response: rawResponse || analysis.description
      };

    } catch (error) {
      console.error('❌ VisionService: Image analysis failed', error);
      
      // Fallback analysis for robustness
      return {
        analysis: {
          description: 'Image analysis temporarily unavailable',
          objects: [],
          text: '',
          scene: 'unknown',
          colors: [],
          composition: 'Unable to analyze',
          confidence: 0.1
        }
      };
    }
  }

  /**
   * Process documents (especially large PDFs with Scout)
   * For PDFs >10MB, automatically uses Scout's 128K context window
   */
  private async processDocuments(
    documents: File[],
    prompt?: string,
    context?: string,
    enableToolCalls?: boolean,
    useScout?: boolean
  ): Promise<{ text: string; toolCalls?: any[]; response?: string }> {
    const modelKey = useScout ? 'documentSummarization' : 'visionAnalysis';
    const modelPath = getModelPath(modelKey);
    const modelInfo = getModelForOperation(modelKey);
    
    console.log(`📄 VisionService: Processing documents with ${modelInfo.displayName}`);

    try {
      const processedDocs: string[] = [];
      const allToolCalls: any[] = [];
      let combinedResponse = '';

      for (const doc of documents) {
        // DEBUG: Log the actual structure we're receiving
        console.log('🔍 DEBUG: doc object structure:', {
          hasFile: !!(doc as any).file,
          hasName: !!doc.name,
          hasSize: !!doc.size,
          hasType: !!doc.type,
          docKeys: Object.keys(doc),
          docType: typeof doc,
          isFile: doc instanceof File,
          docConstructor: doc.constructor?.name
        });
        console.log('🔍 DEBUG: Full doc object:', doc);
        
        // Extract file properties (handles both wrapper objects and direct File objects)
        const fileObj = (doc as any).file || doc;
        
        console.log('🔍 DEBUG: fileObj after extraction:', {
          type: typeof fileObj,
          isFile: fileObj instanceof File,
          constructor: fileObj?.constructor?.name,
          hasFile: !!(fileObj as any)?.file
        });
        
        const fileName = doc.name || fileObj.name;
        const fileType = (doc as any).mimeType || doc.type || fileObj.type;
        const fileSize = doc.size || fileObj.size;
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

        console.log(`📄 Processing ${fileName} (${fileType}, ${fileSizeMB}MB)`);

        // For text files, process directly
        if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
          const text = await this.readTextFile(fileObj);
          processedDocs.push(`Document: ${fileName}\n${text}`);
          continue;
        }

        // For PDFs, DOCX, DOC and other documents, send to BACKEND for processing (Browser doesn't have Buffer API)
        if (
          fileType === 'application/pdf' || 
          fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // DOCX
          fileType === 'application/msword' || // DOC
          fileSize > 1024 * 1024 // Files >1MB
        ) {
          try {
            console.log(`📄 Sending ${fileName} to backend for document processing`);
            
            // Send PDF to backend for text extraction
            const formData = new FormData();
            formData.append('documents', fileObj, fileName);
            formData.append('prompt', prompt || `Analyze this document: ${fileName}`);
            if (context) {
              formData.append('context', context);
            }
            formData.append('enableToolCalls', enableToolCalls ? 'true' : 'false');
            
            // Send to backend PDF processing endpoint
            const pdfResponse = await apiService.makeRequest({
              endpoint: '/api/vision/process-documents',
              method: 'POST',
              data: formData,
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });

            if (pdfResponse.success && pdfResponse.data) {
              // Backend response is nested inside pdfResponse.data (APIService wraps the response)
              // Backend returns: { success, data: { analysis, extractedText, toolCalls } }
              // APIService wraps as: { success, data: <backend_response> }
              const backendData = pdfResponse.data.data || pdfResponse.data;
              
              console.log('📊 Backend PDF processing response:', {
                hasData: !!pdfResponse.data,
                hasNestedData: !!pdfResponse.data.data,
                hasAnalysis: !!backendData.analysis,
                hasExtractedText: !!backendData.extractedText
              });

              const analysisText = backendData.analysis || backendData.extractedText || '';
              const toolCalls = backendData.toolCalls || [];

              console.log('📝 Extracted text length:', analysisText?.length || 0);
              console.log('📝 Analysis preview:', analysisText?.substring(0, 200));

              if (analysisText && analysisText.trim()) {
                processedDocs.push(`Document: ${fileName}\n${analysisText}`);
                combinedResponse += analysisText + '\n\n';
                console.log('✅ Successfully extracted content from:', fileName);
              } else {
                console.warn('⚠️ Empty analysis from backend for:', fileName);
                console.warn('⚠️ Backend response structure:', JSON.stringify(pdfResponse.data, null, 2).substring(0, 500));
                processedDocs.push(`Document: ${fileName}\n[No content extracted from PDF]`);
              }

              if (toolCalls && toolCalls.length > 0) {
                allToolCalls.push(...toolCalls);
              }
            } else {
              console.error('❌ Backend PDF processing failed for:', fileName, pdfResponse.error);
              processedDocs.push(`Document: ${fileName}\n[Processing failed: ${pdfResponse.error || 'Unknown error'}]`);
            }
          } catch (pdfError) {
            console.error('❌ PDF parsing failed:', fileName, pdfError);
            processedDocs.push(`Document: ${fileName}\n[PDF parsing failed: ${pdfError.message}]`);
          }
        } else {
          // Try to read as text for other file types
          try {
            const text = await this.readTextFile(fileObj);
            processedDocs.push(`Document: ${fileName}\n${text}`);
          } catch {
            processedDocs.push(`Document: ${fileName}\n[Binary file - content not readable]`);
          }
        }
      }

      console.log('📦 Document processing complete:', {
        processedDocsCount: processedDocs.length,
        totalTextLength: processedDocs.join('\n\n---\n\n').length,
        combinedResponseLength: combinedResponse?.length || 0,
        toolCallsCount: allToolCalls.length
      });

      const result = {
        text: processedDocs.join('\n\n---\n\n'),
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        response: combinedResponse || undefined
      };

      console.log('📤 Returning from processDocuments:', {
        textLength: result.text?.length || 0,
        hasResponse: !!result.response,
        responseLength: result.response?.length || 0
      });

      return result;

    } catch (error) {
      console.error('❌ VisionService: Document processing failed', error);
      return {
        text: 'Document processing temporarily unavailable',
        toolCalls: undefined,
        response: undefined
      };
    }
  }

  /**
   * REMOVED: generateCombinedInsights
   * Vision models (Maverick, Scout) now handle insights natively through their responses.
   * No need for separate insight generation step.
   */

  // Helper methods
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private async extractPdfText(file: File): Promise<string> {
    // For now, we'll return a placeholder
    // In a full implementation, you'd use pdf-parse or similar
    return `[PDF content from ${file.name} - text extraction would be implemented here]`;
  }

  private createVisionPrompt(userPrompt?: string, context?: string): string {
    let basePrompt = `Analyze this visual content in detail and provide a comprehensive description. Include:

1. OBJECTS: List all visible objects, people, animals, and items
2. SCENE: Describe the setting, location, and overall scene
3. TEXT: Extract any visible text (OCR)
4. COMPOSITION: Describe the layout, perspective, and visual elements
5. COLORS: List the dominant colors and color palette
6. EMOTIONS: If people are present, describe their expressions and mood
7. DATA: If charts, tables, or structured data are visible, extract them
8. CONTEXT: Provide any relevant context or interpretation

Format your response as structured information that can be easily parsed.`;

    if (context) {
      basePrompt += `\n\nADDITIONAL CONTEXT: ${context}`;
    }

    if (userPrompt) {
      basePrompt += `\n\nUSER'S SPECIFIC REQUEST: "${userPrompt}"`;
    }

    return basePrompt;
  }

  /**
   * REMOVED: createInsightPrompt
   * No longer needed as vision models handle insights natively.
   */

  private parseVisionResponse(response: any): VisionAnalysis {
    // Parse the Llama4-Maverick response into structured format
    const text = response.response || response.completion || response.generated_text || '';
    
    return {
      description: this.extractSection(text, 'description') || text.substring(0, 200),
      objects: this.extractList(text, 'objects'),
      text: this.extractSection(text, 'text') || '',
      scene: this.extractSection(text, 'scene') || 'General scene',
      emotions: this.extractSection(text, 'emotions'),
      colors: this.extractList(text, 'colors'),
      composition: this.extractSection(text, 'composition') || 'Standard composition',
      confidence: 0.8 // Default confidence for successful API calls
    };
  }

  private extractSection(text: string, section: string): string {
    const pattern = new RegExp(`${section}[:\\s]*([^\\n]*(?:\\n(?!\\w+:)[^\\n]*)*)`, 'i');
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
  }

  private extractList(text: string, section: string): string[] {
    const sectionText = this.extractSection(text, section);
    if (!sectionText) return [];
    
    return sectionText
      .split(/[,;]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  // Cache management
  private getFromCache(key: string): VisionAnalysis | string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache(key: string, data: VisionAnalysis | string): void {
    this.cache.set(key, {
      timestamp: Date.now(),
      data,
      expiresAt: Date.now() + this.CACHE_DURATION
    });
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  // Health check
  getStats(): any {
    return {
      initialized: this.initialized,
      cacheSize: this.cache.size,
      serviceName: 'VisionService'
    };
  }
}

export const visionService = VisionService.getInstance();
export default visionService;
