import { mutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { WorkflowManager, WorkflowId } from "@convex-dev/workflow";
import { components } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { experimental_generateImage as generateImage, generateText } from 'ai';
import { openai } from "@ai-sdk/openai";
import { model } from "./model";
import dedent from "dedent";

export const workflow = new WorkflowManager(components.workflow, {
    workpoolOptions: {
        maxParallelism: 10
    }
});

export const videoCreationWorkflow = workflow.define({
    args: {
        accountId: v.optional(v.id("accounts")),
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

        // Note: Social generation is now handled by the post-render workflow
        // triggered from the remotion webhook when the video is complete

        // If the project was created from an account queue, pop the topic.
        if (args.accountId) {
            await step.runMutation(internal.accounts.popTopic, {
                accountId: args.accountId,
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
                accountId: project.accountId,
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
            accountId: v.optional(v.id("accounts")),
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

        const { urls, topic, doMoreResearch, castId, accountId } = args.input;
        if (!topic && (!urls || urls.length === 0)) {
            throw new Error("Either topic or urls must be provided.");
        }

        const projectTopic = topic || `Video for ${urls![0]}`;

        const projectId = await ctx.runMutation(internal.projects.createProjectForTopic, {
            topic: projectTopic,
            userId: userId,
            castId: castId,
            urls: urls,
            accountId: accountId,
        });

        const workflowId = await workflow.start(
            ctx,
            internal.workflow.videoCreationWorkflow,
            {
                accountId: accountId,
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
                accountId: project.accountId,
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

export const runDailyVideoCreation = internalAction({
    handler: async (ctx) => {
        // Get all accounts that have at least one platform configured
        const activeAccounts = await ctx.runQuery(internal.accounts.getAllActiveAccounts);

        console.log(`Found ${activeAccounts.length} active accounts`);

        for (const account of activeAccounts) {
            // Find the next topic in the queue
            let topic = account.topicQueue?.[0];

            // If no topics, refill the queue first
            if (!topic) {
                console.log(`No pending topics for account ${account.displayName}. Refilling queue first.`);
                await ctx.runAction(internal.accounts.internalRefillQueue, { accountId: account._id });

                // Get the updated account with the new queue
                const updatedAccount = await ctx.runQuery(internal.accounts.get, { id: account._id });
                topic = updatedAccount?.topicQueue?.[0];

                if (!topic) {
                    console.warn(`Failed to generate topics for account ${account.displayName}. Skipping.`);
                    continue;
                }
            }

            // Check if user's accounts has enough tokens
            const userProperties = await ctx.runQuery(api.users.getUserProperties, { userId: account.userId });
            if (!userProperties || userProperties.tokens <= 0) {
                console.warn(`Account ${account.displayName} has no tokens left. Skipping video creation.`);
                continue;
            }

            console.log(`Starting video creation for topic: "${topic}" for account ${account.displayName}`);

            // Start the video creation workflow
            if (!account.castWeights || account.castWeights.length === 0) {
                console.warn(`Account ${account.displayName} has no casts configured. Skipping video creation.`);
                continue; // Skip to the next account
            }

            // Weighted random selection of a cast member
            const totalWeight = account.castWeights.reduce((sum, cast) => sum + cast.weight, 0);
            let randomPoint = Math.random() * totalWeight;
            let primaryCastId: Id<"casts"> | undefined;

            for (const cast of account.castWeights) {
                if (randomPoint < cast.weight) {
                    primaryCastId = cast.castId;
                    break;
                }
                randomPoint -= cast.weight;
            }

            if (!primaryCastId) {
                // Fallback to the first cast if something goes wrong with the weighting logic
                primaryCastId = account.castWeights[0].castId;
                console.warn(`Weighted random selection failed for account ${account.displayName}. Falling back to first cast.`);
            }

            const projectId = await ctx.runMutation(internal.projects.createProjectForTopic, {
                topic: topic,
                userId: account.userId,
                castId: primaryCastId,
                accountId: account._id,
            });

            await workflow.start(
                ctx,
                internal.workflow.videoCreationWorkflow,
                {
                    accountId: account._id,
                    projectId,
                    topic: topic,
                    userId: account.userId,
                    castId: primaryCastId,
                }
            );

            // Pop the used topic from the queue (this is handled in the workflow via popTopic)
            // The workflow will call internal.accounts.popTopic when it completes
        }
    }
});

export const postRenderWorkflow = workflow.define({
    args: {
        projectId: v.id("projects"),
        videoUrl: v.string(),
    },
    handler: async (step, args): Promise<void> => {
        const { projectId, videoUrl } = args;

        // Step 1: Create video record and update project
        const videoId = await step.runMutation(internal.videos.create, {
            projectId,
            url: videoUrl,
        });

        await step.runMutation(internal.projects.setFinalVideoId, {
            projectId,
            videoId,
        });

        // Step 2: Generate social media content with individual steps for better retry logic
        // Step 2a: Generate thumbnail prompt using AI
        const thumbnailPrompt = await step.runAction(internal.workflow.generateThumbnailPromptStep, {
            projectId,
        });

        // Step 2b: Generate thumbnail image using OpenAI DALL-E
        const thumbnailStorageId = await step.runAction(internal.workflow.generateThumbnailImageStep, {
            thumbnailPrompt,
        });

        // Step 2c: Generate social media copy using AI
        const socialCopy = await step.runAction(internal.workflow.generateSocialCopyStep, {
            projectId,
        });

        // Step 2d: Save social media assets
        await step.runMutation(internal.social.saveSocials, {
            projectId,
            thumbnailStorageId,
            socialMediaCopy: socialCopy,
        });

        // Step 3: Schedule posting if this is an automation account
        await step.runMutation(internal.projects.schedulePostingIfNeeded, {
            projectId,
        });
    },
});

export const startPostRenderWorkflow = mutation({
    args: {
        projectId: v.id("projects"),
        videoUrl: v.string(),
    },
    handler: async (ctx, args): Promise<{ workflowId: WorkflowId }> => {
        const workflowId = await workflow.start(
            ctx,
            internal.workflow.postRenderWorkflow,
            {
                projectId: args.projectId,
                videoUrl: args.videoUrl,
            }
        );

        return { workflowId };
    }
});

// Helper function for converting base64 to blob
function base64ToBlob(base64: string, contentType = 'image/png'): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let i = 0; i < byteCharacters.length; i += 512) {
        const slice = byteCharacters.slice(i, i + 512);
        const byteNumbers = new Array(slice.length);
        for (let j = 0; j < slice.length; j++) {
            byteNumbers[j] = slice.charCodeAt(j);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
}

// Workflow step: Generate thumbnail prompt using AI
export const generateThumbnailPromptStep = internalAction({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args): Promise<string> => {
        const project = await ctx.runQuery(api.projects.getProjectDetails, { projectId: args.projectId });
        if (!project) {
            throw new Error("Project not found");
        }
        if (!project.cast || !project.script) {
            throw new Error("Project cast or script not found");
        }

        const characters = await ctx.runQuery(api.characters.getCharactersByCast, { castId: project.cast._id });
        if (!characters) {
            throw new Error("Characters not found");
        }

        const { text: thumbnailPrompt } = await generateText({
            model: model,
            prompt: dedent`
                Create a personalized prompt for a vibrant and eye-catching TikTok Shorts thumbnail that is highly relevant to the video topic and characters.
                The video topic is: "${project.project.topic}"
                The characters in the video are: ${characters.map((c: any) => c.name).join(", ")}.

                # Thumbnail Requirements
                - The thumbnail should be in a 9:16 aspect ratio.
                - The title of the video "${project.project.topic}" should be prominently displayed in a bold, modern font.
                - The overall style should be colorful, engaging, and designed to grab attention on a social media feed.
                - Look like the characters as much as possible.
            `,
        });

        return thumbnailPrompt;
    }
});

// Workflow step: Generate thumbnail image using OpenAI DALL-E
export const generateThumbnailImageStep = internalAction({
    args: {
        thumbnailPrompt: v.string(),
    },
    handler: async (ctx, args): Promise<Id<"_storage">> => {
        const { image } = await generateImage({
            model: openai.image('gpt-image-1'),
            prompt: args.thumbnailPrompt,
            size: "1024x1536",
            providerOptions: {
                openai: { quality: 'high' },
            },
        });

        const blob = base64ToBlob(image.base64);
        const thumbnailStorageId = await ctx.storage.store(blob);

        return thumbnailStorageId;
    }
});

// Workflow step: Generate social media copy using AI
export const generateSocialCopyStep = internalAction({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args): Promise<string> => {
        const project = await ctx.runQuery(api.projects.getProjectDetails, { projectId: args.projectId });
        if (!project) {
            throw new Error("Project not found");
        }
        if (!project.cast || !project.script) {
            throw new Error("Project cast or script not found");
        }

        const characters = await ctx.runQuery(api.characters.getCharactersByCast, { castId: project.cast._id });
        if (!characters) {
            throw new Error("Characters not found");
        }

        const { text } = await generateText({
            model: model,
            prompt: dedent`
                Create some social media copy to accompany a short video post about "${project.project.topic}"
                The account is called "${project.account?.displayName}" and is focused on "${project.account?.bio}"
                The copy should be in the style, tone, voice, personality of one of the characters in the video.
                Just write in the voice of one character, like the main one, we don't need to write something for all characters.
                The characters in the video are: ${characters.map((c: any) => c.name).join(", ")}.
                Think for yourself, what would the character say about the video topic?

                # Copy Requirements
                The copy should be ready to be posted to TikTok.
                The copy should be 2-4 sentences long.
                Make it include emojis.
                Make it include hashtags.
                Make the copy mentioned by the character relevant to the video topic and also the character.
            `,
        });

        return text;
    }
});