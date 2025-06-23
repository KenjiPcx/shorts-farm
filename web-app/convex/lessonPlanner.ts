import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { z } from "zod";
import { Doc } from "./_generated/dataModel";
import dedent from "dedent";
import { CharacterWithAssets } from "./characters";
import { generateObject } from "ai";
import { model } from "./model";

const LessonPlanSchema = z.object({
    lessonPlan: z.array(z.object({
        sceneNumber: z.number(),
        contentImageUrl: z.string().optional().describe("A URL from the website to display."),
        contentImageToGenerate: z.string().optional().describe("A prompt for an AI to generate a new image if no suitable one is found."),
        dialoguePlan: z.array(z.object({
            character: z.string().describe("The name of the character who is speaking."),
            lineDescription: z.string().describe("A high-level description of what the character should say."),
        })),
    })).describe("A structured lesson plan breaking down the topic into scenes."),
});

const systemPrompt = dedent`
    You are a creative director and storyboarder. Your task is to take research material (text and image URLs) and create a high-level plan for a short educational video.

    For each scene, you must:
    1.  Decide on the visual content. You can either pick a URL from the website or write a prompt for an AI to generate a new image. Prefer using the website images over generating new ones, we only generate new ones to fill in gaps where there are not many images available. Do not use both for the same scene. If the scene is just dialogue, you can omit both.
    2.  Plan the dialogue. For each turn in the conversation, describe who is talking ('character') and what they should talk about ('lineDescription'). This is a plan, not the final script, so focus on the key points the character needs to make.
`

export const plan = internalAction({
    args: {
        userId: v.string(),
        projectId: v.id("projects"),
        castId: v.id("casts"),
        rawText: v.string(),
        imageUrls: v.array(v.string()),
    },
    handler: async (ctx, args): Promise<Doc<"projects">["plan"]> => {
        try {
            const { rawText, castId } = args;

            const characters: CharacterWithAssets[] = await ctx.runQuery(internal.characters.getCharactersForCastWithAssets, { castId });
            if (!characters || characters.length === 0) throw new Error("Characters not found for cast.");
            const characterMap = new Map<string, Doc<"characters">>(characters.map(c => [c.name, c]));

            const characterNames = characters.map(c => c.name);

            const { object: lessonPlan } = await generateObject({
                model: model,
                system: systemPrompt,
                prompt: dedent`
                Here is the research material:
                Text:
                ${rawText}
                Use the images within the research material, they are markdown images, but should have enough context descriptions accompanying them.
                The characters available are: ${characterNames.join(", ")}
                Please create a lesson plan based on the text. The lesson plan should tie back to the cast and their characters's universe and should take about 60 seconds to complete.
            `,
                schema: LessonPlanSchema,
            });

            console.log("Lesson Planner output:", lessonPlan);

            const finalPlan = lessonPlan.lessonPlan.map(scene => {
                const dialoguePlan = scene.dialoguePlan.map(turn => {
                    const character = characterMap.get(turn.character);
                    if (!character) throw new Error(`Character ${turn.character} not found in cast.`);
                    return {
                        characterId: character._id,
                        lineDescription: turn.lineDescription,
                    };
                });
                return {
                    sceneNumber: scene.sceneNumber,
                    contentImageUrl: scene.contentImageUrl,
                    contentImageToGenerate: scene.contentImageToGenerate,
                    dialoguePlan: dialoguePlan,
                };
            });

            await ctx.runMutation(api.projects.updateProjectPlan, {
                projectId: args.projectId,
                plan: finalPlan,
            });

            await ctx.runMutation(api.projects.updateProjectStatus, {
                projectId: args.projectId,
                status: "writing",
            });

            return finalPlan;
        } catch (error) {
            console.error("Error in lesson planner:", error);
            await ctx.runMutation(api.projects.updateProjectStatus, {
                projectId: args.projectId,
                status: "error",
                statusMessage: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    },
}); 