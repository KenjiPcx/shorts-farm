import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Creates a new cast.
export const createCast = mutation({
    args: {
        name: v.string(),
        dynamics: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("casts", {
            name: args.name,
            dynamics: args.dynamics,
        });
    },
});

export const getCast = internalQuery({
    args: { castId: v.id("casts") },
    handler: async (ctx, args): Promise<Doc<"casts"> | null> => {
        return await ctx.db.get(args.castId);
    },
});

// Get all casts
export const getCasts = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("casts").collect();
    },
});

// Delete a cast and its characters
export const deleteCast = mutation({
    args: { castId: v.id("casts") },
    handler: async (ctx, args) => {
        // Delete all characters in this cast
        const characters = await ctx.db
            .query("characters")
            .filter((q) => q.eq(q.field("castId"), args.castId))
            .collect();

        for (const character of characters) {
            await ctx.db.delete(character._id);
        }

        // Delete the cast
        await ctx.db.delete(args.castId);
    },
});
