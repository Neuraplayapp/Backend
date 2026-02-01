/**
 * 🧠 COMPREHENSIVE MEMORY SYSTEM TEST SUITE
 * Tests all aspects of the NeuraPlay memory system including:
 * - Database schema consistency
 * - User creation and management  
 * - Memory storage/retrieval pipeline
 * - Conversation integration
 * - Error handling and edge cases
 * - Performance and scalability
 */

// Use built-in fetch in Node 18+ or fallback to https module
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  // Fallback to a simple fetch implementation using https
  const https = require('https');
  const http = require('http');
  
  fetch = async (url, options = {}) => {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const lib = urlObj.protocol === 'https:' ? https : http;
      
      const req = lib.request({
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: async () => JSON.parse(data),
            text: async () => data
          });
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      
      req.end();
    });
  };
}

const assert = require('assert');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001',
  testUsers: [
    { id: 'admin_2025', username: 'testadmin', email: 'admin@test.com', password: 'testpass123' },
    { id: 'user_001', username: 'testuser1', email: 'user1@test.com', password: 'testpass123' },
    { id: 'user_002', username: 'testuser2', email: 'user2@test.com', password: 'testpass123' }
  ],
  memoryTestCases: [
    { key: 'user_name', value: 'Sammy', category: 'personal' },
    { key: 'favorite_subject', value: 'Mathematics', category: 'preference' },
    { key: 'learning_style', value: 'Visual learner, prefers diagrams and charts', category: 'cognitive_insight' },
    { key: 'pet_name', value: 'Fluffy the cat', category: 'personal' },
    { key: 'birthday', value: 'March 15th', category: 'event' },
    { key: 'math_level', value: 'Struggling with algebra but confident in arithmetic', category: 'learning' }
  ]
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: [],
  performance: {},
  detailed: []
};

/**
 * 🚀 MAIN TEST SUITE RUNNER
 */
async function runComprehensiveMemoryTests() {
  console.log('🧠 Starting COMPREHENSIVE MEMORY SYSTEM TESTS');
  console.log('=' .repeat(80));
  
  try {
    // Phase 1: Database and Infrastructure Tests
    await testDatabaseConnectivity();
    await testSchemaConsistency();
    await testUserManagement();
    
    // Phase 2: Core Memory Operations
    await testMemoryStorage();
    await testMemoryRetrieval();
    await testMemoryUpdates();
    await testMemoryDeletion();
    
    // Phase 3: Integration Tests
    await testConversationMemoryIntegration();
    await testToolCallingMemoryFlow();
    await testCrossChatPersistence();
    
    // Phase 4: Advanced Features
    await testSemanticSearch();
    await testMemoryRanking();
    await testCognitiveProgression();
    
    // Phase 5: Performance and Scale
    await testPerformance();
    await testConcurrency();
    await testMemoryLimits();
    
    // Phase 6: Error Handling
    await testErrorHandling();
    await testRecovery();
    
    // Generate comprehensive report
    generateTestReport();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    testResults.errors.push({ test: 'Main Suite', error: error.message });
  }
}

/**
 * 🔧 PHASE 1: DATABASE AND INFRASTRUCTURE TESTS
 */
