const fetch = require('node-fetch');

// Test configuration
const TESTS = [
  {
    name: "LOCAL unified-route direct",
    url: "http://localhost:3001/api/unified-route",
    payload: {
      service: "fireworks",
      endpoint: "llm-completion", 
      data: {
        messages: [{ role: "user", content: "test local direct" }]
      }
    }
  },
  {
    name: "RENDER unified-route direct",
    url: "https://neuraplay.onrender.com/api/unified-route", 
    payload: {
      service: "fireworks",
      endpoint: "llm-completion",
      data: {
        messages: [{ role: "user", content: "test render direct" }]
      }
    }
  },
  {
    name: "RENDER /api endpoint (what local forwards to)",
    url: "https://neuraplay.onrender.com/api",
    payload: {
      task_type: "chat",
      input_data: {
        messages: [{ role: "user", content: "test render api" }],
        max_tokens: 1000,
        temperature: 0.7,
        model: "accounts/fireworks/models/gpt-oss-120b"
      }
    }
  },
  {
    name: "LOCAL debug endpoint",
    url: "http://localhost:3001/api/unified-route/debug",
    method: "GET"
  },
  {
    name: "RENDER debug endpoint", 
    url: "https://neuraplay.onrender.com/api/unified-route/debug",
    method: "GET"
  }
];

async function testEndpoint(test) {
  console.log(`\n🔍 Testing: ${test.name}`);
  console.log(`📍 URL: ${test.url}`);
  
  try {
    const options = {
      method: test.method || "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };
    
    if (test.payload) {
      options.body = JSON.stringify(test.payload);
      console.log(`📤 Payload:`, JSON.stringify(test.payload, null, 2));
    }
    
    const startTime = Date.now();
    const response = await fetch(test.url, options);
    const duration = Date.now() - startTime;
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`⏱️ Duration: ${duration}ms`);
    
    const responseText = await response.text();
    console.log(`📥 Response length: ${responseText.length} characters`);
    
    if (responseText) {
      try {
        const json = JSON.parse(responseText);
        console.log(`✅ Valid JSON response:`);
        
        if (json.success !== undefined) {
          console.log(`   Success: ${json.success}`);
        }
        if (json.error) {
          console.log(`   Error: ${json.error}`);
        }
        if (json.details) {
          console.log(`   Details: ${json.details}`);
        }
        if (json.response) {
          console.log(`   Response: ${json.response.substring(0, 100)}...`);
        }
        if (json.message) {
          console.log(`   Message: ${json.message}`);
        }
        
        return { success: true, status: response.status, data: json, duration };
        
      } catch (parseError) {
        console.log(`❌ Invalid JSON response:`);
        console.log(`   Raw: ${responseText.substring(0, 200)}...`);
        return { success: false, status: response.status, error: "Invalid JSON", duration };
      }
    } else {
      console.log(`⚠️ Empty response`);
      return { success: false, status: response.status, error: "Empty response", duration };
    }
    
  } catch (error) {
    console.log(`❌ Request failed:`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code || 'N/A'}`);
    return { success: false, error: error.message, duration: 0 };
  }
}

async function runAllTests() {
  console.log('🚀 COMPREHENSIVE API TESTING SCRIPT');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const test of TESTS) {
    const result = await testEndpoint(test);
    results.push({ name: test.name, ...result });
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name} - Status: ${result.status || 'N/A'} - Duration: ${result.duration}ms`);
    if (result.error) {
      console.log(`   └─ Error: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Results: ${successCount}/${results.length} tests passed`);
  
  if (successCount === 0) {
    console.log('\n🚨 ALL TESTS FAILED - System is completely broken');
  } else if (successCount < results.length) {
    console.log('\n⚠️ PARTIAL SUCCESS - Some endpoints are broken');
  } else {
    console.log('\n🎉 ALL TESTS PASSED - System is working correctly');
  }
}

// Run the tests
runAllTests().catch(console.error);
