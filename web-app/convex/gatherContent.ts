"use node"

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { tavily } from "@tavily/core";

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
    },
    handler: async (_ctx, args) => {
        let results: Awaited<ReturnType<typeof tvly.extract>>["results"] = [];
        let sourceUrls: string[] = args.urls ?? [];

        if (!TAVILY_API_KEY) {
            throw new Error("TAVILY_API_KEY environment variable not set.");
        }

        if (args.topic && (sourceUrls.length === 0 || args.doMoreResearch)) {
            console.log(`Searching for topic: ${args.topic}`);
            const searchResult = await tvly.search(args.topic, { maxResults: 5 });
            sourceUrls.push(...searchResult.results.map(r => r.url));
            // Remove duplicates
            sourceUrls = [...new Set(sourceUrls)];
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