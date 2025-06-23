"use node"

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
    openAiWhisperApiToCaptions,
} from "@remotion/openai-whisper";
import { Caption } from "@remotion/captions";
import OpenAI from "openai";

const FISH_API_KEY = process.env.FISH_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

async function generateVoiceover(text: string, voiceId: string): Promise<Blob> {
    if (!FISH_API_KEY) {
        throw new Error("FISH_API_KEY not set");
    }
    console.log(`Generating voiceover for: "${text.substring(0, 20)}..." using voice ${voiceId}`);

    const response = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${FISH_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text: text,
            reference_id: voiceId,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Fish Audio TTS API failed: ${response.status} ${errorBody}`);
    }

    return response.blob();
}

async function getTranscription(audioBlob: Blob): Promise<{ duration: number; captions: Caption[] }> {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY not set");
    }
    console.log("Getting word timings from audio...");

    const audioFile = audioBlob as Blob & { name: string };
    audioFile.name = "audio.mp3";

    const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["word"],
    });

    const { captions } = openAiWhisperApiToCaptions({ transcription });

    return {
        captions,
        duration: transcription.duration,
    };
}

export const generate = internalAction({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args): Promise<void> => {
        try {
            const project = await ctx.runQuery(internal.projects.get, { projectId: args.projectId });
            if (!project || !project.castId) {
                throw new Error("Project, script, or cast not found for voice generation");
            }
            const script = await ctx.runQuery(api.scripts.getScriptByProjectId, { projectId: args.projectId });
            const characters: Doc<"characters">[] = await ctx.runQuery(api.characters.getCharactersByCast, { castId: project.castId });
            if (!script || !script.scenes || !characters) {
                throw new Error("Script, scenes, or characters not found");
            }

            await ctx.runMutation(api.projects.updateProjectStatus, {
                projectId: args.projectId,
                status: "generating-voices",
            });

            const allCaptions: Caption[] = [];
            let cumulativeDurationMs = 0;
            const DIALOGUE_BUFFER_MS = 500;

            for (const scene of script.scenes) {
                for (let i = 0; i < scene.dialogues.length; i++) {
                    const dialogue = scene.dialogues[i];
                    if (dialogue.voiceStorageId) {
                        console.log(`Skipping voice generation for already processed dialogue: ${dialogue.line.substring(0, 20)}...`);
                        cumulativeDurationMs += (dialogue.audioDuration ?? 0) * 1000 + DIALOGUE_BUFFER_MS;
                        continue;
                    }
                    const character = characters.find(c => c._id === dialogue.characterId);
                    if (character?.voiceId) {
                        const audioBlob = await generateVoiceover(dialogue.line, character.voiceId);
                        const { captions, duration } = await getTranscription(audioBlob);

                        const storageId = await ctx.storage.store(audioBlob);
                        const audioUrl = (await ctx.storage.getUrl(storageId)) as string;

                        const offsetCaptions = captions.map((c) => ({
                            ...c,
                            startMs: c.startMs + cumulativeDurationMs,
                            endMs: c.endMs + cumulativeDurationMs,
                        }));
                        allCaptions.push(...offsetCaptions);
                        cumulativeDurationMs += duration * 1000 + DIALOGUE_BUFFER_MS;

                        await ctx.runMutation(internal.scripts.addVoiceToDialogueTurn, {
                            scriptId: script._id,
                            sceneNumber: scene.sceneNumber,
                            dialogueIndex: i,
                            voiceStorageId: storageId,
                            voiceUrl: audioUrl,
                            audioDuration: duration,
                        });
                    } else {
                        const characterName = character ? character.name : `ID: ${dialogue.characterId}`;
                        console.warn(`No voiceId found for character: ${characterName}. Skipping.`);
                    }
                }
            }

            const captionsForDb = allCaptions.map(c => ({
                text: c.text,
                startMs: c.startMs,
                endMs: c.endMs,
                timestampMs: c.startMs,
                confidence: c.confidence ?? null,
            }))

            await ctx.runMutation(internal.scripts.addCaptionsToScript, {
                scriptId: script._id,
                captions: captionsForDb,
            });

            await ctx.runMutation(api.projects.updateProjectStatus, {
                projectId: args.projectId,
                status: "rendering",
            });
        } catch (error) {
            console.error("Error in voice generator:", error);
            await ctx.runMutation(api.projects.updateProjectStatus, {
                projectId: args.projectId,
                status: "error",
                statusMessage: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    },
}); 