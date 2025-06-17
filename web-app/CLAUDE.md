---
description: Guidelines and best practices for building Convex projects, including database schema design, queries, mutations, and real-world examples
globs: **/*.{ts,tsx,js,jsx}
---

# Convex guidelines
## Function guidelines
### New function syntax
- ALWAYS use the new function syntax for Convex functions. For example:
      ```typescript
      import { query } from "./_generated/server";
      import { v } from "convex/values";
      export const f = query({
          args: {},
          returns: v.null(),
          handler: async (ctx, args) => {
          // Function body
          },
      });
      ```

### Http endpoint syntax
- HTTP endpoints are defined in `convex/http.ts` and require an `httpAction` decorator. For example:
      ```typescript
      import { httpRouter } from "convex/server";
      import { httpAction } from "./_generated/server";
      const http = httpRouter();
      http.route({
          path: "/echo",
          method: "POST",
          handler: httpAction(async (ctx, req) => {
          const body = await req.bytes();
          return new Response(body, { status: 200 });
          }),
      });
      ```
- HTTP endpoints are always registered at the exact path you specify in the `path` field. For example, if you specify `/api/someRoute`, the endpoint will be registered at `/api/someRoute`.

### Validators
- Below is an example of an array validator:
                            ```typescript
                            import { mutation } from "./_generated/server";
                            import { v } from "convex/values";

                            export default mutation({
                            args: {
                                simpleArray: v.array(v.union(v.string(), v.number())),
                            },
                            handler: async (ctx, args) => {
                                //...
                            },
                            });
                            ```
- Below is an example of a schema with validators that codify a discriminated union type:
                            ```typescript
                            import { defineSchema, defineTable } from "convex/server";
                            import { v } from "convex/values";

                            export default defineSchema({
                                results: defineTable(
                                    v.union(
                                        v.object({
                                            kind: v.literal("error"),
                                            errorMessage: v.string(),
                                        }),
                                        v.object({
                                            kind: v.literal("success"),
                                            value: v.number(),
                                        }),
                                    ),
                                )
                            });
                            ```
- Always use the `v.null()` validator when returning a null value. Below is an example query that returns a null value:
                                  ```typescript
                                  import { query } from "./_generated/server";
                                  import { v } from "convex/values";

                                  export const exampleQuery = query({
                                    args: {},
                                    returns: v.null(),
                                    handler: async (ctx, args) => {
                                        console.log("This query returns a null value");
                                        return null;
                                    },
                                  });
                                  ```

### Function registration
- Use `internalQuery`, `internalMutation`, and `internalAction` to register internal functions. These functions are private and aren't part of an app's API. They can only be called by other Convex functions. These functions are always imported from `./_generated/server`.
- Use `query`, `mutation`, and `action` to register public functions. These functions are part of the public API and are exposed to the public Internet. Do NOT use `query`, `mutation`, or `action` to register sensitive internal functions that should be kept private.
- You CANNOT register a function through the `api` or `internal` objects.
- ALWAYS include argument and return validators for all Convex functions. This includes all of `query`, `internalQuery`, `mutation`, `internalMutation`, `action`, and `internalAction`. If a function doesn't return anything, include `returns: v.null()` as its output validator.
- If the JavaScript implementation of a Convex function doesn't have a return value, it implicitly returns `null`.

### Function calling
- Use `ctx.runQuery` to call a query from a query, mutation, or action.
- Use `ctx.runMutation` to call a mutation from a mutation or action.
- Use `ctx.runAction` to call an action from an action.
- ONLY call an action from another action if you need to cross runtimes (e.g. from V8 to Node). Otherwise, pull out the shared code into a helper async function and call that directly instead.
- Try to use as few calls from actions to queries and mutations as possible. Queries and mutations are transactions, so splitting logic up into multiple calls introduces the risk of race conditions.
- All of these calls take in a `FunctionReference`. Do NOT try to pass the callee function directly into one of these calls.
- When using `ctx.runQuery`, `ctx.runMutation`, or `ctx.runAction` to call a function in the same file, specify a type annotation on the return value to work around TypeScript circularity limitations. For example,
                            ```
                            export const f = query({
                              args: { name: v.string() },
                              returns: v.string(),
                              handler: async (ctx, args) => {
                                return "Hello " + args.name;
                              },
                            });

                            export const g = query({
                              args: {},
                              returns: v.null(),
                              handler: async (ctx, args) => {
                                const result: string = await ctx.runQuery(api.example.f, { name: "Bob" });
                                return null;
                              },
                            });
                            ```

### Function references
- Function references are pointers to registered Convex functions.
- Use the `api` object defined by the framework in `convex/_generated/api.ts` to call public functions registered with `query`, `mutation`, or `action`.
- Use the `internal` object defined by the framework in `convex/_generated/api.ts` to call internal (or private) functions registered with `internalQuery`, `internalMutation`, or `internalAction`.
- Convex uses file-based routing, so a public function defined in `convex/example.ts` named `f` has a function reference of `api.example.f`.
- A private function defined in `convex/example.ts` named `g` has a function reference of `internal.example.g`.
- Functions can also registered within directories nested within the `convex/` folder. For example, a public function `h` defined in `convex/messages/access.ts` has a function reference of `api.messages.access.h`.

### Api design
- Convex uses file-based routing, so thoughtfully organize files with public query, mutation, or action functions within the `convex/` directory.
- Use `query`, `mutation`, and `action` to define public functions.
- Use `internalQuery`, `internalMutation`, and `internalAction` to define private, internal functions.

### Pagination
- Paginated queries are queries that return a list of results in incremental pages.
- You can define pagination using the following syntax:

                            ```ts
                            import { v } from "convex/values";
                            import { query, mutation } from "./_generated/server";
                            import { paginationOptsValidator } from "convex/server";
                            export const listWithExtraArg = query({
                                args: { paginationOpts: paginationOptsValidator, author: v.string() },
                                handler: async (ctx, args) => {
                                    return await ctx.db
                                    .query("messages")
                                    .filter((q) => q.eq(q.field("author"), args.author))
                                    .order("desc")
                                    .paginate(args.paginationOpts);
                                },
                            });
                            ```
- A query that ends in `.paginate()` returns an object that has the following properties:
                            - page (contains an array of documents that you fetches)
                            - isDone (a boolean that represents whether or not this is the last page of documents)
                            - continueCursor (a string that represents the cursor to use to fetch the next page of documents)


## Validator guidelines
- `v.bigint()` is deprecated for representing signed 64-bit integers. Use `v.int64()` instead.
- Use `v.record()` for defining a record type. `v.map()` and `v.set()` are not supported.

## Schema guidelines
- Always define your schema in `convex/schema.ts`.
- Always import the schema definition functions from `convex/server`:
- System fields are automatically added to all documents and are prefixed with an underscore.
- Always include all index fields in the index name. For example, if an index is defined as `["field1", "field2"]`, the index name should be "by_field1_and_field2".
- Index fields must be queried in the same order they are defined. If you want to be able to query by "field1" then "field2" and by "field2" then "field1", you must create separate indexes.

## Typescript guidelines
- You can use the helper typescript type `Id` imported from './_generated/dataModel' to get the type of the id for a given table. For example if there is a table called 'users' you can use `Id<'users'>` to get the type of the id for that table.
- If you need to define a `Record` make sure that you correctly provide the type of the key and value in the type. For example a validator `v.record(v.id('users'), v.string())` would have the type `Record<Id<'users'>, string>`. Below is an example of using `Record` with an `Id` type in a query:
                    ```ts
                    import { query } from "./_generated/server";
                    import { Doc, Id } from "./_generated/dataModel";

                    export const exampleQuery = query({
                        args: { userIds: v.array(v.id("users")) },
                        returns: v.record(v.id("users"), v.string()),
                        handler: async (ctx, args) => {
                            const idToUsername: Record<Id<"users">, string> = {};
                            for (const userId of args.userIds) {
                                const user = await ctx.db.get(userId);
                                if (user) {
                                    users[user._id] = user.username;
                                }
                            }

                            return idToUsername;
                        },
                    });
                    ```
- Be strict with types, particularly around id's of documents. For example, if a function takes in an id for a document in the 'users' table, take in `Id<'users'>` rather than `string`.
- Always use `as const` for string literals in discriminated union types.
- When using the `Array` type, make sure to always define your arrays as `const array: Array<T> = [...];`
- When using the `Record` type, make sure to always define your records as `const record: Record<KeyType, ValueType> = {...};`
- Always add `@types/node` to your `package.json` when using any Node.js built-in modules.

## Full text search guidelines
- A query for "10 messages in channel '#general' that best match the query 'hello hi' in their body" would look like:

const messages = await ctx.db
  .query("messages")
  .withSearchIndex("search_body", (q) =>
    q.search("body", "hello hi").eq("channel", "#general"),
  )
  .take(10);

## Query guidelines
- Do NOT use `filter` in queries. Instead, define an index in the schema and use `withIndex` instead.
- Convex queries do NOT support `.delete()`. Instead, `.collect()` the results, iterate over them, and call `ctx.db.delete(row._id)` on each result.
- Use `.unique()` to get a single document from a query. This method will throw an error if there are multiple documents that match the query.
- When using async iteration, don't use `.collect()` or `.take(n)` on the result of a query. Instead, use the `for await (const row of query)` syntax.
### Ordering
- By default Convex always returns documents in ascending `_creationTime` order.
- You can use `.order('asc')` or `.order('desc')` to pick whether a query is in ascending or descending order. If the order isn't specified, it defaults to ascending.
- Document queries that use indexes will be ordered based on the columns in the index and can avoid slow table scans.


## Mutation guidelines
- Use `ctx.db.replace` to fully replace an existing document. This method will throw an error if the document does not exist.
- Use `ctx.db.patch` to shallow merge updates into an existing document. This method will throw an error if the document does not exist.

## Action guidelines
- Always add `"use node";` to the top of files containing actions that use Node.js built-in modules.
- Never use `ctx.db` inside of an action. Actions don't have access to the database.
- Below is an example of the syntax for an action:
                    ```ts
                    import { action } from "./_generated/server";

                    export const exampleAction = action({
                        args: {},
                        returns: v.null(),
                        handler: async (ctx, args) => {
                            console.log("This action does not return anything");
                            return null;
                        },
                    });
                    ```

## Scheduling guidelines
### Cron guidelines
- Only use the `crons.interval` or `crons.cron` methods to schedule cron jobs. Do NOT use the `crons.hourly`, `crons.daily`, or `crons.weekly` helpers.
- Both cron methods take in a FunctionReference. Do NOT try to pass the function directly into one of these methods.
- Define crons by declaring the top-level `crons` object, calling some methods on it, and then exporting it as default. For example,
                            ```ts
                            import { cronJobs } from "convex/server";
                            import { internal } from "./_generated/api";
                            import { internalAction } from "./_generated/server";

                            const empty = internalAction({
                              args: {},
                              returns: v.null(),
                              handler: async (ctx, args) => {
                                console.log("empty");
                              },
                            });

                            const crons = cronJobs();

                            // Run `internal.crons.empty` every two hours.
                            crons.interval("delete inactive users", { hours: 2 }, internal.crons.empty, {});

                            export default crons;
                            ```
- You can register Convex functions within `crons.ts` just like any other file.
- If a cron calls an internal function, always import the `internal` object from '_generated/api`, even if the internal function is registered in the same file.


## File storage guidelines
- Convex includes file storage for large files like images, videos, and PDFs.
- The `ctx.storage.getUrl()` method returns a signed URL for a given file. It returns `null` if the file doesn't exist.
- Do NOT use the deprecated `ctx.storage.getMetadata` call for loading a file's metadata.

                    Instead, query the `_storage` system table. For example, you can use `ctx.db.system.get` to get an `Id<"_storage">`.
                    ```
                    import { query } from "./_generated/server";
                    import { Id } from "./_generated/dataModel";

                    type FileMetadata = {
                        _id: Id<"_storage">;
                        _creationTime: number;
                        contentType?: string;
                        sha256: string;
                        size: number;
                    }

                    export const exampleQuery = query({
                        args: { fileId: v.id("_storage") },
                        returns: v.null();
                        handler: async (ctx, args) => {
                            const metadata: FileMetadata | null = await ctx.db.system.get(args.fileId);
                            console.log(metadata);
                            return null;
                        },
                    });
                    ```
- Convex storage stores items as `Blob` objects. You must convert all items to/from a `Blob` when using Convex storage.


# Examples:
## Example: chat-app

### Task
```
Create a real-time chat application backend with AI responses. The app should:
- Allow creating users with names
- Support multiple chat channels
- Enable users to send messages to channels
- Automatically generate AI responses to user messages
- Show recent message history

The backend should provide APIs for:
1. User management (creation)
2. Channel management (creation)
3. Message operations (sending, listing)
4. AI response generation using OpenAI's GPT-4

Messages should be stored with their channel, author, and content. The system should maintain message order
and limit history display to the 10 most recent messages per channel.

```

### Analysis
1. Task Requirements Summary:
- Build a real-time chat backend with AI integration
- Support user creation
- Enable channel-based conversations
- Store and retrieve messages with proper ordering
- Generate AI responses automatically

2. Main Components Needed:
- Database tables: users, channels, messages
- Public APIs for user/channel management
- Message handling functions
- Internal AI response generation system
- Context loading for AI responses

3. Public API and Internal Functions Design:
Public Mutations:
- createUser:
  - file path: convex/index.ts
  - arguments: {name: v.string()}
  - returns: v.object({userId: v.id("users")})
  - purpose: Create a new user with a given name
- createChannel:
  - file path: convex/index.ts
  - arguments: {name: v.string()}
  - returns: v.object({channelId: v.id("channels")})
  - purpose: Create a new channel with a given name
- sendMessage:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels"), authorId: v.id("users"), content: v.string()}
  - returns: v.null()
  - purpose: Send a message to a channel and schedule a response from the AI

Public Queries:
- listMessages:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels")}
  - returns: v.array(v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
    }))
  - purpose: List the 10 most recent messages from a channel in descending creation order

Internal Functions:
- generateResponse:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels")}
  - returns: v.null()
  - purpose: Generate a response from the AI for a given channel
- loadContext:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels")}
  - returns: v.array(v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
  }))
- writeAgentResponse:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels"), content: v.string()}
  - returns: v.null()
  - purpose: Write an AI response to a given channel

4. Schema Design:
- users
  - validator: { name: v.string() }
  - indexes: <none>
- channels
  - validator: { name: v.string() }
  - indexes: <none>
- messages
  - validator: { channelId: v.id("channels"), authorId: v.optional(v.id("users")), content: v.string() }
  - indexes
    - by_channel: ["channelId"]

5. Background Processing:
- AI response generation runs asynchronously after each user message
- Uses OpenAI's GPT-4 to generate contextual responses
- Maintains conversation context using recent message history


### Implementation

#### package.json
```typescript
{
  "name": "chat-app",
  "description": "This example shows how to build a chat app without authentication.",
  "version": "1.0.0",
  "dependencies": {
    "convex": "^1.17.4",
    "openai": "^4.79.0"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

#### tsconfig.json
```typescript
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "exclude": ["convex"],
  "include": ["**/src/**/*.tsx", "**/src/**/*.ts", "vite.config.ts"]
}
```

#### convex/index.ts
```typescript
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";

