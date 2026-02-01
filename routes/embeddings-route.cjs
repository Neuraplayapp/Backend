// Embeddings API Route - For local dev to forward embedding requests to production
const express = require('express');
const router = express.Router();

// For Node.js versions without native fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Generate embedding endpoint
router.post('/generate', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    console.log('🔤 Embeddings API: Generating embedding for text:', text.substring(0, 100) + '...');
    
    // Get Fireworks API key
    const FIREWORKS_API_KEY = process.env.Neuraplay || process.env.FIREWORKS_API_KEY || process.env.VITE_FIREWORKS_API_KEY;
    
    if (!FIREWORKS_API_KEY) {
      console.error('❌ No Fireworks API key configured on backend');
      return res.status(500).json({ error: 'Fireworks API key not configured' });
    }
    
    // Call Fireworks AI
    const response = await fetch('https://api.fireworks.ai/inference/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIREWORKS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: 'nomic-ai/nomic-embed-text-v1.5',
        dimensions: 768
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Fireworks API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Fireworks API error: ${response.status}`,
        details: errorText
      });
    }
    
    const result = await response.json();
    
    if (result.data?.[0]?.embedding) {
      console.log('✅ Embedding generated successfully (', result.data[0].embedding.length, 'dimensions )');
      return res.json({ 
        embedding: result.data[0].embedding,
        dimensions: result.data[0].embedding.length,
        model: 'nomic-ai/nomic-embed-text-v1.5'
      });
    }
    
    console.error('❌ Invalid Fireworks response format:', result);
    return res.status(500).json({ error: 'Invalid Fireworks response format' });
    
  } catch (error) {
    console.error('❌ Embeddings API error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

