# Instagram Authentication Setup Guide

This guide will help you set up Instagram authentication for your AI shorts generation platform using the Business Login for Instagram flow.

## Prerequisites

1. A Meta Developer account
2. An Instagram Professional account (Business or Creator)
3. Your application deployed and accessible via HTTPS

## Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" and then "Create App"
3. Choose "Consumer" as the app type
4. Fill in your app details:
   - App name: Your application name
   - App contact email: Your email
   - Business account: Optional

## Step 2: Add Instagram Product

1. In your app dashboard, click "Add Product"
2. Find "Instagram" and click "Set up"
3. Choose "Instagram API with Instagram Login"

## Step 3: Configure Instagram Settings

1. In the Instagram product settings, go to "API setup with Instagram login"
2. Note down your:
   - **Instagram App ID** (you'll need this for environment variables)
   - **Instagram App Secret** (you'll need this for environment variables)

## Step 4: Set Up OAuth Redirect URIs

1. In the Instagram settings, find "OAuth Redirect URIs"
2. Add your Convex HTTP endpoint: `https://your-convex-url.convex.site/instagram/callback`
   - Replace `your-convex-url` with your actual Convex deployment URL
   - Example: `https://a-v-137.convex.site/instagram/callback`

**Note**: The callback uses your Convex HTTP router (.site domain) for server-side processing.

## Step 5: Configure Environment Variables

Add these environment variables to your application:

```bash
# Instagram OAuth Configuration
INSTAGRAM_APP_ID=your_instagram_app_id_here
INSTAGRAM_APP_SECRET=your_instagram_app_secret_here
SITE_URL=https://yourdomain.com  # Your frontend app URL (for redirecting back after OAuth)
```

For development:
```bash
SITE_URL=http://localhost:5173  # Your local frontend app URL
```

**Note**: The OAuth callback automatically uses your `CONVEX_URL` (converted to .site), so you don't need to configure a separate callback URL.

## Step 6: Request Permissions (App Review)

For production use, you'll need to request these permissions through App Review:

### Required Permissions:
- `instagram_business_basic` - Access to basic account information
- `instagram_business_content_publish` - Ability to publish content

### Standard Access vs Advanced Access:
- **Standard Access**: Use this if the app only serves Instagram accounts you own/manage
- **Advanced Access**: Required if the app serves Instagram accounts you don't own/manage (requires App Review)

## Step 7: Test the Integration

1. Start your application
2. Go to the Automation Manager
3. Create a new account
4. Click "Connect Instagram" - this should redirect you to Instagram's authorization page
5. Log in with your Instagram Professional account
6. Grant the requested permissions
7. You should be redirected back to your app with a success message

## Step 8: Verify Token Storage

After successful authentication, verify that:
1. The account shows as "Connected" in the UI
2. The access token is stored in your database
3. The token expiration is properly tracked (60 days for long-lived tokens)

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"**
   - Ensure your redirect URI in Meta App Dashboard exactly matches your callback URL
   - Make sure you're using HTTPS in production

2. **"App not approved for instagram_business_content_publish"**
   - You need to submit your app for App Review to get this permission
   - For testing, you can use Standard Access with accounts you own

3. **"Token expired"**
   - Long-lived tokens expire after 60 days
   - Implement token refresh using the `refreshInstagramToken` action

4. **"User does not have Instagram Professional account"**
   - The user must have an Instagram Business or Creator account
   - Personal Instagram accounts won't work

### Testing with Standard Access:

During development, you can test with Standard Access by:
1. Adding your Instagram account as a test user in the Meta App Dashboard
2. Using the same Instagram account that's connected to your Meta Developer account

## API Rate Limits

Be aware of Instagram's rate limits:
- 100 API-published posts within a 24-hour moving period per Instagram account
- Use the `content_publishing_limit` endpoint to check current usage

## Security Best Practices

1. **Never expose your Instagram App Secret** - keep it in environment variables
2. **Use HTTPS** for all OAuth redirects
3. **Validate the `state` parameter** in OAuth callbacks to prevent CSRF attacks
4. **Store access tokens securely** - they're encrypted in your database
5. **Implement proper error handling** for expired or invalid tokens

## Next Steps

After setup:
1. Test posting a video through the automation system
2. Set up scheduled posting times for your accounts
3. Monitor token expiration and implement refresh logic
4. Consider implementing webhook notifications for better user experience

## Support

If you encounter issues:
1. Check the Meta Developer documentation
2. Review the browser network tab for API errors
3. Check your application logs for detailed error messages
4. Ensure your Instagram account meets all requirements (Professional account, proper permissions, etc.) 