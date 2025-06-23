import { internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export const get = internalQuery({
    args: { id: v.id("characters") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
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
        const characterId = await ctx.db.insert("characters", {
            ...args
        });
        return characterId;
    }
});

export const getAll = query({
    handler: async (ctx) => {
        return await ctx.db.query("characters").collect();
    },
});

export const getCharactersByCast = query({
    args: { castId: v.id("casts") },
    handler: async (ctx, args): Promise<Doc<"characters">[]> => {
        // 1. Get all characters for the cast
        const characters = await ctx.db
            .query("characters")
            .withIndex("by_castId", (q) => q.eq("castId", args.castId))
            .collect();

        return characters;
    },
});

export type CharacterWithAssets = Doc<"characters"> & { assets: Doc<"assets">[] };

// Gets all characters for a cast, along with their associated assets.
export const getCharactersForCastWithAssets = internalQuery({
    args: { castId: v.id("casts") },
    handler: async (ctx, args): Promise<CharacterWithAssets[]> => {
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
            const assets = castAssets.filter((asset) => asset.characterId === character._id);
            return { ...character, assets };
        });

        return charactersWithAssets;
    },
});

export const getWithAssets = query({
    args: { characterId: v.id("characters") },
    handler: async (ctx, args) => {
        const character = await ctx.db.get(args.characterId);
        if (!character) {
            return null;
        }

        const assets = await ctx.db
            .query("assets")
            .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
            .collect();

        return { ...character, assets: assets };
    },
});

export const update = mutation({
    args: {
        characterId: v.id("characters"),
        name: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const { characterId, ...rest } = args;
        await ctx.db.patch(characterId, rest);
    },
});

// Delete a character
export const deleteCharacter = mutation({
    args: { characterId: v.id("characters") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.characterId);
    },
});