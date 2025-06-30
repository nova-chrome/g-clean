import clerk from "@clerk/clerk-sdk-node";
import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { google } from "googleapis";
import { cache } from "react";
import superjson from "superjson";

export type TrpcContext = Awaited<ReturnType<typeof createTRPCContext>>;

export const createTRPCContext = cache(async () => {
  const clerkAuth = await auth();
  const [OauthAccessToken] = await clerk.users.getUserOauthAccessToken(
    clerkAuth.userId || "",
    "oauth_google"
  );

  const { token } = OauthAccessToken;

  const gmail = google.gmail({
    version: "v1",
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    auth: clerkAuth,
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
