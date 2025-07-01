import { messagesRouter } from "~/features/messages/routers/messages.router";
import { syncRouter } from "~/features/sync/routers/sync.router";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  messages: messagesRouter,
  sync: syncRouter,
});

export type AppRouter = typeof appRouter;
