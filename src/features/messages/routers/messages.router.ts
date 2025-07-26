import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { messages } from "~/lib/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/trpc/trpc";
import { tryCatch } from "~/util/try-catch";
import { convertGmailMessageToMessage } from "./converter";

export const messagesRouter = createTRPCRouter({
  // Get messages from Gmail API (live)
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
  getMySyncedMessages: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, auth } = ctx;
      const { limit, offset } = input;
      const userId = auth.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const { data: userMessages, error: userMessagesError } = await tryCatch(
        db
          .select()
          .from(messages)
          .where(eq(messages.userId, userId))
          .orderBy(desc(messages.date)) // Order by date descending (newest first)
          .limit(limit)
          .offset(offset)
      );

      if (userMessagesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch synced messages",
        });
      }

      const { data: totalCountResult, error: totalCountError } = await tryCatch(
        db
          .select({ count: sql`count(*)` })
          .from(messages)
          .where(eq(messages.userId, userId))
      );

      if (totalCountError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch total message count",
        });
      }

      const totalCount = Number(totalCountResult?.[0]?.count) || 0;

      return {
        data: userMessages,
        totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
        userId,
      };
    }),
  getMySyncedMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, auth } = ctx;
      const { messageId } = input;
      const userId = auth.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const { data: userMessage, error: userMessageError } = await tryCatch(
        db
          .select()
          .from(messages)
          .where(and(eq(messages.userId, userId), eq(messages.id, messageId)))
          .limit(1)
      );

      if (userMessageError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch synced message",
        });
      }

      return userMessage[0];
    }),
  getMessagesLabels: protectedProcedure.query(async ({ ctx }) => {
    const { gmail } = ctx;

    const { data: labels, error: labelsError } = await tryCatch(
      gmail.users.labels.list({ userId: "me", prettyPrint: true })
    );

    if (labelsError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch message labels",
      });
    }

    return (
      labels.data.labels
        ?.filter((label) => label.labelListVisibility)
        .map((label) => ({
          label: label.name || "",
          value: label.id || "",
        })) || []
    );
  }),
});