/**
 * Create a user with a given name.
 */
export const createUser = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", { name: args.name });
  },
});

/**
 * Create a channel with a given name.
 */
export const createChannel = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("channels"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("channels", { name: args.name });
  },
});

/**
 * List the 10 most recent messages from a channel in descending creation order.
 */
export const listMessages = query({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      channelId: v.id("channels"),
      authorId: v.optional(v.id("users")),
      content: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(10);
    return messages;
  },
});

/**
 * Send a message to a channel and schedule a response from the AI.
 */
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    authorId: v.id("users"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }
    const user = await ctx.db.get(args.authorId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: args.authorId,
      content: args.content,
    });
    await ctx.scheduler.runAfter(0, internal.index.generateResponse, {
      channelId: args.channelId,
    });
    return null;
  },
});

const openai = new OpenAI();

export const generateResponse = internalAction({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.index.loadContext, {
      channelId: args.channelId,
    });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: context,
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }
    await ctx.runMutation(internal.index.writeAgentResponse, {
      channelId: args.channelId,
      content,
    });
    return null;
  },
});

export const loadContext = internalQuery({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.array(
    v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(10);

    const result = [];
    for (const message of messages) {
      if (message.authorId) {
        const user = await ctx.db.get(message.authorId);
        if (!user) {
          throw new Error("User not found");
        }
        result.push({
          role: "user" as const,
          content: `${user.name}: ${message.content}`,
        });
      } else {
        result.push({ role: "assistant" as const, content: message.content });
      }
    }
    return result;
  },
});

