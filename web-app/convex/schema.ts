import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const vCaption = v.object({
  text: v.string(),
  startMs: v.number(),
  endMs: v.number(),
  timestampMs: v.number(),
  confidence: v.union(v.number(), v.null()),
});

export const vDialogueTurn = v.object({
  characterId: v.id("characters"),
  line: v.string(),
  characterExpression: v.string(), // e.g., "happy", "default"
  characterAssetUrl: v.optional(v.string()),
  voiceStorageId: v.optional(v.id("_storage")),
  voiceUrl: v.optional(v.string()),
  audioDuration: v.optional(v.number()),
});

export const vScene = v.object({
  sceneNumber: v.number(),
  contentImageUrl: v.optional(v.string()), // A URL from the research phase
  contentImageToGenerate: v.optional(v.string()), // A prompt for DALL-E
  dialogues: v.array(vDialogueTurn),
});

export const vLessonPlanScene = v.object({
  sceneNumber: v.number(),
  contentImageUrl: v.optional(v.string()),
  contentImageToGenerate: v.optional(v.string()),
  dialoguePlan: v.array(
    v.object({
      characterId: v.id("characters"),
      lineDescription: v.string(),
    })
  ),
});

export const vProject = v.object({
  topic: v.string(),
  userId: v.string(),
  castId: v.optional(v.id("casts")),
  urls: v.optional(v.array(v.string())),
  status: v.union(
    v.literal("gathering"),
    v.literal("planning"),
    v.literal("writing"),
    v.literal("generating-voices"),
    v.literal("rendering"),
    v.literal("done"),
    v.literal("error")
  ),
  plan: v.optional(v.array(vLessonPlanScene)),
  scriptId: v.optional(v.id("scripts")),
  videoId: v.optional(v.id("videos")),
  renderId: v.optional(v.string()),
  bucketName: v.optional(v.string()),
  statusMessage: v.optional(v.string()),
})

export const vAsset = v.object({
  storageId: v.id("_storage"),
  type: v.union(v.literal("character-asset"), v.literal("background-asset"), v.literal("sound-effect")),
  name: v.string(),
  description: v.string(),
  characterId: v.optional(v.id("characters")),
  castId: v.optional(v.id("casts")),
})

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  // Library assets (characters, backgrounds, etc.)
  assets: defineTable({
    ...vAsset.fields,
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
    ...vProject.fields,
  }).index("by_userId", ["userId"])
    .index("by_renderId", ["renderId"]),

  scripts: defineTable({
    projectId: v.id("projects"),
    scenes: v.array(vScene),
    captions: v.optional(v.array(vCaption)),
  }).index("by_projectId", ["projectId"]),

  // Media generated specifically for a project (voiceovers, final video)
  media: defineTable({
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    type: v.union(v.literal("image"), v.literal("audio"), v.literal("video")),
  }).index("by_projectId", ["projectId"]),

  // Final rendered videos
  videos: defineTable({
    projectId: v.id("projects"),
    storageId: v.optional(v.id("_storage")),
    finalUrl: v.optional(v.string()),
  }).index("by_projectId", ["projectId"]),
});
