import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { convertGmailMessageToMessage } from "~/features/messages/routers/converter";
import { messages } from "~/lib/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/trpc/trpc";
import { tryCatch } from "~/util/try-catch";

export const syncRouter = createTRPCRouter({
  syncEmails: protectedProcedure
    .input(
      z.object({
        batchSize: z.number().min(1).max(500).default(100),
        pageToken: z.string().optional(),
        debugMode: z.boolean().optional().default(false),
        accurateTotal: z.number().optional(), // Pass accurate total from profile
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { gmail, db, auth } = ctx;
      const { batchSize, pageToken, debugMode, accurateTotal } = input;

      // Get the current user ID
      const userId = auth.userId;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      try {
        console.log(
          `[SYNC] Starting batch for user ${userId} with pageToken: ${
            pageToken || "INITIAL"
          }, batchSize: ${batchSize}, debugMode: ${debugMode}, accurateTotal: ${accurateTotal}`
        );
        console.log(
          `[SYNC] Validated maxResults: ${Math.max(
            1,
            Math.min(batchSize, 500)
          )}`
        );

        // Get accurate total from profile if not provided (for first batch)
        let realTotalMessages = accurateTotal;
        if (!realTotalMessages && !pageToken) {
          console.log("[SYNC] Getting accurate message count from profile...");
          const { data: profileCheck, error: profileCheckError } =
            await tryCatch(gmail.users.getProfile({ userId: "me" }));

          if (profileCheckError) {
            console.error(
              "[SYNC] Failed to get profile for accurate count:",
              profileCheckError
            );
            realTotalMessages = 0; // Fallback - will use API estimate
          } else {
            realTotalMessages = profileCheck?.data?.messagesTotal || 0;
            console.log(
              `[SYNC] Got accurate total from profile: ${realTotalMessages}`
            );
          }
        }

        // Enhanced debugging when debugMode is enabled
        if (debugMode) {
          console.log("[DEBUG] Running enhanced Gmail API diagnostics...");

          // Check profile first if we haven't already
          if (!realTotalMessages) {
            const { data: profileCheck, error: profileCheckError } =
              await tryCatch(gmail.users.getProfile({ userId: "me" }));

            if (profileCheckError) {
              console.error(
                "[DEBUG] Profile access failed:",
                profileCheckError
              );
            } else {
              console.log("[DEBUG] Profile access successful:", {
                email: profileCheck?.data?.emailAddress,
                totalMessages: profileCheck?.data?.messagesTotal,
                totalThreads: profileCheck?.data?.threadsTotal,
              });
              realTotalMessages = profileCheck?.data?.messagesTotal || 0;
            }
          }
        }

        // Get messages list with pagination - minimal parameters
        const listParams: {
          userId: string;
          maxResults: number;
          pageToken?: string;
        } = {
          userId: "me",
          maxResults: Math.max(1, Math.min(batchSize, 500)), // Ensure valid range 1-500
        };

        // Only add pageToken if it exists
        if (pageToken) {
          listParams.pageToken = pageToken;
        }

        console.log(
          "[SYNC] API call parameters:",
          JSON.stringify(listParams, null, 2)
        );

        const { data: messagesList, error: listError } = await tryCatch(
          gmail.users.messages.list(listParams)
        );

        if (listError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch messages list: ${listError.message}`,
          });
        }

        console.log(
          "[SYNC] Retrieved messages list:",
          JSON.stringify(messagesList?.data, null, 2)
        );
        console.log("[SYNC] Raw API response structure:", {
          messages: messagesList?.data?.messages?.length || 0,
          nextPageToken: messagesList?.data?.nextPageToken,
          resultSizeEstimate: messagesList?.data?.resultSizeEstimate,
          hasNextPageToken: !!messagesList?.data?.nextPageToken,
        });

        // Critical debugging: Why no nextPageToken?
        const actualMessageCount = messagesList?.data?.messages?.length || 0;
        const estimatedTotal = messagesList?.data?.resultSizeEstimate || 0;
        const requestedMax = Math.max(1, Math.min(batchSize, 500));

        console.log("[SYNC] PAGINATION ANALYSIS:", {
          requestedMaxResults: requestedMax,
          actualMessagesReturned: actualMessageCount,
          estimatedTotalMessages: estimatedTotal,
          shouldHaveMorePages: estimatedTotal > requestedMax,
          actuallyHasNextToken: !!messagesList?.data?.nextPageToken,
          possibleIssue:
            estimatedTotal <= requestedMax
              ? "Total messages <= maxResults"
              : actualMessageCount < requestedMax
              ? "Returned less than requested"
              : !messagesList?.data?.nextPageToken
              ? "API not returning nextPageToken"
              : "Unknown",
        });

        const gmailMessages = messagesList?.data?.messages || [];
        const nextPageToken = messagesList?.data?.nextPageToken;
        const apiEstimate = messagesList?.data?.resultSizeEstimate || 0;
        const totalCount = realTotalMessages || apiEstimate; // Use accurate total if available
        const hasMore = !!nextPageToken;

        // Enhanced logging with both estimates
        console.log("[SYNC] ESTIMATE COMPARISON:", {
          accurateTotalFromProfile: realTotalMessages,
          apiEstimateFromList: apiEstimate,
          usingForProgress: totalCount,
          differenceIfBoth:
            realTotalMessages && apiEstimate
              ? Math.abs(realTotalMessages - apiEstimate)
              : "N/A",
          recommendation: realTotalMessages
            ? "Using accurate profile count"
            : "Falling back to API estimate",
        });

        // Additional check: Let's see if we can get more info about the mailbox
        console.log("[SYNC] MAILBOX ANALYSIS:", {
          isFirstBatch: !pageToken,
          accurateTotalFromProfile: realTotalMessages,
          totalEstimateFromAPI: apiEstimate,
          usingTotalForProgress: totalCount,
          requestedBatchSize: requestedMax,
          actuallyGotMessages: actualMessageCount,
          conclusion:
            actualMessageCount < requestedMax && !nextPageToken
              ? "End of mailbox reached - pagination complete"
              : actualMessageCount === requestedMax && nextPageToken
              ? "Pagination working correctly - more batches available"
              : totalCount <= 10
              ? "Very small mailbox (≤10 emails)"
              : totalCount <= 50
              ? "Small mailbox (≤50 emails)"
              : totalCount <= 100
              ? "Medium mailbox (≤100 emails)"
              : "Large mailbox - pagination should continue",
        });

        console.log(
          `[SYNC] Retrieved ${gmailMessages.length} message IDs from Gmail`
        );
        console.log(`[SYNC] Total count estimate: ${totalCount}`);
        console.log(
          `[SYNC] Next page token: ${
            nextPageToken ? nextPageToken.substring(0, 20) + "..." : "NONE"
          }`
        );
        console.log(`[SYNC] Has more pages: ${hasMore}`);

        if (gmailMessages.length === 0) {
          console.log(
            `[SYNC] No messages found in this batch, ending pagination`
          );
          return {
            syncedCount: 0,
            totalCount: 0,
            nextPageToken: null,
            hasMore: false,
          };
        }

        // Fetch full message details
        const fullMessages = await Promise.all(
          gmailMessages.map(async (message) => {
            const { data: fullMessage, error: messageError } = await tryCatch(
              gmail.users.messages.get({
                userId: "me",
                id: message.id!,
              })
            );

            if (messageError) {
              console.error(
                `Failed to fetch message ${message.id}:`,
                messageError
              );
              return null;
            }

            return {
              gmailId: message.id!,
              ...convertGmailMessageToMessage(fullMessage.data),
            };
          })
        );

        const validMessages = fullMessages.filter(Boolean);

        if (validMessages.length === 0) {
          console.log(
            `[SYNC] No valid messages after filtering, but continuing pagination`
          );
          return {
            syncedCount: 0,
            totalCount,
            nextPageToken,
            hasMore,
          };
        }

        // Prepare all valid messages for upsert (insert or update)
        const messagesToUpsert = validMessages
          .filter((msg) => msg?.id && msg?.body && msg?.from) // Ensure required fields exist
          .map((msg) => ({
            id: msg!.id!,
            userId: userId, // Associate with current user
            body: msg!.body,
            date: msg!.date || null,
            from: msg!.from,
            labelIds: msg!.labelIds || null,
            snippet: msg!.snippet || null,
            subject: msg!.subject || null,
            to: msg!.to || null,
          }));

        let syncedCount = 0;

        console.log(
          `[SYNC] Attempting to upsert ${messagesToUpsert.length} messages`
        );

        // Upsert messages (insert new ones, update existing ones)
        if (messagesToUpsert.length > 0) {
          await db
            .insert(messages)
            .values(messagesToUpsert)
            .onConflictDoUpdate({
              target: messages.id,
              set: {
                userId: sql`excluded.user_id`,
                body: sql`excluded.body`,
                date: sql`excluded.date`,
                from: sql`excluded.from`,
                labelIds: sql`excluded.label_ids`,
                snippet: sql`excluded.snippet`,
                subject: sql`excluded.subject`,
                to: sql`excluded.to`,
              },
            });

          syncedCount = messagesToUpsert.length;
          console.log(`[SYNC] Successfully upserted ${syncedCount} messages`);
        }

        console.log(
          `[SYNC] Batch complete. Returning: syncedCount=${syncedCount}, totalCount=${totalCount}, hasMore=${hasMore}`
        );

        return {
          syncedCount,
          totalCount,
          nextPageToken,
          hasMore,
        };
      } catch (error) {
        console.error("Sync error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync emails",
        });
      }
    }),

  checkGmailLimits: protectedProcedure.query(async ({ ctx }) => {
    const { gmail } = ctx;

    try {
      console.log("[LIMITS] Starting Gmail API limitations check...");

      // Test 1: Check if we can access the profile
      const { data: profile, error: profileError } = await tryCatch(
        gmail.users.getProfile({ userId: "me" })
      );

      if (profileError) {
        return {
          error: "Cannot access Gmail profile",
          details: profileError.message,
          likely_cause: "OAuth scope issue or API disabled",
        };
      }

      // Test 2: Try a simple messages list call
      const { data: simpleList, error: listError } = await tryCatch(
        gmail.users.messages.list({
          userId: "me",
          maxResults: 1,
        })
      );

      if (listError) {
        return {
          error: "Cannot list messages",
          details: String(listError),
          likely_cause: "Insufficient permissions or API quota exceeded",
        };
      }

      // Test 3: Check what scopes we actually have by trying different operations
      const tests = [];

      // Test reading labels
      const { data: labels, error: labelsError } = await tryCatch(
        gmail.users.labels.list({ userId: "me" })
      );
      console.log("[LIMITS] Labels found:", labels?.data?.labels?.length || 0);

      tests.push({
        test: "labels.list",
        success: !labelsError,
        error: labelsError ? String(labelsError) : null,
        scope_needed: "https://www.googleapis.com/auth/gmail.labels",
      });

      // Test reading messages (different scope)
      console.log(
        "[LIMITS] Simple list found:",
        simpleList?.data?.messages?.length || 0
      );
      tests.push({
        test: "messages.list",
        success: !listError,
        error: listError ? String(listError) : null,
        scope_needed: "https://www.googleapis.com/auth/gmail.readonly",
      });

      // Test 4: Try with different query parameters to see what's allowed
      const { data: allMessages, error: allError } = await tryCatch(
        gmail.users.messages.list({
          userId: "me",
          maxResults: 5,
          includeSpamTrash: true,
          q: "", // Empty query to get all messages
        })
      );

      const { data: inboxOnly, error: inboxError } = await tryCatch(
        gmail.users.messages.list({
          userId: "me",
          maxResults: 5,
          q: "in:inbox",
        })
      );

      console.log("[LIMITS] Profile data:", {
        emailAddress: profile?.data?.emailAddress,
        messagesTotal: profile?.data?.messagesTotal,
        threadsTotal: profile?.data?.threadsTotal,
      });

      console.log("[LIMITS] All messages test:", {
        count: allMessages?.data?.messages?.length || 0,
        estimated: allMessages?.data?.resultSizeEstimate || 0,
        hasNextPage: !!allMessages?.data?.nextPageToken,
        error: allError?.message,
      });

      console.log("[LIMITS] Inbox only test:", {
        count: inboxOnly?.data?.messages?.length || 0,
        estimated: inboxOnly?.data?.resultSizeEstimate || 0,
        hasNextPage: !!inboxOnly?.data?.nextPageToken,
        error: inboxError?.message,
      });

      return {
        success: true,
        profile: {
          emailAddress: profile?.data?.emailAddress,
          messagesTotal: profile?.data?.messagesTotal,
          threadsTotal: profile?.data?.threadsTotal,
          historyId: profile?.data?.historyId,
        },
        quotaTests: tests,
        messageTests: {
          allMessages: {
            count: allMessages?.data?.messages?.length || 0,
            estimated: allMessages?.data?.resultSizeEstimate || 0,
            hasNextPage: !!allMessages?.data?.nextPageToken,
            error: allError?.message,
          },
          inboxOnly: {
            count: inboxOnly?.data?.messages?.length || 0,
            estimated: inboxOnly?.data?.resultSizeEstimate || 0,
            hasNextPage: !!inboxOnly?.data?.nextPageToken,
            error: inboxError?.message,
          },
        },
        diagnosis: {
          total_messages_in_account: profile?.data?.messagesTotal || 0,
          api_can_see_all: !allError,
          api_can_see_inbox: !inboxError,
          likely_limitation:
            profile?.data?.messagesTotal !==
            allMessages?.data?.resultSizeEstimate
              ? "API sees different count than profile - possible scope limitation"
              : "No obvious limitations detected",
        },
      };
    } catch (error) {
      console.error("[LIMITS] Error during limits check:", error);
      return {
        error: "Failed to check Gmail limits",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  checkOAuthScopes: protectedProcedure.query(async ({ ctx }) => {
    try {
      console.log("[SCOPES] Checking OAuth scopes...");

      // Try to access different Gmail API endpoints to test scopes
      const scopeTests = [];

      // Test gmail.readonly scope
      const { error: readError } = await tryCatch(
        ctx.gmail.users.messages.list({ userId: "me", maxResults: 1 })
      );
      scopeTests.push({
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        endpoint: "messages.list",
        hasAccess: !readError,
        error: readError?.message,
      });

      // Test gmail.modify scope
      const { error: labelsError } = await tryCatch(
        ctx.gmail.users.labels.list({ userId: "me" })
      );
      scopeTests.push({
        scope: "https://www.googleapis.com/auth/gmail.modify",
        endpoint: "labels.list",
        hasAccess: !labelsError,
        error: labelsError?.message,
      });

      // Test profile access
      const { error: profileError } = await tryCatch(
        ctx.gmail.users.getProfile({ userId: "me" })
      );
      scopeTests.push({
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        endpoint: "users.getProfile",
        hasAccess: !profileError,
        error: profileError?.message,
      });

      console.log("[SCOPES] Scope test results:", scopeTests);

      return {
        scopeTests,
        recommendation: readError
          ? "Missing gmail.readonly scope - check your OAuth configuration"
          : "Basic scopes OK - issue may be elsewhere",
      };
    } catch (error) {
      console.error("[SCOPES] Error during scope check:", error);
      return {
        error: "Failed to check OAuth scopes",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const { db, auth } = ctx;

    try {
      const userId = auth.userId;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const totalMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.userId, userId));

      return {
        totalSyncedMessages: totalMessages.length,
        userId: userId,
      };
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get sync status",
      });
    }
  }),

  getGmailProfile: protectedProcedure.query(async ({ ctx }) => {
    const { gmail } = ctx;

    try {
      console.log("[PROFILE] Getting Gmail profile information...");

      const { data: profile, error: profileError } = await tryCatch(
        gmail.users.getProfile({ userId: "me" })
      );

      if (profileError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch Gmail profile: ${profileError.message}`,
        });
      }

      console.log(
        "[PROFILE] Gmail profile data:",
        JSON.stringify(profile?.data, null, 2)
      );

      // Also try to get labels to see what we have access to
      const { data: labels, error: labelsError } = await tryCatch(
        gmail.users.labels.list({ userId: "me" })
      );

      if (labelsError) {
        console.error("[PROFILE] Failed to fetch labels:", labelsError);
      }

      console.log(
        "[PROFILE] Available labels:",
        labels?.data?.labels?.map((l) => l.name)
      );

      return {
        emailAddress: profile?.data?.emailAddress,
        messagesTotal: profile?.data?.messagesTotal,
        threadsTotal: profile?.data?.threadsTotal,
        historyId: profile?.data?.historyId,
        availableLabels:
          labels?.data?.labels?.map((l) => ({
            id: l.id,
            name: l.name,
            messagesTotal: l.messagesTotal,
            threadsTotal: l.threadsTotal,
          })) || [],
      };
    } catch (error) {
      console.error("Profile error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get Gmail profile",
      });
    }
  }),
});
