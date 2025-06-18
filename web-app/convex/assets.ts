import { mutation, internalQuery, query } from "./_generated/server";
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
        description: v.string(),
        type: v.union(v.literal("character-asset"), v.literal("background-asset"), v.literal("sound-effect")),
        characterId: v.optional(v.id("characters")),
        castId: v.optional(v.id("casts")),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("assets", {
            ...args
        });
    },
});

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

// Creates a new character and assigns them to a cast.
export const createCharacter = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        castId: v.id("casts"),
        voiceId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("characters", {
            ...args
        });
    }
});

export const getCast = internalQuery({
    args: { castId: v.id("casts") },
    handler: async (ctx, args): Promise<Doc<"casts"> | null> => {
        return await ctx.db.get(args.castId);
    },
});

// Gets all characters for a cast, along with their associated assets.
export const getCharactersForCast = internalQuery({
    args: { castId: v.id("casts") },
    handler: async (ctx, args) => {
        // 1. Get all characters for the cast
        const characters = await ctx.db
            .query("characters")
            .withIndex("by_castId", (q) => q.eq("castId", args.castId))
            .collect();

        // 2. Get all character assets for the cast
        const castAssets = await ctx.db
            .query("assets")
            .withIndex("by_castId", (q) => q.eq("castId", args.castId))
            .filter(q => q.eq(q.field("type"), "character-asset"))
            .collect();

        // 3. Map assets to their characters
        const charactersWithAssets = characters.map((character) => {
            const assets = castAssets
                .filter((asset) => asset.characterId === character._id)
                .map(asset => ({ name: asset.name, description: asset.description }));
            return { ...character, assets };
        });

        return charactersWithAssets;
    },
});

export const getBackgroundAssets = query({
    args: {},
    handler: async (ctx) => {
        const assets = await ctx.db
            .query("assets")
            .filter(q => q.eq(q.field("type"), "background-asset"))
            .collect();

        const assetsWithUrls = await Promise.all(
            assets.map(async (asset) => {
                const url = await ctx.storage.getUrl(asset.storageId);
                if (!url) {
                    return null;
                }
                return { ...asset, url };
            })
        );
        return assetsWithUrls.filter(a => a !== null);
    },
});

export const getAssets = query({
    args: {
        type: v.optional(v.union(v.literal("character-asset"), v.literal("background-asset"), v.literal("sound-effect"))),
    },
    handler: async (ctx, args) => {
        const assets = await ctx.db
            .query("assets")
            .filter(q => q.eq(q.field("type"), args.type))
            .collect();

        const assetsWithUrls = await Promise.all(
            assets.map(async (asset) => {
                const url = await ctx.storage.getUrl(asset.storageId);
                if (!url) {
                    return null;
                }
                return { ...asset, url };
            })
        );
        return assetsWithUrls.filter(a => a !== null);
    },
}); 