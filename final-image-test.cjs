#!/usr/bin/env node

/**
 * FINAL IMAGE GENERATION TEST
 * Simulates the exact flow that should work
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function finalImageTest() {
  console.log('🎯 FINAL IMAGE GENERATION TEST');
  console.log('===============================\n');

  // Test the exact flow that CoreTools.ts uses
  console.log('🔧 TESTING CORETOOLS FLOW:');
  
  try {
    // Simulate UnifiedAPIRouter.routeAPICall
    console.log('   Simulating: UnifiedAPIRouter.routeAPICall()');
    
    const requestData = {
      service: 'fireworks',
      endpoint: 'image-generation',
      data: {
        prompt: 'test image generation',
        style: 'realistic',
        size: '1024x1024',
        steps: 4,
        seed: 12345,
        model: 'flux-1-schnell-fp8'
      }
    };

    console.log('   Request payload:', JSON.stringify(requestData, null, 2));

    // Make the actual call that should work
    const response = await fetch('http://localhost:3001/api/unified-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    console.log('   Response Status:', response.status);
    console.log('   Response OK:', response.ok);

    if (response.ok) {
      const result = await response.json();
      console.log('   ✅ SUCCESS! Image generation worked');
      console.log('   Response keys:', Object.keys(result));
      
      if (result.success && result.data) {
        console.log('   Has image_url:', !!result.data.image_url);
        console.log('   Image URL type:', typeof result.data.image_url);
        if (result.data.image_url) {
          console.log('   Image URL length:', result.data.image_url.length);
          console.log('   Starts with data:image:', result.data.image_url.startsWith('data:image/'));
        }
      }
    } else {
      const errorText = await response.text();
      console.log('   ❌ FAILED with error:', errorText);
      
      // Analyze the error
      if (errorText.includes('Only absolute URLs are supported')) {
        console.log('   🔍 This is the persistent relative URL issue');
        console.log('   🔍 The error is happening on Render backend, not locally');
      }
    }

  } catch (error) {
    console.log('   ❌ Exception:', error.message);
  }

  console.log('\n🎯 TEST COMPLETE');
  console.log('===============================');
}

// Run if called directly
if (require.main === module) {
  finalImageTest().catch(console.error);
}

module.exports = { finalImageTest };
