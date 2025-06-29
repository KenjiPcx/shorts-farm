import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { z } from "zod";
import { generateObject } from "ai";
import { model } from "./model";
import { internal } from "./_generated/api";
import dedent from "dedent";

export const createAccount = mutation({
    args: {
        displayName: v.string(),
        bio: v.optional(v.string()),
        platforms: v.array(v.object({
            platform: v.string(),
            handle: v.string(),
        })),
        castWeights: v.optional(v.array(v.object({
            castId: v.id("casts"),
            weight: v.number(),
        }))),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        return await ctx.db.insert("accounts", {
            userId,
            ...args,
            topicQueue: [],
        });
    },
});

export const getMyAccounts = query({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        return await ctx.db.query("accounts")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();
    }
});

export const updateAccount = mutation({
    args: {
        accountId: v.id("accounts"),
        displayName: v.optional(v.string()),
        bio: v.optional(v.string()),
        creativeBrief: v.optional(v.string()),
        platforms: v.optional(v.array(v.object({
            platform: v.string(),
            handle: v.string(),
        }))),
        castWeights: v.optional(v.array(v.object({
            castId: v.id("casts"),
            weight: v.number(),
        }))),
        postSchedule: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const { accountId, ...rest } = args;
        const account = await ctx.db.get(accountId);
        if (!account || account.userId !== userId) throw new Error("Not authorized");

        await ctx.db.patch(accountId, rest);
    }
});

export const deleteAccount = mutation({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const account = await ctx.db.get(args.accountId);
        if (!account || account.userId !== userId) throw new Error("Not authorized");

        await ctx.db.delete(args.accountId);
    }
});

export const addTopic = mutation({
    args: {
        accountId: v.id("accounts"),
        topic: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const account = await ctx.db.get(args.accountId);
        if (!account || account.userId !== userId) throw new Error("Not authorized");

        const newQueue = account.topicQueue ?? [];
        newQueue.push(args.topic);

        await ctx.db.patch(args.accountId, { topicQueue: newQueue });
    }
});

export const removeTopic = mutation({
    args: {
        accountId: v.id("accounts"),
        topic: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const account = await ctx.db.get(args.accountId);
        if (!account || account.userId !== userId) throw new Error("Not authorized");

        const newQueue = (account.topicQueue ?? []).filter(item => item !== args.topic);

        await ctx.db.patch(args.accountId, { topicQueue: newQueue });
    }
});

export const clearQueue = mutation({
    args: {
        accountId: v.id("accounts"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const account = await ctx.db.get(args.accountId);
        if (!account || account.userId !== userId) throw new Error("Not authorized");

        await ctx.db.patch(args.accountId, { topicQueue: [] });
    }
});

export const popTopic = internalMutation({
    args: {
        accountId: v.id("accounts"),
    },
    handler: async (ctx, args) => {
        const account = await ctx.db.get(args.accountId);
        if (!account) throw new Error("Account not found");

        const newQueue = account.topicQueue ?? [];
        if (newQueue.length > 0) {
            newQueue.shift(); // Remove the first item
        }

        await ctx.db.patch(args.accountId, { topicQueue: newQueue });
    }
});

const TopicIdeationSchema = z.object({
    topics: z.array(z.string()).length(5).describe("An array of 5 new, creative, and relevant video topic ideas.")
});

const TopicSelectionSchema = z.object({
    bestTopic: z.string().describe("The single best topic chosen from the list of ideas."),
    reasoning: z.string().describe("A brief explanation of why this topic was chosen as the best one for the account's audience."),
    critiques: z.object({
        topic1: z.string().describe("Critique of topic 1"),
        topic2: z.string().describe("Critique of topic 2"),
        topic3: z.string().describe("Critique of topic 3"),
        topic4: z.string().describe("Critique of topic 4"),
        topic5: z.string().describe("Critique of topic 5"),
    }).describe("A critique of each of the 5 generated topics.")
});

export const internalRefillQueue = internalMutation({
    args: {
        accountId: v.id("accounts"),
    },
    handler: async (ctx, args) => {
        const account = await ctx.db.get(args.accountId);
        if (!account) throw new Error("Account not found");

        const currentQueue = account.topicQueue ?? [];

        if (currentQueue.length < 5) {
            console.log(`Queue for account ${account.displayName} is low, starting topic generation agent...`);

            const recentTopics = await ctx.runQuery(internal.projects.getRecentTopicsByAccountId, { accountId: args.accountId });

            console.log("Agent Step 1: Generating 5 potential topics...");
            const { object: ideationResult } = await generateObject({
                model,
                system: "You are a creative director for a social media account. Your goal is to brainstorm viral video ideas.",
                prompt: dedent`
                    The account is called "${account.displayName}".
                    Its bio is: "${account.bio || 'Not provided.'}"
                    ${account.creativeBrief ? `Here is a creative brief for the next videos: "${account.creativeBrief}"` : ''}

                    Here are the topics of the last 25 videos we created:
                    ${recentTopics.join("\n")}

                    Based on this history, the bio, and the creative brief (if provided), please generate 5 new, fresh, and highly engaging topic ideas that would complement this content and perform well with the audience.
                `,
                schema: TopicIdeationSchema,
            });

            console.log("Agent generated ideas:", ideationResult.topics);

            console.log("Agent Step 2: Selecting the best topic...");
            const { object: selectionResult } = await generateObject({
                model,
                system: "You are a sharp and critical content strategist. Your job is to analyze a list of ideas and pick the one with the highest potential for virality and audience engagement.",
                prompt: dedent`
                    The account is "${account.displayName}".
                    Its bio is: "${account.bio || 'Not provided.'}"
                    ${account.creativeBrief ? `Here is a creative brief for the next videos: "${account.creativeBrief}"` : ''}

                    We need to choose the best topic from the following list:
                    1. ${ideationResult.topics[0]}
                    2. ${ideationResult.topics[1]}
                    3. ${ideationResult.topics[2]}
                    4. ${ideationResult.topics[3]}
                    5. ${ideationResult.topics[4]}

                    Please analyze these options based on the account's bio, recent content, and the creative brief (if provided). Critique each one, then choose the single best topic and provide a concise reason for your choice.
                `,
                schema: TopicSelectionSchema,
            });

            const bestTopic = selectionResult.bestTopic;
            console.log(`Agent selected: "${bestTopic}". Reasoning: ${selectionResult.reasoning}`);

            currentQueue.push(bestTopic);
            await ctx.db.patch(args.accountId, { topicQueue: currentQueue });
            console.log(`Successfully added "${bestTopic}" to the queue for ${account.displayName}.`);
        }
    }
});

export const get = internalQuery({
    args: {
        id: v.id("accounts")
    },
    handler: async (ctx, {
        id
    }) => {
        return await ctx.db.get(id);
    },
});

export const updateInstagramCredentials = internalMutation({
    args: {
        accountId: v.id("accounts"),
        igUserId: v.string(),
        username: v.string(),
        accessToken: v.string(),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        const account = await ctx.db.get(args.accountId);
        if (!account) throw new Error("Account not found");

        // Update the Instagram platform credentials
        const updatedPlatforms = account.platforms.map(platform => {
            if (platform.platform === 'instagram') {
                return {
                    ...platform,
                    handle: `@${args.username}`,
                    credentials: {
                        igUserId: args.igUserId,
                        username: args.username,
                        accessToken: args.accessToken,
                        expiresAt: args.expiresAt,
                    }
                };
            }
            return platform;
        });

        await ctx.db.patch(args.accountId, { platforms: updatedPlatforms });
    }
}); 