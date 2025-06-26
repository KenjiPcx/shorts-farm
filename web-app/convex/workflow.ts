import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { WorkflowManager, WorkflowId } from "@convex-dev/workflow";
import { components } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

export const workflow = new WorkflowManager(components.workflow);

export const videoCreationWorkflow = workflow.define({
    args: {
        castId: v.id("casts"),
        projectId: v.id("projects"),
        urls: v.optional(v.array(v.string())),
        topic: v.optional(v.string()),
        doMoreResearch: v.optional(v.boolean()),
        userId: v.string(),
    },
    handler: async (step, args): Promise<void> => {
        const { castId, projectId, doMoreResearch, userId } = args;

        const project = await step.runQuery(internal.projects.get, { projectId });
        if (!project) throw new Error("Project not found");

        let { urls, topic } = args;
        if (project.urls && project.urls.length > 0) {
            urls = project.urls;
        }
        if (project.topic) {
            topic = project.topic;
        }

        let lessonPlan: Doc<"projects">["plan"] | null = project.plan;
        if (!lessonPlan) {
            const { rawText, imageUrls } = await step.runAction(internal.gatherContent.gather, {
                projectId,
                urls,
                topic,
                doMoreResearch,
            });

            lessonPlan = await step.runAction(internal.lessonPlanner.plan, {
                projectId,
                castId,
                rawText,
                imageUrls,
                userId,
            });
            if (!lessonPlan) throw new Error("Lesson plan not found");
        }

        const script = await step.runQuery(api.scripts.getScriptByProjectId, { projectId });
        if (!script && lessonPlan) {
            await step.runAction(internal.scriptWriter.write, {
                castId,
                userId,
                projectId,
                lessonPlan,
            });
        }

        await step.runAction(internal.voiceGenerator.generate, {
            projectId: args.projectId,
        });

        const finalProject = await step.runQuery(internal.projects.get, { projectId: args.projectId });
        if (!finalProject?.videoId) {
            await step.runAction(internal.remotion.renderVideo, {
                projectId: args.projectId,
            });
        }
    },
});

export const rerunVideoCreation = mutation({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args): Promise<{ workflowId: WorkflowId }> => {
        const project = await ctx.db.get(args.projectId);
        if (!project) throw new Error("Project not found");
        if (project.status !== "error") {
            console.log("Project status is not 'error', running anyway for testing.");
        }

        await ctx.db.patch(project._id, { status: "gathering" });

        const workflowId = await workflow.start(
            ctx,
            internal.workflow.videoCreationWorkflow,
            {
                projectId: project._id,
                castId: project.castId!,
                urls: project.urls,
                topic: project.topic,
                userId: project.userId,
            }
        );

        // Store the workflowId in the project
        await ctx.db.patch(project._id, { workflowId });

        return { workflowId };
    }
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
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error("User not found");

        const userProperties = await ctx.db
            .query("userProperties")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .unique();

        if (userProperties) {
            if (userProperties.tokens <= 0) {
                throw new Error("You have no tokens left to create a project.");
            }
            await ctx.db.patch(userProperties._id, { tokens: userProperties.tokens - 1 });
        } else {
            // First project, give 1 free token and consume it.
            await ctx.db.insert("userProperties", {
                userId,
                tokens: 9, // 1 free token used up
            });
        }

        const { urls, topic, doMoreResearch, castId } = args.input;
        if (!topic && (!urls || urls.length === 0)) {
            throw new Error("Either topic or urls must be provided.");
        }

        const projectTopic = topic || `Video for ${urls![0]}`;

        const projectId = await ctx.db.insert("projects", {
            topic: projectTopic,
            userId: userId,
            status: "gathering",
            castId: castId,
            urls: urls,
        });

        const workflowId = await workflow.start(
            ctx,
            internal.workflow.videoCreationWorkflow,
            {
                projectId,
                urls,
                topic,
                doMoreResearch,
                castId,
                userId: userId,
            }
        );

        // Store the workflowId in the project
        await ctx.db.patch(projectId, { workflowId });

        return { projectId, workflowId };
    },
});

export const rerunVideoCreationFromScratch = mutation({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args): Promise<{ workflowId: WorkflowId }> => {
        const project = await ctx.db.get(args.projectId);
        if (!project) throw new Error("Project not found");
        if (project.status !== "error") {
            console.log("Project status is not 'error', running anyway for testing.");
        }

        // Delete the script and all associated assets
        await ctx.db.patch(args.projectId, {
            status: "gathering",
            plan: undefined,
            scriptId: undefined,
            videoId: undefined,
            statusMessage: undefined,
        });

        // Delete the script and all associated assets
        await ctx.runMutation(internal.scripts.deleteScriptByProjectId, {
            projectId: args.projectId,
        });

        // Start the workflow from scratch
        const workflowId = await workflow.start(
            ctx,
            internal.workflow.videoCreationWorkflow,
            {
                projectId: project._id,
                castId: project.castId!,
                urls: project.urls,
                topic: project.topic,
                userId: project.userId,
            }
        );

        // Store the workflowId in the project
        await ctx.db.patch(project._id, { workflowId });

        return { workflowId };
    }
});

export const rerenderVideo = mutation({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error("Project not found");
        }
        await ctx.db.patch(args.projectId, {
            status: "rendering",
            statusMessage: "Re-rendering video",
            videoId: undefined,
            renderId: undefined,
            bucketName: undefined,
        });

        await ctx.scheduler.runAfter(0, internal.remotion.renderVideo, {
            projectId: args.projectId,
        });
    }
});

export const stopWorkflow = mutation({
    args: { workflowId: v.string(), projectId: v.id("projects") },
    handler: async (ctx, args) => {
        await workflow.cancel(ctx, args.workflowId as WorkflowId);
        await ctx.db.patch(args.projectId, { status: "error", statusMessage: "Workflow cancelled" });
    }
});