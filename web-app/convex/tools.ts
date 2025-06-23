"use node"

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { tavily } from "@tavily/core";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;
if (!TAVILY_API_KEY) {
    console.warn("TAVILY_API_KEY environment variable not set. Search tools will not work.");
}
const tvly = tavily({
    apiKey: TAVILY_API_KEY,
});

export const webSearch = createTool({
    description: "Search the web for information on a given topic. Use this to find up-to-date information or to research a topic you don't know about.",
    args: z.object({
        query: z.string().describe("The search query."),
    }),
    handler: async (ctx, args): Promise<string> => {
        const searchResult = await tvly.search(args.query, { searchDepth: "advanced", maxResults: 10 });
        return JSON.stringify(searchResult.results);
    },
});

export const imageSearch = createTool({
    description: "Search for images on a given topic. Use this to find relevant images for a video.",
    args: z.object({
        query: z.string().describe("The search query for images."),
    }),
    handler: async (ctx, args): Promise<string> => {
        const searchResult = await tvly.search(args.query, { searchDepth: "advanced", includeImages: true, maxResults: 10 });
        const images = searchResult.images?.map(i => ({ url: i.url }));
        return JSON.stringify(images);
    }
}); 