import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all casts
export const getCasts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("casts").collect();
  },
});

// Get characters for a cast
export const getCharactersByCast = query({
  args: { castId: v.id("casts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("characters")
      .filter((q) => q.eq(q.field("castId"), args.castId))
      .collect();
  },
});

// Get all assets
export const getAssets = query({
  args: {
    type: v.optional(v.union(v.literal("character-asset"), v.literal("background-asset"), v.literal("sound-effect"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("assets");
    if (args.type) {
      query = query.filter(q => q.eq(q.field("type"), args.type));
    }
    const assets = await query.collect();

    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        const url = await ctx.storage.getUrl(asset.storageId);
        return { ...asset, url };
      })
    );
    return assetsWithUrls;
  }
});

// Get projects for the current user
export const getMyProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Get project details with related data
export const getProjectDetails = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const script = project.scriptId ? await ctx.db.get(project.scriptId) : null;
    const video = project.videoId ? await ctx.db.get(project.videoId) : null;
    const cast = project.castId ? await ctx.db.get(project.castId) : null;
    const media = await ctx.db
      .query("media")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    return {
      project,
      script,
      video,
      cast,
      media,
    };
  },
});

// Create a new project
export const createProject = mutation({
  args: {
    topic: v.string(),
    castId: v.optional(v.id("casts")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("projects", {
      topic: args.topic,
      userId,
      castId: args.castId,
      status: "gathering",
    });
  },
});

// Create a new cast
export const createCast = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("casts", {
      name: args.name,
    });
  },
});

// Create a new character
export const createCharacter = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    castId: v.id("casts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("characters", {
      name: args.name,
      description: args.description,
      castId: args.castId,
    });
  },
});

// Delete a cast and its characters
export const deleteCast = mutation({
  args: { castId: v.id("casts") },
  handler: async (ctx, args) => {
    // Delete all characters in this cast
    const characters = await ctx.db
      .query("characters")
      .filter((q) => q.eq(q.field("castId"), args.castId))
      .collect();

    for (const character of characters) {
      await ctx.db.delete(character._id);
    }

    // Delete the cast
    await ctx.db.delete(args.castId);
  },
});

// Delete a character
export const deleteCharacter = mutation({
  args: { characterId: v.id("characters") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.characterId);
  },
});

// Delete a project
export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.projectId);
  },
});