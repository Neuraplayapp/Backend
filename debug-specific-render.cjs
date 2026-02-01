#!/usr/bin/env node

/**
 * RENDER-SPECIFIC DEBUG SCRIPT
 * Tests if the issue is happening on Render backend specifically
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugRenderSpecific() {
  console.log('🔍 RENDER-SPECIFIC DEBUG');
  console.log('========================\n');

  // Test if environment detection is working correctly
  console.log('📋 ENVIRONMENT DETECTION TEST:');
  console.log('   NODE_ENV:', process.env.NODE_ENV);
  console.log('   RENDER:', process.env.RENDER);
  console.log('   RENDER_EXTERNAL_HOSTNAME:', process.env.RENDER_EXTERNAL_HOSTNAME);
  
  const isLocalDevelopment = !process.env.RENDER && process.env.NODE_ENV !== 'production';
  const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
  
  console.log('   Detected as Local Development:', isLocalDevelopment);
  console.log('   Detected as Render/Production:', isRender);
  
  if (isLocalDevelopment) {
    console.log('   ✅ Running in LOCAL mode - will forward to Render');
  } else {
    console.log('   ✅ Running in RENDER mode - will handle directly');
  }

  // Test the unified-route directly with debug logging
  console.log('\n🔍 TESTING UNIFIED-ROUTE LOGIC:');
  
  try {
    // Simulate the exact request that's failing
    const testData = {
      service: 'fireworks',
      endpoint: 'image-generation',
      data: {
        prompt: 'test image',
        model: 'flux-1-schnell-fp8'
      }
    };

    console.log('   Request Data:', JSON.stringify(testData, null, 2));
    
    // Call the unified-route.cjs logic directly
    const { handleFireworksRequest } = require('./routes/unified-route.cjs');
    
    console.log('   ✅ Successfully imported unified-route functions');
    
  } catch (error) {
    console.log('   ❌ Error importing/testing unified-route:', error.message);
    console.log('   Stack:', error.stack);
  }

  // Check if there are any remaining files with fetch calls
  console.log('\n🔍 CHECKING FOR REMAINING FETCH ISSUES:');
  
  const fs = require('fs');
  const path = require('path');
  
  function findFetchCalls(dir, results = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        findFetchCalls(fullPath, results);
      } else if (file.endsWith('.cjs') || file.endsWith('.js')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            if (line.includes('fetch(') && line.includes("'/") && !line.includes('http')) {
              results.push({
                file: fullPath,
                line: index + 1,
                content: line.trim()
              });
            }
          });
        } catch (e) {
          // Skip files that can't be read
        }
      }
    }
    
    return results;
  }
  
  const fetchCalls = findFetchCalls('./');
  
  if (fetchCalls.length > 0) {
    console.log('   ❌ Found potential remaining fetch issues:');
    fetchCalls.forEach(call => {
      console.log(`      ${call.file}:${call.line} - ${call.content}`);
    });
  } else {
    console.log('   ✅ No obvious remaining fetch issues found');
  }

  console.log('\n🔍 DEBUG COMPLETE');
}

// Run if called directly
if (require.main === module) {
  debugRenderSpecific().catch(console.error);
}

module.exports = { debugRenderSpecific };
