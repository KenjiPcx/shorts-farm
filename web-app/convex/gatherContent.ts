"use node"

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { tavily } from "@tavily/core";
import { model } from "./model";
import { z } from "zod";
import { generateObject } from "ai";
import { internal } from "./_generated/api";
import dedent from "dedent";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;
const tvly = tavily({
    apiKey: TAVILY_API_KEY,
});

export const gather = internalAction({
    args: {
        projectId: v.id("projects"),
        urls: v.optional(v.array(v.string())),
        topic: v.optional(v.string()),
        doMoreResearch: v.optional(v.boolean()),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (_ctx, args) => {
        let results: Awaited<ReturnType<typeof tvly.extract>>["results"] = [];
        let sourceUrls: string[] = args.urls ?? [];

        if (!TAVILY_API_KEY) {
            throw new Error("TAVILY_API_KEY environment variable not set.");
        }

        if (args.topic && (sourceUrls.length === 0 || args.doMoreResearch)) {
            console.log(`Searching for topic: ${args.topic}`);
            const searchResult = await tvly.search(args.topic, { maxResults: 10 });

            let recentSummaries: string[] = [];
            if (args.accountId) {
                const recentProjects = await _ctx.runQuery(internal.projects.getRecentProjectsForAccount, { accountId: args.accountId });
                recentSummaries = recentProjects
                    .map(p => p.socialMediaCopy)
                    .filter((copy): copy is string => !!copy);
            }

            const { object: selection } = await generateObject({
                model: model,
                system: "You are a content curator. Your goal is to select the best 1-2 URLs from a list of search results to create a short video.",
                prompt: dedent`
                    We are creating a video about: "${args.topic}".
                    To avoid creating duplicate content, here are the social media posts from videos we created in the last 3 days:
                    ${recentSummaries.length > 0 ? recentSummaries.join("\n---\n") : "None"}

                    Here are the new search results:
                    ${JSON.stringify(searchResult.results, null, 2)}

                    Please select the best 1-2 URLs that are highly relevant to "${args.topic}" and offer a fresh perspective compared to our recent content.
                `,
                schema: z.object({
                    selectedUrls: z.array(z.string()).min(1).max(2).describe("An array of the 1-2 best URLs to use for content extraction."),
                    reasoning: z.string().describe("A brief explanation for your selection."),
                }),
            });

            console.log(`AI selected URLs: ${selection.selectedUrls.join(", ")}. Reasoning: ${selection.reasoning}`);
            sourceUrls = selection.selectedUrls;
        }


        if (sourceUrls.length > 0) {
            console.log(`Extracting content from URLs:`, sourceUrls);
            const extractResult = await tvly.extract(sourceUrls, {
                includeImages: true,
                extractDepth: "advanced",
                format: "markdown",
            });
            results = extractResult.results;
        }

        const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

        const extractedImages = results.flatMap(r => {
            if (!r.rawContent) return [];
            const matches = [...r.rawContent.matchAll(imageRegex)];
            return matches.map(match => ({
                description: match[1],
                url: match[2]
            })).filter(img => imageExtensions.some(ext => img.url.toLowerCase().endsWith(ext)));
        });

        console.log("Extracted image descriptions:", extractedImages.map(img => img.description).filter(d => d.trim() !== ''));

        const allText = results.map(r => r.rawContent).join("\n\n---\n\n");
        const allImageUrls = [...new Set([
            // ...results.flatMap(r => r.images ?? []),
            ...extractedImages.map(img => `![${img.description}](${img.url})`)
        ])];

        return {
            rawText: allText,
            imageUrls: allImageUrls,
        };
    },
}); 