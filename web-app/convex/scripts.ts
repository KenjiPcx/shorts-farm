import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { vScene, vCaption } from "./schema";

export const create = internalMutation({
    args: {
        projectId: v.id("projects"),
        scenes: v.array(vScene),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("scripts", {
            projectId: args.projectId,
            scenes: args.scenes,
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

export const addVoiceToDialogueTurn = internalMutation({
    args: {
        scriptId: v.id("scripts"),
        sceneNumber: v.number(),
        dialogueIndex: v.number(),
        voiceUrl: v.string(),
        audioDuration: v.number(),
    },
    handler: async (ctx, args) => {
        const { scriptId, sceneNumber, dialogueIndex, voiceUrl, audioDuration } = args;

        const script = await ctx.db.get(scriptId);
        if (!script) {
            throw new Error(`Script with id ${scriptId} not found`);
        }

        const scene = script.scenes.find(s => s.sceneNumber === sceneNumber);
        if (!scene) {
            throw new Error(`Scene with number ${sceneNumber} not found in script ${scriptId}`);
        }

        if (scene.dialogues[dialogueIndex]) {
            scene.dialogues[dialogueIndex].voiceUrl = voiceUrl;
            scene.dialogues[dialogueIndex].audioDuration = audioDuration;
        }

        await ctx.db.patch(script._id, { scenes: script.scenes });
    },
});

export const addCaptionsToScript = internalMutation({
    args: {
        scriptId: v.id("scripts"),
        captions: v.array(vCaption),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.scriptId, { captions: args.captions });
    },
});

export const getScriptByProjectId = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const script = await ctx.db.query("scripts").withIndex("by_projectId", (q) => q.eq("projectId", args.projectId)).first();
        return script;
    }
});

export const deleteScriptByProjectId = internalMutation({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const script = await ctx.db.query("scripts").withIndex("by_projectId", (q) => q.eq("projectId", args.projectId)).first();
        if (!script) {
            throw new Error("Script not found");
        }
        await ctx.db.delete(script._id);
    }
});