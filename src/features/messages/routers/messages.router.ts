import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/trpc/trpc";
import { tryCatch } from "~/util/try-catch";

export const messagesRouter = createTRPCRouter({
  getMyMessages: protectedProcedure.query(async ({ ctx }) => {
    const { gmail } = ctx;

    const { data, error } = await tryCatch(
      gmail.users.messages.list({
        userId: "me",
        prettyPrint: true,
      })
    );

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `[MESSAGES ROUTER::getMyMessages]: ${error.message}`,
      });
    }

    return data?.data;
  }),
});
