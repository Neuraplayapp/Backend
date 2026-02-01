#!/usr/bin/env node

/**
 * IMAGE & VISION SYSTEMS TEST SUITE (Updated for Frontend Architecture)
 * 
 * Tests image generation and vision LLM functionality that should be separate from
 * frontend canvas activation. Validates that:
 * - Image requests generate imageUrl results (not canvas activation)
 * - Vision requests process images correctly  
 * - Chart/document/code requests trigger frontend canvas (not image generation)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
  apiUrl: process.env.TEST_API_URL || 'http://localhost:3001/api',
  testUserId: process.env.TEST_USER_ID || 'test_vision_user_001',
  timeout: 45000, // Longer timeout for image generation
  retries: 3,
  testImagePath: path.join(__dirname, 'test-assets', 'test-chart.png'),
  testDocumentPath: path.join(__dirname, 'test-assets', 'test-document.pdf')
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

console.log('🖼️ COMPREHENSIVE IMAGE & VISION SYSTEMS TEST SUITE');
console.log('================================================');
console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
console.log(`Test User: ${TEST_CONFIG.testUserId}`);
console.log('');

// Utility functions
function logTest(testName, status, details = '') {
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (details) console.log(`   Details: ${details}`);
  }
  testResults.details.push({ testName, status, details, timestamp: new Date() });
}

// Import fetch using the same pattern as the API routes
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function makeApiRequest(endpoint, method = 'POST', data = {}, timeout = TEST_CONFIG.timeout) {
  try {
    const response = await fetch(`${TEST_CONFIG.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
      timeout
    });
    
    const result = await response.json();
    return { success: response.ok, data: result, status: response.status };
  } catch (error) {
    console.warn(`API request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function createTestImage() {
  // Create a simple test image for vision testing
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  return testImageBase64;
}

// Test Suite 1: Image Generation System
async function testImageGeneration() {
  console.log('\n🎨 Test Suite 1: Image Generation System');
  console.log('======================================');

  const imagePrompts = [
    {
      name: 'Simple Photo Request',
      prompt: 'Create an image of a sunset over mountains',
      expectedType: 'photo'
    },
    {
      name: 'Artistic Request',
      prompt: 'Generate an abstract artwork with vibrant colors',
      expectedType: 'artwork'
    },
    {
      name: 'Logo Design Request',
      prompt: 'Create a modern logo for a tech startup',
      expectedType: 'logo'
    },
    {
      name: 'Illustration Request',
      prompt: 'Draw an illustration of a futuristic city',
      expectedType: 'illustration'
    }
  ];

  for (const test of imagePrompts) {
    const startTime = Date.now();
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `img_test_${Date.now()}`,
      mode: 'auto',
      task_type: 'image_generation_test'
    }, 60000); // Extended timeout for image generation

    if (!response.success) {
      logTest(`Image Generation: ${test.name}`, 'FAIL', `API request failed: ${response.error}`);
      continue;
    }

    // Check for image generation indicators
    const hasImageResult = response.data?.toolResults?.some(result => 
      result.toolName === 'generate-image' || 
      result.imageUrl || 
      result.generatedImage ||
      result.data?.imageUrl ||
      result.data?.image_url
    );

    const generationTime = Date.now() - startTime;
    const reasonableTime = generationTime < 30000; // 30 seconds

    if (hasImageResult && reasonableTime) {
      logTest(`Image Generation: ${test.name}`, 'PASS', `Generated in ${generationTime}ms`);
    } else if (hasImageResult && !reasonableTime) {
      logTest(`Image Generation: ${test.name}`, 'FAIL', `Too slow: ${generationTime}ms`);
    } else {
      logTest(`Image Generation: ${test.name}`, 'FAIL', 'No image generated');
    }
  }
}

// Test Suite 2: Image vs Canvas Separation Logic
async function testImageCanvasSeparation() {
  console.log('\n🔄 Test Suite 2: Image vs Canvas Separation Logic');
  console.log('================================================');

  const separationTests = [
    // These should generate IMAGES (not canvas)
    {
      name: 'Clear Image Request 1',
      prompt: 'Create a picture of a beautiful landscape',
      expected: 'image',
      type: 'image_request'
    },
    {
      name: 'Clear Image Request 2',
      prompt: 'Generate a photo of a cute dog',
      expected: 'image',
      type: 'image_request'
    },
    {
      name: 'Clear Image Request 3',
      prompt: 'Make an artwork showing geometric patterns',
      expected: 'image',
      type: 'image_request'
    },
    
    // These should activate CANVAS (not image generation)
    {
      name: 'Data Visualization Request',
      prompt: 'Create a chart showing sales data over time',
      expected: 'canvas',
      type: 'canvas_request'
    },
    {
      name: 'Code Generation Request',
      prompt: 'Generate Python code for data processing',
      expected: 'canvas',
      type: 'canvas_request'
    },
    {
      name: 'Document Creation Request',
      prompt: 'Create a technical document about machine learning',
      expected: 'canvas',
      type: 'canvas_request'
    },
    
    // Edge cases - ambiguous requests
    {
      name: 'Ambiguous Visual Request',
      prompt: 'Create a visual representation of quarterly growth',
      expected: 'canvas', // Should prefer data visualization over image
      type: 'edge_case'
    },
    {
      name: 'Technical Diagram Request',
      prompt: 'Make a diagram showing system architecture',
      expected: 'canvas', // Technical diagrams should use canvas
      type: 'edge_case'
    }
  ];

  for (const test of separationTests) {
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `sep_test_${Date.now()}`,
      mode: 'auto',
      task_type: 'separation_logic_test'
    });

    if (!response.success) {
      logTest(`Separation Logic: ${test.name}`, 'FAIL', `API request failed: ${response.error}`);
      continue;
    }

    // Determine what the system actually did
    const hasImageResult = response.data?.toolResults?.some(result => 
      result.toolName === 'generate-image' || 
      result.imageUrl || 
      result.generatedImage
    );

    const hasCanvasResult = response.data?.toolResults?.some(result => 
      result.chartData || result.documentData || result.code || 
      result.canvasActivation || result.toolName?.includes('canvas')
    );

    let actualResult = 'chat';
    if (hasImageResult) actualResult = 'image';
    else if (hasCanvasResult) actualResult = 'canvas';

    const correct = actualResult === test.expected;
    logTest(
      `Separation Logic: ${test.name}`,
      correct ? 'PASS' : 'FAIL',
      correct ? `Correctly routed to ${actualResult}` : `Expected ${test.expected}, got ${actualResult}`
    );
  }
}

// Test Suite 3: Vision LLM Functionality
async function testVisionLLM() {
  console.log('\n👁️ Test Suite 3: Vision LLM Functionality');
  console.log('=========================================');

  // Test vision analysis with synthetic test data
  const visionTests = [
    {
      name: 'Text Extraction Test',
      prompt: 'What do you see in this image?',
      imageData: await createTestImage(),
      expectedFeatures: ['analysis', 'description']
    },
    {
      name: 'Chart Analysis Test',
      prompt: 'Analyze the data shown in this chart',
      imageData: await createTestImage(),
      expectedFeatures: ['data', 'trends', 'analysis']
    },
    {
      name: 'Document Reading Test',
      prompt: 'Summarize the content of this document',
      imageData: await createTestImage(),
      expectedFeatures: ['summary', 'content', 'text']
    }
  ];

  for (const test of visionTests) {
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `vision_test_${Date.now()}`,
      mode: 'vision',
      attachments: {
        images: [test.imageData],
        metadata: { totalFiles: 1 }
      }
    }, 45000); // Extended timeout for vision processing

    if (!response.success) {
      logTest(`Vision LLM: ${test.name}`, 'FAIL', `API request failed: ${response.error}`);
      continue;
    }

    // Check if vision processing occurred
    const hasVisionResponse = response.data?.response && 
                             response.data.response.length > 50; // Meaningful response length

    const hasVisionIndicators = response.data?.response && 
                               test.expectedFeatures.some(feature => 
                                 response.data.response.toLowerCase().includes(feature)
                               );

    if (hasVisionResponse && hasVisionIndicators) {
      logTest(`Vision LLM: ${test.name}`, 'PASS', 'Vision analysis completed successfully');
    } else if (hasVisionResponse) {
      logTest(`Vision LLM: ${test.name}`, 'FAIL', 'Vision response lacks expected features');
    } else {
      logTest(`Vision LLM: ${test.name}`, 'FAIL', 'No meaningful vision response');
    }
  }
}

// Test Suite 4: Image Upload and Processing
async function testImageUpload() {
  console.log('\n📤 Test Suite 4: Image Upload and Processing');
  console.log('==========================================');

  const uploadTests = [
    {
      name: 'Single Image Upload',
      imageCount: 1,
      expectedProcessing: true
    },
    {
      name: 'Multiple Image Upload',
      imageCount: 3,
      expectedProcessing: true
    },
    {
      name: 'Large Image Handling',
      imageCount: 1,
      expectedProcessing: true,
      large: true
    }
  ];

  for (const test of uploadTests) {
    const images = [];
    for (let i = 0; i < test.imageCount; i++) {
      images.push(await createTestImage());
    }

    const response = await makeApiRequest('', 'POST', {
      message: 'Analyze these uploaded images',
      userId: TEST_CONFIG.testUserId,
      sessionId: `upload_test_${Date.now()}`,
      mode: 'vision',
      attachments: {
        images: images,
        metadata: { totalFiles: images.length }
      }
    });

    if (!response.success) {
      logTest(`Image Upload: ${test.name}`, 'FAIL', `Upload processing failed: ${response.error}`);
      continue;
    }

    const hasProcessedResponse = response.data?.response && response.data.response.length > 20;
    logTest(
      `Image Upload: ${test.name}`,
      hasProcessedResponse ? 'PASS' : 'FAIL',
      hasProcessedResponse ? `Processed ${test.imageCount} images successfully` : 'Upload processing failed'
    );
  }
}

// Test Suite 5: Intent Analysis Accuracy
async function testIntentAnalysis() {
  console.log('\n🧠 Test Suite 5: Intent Analysis Accuracy');
  console.log('========================================');

  const intentTests = [
    // Image generation intents
    {
      name: 'Photo Generation Intent',
      prompt: 'Create a realistic photo of a mountain landscape',
      expectedIntent: 'image_generation',
      expectedConfidence: 0.9
    },
    {
      name: 'Artwork Generation Intent',
      prompt: 'Generate abstract digital art with bright colors',
      expectedIntent: 'image_generation',
      expectedConfidence: 0.9
    },
    
    // Canvas creation intents
    {
      name: 'Data Visualization Intent',
      prompt: 'Create a bar chart showing monthly revenue',
      expectedIntent: 'canvas_creation',
      expectedConfidence: 0.9
    },
    {
      name: 'Document Creation Intent',
      prompt: 'Write a comprehensive report on climate change',
      expectedIntent: 'canvas_creation',
      expectedConfidence: 0.8
    },
    
    // Regular chat intents
    {
      name: 'Informational Intent',
      prompt: 'What are the benefits of renewable energy?',
      expectedIntent: 'conversational',
      expectedConfidence: 0.8
    },
    {
      name: 'Technical Support Intent',
      prompt: 'How do I fix a connection timeout error?',
      expectedIntent: 'conversational',
      expectedConfidence: 0.7
    }
  ];

  for (const test of intentTests) {
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `intent_test_${Date.now()}`,
      mode: 'auto',
      includeAnalysis: true // Request detailed analysis
    });

    if (!response.success) {
      logTest(`Intent Analysis: ${test.name}`, 'FAIL', `Analysis request failed: ${response.error}`);
      continue;
    }

    // Extract intent analysis results
    const hasImageResult = response.data?.toolResults?.some(result => 
      result.toolName === 'generate-image' || result.imageUrl
    );
    const hasCanvasResult = response.data?.toolResults?.some(result => 
      result.chartData || result.documentData || result.code
    );
    const isChatResponse = !hasImageResult && !hasCanvasResult;

    let detectedIntent = 'conversational';
    if (hasImageResult) detectedIntent = 'image_generation';
    else if (hasCanvasResult) detectedIntent = 'canvas_creation';

    const intentCorrect = detectedIntent === test.expectedIntent;
    logTest(
      `Intent Analysis: ${test.name}`,
      intentCorrect ? 'PASS' : 'FAIL',
      intentCorrect ? `Correctly identified as ${detectedIntent}` : `Expected ${test.expectedIntent}, got ${detectedIntent}`
    );
  }
}

// Test Suite 6: Error Recovery and Edge Cases
async function testErrorRecovery() {
  console.log('\n⚠️ Test Suite 6: Error Recovery and Edge Cases');
  console.log('===============================================');

  const errorTests = [
    {
      name: 'Invalid Image Format',
      prompt: 'Analyze this image',
      attachments: {
        images: ['invalid_base64_data'],
        metadata: { totalFiles: 1 }
      },
      expectedBehavior: 'graceful_error'
    },
    {
      name: 'Oversized Image Request',
      prompt: 'Create a 10000x10000 pixel image',
      expectedBehavior: 'constraint_handling'
    },
    {
      name: 'Impossible Image Request',
      prompt: 'Generate an image of the sound of silence',
      expectedBehavior: 'creative_interpretation_or_clarification'
    },
    {
      name: 'Conflicting Request',
      prompt: 'Create an image and also make a chart with the same data',
      expectedBehavior: 'multi_tool_or_clarification'
    }
  ];

  for (const test of errorTests) {
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `error_test_${Date.now()}`,
      mode: 'auto',
      attachments: test.attachments
    });

    // For error tests, we primarily check that the system doesn't crash
    const systemStable = response.status !== 500;
    const hasResponse = response.data && (response.data.response || response.data.error);
    
    logTest(
      `Error Recovery: ${test.name}`,
      systemStable && hasResponse ? 'PASS' : 'FAIL',
      systemStable ? 'System handled error gracefully' : 'System instability detected'
    );
  }
}

// Test Suite 7: Performance and Quality Metrics
async function testPerformanceQuality() {
  console.log('\n⚡ Test Suite 7: Performance and Quality Metrics');
  console.log('===============================================');

  // Image generation performance test
  const imageStartTime = Date.now();
  const imageResponse = await makeApiRequest('', 'POST', {
    message: 'Create a simple landscape image',
    userId: TEST_CONFIG.testUserId,
    sessionId: `perf_img_${Date.now()}`,
    mode: 'auto'
  }, 60000);
  const imageGenTime = Date.now() - imageStartTime;

  const imageTimeTarget = 30000; // 30 seconds
  logTest(
    'Performance: Image Generation Speed',
    imageGenTime < imageTimeTarget ? 'PASS' : 'FAIL',
    `Generation time: ${imageGenTime}ms (target: <${imageTimeTarget}ms)`
  );

  // Vision processing performance test
  const visionStartTime = Date.now();
  const visionResponse = await makeApiRequest('', 'POST', {
    message: 'What do you see in this image?',
    userId: TEST_CONFIG.testUserId,
    sessionId: `perf_vision_${Date.now()}`,
    mode: 'vision',
    attachments: {
      images: [await createTestImage()],
      metadata: { totalFiles: 1 }
    }
  });
  const visionTime = Date.now() - visionStartTime;

  const visionTimeTarget = 15000; // 15 seconds
  logTest(
    'Performance: Vision Processing Speed',
    visionTime < visionTimeTarget ? 'PASS' : 'FAIL',
    `Processing time: ${visionTime}ms (target: <${visionTimeTarget}ms)`
  );

  // Intent analysis accuracy test
  const intentAccuracyTests = [
    { prompt: 'Create an image of a cat', expected: 'image' },
    { prompt: 'Make a bar chart', expected: 'canvas' },
    { prompt: 'What is AI?', expected: 'chat' }
  ];

  let correctIntents = 0;
  for (const test of intentAccuracyTests) {
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `accuracy_${Date.now()}`,
      mode: 'auto'
    });

    if (response.success) {
      const hasImage = response.data?.toolResults?.some(r => r.imageUrl || r.toolName === 'generate-image');
      const hasCanvas = response.data?.toolResults?.some(r => r.chartData || r.documentData || r.code);
      
      let actual = 'chat';
      if (hasImage) actual = 'image';
      else if (hasCanvas) actual = 'canvas';
      
      if (actual === test.expected) correctIntents++;
    }
  }

  const accuracyRate = (correctIntents / intentAccuracyTests.length) * 100;
  const accuracyTarget = 85; // 85%
  logTest(
    'Quality: Intent Analysis Accuracy',
    accuracyRate >= accuracyTarget ? 'PASS' : 'FAIL',
    `Accuracy: ${accuracyRate.toFixed(1)}% (target: ≥${accuracyTarget}%)`
  );
}

// Main test execution
async function runAllTests() {
  try {
    console.log('🚀 Starting comprehensive image & vision systems test suite...\n');

    await testImageGeneration();
    await testImageCanvasSeparation();
    await testVisionLLM();
    await testImageUpload();
    await testIntentAnalysis();
    await testErrorRecovery();
    await testPerformanceQuality();

    // Generate test report
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults.details
        .filter(test => test.status === 'FAIL')
        .forEach(test => {
          console.log(`   • ${test.testName}: ${test.details}`);
        });
    }

    // Save detailed results
    const reportPath = path.join(__dirname, `image_vision_test_results_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: (testResults.passed / testResults.total) * 100
      },
      details: testResults.details,
      config: TEST_CONFIG,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log(`\n📄 Detailed results saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Test suite execution failed:', error);
    process.exit(1);
  }
}

// Execute if running directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testImageGeneration,
  testImageCanvasSeparation,
  testVisionLLM,
  TEST_CONFIG,
  testResults
};

/**
 * COMPREHENSIVE IMAGE & VISION SYSTEMS TEST SUITE
 * 
 * This script tests image generation, vision LLM functionality, and
 * proper separation between image and canvas systems.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
  apiUrl: process.env.TEST_API_URL || 'http://localhost:3001/api',
  testUserId: process.env.TEST_USER_ID || 'test_vision_user_001',
  timeout: 45000, // Longer timeout for image generation
  retries: 3,
  testImagePath: path.join(__dirname, 'test-assets', 'test-chart.png'),
  testDocumentPath: path.join(__dirname, 'test-assets', 'test-document.pdf')
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

console.log('🖼️ COMPREHENSIVE IMAGE & VISION SYSTEMS TEST SUITE');
console.log('================================================');
console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
console.log(`Test User: ${TEST_CONFIG.testUserId}`);
console.log('');

// Utility functions
function logTest(testName, status, details = '') {
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (details) console.log(`   Details: ${details}`);
  }
  testResults.details.push({ testName, status, details, timestamp: new Date() });
}

// Import fetch using the same pattern as the API routes
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function makeApiRequest(endpoint, method = 'POST', data = {}, timeout = TEST_CONFIG.timeout) {
  try {
    const response = await fetch(`${TEST_CONFIG.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
      timeout
    });
    
    const result = await response.json();
    return { success: response.ok, data: result, status: response.status };
  } catch (error) {
    console.warn(`API request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function createTestImage() {
  // Create a simple test image for vision testing
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  return testImageBase64;
}

// Test Suite 1: Image Generation System
async function testImageGeneration() {
  console.log('\n🎨 Test Suite 1: Image Generation System');
  console.log('======================================');

  const imagePrompts = [
    {
      name: 'Simple Photo Request',
      prompt: 'Create an image of a sunset over mountains',
      expectedType: 'photo'
    },
    {
      name: 'Artistic Request',
      prompt: 'Generate an abstract artwork with vibrant colors',
      expectedType: 'artwork'
    },
    {
      name: 'Logo Design Request',
      prompt: 'Create a modern logo for a tech startup',
      expectedType: 'logo'
    },
    {
      name: 'Illustration Request',
      prompt: 'Draw an illustration of a futuristic city',
      expectedType: 'illustration'
    }
  ];

  for (const test of imagePrompts) {
    const startTime = Date.now();
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `img_test_${Date.now()}`,
      mode: 'auto',
      task_type: 'image_generation_test'
    }, 60000); // Extended timeout for image generation

    if (!response.success) {
      logTest(`Image Generation: ${test.name}`, 'FAIL', `API request failed: ${response.error}`);
      continue;
    }

    // Check for image generation indicators
    const hasImageResult = response.data?.toolResults?.some(result => 
      result.toolName === 'generate-image' || 
      result.imageUrl || 
      result.generatedImage ||
      result.data?.imageUrl ||
      result.data?.image_url
    );

    const generationTime = Date.now() - startTime;
    const reasonableTime = generationTime < 30000; // 30 seconds

    if (hasImageResult && reasonableTime) {
      logTest(`Image Generation: ${test.name}`, 'PASS', `Generated in ${generationTime}ms`);
    } else if (hasImageResult && !reasonableTime) {
      logTest(`Image Generation: ${test.name}`, 'FAIL', `Too slow: ${generationTime}ms`);
    } else {
      logTest(`Image Generation: ${test.name}`, 'FAIL', 'No image generated');
    }
  }
}

// Test Suite 2: Image vs Canvas Separation Logic
async function testImageCanvasSeparation() {
  console.log('\n🔄 Test Suite 2: Image vs Canvas Separation Logic');
  console.log('================================================');

  const separationTests = [
    // These should generate IMAGES (not canvas)
    {
      name: 'Clear Image Request 1',
      prompt: 'Create a picture of a beautiful landscape',
      expected: 'image',
      type: 'image_request'
    },
    {
      name: 'Clear Image Request 2',
      prompt: 'Generate a photo of a cute dog',
      expected: 'image',
      type: 'image_request'
    },
    {
      name: 'Clear Image Request 3',
      prompt: 'Make an artwork showing geometric patterns',
      expected: 'image',
      type: 'image_request'
    },
    
    // These should activate CANVAS (not image generation)
    {
      name: 'Data Visualization Request',
      prompt: 'Create a chart showing sales data over time',
      expected: 'canvas',
      type: 'canvas_request'
    },
    {
      name: 'Code Generation Request',
      prompt: 'Generate Python code for data processing',
      expected: 'canvas',
      type: 'canvas_request'
    },
    {
      name: 'Document Creation Request',
      prompt: 'Create a technical document about machine learning',
      expected: 'canvas',
      type: 'canvas_request'
    },
    
    // Edge cases - ambiguous requests
    {
      name: 'Ambiguous Visual Request',
      prompt: 'Create a visual representation of quarterly growth',
      expected: 'canvas', // Should prefer data visualization over image
      type: 'edge_case'
    },
    {
      name: 'Technical Diagram Request',
      prompt: 'Make a diagram showing system architecture',
      expected: 'canvas', // Technical diagrams should use canvas
      type: 'edge_case'
    }
  ];

  for (const test of separationTests) {
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `sep_test_${Date.now()}`,
      mode: 'auto',
      task_type: 'separation_logic_test'
    });

    if (!response.success) {
      logTest(`Separation Logic: ${test.name}`, 'FAIL', `API request failed: ${response.error}`);
      continue;
    }

    // Determine what the system actually did
    const hasImageResult = response.data?.toolResults?.some(result => 
      result.toolName === 'generate-image' || 
      result.imageUrl || 
      result.generatedImage
    );

    const hasCanvasResult = response.data?.toolResults?.some(result => 
      result.chartData || result.documentData || result.code || 
      result.canvasActivation || result.toolName?.includes('canvas')
    );

    let actualResult = 'chat';
    if (hasImageResult) actualResult = 'image';
    else if (hasCanvasResult) actualResult = 'canvas';

    const correct = actualResult === test.expected;
    logTest(
      `Separation Logic: ${test.name}`,
      correct ? 'PASS' : 'FAIL',
      correct ? `Correctly routed to ${actualResult}` : `Expected ${test.expected}, got ${actualResult}`
    );
  }
}

// Test Suite 3: Vision LLM Functionality
async function testVisionLLM() {
  console.log('\n👁️ Test Suite 3: Vision LLM Functionality');
  console.log('=========================================');

  // Test vision analysis with synthetic test data
  const visionTests = [
    {
      name: 'Text Extraction Test',
      prompt: 'What do you see in this image?',
      imageData: await createTestImage(),
      expectedFeatures: ['analysis', 'description']
    },
    {
      name: 'Chart Analysis Test',
      prompt: 'Analyze the data shown in this chart',
      imageData: await createTestImage(),
      expectedFeatures: ['data', 'trends', 'analysis']
    },
    {
      name: 'Document Reading Test',
      prompt: 'Summarize the content of this document',
      imageData: await createTestImage(),
      expectedFeatures: ['summary', 'content', 'text']
    }
  ];

  for (const test of visionTests) {
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `vision_test_${Date.now()}`,
      mode: 'vision',
      attachments: {
        images: [test.imageData],
        metadata: { totalFiles: 1 }
      }
    }, 45000); // Extended timeout for vision processing

    if (!response.success) {
      logTest(`Vision LLM: ${test.name}`, 'FAIL', `API request failed: ${response.error}`);
      continue;
    }

    // Check if vision processing occurred
    const hasVisionResponse = response.data?.response && 
                             response.data.response.length > 50; // Meaningful response length

    const hasVisionIndicators = response.data?.response && 
                               test.expectedFeatures.some(feature => 
                                 response.data.response.toLowerCase().includes(feature)
                               );

    if (hasVisionResponse && hasVisionIndicators) {
      logTest(`Vision LLM: ${test.name}`, 'PASS', 'Vision analysis completed successfully');
    } else if (hasVisionResponse) {
      logTest(`Vision LLM: ${test.name}`, 'FAIL', 'Vision response lacks expected features');
    } else {
      logTest(`Vision LLM: ${test.name}`, 'FAIL', 'No meaningful vision response');
    }
  }
}

// Test Suite 4: Image Upload and Processing
async function testImageUpload() {
  console.log('\n📤 Test Suite 4: Image Upload and Processing');
  console.log('==========================================');

  const uploadTests = [
    {
      name: 'Single Image Upload',
      imageCount: 1,
      expectedProcessing: true
    },
    {
      name: 'Multiple Image Upload',
      imageCount: 3,
      expectedProcessing: true
    },
    {
      name: 'Large Image Handling',
      imageCount: 1,
      expectedProcessing: true,
      large: true
    }
  ];

  for (const test of uploadTests) {
    const images = [];
    for (let i = 0; i < test.imageCount; i++) {
      images.push(await createTestImage());
    }

    const response = await makeApiRequest('', 'POST', {
      message: 'Analyze these uploaded images',
      userId: TEST_CONFIG.testUserId,
      sessionId: `upload_test_${Date.now()}`,
      mode: 'vision',
      attachments: {
        images: images,
        metadata: { totalFiles: images.length }
      }
    });

    if (!response.success) {
      logTest(`Image Upload: ${test.name}`, 'FAIL', `Upload processing failed: ${response.error}`);
      continue;
    }

    const hasProcessedResponse = response.data?.response && response.data.response.length > 20;
    logTest(
      `Image Upload: ${test.name}`,
      hasProcessedResponse ? 'PASS' : 'FAIL',
      hasProcessedResponse ? `Processed ${test.imageCount} images successfully` : 'Upload processing failed'
    );
  }
}

// Test Suite 5: Intent Analysis Accuracy
async function testIntentAnalysis() {
  console.log('\n🧠 Test Suite 5: Intent Analysis Accuracy');
  console.log('========================================');

  const intentTests = [
    // Image generation intents
    {
      name: 'Photo Generation Intent',
      prompt: 'Create a realistic photo of a mountain landscape',
      expectedIntent: 'image_generation',
      expectedConfidence: 0.9
    },
    {
      name: 'Artwork Generation Intent',
      prompt: 'Generate abstract digital art with bright colors',
      expectedIntent: 'image_generation',
      expectedConfidence: 0.9
    },
    
    // Canvas creation intents
    {
      name: 'Data Visualization Intent',
      prompt: 'Create a bar chart showing monthly revenue',
      expectedIntent: 'canvas_creation',
      expectedConfidence: 0.9
    },
    {
      name: 'Document Creation Intent',
      prompt: 'Write a comprehensive report on climate change',
      expectedIntent: 'canvas_creation',
      expectedConfidence: 0.8
    },
    
    // Regular chat intents
    {
      name: 'Informational Intent',
      prompt: 'What are the benefits of renewable energy?',
      expectedIntent: 'conversational',
      expectedConfidence: 0.8
    },
    {
      name: 'Technical Support Intent',
      prompt: 'How do I fix a connection timeout error?',
      expectedIntent: 'conversational',
      expectedConfidence: 0.7
    }
  ];

  for (const test of intentTests) {
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `intent_test_${Date.now()}`,
      mode: 'auto',
      includeAnalysis: true // Request detailed analysis
    });

    if (!response.success) {
      logTest(`Intent Analysis: ${test.name}`, 'FAIL', `Analysis request failed: ${response.error}`);
      continue;
    }

    // Extract intent analysis results
    const hasImageResult = response.data?.toolResults?.some(result => 
      result.toolName === 'generate-image' || result.imageUrl
    );
    const hasCanvasResult = response.data?.toolResults?.some(result => 
      result.chartData || result.documentData || result.code
    );
    const isChatResponse = !hasImageResult && !hasCanvasResult;

    let detectedIntent = 'conversational';
    if (hasImageResult) detectedIntent = 'image_generation';
    else if (hasCanvasResult) detectedIntent = 'canvas_creation';

    const intentCorrect = detectedIntent === test.expectedIntent;
    logTest(
      `Intent Analysis: ${test.name}`,
      intentCorrect ? 'PASS' : 'FAIL',
      intentCorrect ? `Correctly identified as ${detectedIntent}` : `Expected ${test.expectedIntent}, got ${detectedIntent}`
    );
  }
}

// Test Suite 6: Error Recovery and Edge Cases
async function testErrorRecovery() {
  console.log('\n⚠️ Test Suite 6: Error Recovery and Edge Cases');
  console.log('===============================================');

  const errorTests = [
    {
      name: 'Invalid Image Format',
      prompt: 'Analyze this image',
      attachments: {
        images: ['invalid_base64_data'],
        metadata: { totalFiles: 1 }
      },
      expectedBehavior: 'graceful_error'
    },
    {
      name: 'Oversized Image Request',
      prompt: 'Create a 10000x10000 pixel image',
      expectedBehavior: 'constraint_handling'
    },
    {
      name: 'Impossible Image Request',
      prompt: 'Generate an image of the sound of silence',
      expectedBehavior: 'creative_interpretation_or_clarification'
    },
    {
      name: 'Conflicting Request',
      prompt: 'Create an image and also make a chart with the same data',
      expectedBehavior: 'multi_tool_or_clarification'
    }
  ];

  for (const test of errorTests) {
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `error_test_${Date.now()}`,
      mode: 'auto',
      attachments: test.attachments
    });

    // For error tests, we primarily check that the system doesn't crash
    const systemStable = response.status !== 500;
    const hasResponse = response.data && (response.data.response || response.data.error);
    
    logTest(
      `Error Recovery: ${test.name}`,
      systemStable && hasResponse ? 'PASS' : 'FAIL',
      systemStable ? 'System handled error gracefully' : 'System instability detected'
    );
  }
}

// Test Suite 7: Performance and Quality Metrics
async function testPerformanceQuality() {
  console.log('\n⚡ Test Suite 7: Performance and Quality Metrics');
  console.log('===============================================');

  // Image generation performance test
  const imageStartTime = Date.now();
  const imageResponse = await makeApiRequest('', 'POST', {
    message: 'Create a simple landscape image',
    userId: TEST_CONFIG.testUserId,
    sessionId: `perf_img_${Date.now()}`,
    mode: 'auto'
  }, 60000);
  const imageGenTime = Date.now() - imageStartTime;

  const imageTimeTarget = 30000; // 30 seconds
  logTest(
    'Performance: Image Generation Speed',
    imageGenTime < imageTimeTarget ? 'PASS' : 'FAIL',
    `Generation time: ${imageGenTime}ms (target: <${imageTimeTarget}ms)`
  );

  // Vision processing performance test
  const visionStartTime = Date.now();
  const visionResponse = await makeApiRequest('', 'POST', {
    message: 'What do you see in this image?',
    userId: TEST_CONFIG.testUserId,
    sessionId: `perf_vision_${Date.now()}`,
    mode: 'vision',
    attachments: {
      images: [await createTestImage()],
      metadata: { totalFiles: 1 }
    }
  });
  const visionTime = Date.now() - visionStartTime;

  const visionTimeTarget = 15000; // 15 seconds
  logTest(
    'Performance: Vision Processing Speed',
    visionTime < visionTimeTarget ? 'PASS' : 'FAIL',
    `Processing time: ${visionTime}ms (target: <${visionTimeTarget}ms)`
  );

  // Intent analysis accuracy test
  const intentAccuracyTests = [
    { prompt: 'Create an image of a cat', expected: 'image' },
    { prompt: 'Make a bar chart', expected: 'canvas' },
    { prompt: 'What is AI?', expected: 'chat' }
  ];

  let correctIntents = 0;
  for (const test of intentAccuracyTests) {
    const response = await makeApiRequest('', 'POST', {
      message: test.prompt,
      userId: TEST_CONFIG.testUserId,
      sessionId: `accuracy_${Date.now()}`,
      mode: 'auto'
    });

    if (response.success) {
      const hasImage = response.data?.toolResults?.some(r => r.imageUrl || r.toolName === 'generate-image');
      const hasCanvas = response.data?.toolResults?.some(r => r.chartData || r.documentData || r.code);
      
      let actual = 'chat';
      if (hasImage) actual = 'image';
      else if (hasCanvas) actual = 'canvas';
      
      if (actual === test.expected) correctIntents++;
    }
  }

  const accuracyRate = (correctIntents / intentAccuracyTests.length) * 100;
  const accuracyTarget = 85; // 85%
  logTest(
    'Quality: Intent Analysis Accuracy',
    accuracyRate >= accuracyTarget ? 'PASS' : 'FAIL',
    `Accuracy: ${accuracyRate.toFixed(1)}% (target: ≥${accuracyTarget}%)`
  );
}

// Main test execution
async function runAllTests() {
  try {
    console.log('🚀 Starting comprehensive image & vision systems test suite...\n');

    await testImageGeneration();
    await testImageCanvasSeparation();
    await testVisionLLM();
    await testImageUpload();
    await testIntentAnalysis();
    await testErrorRecovery();
    await testPerformanceQuality();

    // Generate test report
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults.details
        .filter(test => test.status === 'FAIL')
        .forEach(test => {
          console.log(`   • ${test.testName}: ${test.details}`);
        });
    }

    // Save detailed results
    const reportPath = path.join(__dirname, `image_vision_test_results_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: (testResults.passed / testResults.total) * 100
      },
      details: testResults.details,
      config: TEST_CONFIG,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log(`\n📄 Detailed results saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Test suite execution failed:', error);
    process.exit(1);
  }
}

// Execute if running directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testImageGeneration,
  testImageCanvasSeparation,
  testVisionLLM,
  TEST_CONFIG,
  testResults
};
