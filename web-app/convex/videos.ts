import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
    args: {
        projectId: v.id("projects"),
        url: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("videos", {
            projectId: args.projectId,
            finalUrl: args.url,
        });
    },
});

export const getVideoByProjectId = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("videos").withIndex("by_projectId", (q) => q.eq("projectId", args.projectId)).first();
    },
});

export const getVideoById = query({
    args: {
        id: v.id("videos"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const getVideosByProjectIds = query({
    args: {
        projectIds: v.array(v.id("projects")),
    },
    handler: async (ctx, args) => {
        return await Promise.all(args.projectIds.map(id => ctx.db.get(id)));
    },
});