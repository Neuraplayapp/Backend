/**
 * VISION ROUTE - Vision-Instructed LLM Integration
 * 
 * Handles vision API calls for multimodal AI capabilities.
 * Integrates with the existing NeuraPlay backend architecture.
 * 
 * FEATURES:
 * - Processes images using Llama4-Maverick-Vision
 * - Handles large documents (up to 150MB PDFs) using Llama4-Scout
 * - Supports tool calling for document creation, data extraction
 * - Handles file uploads and base64 data
 * - Provides structured vision analysis responses
 * - Includes error handling and fallbacks
 */

const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const { Buffer } = require('buffer'); // Explicit Buffer import for PDF processing
const router = express.Router();

// Dynamic upload limits based on user role
const getUploadLimits = (user) => {
  if (!user) {
    return { fileSize: 5 * 1024 * 1024, files: 2 }; // 5MB, 2 files for unauthenticated
  }
  
  const role = user.role || 'learner';
  const subscription = user.subscription || { tier: 'free' };
  
  // Admin users get unlimited-ish limits
  if (role === 'admin' || subscription.tier === 'unlimited') {
    return { 
      fileSize: 100 * 1024 * 1024, // 100MB limit for admins
      files: 20 // 20 files max for admins
    };
  }
  
  // Premium users get higher limits
  if (subscription.tier === 'premium') {
    return { 
      fileSize: 50 * 1024 * 1024, // 50MB limit for premium
      files: 10 // 10 files max for premium
    };
  }
  
  // Free/learner users get standard limits
  return { 
    fileSize: 10 * 1024 * 1024, // 10MB limit for free users
    files: 3 // 3 files max for free users
  };
};

