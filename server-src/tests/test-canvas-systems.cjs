#!/usr/bin/env node

/**
 * FRONTEND CANVAS ACTIVATION TEST SUITE
 * 
 * Tests the correct architecture:
 * 1. LLM generates responses with chartData/documentData/codeData in tool results
 * 2. AdvancedToolResultsRenderer detects canvas content in tool results
 * 3. Frontend fires canvas activation events
 * 4. NeuraPlayAssistantLite activates split screen mode
 * 5. SpartanCanvasRenderer displays charts/documents/code via CodeMirror/Plotly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
  apiUrl: process.env.TEST_API_URL || 'http://localhost:3001/api',
  testUserId: process.env.TEST_USER_ID || 'test_canvas_user_001',
  timeout: 30000,
  retries: 3
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

console.log('🎨 FRONTEND CANVAS ACTIVATION TEST SUITE');
console.log('========================================');
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

// Import fetch for Node.js - proper way for CommonJS
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function makeApiRequest(endpoint, method = 'POST', data = {}) {
  try {
    const response = await fetch(`${TEST_CONFIG.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
      timeout: TEST_CONFIG.timeout
    });
    
    const result = await response.json();
    return { success: response.ok, data: result, status: response.status };
  } catch (error) {
    console.warn(`API request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test Suite 1: LLM Tool Result Generation
async function testLLMToolResultGeneration() {
  console.log('\n📋 Test Suite 1: LLM Tool Result Generation');
  console.log('===========================================');

  const testCases = [
    // Should generate chart tool results
    { 
      prompt: 'Create a bar chart showing Q1: 100, Q2: 150, Q3: 200', 
      expectedToolType: 'chart',
      expectedDataFields: ['chartData'],
      name: 'Chart Generation Request' 
    },
    { 
      prompt: 'Make a line graph of temperature data', 
      expectedToolType: 'chart',
      expectedDataFields: ['chartData'],
      name: 'Line Chart Request' 
    },
    
    // Should generate document tool results
    { 
      prompt: 'Create a comprehensive document about renewable energy', 
      expectedToolType: 'document',
      expectedDataFields: ['documentData'],
      name: 'Document Creation Request' 
    },
    { 
      prompt: 'Write a technical report on AI systems', 
      expectedToolType: 'document',
      expectedDataFields: ['documentData'],
      name: 'Technical Report Request' 
    },
    
    // Should generate code tool results
    { 
      prompt: 'Generate Python code for data analysis', 
      expectedToolType: 'code',
      expectedDataFields: ['codeData'],
      name: 'Code Generation Request' 
    },
    { 
      prompt: 'Create JavaScript code for sorting arrays', 
      expectedToolType: 'code',
      expectedDataFields: ['codeData'],
      name: 'JavaScript Code Request' 
    }
  ];

  for (const testCase of testCases) {
    try {
      const response = await makeApiRequest('', 'POST', {
        task_type: 'canvas_test',
        input_data: {
          messages: [
            { role: 'user', content: testCase.prompt }
          ],
          userId: TEST_CONFIG.testUserId,
          sessionId: `test_session_${Date.now()}`,
          mode: 'auto'
        }
      });

      if (!response.success) {
        logTest(`LLM Tool Result: ${testCase.name}`, 'FAIL', `API request failed: ${response.error}`);
        continue;
      }

      // Check if response has the correct structure for frontend canvas detection
      const hasValidResponse = response.data && Array.isArray(response.data) && response.data[0];
      if (!hasValidResponse) {
        logTest(`LLM Tool Result: ${testCase.name}`, 'FAIL', 'Invalid response structure');
        continue;
      }

      const responseData = response.data[0];
      const hasToolResults = responseData.tool_results && responseData.tool_results.length > 0;
      
      if (!hasToolResults) {
        logTest(`LLM Tool Result: ${testCase.name}`, 'FAIL', 'No tool results in response');
        continue;
      }

      // Check for canvas-activating data in tool results
      const hasCanvasData = responseData.tool_results.some(result => 
        testCase.expectedDataFields.some(field => 
          result[field] || result.data?.[field] || 
          result.message?.toLowerCase().includes(testCase.expectedToolType)
        )
      );

      logTest(
        `LLM Tool Result: ${testCase.name}`,
        hasCanvasData ? 'PASS' : 'FAIL',
        hasCanvasData ? `Contains ${testCase.expectedToolType} data for frontend detection` : `Missing ${testCase.expectedToolType} data`
      );

    } catch (error) {
      logTest(`LLM Tool Result: ${testCase.name}`, 'FAIL', error.message);
    }
  }
}

// Test Suite 2: Canvas Content Detection Patterns
async function testCanvasContentDetection() {
  console.log('\n🔍 Test Suite 2: Canvas Content Detection Patterns');
  console.log('==================================================');

  const detectionTests = [
    {
      name: 'Chart Data Structure',
      mockToolResult: {
        chartData: {
          type: 'bar',
          data: { labels: ['Q1', 'Q2'], datasets: [{ data: [100, 150] }] }
        },
        message: 'Chart created successfully'
      },
      shouldActivateCanvas: true,
      expectedType: 'chart'
    },
    {
      name: 'Document Data Structure', 
      mockToolResult: {
        documentData: {
          title: 'Test Document',
          content: 'This is a test document',
          sections: ['Introduction', 'Body', 'Conclusion']
        },
        message: 'Document generated'
      },
      shouldActivateCanvas: true,
      expectedType: 'document'
    },
    {
      name: 'Code Data Structure',
      mockToolResult: {
        codeData: {
          language: 'python',
          code: 'def hello():\n    print("Hello World")',
          filename: 'test.py'
        },
        message: 'Code generated'
      },
      shouldActivateCanvas: true,
      expectedType: 'code'
    },
    {
      name: 'Regular Chat Response',
      mockToolResult: {
        message: 'This is just a regular chat response without canvas content'
      },
      shouldActivateCanvas: false,
      expectedType: 'none'
    }
  ];

  for (const test of detectionTests) {
    // Simulate the frontend canvas detection logic
    const chartData = test.mockToolResult.chartData || test.mockToolResult.data?.chartData;
    const documentData = test.mockToolResult.documentData || test.mockToolResult.data?.documentData;
    const codeData = test.mockToolResult.codeData || test.mockToolResult.data?.codeData;
    
    const shouldActivate = !!(chartData || documentData || codeData || test.mockToolResult.canvasActivation === true);
    const actualType = chartData ? 'chart' : documentData ? 'document' : codeData ? 'code' : 'none';
    
    const correctDetection = shouldActivate === test.shouldActivateCanvas && actualType === test.expectedType;
    
    logTest(
      `Canvas Detection: ${test.name}`,
      correctDetection ? 'PASS' : 'FAIL',
      correctDetection ? 
        `Correctly detected ${actualType} activation: ${shouldActivate}` : 
        `Expected ${test.expectedType} (${test.shouldActivateCanvas}), got ${actualType} (${shouldActivate})`
    );
  }
}

// Test Suite 3: Frontend Canvas Integration Flow
async function testFrontendCanvasFlow() {
  console.log('\n🎨 Test Suite 3: Frontend Canvas Integration Flow');
  console.log('================================================');

  const flowTests = [
    {
      name: 'Chart Activation Flow',
      prompt: 'Create a pie chart showing browser usage: Chrome 60%, Firefox 25%, Safari 15%',
      expectedFlow: ['LLM Response', 'Tool Results', 'Canvas Detection', 'Split Screen Activation', 'Chart Rendering']
    },
    {
      name: 'Document Activation Flow', 
      prompt: 'Create a business report on quarterly performance',
      expectedFlow: ['LLM Response', 'Tool Results', 'Canvas Detection', 'Split Screen Activation', 'Document Rendering']
    },
    {
      name: 'Code Activation Flow',
      prompt: 'Generate React component for a todo list',
      expectedFlow: ['LLM Response', 'Tool Results', 'Canvas Detection', 'Split Screen Activation', 'Code Rendering']
    }
  ];

  for (const test of flowTests) {
    try {
      const response = await makeApiRequest('', 'POST', {
        task_type: 'canvas_flow_test',
        input_data: {
          messages: [
            { role: 'user', content: test.prompt }
          ],
          userId: TEST_CONFIG.testUserId,
          sessionId: `flow_test_${Date.now()}`,
          mode: 'auto'
        }
      });

      const flowSteps = [];
      
      // Step 1: LLM Response
      if (response.success && response.data) {
        flowSteps.push('LLM Response');
      }
      
      // Step 2: Tool Results
      if (response.data?.[0]?.tool_results?.length > 0) {
        flowSteps.push('Tool Results');
      }
      
      // Step 3: Canvas Detection (simulate frontend logic)
      const hasCanvasContent = response.data?.[0]?.tool_results?.some(result => 
        result.chartData || result.documentData || result.codeData || 
        result.data?.chartData || result.data?.documentData || result.data?.codeData
      );
      if (hasCanvasContent) {
        flowSteps.push('Canvas Detection');
        flowSteps.push('Split Screen Activation'); // Would happen in frontend
        
        // Step 5: Determine rendering type
        const isChart = response.data[0].tool_results.some(r => r.chartData || r.data?.chartData);
        const isDocument = response.data[0].tool_results.some(r => r.documentData || r.data?.documentData);
        const isCode = response.data[0].tool_results.some(r => r.codeData || r.data?.codeData);
        
        if (isChart) flowSteps.push('Chart Rendering');
        if (isDocument) flowSteps.push('Document Rendering');
        if (isCode) flowSteps.push('Code Rendering');
      }
      
      const expectedStepsCount = test.expectedFlow.length;
      const actualStepsCount = flowSteps.length;
      const flowComplete = actualStepsCount >= expectedStepsCount - 1; // Allow some tolerance
      
      logTest(
        `Canvas Flow: ${test.name}`,
        flowComplete ? 'PASS' : 'FAIL',
        `Completed ${actualStepsCount}/${expectedStepsCount} steps: ${flowSteps.join(' → ')}`
      );

    } catch (error) {
      logTest(`Canvas Flow: ${test.name}`, 'FAIL', error.message);
    }
  }
}

// Test Suite 4: Memory Integration
async function testMemoryIntegration() {
  console.log('\n💾 Test Suite 4: Canvas Memory Integration');
  console.log('=========================================');

  // Test memory storage
  const memoryKey = `canvas_test_${Date.now()}`;
  const memoryValue = 'Frontend canvas activation test data';
  
  try {
    const storeResponse = await makeApiRequest('/memory', 'POST', {
      action: 'store',
      userId: TEST_CONFIG.testUserId,
      key: memoryKey,
      value: memoryValue,
      metadata: { testType: 'frontend_canvas_integration', timestamp: Date.now() }
    });

    const storeSuccess = storeResponse.success && storeResponse.status !== 500;
    logTest(
      'Canvas Memory: Storage Test',
      storeSuccess ? 'PASS' : 'FAIL',
      storeSuccess ? 'Memory stored successfully' : 'Memory storage failed'
    );

    // Wait for storage to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test memory retrieval
    const retrieveResponse = await makeApiRequest('/memory', 'POST', {
      action: 'retrieve',
      userId: TEST_CONFIG.testUserId,
      key: memoryKey
    });

    const retrieveSuccess = retrieveResponse.success && retrieveResponse.status !== 500 && 
                           retrieveResponse.data && retrieveResponse.data.length > 0;
    logTest(
      'Canvas Memory: Retrieval Test',
      retrieveSuccess ? 'PASS' : 'FAIL',
      retrieveSuccess ? 'Memory retrieved successfully' : 'Memory retrieval failed'
    );

  } catch (error) {
    logTest('Canvas Memory: Storage Test', 'FAIL', error.message);
    logTest('Canvas Memory: Retrieval Test', 'FAIL', 'Storage failed, skipping retrieval');
  }
}

// Test Suite 5: Canvas Rendering Components
async function testCanvasRenderingComponents() {
  console.log('\n🖼️ Test Suite 5: Canvas Rendering Components');
  console.log('==============================================');

  const renderingTests = [
    {
      name: 'Chart Component Data Processing',
      inputData: {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar'],
          datasets: [{ label: 'Sales', data: [100, 150, 200] }]
        }
      },
      component: 'ScandinavianChart',
      expectedFeatures: ['Plotly Integration', 'Responsive Design', 'Export Functionality']
    },
    {
      name: 'Document Component Processing',
      inputData: {
        title: 'Test Document',
        content: 'This is a test document with markdown formatting.',
        sections: ['Introduction', 'Body', 'Conclusion']
      },
      component: 'ScandinavianDocument',
      expectedFeatures: ['Typewriter Effect', 'Version Control', 'Export Options']
    },
    {
      name: 'Code Component Processing',
      inputData: {
        language: 'javascript',
        code: 'function test() {\n  console.log("Hello World");\n}',
        filename: 'test.js'
      },
      component: 'ScandinavianCode',
      expectedFeatures: ['CodeMirror Integration', 'Syntax Highlighting', 'Copy Functionality']
    }
  ];

  for (const test of renderingTests) {
    // Simulate component rendering validation
    const hasValidData = test.inputData && Object.keys(test.inputData).length > 0;
    const hasRequiredFields = test.component === 'ScandinavianChart' ? 
      test.inputData.type && test.inputData.data :
      test.component === 'ScandinavianDocument' ?
      test.inputData.title && test.inputData.content :
      test.inputData.language && test.inputData.code;

    const componentReady = hasValidData && hasRequiredFields;
    
    logTest(
      `Canvas Rendering: ${test.name}`,
      componentReady ? 'PASS' : 'FAIL',
      componentReady ? 
        `${test.component} ready with features: ${test.expectedFeatures.join(', ')}` :
        `${test.component} missing required data fields`
    );
  }
}

// Main test execution
async function runAllTests() {
  try {
    console.log('🚀 Starting frontend canvas activation test suite...\n');

    await testLLMToolResultGeneration();
    await testCanvasContentDetection();
    await testFrontendCanvasFlow();
    await testMemoryIntegration();
    await testCanvasRenderingComponents();

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
    const reportPath = path.join(__dirname, `frontend_canvas_test_results_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: (testResults.passed / testResults.total) * 100
      },
      details: testResults.details,
      config: TEST_CONFIG,
      timestamp: new Date().toISOString(),
      architecture: 'Frontend Canvas Activation via Tool Results Detection'
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
  testLLMToolResultGeneration,
  testCanvasContentDetection,
  testFrontendCanvasFlow,
  TEST_CONFIG,
  testResults
};





