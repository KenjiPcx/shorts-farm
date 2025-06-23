"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";
import { z } from "zod";
import { ShortsFarmSchema } from "../remotion/shorts-farm-composition";

const LAMBDA_FUNCTION_NAME = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;
const LAMBDA_REGION = process.env.REMOTION_LAMBDA_REGION! as any;

export const renderVideo = internalAction({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const { projectId } = args;
        console.log("Kicking off render for project", projectId);

        // 1. Gather all data for the render
        const script = await ctx.runQuery(api.scripts.getScriptByProjectId, { projectId });
        if (!script) throw new Error("Script not found");
        if (!script.captions) throw new Error("Captions not found");

        const backgroundAssets = await ctx.runQuery(api.assets.getBackgroundAssets, {});
        if (!backgroundAssets || backgroundAssets.length === 0) {
            throw new Error("No background assets found. Please upload at least one.");
        }
        const randomBackgroundAsset = backgroundAssets[Math.floor(Math.random() * backgroundAssets.length)];
        const backgroundUrl = randomBackgroundAsset.url;

        // 2. Assemble the input props for the Remotion composition
        const inputProps: z.infer<typeof ShortsFarmSchema> = {
            renderData: {
                script,
                backgroundUrl,
            }
        };

        const serveUrl = process.env.REMOTION_SERVE_URL!;
        if (!serveUrl) {
            throw new Error("REMOTION_SERVE_URL environment variable not set!");
        }

        const { renderId, bucketName } = await renderMediaOnLambda({
            region: LAMBDA_REGION,
            functionName: LAMBDA_FUNCTION_NAME,
            serveUrl: serveUrl,
            composition: "ShortsFarm", // This must match the ID in remotion-root.tsx
            inputProps,
            codec: "h264",
            maxRetries: 2,
            privacy: "public",
            framesPerLambda: 50,
            timeoutInMilliseconds: 300000, // 5 minutes
            // The webhook is now essential for getting the final video back into Convex
            webhook: {
                url: `${process.env.CONVEX_URL!.replace("cloud", "site")}/remotionWebhook`,
                secret: process.env.REMOTION_WEBHOOK_SECRET!,
            },
        });

        // Store the renderId so we can track the progress
        await ctx.runMutation(internal.projects.addRenderInfo, {
            projectId,
            renderId,
            bucketName,
        });

        console.log("Render started!", { renderId, bucketName });
        return { renderId, bucketName };
    },
});

export const getRenderProgressAction = action({
    args: {
        renderId: v.string(),
        bucketName: v.string(),
    },
    handler: async (ctx, args) => {
        const { renderId, bucketName } = args;

        const progress = await getRenderProgress({
            renderId,
            bucketName,
            functionName: LAMBDA_FUNCTION_NAME,
            region: LAMBDA_REGION,
        });

        console.log("Current render progress:", progress.overallProgress);

        return progress;
    }
});