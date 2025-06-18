import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal, components } from "../_generated/api";
import { Agent } from "@convex-dev/agent";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { Doc, Id } from "../_generated/dataModel";

const SceneSchema = z.object({
    scenes: z.array(z.object({
        sceneNumber: z.number().describe("The order of the scene in the video."),
        type: z.enum(["dialogue", "content", "fx"]).describe("The type of scene."),
        character: z.string().optional().describe("For 'dialogue' scenes, the name of the character speaking."),
        line: z.string().optional().describe("For 'dialogue' scenes, the character's line."),
        title: z.string().optional().describe("For 'content' scenes, the title of the concept being displayed."),
        text: z.string().optional().describe("For 'content' scenes, the text to display on screen."),
        sound: z.string().optional().describe("For 'fx' scenes, a description of the sound effect (e.g., 'whoosh')."),
        visual: z.string().optional().describe("For 'fx' scenes, a description of the visual effect (e.g., 'zoom-in').")
    })).describe("The full sequence of scenes for the video."),
});

const CritiqueSchema = z.object({
    feedback: z.string().describe("Constructive feedback on the script, focusing on character voice, clarity, and engagement."),
    suggestions: z.string().describe("Specific suggestions for improvement."),
});

// --- Agent Definitions ---

const director = new Agent(components.agent, {
    chat: openai.chat("gpt-4-turbo"),
    instructions: `You are a director and scriptwriter for short, engaging educational videos.
Your goal is to create a "director's script" by turning a lesson plan into a sequence of scenes.

A scene can be one of three types:
1.  'dialogue': A character speaking. This should be used for the 'teacher' character to explain concepts or for the 'student' to ask questions.
2.  'content': A visual presentation of a key concept from the lesson plan, with a title and text. This is for displaying information directly to the viewer.
3.  'fx': A sound or visual effect to make the video more engaging (e.g., a "whoosh" sound).

You must structure your output according to the provided schema. For each scene, provide the scene number and type, and then fill in the relevant fields for that type.
- For 'dialogue', specify the 'character' and 'line'.
- For 'content', specify the 'title' and 'text'.
- For 'fx', you can specify a 'sound' or 'visual' effect.

Create a varied and well-paced script that balances dialogue with direct content presentation.`,
});

const critic = new Agent(components.agent, {
    chat: openai.chat("gpt-4o-mini"),
    instructions: "You are a script critic. Review the following script. Is it engaging? Is the pacing good? Is it true to the characters' personas? Does it effectively teach the lesson plan? Provide constructive feedback and specific suggestions for improvement.",
});

const reviser = new Agent(components.agent, {
    chat: openai.chat("gpt-4-turbo"),
    instructions: "You are a script reviser. Your task is to rewrite the original script based on the provided critique. Integrate the feedback and suggestions to create a superior, polished final script that follows the director's script format.",
});


// --- Main Action ---

export const write = internalAction({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args): Promise<string> => {
        const project = await ctx.runQuery(internal.projects.get, { projectId: args.projectId });
        if (!project || !project.plan || !project.castId) {
            throw new Error("Project details not found for writing script.");
        }

        const cast = await ctx.runQuery(internal.assets.getCast, { castId: project.castId });
        if (!cast) {
            throw new Error("Cast not found.");
        }
        const characters = await ctx.runQuery(internal.assets.getCharactersForCast, { castId: project.castId });
        if (!characters || characters.length === 0) {
            throw new Error("Characters not found for cast.");
        }

        const characterMap = new Map<string, Doc<"characters">>(characters.map(c => [c.name, c]));

        const lessonPlan = project.plan;
        const characterPersonas = JSON.stringify(
            characters.map(c => ({
                name: c.name,
                persona: c.description,
            }))
        );
        const castDynamics = `The cast is ${cast.name}. Their dynamic is: ${cast.dynamics}`;

        // --- Step 1: Draft Script ---
        const { thread: directorThread } = await director.createThread(ctx, { userId: project.userId });
        let { object: script } = await directorThread.generateObject({
            prompt: `Cast Info:\n${castDynamics}\n\nCharacters:\n${characterPersonas}\n\nLesson Plan:\n${lessonPlan}\n\nPlease write the director's script.`,
            schema: SceneSchema,
        });
        console.log("--- Script Draft 1 ---");

        // --- Step 2 & 3: Review and Revise Loop (x2) ---
        for (let i = 0; i < 2; i++) {
            console.log(`--- Review Loop ${i + 1} ---`);
            const { thread: criticThread } = await critic.createThread(ctx, { userId: project.userId });
            const { object: critique } = await criticThread.generateObject({
                prompt: `Cast Info:\n${castDynamics}\n\nCharacter Personas:\n${characterPersonas}\n\nScript to review:\n${JSON.stringify(script)}`,
                schema: CritiqueSchema,
            });
            console.log("Critique:", critique);

            const { thread: reviserThread } = await reviser.createThread(ctx, { userId: project.userId });
            const { object: revisedScript } = await reviserThread.generateObject({
                prompt: `Cast Info:\n${castDynamics}\n\nOriginal Script:\n${JSON.stringify(script)}\n\nCritique:\n${JSON.stringify(critique)}\n\nPlease provide a revised script.`,
                schema: SceneSchema,
            });
            script = revisedScript;
            console.log(`--- Revised Script ${i + 1} ---`);
        }

        const finalScenes = script.scenes.map((scene, i) => {
            if (scene.type === 'dialogue' && scene.character) {
                const characterDoc = characterMap.get(scene.character);
                return { ...scene, characterId: characterDoc?._id };
            }
            return scene;
        });

        await ctx.runMutation(internal.scripts.create, {
            projectId: args.projectId,
            scenes: finalScenes,
        });

        await ctx.runMutation(internal.projects.updateProjectStatus, {
            projectId: args.projectId,
            status: "generating",
        });

        return "Script finalized after review loops.";
    },
}); 