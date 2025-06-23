import { mutation, internalQuery, query, action } from "./_generated/server";
import { v } from "convex/values";
import { vAsset } from "./schema";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { tigris, TIGRIS_BUCKET_NAME } from "./lib/tigris";
import { v4 as uuidv4 } from "uuid";
import { api } from "./_generated/api";

const S3_PRESIGNED_URL_EXPIRATION_SECONDS = 3600; // 1 hour

// Generates a pre-signed URL for uploading a file to Tigris.
export const generatePresignedUploadUrl = mutation({
    args: {
        fileName: v.string(),
        fileType: v.string(),
    },
    handler: async (_ctx, args) => {
        const fileExtension = args.fileName.split(".").pop();
        const key = `asset-${uuidv4()}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: TIGRIS_BUCKET_NAME,
            Key: key,
            ContentType: args.fileType,
            ACL: "public-read",
        });

        const presignedUrl = await getSignedUrl(tigris, command, {
            expiresIn: S3_PRESIGNED_URL_EXPIRATION_SECONDS,
        });

        const publicUrl = `${process.env.TIGRIS_AWS_ENDPOINT_URL_S3}/${TIGRIS_BUCKET_NAME}/${key}`;

        return { presignedUrl, publicUrl };
    },
});

// Creates a new asset in the database after a file has been uploaded to Tigris.
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
        return await ctx.db
            .query("assets")
            .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
            .collect();
    }
});

export const getBackgroundAssets = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("assets")
            .filter(q => q.eq(q.field("type"), "background-asset"))
            .collect();
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
        return await query.collect();
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
            // Delete from Convex
            await ctx.db.delete(args.assetId);
            // Delete from Tigris
            await ctx.scheduler.runAfter(0, api.assets.deleteAssetFromTigris, { url: asset.url });
        }
    }
});

export const deleteAssetFromTigris = action({
    args: { url: v.string() },
    handler: async (ctx, args) => {
        const key = args.url.substring(args.url.lastIndexOf('/') + 1);
        const command = new DeleteObjectCommand({
            Bucket: TIGRIS_BUCKET_NAME,
            Key: key,
        });
        await tigris.send(command);
    }
});