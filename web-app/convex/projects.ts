import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export const get = internalQuery({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args): Promise<Doc<"projects"> | null> => {
        return await ctx.db.get(args.projectId);
    },
});

export const updateProjectStatus = internalMutation({
    args: {
        projectId: v.id("projects"),
        status: v.union(
            v.literal("planning"),
            v.literal("writing"),
            v.literal("generating"),
            v.literal("rendering"),
            v.literal("done"),
            v.literal("error")
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, { status: args.status });
    },
});

export const updateProjectPlan = internalMutation({
    args: {
        projectId: v.id("projects"),
        plan: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, { plan: args.plan, status: "writing" });
    },
});

export const updateProjectScript = internalMutation({
    args: {
        projectId: v.id("projects"),
        scriptId: v.id("scripts"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, {
            scriptId: args.scriptId,
            status: "generating",
        });
    },
});

export const updateProjectVideo = internalMutation({
    args: {
        projectId: v.id("projects"),
        videoId: v.id("videos"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, {
            videoId: args.videoId,
            status: "done",
        });
    },
}); 