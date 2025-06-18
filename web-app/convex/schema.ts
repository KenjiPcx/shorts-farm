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
  })
    .index("by_characterId", ["characterId"])
    .index("by_castId", ["castId"]),

  characters: defineTable({
    name: v.string(),
    description: v.string(),
    castId: v.id("casts"),
    voiceId: v.optional(v.string()), // For TTS voice model ID
  }).index("by_castId", ["castId"]),

  // Casts of characters for videos
  casts: defineTable({
    name: v.string(),
    dynamics: v.optional(v.string()), // A description of the relationships and dynamics between characters
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
    // A script is a series of scenes that direct the video.
    scenes: v.array(
      v.object({
        sceneNumber: v.number(),
        type: v.union(v.literal("dialogue"), v.literal("content"), v.literal("fx")),

        // For type: "dialogue"
        characterId: v.optional(v.id("characters")),
        line: v.optional(v.string()),
        voiceStorageId: v.optional(v.string()),

        // For type: "content"
        title: v.optional(v.string()),
        text: v.optional(v.string()),

        // For type: "fx"
        soundAssetId: v.optional(v.id("assets")),
        visualEffect: v.optional(v.string()),
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
