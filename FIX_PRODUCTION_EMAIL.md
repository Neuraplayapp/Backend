# 🚨 Fix Production Email Issues

## Problem Summary
Email error: **`421 4.7.0 Try again later, closing connection. (EHLO)`**

This error happens at the SMTP handshake level, **BEFORE authentication**. This means:
- ❌ NOT a password issue
- ❌ NOT an environment variable issue  
- ❌ NOT a port configuration issue

✅ **ROOT CAUSE:** Google blocking Render's IP due to:
1. Missing hostname identification in EHLO command
2. Render's shared IP reputation with Gmail
3. Missing reverse DNS from neuraplay.biz domain

## ✅ FIXED: Updated `services/email.cjs`

Added proper SMTP configuration:
- `name: 'neuraplay.biz'` - Identifies server to Gmail
- Connection pooling to avoid rate limits
- Better TLS cipher configuration

---

## Additional Setup (if needed):

### Issue 1: Missing `password_reset_tokens` table in production database

### Solution: Create Database Table (if error occurs)

### Option A: Via Render Shell (RECOMMENDED)

1. **Open Render Shell**
   - Go to https://dashboard.render.com/
   - Select your NeuraPlay service
   - Click "Shell" tab at the top
   - Wait for shell to connect

2. **Run This Command:**
   ```bash
   node create-password-reset-table.cjs
   ```

3. **You should see:**
   ```
   📋 Creating password_reset_tokens table...
   ✅ Table created successfully!
   🧹 Cleaned up 0 expired tokens
   ```

### Option B: Via SQL Query in Database Dashboard

1. Go to your PostgreSQL database on Render
2. Go to "Query" tab
3. Run this SQL:

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_expires ON password_reset_tokens(expires_at);
```

### Issue 2: SMTP credentials not loading on Render

### Solution: Verify Environment Variables on Render:

1. Go to https://dashboard.render.com/
2. Select your NeuraPlay service
3. Click "Environment" tab
4. **Verify these variables exist:**

You need to have **EXACTLY** these (case-sensitive):

```
SMTP_HOST
Value: smtp.gmail.com
```

```
SMTP_PORT
Value: 587
```

```
SMTP_SECURE
Value: false
```

```
SMTP_USER
Value: smt@neuraplay.biz
```

```
SMTP_PASSWORD
Value: unnijaouwbmgiqay
```

**IMPORTANT:** The password should be entered **without spaces** (all one word)

### After Adding Variables:

1. Click "Save Changes"
2. Wait for Render to automatically redeploy (2-3 minutes)
3. Check logs for:
   ```
   📧 Email Service Configuration:
      Host: smtp.gmail.com
      Port: 587
      User: smt@neuraplay.biz
      Password: ✅ SET
   SMTP server is ready to send emails
   ```

## 🚀 Deploying the Fix

1. **Commit and push the updated `services/email.cjs` file**
2. **Render will automatically redeploy** (takes 2-3 minutes)
3. **Monitor logs** for successful SMTP connection:
   ```
   SMTP server is ready to send emails
   ```

## Testing After Deploy

1. Go to https://www.neuraplay.org
2. Click "Forgot Password"
3. Enter: smt@neuraplay.biz
4. Check the email inbox for reset link

The fix adds proper hostname identification that Gmail requires to accept connections from cloud hosting providers.

## Expected Success Messages in Logs:

```
🔐 Password reset requested for: smt@neuraplay.biz
Email sent: <some-message-id>
```

**NO MORE:**
- ❌ relation "password_reset_tokens" does not exist
- ❌ Missing credentials for "PLAIN"

## Troubleshooting

If still not working after both fixes:

1. **Check Render logs** for any new errors
2. **Verify environment variables** are showing in the Environment tab
3. **Check Gmail** for "blocked sign-in attempt" security alerts
4. **Try manual deploy** on Render to force reload of environment variables

