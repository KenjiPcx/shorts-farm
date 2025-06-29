import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { vLessonPlanScene } from "./schema";
import { api, internal } from "./_generated/api";

export type ProjectWithScript = Doc<"projects"> & {
    script?: Doc<"scripts"> | null,
    videoUrl?: string | null,
    user?: string | null,
    thumbnailUrl?: string | null,
    account?: Doc<"accounts"> | null
};

export const createProjectForTopic = internalMutation({
    args: {
        topic: v.string(),
        userId: v.id("users"),
        castId: v.optional(v.id("casts")),
        urls: v.optional(v.array(v.string())),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("projects", {
            topic: args.topic,
            userId: args.userId,
            castId: args.castId,
            status: "gathering",
            urls: args.urls,
            accountId: args.accountId,
        });
    }
});

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

export const getRecentTopicsByAccountId = internalQuery({
    args: {
        accountId: v.id("accounts"),
    },
    handler: async (ctx, args) => {
        const projects = await ctx.db
            .query("projects")
            .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
            .order("desc")
            .take(25);

        return projects.map(p => p.topic).filter((t): t is string => !!t);
    }
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
                const thumbnail = project.thumbnailStorageId ? await ctx.storage.getUrl(project.thumbnailStorageId) : null;
                const account = project.accountId ? await ctx.db.get(project.accountId) : null;
                return { ...project, script, videoUrl: video?.finalUrl ?? null, user: user?.name ?? null, thumbnailUrl: thumbnail ?? null, account };
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
                const thumbnail = project.thumbnailStorageId ? await ctx.storage.getUrl(project.thumbnailStorageId) : null;
                return { ...project, script, videoUrl: video?.finalUrl ?? null, user: user?.name ?? null, thumbnailUrl: thumbnail ?? null };
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
        const thumbnail = project.thumbnailStorageId ? await ctx.storage.getUrl(project.thumbnailStorageId) : null;
        const account = project.accountId ? await ctx.db.get(project.accountId) : null;

        return {
            project,
            script,
            video,
            cast,
            media,
            thumbnailUrl: thumbnail ?? null,
            account,
        };
    },
});

export const getProject = internalQuery({
    args: {
        projectId: v.id("projects")
    },
    handler: async (ctx, {
        projectId
    }) => {
        return await ctx.db.get(projectId);
    },
});

export const appendProjectPublishedMediaId = mutation({
    args: {
        projectId: v.id("projects"),
        platform: v.string(),
        mediaId: v.string(),
    },
    handler: async (ctx, args) => {
        const project = await ctx.db.get(args.projectId);
        if (!project) throw new Error("Project not found");

        await ctx.db.patch(args.projectId, {
            publishedMediaIds: [...(project.publishedMediaIds || []),
            {
                platform: args.platform,
                mediaId: args.mediaId
            }]
        });
    },
});

export const schedulePostingIfNeeded = internalMutation({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const project = await ctx.db.get(args.projectId);
        if (!project?.accountId) return;

        const account = await ctx.db.get(project.accountId);
        if (!account?.postSchedule) return;

        try {
            const [hours, minutes] = account.postSchedule.split(':').map(Number);
            const now = new Date();
            const nextPostDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

            // If the time has already passed for today, schedule it for tomorrow
            if (nextPostDate < now) {
                nextPostDate.setDate(nextPostDate.getDate() + 1);
            }

            console.log(`Scheduling post for project ${args.projectId} at ${nextPostDate}`);
            await ctx.scheduler.runAt(nextPostDate, api.posting.postToInstagram, {
                projectId: args.projectId,
                accountId: project.accountId,
            });
        } catch (err) {
            console.error('Failed to parse time string or schedule post:', err);
        }
    },
});

export const getRecentProjectsForAccount = internalQuery({
    args: {
        accountId: v.id("accounts"),
    },
    handler: async (ctx, { accountId }) => {
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
        return await ctx.db
            .query("projects")
            .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
            .filter((q) => q.gt(q.field("_creationTime"), threeDaysAgo))
            .order("desc")
            .take(10);
    },
});