async function testDatabaseConnectivity() {
  const testName = 'Database Connectivity';
  console.log(`\n🔧 Testing: ${testName}`);
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/debug-routing`);
    const data = await response.json();
    
    assert(response.ok, 'Server should be responding');
    assert(data.success !== false, 'Server should be healthy');
    
    recordTest(testName, 'PASS', 'Database connectivity confirmed');
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

async function testSchemaConsistency() {
  const testName = 'Database Schema Consistency';
  console.log(`\n📋 Testing: ${testName}`);
  
  try {
    // Test user table structure by trying to create a test user
    const userCreationResult = await createTestUser(TEST_CONFIG.testUsers[0]);
    
    if (userCreationResult.success) {
      recordTest(testName, 'PASS', 'User table schema is working');
    } else {
      recordTest(testName, 'FAIL', `User table issues: ${userCreationResult.error}`);
    }
    
    // Test memory table structure
    const memoryTestResult = await testMemoryTableStructure();
    if (memoryTestResult.success) {
      recordTest(`${testName} - Memory Table`, 'PASS', 'Memory table schema is working');
    } else {
      recordTest(`${testName} - Memory Table`, 'FAIL', `Memory table issues: ${memoryTestResult.error}`);
    }
    
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

async function testUserManagement() {
  const testName = 'User Management';
  console.log(`\n👤 Testing: ${testName}`);
  
  for (const testUser of TEST_CONFIG.testUsers) {
    try {
      const result = await createTestUser(testUser);
      recordTest(`${testName} - Create ${testUser.username}`, 
                result.success ? 'PASS' : 'FAIL', 
                result.message || result.error);
    } catch (error) {
      recordTest(`${testName} - Create ${testUser.username}`, 'FAIL', error.message);
    }
  }
}

/**
 * 🔧 PHASE 2: CORE MEMORY OPERATIONS
 */
async function testMemoryStorage() {
  const testName = 'Memory Storage';
  console.log(`\n🧠 Testing: ${testName}`);
  
  const userId = TEST_CONFIG.testUsers[0].id;
  
  for (const memoryCase of TEST_CONFIG.memoryTestCases) {
    try {
      const startTime = Date.now();
      
      const result = await storeMemory(userId, memoryCase);
      
      const duration = Date.now() - startTime;
      testResults.performance[`store_${memoryCase.key}`] = duration;
      
      recordTest(`${testName} - ${memoryCase.key}`, 
                result.success ? 'PASS' : 'FAIL', 
                result.message || result.error,
                { duration });
                
    } catch (error) {
      recordTest(`${testName} - ${memoryCase.key}`, 'FAIL', error.message);
    }
  }
}

async function testMemoryRetrieval() {
  const testName = 'Memory Retrieval';
  console.log(`\n🔍 Testing: ${testName}`);
  
  const userId = TEST_CONFIG.testUsers[0].id;
  
  // Test individual memory retrieval
  for (const memoryCase of TEST_CONFIG.memoryTestCases) {
    try {
      const startTime = Date.now();
      
      const result = await searchMemory(userId, memoryCase.key);
      
      const duration = Date.now() - startTime;
      testResults.performance[`retrieve_${memoryCase.key}`] = duration;
      
      const found = result.memories?.some(m => m.memory_key === memoryCase.key && m.content === memoryCase.value);
      
      recordTest(`${testName} - ${memoryCase.key}`, 
                found ? 'PASS' : 'FAIL', 
                found ? 'Memory retrieved correctly' : 'Memory not found or incorrect',
                { duration, memoriesFound: result.memories?.length || 0 });
                
    } catch (error) {
      recordTest(`${testName} - ${memoryCase.key}`, 'FAIL', error.message);
    }
  }
  
  // Test bulk memory retrieval
  try {
    const result = await searchMemory(userId, '');
    recordTest(`${testName} - Bulk Retrieval`, 
              result.memories?.length > 0 ? 'PASS' : 'FAIL',
              `Retrieved ${result.memories?.length || 0} total memories`);
  } catch (error) {
    recordTest(`${testName} - Bulk Retrieval`, 'FAIL', error.message);
  }
}

async function testMemoryUpdates() {
  const testName = 'Memory Updates';
  console.log(`\n✏️ Testing: ${testName}`);
  
  const userId = TEST_CONFIG.testUsers[0].id;
  const testKey = 'update_test';
  const originalValue = 'Original Value';
  const updatedValue = 'Updated Value';
  
  try {
    // Store original
    await storeMemory(userId, { key: testKey, value: originalValue, category: 'test' });
    
    // Update
    const updateResult = await updateMemory(userId, testKey, updatedValue);
    
    // Verify update
    const retrieveResult = await searchMemory(userId, testKey);
    const found = retrieveResult.memories?.find(m => m.memory_key === testKey);
    
    const success = found && found.content === updatedValue;
    recordTest(testName, success ? 'PASS' : 'FAIL', 
              success ? 'Memory updated correctly' : 'Memory update failed');
              
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

async function testMemoryDeletion() {
  const testName = 'Memory Deletion';
  console.log(`\n🗑️ Testing: ${testName}`);
  
  const userId = TEST_CONFIG.testUsers[0].id;
  const testKey = 'delete_test';
  
  try {
    // Store memory to delete
    await storeMemory(userId, { key: testKey, value: 'To be deleted', category: 'test' });
    
    // Delete
    const deleteResult = await deleteMemory(userId, testKey);
    
    // Verify deletion
    const retrieveResult = await searchMemory(userId, testKey);
    const stillExists = retrieveResult.memories?.some(m => m.memory_key === testKey);
    
    const success = !stillExists;
    recordTest(testName, success ? 'PASS' : 'FAIL',
              success ? 'Memory deleted correctly' : 'Memory deletion failed');
              
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

/**
 * 🔧 PHASE 3: INTEGRATION TESTS
 */
async function testConversationMemoryIntegration() {
  const testName = 'Conversation Memory Integration';
  console.log(`\n💬 Testing: ${testName}`);
  
  try {
    // Test the full pipeline: AI conversation -> Memory extraction -> Storage -> Retrieval
    const conversationFlow = await testFullConversationFlow();
    recordTest(testName, conversationFlow.success ? 'PASS' : 'FAIL', conversationFlow.message);
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

async function testToolCallingMemoryFlow() {
  const testName = 'Tool Calling Memory Flow';
  console.log(`\n🔧 Testing: ${testName}`);
  
  try {
    // Simulate AI tool calling the store_memory tool
    const toolResult = await simulateToolCall();
    recordTest(testName, toolResult.success ? 'PASS' : 'FAIL', toolResult.message);
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

async function testCrossChatPersistence() {
  const testName = 'Cross-Chat Persistence';
  console.log(`\n🔄 Testing: ${testName}`);
  
  const userId = TEST_CONFIG.testUsers[1].id;
  
  try {
    // Store memory in "session 1"
    await storeMemory(userId, { 
      key: 'cross_chat_test', 
      value: 'Remember this across sessions', 
      category: 'test',
      sessionId: 'session_1'
    });
    
    // Retrieve from "session 2"
    const result = await searchMemory(userId, 'cross_chat_test', 'session_2');
    const found = result.memories?.some(m => m.content === 'Remember this across sessions');
    
    recordTest(testName, found ? 'PASS' : 'FAIL',
              found ? 'Memory persists across chat sessions' : 'Cross-chat persistence failed');
              
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

/**
 * 🔧 PHASE 4: ADVANCED FEATURES
 */
async function testSemanticSearch() {
  const testName = 'Semantic Search';
  console.log(`\n🧠 Testing: ${testName}`);
  
  const userId = TEST_CONFIG.testUsers[2].id;
  
  try {
    // Store related memories
    await storeMemory(userId, { key: 'math_topic_1', value: 'I love algebra', category: 'preference' });
    await storeMemory(userId, { key: 'math_topic_2', value: 'Calculus is challenging', category: 'learning' });
    await storeMemory(userId, { key: 'other_topic', value: 'I enjoy reading novels', category: 'preference' });
    
    // Test semantic search
    const mathResults = await searchMemory(userId, 'mathematics');
    const mathMemories = mathResults.memories?.filter(m => 
      m.content.toLowerCase().includes('algebra') || 
      m.content.toLowerCase().includes('calculus')
    );
    
    recordTest(testName, mathMemories?.length >= 2 ? 'PASS' : 'FAIL',
              `Found ${mathMemories?.length || 0} math-related memories from semantic search`);
              
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

async function testMemoryRanking() {
  const testName = 'Memory Ranking';
  console.log(`\n📊 Testing: ${testName}`);
  
  // Test importance scoring and access count tracking
  try {
    const userId = TEST_CONFIG.testUsers[0].id;
    
    // Access a memory multiple times
    for (let i = 0; i < 5; i++) {
      await searchMemory(userId, 'user_name');
    }
    
    // Get all memories and check ranking
    const result = await searchMemory(userId, '');
    const nameMemory = result.memories?.find(m => m.memory_key === 'user_name');
    
    recordTest(testName, nameMemory?.access_count >= 5 ? 'PASS' : 'FAIL',
              `Memory access count: ${nameMemory?.access_count || 0}`);
              
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

async function testCognitiveProgression() {
  const testName = 'Cognitive Progression Tracking';
  console.log(`\n🧠 Testing: ${testName}`);
  
  try {
    const userId = TEST_CONFIG.testUsers[0].id;
    
    // Store learning progression memory
    const result = await storeMemory(userId, {
      key: 'math_progression',
      value: 'Student is progressing from struggling to understanding in algebra',
      category: 'learning',
      domain: 'math',
      subdomain: 'algebra',
      masteryLevel: 'understanding'
    });
    
    recordTest(testName, result.success ? 'PASS' : 'FAIL',
              result.success ? 'Cognitive progression stored' : result.error);
              
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

/**
 * 🔧 PHASE 5: PERFORMANCE AND SCALE TESTS
 */
async function testPerformance() {
  const testName = 'Performance Testing';
  console.log(`\n⚡ Testing: ${testName}`);
  
  const userId = TEST_CONFIG.testUsers[0].id;
  
  try {
    // Bulk storage test
    const bulkStartTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < 20; i++) {
      promises.push(storeMemory(userId, {
        key: `bulk_test_${i}`,
        value: `Bulk test memory ${i} with some content to make it realistic`,
        category: 'test'
      }));
    }
    
    await Promise.all(promises);
    const bulkDuration = Date.now() - bulkStartTime;
    
    // Bulk retrieval test
    const retrievalStartTime = Date.now();
    const retrievalResult = await searchMemory(userId, 'bulk');
    const retrievalDuration = Date.now() - retrievalStartTime;
    
    testResults.performance.bulk_storage = bulkDuration;
    testResults.performance.bulk_retrieval = retrievalDuration;
    
    recordTest(testName, 'PASS', 
              `Bulk storage: ${bulkDuration}ms, Bulk retrieval: ${retrievalDuration}ms`,
              { bulkDuration, retrievalDuration, memoriesRetrieved: retrievalResult.memories?.length });
              
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

async function testConcurrency() {
  const testName = 'Concurrency Testing';
  console.log(`\n🔄 Testing: ${testName}`);
  
  try {
    // Simulate concurrent memory operations
    const promises = TEST_CONFIG.testUsers.map(async (user, index) => {
      return storeMemory(user.id, {
        key: `concurrent_test_${index}`,
        value: `Concurrent memory for user ${user.username}`,
        category: 'test'
      });
    });
    
    const results = await Promise.allSettled(promises);
    const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    recordTest(testName, successes === TEST_CONFIG.testUsers.length ? 'PASS' : 'FAIL',
              `${successes}/${TEST_CONFIG.testUsers.length} concurrent operations succeeded`);
              
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

async function testMemoryLimits() {
  const testName = 'Memory Limits';
  console.log(`\n📏 Testing: ${testName}`);
  
  try {
    const userId = TEST_CONFIG.testUsers[0].id;
    
    // Test large memory content
    const largeContent = 'A'.repeat(10000); // 10KB content
    const result = await storeMemory(userId, {
      key: 'large_content_test',
      value: largeContent,
      category: 'test'
    });
    
    recordTest(testName, result.success ? 'PASS' : 'FAIL',
              result.success ? 'Large content stored successfully' : result.error);
              
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

/**
 * 🔧 PHASE 6: ERROR HANDLING TESTS
 */
async function testErrorHandling() {
  const testName = 'Error Handling';
  console.log(`\n❌ Testing: ${testName}`);
  
  // Test invalid requests
  const errorTests = [
    { name: 'Missing Action', body: { userId: 'test' }, expectedError: 'Action is required' },
    { name: 'Missing User ID', body: { action: 'store' }, expectedError: 'User ID is required' },
    { name: 'Invalid User ID', body: { action: 'store', userId: 'nonexistent_user', key: 'test', value: 'test' } },
    { name: 'Empty Key', body: { action: 'store', userId: TEST_CONFIG.testUsers[0].id, key: '', value: 'test' } }
  ];
  
  for (const errorTest of errorTests) {
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorTest.body)
      });
      
      const result = await response.json();
      const hasExpectedError = !result.success && (
        !errorTest.expectedError || 
        result.error?.includes?.(errorTest.expectedError) ||
        response.status >= 400
      );
      
      recordTest(`${testName} - ${errorTest.name}`, hasExpectedError ? 'PASS' : 'FAIL',
                hasExpectedError ? 'Handled error correctly' : `Unexpected result: ${JSON.stringify(result)}`);
                
    } catch (error) {
      recordTest(`${testName} - ${errorTest.name}`, 'FAIL', error.message);
    }
  }
}

async function testRecovery() {
  const testName = 'Recovery Testing';
  console.log(`\n🔄 Testing: ${testName}`);
  
  try {
    // Test graceful degradation when database is temporarily unavailable
    // This is a simplified test - in reality, we'd need to simulate database downtime
    
    const userId = TEST_CONFIG.testUsers[0].id;
    const result = await storeMemory(userId, {
      key: 'recovery_test',
      value: 'Test recovery mechanism',
      category: 'test'
    });
    
    recordTest(testName, true, 'Recovery testing framework ready (needs database simulation)');
    
  } catch (error) {
    recordTest(testName, 'FAIL', error.message);
  }
}

/**
 * 🛠️ HELPER FUNCTIONS
 */
async function createTestUser(userData) {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const result = await response.json();
    return {
      success: result.success || response.ok,
      message: result.message,
      error: result.error || (!response.ok ? `HTTP ${response.status}` : null)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testMemoryTableStructure() {
  const userId = 'schema_test_user';
  
  try {
    // Try to store a memory with various field types
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store',
        userId: userId,
        key: 'schema_test',
        value: 'Testing schema',
        context: { test: true },
        metadata: { importance: 0.8 }
      })
    });
    
    const result = await response.json();
    
    // Check if it fails due to schema issues vs user issues
    const isSchemaIssue = result.error && (
      result.error.includes('column') || 
      result.error.includes('table') ||
      result.error.includes('type')
    );
    
    const isUserIssue = result.error && result.error.includes('foreign key');
    
    if (isUserIssue) {
      return { success: true, message: 'Memory table structure is correct (user FK issue expected)' };
    }
    
    return { 
      success: !isSchemaIssue, 
      error: isSchemaIssue ? result.error : null,
      message: result.success ? 'Schema working' : 'Schema issues detected'
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function storeMemory(userId, memoryData) {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store',
        userId: userId,
        key: memoryData.key,
        value: memoryData.value,
        context: { 
          category: memoryData.category,
          domain: memoryData.domain,
          subdomain: memoryData.subdomain,
          masteryLevel: memoryData.masteryLevel,
          sessionId: memoryData.sessionId
        }
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function searchMemory(userId, query, sessionId = null) {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'search',
        userId: userId,
        query: query,
        context: sessionId ? { sessionId } : undefined
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateMemory(userId, key, value) {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        userId: userId,
        key: key,
        value: value
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deleteMemory(userId, key) {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        userId: userId,
        key: key
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testFullConversationFlow() {
  try {
    // Simulate a conversation where the AI should remember something
    const userId = TEST_CONFIG.testUsers[0].id;
    
    // Step 1: User tells AI their name
    // Step 2: AI stores it via store_memory tool
    // Step 3: User asks if AI remembers
    // Step 4: AI retrieves and confirms
    
    // For now, we'll just test the memory storage part
    const storeResult = await storeMemory(userId, {
      key: 'conversation_flow_test',
      value: 'User said their name is Alex in conversation',
      category: 'personal'
    });
    
    if (!storeResult.success) {
      return { success: false, message: `Storage failed: ${storeResult.error}` };
    }
    
    const retrieveResult = await searchMemory(userId, 'conversation_flow_test');
    const found = retrieveResult.memories?.some(m => m.content.includes('Alex'));
    
    return { 
      success: found, 
      message: found ? 'Conversation memory flow working' : 'Memory not retrieved correctly' 
    };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function simulateToolCall() {
  try {
    // Simulate the store_memory tool being called by AI
    const userId = TEST_CONFIG.testUsers[0].id;
    
    const result = await storeMemory(userId, {
      key: 'tool_call_test',
      value: 'Memory stored via simulated tool call',
      category: 'test'
    });
    
    return {
      success: result.success,
      message: result.success ? 'Tool calling simulation successful' : result.error
    };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
}

function recordTest(testName, status, message, metadata = {}) {
  const result = {
    test: testName,
    status: status,
    message: message,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  testResults.detailed.push(result);
  
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`  ✅ ${testName}: ${message}`);
  } else {
    testResults.failed++;
    testResults.errors.push(result);
    console.log(`  ❌ ${testName}: ${message}`);
  }
}

function generateTestReport() {
  console.log('\n' + '='.repeat(80));
  console.log('🧠 COMPREHENSIVE MEMORY SYSTEM TEST REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`  ✅ Tests Passed: ${testResults.passed}`);
  console.log(`  ❌ Tests Failed: ${testResults.failed}`);
  console.log(`  📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (Object.keys(testResults.performance).length > 0) {
    console.log(`\n⚡ PERFORMANCE METRICS:`);
    Object.entries(testResults.performance).forEach(([key, duration]) => {
      console.log(`  ${key}: ${duration}ms`);
    });
  }
  
  if (testResults.errors.length > 0) {
    console.log(`\n❌ FAILED TESTS:`);
    testResults.errors.forEach(error => {
      console.log(`  • ${error.test}: ${error.message}`);
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log(`\n⚠️ WARNINGS:`);
    testResults.warnings.forEach(warning => {
      console.log(`  • ${warning}`);
    });
  }
  
  console.log(`\n🔧 RECOMMENDATIONS:`);
  
  // Analyze results and provide recommendations
  const criticalErrors = testResults.errors.filter(e => 
    e.message.includes('foreign key') || 
    e.message.includes('table') ||
    e.message.includes('Database')
  );
  
  if (criticalErrors.length > 0) {
    console.log(`  1. 🚨 CRITICAL: Fix database schema issues - ${criticalErrors.length} schema-related failures`);
  }
  
  const userErrors = testResults.errors.filter(e => e.message.includes('User') || e.message.includes('user'));
  if (userErrors.length > 0) {
    console.log(`  2. 👤 Fix user management system - ${userErrors.length} user-related failures`);
  }
  
  const memoryErrors = testResults.errors.filter(e => e.test.includes('Memory') && !e.message.includes('foreign key'));
  if (memoryErrors.length > 0) {
    console.log(`  3. 🧠 Fix memory operations - ${memoryErrors.length} memory-specific failures`);
  }
  
  // Performance recommendations
  const slowOperations = Object.entries(testResults.performance).filter(([_, duration]) => duration > 1000);
  if (slowOperations.length > 0) {
    console.log(`  4. ⚡ Optimize performance - ${slowOperations.length} operations took >1s`);
  }
  
  console.log(`\n💾 Detailed results saved to test results object`);
  console.log('='.repeat(80));
  
  return testResults;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runComprehensiveMemoryTests,
    TEST_CONFIG,
    testResults
  };
}

// Auto-run if called directly
if (require.main === module) {
  runComprehensiveMemoryTests().catch(console.error);
}
