#!/usr/bin/env node

// Enhanced deployment debugging with step-by-step validation
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🔍 NeuraPlay Deployment Debug Tool\n');

async function runStep(title, command, args = [], options = {}) {
  console.log(`\n📋 ${title}...`);
  
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${title} - SUCCESS`);
        resolve();
      } else {
        console.log(`❌ ${title} - FAILED (code ${code})`);
        reject(new Error(`${title} failed with code ${code}`));
      }
    });
  });
}

async function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    console.log(`❌ Missing ${description}: ${filePath}`);
    return false;
  }
}

async function debugDeploy() {
  console.log('🔍 Pre-flight checks...');
  
  // Check critical files
  const criticalFiles = [
    ['package.json', 'Package configuration'],
    ['server-new.cjs', 'Main server file'],
    ['dist/index.html', 'Built frontend'],
    ['server-src/utils/logger.js', 'Logger service']
  ];
  
  let allFilesExist = true;
  for (const [file, desc] of criticalFiles) {
    if (!checkFile(file, desc)) {
      allFilesExist = false;
    }
  }
  
  if (!allFilesExist) {
    console.log('\n❌ Missing critical files. Run npm run build first.');
    return;
  }
  
  try {
    // Step 1: Clean install
    await runStep('Clean dependencies install', 'npm', ['ci']);
    
    // Step 2: Build like Render
    await runStep('Build for production', 'npm', ['run', 'build:render']);
    
    // Step 3: Start in production mode
    console.log('\n🚀 Starting server in Render simulation mode...');
    console.log('👀 Watch for errors below:\n');
    
    await runStep('Start server (Render simulation)', 'npm', ['run', 'debug:render']);
    
  } catch (error) {
    console.log(`\n💥 Deployment debug failed: ${error.message}`);
    console.log('\n🔧 Quick fixes to try:');
    console.log('   1. Check server-src/utils/logger.js method names');
    console.log('   2. Verify all service imports exist');
    console.log('   3. Check for missing initialize() methods');
    console.log('   4. Validate environment variables');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Debug session ended');
  process.exit(0);
});

debugDeploy();
