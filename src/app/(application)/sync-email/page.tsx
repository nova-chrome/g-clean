"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useTRPC } from "~/lib/client/trpc/client";

interface SyncProgress {
  totalSynced: number;
  totalEstimated: number;
  isComplete: boolean;
  currentBatch: number;
}

export default function SyncEmailPage() {
  const trpc = useTRPC();
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    totalSynced: 0,
    totalEstimated: 0,
    isComplete: false,
    currentBatch: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const getSyncStatusQuery = useQuery(trpc.sync.getSyncStatus.queryOptions());
  const getGmailProfileQuery = useQuery(
    trpc.sync.getGmailProfile.queryOptions()
  );

  const syncEmailsMutation = useMutation(
    trpc.sync.syncEmails.mutationOptions()
  );

  const syncAllEmails = async () => {
    setIsManualSyncing(true);
    setError(null);
    setSyncProgress({
      totalSynced: 0,
      totalEstimated: 0,
      isComplete: false,
      currentBatch: 0,
    });

    let nextPageToken: string | null = null;
    let totalSynced = 0;
    let accurateTotal = 0; // We'll get this from Gmail profile
    let batchCount = 0;

    let retryCount = 0;
    const maxRetries = 3;

    try {
      // STEP 1: Get accurate total from Gmail profile first
      console.log(
        "[FRONTEND] Getting accurate message count from Gmail profile..."
      );

      try {
        // Use the profile data that's already loaded or refetch it
        let profileData = getGmailProfileQuery.data;
        if (!profileData) {
          console.log("[FRONTEND] Profile not loaded, fetching...");
          await getGmailProfileQuery.refetch();
          profileData = getGmailProfileQuery.data;
        }

        accurateTotal = profileData?.messagesTotal || 0;
        console.log(
          `[FRONTEND] Got accurate total from profile: ${accurateTotal} messages`
        );

        // Update progress with accurate total immediately
        setSyncProgress({
          totalSynced: 0,
          totalEstimated: accurateTotal,
          isComplete: false,
          currentBatch: 0,
        });
      } catch (profileError) {
        console.error(
          "[FRONTEND] Failed to get Gmail profile, will use API estimates:",
          profileError
        );
        accurateTotal = 0; // Will fallback to API estimates per batch
      }

      // STEP 2: Start paginated sync with accurate total
      do {
        console.log(
          `Syncing batch ${batchCount + 1}${
            nextPageToken
              ? ` with token: ${nextPageToken.substring(0, 20)}...`
              : " (initial batch)"
          }`
        );

        try {
          console.log(
            `[FRONTEND] Starting batch ${batchCount + 1} with token: ${
              nextPageToken ? nextPageToken.substring(0, 20) + "..." : "NONE"
            }`
          );

          const result = await syncEmailsMutation.mutateAsync({
            batchSize: debugMode ? 10 : 100, // Small batch for debugging, larger for efficiency
            pageToken: nextPageToken || undefined,
            debugMode: debugMode, // Pass debug mode to backend
            accurateTotal: accurateTotal || undefined, // Pass accurate total to backend
          });

          totalSynced += result.syncedCount;
          // Use the accurate total if we have it, otherwise fall back to API result
          const totalForProgress = accurateTotal || result.totalCount;
          batchCount += 1;
          nextPageToken = result.nextPageToken || null;
          retryCount = 0; // Reset retry count on success

          console.log(
            `[FRONTEND] Batch ${batchCount} result: syncedCount=${
              result.syncedCount
            }, hasMore=${result.hasMore}, nextPageToken=${
              result.nextPageToken
                ? result.nextPageToken.substring(0, 20) + "..."
                : "NONE"
            }, usingTotal=${totalForProgress} (accurate=${!!accurateTotal})`
          );

          // Update progress after each batch
          setSyncProgress({
            totalSynced,
            totalEstimated: totalForProgress,
            currentBatch: batchCount,
            isComplete: !result.hasMore,
          });

          console.log(
            `Batch ${batchCount} complete: processed ${result.syncedCount} messages (${totalSynced} total)`
          );

          // Add a small delay to prevent overwhelming the API
          if (result.hasMore) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (batchError) {
          console.error(`Batch ${batchCount + 1} failed:`, batchError);
          retryCount++;

          if (retryCount <= maxRetries) {
            console.log(
              `Retrying batch ${
                batchCount + 1
              } (attempt ${retryCount}/${maxRetries})`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * retryCount)
            ); // Exponential backoff
            continue; // Retry the same batch
          } else {
            throw batchError; // Give up after max retries
          }
        }
      } while (nextPageToken); // Continue while there's a next page token

      console.log(
        `Sync complete! Total processed: ${totalSynced} messages across ${batchCount} batches`
      );
    } catch (error) {
      console.error("Sync failed:", error);
      setError(
        `Failed to sync emails: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleStartSync = async () => {
    await syncAllEmails();
  };

  const handleCheckGmailProfile = async () => {
    try {
      setDebugMode(true); // Enable debug mode for enhanced logging

      alert(`
Gmail API Diagnostic Tool

Enhanced debugging is now ENABLED.

Click "Start Email Sync" and check your browser console for:
• [DEBUG] Enhanced Gmail API diagnostics
• [SYNC] PAGINATION ANALYSIS logs  
• [SYNC] MAILBOX ANALYSIS logs
• [LIMITS] Detailed API response information

The sync will use a small batch size (10) for testing with full diagnostic logging.
      `);

      console.log("=== GMAIL API DIAGNOSTIC MODE ENABLED ===");
      console.log("Enhanced logging is now active for the next sync.");
      console.log("Watch for [DEBUG], [SYNC], [LIMITS] log entries");
    } catch (error) {
      console.error("Failed to start diagnostic:", error);
    }
  };

  const isLoadingSync = syncEmailsMutation.isPending || isManualSyncing;
  const progressPercentage =
    syncProgress.totalEstimated > 0
      ? Math.round(
          (syncProgress.totalSynced / syncProgress.totalEstimated) * 100
        )
      : 0;

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Mail className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Sync</h1>
          <p className="text-gray-600">
            Sync all your Gmail messages to the local database for faster access
            and analysis.
          </p>

          {/* User Account Display */}
          {getGmailProfileQuery.data?.emailAddress && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-gray-100 rounded-full">
              <Mail className="h-4 w-4 text-gray-600 mr-2" />
              <span className="text-sm text-gray-700">
                Syncing:{" "}
                <strong>{getGmailProfileQuery.data.emailAddress}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Current Status</h2>
            <Button
              onClick={() => {
                getSyncStatusQuery.refetch();
                getGmailProfileQuery.refetch();
              }}
              variant="outline"
              size="sm"
              disabled={isLoadingSync}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleCheckGmailProfile}
              variant="outline"
              size="sm"
              disabled={isLoadingSync}
              className="ml-2"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              API Diagnostic
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Total Synced (Local DB)
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {getSyncStatusQuery.data?.totalSyncedMessages || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-purple-900">
                    Total in Gmail
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {getGmailProfileQuery.data?.messagesTotal || "Loading..."}
                  </p>
                </div>
              </div>
            </div>

            {syncProgress.totalEstimated > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Sync Progress
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {progressPercentage}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Start Email Sync</h2>

          {!isLoadingSync && !syncProgress.isComplete && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Click the button below to start syncing your Gmail messages.
                This process will fetch all your emails and save them locally.
              </p>

              {getGmailProfileQuery.data?.messagesTotal && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600 mr-2" />
                    <p className="text-sm text-blue-800">
                      <strong>{getGmailProfileQuery.data.messagesTotal}</strong>{" "}
                      messages found in your Gmail account (
                      {getGmailProfileQuery.data.emailAddress})
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={handleStartSync}
                size="lg"
                className="px-8 py-3"
                disabled={isLoadingSync}
              >
                <Mail className="h-5 w-5 mr-2" />
                Start Email Sync
              </Button>
            </div>
          )}

          {isLoadingSync && (
            <div className="text-center">
              <div className="mb-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-lg font-medium text-gray-900">
                  Syncing emails...
                </p>
                <p className="text-sm text-gray-600">
                  Batch {syncProgress.currentBatch} - Please don&apos;t close
                  this page
                </p>
              </div>

              {syncProgress.totalEstimated > 0 && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {syncProgress.totalSynced} of {syncProgress.totalEstimated}{" "}
                    messages synced/updated ({progressPercentage}%)
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">
                    Large mailboxes may take several minutes to sync completely.
                  </p>
                </div>
              </div>
            </div>
          )}

          {syncProgress.isComplete && (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-900 mb-2">
                Sync Complete!
              </h3>
              <p className="text-gray-600 mb-4">
                Successfully processed {syncProgress.totalSynced} emails to your
                local database.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-green-900">
                      Total Processed:
                    </p>
                    <p className="text-green-700">
                      {syncProgress.totalSynced} messages
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-green-900">
                      Batches Processed:
                    </p>
                    <p className="text-green-700">
                      {syncProgress.currentBatch}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleStartSync}
                variant="outline"
                className="mr-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Again
              </Button>
              <Button
                onClick={() => {
                  getSyncStatusQuery.refetch();
                  getGmailProfileQuery.refetch();
                }}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          )}

          {(error || syncEmailsMutation.isError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <p className="font-medium text-red-900">Sync Failed</p>
                  <p className="text-sm text-red-700">
                    {error ||
                      "There was an error syncing your emails. Please try again."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
