import { openai } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";
import { generateObject } from "ai";
import { and, arrayOverlaps, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { messages, senders } from "~/lib/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/trpc/trpc";
import { tryCatch } from "~/util/try-catch";
import { convertGmailMessageToMessage } from "./converter";

// Add type definitions for grouped senders
export type SenderGroup = {
  organizationName: string;
  emails: Array<{
    email: string;
    messageCount: number;
    latestDate: Date | null;
  }>;
  totalMessages: number;
};

// Helper function to extract organization name from email
function extractOrganizationName(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase();

  if (!domain) return email;

  // Handle common patterns
  let cleanDomain = domain;

  // Remove common prefixes
  cleanDomain = cleanDomain.replace(
    /^(mail|email|noreply|no-reply|alerts?)\./,
    ""
  );

  // Extract main domain from subdomains
  const subdomainMatch = cleanDomain.match(/^[^.]+\.([^.]+\.[^.]+)$/);
  if (subdomainMatch) {
    cleanDomain = subdomainMatch[1];
  }

  // Handle specific cases
  const specificRules: Record<string, string> = {
    "amazon.com": "Amazon",
    "amazonses.com": "Amazon",
    "amazon-corp.com": "Amazon",
    "google.com": "Google",
    "gmail.com": "Google",
    "microsoft.com": "Microsoft",
    "outlook.com": "Microsoft",
    "github.com": "GitHub",
    "linkedin.com": "LinkedIn",
    "chase.com": "Chase Bank",
    "jpmchase.com": "Chase Bank",
    "mcmap.chase.com": "Chase Bank",
  };

  if (specificRules[cleanDomain]) {
    return specificRules[cleanDomain];
  }

  // Convert domain to display name
  const mainName = cleanDomain.split(".")[0];
  return mainName.charAt(0).toUpperCase() + mainName.slice(1);
}

// AI-powered function to determine sender name from email address
async function determineSenderName(fromEmail: string): Promise<string> {
  try {
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        senderName: z
          .string()
          .describe(
            "The human-readable name or organization name for this email sender"
          ),
      }),
      prompt: `
        Analyze this email address and determine the most appropriate sender name: "${fromEmail}"
        
        Rules:
        1. If it's from a company/organization, use ONLY the company name (e.g., "GitHub", "Amazon", "LinkedIn")
        2. If it looks like a personal email (gmail, yahoo, etc.), try to extract a name from the username part if possible, or use the username
        3. Keep it simple - avoid departmental distinctions like "Support", "Billing", "Notifications"
        4. Make it human-readable and professional
        5. Avoid technical prefixes like "noreply-" or "support-"
        
        Examples:
        - "noreply@github.com" → "GitHub"
        - "support@stripe.com" → "Stripe"
        - "billing@stripe.com" → "Stripe"
        - "notifications@slack.com" → "Slack"
        - "hello@openai.com" → "OpenAI"
        - "john.doe@company.com" → "John Doe" (if identifiable) or "Company"
        
        Return a clean, simple organization or person name.
      `,
    });

    return result.object.senderName;
  } catch (error) {
    console.error("Failed to determine sender name with AI:", error);
    // Fallback to organization extraction
    return extractOrganizationName(fromEmail);
  }
}

// Helper function to get or create a sender
async function getOrCreateSender(
  db: typeof import("~/lib/server/db/drizzle").db,
  userId: string,
  fromEmail: string
): Promise<string> {
  // Use AI to determine sender name
  const senderName = await determineSenderName(fromEmail);

  // Check if a sender with this exact name already exists for this user
  const existingSender = await db
    .select()
    .from(senders)
    .where(and(eq(senders.userId, userId), eq(senders.name, senderName)))
    .limit(1);

  if (existingSender.length > 0) {
    // Sender exists, return existing sender ID
    return existingSender[0].id;
  }

  // Sender doesn't exist, try to create new one
  try {
    const [newSender] = await db
      .insert(senders)
      .values({
        userId,
        name: senderName,
      })
      .returning();

    return newSender.id;
  } catch (error) {
    // If unique constraint violation, another process created the sender
    // Look it up again and return the existing one
    const retryExistingSender = await db
      .select()
      .from(senders)
      .where(and(eq(senders.userId, userId), eq(senders.name, senderName)))
      .limit(1);

    if (retryExistingSender.length > 0) {
      return retryExistingSender[0].id;
    }

    // If still not found, re-throw the original error
    throw error;
  }
}

// Helper function to group senders by organization
function groupSendersByOrganization(
  senders: Array<{
    from: string;
    messageCount: number;
    latestDate: Date | null;
  }>
): SenderGroup[] {
  const groups = new Map<string, SenderGroup>();

  for (const sender of senders) {
    const orgName = extractOrganizationName(sender.from);

    if (!groups.has(orgName)) {
      groups.set(orgName, {
        organizationName: orgName,
        emails: [],
        totalMessages: 0,
      });
    }

    const group = groups.get(orgName)!;
    const messageCount = Number(sender.messageCount); // Ensure it's a number
    group.emails.push({
      email: sender.from,
      messageCount: messageCount,
      latestDate: sender.latestDate,
    });
    group.totalMessages += messageCount;
  }

  // Sort groups by total message count (descending)
  return Array.from(groups.values())
    .sort((a, b) => b.totalMessages - a.totalMessages)
    .map((group) => ({
      ...group,
      emails: group.emails.sort((a, b) => b.messageCount - a.messageCount),
    }));
}

