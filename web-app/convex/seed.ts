import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const southPark = mutation({
    handler: async (ctx) => {
        // Check if the cast already exists to prevent duplicates
        const existingCast = await ctx.db
            .query("casts")
            .filter((q) => q.eq(q.field("name"), "South Park"))
            .first();

        if (existingCast) {
            const existingCharacters = await ctx.db
                .query("characters")
                .withIndex("by_castId", (q) => q.eq("castId", existingCast._id))
                .collect();
            if (existingCharacters.length > 0) {
                console.log("South Park cast already seeded.");
                return "South Park cast already seeded.";
            }
        }

        // 1. Create the cast
        const castId = await ctx.runMutation(api.casts.createCast, {
            name: "South Park",
            dynamics: "A group of fourth-graders in the dysfunctional town of South Park. The dynamic often revolves around the cynical and moralistic Kyle, and the narcissistic, manipulative Eric Cartman. They are frequently at odds, with their arguments forming the core of many discussions and conflicts.",
        });

        if (!castId) {
            throw new Error("Failed to create cast.");
        }
        console.log(`Created cast "South Park" with id: ${castId}`);

        // 2. Create Cartman
        await ctx.runMutation(api.characters.createCharacter, {
            name: "Cartman",
            description: "A foul-mouthed, narcissistic, and intolerant fourth-grader who is often the antagonist of the show.",
            castId: castId,
            voiceId: "7fbaba22071e4f8e886a9aa1af3b72db",
        });
        console.log("Created character: Cartman");

        // 3. Create Kyle
        await ctx.runMutation(api.characters.createCharacter, {
            name: "Kyle",
            description: "A practical, intelligent, and moralistic boy who is often the voice of reason.",
            castId: castId,
            voiceId: "e51b5285cdaf4f77b41edb318796dbb3",
        });
        console.log("Created character: Kyle");

        return "Successfully seeded the South Park cast.";
    },
}); 