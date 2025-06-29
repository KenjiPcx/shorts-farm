"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// Instagram OAuth Configuration
const INSTAGRAM_API_BASE = "https://graph.instagram.com";
const INSTAGRAM_AUTH_BASE = "https://api.instagram.com/oauth";

// Required environment variables:
// INSTAGRAM_APP_ID - Your Instagram App ID
// INSTAGRAM_APP_SECRET - Your Instagram App Secret
// SITE_URL - Your app's base URL (e.g., https://yourapp.com)

export const generateInstagramAuthUrl = action({
    args: {
        accountId: v.id("accounts"),
    },
    handler: async (ctx, { accountId }) => {
        const instagramAppId = process.env.INSTAGRAM_APP_ID;
        const convexUrl = process.env.CONVEX_URL;

        if (!instagramAppId || !convexUrl) {
            throw new Error("Instagram App ID or Convex URL not configured");
        }

        // Convert Convex URL from .cloud to .site for HTTP router access
        const convexHttpUrl = convexUrl.replace('.cloud', '.site');
        const redirectUri = `${convexHttpUrl}/instagram/callback`;
        const scope = "instagram_business_basic,instagram_business_content_publish";
        const state = `ig_${accountId}`; // Prefix with 'ig_' to distinguish from other OAuth flows

        const authUrl = new URL(`${INSTAGRAM_AUTH_BASE}/authorize`);
        authUrl.searchParams.append("client_id", instagramAppId);
        authUrl.searchParams.append("redirect_uri", redirectUri);
        authUrl.searchParams.append("scope", scope);
        authUrl.searchParams.append("response_type", "code");
        authUrl.searchParams.append("state", state);

        return authUrl.toString();
    },
});

export const exchangeCodeForToken = action({
    args: {
        code: v.string(),
        accountId: v.id("accounts"),
    },
    handler: async (ctx, { code, accountId }) => {
        const instagramAppId = process.env.INSTAGRAM_APP_ID;
        const instagramAppSecret = process.env.INSTAGRAM_APP_SECRET;
        const convexUrl = process.env.CONVEX_URL;

        if (!instagramAppId || !instagramAppSecret || !convexUrl) {
            throw new Error("Instagram credentials not configured");
        }

        // Convert Convex URL from .cloud to .site for HTTP router access
        const convexHttpUrl = convexUrl.replace('.cloud', '.site');
        const redirectUri = `${convexHttpUrl}/instagram/callback`;


        try {
            console.log("Exchange code for token - redirect URI:", redirectUri);

            // Step 1: Exchange authorization code for short-lived access token
            const tokenResponse = await fetch(`${INSTAGRAM_AUTH_BASE}/access_token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    client_id: instagramAppId,
                    client_secret: instagramAppSecret,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri,
                    code: code,
                }),
            });

            const tokenData = await tokenResponse.json();

            if (!tokenResponse.ok) {
                console.error("Token exchange error:", tokenData);
                if (tokenData.error_message?.includes("authorization code has been used")) {
                    throw new Error("This authorization code has already been used. Please try connecting again.");
                }
                if (tokenData.error_message?.includes("redirect_uri")) {
                    throw new Error(`Redirect URI mismatch. Expected: ${redirectUri}`);
                }
                throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
            }

            const { access_token: shortLivedToken, user_id: igUserId } = tokenData;

            // Step 2: Exchange short-lived token for long-lived token
            const longLivedTokenResponse = await fetch(
                `${INSTAGRAM_API_BASE}/access_token?grant_type=ig_exchange_token&client_secret=${instagramAppSecret}&access_token=${shortLivedToken}`,
                { method: "GET" }
            );

            const longLivedTokenData = await longLivedTokenResponse.json();

            if (!longLivedTokenResponse.ok) {
                throw new Error(`Long-lived token exchange failed: ${JSON.stringify(longLivedTokenData)}`);
            }

            const { access_token: longLivedToken, expires_in } = longLivedTokenData;

            // Step 3: Get user info
            const userInfoResponse = await fetch(
                `${INSTAGRAM_API_BASE}/me?fields=id,username&access_token=${longLivedToken}`
            );

            const userInfo = await userInfoResponse.json();

            if (!userInfoResponse.ok) {
                throw new Error(`User info fetch failed: ${JSON.stringify(userInfo)}`);
            }

            // Step 4: Update account with Instagram credentials
            await ctx.runMutation(internal.accounts.updateInstagramCredentials, {
                accountId,
                igUserId: userInfo.id,
                username: userInfo.username,
                accessToken: longLivedToken,
                expiresAt: Date.now() + expires_in * 1000,
            });

            return {
                success: true,
                username: userInfo.username,
                igUserId: userInfo.id,
            };
        } catch (error: any) {
            console.error("Instagram OAuth error:", error);
            throw new Error(`Instagram authentication failed: ${error.message}`);
        }
    },
});

export const refreshInstagramToken = action({
    args: {
        accountId: v.id("accounts"),
    },
    handler: async (ctx, { accountId }) => {
        const account = await ctx.runQuery(internal.accounts.get, { id: accountId });

        if (!account) {
            throw new Error("Account not found");
        }

        const instagramPlatform = account.platforms.find(p => p.platform === 'instagram');
        if (!instagramPlatform?.credentials?.accessToken) {
            throw new Error("No Instagram credentials found");
        }

        try {
            const refreshResponse = await fetch(
                `${INSTAGRAM_API_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${instagramPlatform.credentials.accessToken}`
            );

            const refreshData = await refreshResponse.json();

            if (!refreshResponse.ok) {
                throw new Error(`Token refresh failed: ${JSON.stringify(refreshData)}`);
            }

            const { access_token: newToken, expires_in } = refreshData;

            await ctx.runMutation(internal.accounts.updateInstagramCredentials, {
                accountId,
                igUserId: instagramPlatform.credentials.igUserId,
                username: instagramPlatform.credentials.username || '',
                accessToken: newToken,
                expiresAt: Date.now() + expires_in * 1000,
            });

            return { success: true };
        } catch (error: any) {
            console.error("Instagram token refresh error:", error);
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    },
}); 