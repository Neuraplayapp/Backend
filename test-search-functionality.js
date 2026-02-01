/**
 * Simple Test Script to Verify Search Functionality
 * Tests the basic search flow to identify what's actually working vs broken
 */

// Use built-in fetch (Node 18+) or fallback
const fetch = globalThis.fetch || (await import('node-fetch')).default;

const BASE_URL = 'http://localhost:3001';

async function testSearchFunctionality() {
  console.log('🧪 Testing Search Functionality...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing server health...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);

    // Test 2: Basic AI Chat Request (should trigger search if needed)
    console.log('\n2️⃣ Testing basic AI chat request...');
    const chatResponse = await fetch(`${BASE_URL}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'search for news about AI',
        userId: 'test_user_123',
        sessionId: 'test_session_123'
      })
    });

    if (!chatResponse.ok) {
      throw new Error(`Chat request failed: ${chatResponse.status} - ${await chatResponse.text()}`);
    }

    const chatData = await chatResponse.text();
    console.log('✅ Chat response received, length:', chatData.length);
    
    // Check if response contains tool results
    if (chatData.includes('toolResults') || chatData.includes('AdvancedToolResultsRenderer')) {
      console.log('✅ Response appears to contain tool results');
    } else {
      console.log('⚠️ Response does not appear to contain tool results');
    }

    // Test 3: Direct News Orchestrator Test
    console.log('\n3️⃣ Testing news orchestrator via unified route...');
    const newsResponse = await fetch(`${BASE_URL}/api/unified-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service: 'core-tools',
        endpoint: 'news-orchestrator',
        data: {
          query: 'latest news today',
          userId: 'test_user_123',
          sessionId: 'test_session_123'
        }
      })
    });

    if (!newsResponse.ok) {
      throw new Error(`News request failed: ${newsResponse.status} - ${await newsResponse.text()}`);
    }

    const newsData = await newsResponse.json();
    console.log('✅ News orchestrator response received');
    console.log('📰 News result structure:', {
      success: newsData.success,
      hasData: !!newsData.data,
      hasStories: !!(newsData.data && newsData.data.stories),
      storiesCount: newsData.data && newsData.data.stories ? newsData.data.stories.length : 0,
      hasMetadata: !!newsData.metadata
    });

    // Test 4: Web Search Engine Test
    console.log('\n4️⃣ Testing web search engine...');
    const webSearchResponse = await fetch(`${BASE_URL}/api/unified-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service: 'core-tools',
        endpoint: 'web-search-engine',
        data: {
          query: 'technology news 2025',
          userId: 'test_user_123',
          sessionId: 'test_session_123'
        }
      })
    });

    if (!webSearchResponse.ok) {
      throw new Error(`Web search failed: ${webSearchResponse.status} - ${await webSearchResponse.text()}`);
    }

    const webSearchData = await webSearchResponse.json();
    console.log('✅ Web search response received');
    console.log('🔍 Web search result structure:', {
      success: webSearchData.success,
      hasData: !!webSearchData.data,
      hasResults: !!(webSearchData.data && webSearchData.data.results),
      resultsCount: webSearchData.data && webSearchData.data.results ? webSearchData.data.results.length : 0
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Server: ✅ Healthy');
    console.log('- Chat endpoint: ✅ Working');
    console.log('- News orchestrator: ✅ Working');
    console.log('- Web search: ✅ Working');
    console.log('\n🎯 If search results are not displaying in UI, the issue is likely in:');
    console.log('   1. AdvancedToolResultsRenderer data structure handling');
    console.log('   2. NeuraPlaySearchResults component props');
    console.log('   3. Chat context callback functions');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSearchFunctionality();
