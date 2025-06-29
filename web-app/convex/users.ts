import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const addTokens = mutation({
    args: {
        tokensToAdd: v.number(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const userProperties = await ctx.db
            .query("userProperties")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .unique();

        if (userProperties) {
            await ctx.db.patch(userProperties._id, { tokens: userProperties.tokens + args.tokensToAdd });
        } else {
            // This case can happen if a user purchases tokens before ever creating a project.
            await ctx.db.insert("userProperties", {
                userId,
                // They get the purchased tokens, plus their initial free one.
                tokens: args.tokensToAdd + 1,
            });
        }
    },
}); 

export const getUserProperties = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("userProperties").withIndex("by_userId", (q) => q.eq("userId", args.userId)).unique();
    }
});