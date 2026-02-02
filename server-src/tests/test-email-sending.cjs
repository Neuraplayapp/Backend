/**
 * 🧪 TEST EMAIL SENDING
 * Quick test to verify SMTP Relay configuration works
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, 'development.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

const emailService = require('./services/email.cjs');

async function testEmail() {
  console.log('\n📧 ═══════════════════════════════════════════════════');
  console.log('   TESTING EMAIL CONFIGURATION');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📋 Current SMTP Configuration:');
  console.log(`   Host: ${process.env.SMTP_HOST || 'smtp-relay.gmail.com'}`);
  console.log(`   Port: ${process.env.SMTP_PORT || '587'}`);
  console.log(`   User: ${process.env.SMTP_USER || 'smt@neuraplay.biz'}`);
  console.log(`   Auth: ${process.env.SMTP_APP_PASSWORD ? '✅ Set' : '❌ Not set'}\n`);
  
  const testEmail = process.argv[2] || 'smt@neuraplay.biz';
  
  console.log(`📤 Sending test password reset email to: ${testEmail}\n`);
  
  try {
    const result = await emailService.sendEmail(
      testEmail,
      'passwordReset',
      'test-token-12345'
    );
    
    if (result.success) {
      console.log('✅ ═══════════════════════════════════════════════════');
      console.log('   EMAIL SENT SUCCESSFULLY!');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`✅ Message ID: ${result.messageId}`);
      console.log(`✅ Recipient: ${testEmail}`);
      console.log('\n📬 Check your inbox for the password reset email!');
      console.log('   (Check spam folder if you don\'t see it)\n');
    } else {
      console.log('❌ ═══════════════════════════════════════════════════');
      console.log('   EMAIL SENDING FAILED');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`❌ Error: ${result.error}\n`);
      
      if (result.error.includes('authentication') || result.error.includes('auth')) {
        console.log('💡 TROUBLESHOOTING:');
        console.log('   1. Verify SMTP Relay is configured in Google Workspace Admin Console');
        console.log('   2. Go to: https://admin.google.com');
        console.log('   3. Navigate: Apps → Gmail → Routing → SMTP relay service');
        console.log('   4. Enable "Require SMTP Authentication"');
        console.log('   5. Allow "Only addresses in my domains"\n');
      }
    }
    
  } catch (error) {
    console.log('❌ ═══════════════════════════════════════════════════');
    console.log('   UNEXPECTED ERROR');
    console.log('═══════════════════════════════════════════════════════');
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    console.log('\n💡 Make sure you configured SMTP Relay in Google Workspace Admin Console\n');
  }
}

// Run test
console.log('\n🚀 Starting email test...\n');
testEmail()
  .then(() => {
    console.log('✅ Test complete!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

