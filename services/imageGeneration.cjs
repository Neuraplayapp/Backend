// For Node.js versions without native fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Core image generation function (used by both direct calls and tool calls)
async function handleImageGeneration(input_data, token) {
  try {
    const { prompt, size = '512x512' } = input_data;
    
    if (!prompt) {
      throw new Error('No prompt provided for image generation');
    }

    console.log('Starting image generation with Fireworks AI token:', !!token);
    console.log('Extracted prompt for image generation:', prompt);
    
    if (!token) {
      throw new Error('No Fireworks AI token provided for image generation');
    }

    // Enhanced prompt for better image generation
    const enhancedPrompt = `Create a beautiful, high-quality image: ${prompt}. Style: vibrant colors, detailed, professional, child-friendly, educational.`;

    console.log('🔍 FIREWORKS API CALL STARTING');
    console.log('🔍 Image generation prompt:', enhancedPrompt);
    
    // FIXED: Direct Fireworks API call when running on Render (avoid circular routing)
    const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
    
    if (isRender) {
      // RENDER/PRODUCTION: Call Fireworks API directly
      console.log('🎨 RENDER: Making direct Fireworks FLUX API call');
      
      const response = await fetch('https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-1-schnell-fp8/text_to_image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: enhancedPrompt
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🚨 Fireworks API failed: ${response.status} - ${errorText}`);
        throw new Error(`Fireworks API error: ${response.status} - ${errorText}`);
      }

      // Handle binary image response
      const imageBuffer = await response.buffer();
      if (imageBuffer.length === 0) {
        throw new Error('Received empty image buffer from Fireworks API');
      }

      // Convert to base64 and create data URL
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;

      return {
        success: true,
        image_url: dataUrl,
        contentType: 'image/jpeg',
        data: base64Image
      };
      
    } else {
      // LOCAL DEVELOPMENT: This shouldn't be called in local dev (goes through unified-route forwarding)
      throw new Error('imageGeneration.cjs should not be called directly in local development - use unified-route forwarding');
    }



  } catch (error) {
    console.error('Image generation error:', error);
    throw error;
  }
}

module.exports = {
  handleImageGeneration
};
