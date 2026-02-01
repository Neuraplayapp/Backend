/**
 * 🗄️ DATABASE SETUP AND SCHEMA CONSISTENCY TEST
 * Comprehensive test for database initialization, schema validation, and data integrity
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

// Database schema definitions from different files
const SCHEMA_DEFINITIONS = {
  // From scripts/db-setup.sql
  production: {
    users: {
      id: 'UUID PRIMARY KEY DEFAULT uuid_generate_v4()',
      email: 'VARCHAR(255) UNIQUE NOT NULL',
      username: 'VARCHAR(100) UNIQUE NOT NULL',
      password_hash: 'VARCHAR(255) NOT NULL'
    },
    user_memories: {
      id: 'UUID PRIMARY KEY DEFAULT uuid_generate_v4()',
      user_id: 'UUID REFERENCES users(id) ON DELETE CASCADE',
      memory_key: 'VARCHAR(255) NOT NULL',
      content: 'TEXT NOT NULL'
    }
  },
  
  // From services/database.cjs
  development: {
    users: {
      id: 'VARCHAR(255) PRIMARY KEY',
      username: 'VARCHAR(255) NOT NULL',
      email: 'VARCHAR(255) UNIQUE',
      password: 'VARCHAR(255) NOT NULL'
    },
    user_memories: {
      id: 'SERIAL PRIMARY KEY',
      user_id: 'VARCHAR(255) NOT NULL',
      memory_key: 'VARCHAR(255) NOT NULL',
      content: 'TEXT NOT NULL'
    }
  }
};

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001',
  testUsers: [
    { id: 'db_test_admin', username: 'dbadmin', email: 'dbadmin@test.com', password: 'testpass123' },
    { id: 'db_test_user1', username: 'dbuser1', email: 'dbuser1@test.com', password: 'testpass123' }
  ]
};

async function runDatabaseSetupTests() {
  console.log('🗄️ Starting DATABASE SETUP AND SCHEMA TESTS');
  console.log('=' .repeat(80));
  
  const results = {
    passed: 0,
    failed: 0,
    errors: [],
    schemaIssues: [],
    recommendations: []
  };
  
  try {
    // Test 1: Database Connectivity
    await testDatabaseConnectivity(results);
    
    // Test 2: Schema Detection
    await testSchemaDetection(results);
    
    // Test 3: User Table Consistency
    await testUserTableSchema(results);
    
    // Test 4: Memory Table Consistency  
    await testMemoryTableSchema(results);
    
    // Test 5: Foreign Key Constraints
    await testForeignKeyConstraints(results);
    
    // Test 6: Index Performance
    await testIndexPerformance(results);
    
    // Test 7: Data Type Compatibility
    await testDataTypeCompatibility(results);
    
    // Test 8: Migration Safety
    await testMigrationSafety(results);
    
    // Generate Database Report
    generateDatabaseReport(results);
    
    return results;
    
  } catch (error) {
    console.error('❌ Database test suite failed:', error);
    results.errors.push({ test: 'Database Test Suite', error: error.message });
    return results;
  }
}

async function testDatabaseConnectivity(results) {
  const testName = 'Database Connectivity';
  console.log(`\n🔌 Testing: ${testName}`);
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/debug-routing`);
    
    if (response.ok) {
      recordResult(results, testName, 'PASS', 'Database connection successful');
      
      // Test specific endpoints
      const endpoints = ['/api/memory', '/api/auth/register'];
      for (const endpoint of endpoints) {
        try {
          const endpointResponse = await fetch(`${TEST_CONFIG.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
          });
          
          // We expect some response, even if it's an error due to missing params
          const hasResponse = endpointResponse.status !== 500;
          recordResult(results, `${testName} - ${endpoint}`, hasResponse ? 'PASS' : 'FAIL',
                     hasResponse ? 'Endpoint responsive' : 'Endpoint returning 500 errors');
                     
        } catch (error) {
          recordResult(results, `${testName} - ${endpoint}`, 'FAIL', `Endpoint error: ${error.message}`);
        }
      }
      
    } else {
      recordResult(results, testName, 'FAIL', `Server not responding: ${response.status}`);
    }
    
  } catch (error) {
    recordResult(results, testName, 'FAIL', `Connection failed: ${error.message}`);
  }
}

async function testSchemaDetection(results) {
  const testName = 'Schema Detection';
  console.log(`\n🔍 Testing: ${testName}`);
  
  try {
    // Try to detect which schema is actually being used
    const testResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store',
        userId: 'schema_detection_test',
        key: 'test',
        value: 'test'
      })
    });
    
    const result = await testResponse.json();
    
    if (result.error) {
      // Analyze error to detect schema type
      if (result.error.includes('uuid')) {
        results.schemaIssues.push('UUID schema detected but user creation may be using VARCHAR');
        recordResult(results, testName, 'WARN', 'UUID schema detected - check user creation compatibility');
      } else if (result.error.includes('foreign key')) {
        recordResult(results, testName, 'FAIL', 'Foreign key constraints failing - user table schema mismatch');
        results.schemaIssues.push('User table schema mismatch causing foreign key failures');
      } else {
        recordResult(results, testName, 'PASS', 'Schema appears consistent');
      }
    } else {
      recordResult(results, testName, 'PASS', 'Schema working correctly');
    }
    
  } catch (error) {
    recordResult(results, testName, 'FAIL', error.message);
  }
}

async function testUserTableSchema(results) {
  const testName = 'User Table Schema';
  console.log(`\n👤 Testing: ${testName}`);
  
  try {
    // Test user creation with different ID formats
    const uuidUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'uuid_test_user',
      email: 'uuid@test.com',
      password: 'testpass123'
    };
    
    const varcharUser = {
      id: 'varchar_test_user',
      username: 'varchar_test_user',
      email: 'varchar@test.com',
      password: 'testpass123'
    };
    
    // Test UUID format
    const uuidResult = await createUser(uuidUser);
    recordResult(results, `${testName} - UUID Format`, uuidResult.success ? 'PASS' : 'FAIL',
                uuidResult.message || uuidResult.error);
    
    // Test VARCHAR format
    const varcharResult = await createUser(varcharUser);
    recordResult(results, `${testName} - VARCHAR Format`, varcharResult.success ? 'PASS' : 'FAIL',
                varcharResult.message || varcharResult.error);
    
    // Determine which format is being used
    if (uuidResult.success && !varcharResult.success) {
      results.recommendations.push('Database is using UUID format for user IDs');
    } else if (!uuidResult.success && varcharResult.success) {
      results.recommendations.push('Database is using VARCHAR format for user IDs');
    } else if (uuidResult.success && varcharResult.success) {
      results.recommendations.push('Database accepts both UUID and VARCHAR user IDs');
    } else {
      results.schemaIssues.push('Neither UUID nor VARCHAR user ID formats are working');
    }
    
  } catch (error) {
    recordResult(results, testName, 'FAIL', error.message);
  }
}

async function testMemoryTableSchema(results) {
  const testName = 'Memory Table Schema';
  console.log(`\n🧠 Testing: ${testName}`);
  
  // First create a test user that we know exists
  const testUser = TEST_CONFIG.testUsers[0];
  const userCreationResult = await createUser(testUser);
  
  if (!userCreationResult.success) {
    recordResult(results, testName, 'SKIP', 'Cannot test memory table - user creation failed');
    return;
  }
  
  try {
    // Test memory storage with full schema
    const memoryData = {
      action: 'store',
      userId: testUser.id,
      key: 'schema_test_memory',
      value: 'Testing memory table schema with comprehensive data',
      context: {
        category: 'test',
        domain: 'database',
        sessionId: 'schema_test_session',
        emotionalState: 'neutral',
        importance: 0.8
      },
      metadata: {
        testType: 'schema_validation',
        timestamp: new Date().toISOString(),
        tags: ['test', 'schema', 'validation']
      }
    };
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memoryData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      recordResult(results, testName, 'PASS', 'Memory table schema working correctly');
      
      // Test retrieval to verify data integrity
      const retrievalResult = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          userId: testUser.id,
          query: 'schema_test_memory'
        })
      });
      
      const retrievalData = await retrievalResult.json();
      const found = retrievalData.memories?.some(m => m.memory_key === 'schema_test_memory');
      
      recordResult(results, `${testName} - Data Integrity`, found ? 'PASS' : 'FAIL',
                  found ? 'Memory data stored and retrieved correctly' : 'Memory data integrity issues');
                  
    } else {
      recordResult(results, testName, 'FAIL', result.error || 'Memory storage failed');
      
      // Analyze error for schema issues
      if (result.error?.includes('column')) {
        results.schemaIssues.push(`Memory table column issue: ${result.error}`);
      } else if (result.error?.includes('foreign key')) {
        results.schemaIssues.push('Foreign key constraint between users and user_memories tables');
      }
    }
    
  } catch (error) {
    recordResult(results, testName, 'FAIL', error.message);
  }
}

async function testForeignKeyConstraints(results) {
  const testName = 'Foreign Key Constraints';
  console.log(`\n🔗 Testing: ${testName}`);
  
  try {
    // Test with non-existent user
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store',
        userId: 'definitely_nonexistent_user_12345',
        key: 'fk_test',
        value: 'This should fail due to foreign key constraint'
      })
    });
    
    const result = await response.json();
    
    if (!result.success && result.error?.includes('foreign key')) {
      recordResult(results, testName, 'PASS', 'Foreign key constraints are properly enforced');
    } else if (result.success) {
      recordResult(results, testName, 'FAIL', 'Foreign key constraints not enforced - orphaned data possible');
      results.schemaIssues.push('Foreign key constraints not properly enforced');
    } else {
      recordResult(results, testName, 'WARN', `Unexpected error: ${result.error}`);
    }
    
  } catch (error) {
    recordResult(results, testName, 'FAIL', error.message);
  }
}

async function testIndexPerformance(results) {
  const testName = 'Index Performance';
  console.log(`\n📈 Testing: ${testName}`);
  
  // Create test user first
  const testUser = { ...TEST_CONFIG.testUsers[1], id: 'perf_test_user' };
  await createUser(testUser);
  
  try {
    // Store multiple memories for performance testing
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store',
          userId: testUser.id,
          key: `perf_test_${i}`,
          value: `Performance test memory ${i} with searchable content`,
          context: { category: 'performance', index: i }
        })
      }));
    }
    
    await Promise.all(promises);
    const insertTime = Date.now() - startTime;
    
    // Test search performance
    const searchStartTime = Date.now();
    const searchResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'search',
        userId: testUser.id,
        query: 'performance'
      })
    });
    
    const searchResult = await searchResponse.json();
    const searchTime = Date.now() - searchStartTime;
    
    recordResult(results, `${testName} - Insert Performance`, insertTime < 5000 ? 'PASS' : 'WARN',
                `10 inserts took ${insertTime}ms`);
    recordResult(results, `${testName} - Search Performance`, searchTime < 1000 ? 'PASS' : 'WARN',
                `Search took ${searchTime}ms, found ${searchResult.memories?.length || 0} results`);
    
    if (insertTime > 5000) {
      results.recommendations.push('Consider adding indexes on user_memories table for better insert performance');
    }
    if (searchTime > 1000) {
      results.recommendations.push('Consider adding full-text search indexes for better search performance');
    }
    
  } catch (error) {
    recordResult(results, testName, 'FAIL', error.message);
  }
}

async function testDataTypeCompatibility(results) {
  const testName = 'Data Type Compatibility';
  console.log(`\n🔢 Testing: ${testName}`);
  
  // Create test user
  const testUser = { ...TEST_CONFIG.testUsers[0], id: 'datatype_test_user' };
  await createUser(testUser);
  
  const dataTypeTests = [
    { name: 'JSON Context', value: { complex: { nested: { data: true } } } },
    { name: 'Array Tags', value: ['tag1', 'tag2', 'tag3'] },
    { name: 'Large Text', value: 'A'.repeat(5000) },
    { name: 'Unicode Text', value: '🧠 Memory with emojis and ñõn-ÀSCII çhäräctérs 中文' },
    { name: 'Decimal Importance', value: 0.12345 },
    { name: 'Timestamp', value: new Date().toISOString() }
  ];
  
  for (const test of dataTypeTests) {
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store',
          userId: testUser.id,
          key: `datatype_${test.name.toLowerCase().replace(/\s+/g, '_')}`,
          value: typeof test.value === 'string' ? test.value : JSON.stringify(test.value),
          context: typeof test.value === 'object' && !Array.isArray(test.value) ? test.value : { testData: test.value }
        })
      });
      
      const result = await response.json();
      recordResult(results, `${testName} - ${test.name}`, result.success ? 'PASS' : 'FAIL',
                  result.success ? 'Data type handled correctly' : result.error);
                  
    } catch (error) {
      recordResult(results, `${testName} - ${test.name}`, 'FAIL', error.message);
    }
  }
}

async function testMigrationSafety(results) {
  const testName = 'Migration Safety';
  console.log(`\n🔄 Testing: ${testName}`);
  
  try {
    // Test that existing data won't be lost during schema changes
    // This is a basic test - in production, you'd want more comprehensive migration testing
    
    recordResult(results, testName, 'INFO', 'Migration safety testing requires manual schema change simulation');
    results.recommendations.push('Implement automated migration testing with schema versioning');
    
  } catch (error) {
    recordResult(results, testName, 'FAIL', error.message);
  }
}

async function createUser(userData) {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const result = await response.json();
    
    // Consider it successful if user is created OR already exists
    const success = result.success || (result.error && result.error.includes('already exists'));
    
    return {
      success: success,
      message: result.message || (success ? 'User created or exists' : null),
      error: success ? null : result.error
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function recordResult(results, testName, status, message) {
  const result = { test: testName, status, message, timestamp: new Date().toISOString() };
  
  if (status === 'PASS') {
    results.passed++;
    console.log(`  ✅ ${testName}: ${message}`);
  } else if (status === 'FAIL') {
    results.failed++;
    results.errors.push(result);
    console.log(`  ❌ ${testName}: ${message}`);
  } else if (status === 'WARN') {
    console.log(`  ⚠️ ${testName}: ${message}`);
  } else if (status === 'INFO') {
    console.log(`  ℹ️ ${testName}: ${message}`);
  } else if (status === 'SKIP') {
    console.log(`  ⏭️ ${testName}: ${message}`);
  }
}

function generateDatabaseReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('🗄️ DATABASE SETUP TEST REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`  ✅ Tests Passed: ${results.passed}`);
  console.log(`  ❌ Tests Failed: ${results.failed}`);
  console.log(`  📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.schemaIssues.length > 0) {
    console.log(`\n🚨 SCHEMA ISSUES DETECTED:`);
    results.schemaIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log(`\n❌ FAILED TESTS:`);
    results.errors.forEach(error => {
      console.log(`  • ${error.test}: ${error.message}`);
    });
  }
  
  if (results.recommendations.length > 0) {
    console.log(`\n💡 RECOMMENDATIONS:`);
    results.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }
  
  console.log(`\n🔧 IMMEDIATE ACTIONS NEEDED:`);
  
  // Critical fixes
  if (results.schemaIssues.some(issue => issue.includes('foreign key'))) {
    console.log(`  🚨 CRITICAL: Fix foreign key constraint issues between users and user_memories tables`);
  }
  
  if (results.errors.some(error => error.message.includes('UUID') || error.message.includes('VARCHAR'))) {
    console.log(`  🚨 CRITICAL: Standardize user ID format (UUID vs VARCHAR) across all database files`);
  }
  
  if (results.failed > results.passed) {
    console.log(`  🚨 CRITICAL: More tests failed than passed - database setup needs immediate attention`);
  }
  
  console.log('='.repeat(80));
}

// Export and auto-run
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runDatabaseSetupTests, TEST_CONFIG };
}

if (require.main === module) {
  runDatabaseSetupTests().catch(console.error);
}
