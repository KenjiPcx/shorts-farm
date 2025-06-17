import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal, components } from "../_generated/api";
import { Agent } from "@convex-dev/agent";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { Doc, Id } from "../_generated/dataModel";

const DialogueSchema = z.object({
    dialogue: z.array(z.object({
        character: z.string().describe("The name of the character speaking."),
        line: z.string().describe("The character's dialogue for this part of the scene."),
    })).describe("The full dialogue for the scene."),
});

const CritiqueSchema = z.object({
    feedback: z.string().describe("Constructive feedback on the script, focusing on character voice, clarity, and engagement."),
    suggestions: z.string().describe("Specific suggestions for improvement."),
});

// --- Agent Definitions ---

const writer = new Agent(components.agent, {
    chat: openai.chat("gpt-4-turbo"),
    instructions: "You are a scriptwriter for educational videos. Write a dialogue between the provided characters to explain the lesson plan. The 'teacher' character should explain concepts, and the 'student' characters should ask clarifying questions. Make it engaging and easy to understand.",
});

const critic = new Agent(components.agent, {
    chat: openai.chat("gpt-4o-mini"),
    instructions: "You are a script critic. Review the following dialogue and character personas. Provide constructive feedback on whether the dialogue is engaging, clear, and true to the characters' voices. Be specific in your suggestions for improvement.",
});

const reviser = new Agent(components.agent, {
    chat: openai.chat("gpt-4-turbo"),
    instructions: "You are a script reviser. Your task is to rewrite the original script based on the provided critique. Integrate the feedback and suggestions to create a superior, polished final script.",
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

        const characters = await ctx.runQuery(internal.assets.getCharactersForCast, { castId: project.castId });
        if (!characters || characters.length === 0) {
            throw new Error("Characters not found for cast.");
        }

        const lessonPlan = project.plan;
        const characterPersonas = JSON.stringify(characters.map(c => ({ name: c.name, persona: c.description })));

        // --- Step 1: Draft Script ---
        const { thread: writerThread } = await writer.createThread(ctx, { userId: project.userId });
        let { object: script } = await writerThread.generateObject({
            prompt: `Characters:\n${characterPersonas}\n\nLesson Plan:\n${lessonPlan}\n\nPlease write the script.`,
            schema: DialogueSchema,
        });
        console.log("--- Script Draft 1 ---");

        // --- Step 2 & 3: Review and Revise Loop (x2) ---
        for (let i = 0; i < 2; i++) {
            console.log(`--- Review Loop ${i + 1} ---`);
            const { thread: criticThread } = await critic.createThread(ctx, { userId: project.userId });
            const { object: critique } = await criticThread.generateObject({
                prompt: `Character Personas:\n${characterPersonas}\n\nScript to review:\n${JSON.stringify(script)}`,
                schema: CritiqueSchema,
            });
            console.log("Critique:", critique);

            const { thread: reviserThread } = await reviser.createThread(ctx, { userId: project.userId });
            const { object: revisedScript } = await reviserThread.generateObject({
                prompt: `Original Script:\n${JSON.stringify(script)}\n\nCritique:\n${JSON.stringify(critique)}\n\nPlease provide a revised script.`,
                schema: DialogueSchema,
            });
            script = revisedScript;
            console.log(`--- Revised Script ${i + 1} ---`);
        }

        const gatheredContent = JSON.parse(project.plan); // This now contains lessonPlan, not raw text.
        const lessonData = JSON.parse(gatheredContent.lessonPlan); // We need to re-parse
        const imageQueries = lessonData.map((l: any) => l.concept);

        const finalDialogue = script.dialogue.map((line, i) => ({
            ...line,
            sceneNumber: i + 1,
            // Simple logic to assign an image query to each line of dialogue for now
            imageQuery: imageQueries[i % imageQueries.length]
        }));

        await ctx.runMutation(internal.scripts.create, {
            projectId: args.projectId,
            dialogue: finalDialogue,
        });

        await ctx.runMutation(internal.projects.updateProjectStatus, {
            projectId: args.projectId,
            status: "generating",
        });

        return "Script finalized after review loops.";
    },
}); 