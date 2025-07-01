import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/trpc/trpc";
import { tryCatch } from "~/util/try-catch";
import { convertGmailMessageToMessage } from "./converter";

export const messagesRouter = createTRPCRouter({
  getMyMessages: protectedProcedure.query(async ({ ctx }) => {
    const { gmail } = ctx;

    const { data: messagesList, error: listError } = await tryCatch(
      gmail.users.messages.list({
        userId: "me",
        prettyPrint: true,
        maxResults: 50, // Adjust as needed, max is 500
      })
    );

    console.log(
      "[MESSAGES ROUTER::getMyMessages] Retrieved messages list:",
      JSON.stringify(messagesList?.data, null, 2)
    );

    if (listError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `[MESSAGES ROUTER::getMyMessages]: ${listError.message}`,
      });
    }

    const fullMessages = await Promise.all(
      (messagesList?.data?.messages || []).map(async (message) => {
        const { data: fullMessage, error: messageError } = await tryCatch(
          gmail.users.messages.get({
            userId: "me",
            id: message.id!,
          })
        );

        if (messageError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch message ${message.id}: ${messageError.message}`,
          });
        }

        return convertGmailMessageToMessage(fullMessage.data);
      })
    );

    return {
      data: fullMessages.filter(Boolean),
      estimateCount: messagesList?.data?.resultSizeEstimate || 0,
    };
  }),
});
