import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub, Google],
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    const userProperties = await ctx.db
      .query("userProperties")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    return {
      ...user,
      tokens: userProperties?.tokens ?? 1,
    };
  },
});