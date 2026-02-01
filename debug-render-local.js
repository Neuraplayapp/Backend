// Debug Render deployment locally with exact same environment
// Run with: node debug-render-local.js

// Set exact Render environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';
process.env.RENDER = 'true';

// Load production env if it exists
try {
  const fs = require('fs');
  if (fs.existsSync('production.env')) {
    require('dotenv').config({ path: 'production.env' });
    console.log('✅ Loaded production.env');
  }
} catch (error) {
  console.log('⚠️ No production.env found, using system env');
}

// Simulate Render paths
process.env.RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

console.log('🚀 Starting Render simulation...');
console.log('📍 Environment:', process.env.NODE_ENV);
console.log('📍 Port:', process.env.PORT);
console.log('📍 Render mode:', process.env.RENDER);

// Start the exact same way Render does
try {
  require('./server-new.cjs');
} catch (error) {
  console.error('💥 Render simulation failed:', error);
  console.error('Stack trace:', error.stack);
}
