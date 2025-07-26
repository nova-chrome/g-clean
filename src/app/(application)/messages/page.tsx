"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { PaginationState } from "@tanstack/react-table";
import { XIcon } from "lucide-react";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { DataTable } from "~/components/ui/data-table/data-table";
import { DataTableFacetedFilter } from "~/components/ui/data-table/data-table-faceted-filter";
import { DataTablePagination } from "~/components/ui/data-table/data-table-pagination";
import { useDataTableDefaults } from "~/components/ui/data-table/use-data-table-defaults";
import { Input } from "~/components/ui/input";
import { columns } from "~/features/messages/components/messages-table/columns";
import { useDebounceValue } from "~/hooks/use-debounce-value";
import { useTRPC } from "~/lib/client/trpc/client";

export default function MessagesPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [{ search, labels, page, pageSize }, setQueryStates] = useQueryStates(
    {
      search: parseAsString.withDefault(""),
      labels: parseAsArrayOf(parseAsString).withDefault([]),
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(10),
    },
    {
      history: "push",
    }
  );

  const debouncedSearch = useDebounceValue(search, 300);

  // Convert 1-based page to 0-based pageIndex for TanStack Table
  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: page - 1,
      pageSize,
    }),
    [page, pageSize]
  );

  const handleSearchChange = (value: string) => {
    setQueryStates({ search: value, page: 1 });
  };

  const handleLabelsChange = (newLabels: string[]) => {
    setQueryStates({ labels: newLabels, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setQueryStates({ page: newPage });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setQueryStates({ pageSize: newPageSize, page: 1 });
  };

  const getMySyncedMessagesQuery = useQuery({
    ...trpc.messages.getMySyncedMessages.queryOptions({
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: debouncedSearch,
      ...(labels.length > 0 && { labels }),
    }),
    select: (data) => data,
    placeholderData: keepPreviousData,
  });

  const getGmailLabelsQuery = useQuery(
    trpc.messages.getMessagesLabels.queryOptions()
  );

  const syncGmailMutation = useMutation(
    trpc.messages.syncGmailWithMessages.mutationOptions({
      onMutate: () => {
        toast.info("Starting Gmail sync...", {
          description: "This may take a few moments",
        });
      },
      onSuccess: (data) => {
        toast.success("Gmail sync completed!", {
          description: `${data.totalSynced} messages synced.`,
        });

        // Invalidate and refetch messages
        void queryClient.invalidateQueries(
          trpc.messages.getMySyncedMessages.queryFilter()
        );
      },
      onError: (error) => {
        toast.error("Sync failed", {
          description: error.message,
        });
      },
    })
  );

  const table = useDataTableDefaults({
    data: getMySyncedMessagesQuery.data?.data || [],
    columns,
  });

  table.setOptions((prev) => ({
    ...prev,
    manualPagination: true,
    rowCount: getMySyncedMessagesQuery.data?.totalCount ?? 0,
    state: {
      ...prev.state,
      pagination,
      columnFilters: [
        ...(labels.length > 0 ? [{ id: "labels", value: labels }] : []),
      ],
    },
  }));

  useEffect(() => {
    const nextPageOffset = (pagination.pageIndex + 1) * pagination.pageSize;

    const totalCount = getMySyncedMessagesQuery.data?.totalCount ?? 0;
    const hasNextPage = nextPageOffset < totalCount;

    if (hasNextPage) {
      queryClient.prefetchQuery({
        ...trpc.messages.getMySyncedMessages.queryOptions({
          limit: pagination.pageSize,
          offset: nextPageOffset,
          search: debouncedSearch,
          ...(labels.length > 0 && { labels }),
        }),
      });
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    debouncedSearch,
    labels,
    getMySyncedMessagesQuery.data?.totalCount,
    queryClient,
    trpc.messages.getMySyncedMessages,
  ]);

  return (
    <div className="container mx-auto py-10 space-y-3">
      <DataTable
        table={table}
        isLoading={getMySyncedMessagesQuery.isLoading}
        isFetching={getMySyncedMessagesQuery.isFetching}
        onSyncMailbox={() => syncGmailMutation.mutate()}
        isSyncing={syncGmailMutation.isPending}
      >
        <div className="relative max-w-sm">
          <Input
            placeholder="Filter subjects..."
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pr-8"
          />
        </div>

        {table.getColumn("labels") && (
          <DataTableFacetedFilter
            column={table.getColumn("labels")}
            title="Labels"
            options={getGmailLabelsQuery.data || []}
            onFilterChange={handleLabelsChange}
          />
        )}

        {(table.getState().columnFilters.length > 0 || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              table.resetColumnFilters();
              setQueryStates({
                search: "",
                labels: [],
                page: 1,
              });
            }}
          >
            Reset
            <XIcon />
          </Button>
        )}
      </DataTable>
      <DataTablePagination
        table={table}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
