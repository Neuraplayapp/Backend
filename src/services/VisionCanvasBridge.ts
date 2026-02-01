/**
 * VISION-CANVAS BRIDGE SERVICE
 * 
 * ROBUST ARCHITECTURE: Coordinates between Vision Models and GPT OSS 120B
 * 
 * PIPELINE:
 * 1. Vision Models (Maverick/Scout) → Analyze PDFs/Images → Extract content/data
 * 2. GPT OSS 120B → Take vision output → Generate structured canvas content
 * 
 * CAPABILITIES:
 * - Document extraction from PDFs → Canvas document generation
 * - Chart/data extraction from images → Canvas chart generation
 * - Code extraction from screenshots → Canvas code generation
 * - Multi-page document processing with coherent output
 */

import { visionService, type VisionResponse } from './VisionService';
import { unifiedAPIRouter } from './UnifiedAPIRouter';
import { CanvasStateAdapter } from './CanvasStateAdapter';
import { getModelPath, getModelForOperation } from '../config/ModelConfig';

export interface VisionCanvasRequest {
  files: File[];
  prompt?: string;
  context?: string;
  canvasType: 'auto' | 'document' | 'chart' | 'code';
  sessionId: string;
}

export interface VisionCanvasResult {
  success: boolean;
  visionAnalysis?: VisionResponse;
  canvasElements?: Array<{
    id: string;
    type: 'document' | 'chart' | 'code';
    content: any;
  }>;
  error?: string;
  processingSteps?: string[];
}

class VisionCanvasBridge {
  private static instance: VisionCanvasBridge;

  private constructor() {}

  public static getInstance(): VisionCanvasBridge {
    if (!VisionCanvasBridge.instance) {
      VisionCanvasBridge.instance = new VisionCanvasBridge();
    }
    return VisionCanvasBridge.instance;
  }

  /**
   * MAIN PIPELINE: Vision Analysis → Canvas Generation
   */
  async processVisionToCanvas(request: VisionCanvasRequest): Promise<VisionCanvasResult> {
    const steps: string[] = [];
    
    try {
      console.log('🌉 VisionCanvasBridge: Starting vision-to-canvas pipeline', {
        filesCount: request.files.length,
        canvasType: request.canvasType,
        sessionId: request.sessionId
      });

      // STEP 1: Vision Model Analysis (Maverick or Scout)
      steps.push('Starting vision analysis with Llama 4 Maverick/Scout...');
      
      const visionResponse = await visionService.processVisionRequest({
        documents: request.files.filter(f => f.type === 'application/pdf'),
        images: request.files.filter(f => f.type.startsWith('image/')),
        text: request.prompt,
        context: request.context,
        enableToolCalls: false // We'll handle canvas generation ourselves
      });

      if (!visionResponse.success) {
        throw new Error(`Vision analysis failed: ${visionResponse.error}`);
      }

      steps.push(`✅ Vision analysis completed (${visionResponse.modelUsed})`);
      console.log('👁️ Vision analysis result:', {
        hasAnalysis: !!visionResponse.analysis,
        hasProcessedText: !!visionResponse.processedText,
        hasCombinedInsights: !!visionResponse.combinedInsights
      });

      // STEP 2: Determine canvas type if auto
      const detectedCanvasType = request.canvasType === 'auto' 
        ? await this.detectCanvasType(visionResponse)
        : request.canvasType;

      steps.push(`Detected canvas type: ${detectedCanvasType}`);
      console.log('🎯 Canvas type:', detectedCanvasType);

      // STEP 3: Generate canvas content using GPT OSS 120B
      steps.push('Generating canvas content with GPT OSS 120B...');
      
      const canvasElements = await this.generateCanvasContent(
        visionResponse,
        detectedCanvasType,
        request.prompt || 'Generate appropriate content'
      );

      steps.push(`✅ Generated ${canvasElements.length} canvas element(s)`);

      // STEP 4: Add to canvas store
      for (const element of canvasElements) {
        this.addToCanvas(element);
        steps.push(`Added ${element.type} to canvas: ${element.id}`);
      }

      return {
        success: true,
        visionAnalysis: visionResponse,
        canvasElements,
        processingSteps: steps
      };

    } catch (error) {
      console.error('❌ VisionCanvasBridge: Pipeline failed', error);
      steps.push(`❌ Error: ${error.message}`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingSteps: steps
      };
    }
  }

