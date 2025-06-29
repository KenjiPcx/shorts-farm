import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { WebhookPayload } from "@remotion/lambda/client";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
    path: "/render",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const { projectId } = await request.json();
        const { renderId, bucketName } = await ctx.runAction(internal.remotion.renderVideo, { projectId });
        return new Response(JSON.stringify({ renderId, bucketName }));
    })
});

http.route({
    path: "/progress",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const { renderId, bucketName } = await request.json();
        const progress = await ctx.runAction(api.remotion.getRenderProgressAction, { renderId, bucketName });
        return new Response(JSON.stringify(progress));
    })
});

http.route({
    path: "/remotionWebhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        // const body = await request.text();
        // try {
        //     validateWebhookSignature({
        //         secret: process.env.REMOTION_WEBHOOK_SECRET as string,
        //         body: body,
        //         signatureHeader: request.headers.get("x-remotion-signature") as string,
        //     });
        // } catch (err) {
        //     console.error("Webhook signature validation failed", err);
        //     return new Response("Signature validation failed", { status: 401 });
        // }

        const payload = await request.json() as WebhookPayload;
        const { renderId } = payload;

        const project = await ctx.runQuery(internal.projects.getByRenderId, { renderId });
        if (!project) {
            console.error(`Webhook received for unknown renderId: ${renderId}`);
            return new Response("Unknown renderId, but acknowledging receipt.", { status: 200 });
        }

        if (payload.type === "success") {
            const videoUrl = payload.outputFile || payload.outputUrl;
            if (!videoUrl) {
                console.error("Successful webhook payload missing output file/url", payload);
                await ctx.runMutation(api.projects.updateProjectStatus, { projectId: project._id, status: "error", statusMessage: "Webhook success but no output URL." });
                return new Response("Missing output URL", { status: 400 });
            }

            console.log(`Starting post-render workflow for project ${project._id}`);
            await ctx.runMutation(api.workflow.startPostRenderWorkflow, {
                projectId: project._id,
                videoUrl: videoUrl,
            });
        } else if (payload.type === "error") {
            console.error(`Render failed for project ${project._id}`, payload.errors);
            const errorMessage = payload.errors[0]?.message ?? "Unknown rendering error";
            await ctx.runMutation(api.projects.updateProjectStatus, { projectId: project._id, status: "error", statusMessage: `Render failed: ${errorMessage}` });
        } else if (payload.type === "timeout") {
            console.error(`Render timed out for project ${project._id}`);
            await ctx.runMutation(api.projects.updateProjectStatus, { projectId: project._id, status: "error", statusMessage: "Render timed out." });
        }

        return new Response("Webhook received", { status: 200 });
    })
});

// Instagram OAuth callback endpoint
http.route({
    path: "/instagram/callback",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        // Create HTML response for redirect back to the actual app
        const baseUrl = process.env.SITE_URL || 'http://localhost:5173';

        if (error) {
            const errorHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Instagram Connection Failed</title>
                    <script>
                        setTimeout(() => {
                            window.location.href = '${baseUrl}?instagram_error=' + encodeURIComponent('${error}');
                        }, 1000);
                    </script>
                </head>
                <body>
                    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                        <h2>Instagram Connection Failed</h2>
                        <p>Error: ${error}</p>
                        <p>Redirecting back to app...</p>
                    </div>
                </body>
                </html>
            `;
            return new Response(errorHtml, {
                status: 200,
                headers: { "Content-Type": "text/html" },
            });
        }

        if (!code || !state) {
            const errorHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Instagram Connection Failed</title>
                    <script>
                        setTimeout(() => {
                            window.location.href = '${baseUrl}?instagram_error=' + encodeURIComponent('Missing authorization code or account ID');
                        }, 1000);
                    </script>
                </head>
                <body>
                    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                        <h2>Instagram Connection Failed</h2>
                        <p>Missing authorization code or account ID</p>
                        <p>Redirecting back to app...</p>
                    </div>
                </body>
                </html>
            `;
            return new Response(errorHtml, {
                status: 200,
                headers: { "Content-Type": "text/html" },
            });
        }

        try {
            // Extract accountId from the prefixed state (remove 'ig_' prefix)
            const accountId = state.startsWith('ig_') ? state.slice(3) : state;

            const result = await ctx.runAction(api.instagramAuth.exchangeCodeForToken, {
                code,
                accountId: accountId as any,
            });

            if (result.success) {
                const successHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Instagram Connected Successfully</title>
                        <script>
                            setTimeout(() => {
                                window.location.href = '${baseUrl}?instagram_success=' + encodeURIComponent('@${result.username}');
                            }, 2000);
                        </script>
                    </head>
                    <body>
                        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                            <h2 style="color: green;">✅ Instagram Connected Successfully!</h2>
                            <p>Successfully connected Instagram account @${result.username}</p>
                            <p>Redirecting back to app...</p>
                        </div>
                    </body>
                    </html>
                `;
                return new Response(successHtml, {
                    status: 200,
                    headers: { "Content-Type": "text/html" },
                });
            } else {
                throw new Error('Failed to connect Instagram account');
            }
        } catch (err: any) {
            console.error("Instagram callback error:", err);
            const errorHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Instagram Connection Failed</title>
                    <script>
                        setTimeout(() => {
                            window.location.href = '${baseUrl}?instagram_error=' + encodeURIComponent('${err.message || 'An unexpected error occurred'}');
                        }, 1000);
                    </script>
                </head>
                <body>
                    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                        <h2 style="color: red;">❌ Instagram Connection Failed</h2>
                        <p>${err.message || 'An unexpected error occurred'}</p>
                        <p>Redirecting back to app...</p>
                    </div>
                </body>
                </html>
            `;
            return new Response(errorHtml, {
                status: 200,
                headers: { "Content-Type": "text/html" },
            });
        }
    })
});

export default http;