export const writeAgentResponse = internalMutation({
  args: {
    channelId: v.id("channels"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      channelId: args.channelId,
      content: args.content,
    });
    return null;
  },
});
```

#### convex/schema.ts
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  channels: defineTable({
    name: v.string(),
  }),

  users: defineTable({
    name: v.string(),
  }),

  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
  }).index("by_channel", ["channelId"]),
});
```

#### src/App.tsx
```typescript
export default function App() {
  return <div>Hello World</div>;
}
```

# Convex Agent Component

[![npm version](https://badge.fury.io/js/@convex-dev%2fagent.svg)](https://badge.fury.io/js/@convex-dev%2fagent)

<!-- START: Include on https://convex.dev/components -->

AI Agent framework built on Convex.

- Automatic storage of chat history, per-user or per-thread, that can span multiple agents.
- Playground UI for testing, debugging, and development. See [playground/README.md](playground/README.md) for more.
- RAG for chat context, via hybrid text & vector search, with configuration options.
  Use the API to query the history yourself and do it your way.
- Opt-in search for messages from other threads (for the same specified user).
- Support for generating / streaming objects and storing them in messages (as JSON).
- Tool calls via the AI SDK, along with Convex-specific tool wrappers.
- Easy integration with the [Workflow component](https://convex.dev/components/workflow).
  Enables long-lived, durable workflows defined as code.
- Reactive & realtime updates from asynchronous functions / workflows.
- Support for streaming text and storing the final result.
  See [examples/chat-streaming](./examples/chat-streaming/README.md).
- Optionally filter tool calls out of the thread history.

[Read the associated Stack post here](https://stack.convex.dev/ai-agents).

Play with the [examples](./examples/) by cloning this repo and running:
```sh
npm run setup
npm run example
```

## Example usage:

```ts
// Define an agent similarly to the AI SDK
const supportAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions: "You are a helpful assistant.",
  tools: { accountLookup, fileTicket, sendEmail },
});

// Use the agent from within a normal action:
export const createThreadAndPrompt = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    const userId = await getUserId(ctx);
    // Start a new thread for the user.
    const { threadId, thread } = await supportAgent.createThread(ctx, { userId});
    // Creates a user message with the prompt, and an assistant reply message.
    const result = await thread.generateText({ prompt });
    return { threadId, text: result.text };
  },
});

// Pick up where you left off, with the same or a different agent:
export const continueThread = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    // Continue a thread, picking up where you left off.
    const { thread } = await anotherAgent.continueThread(ctx, { threadId });
    // This includes previous message history from the thread automatically.
    const result = await thread.generateText({ prompt });
    return result.text;
  },
});
```

Also see the [Stack article](https://stack.convex.dev/ai-agents).

Found a bug? Feature request? [File it here](https://github.com/get-convex/agent/issues).

## Pre-requisite: Convex

You'll need an existing Convex project to use the component.
Convex is a hosted backend platform, including a database, serverless functions,
and a ton more you can learn about [here](https://docs.convex.dev/get-started).

Run `npm create convex` or follow any of the [quickstarts](https://docs.convex.dev/home) to set one up.

## Installation

Install the component package:

```ts
npm install @convex-dev/agent
```

Create a `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";

const app = defineApp();
app.use(agent);

export default app;
```

## Usage

### Creating the agent

```ts
import { tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { Agent, createTool } from "@convex-dev/agent";
import { components } from "./_generated/api";

// Define an agent similarly to the AI SDK
const supportAgent = new Agent(components.agent, {
  // The chat completions model to use for the agent.
  chat: openai.chat("gpt-4o-mini"),
  // The default system prompt if not overriden.
  instructions: "You are a helpful assistant.",
  tools: {
    // Convex tool
    myConvexTool: createTool({
      description: "My Convex tool",
      args: z.object({...}),
      // Note: annotate the return type of the handler to avoid type cycles.
      handler: async (ctx, args): Promise<string> => {
        return "Hello, world!";
      },
    }),
    // Standard AI SDK tool
    myTool: tool({ description, parameters, execute: () => {}}),
  },
  // Embedding model to power vector search of message history (RAG).
  textEmbedding: openai.embedding("text-embedding-3-small"),
  // Used for fetching context messages. See [below](#configuring-the-context-of-messages)
  contextOptions,
  // Used for storing messages. See [below](#configuring-the-storage-of-messages)
  storageOptions,
  // Used for limiting the number of steps when tool calls are involved.
  // NOTE: if you want tool calls to happen automatically with a single call,
  // you need to set this to something greater than 1 (the default).
  maxSteps: 1,
  // Used for limiting the number of retries when a tool call fails. Default: 3.
  maxRetries: 3,
  // Used for tracking token usage. See [below](#tracking-token-usage)
  usageHandler: async (ctx, { model, usage }) => {
    // ... log, save usage to your database, etc.
  },
});
```

### Starting a thread

You can start a thread from either an action or a mutation.
If it's in an action, you can also start sending messages.
The threadId allows you to resume later and maintain message history.
If you specify a userId, the thread will be associated with that user and messages will be saved to the user's history.
You can also search the user's history for relevant messages in this thread.

```ts
// Use the agent from within a normal action:
export const createThread = mutation({
  args: {},
  handler: async (ctx): Promise<{ threadId: string }> => {
    const userId = await getUserId(ctx);
    // Start a new thread for the user.
    const { threadId } = await supportAgent.createThread(ctx, { userId });
    return { threadId };
  },
});
```

### Continuing a thread

If you specify a userId too, you can search the user's history for relevant messages
to include in the prompt context.

```ts
// Pick up where you left off:
export const continueThread = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }): Promise<string> => {
    await authorizeThreadAccess(ctx, threadId);
    // This includes previous message history from the thread automatically.
+   const { thread } = await supportAgent.continueThread(ctx, { threadId });
    const result = await thread.generateText({ prompt });
    return result.text;
  },
});
```

### Generating text

The arguments to `generateText` are the same as the AI SDK, except you don't
have to provide a model. By default it will use the agent's chat model.

```ts
const { thread } = await supportAgent.createThread(ctx);
// OR
const { thread } = await supportAgent.continueThread(ctx, { threadId });

const result = await thread.generateText({ prompt });
```

### Generating an object

Similar to the AI SDK, you can generate or streaman object.
The same arguments apply, except you don't have to provide a model.
It will use the agent's default chat model.

```ts
import { z } from "zod";

const result = await thread.generateObject({
  prompt: "Generate a plan based on the conversation so far",
  schema: z.object({...}),
});
```


### Configuring the context of messages

You can customize what history is included per-message via `contextOptions`.
These options can be provided to the Agent constructor, or per-message.

```ts
const result = await thread.generateText({ prompt }, {
  // Values shown are the defaults.
  contextOptions: {
    // Whether to include tool messages in the context.
    includeToolCalls: false,
    // How many recent messages to include. These are added after the search
    // messages, and do not count against the search limit.
    recentMessages: 100,
    // Options for searching messages via text and/or vector search.
    searchOptions: {
      limit: 10, // The maximum number of messages to fetch.
      textSearch: false, // Whether to use text search to find messages.
      vectorSearch: false, // Whether to use vector search to find messages.
      // Note, this is after the limit is applied.
      // E.g. this will quadruple the number of messages fetched.
      // (two before, and one after each message found in the search)
      messageRange: { before: 2, after: 1 },
    },
    // Whether to search across other threads for relevant messages.
    // By default, only the current thread is searched.
    searchOtherThreads: false,
  },
```

### Configuring the storage of messages

Generally the defaults are fine, but if you want to pass in multiple messages
and have them all saved (vs. just the last one), or avoid saving any input
or output messages, you can pass in a `storageOptions` object, either to the
Agent constructor or per-message.

The usecase for passing in multiple messages but not saving them is if you want
to include some extra messages for context to the LLM, but only the last message
is the user's actual request. e.g. `messages = [...messagesFromRag, messageFromUser]`.
The default is to save the prompt and all output messages.

```ts
const result = await thread.generateText({ messages }, {
  storageOptions: {
    saveMessages: "all" | "none" | "promptAndOutput";
  },
});
```

### Creating a tool with Convex context

There are two ways to create a tool that has access to the Convex context.

1. Use the `createTool` function, which is a wrapper around the AI SDK's `tool` function.

```ts
export const ideaSearch = createTool({
  description: "Search for ideas in the database",
  args: z.object({ query: z.string() }),
  handler: async (ctx, args): Promise<Array<Idea>> => {
    // ctx has userId, threadId, messageId, runQuery, runMutation, and runAction
    const ideas = await ctx.runQuery(api.ideas.searchIdeas, { query: args.query });
    console.log("found ideas", ideas);
    return ideas;
  },
});
```

2. Define tools at runtime in a context with the variables you want to use.

```ts
async function createTool(ctx: ActionCtx, teamId: Id<"teams">) {
  const myTool = tool({
    description: "My tool",
    parameters: z.object({...}),
    execute: async (args, options) => {
      return await ctx.runQuery(internal.foo.bar, args);
    },
  });
}
```

You can provide tools at different times:

- Agent contructor: (`new Agent(components.agent, { tools: {...} })`)
- Creating a thread: `createThread(ctx, { tools: {...} })`
- Continuing a thread: `continueThread(ctx, { tools: {...} })`
- On thread functions: `thread.generateText({ tools: {...} })`
- Outside of a thread: `supportAgent.generateText(ctx, {}, { tools: {...} })`

Specifying tools at each layer will overwrite the defaults.
The tools will be `args.tools ?? thread.tools ?? agent.options.tools`.
This allows you to create tools in a context that is convenient.

### Saving messages then generate asynchronously

You can save messages in a mutation, then do the generation asynchronously.
This is recommended for a few reasons:
1. You can set up optimistic UI updates on mutations that are transactional, so
  the message will be shown optimistically until the message is saved and
  present in your message query.

To do this, you need to first save the message, then pass the `messageId` as
`promptMessageId` to generate / stream text.

Note: embeddings are usually generated automatically when you save messages from
an action. However, if you're saving messages in a mutation, where calling
an LLM is not possible, you can generate them asynchronously as well.

```ts
export const sendMessage = mutation({
  args: { threadId: v.id("threads"), prompt: v.string() },
  handler: async (ctx, { threadId, prompt }) => {
    const userId = await getUserId(ctx);
    const { messageId } = await agent.saveMessage(ctx, {
      threadId, userId, prompt,
      skipEmbeddings: true,
    });
    await ctx.scheduler.runAfter(0, internal.example.myAsyncAction, {
      threadId, promptMessageId: messageId,
    });
  }
});

export const myAsyncAction = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string() },
  handler: async (ctx, { threadId, promptMessageId }) => {
    // Generate embeddings for the prompt message
    await supportAgent.generateAndSaveEmbeddings(ctx, { messageIds: [promptMessageId] });
    const { thread } = await supportAgent.continueThread(ctx, { threadId });
    await thread.generateText({ promptMessageId });
  },
});
```

### Fetching thread history

Fetch the full messages directly. These will include things like usage, etc.

```ts
import type { MessageDoc } from "@convex-dev/agent";

export const getMessages = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }): Promise<MessageDoc[]> => {
    const messages = await agent.listMessages(ctx, {
      threadId,
      paginationOpts: { cursor: null, numItems: 10 }
    });
    return messages.page;
  },
});
```

### Search for messages

This is what the agent does automatically, but it can be useful to do manually, e.g. to find custom context to include.

Fetch Messages for a user and/or thread.
Accepts ContextOptions, e.g. includeToolCalls, searchOptions, etc.
If you provide a `beforeMessageId`, it will only fetch messages from before that message.

```ts
import type { MessageDoc } from "@convex-dev/agent";

const messages: MessageDoc[] = await supportAgent.fetchContextMessages(ctx, {
  threadId, messages: [{ role, content }], contextOptions
});
```

### Get and update thread information

List threads for a user:

```ts
const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
  userId,
  order: "desc",
  paginationOpts: { cursor: null, numItems: 10 }
});
```

Get a thread by id:

```ts
const thread = await ctx.runQuery(components.agent.threads.getThread, {
  threadId,
});
```

Update a thread's metadata:

```ts
await ctx.runMutation(components.agent.threads.updateThread, {
  threadId,
  { title, summary, status }
});
```

## Using the Playground UI

The Playground UI is a simple way to test, debug, and develop with the agent.
- First configure it with instructions [here](./playground/README.md).
- Then you can use the [hosted version on GitHub pages](https://get-convex.github.io/agent/)
or run it locally with `npx @convex-dev/agent-playground`.

![Playground UI Screenshot](./playground/public/screenshot.png)

## Using the Workflow component for long-lived durable workflows

The [Workflow component](https://convex.dev/components/workflow) is a great way to build long-lived, durable workflows.
It handles retries and guarantees of eventually completing, surviving server restarts, and more.
Read more about durable workflows in [this Stack post](https://stack.convex.dev/durable-workflows-and-strong-guarantees).

To use the agent alongside workflows, you can run indivdual idempotent steps
that the workflow can run, each with configurable retries, with guarantees that
the workflow will eventually complete. Even if the server crashes mid-workflow,
the workflow will pick up from where it left off and run the next step. If a
step fails and isn't caught by the workflow, the workflow's onComplete handler
will get the error result.

### Exposing the agent as Convex actions

You can expose the agent's capabilities as Convex functions to be used as steps
in a workflow.

To create a thread as a standalone mutation, similar to `agent.createThread`:

```ts
export const createThread = supportAgent.createThreadMutation();
```

For an action that generates text in a thread, similar to `thread.generateText`:

```ts
export const getSupport = supportAgent.asTextAction({
  maxSteps: 10,
});
```

You can also expose a standalone action that generates an object.

```ts
export const getStructuredSupport = supportAgent.asObjectAction({
  schema: z.object({
    analysis: z.string().describe("A detailed analysis of the user's request."),
    suggestion: z.string().describe("A suggested action to take.")
  }),
});
```

To save messages explicitly as a mutation, similar to `agent.saveMessages`:

```ts
export const saveMessages = supportAgent.asSaveMessagesMutation();
```

This is useful for idempotency, as you can first create the user's message,
then generate a response in an unreliable action with retries, passing in the
existing messageId instead of a prompt.

### Using the agent actions within a workflow

You can use the [Workflow component](https://convex.dev/components/workflow)
to run agent flows. It handles retries and guarantees of eventually completing,
surviving server restarts, and more. Read more about durable workflows
[in this Stack post](https://stack.convex.dev/durable-workflows-and-strong-guarantees).

```ts
const workflow = new WorkflowManager(components.workflow);

export const supportAgentWorkflow = workflow.define({
  args: { prompt: v.string(), userId: v.string() },
  handler: async (step, { prompt, userId }) => {
    const { threadId } = await step.runMutation(internal.example.createThread, {
      userId, title: "Support Request",
    });
    const suggestion = await step.runAction(internal.example.getSupport, {
      threadId, userId, prompt,
    });
    const { object } = await step.runAction(internal.example.getStructuredSupport, {
      userId, message: suggestion,
    });
    await step.runMutation(internal.example.sendUserMessage, {
      userId, message: object.suggestion,
    });
  },
});
```

See another example in [example.ts](./example/convex/example.ts#L120).

## Extra control: how to do more things yourself

### Generating text for a user without an associated thread

```ts
const result = await supportAgent.generateText(ctx, { userId }, { prompt });
```

### Saving messages manually

Save messages to the database.

```ts
const { lastMessageId, messageIds} = await agent.saveMessages(ctx, {
  threadId, userId,
  messages: [{ role, content }],
  metadata: [{ reasoning, usage, ... }] // See MessageWithMetadata type
});
```

### Manage embeddings

Generate embeddings for a set of messages.

```ts
const embeddings = await supportAgent.generateEmbeddings([
  { role: "user", content: "What is love?" },
]);
```

Get and update embeddings, e.g. for a migration to a new model.

```ts
const messages = await ctx.runQuery(
  components.agent.vector.index.paginate,
  { vectorDimension: 1536, cursor: null, limit: 10 }
);
```

Note: If the dimension changes, you need to delete the old and insert the new.

```ts
const messages = await ctx.runQuery(components.agent.vector.index.updateBatch, {
  vectors: [
    { model: "gpt-4o-mini", vector: embedding, id: msg.embeddingId },
  ],
});
```

Delete embeddings

```ts
await ctx.runMutation(components.agent.vector.index.deleteBatch, {
  ids: [embeddingId1, embeddingId2],
});
```

Insert embeddings

```ts
const ids = await ctx.runMutation(
  components.agent.vector.index.insertBatch, {
    vectorDimension: 1536,
    vectors: [
      {
        model: "gpt-4o-mini",
        table: "messages",
        userId: "123",
        threadId: "123",
        vector: embedding,
        // Optional, if you want to update the message with the embeddingId
        messageId: messageId,
      },
    ],
  }
);
```

See example usage in [example.ts](./example/convex/example.ts).
Read more in [this Stack post](https://stack.convex.dev/ai-agents).

```sh
npm i @convex-dev/agent
```

### Tracking token usage

You can provide a `usageHandler` to the agent to track token usage.
See an example in
[this demo](https://github.com/ianmacartney/ai-agent-chat/blob/main/convex/chat.ts)
that captures usage to a table, then scans it to generate per-user invoices.

You can provide a `usageHandler` to the agent, per-thread, or per-message.

```ts
const supportAgent = new Agent(components.agent, {
  ...
  usageHandler: async (ctx, args) => {
    const {
      // Who used the tokens
      userId, threadId, agentName,
      // What LLM was used
      model, provider,
      // How many tokens were used (extra info is available in providerMetadata)
      usage, providerMetadata
    } = args;
    // ... log, save usage to your database, etc.
  },
});
```

Tip: Define the `usageHandler` within a function where you have more variables
available to attribute the usage to a different user, team, project, etc.

### Logging the raw request and response

You can provide a `rawRequestResponseHandler` to the agent to log the raw request and response from the LLM.

You could use this to log the request and response to a table, or use console logs with
[Log Streaming](https://docs.convex.dev/production/integrations/log-streams/)
to allow debugging and searching through Axiom or another logging service.

```ts
const supportAgent = new Agent(components.agent, {
  ...
  rawRequestResponseHandler: async (ctx, { request, response }) => {
    console.log("request", request);
    console.log("response", response);
  },
});
```

## Troubleshooting

### Circular dependencies

Having the return value of workflows depend on other Convex functions can lead to circular dependencies due to the
`internal.foo.bar` way of specifying functions. The way to fix this is to explicitly type the return value of the
workflow. When in doubt, add return types to more `handler` functions, like this:

```diff
 export const supportAgentWorkflow = workflow.define({
   args: { prompt: v.string(), userId: v.string(), threadId: v.string() },
+  handler: async (step, { prompt, userId, threadId }): Promise<string> => {
     // ...
   },
 });

 // And regular functions too:
 export const myFunction = action({
   args: { prompt: v.string() },
+  handler: async (ctx, { prompt }): Promise<string> => {
     // ...
   },
 });
```
<!-- END: Include on https://convex.dev/components -->

# Convex Workflow

[![npm version](https://badge.fury.io/js/@convex-dev%2Fworkflow.svg?)](https://badge.fury.io/js/@convex-dev%2Fworkflow)

<!-- START: Include on https://convex.dev/components -->

Have you ever wanted to run a series of functions reliably and durably, where
each can have its own retry behavior, the overall workflow will survive server
restarts, and you can have long-running workflows spanning months that can be
canceled? Do you want to observe the status of a workflow reactively, as well as
the results written from each step?

And do you want to do this with code, instead of a DSL?

Welcome to the world of Convex workflows.

- Run workflows asynchronously, and observe their status reactively via
  subscriptions, from one or many users simultaneously, even on page refreshes.
- Workflows can run for months, and survive server restarts. You can specify
  delays or custom times to run each step.
- Run steps in parallel, or in sequence.
- Output from previous steps is available to pass to subsequent steps.
- Run queries, mutations, and actions.
- Specify retry behavior on a per-step basis, along with a default policy.
- Specify how many workflows can run in parallel to manage load.
- Cancel long-running workflows.
- Clean up workflows after they're done.

```ts
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";

export const workflow = new WorkflowManager(components.workflow);

export const exampleWorkflow = workflow.define({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (step, args): Promise<number[]> => {
    const transcription = await step.runAction(
      internal.index.computeTranscription,
      { storageId: args.storageId },
    );

    const embedding = await step.runAction(
      internal.index.computeEmbedding,
      { transcription },
      // Run this a month after the transcription is computed.
      { runAfter: 30 * 24 * 60 * 60 * 1000 },
    );
    return embedding;
  },
});
```

This component adds durably executed _workflows_ to Convex. Combine Convex queries, mutations,
and actions into long-lived workflows, and the system will always fully execute a workflow
to completion.

Open a [GitHub issue](https://github.com/get-convex/workflow/issues) with any feedback or bugs you find.

## Installation

First, add `@convex-dev/workflow` to your Convex project:

```sh
npm install @convex-dev/workflow
```

Then, install the component within your `convex/convex.config.ts` file:

```ts
// convex/convex.config.ts
import workflow from "@convex-dev/workflow/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(workflow);
export default app;
```

Finally, create a workflow manager within your `convex/` folder, and point it
to the installed component:

```ts
// convex/index.ts
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";

export const workflow = new WorkflowManager(components.workflow);
```

## Usage

The first step is to define a workflow using `workflow.define()`. This function
is designed to feel like a Convex action but with a few restrictions:

1. The workflow runs in the background, so it can't return a value.
2. The workflow must be _deterministic_, so it should implement most of its logic
   by calling out to other Convex functions. We will be lifting some of these
   restrictions over time by implementing `Math.random()`, `Date.now()`, and
   `fetch` within our workflow environment.

Note: To help avoid type cycles, always annotate the return type of the `handler`
with the return type of the workflow.

```ts
export const exampleWorkflow = workflow.define({
  args: { name: v.string() },
  handler: async (step, args): Promise<string> => {
    const queryResult = await step.runQuery(
      internal.example.exampleQuery,
      args,
    );
    const actionResult = await step.runAction(
      internal.example.exampleAction,
      { queryResult }, // pass in results from previous steps!
    );
    return actionResult;
  },
});

export const exampleQuery = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return `The query says... Hi ${args.name}!`;
  },
});

export const exampleAction = internalAction({
  args: { queryResult: v.string() },
  handler: async (ctx, args) => {
    return args.queryResult + " The action says... Hi back!";
  },
});
```

### Starting a workflow

Once you've defined a workflow, you can start it from a mutation or action
using `workflow.start()`.

```ts
export const kickoffWorkflow = mutation({
  handler: async (ctx) => {
    const workflowId = await workflow.start(
      ctx,
      internal.example.exampleWorkflow,
      { name: "James" },
    );
  },
});
```

### Handling the workflow's result with onComplete

You can handle the workflow's result with `onComplete`. This is useful for
cleaning up any resources used by the workflow.

Note: when you return things from a workflow, you'll need to specify the return
type of your `handler` to break type cycles due to using `internal.*` functions
in the body, which then inform the type of the workflow, which is included in
the `internal.*` type.

You can also specify a `returns` validator to do runtime validation on the
return value. If it fails, your `onComplete` handler will be called with an
error instead of success. You can also do validation in the `onComplete` handler
to have more control over handling that situation.

```ts
import { vWorkflowId } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";

export const foo = mutation({
  handler: async (ctx) => {
    const name = "James";
    const workflowId = await workflow.start(
      ctx,
      internal.example.exampleWorkflow,
      { name },
      {
        onComplete: internal.example.handleOnComplete,
        context: name, // can be anything
      },
    );
  },
});

export const handleOnComplete = mutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.any(), // used to pass through data from the start site.
  }
  handler: async (ctx, args) => {
    const name = (args.context as { name: string }).name;
    if (args.result.kind === "success") {
      const text = args.result.returnValue;
      console.log(`${name} result: ${text}`);
    } else if (args.result.kind === "error") {
      console.error("Workflow failed", args.result.error);
    } else if (args.result.kind === "canceled") {
      console.log("Workflow canceled", args.context);
    }
  },
});
```

### Running steps in parallel

You can run steps in parallel by calling `step.runAction()` multiple times in
a `Promise.all()` call.

```ts
export const exampleWorkflow = workflow.define({
  args: { name: v.string() },
  handler: async (step, args): Promise<void> => {
    const [result1, result2] = await Promise.all([
      step.runAction(internal.example.myAction, args),
      step.runAction(internal.example.myAction, args),
    ]);
  },
});
```

Note: The workflow will not proceed until all steps fired off at once have completed.

### Specifying retry behavior

Sometimes actions fail due to transient errors, whether it was an unreliable
third-party API or a server restart. You can have the workflow automatically
retry actions using best practices (exponential backoff & jitter).
By default there are no retries, and the workflow will fail.

You can specify default retry behavior for all workflows on the WorkflowManager,
or override it on a per-workflow basis.

You can also specify a custom retry behavior per-step, to opt-out of retries
for actions that may want at-most-once semantics.

Workpool options:

If you specify any of these, it will override the
[`DEFAULT_RETRY_BEHAVIOR`](./src/component/pool.ts).

- `defaultRetryBehavior`: The default retry behavior for all workflows.
  - `maxAttempts`: The maximum number of attempts to retry an action.
  - `initialBackoffMs`: The initial backoff time in milliseconds.
  - `base`: The base multiplier for the backoff. Default is 2.
- `retryActionsByDefault`: Whether to retry actions, by default is false.
  - If you specify a retry behavior at the step level, it will always retry.

At the step level, you can also specify `true` or `false` to disable or use
the default policy.

```ts
const workflow = new WorkflowManager(components.workflow, {
  defaultRetryBehavior: {
    maxAttempts: 3,
    initialBackoffMs: 100,
    base: 2,
  },
  // If specified, this sets the defaults, overridden per-workflow or per-step.
  workpoolOptions: { ... }
});

export const exampleWorkflow = workflow.define({
  args: { name: v.string() },
  handler: async (step, args): Promise<void> => {
    // Uses default retry behavior & retryActionsByDefault
    await step.runAction(internal.example.myAction, args);
    // Retries will be attempted with the default behavior
    await step.runAction(internal.example.myAction, args, { retry: true });
    // No retries will be attempted
    await step.runAction(internal.example.myAction, args, { retry: false });
    // Custom retry behavior will be used
    await step.runAction(internal.example.myAction, args, {
      retry: { maxAttempts: 2, initialBackoffMs: 100, base: 2 },
    });
  },
  // If specified, this will override the workflow manager's default
  workpoolOptions: { ... },
});
```

### Specifying how many workflows can run in parallel

You can specify how many workflows can run in parallel by setting the `maxParallelism`
workpool option. It has a reasonable default. You should not exceed 50 across
all your workflows. If you want to do a lot of work in parallel, you should
employ batching, where each workflow operates on a batch of work, e.g. scraping
a list of links instead of one link per workflow.

```ts
const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    // You must only set this to one value per components.xyz!
    // You can set different values if you "use" multiple different components
    // in convex.config.ts.
    maxParallelism: 10,
  },
});
```

### Checking a workflow's status

The `workflow.start()` method returns a `WorkflowId`, which can then be used for querying
a workflow's status.

```ts
export const kickoffWorkflow = action({
  handler: async (ctx) => {
    const workflowId = await workflow.start(
      ctx,
      internal.example.exampleWorkflow,
      { name: "James" },
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const status = await workflow.status(ctx, workflowId);
    console.log("Workflow status after 1s", status);
  },
});
```

### Canceling a workflow

You can cancel a workflow with `workflow.cancel()`, halting the workflow's execution immmediately.
In-progress calls to `step.runAction()`, however, will finish executing.

```ts
export const kickoffWorkflow = action({
  handler: async (ctx) => {
    const workflowId = await workflow.start(
      ctx,
      internal.example.exampleWorkflow,
      { name: "James" },
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Cancel the workflow after 1 second.
    await workflow.cancel(ctx, workflowId);
  },
});
```

### Cleaning up a workflow

After a workflow has completed, you can clean up its storage with `workflow.cleanup()`.
Completed workflows are not automatically cleaned up by the system.

```ts
export const kickoffWorkflow = action({
  handler: async (ctx) => {
    const workflowId = await workflow.start(
      ctx,
      internal.example.exampleWorkflow,
      { name: "James" },
    );
    try {
      while (true) {
        const status = await workflow.status(ctx, workflowId);
        if (status.type === "inProgress") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        console.log("Workflow completed with status:", status);
        break;
      }
    } finally {
      await workflow.cleanup(ctx, workflowId);
    }
  },
});
```

### Specifying a custom name for a step

You can specify a custom name for a step by passing a `name` option to the step.

This allows the events emitted to your logs to be more descriptive.
By default it uses the `file/folder:function` name.

```ts
export const exampleWorkflow = workflow.define({
  args: { name: v.string() },
  handler: async (step, args): Promise<void> => {
    await step.runAction(internal.example.myAction, args, { name: "FOO" });
  },
});
```

## Tips and troubleshooting

### Circular dependencies

Having the return value of workflows depend on other Convex functions can lead to circular dependencies due to the
`internal.foo.bar` way of specifying functions. The way to fix this is to explicitly type the return value of the
workflow. When in doubt, add return types to more `handler` functions, like this:

```diff
 export const supportAgentWorkflow = workflow.define({
   args: { prompt: v.string(), userId: v.string(), threadId: v.string() },
+  handler: async (step, { prompt, userId, threadId }): Promise<string> => {
     // ...
   },
 });

 // And regular functions too:
 export const myFunction = action({
   args: { prompt: v.string() },
+  handler: async (ctx, { prompt }): Promise<string> => {
     // ...
   },
 });
```

### More concise workflows

To avoid the noise of `internal.foo.*` syntax, you can use a variable.
For instance, if you define all your steps in `convex/steps.ts`, you can do this:

```diff
 const s = internal.steps;

 export const myWorkflow = workflow.define({
   args: { prompt: v.string() },
   handler: async (step, args): Promise<string> => {
+    const result = await step.runAction(s.myAction, args);
     return result;
   },
 });
```

## Limitations

Here are a few limitations to keep in mind:

- Steps can only take in and return a total of _1 MiB_ of data within a single
  workflow execution. If you run into journal size limits, you can work around
  this by storing results in the DB from your step functions and passing IDs
  around within the the workflow.
- `console.log()` isn't currently captured, so you may see duplicate log lines
  within your Convex dashboard if you log within the workflow definition.
- We currently do not collect backtraces from within function calls from workflows.
- If you need to use side effects like `fetch`, `Math.random()`, or `Date.now()`,
  you'll need to do that in a step, not in the workflow definition.
- If the implementation of the workflow meaningfully changes (steps added,
  removed, or reordered) then it will fail with a determinism violation.
  The implementation should stay stable for the lifetime of active workflows.
  See [this issue](https://github.com/get-convex/workflow/issues/35) for ideas
  on how to make this better.

<!-- END: Include on https://convex.dev/components -->