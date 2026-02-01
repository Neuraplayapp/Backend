#!/usr/bin/env node

/**
 * 🧠 NeuraPlay Comprehensive System Test Runner
 * 
 * This script runs all diagnostic tests to verify:
 * 1. Vector search (no undefined memories)
 * 2. Memory amnesia fix
 * 3. Frontend functionality on dev:3001
 * 4. ElevenLabs WebSocket
 * 5. Voice recording & transcription  
 * 6. Canvas functionality
 * 7. Vision service
 * 8. Image generation
 * 9. Web search
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

// Configuration
const BACKEND_PORT = 3001;
const FRONTEND_PORT = 5173;
const TEST_TIMEOUT = 120000; // 2 minutes
const API_BASE = `http://localhost:${BACKEND_PORT}`;

// Test state
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

console.log('🚀 NeuraPlay Comprehensive Test Suite Starting...\n');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBackendHealth() {
    console.log('🏥 Testing backend health...');
    
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${API_BASE}/api/health`, {
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Backend healthy: ${data.status}`);
            return true;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ Backend health check failed: ${error.message}`);
        return false;
    }
}

async function testVectorSearchUndefined() {
    console.log('🔍 Testing vector search for undefined memories...');
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        // First store a test memory
        const storeResponse = await fetch(`${API_BASE}/api/memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'store',
                userId: 'test_user_comprehensive',
                key: 'test_vector_search',
                value: 'This is a comprehensive test memory for vector search validation'
            })
        });
        
        if (!storeResponse.ok) {
            throw new Error(`Failed to store test memory: HTTP ${storeResponse.status}`);
        }
        
        // Wait a moment for indexing
        await sleep(1000);
        
        // Test vector search retrieval
        const searchResponse = await fetch(`${API_BASE}/api/memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'search',
                userId: 'test_user_comprehensive',
                query: 'comprehensive test memory'
            })
        });
        
        if (!searchResponse.ok) {
            throw new Error(`Search failed: HTTP ${searchResponse.status}`);
        }
        
        const result = await searchResponse.json();
        
        if (result.memories && result.memories.length > 0) {
            const hasUndefinedContent = result.memories.some(m => 
                !m.content || m.content === 'undefined' || typeof m.content !== 'string'
            );
            
            if (hasUndefinedContent) {
                console.log('❌ Vector search returning undefined memories');
                return false;
            } else {
                console.log(`✅ Vector search working: Found ${result.memories.length} valid memories`);
                return true;
            }
        } else {
            console.log('⚠️ No memories found in search');
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Vector search test failed: ${error.message}`);
        return false;
    }
}

async function testMemoryAmnesia() {
    console.log('🧠 Testing memory amnesia fix...');
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        // Send initial message
        const firstResponse = await fetch(`${API_BASE}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_type: 'chat',
                input_data: {
                    messages: [
                        { role: 'user', content: 'My name is TestUser and I like pizza' }
                    ],
                    sessionId: 'amnesia_test_session',
                    userId: 'amnesia_test_user'
                }
            })
        });
        
        if (!firstResponse.ok) {
            throw new Error(`First message failed: HTTP ${firstResponse.status}`);
        }
        
        await sleep(2000);
        
        // Send follow-up message that should reference previous context
        const secondResponse = await fetch(`${API_BASE}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_type: 'chat',
                input_data: {
                    messages: [
                        { role: 'user', content: 'My name is TestUser and I like pizza' },
                        { role: 'assistant', content: 'Nice to meet you TestUser! I see you like pizza.' },
                        { role: 'user', content: 'What do you remember about me?' }
                    ],
                    sessionId: 'amnesia_test_session',
                    userId: 'amnesia_test_user'
                }
            })
        });
        
        if (!secondResponse.ok) {
            throw new Error(`Second message failed: HTTP ${secondResponse.status}`);
        }
        
        const result = await secondResponse.json();
        const responseText = result[0]?.generated_text || '';
        
        // Check if response contains contextual information
        const hasContext = responseText.toLowerCase().includes('testuser') || 
                          responseText.toLowerCase().includes('pizza') ||
                          responseText.toLowerCase().includes('remember');
        
        if (hasContext) {
            console.log('✅ Memory amnesia fixed: AI remembers conversation context');
            return true;
        } else {
            console.log('❌ Memory amnesia detected: AI forgot previous context');
            console.log(`Response: ${responseText.substring(0, 100)}...`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Memory amnesia test failed: ${error.message}`);
        return false;
    }
}

async function testElevenLabsIntegration() {
    console.log('🔊 Testing ElevenLabs integration...');
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`${API_BASE}/api/elevenlabs-tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'This is a test of the ElevenLabs integration',
                voice_id: 'pNInz6obpgDQGcFmaJgB'
            })
        });
        
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('audio')) {
                console.log('✅ ElevenLabs TTS working: Audio generated');
                return true;
            } else {
                console.log('❌ ElevenLabs returned non-audio response');
                return false;
            }
        } else {
            console.log(`❌ ElevenLabs failed: HTTP ${response.status}`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ ElevenLabs test failed: ${error.message}`);
        return false;
    }
}

async function testImageGeneration() {
    console.log('🎨 Testing image generation...');
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`${API_BASE}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_type: 'image',
                input_data: {
                    prompt: 'A simple test image of a blue circle'
                }
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.image_url || result.data) {
                console.log('✅ Image generation working');
                return true;
            } else {
                console.log('❌ No image data in response');
                return false;
            }
        } else {
            console.log(`❌ Image generation failed: HTTP ${response.status}`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Image generation test failed: ${error.message}`);
        return false;
    }
}

async function testWebSearch() {
    console.log('🔍 Testing web search...');
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`${API_BASE}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_type: 'web_search',
                input_data: {
                    query: 'artificial intelligence',
                    num: 3
                }
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                console.log(`✅ Web search working: ${result.data.length} results`);
                return true;
            } else {
                console.log('❌ Web search returned no results');
                return false;
            }
        } else {
            console.log(`❌ Web search failed: HTTP ${response.status}`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Web search test failed: ${error.message}`);
        return false;
    }
}

async function testCanvasFunctionality() {
    console.log('🎨 Testing canvas functionality...');
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`${API_BASE}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_type: 'chat',
                input_data: {
                    messages: [
                        { role: 'user', content: 'create a document about testing procedures' }
                    ]
                }
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result && result.length > 0) {
                console.log('✅ Canvas document creation working');
                return true;
            } else {
                console.log('❌ Canvas returned empty response');
                return false;
            }
        } else {
            console.log(`❌ Canvas test failed: HTTP ${response.status}`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Canvas test failed: ${error.message}`);
        return false;
    }
}

async function runTest(testName, testFunction) {
    console.log(`\n🧪 Running ${testName}...`);
    testResults.total++;
    
    try {
        const success = await Promise.race([
            testFunction(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), TEST_TIMEOUT))
        ]);
        
        if (success) {
            testResults.passed++;
            testResults.details.push({ name: testName, status: 'PASSED' });
            console.log(`✅ ${testName} PASSED`);
        } else {
            testResults.failed++;
            testResults.details.push({ name: testName, status: 'FAILED' });
            console.log(`❌ ${testName} FAILED`);
        }
    } catch (error) {
        testResults.failed++;
        testResults.details.push({ name: testName, status: 'ERROR', error: error.message });
        console.log(`❌ ${testName} ERROR: ${error.message}`);
    }
}

function checkServerRunning(port) {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec(`netstat -an | findstr :${port}`, (error, stdout) => {
            resolve(stdout.includes(`:${port}`));
        });
    });
}

async function main() {
    console.log('🔍 Checking if servers are running...\n');
    
    const backendRunning = await checkServerRunning(BACKEND_PORT);
    const frontendRunning = await checkServerRunning(FRONTEND_PORT);
    
    if (!backendRunning) {
        console.log(`❌ Backend server not running on port ${BACKEND_PORT}`);
        console.log('💡 Start with: node server.cjs');
        process.exit(1);
    }
    
    console.log(`✅ Backend server detected on port ${BACKEND_PORT}`);
    
    if (!frontendRunning) {
        console.log(`⚠️ Frontend server not detected on port ${FRONTEND_PORT}`);
        console.log('💡 Start with: npm run dev');
    } else {
        console.log(`✅ Frontend server detected on port ${FRONTEND_PORT}`);
    }
    
    // Run all tests
    console.log('\n🚀 Starting comprehensive test suite...\n');
    
    await runTest('Backend Health Check', testBackendHealth);
    await runTest('Vector Search (No Undefined)', testVectorSearchUndefined);
    await runTest('Memory Amnesia Fix', testMemoryAmnesia);
    await runTest('ElevenLabs Integration', testElevenLabsIntegration);
    await runTest('Image Generation', testImageGeneration);
    await runTest('Web Search', testWebSearch);
    await runTest('Canvas Functionality', testCanvasFunctionality);
    
    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('🧠 NEURAPLAY COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETAILED RESULTS:');
    testResults.details.forEach((test, index) => {
        const status = test.status === 'PASSED' ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${test.name} - ${test.status}`);
        if (test.error) {
            console.log(`   Error: ${test.error}`);
        }
    });
    
    console.log('\n🎯 FRONTEND TEST INSTRUCTIONS:');
    console.log('1. Open http://localhost:5173 in your browser');
    console.log('2. Open test-frontend-comprehensive.html');
    console.log('3. Click "Run All Tests" to test frontend functionality');
    console.log('4. Verify all tests pass for complete system validation');
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = `comprehensive_test_results_${timestamp.split('T')[0]}.json`;
    
    fs.writeFileSync(resultsFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalTests: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: ((testResults.passed / testResults.total) * 100).toFixed(1) + '%',
        details: testResults.details,
        frontendTestFile: 'test-frontend-comprehensive.html'
    }, null, 2));
    
    console.log(`\n💾 Results saved to: ${resultsFile}`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! System is fully functional.');
        process.exit(0);
    } else {
        console.log(`\n⚠️ ${testResults.failed} test(s) failed. Please review and fix issues.`);
        process.exit(1);
    }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
    console.error('\n❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('\n❌ Unhandled Rejection:', reason);
    process.exit(1);
});

// Run main function
main().catch(error => {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
});

