import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
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
    handler: async (ctx, args) => {
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

        const allText = results.map(r => r.rawContent).join("\n\n---\n\n");
        const allImageUrls = results.flatMap(r => r.images ?? []);

        // Store the gathered content in the project's 'plan' field for the next agent.
        await ctx.runMutation(internal.projects.updateProjectPlan, {
            projectId: args.projectId,
            plan: JSON.stringify({
                rawText: allText.substring(0, 10000), // Truncate to avoid large doc size
                imageUrls: allImageUrls,
            }),
        });

        return `Gathered content from ${results.length} sources.`;
    },
}); 