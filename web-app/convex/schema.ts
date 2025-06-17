import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { describe } from "node:test";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  // Library assets (characters, backgrounds, etc.)
  assets: defineTable({
    storageId: v.string(),
    type: v.union(v.literal("character-asset"), v.literal("background-asset"), v.literal("sound-effect")),
    name: v.string(),
    description: v.string(),
    characterId: v.optional(v.id("characters")),
    castId: v.optional(v.id("casts")),
  }),

  characters: defineTable({
    name: v.string(),
    description: v.string(),
    assets: v.optional(v.array(v.id("assets"))),
    castId: v.id("casts"),
  }).index("by_castId", ["castId"]),

  // Casts of characters for videos
  casts: defineTable({
    name: v.string(),
  }),

  projects: defineTable({
    topic: v.string(),
    userId: v.string(),
    castId: v.optional(v.id("casts")),
    status: v.union(
      v.literal("gathering"),
      v.literal("planning"),
      v.literal("writing"),
      v.literal("generating"),
      v.literal("rendering"),
      v.literal("done"),
      v.literal("error")
    ),
    plan: v.optional(v.string()), // Will now store the lesson plan
    scriptId: v.optional(v.id("scripts")),
    videoId: v.optional(v.id("videos")),
  }).index("by_userId", ["userId"]),

  scripts: defineTable({
    projectId: v.id("projects"),
    // A script is now a series of dialogue lines
    dialogue: v.array(
      v.object({
        character: v.string(),
        line: v.string(),
        sceneNumber: v.number(),
        imageQuery: v.string(),
        mediaId: v.optional(v.id("media")), // For scene-specific images
        voiceStorageId: v.optional(v.string()), // For generated voiceovers
      })
    ),
  }).index("by_projectId", ["projectId"]),

  // Media generated specifically for a project (voiceovers, final video)
  media: defineTable({
    projectId: v.id("projects"),
    storageId: v.string(),
    type: v.union(v.literal("image"), v.literal("audio"), v.literal("video")),
  }).index("by_projectId", ["projectId"]),

  // Final rendered videos
  videos: defineTable({
    projectId: v.id("projects"),
    storageId: v.string(),
  }).index("by_projectId", ["projectId"]),
});
