import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal, components } from "../_generated/api";
import { Agent } from "@convex-dev/agent";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

const LessonPlanSchema = z.object({
    lessonPlan: z.array(z.object({
        concept: z.string().describe("A key concept or topic for a part of the lesson."),
        explanation: z.string().describe("A brief, simple explanation of the concept."),
    })).describe("A structured lesson plan breaking down the topic into key concepts."),
});

const planner = new Agent(components.agent, {
    chat: openai.chat("gpt-4-turbo"),
    instructions:
        "You are a curriculum designer. Your task is to take a large body of text and distill it into a simple, structured lesson plan. Identify the core concepts and provide a brief, easy-to-understand explanation for each. The output should be a clear roadmap for teaching the subject.",
});

export const plan = internalAction({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const project = await ctx.runQuery(internal.projects.get, { projectId: args.projectId });
        if (!project || !project.plan) {
            throw new Error("Project details not found for planning");
        }

        const gatheredContent = JSON.parse(project.plan);
        const rawText = gatheredContent.rawText;

        const { thread } = await planner.createThread(ctx, { userId: project.userId });

        const { object: lessonPlan } = await thread.generateObject({
            prompt: `Here is the research material. Please create a lesson plan from it:\n\n${rawText}`,
            schema: LessonPlanSchema,
        });

        console.log("Lesson Planner output:", lessonPlan);

        // Update the project's plan field with the structured lesson plan for the scriptwriter
        await ctx.runMutation(internal.projects.updateProjectPlan, {
            projectId: args.projectId,
            plan: JSON.stringify(lessonPlan),
        });

        return "Lesson plan created.";
    },
}); 