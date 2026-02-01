const express = require('express');
const bcrypt = require('bcrypt');
const databaseService = require('../services/database.cjs');
const emailService = require('../services/email.cjs');
const router = express.Router();

// Security configuration
const SALT_ROUNDS = 10;

// In-memory verification codes (temporary until email service is implemented)
const verificationCodes = new Map();

// Helper function to generate verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // 🔐 SECURITY FIX: Admin credentials from environment variables ONLY
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
    
    if (ADMIN_EMAIL && ADMIN_PASSWORD_HASH && 
        email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      // Validate admin password using bcrypt
      const isValidAdmin = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
      
      if (isValidAdmin) {
        const adminUser = {
          id: 'admin_2025',
          username: 'NeuraPlay Admin',
          email: ADMIN_EMAIL,
          role: 'admin',
          isVerified: true,
          subscription: { tier: 'unlimited', status: 'active' },
          profile: { avatar: '/assets/images/Mascot.png', rank: 'System Admin', xp: 999999, stars: 999 }
        };
        
        return res.json({ 
          success: true, 
          user: adminUser,
          message: 'Admin login successful' 
        });
      }
    }
    
    // Find user by email OR username in PostgreSQL
    const queryBuilder = databaseService.queryBuilder();
    if (!queryBuilder) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }
    
    const users = await queryBuilder('users')
      .where('email', email.toLowerCase())
      .orWhere('username', email) // Also allow login by username
      .select('*')
      .first();
    
    if (!users) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // 🔐 FIRST-TIME PASSWORD SETUP: Check if user needs to set their password
    const userProfile = typeof users.profile === 'string' ? JSON.parse(users.profile) : users.profile;
    const needsPasswordSetup = users.password === 'NEEDS_PASSWORD_SETUP' || userProfile?.needsPasswordSetup === true;
    
    if (needsPasswordSetup) {
      // First login - the "password" field contains the user's new password
      if (!password || password.length < 6) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please enter a password of at least 6 characters. This will be your permanent password.' 
        });
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Update the user's password and remove the needsPasswordSetup flag
      const updatedProfile = { ...userProfile };
      delete updatedProfile.needsPasswordSetup;
      
      await queryBuilder('users')
        .where('id', users.id)
        .update({
          password: hashedPassword,
          profile: JSON.stringify(updatedProfile),
          updated_at: new Date()
        });
      
      console.log(`✅ First-time password set for user: ${users.username} (${users.email})`);
      
      // Return the user as logged in
      const { password: _, ...userWithoutPassword } = users;
      const formattedUser = {
        ...userWithoutPassword,
        isVerified: users.is_verified,
        profile: updatedProfile,
        subscription: typeof users.subscription === 'string' ? JSON.parse(users.subscription) : users.subscription,
        usage: typeof users.usage === 'string' ? JSON.parse(users.usage) : users.usage
      };
      
      return res.json({ 
        success: true, 
        user: formattedUser,
        message: 'Password set successfully! Welcome to NeuraPlay!' 
      });
    }
    
    // Compare password hash using bcrypt
    const passwordMatch = await bcrypt.compare(password, users.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Remove password from response and format for frontend
    const { password: _, ...userWithoutPassword } = users;
    let parsedProfile = typeof users.profile === 'string' ? JSON.parse(users.profile) : users.profile;
    
    // 🖼️ LOAD SAVED AVATAR: Check user_profiles table for persisted avatar
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      const avatarResult = await pool.query(
        'SELECT avatar, profile_data FROM user_profiles WHERE user_id = $1',
        [users.id]
      );
      
      if (avatarResult.rows.length > 0 && avatarResult.rows[0].avatar) {
        console.log('🖼️ Loading saved avatar for user:', users.id);
        parsedProfile = { ...parsedProfile, avatar: avatarResult.rows[0].avatar };
      }
      
      await pool.end();
    } catch (avatarError) {
      console.warn('⚠️ Failed to load saved avatar:', avatarError.message);
    }
    
    const formattedUser = {
      ...userWithoutPassword,
      isVerified: users.is_verified,
      profile: parsedProfile,
      subscription: typeof users.subscription === 'string' ? JSON.parse(users.subscription) : users.subscription,
      usage: typeof users.usage === 'string' ? JSON.parse(users.usage) : users.usage
    };
    
    res.json({ 
      success: true, 
      user: formattedUser,
      message: 'Login successful' 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Send verification code endpoint
router.post('/send-verification', async (req, res) => {
  try {
    const { userId, email, method } = req.body;
    
    if (!userId || !email || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID, email, and method are required' 
      });
    }
    
    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const verificationCode = generateVerificationCode();
    const token = `${userId}_${Date.now()}`;
    
    // Store verification code (expires in 10 minutes)
    verificationCodes.set(token, {
      code: verificationCode,
      userId,
      email,
      method,
      expiresAt: Date.now() + (10 * 60 * 1000)
    });
    
    // Send verification email
    const emailResult = await emailService.sendEmail(
      email,
      'verification',
      verificationCode
    );

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }
    
    res.json({ 
      success: true, 
      token,
      message: `Verification code sent to your email address`
    });
    
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Verify code endpoint
router.post('/verify', async (req, res) => {
  try {
    const { userId, token, code } = req.body;
    
    if (!userId || !token || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID, token, and code are required' 
      });
    }
    
    const verification = verificationCodes.get(token);
    
    if (!verification || verification.userId !== userId) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid verification token' 
      });
    }
    
    if (Date.now() > verification.expiresAt) {
      verificationCodes.delete(token);
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code has expired' 
      });
    }
    
    if (verification.code !== code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code' 
      });
    }
    
    // Mark user as verified
    const user = users.get(userId);
    if (user) {
      user.isVerified = true;
      user.verifiedAt = new Date().toISOString();
      user.verificationMethod = verification.method;
      users.set(userId, user);
    }
    
    // Clean up verification code
    verificationCodes.delete(token);

    // Send welcome email
    const welcomeEmailResult = await emailService.sendEmail(
      user.email,
      'welcome',
      user.username
    );

    if (!welcomeEmailResult.success) {
      console.error('Failed to send welcome email:', welcomeEmailResult.error);
    }
    
    res.json({ 
      success: true, 
      message: 'Email verified successfully!' 
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const userData = req.body;
    
    if (!userData.email || !userData.username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and username are required' 
      });
    }
    
    if (!userData.password || userData.password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required and must be at least 6 characters long' 
      });
    }
    
    // Check if user already exists in PostgreSQL
    const queryBuilder = databaseService.queryBuilder();
    if (!queryBuilder) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }
    
    const existingUser = await queryBuilder('users')
      .where('email', userData.email.toLowerCase())
      .orWhere('username', userData.username)
      .first();
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this email or username already exists' 
      });
    }
    
    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
    
    // Prepare user data for database
    const userId = userData.id || Date.now().toString();
    const defaultProfile = userData.profile || {
      avatar: '/assets/images/Mascot.png',
      rank: 'New Learner',
      xp: 0,
      xpToNextLevel: 100,
      stars: 0,
      about: '',
      gameProgress: {}
    };
    
    // Insert user into PostgreSQL
    const [newUser] = await queryBuilder('users')
      .insert({
        id: userId,
        username: userData.username,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role || 'learner',
        is_verified: false,
        profile: JSON.stringify(defaultProfile),
        subscription: JSON.stringify({ tier: 'free', status: 'active' }),
        usage: JSON.stringify({
          aiPrompts: { count: 0, lastReset: new Date().toISOString(), history: [] },
          imageGeneration: { count: 0, lastReset: new Date().toISOString(), history: [] }
        })
      })
      .returning('*');
    
    // Format user for response
    const { password: _, ...userWithoutPassword } = newUser;
    const formattedUser = {
      ...userWithoutPassword,
      isVerified: newUser.is_verified,
      profile: typeof newUser.profile === 'string' ? JSON.parse(newUser.profile) : newUser.profile,
      subscription: typeof newUser.subscription === 'string' ? JSON.parse(newUser.subscription) : newUser.subscription,
      usage: typeof newUser.usage === 'string' ? JSON.parse(newUser.usage) : newUser.usage
    };
    
    res.json({ 
      success: true, 
      user: formattedUser,
      message: 'User registered successfully' 
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// 🔐 PASSWORD RESET ENDPOINTS

// Database-backed password reset tokens (production-safe)
const passwordResetTokens = {
  async set(hashedToken, data) {
    const queryBuilder = databaseService.queryBuilder();
    if (!queryBuilder) return;
    
    await queryBuilder('password_reset_tokens')
      .insert({
        token: hashedToken,
        user_id: data.userId,
        email: data.email,
        expires_at: new Date(data.expires),
        created_at: new Date()
      })
      .onConflict('token')
      .merge();
  },
  
  async get(hashedToken) {
    const queryBuilder = databaseService.queryBuilder();
    if (!queryBuilder) return null;
    
    const result = await queryBuilder('password_reset_tokens')
      .where('token', hashedToken)
      .first();
    
    if (!result) return null;
    
    return {
      userId: result.user_id,
      email: result.email,
      expires: new Date(result.expires_at).getTime()
    };
  },
  
  async delete(hashedToken) {
    const queryBuilder = databaseService.queryBuilder();
    if (!queryBuilder) return;
    
    await queryBuilder('password_reset_tokens')
      .where('token', hashedToken)
      .delete();
  }
};

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const queryBuilder = databaseService.queryBuilder();
    if (!queryBuilder) {
      return res.status(500).json({
        success: false,
        message: 'Database not available'
      });
    }
    
    // Find user by email
    const user = await queryBuilder('users')
      .where('email', email.toLowerCase())
      .select('id', 'email', 'username')
      .first();
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }
    
    // Generate secure reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Store token with 1 hour expiration
    await passwordResetTokens.set(hashedToken, {
      userId: user.id,
      email: user.email,
      expires: Date.now() + 3600000 // 1 hour
    });
    
    // Send reset email
    const emailResult = await emailService.sendEmail(
      user.email,
      'passwordReset',
      resetToken
    );
    
    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
      // Still return success to user for security
    }
    
    console.log(`🔐 Password reset requested for: ${user.email}`);
    
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify reset token
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const tokenData = passwordResetTokens.get(hashedToken);
    
    if (!tokenData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    if (Date.now() > tokenData.expires) {
      passwordResetTokens.delete(hashedToken);
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }
    
    res.json({
      success: true,
      email: tokenData.email
    });
    
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const tokenData = await passwordResetTokens.get(hashedToken);
    
    if (!tokenData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    if (Date.now() > tokenData.expires) {
      await passwordResetTokens.delete(hashedToken);
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }
    
    const queryBuilder = databaseService.queryBuilder();
    if (!queryBuilder) {
      return res.status(500).json({
        success: false,
        message: 'Database not available'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update password and remove needsPasswordSetup flag
    const user = await queryBuilder('users')
      .where('id', tokenData.userId)
      .select('profile')
      .first();
    
    const profile = typeof user.profile === 'string' ? JSON.parse(user.profile) : (user.profile || {});
    delete profile.needsPasswordSetup;
    
    await queryBuilder('users')
      .where('id', tokenData.userId)
      .update({
        password: hashedPassword,
        profile: JSON.stringify(profile),
        updated_at: new Date()
      });
    
    // Delete used token
    await passwordResetTokens.delete(hashedToken);
    
    console.log(`✅ Password reset successful for: ${tokenData.email}`);
    
    res.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Export router and verification codes (users now stored in PostgreSQL)
module.exports = {
  router,
  verificationCodes,
  passwordResetTokens
};
