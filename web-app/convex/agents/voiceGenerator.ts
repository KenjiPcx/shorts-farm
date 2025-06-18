"use node"

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const FISH_API_KEY = process.env.FISH_API_KEY!;

async function generateVoiceover(text: string, voiceId: string): Promise<Blob | string> {
    if (!FISH_API_KEY) {
        console.warn("FISH_API_KEY not set, returning placeholder audio.");
        return "placeholder_audio_storage_id"; // Placeholder
    }
    console.log(`Generating voiceover for: "${text.substring(0, 20)}..." using voice ${voiceId}`);

    const response = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${FISH_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text: text,
            voice_id: voiceId,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Fish Audio API failed: ${response.status} ${errorBody}`);
    }

    const audioBlob = await response.blob();
    return audioBlob;
}

export const generate = internalAction({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const project = await ctx.runQuery(internal.projects.get, { projectId: args.projectId });
        if (!project || !project.scriptId || !project.castId) {
            throw new Error("Project, script, or cast not found for voice generation");
        }
        const script = await ctx.runQuery(internal.scripts.get, { scriptId: project.scriptId });
        const characters = await ctx.runQuery(internal.assets.getCharactersForCast, { castId: project.castId });
        if (!script || !characters) {
            throw new Error("Script or characters not found");
        }

        await ctx.runMutation(internal.projects.updateProjectStatus, {
            projectId: args.projectId,
            status: "generating",
        });

        for (const line of script.dialogue) {
            const character = characters.find(c => c.name === line.character);
            if (character?.voiceId) {
                const audioBlob = await generateVoiceover(line.line, character.voiceId);
                if (typeof audioBlob === "string") { // Placeholder case
                    console.warn("Skipping storage for placeholder audio.");
                    continue;
                }
                const storageId = await ctx.storage.store(audioBlob);

                await ctx.runMutation(internal.scripts.addVoiceToDialogueLine, {
                    scriptId: script._id,
                    sceneNumber: line.sceneNumber,
                    voiceStorageId: storageId,
                });
            } else {
                console.warn(`No voiceId found for character: ${line.character}. Skipping.`);
            }
        }
    },
}); 