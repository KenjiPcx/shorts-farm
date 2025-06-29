"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { z } from "zod";
import { Doc } from "./_generated/dataModel";
import { vLessonPlanScene } from "./schema";
import dedent from "dedent";
import { CharacterWithAssets } from "./characters";
import { generateObject } from "ai";
import { model } from "./model";
import { tigris, TIGRIS_BUCKET_NAME } from "./lib/tigris";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

const FinalDialogueTurnSchema = z.object({
    character: z.string().describe("The name of the character speaking."),
    line: z.string().describe("The character's final, polished line. Do not use any markdown formatting, like asterisks or anything like that."),
    expression: z.string().describe("The character's expression (e.g., 'happy', 'sad', 'thinking'). This must match one of the available assets for the character."),
    characterAssetUrl: z.string().describe("The public URL of the character's asset to use for the expression. This must be one of the URLs from the character's asset list."),
});

const FinalSceneSchema = z.object({
    scenes: z.array(z.object({
        sceneNumber: z.number().describe("The order of the scene in the video."),
        contentImageUrl: z.string().optional().describe("The URL of the image to display for this scene, taken from the plan."),
        contentImageToGenerate: z.string().optional().describe("The DALL-E prompt for the image to generate, taken from the plan."),
        dialogues: z.array(FinalDialogueTurnSchema).describe("The sequence of final dialogue turns for this scene."),
    })).describe("The full, final script for the video."),
});

// --- Agent Definitions ---

const systemPrompt = dedent`
    You are a professional scriptwriter for educational videos. You will be given a high-level plan for a video, including scenes with content images and dialogue descriptions.

    Your job is to turn this plan into a final, polished script.
    - For each dialogue turn, take the 'lineDescription' and write a natural, engaging line for the specified 'character'.
    - Choose an 'expression' for the character that fits the line. The expression must be one of the available assets provided for that character.
    - You must select the corresponding 'characterAssetUrl' from the character's assets based on the chosen expression.
    - The 'contentImageUrl' and 'contentImageToGenerate' are for context; do not change them. Simply pass them through to the final output.
`

// --- Main Action ---

export const write = internalAction({
    args: {
        projectId: v.id("projects"),
        castId: v.id("casts"),
        userId: v.string(),
        lessonPlan: v.array(vLessonPlanScene),
    },
    handler: async (ctx, args): Promise<Doc<"scripts">["scenes"]> => {
        try {
            const { lessonPlan, castId } = args;

            const cast = await ctx.runQuery(internal.casts.getCast, { castId });
            if (!cast) throw new Error("Cast not found.");

            const characters: CharacterWithAssets[] = await ctx.runQuery(internal.characters.getCharactersForCastWithAssets, { castId }); // Already has assets
            if (!characters || characters.length === 0) throw new Error("Characters not found for cast.");

            const characterMap = new Map<string, Doc<"characters">>(characters.map(c => [c.name, c]));
            const castDynamics = `The cast is ${cast.name}. Their dynamic is: ${cast.dynamics}`;

            const { object: finalScript } = await generateObject({
                model: model,
                system: systemPrompt,
                prompt: dedent`
                Cast Info:
                ${castDynamics}
                Characters:
                ${JSON.stringify(characters)}
                High-Level Plan:
                ${JSON.stringify(lessonPlan)}
                Please write the final, detailed script. The script should be about 60 seconds to complete.
                The script should tie back to the cast and their characters's universe.
                You should act as the characters, and write the script in their voice.
                
                For your line items, do not use any markdown formatting, like asterisks or anything like that.
                Don't output in markdown or in any way that would affect the voice generation, like don't use asterisks or anything like that.`,
                schema: FinalSceneSchema,
            });

            console.log("--- Final Script ---");

            const finalScenes = await Promise.all(finalScript.scenes.map(async (scene) => {
                const dialogues = scene.dialogues.map(dialogue => {
                    const characterDoc = characterMap.get(dialogue.character);
                    if (!characterDoc) {
                        throw new Error(`Could not find character: ${dialogue.character}`);
                    }
                    return {
                        characterId: characterDoc._id,
                        line: dialogue.line,
                        characterExpression: dialogue.expression,
                        characterAssetUrl: dialogue.characterAssetUrl,
                    };
                });

                let finalContentImageUrl = scene.contentImageUrl;

                // Reupload contentImageUrl to our own cloud store
                if (scene.contentImageUrl) {
                    try {
                        console.log(`Reuploading image from: ${scene.contentImageUrl}`);
                        const response = await fetch(scene.contentImageUrl);
                        if (response.ok) {
                            const imageBlob = await response.blob();
                            const contentType = imageBlob.type;
                            const fileExtension = contentType.split('/')[1] || 'jpg';
                            const key = `image-${uuidv4()}.${fileExtension}`;
                            const command = new PutObjectCommand({
                                Bucket: TIGRIS_BUCKET_NAME,
                                Key: key,
                                Body: Buffer.from(await imageBlob.arrayBuffer()),
                                ContentType: contentType,
                                ACL: 'public-read',
                            });
                            await tigris.send(command);
                            finalContentImageUrl = `${process.env.TIGRIS_AWS_ENDPOINT_URL_S3}/${TIGRIS_BUCKET_NAME}/${key}`;
                            console.log(`Reuploaded to: ${finalContentImageUrl}`);
                        } else {
                            console.warn(`Failed to fetch image: ${scene.contentImageUrl}, status: ${response.status}`);
                        }
                    } catch (error) {
                        console.error(`Error processing image ${scene.contentImageUrl}:`, error);
                    }
                }

                return {
                    sceneNumber: scene.sceneNumber,
                    contentImageUrl: finalContentImageUrl,
                    contentImageToGenerate: scene.contentImageToGenerate,
                    dialogues: dialogues,
                };
            }));

            const scriptId = await ctx.runMutation(internal.scripts.create, {
                projectId: args.projectId,
                scenes: finalScenes,
            });

            await ctx.runMutation(api.projects.updateProjectScript, {
                projectId: args.projectId,
                scriptId: scriptId,
            });

            return finalScenes;
        } catch (error) {
            console.error("Error in script writer:", error);
            await ctx.runMutation(api.projects.updateProjectStatus, {
                projectId: args.projectId,
                status: "error",
                statusMessage: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    },
}); 