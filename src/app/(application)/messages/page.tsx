"use client";

import {
  keepPreviousData,
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
import { useCallback, useEffect, useMemo } from "react";
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

  const handleSearchChange = useCallback(
    (value: string) => {
      setQueryStates({ search: value, page: 1 });
    },
    [setQueryStates]
  );

  const handleLabelsChange = useCallback(
    (newLabels: string[]) => {
      setQueryStates({ labels: newLabels, page: 1 });
    },
    [setQueryStates]
  );

  const handlePaginationChange = useCallback(
    (
      updater: PaginationState | ((old: PaginationState) => PaginationState)
    ) => {
      const newPagination =
        typeof updater === "function" ? updater(pagination) : updater;
      setQueryStates({
        page: newPagination.pageIndex + 1, // Convert back to 1-based
        pageSize: newPagination.pageSize,
      });
    },
    [pagination, setQueryStates]
  );

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

  const table = useDataTableDefaults({
    data: getMySyncedMessagesQuery.data?.data || [],
    columns,
  });

  table.setOptions((prev) => ({
    ...prev,
    manualPagination: true,
    onPaginationChange: handlePaginationChange,
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
      <DataTablePagination table={table} />
    </div>
  );
}
