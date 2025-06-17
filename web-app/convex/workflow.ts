import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { WorkflowManager, WorkflowId } from "@convex-dev/workflow";
import { components } from "./_generated/api";

export const workflow = new WorkflowManager(components.workflow);

export const videoCreationWorkflow = workflow.define({
    args: {
        projectId: v.id("projects"),
        urls: v.optional(v.array(v.string())),
        topic: v.optional(v.string()),
        doMoreResearch: v.optional(v.boolean()),
    },
    handler: async (step, args): Promise<void> => {
        await step.runAction(internal.agents.gatherContent.gather, {
            projectId: args.projectId,
            urls: args.urls,
            topic: args.topic,
            doMoreResearch: args.doMoreResearch,
        });

        await step.runAction(internal.agents.lessonPlanner.plan, {
            projectId: args.projectId,
        });

        await step.runAction(internal.agents.scriptWriter.write, {
            projectId: args.projectId,
        });

        await step.runAction(internal.agents.voiceGenerator.generate, {
            projectId: args.projectId,
        });

        await step.runAction(internal.agents.videoRenderer.render, {
            projectId: args.projectId,
        });

        await step.runMutation(internal.projects.updateProjectStatus, {
            projectId: args.projectId,
            status: "done",
        });
    },
});

export const startVideoCreation = mutation({
    args: {
        input: v.object({
            urls: v.optional(v.array(v.string())),
            topic: v.optional(v.string()),
            doMoreResearch: v.optional(v.boolean()),
            castId: v.id("casts"),
        }),
    },
    handler: async (
        ctx,
        args
    ): Promise<{ projectId: string; workflowId: WorkflowId }> => {
        const { urls, topic, doMoreResearch, castId } = args.input;
        if (!topic && (!urls || urls.length === 0)) {
            throw new Error("Either topic or urls must be provided.");
        }

        const projectTopic = topic || `Video for ${urls![0]}`;

        const projectId = await ctx.db.insert("projects", {
            topic: projectTopic,
            userId: (await ctx.auth.getUserIdentity())!.subject,
            status: "gathering",
            castId: castId,
        });

        const workflowId = await workflow.start(
            ctx,
            internal.workflow.videoCreationWorkflow,
            {
                projectId,
                urls,
                topic,
                doMoreResearch,
            }
        );
        return { projectId, workflowId };
    },
}); 