// Configure multer for file uploads (memory storage for processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // Max possible limit (will be validated per-user)
    files: 20 // Max possible files (will be validated per-user)
  },
  fileFilter: (req, file, cb) => {
    // Accept images and documents
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'text/plain', 'text/markdown',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`), false);
    }
  }
});

// Middleware to validate files against user-specific limits
const validateUserLimits = (req, res, next) => {
  try {
    const user = req.user || req.body.user; // Assume user is attached by auth middleware
    const limits = getUploadLimits(user);
    
    // Check file count
    if (req.files && req.files.length > limits.files) {
      return res.status(400).json({
        success: false,
        error: `File limit exceeded. Maximum ${limits.files} files allowed for your account type.`,
        limits: limits
      });
    }
    
    // Check individual file sizes
    if (req.files) {
      for (const file of req.files) {
        if (file.size > limits.fileSize) {
          const maxSizeMB = Math.round(limits.fileSize / (1024 * 1024));
          return res.status(400).json({
            success: false,
            error: `File "${file.originalname}" exceeds size limit. Maximum ${maxSizeMB}MB allowed for your account type.`,
            limits: limits
          });
        }
      }
    }
    
    req.userLimits = limits;
    next();
  } catch (error) {
    console.error('❌ Error validating user limits:', error);
    next(); // Continue with default limits on error
  }
};

/**
 * GET /api/vision/limits
 * Get current user's file upload limits
 */
router.get('/limits', (req, res) => {
  try {
    const user = req.user || req.query.user ? JSON.parse(req.query.user) : null;
    const limits = getUploadLimits(user);
    
    res.json({
      success: true,
      limits: {
        maxFileSize: Math.round(limits.fileSize / (1024 * 1024)), // Convert to MB
        maxFiles: limits.files,
        role: user?.role || 'guest',
        tier: user?.subscription?.tier || 'free'
      }
    });
  } catch (error) {
    console.error('❌ Error getting user limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upload limits'
    });
  }
});

/**
 * POST /api/vision/analyze
 * Analyze images using Fireworks Llama4-Maverick
 */
router.post('/analyze', upload.array('files', 20), validateUserLimits, async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('👁️ Vision Route: Processing vision analysis request');
    
    const { prompt, context, enableToolCalls, modelKey } = req.body;
    const files = req.files || [];
    const images = req.body.images || []; // Base64 images from frontend
    
    // Validate input
    if (files.length === 0 && images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images provided for analysis'
      });
    }
    
    console.log('👁️ Vision Route: Processing', files.length, 'uploaded files and', images.length, 'base64 images');
    
    // Process uploaded files to base64
    const processedImages = [];
    
    // Convert uploaded files to base64
    for (const file of files) {
      if (file.mimetype.startsWith('image/')) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        processedImages.push(base64);
      }
    }
    
    // Add base64 images from frontend
    processedImages.push(...images);
    
    if (processedImages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid images found for analysis'
      });
    }
    
    // Call Fireworks Llama4-Maverick API with tool calling support
    const toolCallsEnabled = enableToolCalls === 'true';
    const visionResponse = await callFireworksVisionAPI(
      processedImages, 
      prompt, 
      context, 
      { 
        enableToolCalls: toolCallsEnabled,
        tools: toolCallsEnabled ? getVisionTools() : undefined,
        tool_choice: toolCallsEnabled ? 'auto' : undefined,
        modelKey: modelKey || 'visionAnalysis'
      }
    );
    
    if (!visionResponse.success) {
      throw new Error(visionResponse.error || 'Vision API failed');
    }
    
    // Parse and structure the response
    const analysisResult = parseVisionResponse(visionResponse.data);
    
    // Extract tool calls if present
    const toolCalls = visionResponse.data?.choices?.[0]?.message?.tool_calls || [];
    const rawResponse = visionResponse.data?.choices?.[0]?.message?.content || '';
    
    const response = {
      success: true,
      data: {
        analysis: analysisResult,
        toolCalls: toolCalls,
        rawResponse: rawResponse
      },
      processingTime: Date.now() - startTime,
      imagesProcessed: processedImages.length,
      model: 'llama-v4-maverick-vision'
    };
    
    console.log('✅ Vision Route: Analysis completed successfully');
    res.json(response);
    
  } catch (error) {
    console.error('❌ Vision Route: Analysis failed', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Vision analysis failed',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * POST /api/vision/process-documents
 * Process documents (PDFs, text files) with AI analysis using Vision Models
 * ROBUST ARCHITECTURE: Vision models handle PDFs, images, and documents natively
 */
router.post('/process-documents', upload.array('documents', 20), validateUserLimits, async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📄 Vision Route: Processing document analysis request');
    
    const files = req.files || [];
    const prompt = req.body.prompt || 'Analyze this document comprehensively';
    const context = req.body.context || '';
    const enableToolCalls = req.body.enableToolCalls === 'true';
    
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No documents provided for processing'
      });
    }
    
    let extractedText = '';
    let analysisResult = '';
    const toolCalls = [];
    const processedDocuments = [];
    
    // Import document parsing libraries
    // Architecture: Extract text → GPT-OSS-120B analyzes → Canvas integration
    let PDFParse, mammoth;
    try {
      PDFParse = require('pdf-parse');
      console.log('✅ pdf-parse loaded successfully');
    } catch (err) {
      console.error('❌ pdf-parse failed to load:', err.message);
      PDFParse = null;
    }
    
    try {
      mammoth = require('mammoth');
      console.log('✅ mammoth (DOCX parser) loaded successfully');
    } catch (err) {
      console.error('❌ mammoth failed to load:', err.message);
      mammoth = null;
    }
    
    // Process files: Extract text and prepare for vision model
    for (const file of files) {
      console.log(`📄 Processing file: ${file.originalname} (${file.mimetype}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      // Validate buffer exists
      if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
        console.error(`❌ Invalid buffer for file: ${file.originalname}`);
        extractedText += `[Error: Invalid buffer for ${file.originalname}]\n\n`;
        continue;
      }
      
      if (file.buffer.length === 0) {
        console.error(`❌ Empty buffer for file: ${file.originalname}`);
        extractedText += `[Error: Empty file ${file.originalname}]\n\n`;
        continue;
      }
      
      // Handle text files directly
      if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
        try {
          const textContent = file.buffer.toString('utf8');
          extractedText += `--- ${file.originalname} ---\n${textContent}\n\n`;
          console.log(`✅ Extracted ${textContent.length} characters from text file`);
        } catch (textError) {
          console.error('❌ Text file reading error:', textError);
          extractedText += `[Error reading ${file.originalname}: ${textError.message}]\n\n`;
        }
      } 
      // Extract text from PDFs using pdf-parse (class-based API v2.4.x)
      else if (file.mimetype === 'application/pdf') {
        if (!PDFParse) {
          const errorMsg = `PDF parsing unavailable - pdf-parse library not loaded`;
          console.error(`❌ ${errorMsg}`);
          extractedText += `[${errorMsg} for ${file.originalname}]\n\n`;
          continue;
        }
        
        try {
          console.log(`📄 Extracting text from PDF: ${file.originalname}`);
          
          // pdf-parse v2.4.x: PDFParse is the parsing function itself
          const pdfData = await PDFParse(file.buffer, {});
          
          const pdfText = pdfData.text || '';
          const numPages = pdfData.numpages || 0;
          
          console.log(`📊 PDF Parse Result:`, {
            hasText: !!(pdfText && pdfText.trim()),
            textLength: pdfText?.length || 0,
            numPages: numPages,
            infoKeys: pdfData.info ? Object.keys(pdfData.info) : [],
            textSample: pdfText?.substring(0, 500) || '[NO TEXT]' // Show first 500 chars
          });
          
          // CRITICAL DEBUG: Log the actual extracted text
          console.log('🔍 FULL EXTRACTED PDF TEXT:', pdfText);
          console.log('🔍 TEXT TYPE:', typeof pdfText);
          console.log('🔍 TEXT TRUTHY:', !!pdfText);
          console.log('🔍 TEXT TRIMMED LENGTH:', pdfText?.trim()?.length || 0);
          
          if (pdfText && pdfText.trim().length > 0) {
            extractedText += `--- ${file.originalname} (${numPages} pages) ---\n${pdfText}\n\n`;
            console.log(`✅ Extracted ${pdfText.length} characters from PDF (sample: ${pdfText.substring(0, 200)})`);
          } else {
            // Image-based/scanned PDF - provide helpful guidance
            const warningMsg = `This PDF appears to be image-based (scanned document) with no extractable text layer. The document has ${numPages} page(s) but contains no readable text.`;
            console.warn(`⚠️ ${warningMsg}`);
            
            // Instead of just a warning, provide a helpful message that the LLM can use
            extractedText += `FILE: ${file.originalname}\nSTATUS: Image-based PDF (${numPages} pages)\nNOTE: This is a scanned document without a text layer. To read this document, you would need OCR (Optical Character Recognition) software. The file was uploaded successfully but cannot be read without OCR processing.\n\n`;
          }
        } catch (pdfError) {
          console.error(`❌ PDF extraction error for ${file.originalname}:`, pdfError.message);
          extractedText += `[PDF extraction error for ${file.originalname}: ${pdfError.message}]\n\n`;
        }
      }
      // Extract text from DOCX files using mammoth
      else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.originalname.endsWith('.docx')) {
        if (!mammoth) {
          const errorMsg = `DOCX parsing unavailable - mammoth library not loaded`;
          console.error(`❌ ${errorMsg}`);
          extractedText += `[${errorMsg} for ${file.originalname}]\n\n`;
          continue;
        }
        
        try {
          console.log(`📄 Extracting text from DOCX: ${file.originalname}`);
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          const docxText = result.value || '';
          
          if (docxText && docxText.trim().length > 0) {
            extractedText += `--- ${file.originalname} ---\n${docxText}\n\n`;
            console.log(`✅ Extracted ${docxText.length} characters from DOCX`);
          } else {
            console.warn(`⚠️ Empty DOCX document: ${file.originalname}`);
            extractedText += `[Empty DOCX document: ${file.originalname}]\n\n`;
          }
        } catch (docxError) {
          console.error(`❌ DOCX extraction error for ${file.originalname}:`, docxError.message);
          extractedText += `[DOCX extraction error for ${file.originalname}: ${docxError.message}]\n\n`;
        }
      }
      // Handle DOC (legacy Word) - convert buffer to text (limited support)
      else if (file.mimetype === 'application/msword' || file.originalname.endsWith('.doc')) {
        console.warn(`⚠️ Legacy DOC format has limited support: ${file.originalname}`);
        extractedText += `[Legacy .DOC format - please convert to .DOCX or PDF for better text extraction: ${file.originalname}]\n\n`;
      }
      // Handle other file types
      else {
        try {
          const textContent = file.buffer.toString('utf8');
          extractedText += `--- ${file.originalname} ---\n${textContent}\n\n`;
          console.log(`✅ Extracted ${textContent.length} characters as text`);
        } catch {
          console.warn(`⚠️ Could not process ${file.originalname} as text (binary file)`);
          extractedText += `[Binary file - not readable: ${file.originalname}]\n\n`;
        }
      }
    }
    
    // Log extraction summary
    console.log('📊 Text extraction summary:', {
      filesProcessed: files.length,
      extractedTextLength: extractedText.length,
      hasExtractedText: extractedText.trim().length > 0,
      firstFile: files[0]?.originalname,
      extractedTextPreview: extractedText.substring(0, 500)
    });
    
    // ANALYZE: Use extracted content for analysis
    if (extractedText.trim()) {
      try {
        console.log('🧠 Sending extracted text to GPT-OSS-120B for intelligent analysis...');
        
        // Truncate very long documents to fit in context window (~30K chars max for prompt)
        const MAX_CONTEXT_CHARS = 25000;
        let textForAnalysis = extractedText;
        let wasTruncated = false;
        
        if (extractedText.length > MAX_CONTEXT_CHARS) {
          // Smart truncation: Take beginning and end for context
          const halfLimit = Math.floor(MAX_CONTEXT_CHARS / 2);
          textForAnalysis = extractedText.substring(0, halfLimit) + 
            '\n\n[... middle section truncated for processing ...]\n\n' + 
            extractedText.substring(extractedText.length - halfLimit);
          wasTruncated = true;
          console.log(`📝 Document truncated from ${extractedText.length} to ${textForAnalysis.length} chars`);
        }
        
        // Build a DIRECT prompt that gives LLM the actual document text
        const userMessage = `${textForAnalysis}

---

The above is the complete text extracted from the document: "${files[0].originalname}"

User's question: ${prompt}

Please respond to the user's question based on the document text shown above.`;
        
        console.log('📋 Prompt preview:', userMessage.substring(0, 400));
        
        // Call GPT-OSS-120B for detailed analysis
        const FIREWORKS_API_KEY = process.env.Neuraplay || process.env.FIREWORKS_API_KEY || process.env.VITE_FIREWORKS_API_KEY;
        
        if (!FIREWORKS_API_KEY) {
          console.error('❌ No Fireworks API key found in environment');
          throw new Error('Fireworks API key not configured');
        }
        
        console.log('🔑 Using Fireworks API key:', FIREWORKS_API_KEY.substring(0, 10) + '...');
        
        const fireworksResponse = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIREWORKS_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'accounts/fireworks/models/gpt-oss-120b', // GPT-OSS-120B for best quality analysis
            messages: [
              {
                role: 'system',
                content: 'You are a helpful AI assistant. When given document text and a question, answer directly based on what you can see in the text. The text has already been extracted from a PDF - you can see it and read it. If asked "can you see this document", confirm YES and briefly summarize what it contains.'
              },
              {
                role: 'user',
                content: userMessage
              }
            ],
            temperature: 0.3,
            max_tokens: 4000,
            ...(enableToolCalls ? {
              tools: getVisionTools(),
              tool_choice: 'auto'
            } : {})
          })
        });
        
        console.log('📤 GPT-OSS-120B API request sent with', textForAnalysis.length, 'characters');
        
        if (!fireworksResponse.ok) {
          const errorText = await fireworksResponse.text();
          console.error('❌ Fireworks API error:', fireworksResponse.status, errorText);
          throw new Error(`Fireworks API failed: ${fireworksResponse.status} - ${errorText}`);
        }
        
        const llmResult = await fireworksResponse.json();
        
        console.log('📥 GPT-OSS-120B response received:', {
          hasChoices: !!llmResult.choices,
          choicesLength: llmResult.choices?.length || 0,
          firstChoiceLength: llmResult.choices?.[0]?.message?.content?.length || 0,
          extractedTextLength: extractedText.length,
          responseSample: llmResult.choices?.[0]?.message?.content?.substring(0, 200)
        });
        
        if (llmResult.choices && llmResult.choices[0] && llmResult.choices[0].message.content) {
          analysisResult = llmResult.choices[0].message.content;
          
          if (llmResult.choices[0].message.tool_calls) {
            toolCalls.push(...llmResult.choices[0].message.tool_calls);
          }
          
          console.log('✅ GPT-OSS-120B analysis completed successfully');
          console.log('📝 Analysis length:', analysisResult.length);
          console.log('📝 Analysis preview:', analysisResult.substring(0, 300));
        } else {
          console.warn('⚠️ Empty LLM response, using extracted text directly');
          // Return the extracted text with basic formatting
          analysisResult = `## Document Content\n\n${extractedText.substring(0, 2000)}${extractedText.length > 2000 ? '...\n\n*Document continues...*' : ''}`;
        }
      } catch (llmError) {
        console.error('❌ LLM analysis error:', llmError.message);
        console.error('❌ Error stack:', llmError.stack);
        // FALLBACK: Return extracted text directly so user can see the content
        analysisResult = `## Document Extracted Successfully\n\nThe text was extracted from your PDF. Here's the content:\n\n${extractedText.substring(0, 2000)}${extractedText.length > 2000 ? '...\n\n*Document continues. Total length: ' + extractedText.length + ' characters*' : ''}`;
      }
    } else {
      // No extracted text - likely image-based PDF
      console.warn('⚠️ No text extracted from documents');
      analysisResult = `## Document Upload Status\n\nI received your PDF file but couldn't extract text from it. This usually means:\n\n1. **Scanned/Image-based PDF**: The PDF contains images of pages rather than actual text\n2. **Protected PDF**: The file may have security restrictions\n3. **Empty file**: The document may not contain readable content\n\n### What you can do:\n- Try converting the PDF to a text-based format\n- Use OCR (Optical Character Recognition) software first\n- Take a screenshot and upload it as an image instead\n\nFile received: ${files.map(f => f.originalname).join(', ')}`;
      extractedText = analysisResult;
    }
    
    const response = {
      success: true,
      data: {
        analysis: analysisResult,
        extractedText: extractedText,
        toolCalls: toolCalls,
        documentsProcessed: files.length
      },
      processingTime: Date.now() - startTime
    };
    
    console.log('✅ Vision Route: Document processing and analysis completed', {
      filesProcessed: files.length,
      extractedTextLength: extractedText.length,
      analysisResultLength: analysisResult.length,
      hasExtractedText: !!extractedText && extractedText.trim().length > 0,
      hasAnalysis: !!analysisResult && analysisResult.trim().length > 0,
      toolCallsCount: toolCalls.length
    });
    
    console.log('📝 Final extracted text preview:', extractedText.substring(0, 300));
    console.log('📝 Final analysis preview:', analysisResult.substring(0, 300));
    
    // CRITICAL: Ensure we ALWAYS have content in the response
    if (!analysisResult && !extractedText) {
      console.error('❌ CRITICAL: Both analysisResult and extractedText are empty!');
      response.data.analysis = 'Error: No content could be processed from the documents';
      response.data.extractedText = 'Error: No content could be processed from the documents';
    }
    
    console.log('📤 Sending response with data:', {
      hasAnalysis: !!response.data.analysis,
      hasExtractedText: !!response.data.extractedText,
      analysisLength: response.data.analysis?.length || 0,
      extractedTextLength: response.data.extractedText?.length || 0
    });
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Vision Route: Document processing failed', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Document processing failed',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * Get vision tools for document processing
 */
function getVisionTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'create_document',
        description: 'Create a formatted document or summary',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Document title' },
            content: { type: 'string', description: 'Document content' },
            format: { type: 'string', enum: ['markdown', 'text', 'html'] }
          },
          required: ['title', 'content']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'extract_data',
        description: 'Extract structured data from document',
        parameters: {
          type: 'object',
          properties: {
            dataType: { type: 'string', description: 'Type of data to extract' },
            fields: { type: 'array', items: { type: 'string' } }
          },
          required: ['dataType']
        }
      }
    }
  ];
}

/**
 * Call Fireworks Vision API (Maverick or Scout)
 * Supports tool calling for document creation, data extraction, etc.
 */
async function callFireworksVisionAPI(images, prompt = '', context = '', options = {}) {
  try {
    const apiKey = process.env.FIREWORKS_API_KEY || process.env.VITE_API_KEY || process.env.Neuraplay || process.env.VITE_FIREWORKS_API_KEY;
    
    if (!apiKey || apiKey === 'dummy-key') {
      console.error('❌ Fireworks API key not configured. Available env vars:', Object.keys(process.env).filter(k => k.includes('API') || k.includes('FIRE')));
      throw new Error('Fireworks API key not configured');
    }
    
    console.log('✅ Fireworks API key found');
    
    // Determine which model to use (Scout for large documents, Maverick for images)
    const useScout = options.useScout || options.isLargeDocument;
    const model = useScout 
      ? 'accounts/fireworks/models/llama-v3p3-70b-instruct' // Llama 3.3 for document analysis
      : process.env.VISION_MODEL || 'accounts/fireworks/models/llama-v3p2-90b-vision-instruct'; // Llama 3.2 Vision
    
    const modelName = useScout ? 'Llama 3.3 Scout (Document Expert)' : 'Llama 3.2 Vision';
    console.log(`🔥 Calling Fireworks Vision API with ${modelName}`, {
      imageCount: images.length,
      toolCalling: !!options.enableToolCalls,
      model: model
    });
    
    // Build the vision prompt
    const visionPrompt = prompt || `Analyze this visual content in detail. Provide:
1. A comprehensive description of what you see
2. List of objects, people, and items visible
3. Any text present in the content (OCR)
4. Scene description and context
5. Dominant colors and composition
6. Any emotions or mood if people are present
7. Extract any structured data (tables, charts, etc.)

Format your response clearly and comprehensively.`;
    
    // Prepare the message content with images
    const messageContent = [
      { type: 'text', text: context ? `${visionPrompt}\n\nContext: ${context}` : visionPrompt }
    ];
    
    // Add images to the message
    images.forEach(imageData => {
      messageContent.push({
        type: 'image_url',
        image_url: { url: imageData }
      });
    });
    
    const requestBody = {
      model,
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || (useScout ? 4000 : 1000), // Scout gets more tokens for documents
      top_p: options.topP || 1.0
    };
    
    // Add tool calling support if enabled
    if (options.enableToolCalls && options.tools) {
      requestBody.tools = options.tools;
      requestBody.tool_choice = options.tool_choice || 'auto';
    }
    
    // FIXED: Use absolute URL for backend fetch calls with proper Render fallback
    const baseUrl = process.env.RENDER_EXTERNAL_HOSTNAME 
      ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` 
      : (process.env.NODE_ENV === 'production' 
        ? 'https://neuraplay-ai-platform.onrender.com'
        : 'http://localhost:3001');
    
    const response = await fetch(`${baseUrl}/api/unified-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service: 'fireworks',
        endpoint: 'vision',
        data: requestBody
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fireworks API failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Fireworks Vision API (${modelName}) responded successfully`);
    
    return {
      success: true,
      data: data,
      model: modelName
    };
    
  } catch (error) {
    console.error('❌ Fireworks Vision API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse the vision response into structured format
 */
function parseVisionResponse(apiResponse) {
  try {
    const content = apiResponse.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('No content in vision response');
    }
    
    // Extract structured information from the response
    const analysis = {
      description: extractSection(content, 'description') || content.substring(0, 300),
      objects: extractList(content, 'objects', /objects?[^:]*:([^\.]+)/i),
      text: extractSection(content, 'text') || '',
      scene: extractSection(content, 'scene') || extractSection(content, 'setting') || 'General scene',
      emotions: extractSection(content, 'emotions') || extractSection(content, 'mood'),
      colors: extractList(content, 'colors', /colors?[^:]*:([^\.]+)/i),
      composition: extractSection(content, 'composition') || 'Standard composition',
      confidence: 0.8, // Default confidence for successful API calls
      fullResponse: content
    };
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error parsing vision response:', error);
    
    // Return fallback analysis
    return {
      description: 'Vision analysis completed but parsing failed',
      objects: [],
      text: '',
      scene: 'Unknown scene',
      emotions: '',
      colors: [],
      composition: 'Unable to determine composition',
      confidence: 0.3,
      fullResponse: apiResponse.choices?.[0]?.message?.content || 'No response content'
    };
  }
}

/**
 * Extract a specific section from the vision response
 */
function extractSection(text, sectionName) {
  const patterns = [
    new RegExp(`${sectionName}[:\\s]*([^\\n]*(?:\\n(?!\\w+:)[^\\n]*)*)`, 'i'),
    new RegExp(`\\b${sectionName}\\b[^:]*:([^\\n]+)`, 'i'),
    new RegExp(`${sectionName}[\\s-]+([^\\n]+)`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return '';
}

/**
 * Extract a list from the vision response
 */
function extractList(text, sectionName, pattern) {
  const sectionText = extractSection(text, sectionName);
  
  if (!sectionText) {
    // Try the provided pattern if available
    if (pattern) {
      const match = text.match(pattern);
      if (match) {
        return match[1]
          .split(/[,;]/)
          .map(item => item.trim())
          .filter(item => item.length > 0);
      }
    }
    return [];
  }
  
  return sectionText
    .split(/[,;]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Vision Route',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: ['image-analysis', 'document-processing', 'fireworks-integration']
  });
});

module.exports = router;