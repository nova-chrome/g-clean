import { messagesRouter } from "~/features/messages/routers/messages.router";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  messages: messagesRouter,
});

export type AppRouter = typeof appRouter;
