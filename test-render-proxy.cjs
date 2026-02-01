#!/usr/bin/env node

/**
 * FOCUSED RENDER PROXY TEST
 * Tests direct communication with Render backend
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRenderProxy() {
  console.log('🔍 RENDER PROXY TEST');
  console.log('==================\n');

  const RENDER_BACKEND_URL = 'https://neuraplay-ai-platform.onrender.com';
  const LOCAL_URL = 'http://localhost:3001';

  // Test 1: Direct Render backend call
  console.log('📡 TESTING DIRECT RENDER BACKEND:');
  try {
    const directResponse = await fetch(`${RENDER_BACKEND_URL}/api/unified-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        service: 'fireworks',
        endpoint: 'image-generation',
        data: {
          prompt: 'test image',
          model: 'flux-1-schnell-fp8'
        }
      })
    });

    console.log('   Status:', directResponse.status);
    console.log('   OK:', directResponse.ok);
    
    const directData = await directResponse.text();
    console.log('   Response:', directData.slice(0, 500));
    
    if (directData.includes('Only absolute URLs are supported')) {
      console.log('   🔍 FOUND THE ISSUE: Render backend has relative URL fetch call');
    }
    
  } catch (error) {
    console.log('   Error:', error.message);
  }

  console.log('\n📡 TESTING LOCAL PROXY TO RENDER:');
  try {
    const proxyResponse = await fetch(`${LOCAL_URL}/api/unified-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        service: 'fireworks',
        endpoint: 'image-generation',
        data: {
          prompt: 'test image',
          model: 'flux-1-schnell-fp8'
        }
      })
    });

    console.log('   Status:', proxyResponse.status);
    console.log('   OK:', proxyResponse.ok);
    
    const proxyData = await proxyResponse.text();
    console.log('   Response:', proxyData.slice(0, 500));
    
  } catch (error) {
    console.log('   Error:', error.message);
  }

  console.log('\n🔍 ANALYSIS COMPLETE');
}

// Run if called directly
if (require.main === module) {
  testRenderProxy().catch(console.error);
}

module.exports = { testRenderProxy };
