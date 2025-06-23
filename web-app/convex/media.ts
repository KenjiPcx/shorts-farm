import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
    args: {
        projectId: v.id("projects"),
        url: v.string(),
        type: v.union(v.literal("image"), v.literal("audio"), v.literal("video")),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("media", {
            projectId: args.projectId,
            url: args.url,
            type: args.type,
        });
    },
}); 