# Password Reset Link Fix 🔐

## Problem Identified
The password reset email links were pointing to `https://neuraplay.biz/reset-password` but the base URL was undefined in the email template, causing the links to be malformed or use incorrect domains.

## What Was Fixed

### 1. Email Service (`services/email.cjs`)
- **Added BASE_URL configuration** at the top of the file
- **Made all email templates use BASE_URL** instead of hardcoded domains
- **Fixed inconsistency** where password reset used `.org` while other templates used `.biz`

### 2. Development Environment (`development.env`)
- **Added BASE_URL** and **VITE_BASE_URL** environment variables
- Set to `https://www.neuraplay.org` (website domain)
- **Note:** Email sends from `smt@neuraplay.biz` but links point to `.org` domain

## Changes Made:
```javascript
// Added at top of services/email.cjs
const BASE_URL = process.env.BASE_URL || process.env.VITE_BASE_URL || 'https://www.neuraplay.org';
```

All email templates now use:
- `${BASE_URL}/assets/images/Mascot.png` (for images)
- `${BASE_URL}/reset-password?token=${token}` (for password reset)
- `${BASE_URL}/dashboard` (for dashboard links)

## 🚨 IMPORTANT: Update Production on Render

### Steps to Fix on Render:

1. **Go to your Render Dashboard**
   - Navigate to: https://dashboard.render.com/
   - Select your NeuraPlay service

2. **Add Environment Variable**
   - Go to "Environment" tab
   - Click "Add Environment Variable"
   - Add:
     ```
     Key: BASE_URL
     Value: https://www.neuraplay.org
     ```
   - **IMPORTANT:** The website domain is `.org` even though email sends from `smt@neuraplay.biz`

3. **Optional: Add Secondary Variable**
   ```
   Key: VITE_BASE_URL
   Value: https://www.neuraplay.org
   ```

4. **Save and Redeploy**
   - Click "Save Changes"
   - Render will automatically redeploy your service
   - Wait for deployment to complete (~2-3 minutes)

## Testing the Fix

After deploying:

1. **Test Password Reset Flow:**
   - Go to https://www.neuraplay.org
   - Click "Forgot Password"
   - Enter your email
   - Check your email inbox (from `smt@neuraplay.biz`)
   - Click the reset link (should go to `https://www.neuraplay.org/reset-password?token=...`)
   - **Expected Result:** You should be taken to the password reset page (NOT "site cannot be reached")

2. **Verify the Link:**
   - The email should contain: `https://www.neuraplay.org/reset-password?token=xxxxx`
   - Email FROM address will be: `smt@neuraplay.biz` (this is correct)
   - Link should point to: `.org` domain (where the website is hosted)

## What This Fixes

✅ **Password Reset Links** - Now point to correct domain (.org)  
✅ **Domain Clarity** - Email FROM uses `.biz`, links point to `.org` website  
✅ **Email Template Links** - All links are configurable via environment variable  
✅ **Production Flexibility** - Easy to change domain without code changes  

## Route Verification

The `/reset-password` route **already exists** in your app:
- **File:** `src/pages/ResetPasswordPage.tsx`
- **Route:** Configured in `src/App.tsx` line 81
- **Status:** ✅ Working correctly

The issue was **only with the email link**, not the page itself.

## If Still Not Working

If the links still don't work after adding the environment variable:

1. **Check Render Logs:**
   - Look for any errors related to email sending
   - Verify BASE_URL is being loaded correctly

2. **Verify Environment Variable:**
   - In Render Dashboard → Environment
   - Confirm `BASE_URL=https://www.neuraplay.org` is there

3. **Check DNS:**
   - Verify `neuraplay.org` and `www.neuraplay.org` domains are properly configured
   - Check if DNS is pointing to Render
   - Confirm both `neuraplay.org` and `www.neuraplay.org` work

4. **Test in Incognito:**
   - Clear browser cache
   - Try in incognito/private window

## Support

If you continue experiencing issues:
- Check Render logs for email service errors
- Verify SMTP credentials are correct
- Test email sending with the test script: `node test-email-sending.cjs`

---

**Last Updated:** December 18, 2024  
**Issue:** Password reset links returning "site cannot be reached"  
**Status:** ✅ FIXED - Awaiting production deployment

