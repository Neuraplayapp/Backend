/**
 * Simple test script for NSM API
 * 
 * Usage: node test_api.js
 */

const API_BASE = 'http://localhost:3001/api/ml';

async function testAPI() {
  console.log('🧪 Testing NSM ML API...\n');
  
  // 1. Check model status
  console.log('1️⃣ Checking model status...');
  try {
    const res = await fetch(`${API_BASE}/model-status`);
    const data = await res.json();
    console.log('   Result:', JSON.stringify(data, null, 2));
    console.log('   ✅ Model status endpoint working\n');
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
  }
  
  // 2. Schedule a review (will use rule-based fallback if model not trained)
  console.log('2️⃣ Scheduling a review...');
  try {
    const res = await fetch(`${API_BASE}/schedule-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test_user_' + Date.now(),
        itemId: 'test_item_' + Date.now(),
        feedback: 'good',
        responseTime: 3500
      })
    });
    const data = await res.json();
    console.log('   Result:', JSON.stringify(data, null, 2));
    console.log('   ✅ Schedule review endpoint working\n');
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
  }
  
  // 3. Get stats for test user
  console.log('3️⃣ Getting user stats...');
  try {
    const res = await fetch(`${API_BASE}/stats/test_user`);
    const data = await res.json();
    console.log('   Result:', JSON.stringify(data, null, 2));
    console.log('   ✅ Stats endpoint working\n');
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
  }
  
  console.log('🎉 API test complete!');
  console.log('\n📝 Notes:');
  console.log('   - If model_available is false, system uses rule-based fallback');
  console.log('   - Collect 500+ training examples, then POST to /api/ml/train-model');
  console.log('   - Once trained, method will change to "neural_network"');
}

// Run tests
testAPI().catch(console.error);

