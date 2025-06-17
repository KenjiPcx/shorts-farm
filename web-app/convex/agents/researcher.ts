"use node"

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal, components } from "../_generated/api";
import { Agent } from "@convex-dev/agent";
import { z } from "zod";
import { webSearch, imageSearch } from "./tools";
import { openai } from "@ai-sdk/openai";

const ResearchSchema = z.object({
    summary: z.string().describe("A summary of the content."),
    scenes: z.array(z.object({
        text: z.string().describe("The text for this scene."),
        imageQuery: z.string().describe("A query for an image for this scene."),
    })),
});

const researcher = new Agent(components.agent, {
    chat: openai.chat("gpt-4o-mini"),
    instructions:
        "You are a research assistant. Your job is to generate a research summary and identify key scenes for a short educational video. " +
        "If you are given content, analyze it directly. " +
        "If you are given only a topic, you MUST use the webSearch tool to find relevant information first. " +
        "After you have the content, identify the key points and then use the image search tool to find one image for each key point. " +
        "Your final output must be a JSON object with a 'summary' of the content and a list of 'scenes', where each scene has 'text' and an 'imageQuery'.",
    tools: {
        webSearch,
        imageSearch,
    },
    maxSteps: 5,
});

export const research = internalAction({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const project = await ctx.runQuery(internal.projects.get, { projectId: args.projectId });
        if (!project) {
            throw new Error("Project not found for research");
        }

        const { thread } = await researcher.createThread(ctx, { userId: project.userId });

        const prompt = project.plan
            ? `Here is the content to research and find images for:\n\n${project.plan}`
            : `Please research the topic "${project.topic}" and find images for a video about it.`;

        const { object: researchOutput } = await thread.generateObject({
            prompt: prompt,
            schema: ResearchSchema,
        });

        console.log("Researcher output:", researchOutput);

        await ctx.runMutation(internal.projects.updateProjectPlan, {
            projectId: args.projectId,
            plan: researchOutput.summary,
        });

        const scriptId = await ctx.runMutation(internal.scripts.create, {
            projectId: args.projectId,
            scenes: researchOutput.scenes.map((s, i) => ({ ...s, sceneNumber: i + 1 })),
        });

        await ctx.runMutation(internal.projects.updateProjectScript, {
            projectId: args.projectId,
            scriptId: scriptId,
        });
    },
}); 