const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing API with "make a roadmap"...');
    
    const response = await fetch('http://localhost:3001/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_type: 'ai_chat',
        input_data: 'make a roadmap',
        sessionId: 'test_session',
        userId: 'test_user'
      })
    });
    
    const responseText = await response.text();
    
    console.log('Status:', response.status);
    console.log('Response:', responseText);
    
    if (!response.ok) {
      console.log('❌ Request failed with status:', response.status);
      console.log('❌ Error details:', responseText);
    } else {
      const data = JSON.parse(responseText);
      console.log('✅ Success:', data.success);
      if (data.error) {
        console.log('❌ API Error:', data.error);
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
