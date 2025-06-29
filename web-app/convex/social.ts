import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { experimental_generateImage as generateImage, generateText } from 'ai';
import dedent from "dedent";
import { api, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";

function base64ToBlob(base64: string, contentType = 'image/png') {
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

export const generateSocials = action({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
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
            model: openai('gpt-4o'),
            prompt: dedent`
                Create a personalized prompt for a vibrant and eye-catching TikTok Shorts thumbnail that is highly relevant to the video topic and characters.
                The video topic is: "${project.project.topic}"
                The characters in the video are: ${characters.map(c => c.name).join(", ")}.

                # Thumbnail Requirements
                - The thumbnail should be in a 9:16 aspect ratio.
                - The title of the video "${project.project.topic}" should be prominently displayed in a bold, modern font.
                - The overall style should be colorful, engaging, and designed to grab attention on a social media feed.
            `,
        })

        const { image } = await generateImage({
            model: openai.image('gpt-image-1'),
            prompt: thumbnailPrompt,
            size: "1024x1536",
            providerOptions: {
                openai: { quality: 'high' },
            },
        });

        const blob = base64ToBlob(image.base64);
        const thumbnailStorageId = await ctx.storage.store(blob);

        // Generate Social Media Copy/Captions
        const { text } = await generateText({
            model: openai('gpt-4o'),
            prompt: dedent`
                Create some social media copy to accompany a short video post about "${project.project.topic}"
                The account is called "${project.account?.displayName}" and is focused on "${project.account?.bio}"
                The copy should be in the style, tone, voice, personality of one of the characters in the video.
                Just write in the voice of one character, like the main one, we don't need to write something for all characters.
                The characters in the video are: ${characters.map(c => c.name).join(", ")}.
                Think for yourself, what would the character say about the video topic?

                # Copy Requirements
                The copy should be ready to be posted to TikTok.
                The copy should be 2-4 sentences long.
                Make it include emojis.
                Make it include hashtags.
                Make the copy mentioned by the character relevant to the video topic and also the character.
            `,
        })
        const socialCopy = text;

        await ctx.runMutation(internal.social.saveSocials, {
            projectId: args.projectId,
            thumbnailStorageId,
            socialMediaCopy: socialCopy
        });

        return { thumbnailStorageId };
    }
});

export const saveSocials = internalMutation({
    args: {
        projectId: v.id("projects"),
        thumbnailStorageId: v.id("_storage"),
        socialMediaCopy: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, {
            thumbnailStorageId: args.thumbnailStorageId,
            socialMediaCopy: args.socialMediaCopy,
        });
    }
}); 