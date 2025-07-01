import clerk from "@clerk/clerk-sdk-node";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { google } from "googleapis";
import { cache } from "react";
import superjson from "superjson";
import { db } from "../db/drizzle";

export type TrpcContext = Awaited<ReturnType<typeof createTRPCContext>>;

export const createTRPCContext = cache(async () => {
  const auth = await clerkAuth();
  const [OauthAccessToken] = await clerk.users.getUserOauthAccessToken(
    auth.userId || "",
    "oauth_google"
  );

  const { token } = OauthAccessToken;

  const gmail = google.gmail({
    version: "v1",
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    auth,
    db,
    gmail,
  };
});

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.auth.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx,
  });
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
