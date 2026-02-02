const fetch = require('node-fetch');

async function testMemoryAutoExtraction() {
  console.log('🧪 Testing Memory Auto-Extraction...\n');
  
  const testMessages = [
    "i work with two masters degree studies one in project management the other in electronic health!",
    "My name is Sammy",
    "I have a cat named Hirra",
    "My mother's name is Nourah",
    "I love pizza"
  ];

  for (const message of testMessages) {
    console.log(`\n📝 Testing message: "${message}"`);
    
    try {
      // Test the LLM memory analysis directly
      const response = await fetch('http://localhost:3001/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'llm-completion',
          messages: [{
            role: 'user',
            content: `You are a memory operation expert. Analyze this message for memory storage or recall intent.

Message: "${message}"

Determine:
1. Is this a STORAGE request (providing personal information), RECALL request (asking for information), UPDATE request (correcting information), or FORGET request (deleting information)?
2. What category of information is involved?
3. What specific data should be stored/retrieved/corrected/deleted?

Return ONLY valid JSON:
{
  "type": "store|recall|update|forget|ambiguous",
  "confidence": 0.0-1.0,
  "category": "name|preference|emotion|event|location|relationship|fact|experience|sentiment|general|pet|goal|family|profession",
  "extractedData": {
    "key": "extracted_key_if_storage_or_update_or_forget",
    "value": "extracted_value_if_storage_or_update",
    "query": "search_query_if_recall",
    "targetMemory": "description_of_memory_to_find_for_update_or_delete"
  }
}

Examples:
- "My name is John" → {"type": "store", "confidence": 0.95, "category": "name", "extractedData": {"key": "user_name", "value": "John"}}
- "What's my name?" → {"type": "recall", "confidence": 0.98, "category": "name", "extractedData": {"query": "user_name name"}}
- "Actually my name is Mike, not John" → {"type": "update", "confidence": 0.95, "category": "name", "extractedData": {"key": "user_name", "value": "Mike", "targetMemory": "name John"}}
- "That's wrong, delete my name" → {"type": "forget", "confidence": 0.9, "category": "name", "extractedData": {"key": "user_name", "targetMemory": "name"}}
- "Forget what I said about pizza" → {"type": "forget", "confidence": 0.85, "category": "preference", "extractedData": {"targetMemory": "pizza preference"}}
- "I don't actually like cats" → {"type": "update", "confidence": 0.8, "category": "preference", "extractedData": {"key": "pet_preference", "value": "doesn't like cats", "targetMemory": "cats like"}}
- "That information is incorrect" → {"type": "forget", "confidence": 0.75, "category": "general", "extractedData": {"targetMemory": "previous incorrect information"}}`
          }],
          max_tokens: 300,
          temperature: 0.1,
          model: 'accounts/fireworks/models/llama-v3p1-70b-instruct'
        })
      });

      if (response.ok) {
        const data = await response.json();
        let analysisResult = null;
        
        if (data.success && data.data) {
          const result = data.data;
          if (typeof result === 'string') {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysisResult = JSON.parse(jsonMatch[0]);
            }
          } else if (result?.choices?.[0]?.message?.content) {
            const content = result.choices[0].message.content.trim();
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysisResult = JSON.parse(jsonMatch[0]);
            }
          }
        }
        
        if (analysisResult) {
          console.log('✅ Analysis Result:', JSON.stringify(analysisResult, null, 2));
          
          // Check if it should be stored
          if (analysisResult.type === 'store' && analysisResult.confidence > 0.7) {
            console.log('🎯 SHOULD BE AUTO-STORED:', {
              category: analysisResult.category,
              key: analysisResult.extractedData?.key,
              value: analysisResult.extractedData?.value,
              confidence: analysisResult.confidence
            });
          } else {
            console.log('❌ Would NOT be auto-stored:', {
              type: analysisResult.type,
              confidence: analysisResult.confidence,
              reason: analysisResult.type !== 'store' ? 'Not a store request' : 'Confidence too low'
            });
          }
        } else {
          console.log('❌ Failed to parse analysis result');
        }
      } else {
        console.log('❌ API request failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error testing message:', error.message);
    }
  }
}

testMemoryAutoExtraction().catch(console.error);
