# Deployment Guide

## Resolving 401 Error

The 401 error you're experiencing is due to missing or invalid Hugging Face API token configuration. Here's how to fix it:

### 1. Get a Hugging Face Token

1. Go to [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Create a new token with "read" permissions
3. Copy the token value

### 2. Configure Environment Variables

#### For Netlify Deployment:

1. Go to your Netlify dashboard
2. Navigate to your site settings
3. Go to "Environment variables"
4. Add a new variable:
   - **Key**: `HF_TOKEN`
   - **Value**: Your Hugging Face token
5. Save and redeploy your site

#### For Local Development:

Create a `.env` file in the root directory:
```
HF_TOKEN=your_actual_token_here
```

### 3. Current Fallback Behavior

The application has been updated to provide fallback responses when the token is not configured:

- **Text responses**: Returns a helpful demo message
- **Image generation**: Returns a placeholder image
- **Voice generation**: Returns a placeholder audio

This ensures the application continues to work even without proper token configuration.

### 4. Testing

After setting up the token:
1. Deploy to Netlify
2. Test the AI features on your website
3. Check the Netlify function logs for any remaining issues

### 5. Troubleshooting

If you still see 401 errors:
1. Verify the token is correctly set in Netlify environment variables
2. Check that the token has the correct permissions
3. Ensure the token is not expired
4. Check the Netlify function logs for detailed error messages 