import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
    args: {
        projectId: v.id("projects"),
        dialogue: v.array(
            v.object({
                character: v.string(),
                line: v.string(),
                sceneNumber: v.number(),
                imageQuery: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("scripts", {
            projectId: args.projectId,
            dialogue: args.dialogue.map(d => ({ ...d })),
        });
    },
});

export const get = internalQuery({
    args: {
        scriptId: v.id("scripts"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.scriptId);
    }
});

export const addMediaToScene = internalMutation({
    args: {
        scriptId: v.id("scripts"),
        sceneNumber: v.number(),
        mediaId: v.id("media"),
    },
    handler: async (ctx, args) => {
        const script = await ctx.db.get(args.scriptId);
        if (!script) {
            throw new Error("Script not found");
        }
        const dialogueLine = script.dialogue.find(d => d.sceneNumber === args.sceneNumber);
        if (!dialogueLine) {
            throw new Error("Dialogue line not found");
        }
        dialogueLine.mediaId = args.mediaId;
        await ctx.db.patch(args.scriptId, { dialogue: script.dialogue });
    }
});

export const updateScenes = internalMutation({
    args: {
        scriptId: v.id("scripts"),
        scenes: v.array(
            v.object({
                sceneNumber: v.number(),
                character: v.string(),
                line: v.string(),
                imageQuery: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.scriptId, { dialogue: args.scenes });
    }
});

export const addVoiceToDialogueLine = internalMutation({
    args: {
        scriptId: v.id("scripts"),
        sceneNumber: v.number(),
        voiceStorageId: v.string(),
    },
    handler: async (ctx, args) => {
        const script = await ctx.db.get(args.scriptId);
        if (!script) {
            throw new Error("Script not found");
        }
        const dialogueLine = script.dialogue.find(d => d.sceneNumber === args.sceneNumber);
        if (!dialogueLine) {
            throw new Error("Dialogue line not found");
        }
        dialogueLine.voiceStorageId = args.voiceStorageId;
        await ctx.db.patch(args.scriptId, { dialogue: script.dialogue });
    }
}); 