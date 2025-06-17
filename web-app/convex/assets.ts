import { mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Generates a URL for uploading a file to Convex file storage.
export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

// Creates a new asset in the database after a file has been uploaded.
export const createAsset = mutation({
    args: {
        storageId: v.string(),
        name: v.string(),
        type: v.union(v.literal("character-asset"), v.literal("background-asset"), v.literal("sound-effect")),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("assets", {
            storageId: args.storageId,
            name: args.name,
            description: args.description,
            type: args.type,
        });
    },
});

// Creates a new cast of characters.
export const createCast = mutation({
    args: {
        name: v.string(),
        characters: v.array(
            v.object({
                name: v.string(),
                description: v.string(),
                assets: v.optional(v.array(v.id("assets"))),
            })
        ),
    },
    handler: async (ctx, args) => {
        const castId = await ctx.db.insert("casts", {
            name: args.name,
        });

        for (const character of args.characters) {
            await ctx.db.insert("characters", {
                ...character,
                castId: castId,
            });
        }
    },
});

export const getCast = internalQuery({
    args: { castId: v.id("casts") },
    handler: async (ctx, args): Promise<Doc<"casts"> | null> => {
        return await ctx.db.get(args.castId);
    },
});

export const getCharactersForCast = internalQuery({
    args: { castId: v.id("casts") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("characters")
            .withIndex("by_castId", (q) => q.eq("castId", args.castId))
            .collect();
    },
}); 