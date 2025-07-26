"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { PaginationState } from "@tanstack/react-table";
import { XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [search, setSearch] = useState<string>("");
  const [labels, setLabels] = useState<string[]>([]);
  const debouncedSearch = useDebounceValue(search, 300);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    // Reset to first page when searching
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleLabelsChange = useCallback((newLabels: string[]) => {
    setLabels(newLabels);
    // Reset to first page when filtering
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

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
    onPaginationChange: setPagination,
    rowCount: getMySyncedMessagesQuery.data?.totalCount ?? 0,
    state: {
      ...prev.state,
      pagination,
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
              handleSearchChange("");
              handleLabelsChange([]);
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
