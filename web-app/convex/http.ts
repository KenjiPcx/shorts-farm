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
            const videoId = await ctx.runMutation(internal.videos.create, {
                projectId: project._id,
                url: videoUrl,
            });
            await ctx.runMutation(internal.projects.setFinalVideoId, {
                projectId: project._id,
                videoId: videoId,
            });
            console.log(`Successfully ingested video for project ${project._id}`);
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
})

export default http;
