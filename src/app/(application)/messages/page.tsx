"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import { DataTable } from "~/components/ui/data-table/data-table";
import { DataTablePagination } from "~/components/ui/data-table/data-table-pagination";
import { useDataTableDefaults } from "~/components/ui/data-table/use-data-table-defaults";
import { columns } from "~/features/messages/components/messages-table/columns";
import { DashboardFilters } from "~/features/messages/components/messages-table/dashboard-filters";
import { useTRPC } from "~/lib/client/trpc/client";

export default function MessagesPage() {
  const trpc = useTRPC();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, //initial page index
    pageSize: 10, //default page size
  });

  const getMySyncedMessagesQuery = useQuery({
    ...trpc.messages.getMySyncedMessages.queryOptions({
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
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
    // manual pagination
    manualPagination: true,
    onPaginationChange: setPagination,
    rowCount: getMySyncedMessagesQuery.data?.totalCount ?? 0,
    state: {
      ...prev.state,
      pagination,
    },
  }));

  return (
    <div className="container mx-auto py-10 space-y-3">
      <DataTable
        table={table}
        isLoading={getMySyncedMessagesQuery.isLoading}
        isFetching={getMySyncedMessagesQuery.isFetching}
      >
        <DashboardFilters
          table={table}
          labels={getGmailLabelsQuery.data || []}
        />
      </DataTable>
      <DataTablePagination table={table} />
    </div>
  );
}
