import { mutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { vAsset } from "./schema";

// Generates a URL for uploading a file to Convex file storage.
export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

// Creates a new asset in the database after a file has been uploaded.
export const createAsset = mutation({
    args: vAsset,
    handler: async (ctx, args) => {
        await ctx.db.insert("assets", {
            ...args
        });
    },
});

export const get = internalQuery({
    args: { id: v.id("assets") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const getCharacterAssets = internalQuery({
    args: { characterId: v.id("characters") },
    handler: async (ctx, args) => {
        const assets = await ctx.db
            .query("assets")
            .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
            .collect();

        return Promise.all(
            assets.map(async (asset) => {
                const url = await ctx.storage.getUrl(asset.storageId);
                return { ...asset, url };
            })
        );
    }
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
        let query = ctx.db.query("assets");
        if (args.type) {
            query = query.filter(q => q.eq(q.field("type"), args.type));
        }
        const assets = await query.collect();

        const assetsWithUrls = await Promise.all(
            assets.map(async (asset) => {
                const url = await ctx.storage.getUrl(asset.storageId);
                if (!url) {
                    return null;
                }
                return { ...asset, url };
            })
        );
        return assetsWithUrls.filter((a): a is Exclude<typeof a, null> => a !== null);
    },
});

export const getAssetUrl = query({
    args: { storageId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId as any);
    },
});

export const getAssetsForCast = internalQuery({
    args: {
        castId: v.id("casts"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("assets")
            .withIndex("by_castId", q => q.eq("castId", args.castId))
            .collect();
    }
});

export const updateAsset = mutation({
    args: {
        assetId: v.id("assets"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { assetId, ...rest } = args;
        await ctx.db.patch(assetId, rest);
    },
});

export const deleteAsset = mutation({
    args: { assetId: v.id("assets") },
    handler: async (ctx, args) => {
        const asset = await ctx.db.get(args.assetId);
        if (asset) {
            await ctx.storage.delete(asset.storageId);
            await ctx.db.delete(args.assetId);
        }
    }
}); 