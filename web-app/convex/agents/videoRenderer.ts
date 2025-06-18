import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// This function would make a call to a service like Remotion Lambda
// to render the video. It passes all the necessary data, including the
// script, assets, and audio.
async function renderVideoOnRemotion(renderData: any): Promise<string> {
    console.log(`Starting Remotion render for project: ${renderData.project._id}`);
    console.log("Render data:", JSON.stringify(renderData, null, 2));

    // In a real implementation, this would be an HTTP call:
    // const response = await fetch(process.env.REMOTION_RENDER_URL, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(renderData),
    // });
    // const { videoUrl } = await response.json();
    // For now, we simulate the render process.

    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate render time
    console.log("Remotion render finished.");
    // This would be the storage ID or URL of the final rendered video.
    return "placeholder_video_storage_id";
}

export const render = internalAction({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const project = await ctx.runQuery(internal.projects.get, { projectId: args.projectId });
        if (!project || !project.scriptId) {
            throw new Error("Project or script not found");
        }

        const script = await ctx.runQuery(internal.scripts.get, { scriptId: project.scriptId });
        if (!script || !script.scenes) {
            throw new Error("Script or scenes not found");
        }

        // @ts-expect-error - getBackgroundAssets is a new query and types may not be updated yet
        const backgroundAssets = await ctx.runQuery(internal.assets.getBackgroundAssets, {});
        if (backgroundAssets.length === 0) {
            throw new Error("No background assets found. Please upload at least one.");
        }
        // Select a random background video for this render
        const randomBackground = backgroundAssets[Math.floor(Math.random() * backgroundAssets.length)];

        await ctx.runMutation(internal.projects.updateProjectStatus, {
            projectId: args.projectId,
            status: "rendering",
        });

        // This object is the "props" that will be passed to your Remotion composition
        const renderData = {
            project,
            script,
            backgroundUrl: randomBackground.url,
            // In a real app, you'd also pass character asset URLs, audio file URLs, etc.
            // This data would be gathered based on the contents of the script.
        };

        const videoStorageId = await renderVideoOnRemotion(renderData);

        const videoId = await ctx.runMutation(internal.videos.create, {
            projectId: args.projectId,
            storageId: videoStorageId,
        });

        await ctx.runMutation(internal.projects.updateProjectVideo, {
            projectId: args.projectId,
            videoId: videoId,
        });
    },
}); 