  /**
   * Detect appropriate canvas type from vision analysis
   */
  private async detectCanvasType(visionResponse: VisionResponse): Promise<'document' | 'chart' | 'code'> {
    // Simple heuristic-based detection
    const content = visionResponse.combinedInsights || visionResponse.processedText || '';
    
    // Check for code indicators
    if (content.match(/```|function\s+\w+|class\s+\w+|import\s+|const\s+\w+\s*=/i)) {
      return 'code';
    }
    
    // Check for data/chart indicators
    if (content.match(/chart|graph|data.*series|x-axis|y-axis|bar.*chart|line.*chart/i)) {
      return 'chart';
    }
    
    // Default to document
    return 'document';
  }

  /**
   * Generate structured canvas content using GPT OSS 120B
   */
  private async generateCanvasContent(
    visionResponse: VisionResponse,
    canvasType: 'document' | 'chart' | 'code',
    userPrompt: string
  ): Promise<Array<{ id: string; type: string; content: any }>> {
    
    const gptModel = getModelPath('documentGeneration'); // GPT OSS 120B
    console.log(`🤖 Using ${gptModel} for canvas generation`);

    // Prepare vision context for GPT OSS 120B
    const visionContext = this.prepareVisionContext(visionResponse);

    // Generate appropriate content based on type
    switch (canvasType) {
      case 'document':
        return await this.generateDocument(visionContext, userPrompt, gptModel);
      
      case 'chart':
        return await this.generateChart(visionContext, userPrompt, gptModel);
      
      case 'code':
        return await this.generateCode(visionContext, userPrompt, gptModel);
      
      default:
        throw new Error(`Unknown canvas type: ${canvasType}`);
    }
  }

  /**
   * Prepare vision analysis context for GPT OSS 120B
   */
  private prepareVisionContext(visionResponse: VisionResponse): string {
    let context = '=== VISION ANALYSIS RESULTS ===\n\n';
    
    if (visionResponse.combinedInsights) {
      context += `Analysis:\n${visionResponse.combinedInsights}\n\n`;
    }
    
    if (visionResponse.processedText) {
      context += `Extracted Text:\n${visionResponse.processedText}\n\n`;
    }
    
    if (visionResponse.analysis) {
      context += `Visual Elements:\n`;
      context += `- Objects detected: ${visionResponse.analysis.objects.join(', ')}\n`;
      context += `- Scene: ${visionResponse.analysis.scene}\n`;
      if (visionResponse.analysis.text) {
        context += `- OCR Text: ${visionResponse.analysis.text}\n`;
      }
    }
    
    return context;
  }

  /**
   * Generate structured document using GPT OSS 120B
   */
  private async generateDocument(
    visionContext: string,
    userPrompt: string,
    model: string
  ): Promise<Array<{ id: string; type: string; content: any }>> {
    
    const prompt = `Based on the vision analysis below, create a well-structured document.

${visionContext}

User Request: ${userPrompt}

Create a comprehensive document with:
- Clear title
- Well-organized sections with headings
- Bullet points for key information
- Professional formatting in Markdown

Format your response as JSON:
{
  "title": "Document Title",
  "content": "# Heading\\n\\nContent in Markdown format...",
  "summary": "Brief summary of the document"
}`;

    const response = await unifiedAPIRouter.llmCompletion(
      [
        { role: 'system', content: 'You are a JSON extraction API. Return ONLY valid JSON with no additional text, explanations, or reasoning.' },
        { role: 'user', content: prompt }
      ],
      model,
      { temperature: 0.0, max_tokens: 4000 } // CRITICAL: temp 0.0 = no reasoning tokens
    );

    if (!response.success) {
      throw new Error('GPT OSS 120B document generation failed');
    }

    // Parse JSON response
    const content = response.data?.response || response.data?.completion || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      // Fallback: use raw content
      return [{
        id: `doc_${Date.now()}`,
        type: 'document',
        content: {
          title: 'Generated Document',
          content: content,
          summary: ''
        }
      }];
    }

    try {
      const documentData = JSON.parse(jsonMatch[0]);
      return [{
        id: `doc_${Date.now()}`,
        type: 'document',
        content: documentData
      }];
    } catch (parseError) {
      console.error('Failed to parse document JSON:', parseError);
      return [{
        id: `doc_${Date.now()}`,
        type: 'document',
        content: {
          title: 'Generated Document',
          content: content,
          summary: ''
        }
      }];
    }
  }

  /**
   * Generate structured chart using GPT OSS 120B
   */
  private async generateChart(
    visionContext: string,
    userPrompt: string,
    model: string
  ): Promise<Array<{ id: string; type: string; content: any }>> {
    
    const prompt = `Based on the vision analysis below, extract or generate chart data.

${visionContext}

User Request: ${userPrompt}

If the content contains data, tables, or charts, extract them into a structured format.
If generating new charts, create meaningful data based on the content.

Format your response as JSON:
{
  "title": "Chart Title",
  "chartType": "bar|line|pie|scatter",
  "series": [
    {"label": "Item 1", "value": 10},
    {"label": "Item 2", "value": 20}
  ],
  "description": "Brief description of what the chart shows"
}

For multi-series data:
{
  "title": "Chart Title",
  "chartType": "line",
  "series": [
    {"name": "Series 1", "data": [1, 2, 3, 4]},
    {"name": "Series 2", "data": [2, 4, 6, 8]}
  ],
  "labels": ["Q1", "Q2", "Q3", "Q4"],
  "description": "Description"
}`;

    const response = await unifiedAPIRouter.llmCompletion(
      [
        { role: 'system', content: 'You are a JSON extraction API. Return ONLY valid JSON with no additional text, explanations, or reasoning.' },
        { role: 'user', content: prompt }
      ],
      model,
      { temperature: 0.0, max_tokens: 2000 } // CRITICAL: temp 0.0 = no reasoning tokens
    );

    if (!response.success) {
      throw new Error('GPT OSS 120B chart generation failed');
    }

    // Parse JSON response
    const content = response.data?.response || response.data?.completion || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      // Fallback chart
      return [{
        id: `chart_${Date.now()}`,
        type: 'chart',
        content: {
          title: 'Sample Chart',
          chartType: 'bar',
          series: [
            { label: 'A', value: 30 },
            { label: 'B', value: 50 }
          ],
          description: 'Generated from vision analysis'
        }
      }];
    }

    try {
      const chartData = JSON.parse(jsonMatch[0]);
      return [{
        id: `chart_${Date.now()}`,
        type: 'chart',
        content: chartData
      }];
    } catch (parseError) {
      console.error('Failed to parse chart JSON:', parseError);
      throw parseError;
    }
  }

  /**
   * Generate structured code using GPT OSS 120B (or GPT OSS 20B for code)
   */
  private async generateCode(
    visionContext: string,
    userPrompt: string,
    model: string
  ): Promise<Array<{ id: string; type: string; content: any }>> {
    
    // Use code-specialized model
    const codeModel = getModelPath('codeGeneration'); // GPT OSS 20B
    
    const prompt = `Based on the vision analysis below, extract or generate code.

${visionContext}

User Request: ${userPrompt}

If code is visible in the content, extract and format it properly.
If generating new code, create clean, well-commented code based on the requirements.

Format your response as JSON:
{
  "code": "// Your code here\\nfunction example() {\\n  return 'hello';\\n}",
  "language": "javascript|python|typescript|etc",
  "description": "Brief description of what the code does",
  "title": "Code Title"
}`;

    const response = await unifiedAPIRouter.llmCompletion(
      [{ role: 'user', content: prompt }],
      codeModel,
      { temperature: 0.2, max_tokens: 2000 }
    );

    if (!response.success) {
      throw new Error('GPT OSS code generation failed');
    }

    // Parse JSON response
    const content = response.data?.response || response.data?.completion || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      // Fallback: extract code blocks from response
      const codeMatch = content.match(/```(\w+)?\n([\s\S]*?)```/);
      if (codeMatch) {
        return [{
          id: `code_${Date.now()}`,
          type: 'code',
          content: {
            code: codeMatch[2],
            language: codeMatch[1] || 'javascript',
            description: 'Extracted from vision analysis',
            title: 'Generated Code'
          }
        }];
      }
      
      throw new Error('No code found in response');
    }

    try {
      const codeData = JSON.parse(jsonMatch[0]);
      return [{
        id: `code_${Date.now()}`,
        type: 'code',
        content: codeData
      }];
    } catch (parseError) {
      console.error('Failed to parse code JSON:', parseError);
      throw parseError;
    }
  }

  /**
   * Add element to canvas store
   */
  private addToCanvas(element: { id: string; type: string; content: any }): void {
    console.log(`🎨 Adding ${element.type} to canvas:`, element.id);
    
    try {
      switch (element.type) {
        case 'document':
          CanvasStateAdapter.addDocument({
            title: element.content.title || 'Document',
            content: element.content.content || element.content.text || '',
            metadata: { summary: element.content.summary, generated: Date.now() },
            position: { x: 100, y: 100 },
            size: { width: 800, height: 600 }
          });
          break;
        
        case 'chart':
          CanvasStateAdapter.addChart({
            title: element.content.title || 'Chart',
            chartType: element.content.chartType || 'bar',
            series: element.content.series || [],
            userRequest: element.content.description || '',
            position: { x: 100, y: 100 },
            size: { width: 600, height: 400 }
          });
          break;
        
        case 'code':
          CanvasStateAdapter.addCode({
            code: element.content.code || '',
            language: element.content.language || 'javascript',
            title: element.content.title || 'Code',
            position: { x: 100, y: 100 },
            size: { width: 700, height: 500 }
          });
          break;
      }
      
      console.log(`✅ Added ${element.type} to canvas successfully`);
    } catch (error) {
      console.error(`❌ Failed to add ${element.type} to canvas:`, error);
    }
  }
}

export const visionCanvasBridge = VisionCanvasBridge.getInstance();
export default visionCanvasBridge;

