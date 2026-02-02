# 📧 Render Email Configuration Setup

## Problem
Emails work locally but not in production because Render doesn't have the correct SMTP environment variables.

## Solution: Update Render Environment Variables

### Step-by-Step Instructions:

1. **Go to Render Dashboard**
   - Navigate to: https://dashboard.render.com/
   - Sign in with your account
   - Select your NeuraPlay service

2. **Go to Environment Tab**
   - Click on "Environment" in the left sidebar
   - You'll see a list of environment variables

3. **Add/Update These Variables:**

   Click "Add Environment Variable" or edit existing ones:

   ```
   SMTP_HOST=smtp.gmail.com
   ```

   ```
   SMTP_PORT=587
   ```

   ```
   SMTP_SECURE=false
   ```

   ```
   SMTP_USER=smt@neuraplay.biz
   ```

   ```
   SMTP_PASSWORD=unni jauo wbmg iqay
   ```

4. **Save Changes**
   - Click "Save Changes" button
   - Render will automatically redeploy your service
   - Wait 2-3 minutes for deployment to complete

5. **Verify Deployment**
   - Check the deployment logs for:
     ```
     📧 Email Service Configuration:
        Host: smtp.gmail.com
        Port: 587
        User: smt@neuraplay.biz
        Password: ✅ SET
     SMTP server is ready to send emails
     ```

## How It Works Now

✅ **User Flow:**
1. User enters their email and clicks "Forgot Password"
2. Email is sent FROM `smt@neuraplay.biz` 
3. Email is sent TO the user's email address
4. User receives password reset link

✅ **SMTP Configuration:**
- Uses Google Workspace standard SMTP
- App Password authentication (secure and revocable)
- Port 587 with STARTTLS encryption

## Testing After Deployment

1. Go to your production site
2. Click "Forgot Password"
3. Enter a test email address
4. Check that email inbox for the reset link
5. Verify link points to: `https://www.neuraplay.org/reset-password?token=...`

## Troubleshooting

If emails still don't work after deployment:

1. **Check Render Logs:**
   - Go to "Logs" tab in Render dashboard
   - Look for SMTP connection errors
   - Verify environment variables are loading

2. **Verify App Password:**
   - Make sure the app password hasn't been revoked
   - Check at: https://myaccount.google.com/apppasswords

3. **Check Email Service Logs:**
   - Look for: "SMTP server is ready to send emails" ✅
   - Or: "SMTP connection error" ❌

## Security Notes

✅ **App Password is Safe:**
- Can only send emails (limited scope)
- Can be revoked anytime at Google Account settings
- Doesn't give access to full Google account
- Official Google-recommended method for SMTP

🔒 **Never commit passwords to git!**
- These are in .env files which should be .gitignored
- Only set them as environment variables on Render
- This document is for reference only

