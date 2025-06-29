"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
    ActionCtx,
    internalAction,
} from "./_generated/server";

const GRAPH_API_URL = "https://graph.instagram.com/v23.0";

const buildGraphApiUrl = (path: string, params: Record<string, any>, accessToken: string) => {
    const searchParams = new URLSearchParams(params);
    searchParams.append("access_token", accessToken);
    return `${GRAPH_API_URL}/${path}?${searchParams.toString()}`;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const postToInstagram = internalAction({
    args: {
        projectId: v.id("projects"),
        accountId: v.id("accounts"),
    },
    handler: async (ctx, {
        projectId,
        accountId
    }) => {
        const project = await ctx.runQuery(api.projects.getProjectDetails, {
            projectId
        });
        const account = await ctx.runQuery(internal.accounts.get, {
            id: accountId
        });

        if (!project || !project.video?.finalUrl || !account) {
            console.error("Project, video, or account not found", {
                projectId,
                accountId
            });
            return;
        }

        const instagramPlatform = account.platforms.find((p) => p.platform === 'instagram');
        if (!instagramPlatform || !instagramPlatform.credentials) {
            console.error("Instagram credentials not found for account", {
                accountId
            });
            return;
        }

        const { igUserId, accessToken: oauthToken, accessTokenEnvVar, expiresAt } = instagramPlatform.credentials;

        // Use OAuth token if available, otherwise fall back to environment variable
        let accessToken: string;
        if (oauthToken && expiresAt && expiresAt > Date.now()) {
            accessToken = oauthToken;
        } else if (accessTokenEnvVar) {
            const envToken = process.env[accessTokenEnvVar];
            if (!envToken) {
                console.error(`Access token environment variable ${accessTokenEnvVar} not set`);
                return;
            }
            accessToken = envToken;
        } else {
            console.error("No valid access token found for Instagram account", { accountId });
            return;
        }

        const videoUrl = project.video?.finalUrl;
        const thumbnailUrl = project.thumbnailUrl;
        const caption = project.project.socialMediaCopy || project.project.topic;

        if (!videoUrl) {
            console.error("Video URL not found for project", {
                projectId
            });
            return;
        }

        const mediaParams: any = {
            media_type: "REELS",
            video_url: videoUrl,
            caption: caption,
        };

        if (thumbnailUrl) {
            mediaParams.cover_url = thumbnailUrl;
        }

        // Step 1: Upload the video to Instagram
        const uploadVideoUri = buildGraphApiUrl(`${igUserId}/media`, mediaParams, accessToken);

        let containerId;
        try {
            const uploadResponse = await fetch(uploadVideoUri, {
                method: "POST"
            });
            const uploadData = await uploadResponse.json();
            if (!uploadResponse.ok) {
                throw new Error(`Error during upload: ${JSON.stringify(uploadData.error)}`);
            }
            containerId = uploadData.id;
            console.log(`Reel uploaded successfully to container ID: ${containerId}`);
        } catch (e: any) {
            console.error(`Error during upload for account ${accountId}:`, e.message);
            return;
        }

        // Step 2: Check the upload status
        const checkStatusUri = buildGraphApiUrl(containerId, {
            fields: 'status_code'
        }, accessToken);

        let isUploaded = false;
        for (let i = 0; i < 5; i++) { // Poll for 5 minutes
            try {
                const statusResponse = await fetch(checkStatusUri);
                const statusData = await statusResponse.json();
                if (statusData.status_code === 'FINISHED') {
                    isUploaded = true;
                    console.log(`Upload container ${containerId} is finished.`);
                    break;
                } else if (statusData.status_code === 'ERROR') {
                    console.error(`Upload failed for container ${containerId}. Status: ERROR`);
                    return;
                }
                console.log(`Upload status for ${containerId}: ${statusData.status_code}. Retrying in 1 minute...`);
                await sleep(60000);
            } catch (e: any) {
                console.error(`Error checking upload status for container ${containerId}:`, e.message);
                // Continue to retry
                await sleep(60000);
            }
        }

        if (!isUploaded) {
            console.error(`Reel upload timed out for container ${containerId}`);
            return;
        }

        // Step 3: Publish the video
        try {
            const publishVideoUri = buildGraphApiUrl(`${igUserId}/media_publish`, {
                creation_id: containerId,
            }, accessToken);
            const publishResponse = await fetch(publishVideoUri, {
                method: "POST"
            });
            const publishData = await publishResponse.json();

            if (!publishResponse.ok) {
                throw new Error(`Error during publish: ${JSON.stringify(publishData.error)}`);
            }

            const publishedMediaId = publishData.id;
            console.log(`Reel published successfully! Media ID: ${publishedMediaId}`);

            await ctx.runMutation(api.projects.appendProjectPublishedMediaId, {
                projectId,
                platform: 'instagram',
                mediaId: publishedMediaId
            });

        } catch (e: any) {
            console.error(`Error publishing reel for container ${containerId}:`, e.message);
        }
    },
}); 