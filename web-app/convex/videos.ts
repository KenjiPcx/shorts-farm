import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
    args: {
        projectId: v.id("projects"),
        storageId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("videos", {
            projectId: args.projectId,
            storageId: args.storageId,
        });
    },
}); 