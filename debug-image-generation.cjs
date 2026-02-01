#!/usr/bin/env node

/**
 * COMPREHENSIVE IMAGE GENERATION DEBUG SCRIPT
 * Tests the complete image generation pipeline
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugImageGeneration() {
  console.log('🔍 ===============================================');
  console.log('🔍 IMAGE GENERATION COMPREHENSIVE DEBUG SCRIPT');
  console.log('🔍 ===============================================\n');

  // 1. Environment Check
  console.log('📋 ENVIRONMENT ANALYSIS:');
  console.log('   NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('   PORT:', process.env.PORT || 'undefined');
  console.log('   RENDER_EXTERNAL_HOSTNAME:', process.env.RENDER_EXTERNAL_HOSTNAME || 'undefined');
  console.log('   Neuraplay API Key:', process.env.Neuraplay ? 'SET' : 'NOT SET');
  console.log('   FIREWORKS_API_KEY:', process.env.FIREWORKS_API_KEY ? 'SET' : 'NOT SET');
  
  const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
  const isLocal = !isRender;
  console.log('   Environment Type:', isRender ? 'RENDER/PRODUCTION' : 'LOCAL DEVELOPMENT');
  
  const baseUrl = isRender 
    ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'neuraplay-ai-platform.onrender.com'}` 
    : 'http://localhost:3001';
  console.log('   Base URL:', baseUrl);
  console.log('');

  // 2. Test Unified Route Health
  console.log('🔍 TESTING UNIFIED ROUTE HEALTH:');
  try {
    const healthResponse = await fetch(`${baseUrl}/api/unified-route/debug`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('   ✅ Unified route is responsive');
      console.log('   Response:', JSON.stringify(healthData, null, 2));
    } else {
      console.log('   ❌ Unified route health check failed:', healthResponse.status);
      const errorText = await healthResponse.text();
      console.log('   Error:', errorText.slice(0, 200));
    }
  } catch (error) {
    console.log('   ❌ Unified route unreachable:', error.message);
  }
  console.log('');

  // 3. Test Image Generation Service
  console.log('🎨 TESTING IMAGE GENERATION SERVICE:');
  const testPrompt = 'A beautiful sunset over mountains';
  
  try {
    console.log('   Prompt:', testPrompt);
    console.log('   Target URL:', `${baseUrl}/api/unified-route`);
    
    const imageResponse = await fetch(`${baseUrl}/api/unified-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        service: 'fireworks',
        endpoint: 'image-generation',
        data: {
          prompt: testPrompt,
          model: 'flux-1-schnell-fp8'
        }
      })
    });

    console.log('   Response Status:', imageResponse.status);
    console.log('   Response OK:', imageResponse.ok);
    console.log('   Response Headers:', Object.fromEntries(imageResponse.headers.entries()));

    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      console.log('   ✅ Image generation successful!');
      console.log('   Response keys:', Object.keys(imageData));
      
      if (imageData.success && imageData.data) {
        console.log('   Image URL length:', imageData.data.image_url?.length || 0);
        console.log('   Image URL starts with data:', imageData.data.image_url?.startsWith('data:image/'));
        console.log('   Content Type:', imageData.data.contentType || 'unknown');
      }
    } else {
      const errorText = await imageResponse.text();
      console.log('   ❌ Image generation failed');
      console.log('   Error Response:', errorText);
      
      // Try to parse error as JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.log('   Parsed Error:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('   Raw Error:', errorText.slice(0, 500));
      }
    }
  } catch (error) {
    console.log('   ❌ Request failed:', error.message);
    console.log('   Stack:', error.stack);
  }
  console.log('');

  // 4. Test Direct ImageGeneration.cjs
  if (!isRender) {
    console.log('🔧 TESTING LOCAL IMAGEGENERATION.CJS:');
    try {
      const { handleImageGeneration } = require('./services/imageGeneration.cjs');
      const result = await handleImageGeneration(
        { prompt: testPrompt }, 
        process.env.Neuraplay || process.env.FIREWORKS_API_KEY || 'demo'
      );
      
      console.log('   ✅ ImageGeneration.cjs working locally');
      console.log('   Result keys:', Object.keys(result));
      console.log('   Has image_url:', !!result.image_url);
    } catch (error) {
      console.log('   ❌ ImageGeneration.cjs failed:', error.message);
    }
    console.log('');
  }

  // 5. Network Connectivity Test
  console.log('🌐 TESTING EXTERNAL API CONNECTIVITY:');
  try {
    const fireworksTest = await fetch('https://api.fireworks.ai/inference/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.Neuraplay || process.env.FIREWORKS_API_KEY || 'test'}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('   Fireworks API Response:', fireworksTest.status);
    if (fireworksTest.status === 401) {
      console.log('   ⚠️ API key invalid (expected for demo keys)');
    } else if (fireworksTest.ok) {
      console.log('   ✅ Fireworks API accessible');
    } else {
      console.log('   ❌ Fireworks API error:', fireworksTest.status);
    }
  } catch (error) {
    console.log('   ❌ Network connectivity issue:', error.message);
  }

  console.log('\n🔍 ===============================================');
  console.log('🔍 DEBUG COMPLETE');
  console.log('🔍 ===============================================');
}

// Run if called directly
if (require.main === module) {
  debugImageGeneration().catch(console.error);
}

module.exports = { debugImageGeneration };
