import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { vLessonPlanScene } from "./schema";

export type ProjectWithScript = Doc<"projects"> & { script?: Doc<"scripts"> | null, videoUrl?: string | null, user?: string | null };

export const get = internalQuery({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args): Promise<Doc<"projects"> | null> => {
        return await ctx.db.get(args.projectId);
    },
});

export const addRenderInfo = internalMutation({
    args: {
        projectId: v.id("projects"),
        renderId: v.string(),
        bucketName: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, { renderId: args.renderId, bucketName: args.bucketName });
    },
});

export const getByRenderId = internalQuery({
    args: { renderId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("projects")
            .withIndex("by_renderId", (q) => q.eq("renderId", args.renderId))
            .unique();
    },
});

export const setFinalVideoId = internalMutation({
    args: {
        projectId: v.id("projects"),
        videoId: v.id("videos"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, {
            videoId: args.videoId,
            status: "done"
        });
    },
});

export const updateProjectStatus = mutation({
    args: {
        projectId: v.id("projects"),
        status: v.union(
            v.literal("gathering"),
            v.literal("planning"),
            v.literal("writing"),
            v.literal("generating-voices"),
            v.literal("rendering"),
            v.literal("done"),
            v.literal("error")
        ),
        statusMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, { status: args.status, statusMessage: args.statusMessage });
    },
});

export const updateProjectPlan = mutation({
    args: {
        projectId: v.id("projects"),
        plan: v.array(vLessonPlanScene),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, { plan: args.plan });
    },
});

export const updateProjectScript = mutation({
    args: {
        projectId: v.id("projects"),
        scriptId: v.id("scripts"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, {
            scriptId: args.scriptId,
            status: "generating-voices",
        });
    },
});

export const updateProjectVideo = mutation({
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

export const deleteProject = mutation({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const project = await ctx.db.get(args.projectId);
        if (!project || project.userId !== userId) {
            throw new Error("Not authorized");
        }

        await ctx.db.delete(args.projectId);
    },
});

// Get projects for the current user
export const getMyProjects = query({
    handler: async (ctx): Promise<ProjectWithScript[]> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const projects = await ctx.db
            .query("projects")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();

        return Promise.all(
            projects.map(async (project) => {
                const script = project.scriptId
                    ? await ctx.db.get(project.scriptId)
                    : null;
                const video = project.videoId
                    ? await ctx.db.get(project.videoId)
                    : null;
                const user = project.userId ? await ctx.db.get(project.userId) : null;
                return { ...project, script, videoUrl: video?.finalUrl ?? null, user: user?.name ?? null };
            })
        );
    },
});

export const getAllProjects = query({
    handler: async (ctx): Promise<ProjectWithScript[]> => {
        const projects = await ctx.db
            .query("projects")
            .order("desc")
            .collect();

        return Promise.all(
            projects.map(async (project) => {
                const script = project.scriptId
                    ? await ctx.db.get(project.scriptId)
                    : null;
                const video = project.videoId
                    ? await ctx.db.get(project.videoId)
                    : null;
                const user = project.userId ? await ctx.db.get(project.userId) : null;
                return { ...project, script, videoUrl: video?.finalUrl ?? null, user: user?.name ?? null };
            })
        );
    },
});

// Get project details with related data
export const getProjectDetails = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const project = await ctx.db.get(args.projectId);
        if (!project) return null;

        const script = project.scriptId ? await ctx.db.get(project.scriptId) : null;
        const video = project.videoId ? await ctx.db.get(project.videoId) : null;
        const cast = project.castId ? await ctx.db.get(project.castId) : null;
        const media = await ctx.db
            .query("media")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
            .collect();

        return {
            project,
            script,
            video,
            cast,
            media,
        };
    },
});