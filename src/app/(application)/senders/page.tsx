"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MailIcon, SearchIcon, UsersIcon } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { SenderGroup } from "~/features/messages/routers/messages.router";
import { useTRPC } from "~/lib/client/trpc/client";

export default function SendersPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );

  const getSendersGroupedQuery = useQuery({
    ...trpc.messages.getSendersGrouped.queryOptions(),
    select: (data) => data,
    placeholderData: keepPreviousData,
  });

  // Filter groups based on search
  const filteredGroups =
    getSendersGroupedQuery.data?.filter((group) => {
      if (!search) return true;

      const searchLower = search.toLowerCase();
      return (
        group.organizationName.toLowerCase().includes(searchLower) ||
        group.emails.some((email) =>
          email.email.toLowerCase().includes(searchLower)
        )
      );
    }) || [];

  const totalSenders =
    getSendersGroupedQuery.data?.reduce(
      (acc, group) => acc + group.emails.length,
      0
    ) || 0;

  const totalOrganizations = getSendersGroupedQuery.data?.length || 0;

  return (
    <div className="container mx-auto py-10 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Email Senders</h1>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UsersIcon className="h-4 w-4" />
            <span>{totalOrganizations} organizations</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MailIcon className="h-4 w-4" />
            <span>{totalSenders} unique senders</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search organizations or emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Loading State */}
      {getSendersGroupedQuery.isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {getSendersGroupedQuery.error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MailIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Failed to load senders
            </h3>
            <p className="text-muted-foreground text-center">
              {getSendersGroupedQuery.error.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!getSendersGroupedQuery.isLoading &&
        !getSendersGroupedQuery.error &&
        filteredGroups.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MailIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {search ? "No senders found" : "No senders yet"}
              </h3>
              <p className="text-muted-foreground text-center">
                {search
                  ? "Try adjusting your search terms or clearing the filter."
                  : "Sync your emails to see sender organizations."}
              </p>
            </CardContent>
          </Card>
        )}

      {/* Senders List */}
      <div className="grid gap-4">
        {filteredGroups.map((group: SenderGroup) => (
          <Card
            key={group.organizationName}
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MailIcon className="h-5 w-5 text-muted-foreground" />
                  <span>{group.organizationName}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {group.totalMessages} message
                  {group.totalMessages !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.emails.map((email) => (
                  <div
                    key={email.email}
                    className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-mono text-sm">{email.email}</span>
                      {email.latestDate && (
                        <span className="text-xs text-muted-foreground">
                          Last message:{" "}
                          {new Date(email.latestDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {email.messageCount}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results Footer */}
      {filteredGroups.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredGroups.length} organization
          {filteredGroups.length !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
        </div>
      )}
    </div>
  );
}
