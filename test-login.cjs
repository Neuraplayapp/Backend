/**
 * Test the login endpoint directly
 */

async function testLogin() {
  const testPassword = 'TestPassword123';
  
  console.log('\n🔐 Testing login endpoint...');
  console.log('Email: smt@neuraplay.biz');
  console.log('Password:', testPassword);
  console.log('Endpoint: http://localhost:3001/api/auth/login\n');
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'smt@neuraplay.biz',
        password: testPassword
      })
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Login successful!');
      console.log('User ID:', data.user?.id);
      console.log('Username:', data.user?.username);
      console.log('Role:', data.user?.role);
    } else {
      console.log('\n❌ Login failed!');
      console.log('Message:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin();



