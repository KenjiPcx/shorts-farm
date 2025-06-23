import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
    args: {
        projectId: v.id("projects"),
        storageId: v.id("_storage"),
        type: v.union(v.literal("image"), v.literal("audio"), v.literal("video")),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("media", {
            projectId: args.projectId,
            storageId: args.storageId,
            type: args.type,
        });
    },
}); 