export const messagesRouter = createTRPCRouter({
  getMySyncedMessages: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        labels: z.array(z.string()).optional(),
        sortBy: z.enum(["date", "subject", "from"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, auth } = ctx;
      const { limit, offset, search, labels, sortBy, sortOrder } = input;
      const userId = auth.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Build the where conditions
      const whereConditions = [eq(messages.userId, userId)];

      if (search && search.trim().length > 0) {
        whereConditions.push(ilike(messages.subject, `%${search.trim()}%`));
      }

      if (labels && labels.length > 0) {
        // Check if message has any of the selected labels (overlapping arrays)
        whereConditions.push(arrayOverlaps(messages.labelIds, labels));
      }

      // Build the query with optional sorting
      const query = db
        .select()
        .from(messages)
        .where(and(...whereConditions));

      // Apply sorting only if both sortBy and sortOrder are provided
      if (sortBy && sortOrder) {
        const orderByColumn = messages[sortBy];
        const orderByDirection = sortOrder === "asc" ? asc : desc;
        query.orderBy(orderByDirection(orderByColumn));
      }

      const { data: userMessages, error: userMessagesError } = await tryCatch(
        query.limit(limit).offset(offset)
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
          .where(and(...whereConditions))
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
  getSendersGrouped: protectedProcedure.query(async ({ ctx }) => {
    const { db, auth } = ctx;
    const userId = auth.userId;

    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    // Get all unique senders with message counts and latest dates
    const { data: sendersData, error } = await tryCatch(
      db
        .select({
          from: messages.from,
          messageCount: sql<number>`count(*)::integer`,
          latestDate: sql<Date | null>`max(${messages.date})`,
        })
        .from(messages)
        .where(eq(messages.userId, userId))
        .groupBy(messages.from)
        .orderBy(desc(sql`count(*)`))
    );

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch senders",
      });
    }

    // Group senders by organization
    return groupSendersByOrganization(sendersData);
  }),
  syncGmailWithMessages: protectedProcedure.mutation(async ({ ctx }) => {
    const { db, gmail, auth } = ctx;
    const userId = auth.userId;

    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    let totalSynced = 0;
    let pageToken: string | undefined;

    do {
      // Fetch messages from Gmail API with pagination
      const { data: listResponse, error: listError } = await tryCatch(
        gmail.users.messages.list({
          userId: "me",
          maxResults: 100,
          includeSpamTrash: false, // Changed: Don't include spam/trash to avoid inflated counts
          pageToken,
        })
      );

      if (listError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch messages from Gmail",
        });
      }

      const messageIds = listResponse.data.messages || [];

      if (messageIds.length === 0) {
        break;
      }

      // Fetch full message details for each message ID
      const messagePromises = messageIds.map(async (msgRef) => {
        const { data: messageResponse, error: messageError } = await tryCatch(
          gmail.users.messages.get({
            userId: "me",
            id: msgRef.id!,
          })
        );

        if (messageError) {
          console.error(`Failed to fetch message ${msgRef.id}:`, messageError);
          return null;
        }

        const convertedMessage = convertGmailMessageToMessage(
          userId,
          messageResponse.data
        );

        // Get or create sender using AI
        const senderId = await getOrCreateSender(
          db,
          userId,
          convertedMessage.from
        );

        return {
          ...convertedMessage,
          senderId,
        };
      });

      const messagesData = await Promise.all(messagePromises);
      const validMessages = messagesData.filter(
        (msg): msg is NonNullable<typeof msg> => msg !== null
      );

      // Upsert messages into database
      if (validMessages.length > 0) {
        const { error: upsertError } = await tryCatch(
          db
            .insert(messages)
            .values(validMessages)
            .onConflictDoUpdate({
              target: messages.id,
              set: {
                body: sql.raw("excluded.body"),
                date: sql.raw("excluded.date"),
                from: sql.raw("excluded.from"),
                labelIds: sql.raw("excluded.label_ids"),
                snippet: sql.raw("excluded.snippet"),
                subject: sql.raw("excluded.subject"),
                to: sql.raw("excluded.to"),
                senderId: sql.raw("excluded.sender_id"),
              },
            })
        );
        if (upsertError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save messages to database",
          });
        }

        totalSynced += validMessages.length;
      }

      // Set pageToken for next iteration
      pageToken = listResponse.data.nextPageToken || undefined;
    } while (pageToken);

    return {
      success: true,
      message: "Gmail messages synced successfully",
      totalSynced,
    };
  }),
});
