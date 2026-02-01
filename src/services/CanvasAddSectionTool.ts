/**
 * 🎯 Canvas Add Section Tool
 * 
 * NLP-based tool for adding sections to canvas documents.
 * Integrates with CoreTools and NeuraPlayDocumentCanvas.
 * 
 * Examples:
 * - "Add a chart showing user growth"
 * - "Make a summary section"
 * - "Add code examples in Python"
 */

import { serviceContainer } from './ServiceContainer';

interface AddSectionParams {
  request: string;
  documentId?: string;
  sectionType?: 'text' | 'chart' | 'code' | 'table' | 'auto';
  position?: 'append' | 'prepend' | 'replace';
}

interface AddSectionResult {
  success: boolean;
  documentId: string;
  newVersion: number;
  content: string;
  message: string;
}

/**
 * Parse natural language request to determine section type
 */
function detectSectionType(request: string): 'text' | 'chart' | 'code' | 'table' | 'auto' {
  const lower = request.toLowerCase();
  
  // Chart detection
  if (/\b(chart|graph|plot|visualize|visualization)\b/.test(lower)) {
    return 'chart';
  }
  
  // Code detection
  if (/\b(code|function|class|implement|programming|script)\b/.test(lower)) {
    return 'code';
  }
  
  // Table detection
  if (/\b(table|spreadsheet|data|rows|columns)\b/.test(lower)) {
    return 'table';
  }
  
  // Default to text
  return 'text';
}

/**
 * Detect if request wants to append, prepend, or replace
 */
function detectPosition(request: string): 'append' | 'prepend' | 'replace' {
  const lower = request.toLowerCase();
  
  if (/\b(replace|change|update|modify)\b/.test(lower)) {
    return 'replace';
  }
  
  if (/\b(start|beginning|top|prepend)\b/.test(lower)) {
    return 'prepend';
  }
  
  // Default to append
  return 'append';
}

/**
 * Add a section to a canvas document using NLP
 */
export async function addSectionToDocument(params: AddSectionParams): Promise<AddSectionResult> {
  try {
    console.log('📝 Canvas Add Section:', params);
    
    // Detect section type and position if not provided
    const sectionType = params.sectionType || detectSectionType(params.request);
    const position = params.position || detectPosition(params.request);
    
    console.log('🧠 Detected:', { sectionType, position });
    
    // Get canvas store
    const canvasStoreModule = await import('../stores/canvasStore');
    const canvasStore = canvasStoreModule.useCanvasStore.getState();
    
    // Find the document to add to
    let documentElement = null;
    
    if (params.documentId) {
      // Find specific document
      const allElements = canvasStore.getCurrentCanvasElements();
      documentElement = allElements.find(el => el.id === params.documentId && el.type === 'document');
    } else {
      // Find most recent document
      const allElements = canvasStore.getCurrentCanvasElements();
      const documents = allElements.filter(el => el.type === 'document');
      documentElement = documents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
    }
    
    if (!documentElement) {
      throw new Error('No document found to add section to. Create a document first.');
    }
    
    console.log('📄 Found document:', documentElement.id);
    
    // Generate section content based on type
    let newContent = '';
    
    if (sectionType === 'chart') {
      // Delegate to create_chart tool
      const CoreTools = await import('./CoreTools');
      const chartResult = await CoreTools.createChart({
        request: params.request,
        position: { x: 100, y: 100 },
        size: { width: 600, height: 400 }
      }, { sessionId: 'canvas-add', userId: 'system' });
      
      if (chartResult.success) {
        return {
          success: true,
          documentId: documentElement.id,
          newVersion: (documentElement.currentVersion || 1) + 1,
          content: chartResult.data?.message || 'Chart added',
          message: 'Chart added to canvas successfully'
        };
      }
    } else if (sectionType === 'code') {
      // Generate code section using LLM
      const apiService = serviceContainer.get('apiService');
      if (!apiService) throw new Error('API service not available');
      
      const codePrompt = `Generate code based on this request: "${params.request}"
      
Please provide:
1. A clear title for the code section
2. Well-commented, production-ready code
3. Brief explanation of what the code does

Format as markdown with code blocks.`;
      
      const response = await apiService.makeRequest({
        endpoint: '/api/unified-route',
        method: 'POST',
        data: {
          action: 'chat',
          message: codePrompt,
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          max_tokens: 1000
        }
      });
      
      if (response.success && response.data?.text) {
        newContent = response.data.text;
      }
    } else if (sectionType === 'table') {
      // Generate table section using LLM
      const apiService = serviceContainer.get('apiService');
      if (!apiService) throw new Error('API service not available');
      
      const tablePrompt = `Generate a table based on this request: "${params.request}"
      
Please provide:
1. A clear title for the table
2. Well-structured markdown table with headers
3. Realistic sample data (at least 3 rows)

Format as markdown.`;
      
      const response = await apiService.makeRequest({
        endpoint: '/api/unified-route',
        method: 'POST',
        data: {
          action: 'chat',
          message: tablePrompt,
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          max_tokens: 800
        }
      });
      
      if (response.success && response.data?.text) {
        newContent = response.data.text;
      }
    } else {
      // Generate text section using LLM
      const apiService = serviceContainer.get('apiService');
      if (!apiService) throw new Error('API service not available');
      
      const textPrompt = `Write a section for a document based on this request: "${params.request}"
      
Please provide:
1. A clear heading
2. Well-structured paragraphs
3. Professional tone
4. Markdown formatting (headers, lists, bold/italic where appropriate)`;
      
      const response = await apiService.makeRequest({
        endpoint: '/api/unified-route',
        method: 'POST',
        data: {
          action: 'chat',
          message: textPrompt,
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          max_tokens: 1000
        }
      });
      
      if (response.success && response.data?.text) {
        newContent = response.data.text;
      }
    }
    
    if (!newContent) {
      throw new Error('Failed to generate section content');
    }
    
    // Update document with new version
    const currentContent = documentElement.content?.content || '';
    const currentVersion = documentElement.currentVersion || 1;
    const newVersion = currentVersion + 1;
    
    let updatedContent = '';
    if (position === 'prepend') {
      updatedContent = `${newContent}\n\n${currentContent}`;
    } else if (position === 'replace') {
      updatedContent = newContent;
    } else { // append
      updatedContent = `${currentContent}\n\n${newContent}`;
    }
    
    // Create new version in revision history
    const newVersionData = {
      id: `v${newVersion}`,
      version: newVersion,
      content: newContent, // Just the new content for typewriter
      state: 'typing' as const,
      timestamp: Date.now(),
      request: params.request,
      metadata: {
        sectionType,
        position
      }
    };
    
    // Update element in store
    const existingVersions = documentElement.versions || [];
    canvasStore.updateCanvasElement(documentElement.id, {
      currentVersion: newVersion,
      versions: [...existingVersions, newVersionData],
      content: {
        ...documentElement.content,
        content: updatedContent,
        revisionNumber: newVersion
      }
    });
    
    console.log('✅ Section added, new version:', newVersion);
    
    return {
      success: true,
      documentId: documentElement.id,
      newVersion,
      content: newContent,
      message: `Section added successfully (Version ${newVersion})`
    };
    
  } catch (error: any) {
    console.error('❌ Failed to add section:', error);
    return {
      success: false,
      documentId: params.documentId || '',
      newVersion: 0,
      content: '',
      message: `Failed to add section: ${error.message}`
    };
  }
}

/**
 * Register the tool with CoreTools
 */
export function registerCanvasAddSectionTool() {
  // This would be called during service initialization
  console.log('🎯 Canvas Add Section Tool registered');
}









