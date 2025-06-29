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
  voiceUrl: v.optional(v.string()),
  audioDuration: v.optional(v.number()),
});

export const vScene = v.object({
  sceneNumber: v.number(),
  contentImageUrl: v.optional(v.string()), // A URL from the research phase
  contentImageToGenerate: v.optional(v.string()), // A prompt for DALL-E
  dialogues: v.array(vDialogueTurn),
  statusMessage: v.optional(v.string()),
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
  userId: v.id("users"),
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
  workflowId: v.optional(v.string()),
  accountId: v.optional(v.id("accounts")),
  thumbnailStorageId: v.optional(v.id("_storage")),
  socialMediaCopy: v.optional(v.string()),
  publishedMediaIds: v.optional(v.array(v.object({
    platform: v.string(),
    mediaId: v.string(),
  }))),
})

export const vAsset = v.object({
  url: v.string(),
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

  userProperties: defineTable({
    userId: v.id("users"),
    tokens: v.number(),
  }).index("by_userId", ["userId"]),

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
    .index("by_renderId", ["renderId"])
    .index("by_accountId", ["accountId"]),

  scripts: defineTable({
    projectId: v.id("projects"),
    scenes: v.array(vScene),
    captions: v.optional(v.array(vCaption)),
  }).index("by_projectId", ["projectId"]),

  // Media generated specifically for a project (voiceovers, final video)
  media: defineTable({
    projectId: v.id("projects"),
    url: v.string(),
    type: v.union(v.literal("image"), v.literal("audio"), v.literal("video")),
  }).index("by_projectId", ["projectId"]),

  // Final rendered videos
  videos: defineTable({
    projectId: v.id("projects"),
    finalUrl: v.optional(v.string()),
  }).index("by_projectId", ["projectId"]),

  // Account Management
  accounts: defineTable({
    userId: v.id("users"),
    displayName: v.string(), // e.g., "AWS Facts"
    // A short description of the account's persona, content, and target audience.
    bio: v.optional(v.string()),
    // A user-editable creative brief for the next batch of videos.
    creativeBrief: v.optional(v.string()),
    // The social media platforms this account posts to (e.g., ["instagram", "tiktok"])
    platforms: v.array(v.object({
      platform: v.string(),
      handle: v.string(),
      credentials: v.optional(v.object({
        igUserId: v.string(),
        username: v.optional(v.string()),
        accessToken: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
        // Legacy fields for backward compatibility
        accessTokenEnvVar: v.optional(v.string()),
      }))
    })),
    castWeights: v.optional(v.array(v.object({
      castId: v.id("casts"),
      weight: v.number(),
    }))),
    postSchedule: v.optional(v.string()), // e.g., cron expression for posting time
    topicQueue: v.optional(v.array(v.object({
      topic: v.string(),
      url: v.optional(v.string()),
    }))),
    // For fixed daily actions instead of a queue
    dailyAction: v.optional(v.string()), // e.g., "Report on the latest AI news"
    dailyActionSearchQuery: v.optional(v.string()), // e.g., "latest AI breakthroughs"
  }).index("by_userId", ["userId"]),
});
